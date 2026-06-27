import asyncio
import base64
import hashlib
import hmac
import io
import json
import logging
import os
from typing import Optional

import cv2
import httpx
import numpy as np
from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# ── Next.js backend config ────────────────────────────────────────────────────
# BACKEND_URL  — URL of the Next.js app, e.g. https://nexxau.com
# INTERNAL_SERVICE_TOKEN — shared secret for /api/yolo/ingest and /api/cameras/heartbeat
# CAMERA_ID_MAP — JSON mapping stream_id → Nexxau camera DB id
#   e.g. '{"stream1":"cmpp0jiuu0001qm0cbvaei1y9"}'

BACKEND_URL = os.getenv("BACKEND_URL", "").rstrip("/")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")

_raw_camera_map = os.getenv("CAMERA_ID_MAP", "{}")
try:
    CAMERA_ID_MAP: dict[str, str] = json.loads(_raw_camera_map)
except json.JSONDecodeError:
    logger.error("CAMERA_ID_MAP is not valid JSON — detections will not be posted")
    CAMERA_ID_MAP = {}


def _ingest_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {INTERNAL_SERVICE_TOKEN}",
        "Content-Type": "application/json",
    }


async def post_detections_to_nexxau(
    camera_id: str,
    violations: list[dict],
    frame_b64: Optional[str] = None,
) -> None:
    """POST detections to /api/yolo/ingest — fire-and-forget, never raises."""
    if not BACKEND_URL or not camera_id or not violations:
        return
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"{BACKEND_URL}/api/yolo/ingest",
                headers=_ingest_headers(),
                json={
                    "camera_id": camera_id,
                    "violations": violations,
                    "frame_data": frame_b64,
                },
            )
    except Exception as exc:
        logger.warning(f"[ingest] POST failed for camera {camera_id}: {exc}")


async def _heartbeat_loop() -> None:
    """Ping /api/cameras/heartbeat every 30 s for all known cameras."""
    camera_ids = list(CAMERA_ID_MAP.values())
    if not camera_ids or not BACKEND_URL:
        logger.info("[heartbeat] No cameras or BACKEND_URL configured — heartbeat disabled")
        return

    logger.info(f"[heartbeat] Starting loop for {len(camera_ids)} camera(s): {camera_ids}")
    while True:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.post(
                    f"{BACKEND_URL}/api/cameras/heartbeat",
                    headers=_ingest_headers(),
                    json={"camera_ids": camera_ids},
                )
                logger.debug(f"[heartbeat] {resp.status_code} — {resp.text[:80]}")
        except Exception as exc:
            logger.warning(f"[heartbeat] Failed: {exc}")
        await asyncio.sleep(30)

# ── CORS ──────────────────────────────────────────────────────────────────────
# allow_origins=["*"] + allow_credentials=True is invalid per the CORS spec and
# rejected by browsers. Read origins from env; fall back to localhost-only for dev.

_raw_origins = os.getenv("BACKEND_CORS_ORIGINS", "").strip()
_cors_origins: list[str] = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["http://localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── YOLO model (loaded at startup, not at import time) ────────────────────────

model = None  # populated in startup hook


@app.on_event("startup")
async def startup_event() -> None:
    global model
    model_path = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
    try:
        from ultralytics import YOLO
        model = YOLO(model_path)
        logger.info(f"YOLO model loaded from {model_path}")
    except Exception as exc:
        logger.error(f"Failed to load YOLO model from '{model_path}': {exc}")
        # Do NOT crash the process — individual endpoints will return 503 if model is None.

    # Start the camera heartbeat background task
    asyncio.create_task(_heartbeat_loop())


# ── internal service token auth ───────────────────────────────────────────────

def _token_ok(provided: str) -> bool:
    """Constant-time comparison against INTERNAL_SERVICE_TOKEN."""
    expected = os.environ.get("INTERNAL_SERVICE_TOKEN", "")
    if not expected or not provided:
        return False
    return hmac.compare_digest(
        expected.encode("utf-8"),
        provided.encode("utf-8"),
    )


def verify_internal_token(authorization: str = Header(default="")) -> None:
    """FastAPI dependency: enforces Bearer <INTERNAL_SERVICE_TOKEN>."""
    if not os.environ.get("INTERNAL_SERVICE_TOKEN"):
        logger.error("INTERNAL_SERVICE_TOKEN is not configured — rejecting request")
        raise HTTPException(status_code=503, detail="Service token not configured")

    token = authorization.removeprefix("Bearer ").strip() if authorization.startswith("Bearer ") else ""
    if not _token_ok(token):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── stream URL allow-list ─────────────────────────────────────────────────────
# Load from env as JSON: STREAM_ALLOWLIST='{"cam1":"rtsp://...","cam2":"rtsp://..."}'
# If unset, no streams are permitted.

_raw_allowlist = os.getenv("STREAM_ALLOWLIST", "{}")
try:
    STREAM_ALLOWLIST: dict[str, str] = json.loads(_raw_allowlist)
except json.JSONDecodeError:
    logger.error("STREAM_ALLOWLIST is not valid JSON — no streams will be permitted")
    STREAM_ALLOWLIST = {}

# ── active streams registry ───────────────────────────────────────────────────

active_streams: dict[str, cv2.VideoCapture] = {}

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


# ── endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/detect", dependencies=[Depends(verify_internal_token)])
async def detect_objects(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="YOLO model not loaded")

    # Read in chunks; abort if > 10 MB
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(65536)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Upload exceeds 10 MB limit")
        chunks.append(chunk)
    contents = b"".join(chunks)

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    results = model(img)

    detections = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            cls = int(box.cls[0].cpu().numpy())
            name = model.names[cls]
            detections.append({
                "class": name,
                "confidence": conf,
                "bbox": [float(x1), float(y1), float(x2), float(y2)],
            })

    for det in detections:
        x1, y1, x2, y2 = map(int, det["bbox"])
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(img, f"{det['class']} {det['confidence']:.2f}",
                    (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    return {"detections": detections, "image": img_base64}


@app.websocket("/ws/video/{stream_id}")
async def video_stream(websocket: WebSocket, stream_id: str):
    # Auth check BEFORE accept so we can close with policy-violation code.
    auth_header = websocket.headers.get("authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""
    if not os.environ.get("INTERNAL_SERVICE_TOKEN") or not _token_ok(token):
        await websocket.close(code=1008)  # 1008 = Policy Violation
        logger.warning(f"Rejected unauthenticated WebSocket for stream {stream_id}")
        return

    if model is None:
        await websocket.close(code=1011)  # 1011 = Internal Error
        logger.error("YOLO model not loaded — cannot serve stream")
        return

    stream_url = STREAM_ALLOWLIST.get(stream_id)
    if not stream_url:
        await websocket.close(code=1008)
        logger.warning(f"stream_id '{stream_id}' not in STREAM_ALLOWLIST")
        return

    await websocket.accept()
    logger.info(f"WebSocket accepted for stream {stream_id}")

    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        await websocket.send_json({"error": f"Could not open stream '{stream_id}'"})
        await websocket.close()
        logger.error(f"Failed to open stream URL for stream_id '{stream_id}'")
        return

    active_streams[stream_id] = cap
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                await websocket.send_json({"error": "Stream ended or unreadable"})
                break

            results = model(frame)
            detections = []
            for r in results:
                for box in r.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu().numpy())
                    cls = int(box.cls[0].cpu().numpy())
                    name = model.names[cls]
                    detections.append({
                        "class": name,
                        "confidence": conf,
                        "bbox": [float(x1), float(y1), float(x2), float(y2)],
                    })
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                    cv2.putText(frame, f"{name} {conf:.2f}",
                                (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            await websocket.send_json({"frame": frame_base64, "detections": detections})

            # POST detections to Next.js if this stream maps to a known camera DB id
            nexxau_camera_id = CAMERA_ID_MAP.get(stream_id)
            if nexxau_camera_id and detections:
                violations = [
                    {"type": d["class"], "confidence": d["confidence"], "bbox": d["bbox"]}
                    for d in detections
                ]
                asyncio.create_task(
                    post_detections_to_nexxau(nexxau_camera_id, violations, frame_base64)
                )

            await asyncio.sleep(0.1)

    except Exception as exc:
        logger.error(f"Error in video stream {stream_id}: {exc}")
        try:
            await websocket.send_json({"error": str(exc)})
        except Exception:
            pass
    finally:
        logger.info(f"Cleaning up stream {stream_id}")
        cap.release()
        active_streams.pop(stream_id, None)
        try:
            await websocket.close()
        except Exception:
            pass


@app.on_event("shutdown")
async def shutdown_event() -> None:
    logger.info("Shutting down — releasing all video captures")
    for cap in active_streams.values():
        cap.release()
    active_streams.clear()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
