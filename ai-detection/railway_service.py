"""
Nexxau AI Detection Service - Railway
Pulls RTSP streams directly, runs YOLO, posts violations to Next.js API.
Runs 24/7 regardless of browser state.
"""

import cv2
import time
import logging
import threading
import requests
import os
import base64
from ultralytics import YOLO

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

BACKEND_URL        = os.environ.get('BACKEND_URL', 'http://localhost:3000')
SERVICE_TOKEN      = os.environ.get('INTERNAL_SERVICE_TOKEN', '')
MODEL_PATH         = os.environ.get('YOLO_MODEL', 'yolov8n.pt')
CAMERA_POLL_SEC    = int(os.environ.get('CAMERA_POLL_SEC', '60'))
FRAME_SKIP         = int(os.environ.get('FRAME_SKIP', '5'))
CONFIDENCE         = float(os.environ.get('YOLO_CONFIDENCE', '0.5'))
VIOLATION_COOLDOWN = int(os.environ.get('VIOLATION_COOLDOWN_SEC', '30'))
MAX_READ_FAILURES  = int(os.environ.get('MAX_READ_FAILURES', '10'))
RECONNECT_DELAY_SEC = int(os.environ.get('RECONNECT_DELAY_SEC', '3'))
HLS_OPEN_TIMEOUT_SEC = int(os.environ.get('HLS_OPEN_TIMEOUT_SEC', '10'))
INGEST_TRANSPORT   = os.environ.get('INGEST_TRANSPORT', 'auto').lower()

HEADERS = {'Authorization': f'Bearer {SERVICE_TOKEN}'}

# ── Model class map ───────────────────────────────────────────────────────────
# Automatically switches between the custom PPE model (best.pt) and the base
# COCO model (yolov8n.pt) based on YOLO_MODEL env var.
#
# Custom PPE model class order (from data.yaml of ppe-vum8g dataset):
#   0: a boot       → boot           (compliant)
#   1: a glove      → glove          (compliant)
#   2: a hardhat    → helmet         (compliant)
#   3: a person     → person_detected (info)
#   4: a vest       → vest           (compliant)
#   5: no_boots     → no_boots       (violation)
#   6: no_gloves    → no_gloves      (violation)
#   7: no_hardhat   → no_helmet      (violation)
#   8: no_vest      → no_vest        (violation)

BASE_MODELS = ('yolov8n.pt', 'yolov8s.pt', 'yolov8m.pt', 'yolov8l.pt', 'yolov8x.pt')
USE_PPE_MODEL = os.environ.get('YOLO_MODEL', 'yolov8n.pt') not in BASE_MODELS

# ── Name-based class map (best_ppe_v2.pt — 14 classes) ────────────────────────
# Keyed by lowercase class name from model.names — avoids fragility of class ID
# ordering which can differ between dataset versions.
# Classes from: personal-protective-equipment-combined-model v8, 44k images.
PPE_CLASS_MAP = {
    'fall-detected':  'fall_detected',   # violation
    'gloves':         'gloves',          # compliant
    'goggles':        'goggles',         # compliant
    'hardhat':        'helmet',          # compliant
    'ladder':         'ladder',          # info
    'mask':           'mask',            # compliant
    'no-gloves':      'no_gloves',       # violation
    'no-goggles':     'no_goggles',      # violation
    'no-hardhat':     'no_helmet',       # violation
    'no-mask':        'no_mask',         # violation
    'no-safety vest': 'no_vest',         # violation
    'person':         'person_detected', # info
    'safety cone':    'safety_cone',     # info
    'safety vest':    'vest',            # compliant
}

# COCO fallback — only person class matters
COCO_CLASS_MAP = {
    0: 'person_detected',
}

VIOLATION_LABELS = {
    'fall_detected':  ('Fall Detected',  'violation'),
    'gloves':         ('Gloves ✓',       'compliant'),
    'goggles':        ('Goggles ✓',      'compliant'),
    'helmet':         ('Hardhat ✓',      'compliant'),
    'ladder':         ('Ladder',         'info'),
    'mask':           ('Mask ✓',         'compliant'),
    'no_gloves':      ('No Gloves',      'violation'),
    'no_goggles':     ('No Goggles',     'violation'),
    'no_helmet':      ('No Hardhat',     'violation'),
    'no_mask':        ('No Mask',        'violation'),
    'no_vest':        ('No Safety Vest', 'violation'),
    'person_detected':('Person',         'info'),
    'safety_cone':    ('Safety Cone',    'info'),
    'vest':           ('Safety Vest ✓',  'compliant'),
}

# Compliant/info detections — not actionable, skip posting to save noise.
# Only violations + person_detected fire alerts.
SKIP_VTYPES = {'gloves', 'goggles', 'helmet', 'ladder', 'mask', 'safety_cone', 'vest'}

cooldowns = {}
cooldown_lock = threading.Lock()

if INGEST_TRANSPORT in ('tcp', 'udp'):
    os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = f'rtsp_transport;{INGEST_TRANSPORT}'

def ensure_model(path: str) -> str:
    """
    If path is a local filename that doesn't exist yet,
    check for MODEL_DOWNLOAD_URL env var and download it.
    Returns the path to use.
    """
    if os.path.exists(path):
        return path
    download_url = os.environ.get('MODEL_DOWNLOAD_URL', '')
    if not download_url:
        logger.warning(f'Model not found at {path} and MODEL_DOWNLOAD_URL not set. Falling back to yolov8n.pt')
        return 'yolov8n.pt'
    logger.info(f'Downloading model from {download_url} to {path}...')
    try:
        r = requests.get(download_url, timeout=120)
        r.raise_for_status()
        with open(path, 'wb') as f:
            f.write(r.content)
        logger.info(f'Model downloaded: {path} ({len(r.content)//1024}KB)')
        return path
    except Exception as e:
        logger.error(f'Model download failed: {e}. Falling back to yolov8n.pt')
        return 'yolov8n.pt'

def resolve_ingest_url(camera):
    return (
        camera.get('ingestUrl') or
        camera.get('rtspUrl') or
        camera.get('hlsUrl') or
        camera.get('streamUrl') or
        ''
    )

def classify_stream_protocol(url):
    lower = (url or '').lower()
    if lower.startswith('rtsp://'):
        return 'rtsp'
    if lower.startswith('rtmp://'):
        return 'rtmp'
    if lower.startswith('http://') or lower.startswith('https://'):
        if '.m3u8' in lower:
            return 'hls'
        return 'http'
    return 'unknown'

def open_capture(url, protocol):
    if protocol in ('rtsp', 'hls', 'rtmp', 'http'):
        return cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    return None

def is_on_cooldown(camera_id, vtype):
    key = f'{camera_id}:{vtype}'
    with cooldown_lock:
        last = cooldowns.get(key, 0)
        return (time.time() - last) < VIOLATION_COOLDOWN

def set_cooldown(camera_id, vtype):
    key = f'{camera_id}:{vtype}'
    with cooldown_lock:
        cooldowns[key] = time.time()

def fetch_cameras():
    try:
        r = requests.get(
            f'{BACKEND_URL}/api/cameras/list-for-detection',
            headers=HEADERS,
            timeout=10
        )
        if r.status_code == 200:
            cameras = r.json().get('cameras', [])
            logger.info(f'[api] Fetched {len(cameras)} active cameras')
            return cameras
        logger.warning(f'[api] list-for-detection returned {r.status_code}')
    except Exception as e:
        logger.error(f'[api] fetch_cameras error: {e}')
    return []

def encode_frame(frame):
    """Encode a numpy BGR frame as a base64 JPEG data URI. Returns None on failure."""
    try:
        h, w = frame.shape[:2]
        # Resize so the longest side is at most 640px — keeps payload small (~20-50KB)
        max_dim = 640
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        ok, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ok:
            return None
        b64 = base64.b64encode(buf.tobytes()).decode('utf-8')
        return f'data:image/jpeg;base64,{b64}'
    except Exception as e:
        logger.warning(f'[snapshot] Frame encode failed: {e}')
        return None

def post_violations(camera_id, violations, frame_data=None):
    if not violations:
        return
    try:
        payload = {'camera_id': camera_id, 'violations': violations}
        if frame_data:
            payload['frame_data'] = frame_data
        r = requests.post(
            f'{BACKEND_URL}/api/yolo/ingest',
            headers={**HEADERS, 'Content-Type': 'application/json'},
            json=payload,
            timeout=10  # slightly longer — payload is bigger now
        )
        if r.status_code == 200:
            logger.info(f'[ingest] camera={camera_id} violations={len(violations)} snapshot={"yes" if frame_data else "no"}')
        else:
            logger.warning(f'[ingest] {r.status_code} for camera={camera_id}')
    except Exception as e:
        logger.error(f'[ingest] post error: {e}')

def run_camera(camera, model, stop_event):
    camera_id = camera['id']
    ingest_url = resolve_ingest_url(camera)
    name      = camera.get('name', camera_id)

    if not ingest_url:
        logger.warning(f'[{name}] No ingest URL, skipping')
        return

    logger.info(f'[{name}] Starting ultralytics streaming inference: {ingest_url}')

    while not stop_event.is_set():
        try:
            results = model(
                source=ingest_url,
                stream=True,
                conf=CONFIDENCE,
                verbose=False,
                imgsz=640,
            )

            for result in results:
                if stop_event.is_set():
                    break

                boxes = result.boxes
                if boxes is None:
                    continue

                violations = []
                for box in boxes:
                    class_id   = int(box.cls[0].cpu().numpy())
                    confidence = float(box.conf[0].cpu().numpy())
                    if USE_PPE_MODEL:
                        class_name = (result.names or {}).get(class_id, '').lower()
                        vtype = PPE_CLASS_MAP.get(class_name)
                    else:
                        vtype = COCO_CLASS_MAP.get(class_id)

                    if vtype is None:
                        continue
                    if vtype in SKIP_VTYPES:
                        continue
                    if is_on_cooldown(camera_id, vtype):
                        continue

                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                    violations.append({
                        'type':       vtype,
                        'confidence': round(confidence, 3),
                        'bbox':       [x1, y1, x2, y2],
                    })
                    set_cooldown(camera_id, vtype)

                if violations:
                    # Capture the frame at moment of detection
                    frame_data = encode_frame(result.orig_img) if result.orig_img is not None else None
                    post_violations(camera_id, violations, frame_data)

        except Exception as e:
            logger.error(f'[{name}] Streaming error: {e}')
            if stop_event.is_set():
                break
            logger.info(f'[{name}] Reconnecting in {RECONNECT_DELAY_SEC}s...')
            time.sleep(RECONNECT_DELAY_SEC)

    logger.info(f'[{name}] Stream closed')

HEARTBEAT_INTERVAL_SEC = int(os.environ.get('HEARTBEAT_INTERVAL_SEC', '30'))

def send_heartbeat(camera_ids: list[str]):
    """Ping /api/cameras/heartbeat so the dashboard shows cameras as online."""
    if not camera_ids:
        return
    try:
        r = requests.post(
            f'{BACKEND_URL}/api/cameras/heartbeat',
            headers={**HEADERS, 'Content-Type': 'application/json'},
            json={'camera_ids': camera_ids},
            timeout=5,
        )
        if r.status_code != 200:
            logger.warning(f'[heartbeat] {r.status_code}')
    except Exception as e:
        logger.warning(f'[heartbeat] error: {e}')

def heartbeat_loop(active_threads: dict, stop_event: threading.Event):
    """Background thread: ping heartbeat every 30s for all active cameras."""
    while not stop_event.is_set():
        alive_ids = [cam_id for cam_id, (t, _) in active_threads.items() if t.is_alive()]
        if alive_ids:
            send_heartbeat(alive_ids)
            logger.debug(f'[heartbeat] pinged {len(alive_ids)} cameras')
        stop_event.wait(HEARTBEAT_INTERVAL_SEC)

def main():
    logger.info('=== Nexxau Detection Service Starting ===')
    logger.info(f'Backend: {BACKEND_URL}')
    logger.info(f'Model:   {MODEL_PATH}')

    if not SERVICE_TOKEN:
        logger.error('INTERNAL_SERVICE_TOKEN not set')
        return

    logger.info('Loading YOLO model...')
    resolved_path = ensure_model(MODEL_PATH)
    model = YOLO(resolved_path)
    logger.info('YOLO model loaded')

    active_threads = {}

    # Heartbeat loop — keeps camera online indicators green while YOLO is running
    hb_stop = threading.Event()
    hb_thread = threading.Thread(
        target=heartbeat_loop, args=(active_threads, hb_stop), daemon=True, name='heartbeat'
    )
    hb_thread.start()

    while True:
        cameras = fetch_cameras()
        current_ids = {c['id'] for c in cameras}

        for cam_id in list(active_threads.keys()):
            if cam_id not in current_ids:
                logger.info(f'[main] Camera removed: {cam_id}')
                active_threads[cam_id][1].set()
                active_threads[cam_id][0].join(timeout=5)
                del active_threads[cam_id]

        for camera in cameras:
            cam_id = camera['id']
            if cam_id in active_threads:
                thread, stop_event = active_threads[cam_id]
                if thread.is_alive():
                    continue
                # Thread died — clean up so it restarts below
                logger.warning(f'[main] Thread for camera "{camera["name"]}" died, restarting')
                del active_threads[cam_id]
            stop_event = threading.Event()
            t = threading.Thread(
                target=run_camera,
                args=(camera, model, stop_event),
                daemon=True,
                name=f'cam-{cam_id[:8]}'
            )
            t.start()
            active_threads[cam_id] = (t, stop_event)
            logger.info(f'[main] Started thread for camera: {camera["name"]}')

        logger.info(f'[main] Active camera threads: {len(active_threads)}')
        time.sleep(CAMERA_POLL_SEC)

if __name__ == '__main__':
    main()
