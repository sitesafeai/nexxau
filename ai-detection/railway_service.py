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
import numpy as np
from PIL import Image
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

# PPE model class map (when using a custom PPE-trained model):
# VIOLATION_MAP = {
#     0: 'helmet',       # Hardhat
#     1: 'no_helmet',    # NO-Hardhat
#     2: 'no_vest',      # NO-Safety Vest
#     3: 'person_detected',  # Person
#     4: 'vest',         # Safety Vest
#     5: 'person_detected',  # Worker
# }

# COCO model class map (yolov8n.pt) — for stream testing only.
# Person=0 in COCO. Replace with PPE model + map above for production.
USE_PPE_MODEL = os.environ.get('YOLO_MODEL', 'yolov8n.pt') not in ('yolov8n.pt', 'yolov8s.pt', 'yolov8m.pt', 'yolov8l.pt', 'yolov8x.pt')
VIOLATION_MAP = {
    0: 'helmet',       # class: Hardhat  (PPE model) / Person (COCO — remapped below)
    1: 'no_helmet',    # class: NO-Hardhat
    2: 'no_vest',      # class: NO-Safety Vest
    3: 'person_detected',  # class: Person (PPE model)
    4: 'vest',         # class: Safety Vest
    5: 'person_detected',  # class: Worker
} if USE_PPE_MODEL else {
    0: 'person_detected',  # COCO person class — fires on any person visible
}

VIOLATION_LABELS = {
    'helmet':          ('Helmet ✓',     'compliant'),
    'no_helmet':       ('No Helmet',    'violation'),
    'vest':            ('Vest ✓',       'compliant'),
    'no_vest':         ('No Vest',      'violation'),
    'person_detected': ('Person',       'info'),
}

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

def post_violations(camera_id, violations):
    if not violations:
        return
    try:
        r = requests.post(
            f'{BACKEND_URL}/api/yolo/ingest',
            headers={**HEADERS, 'Content-Type': 'application/json'},
            json={'camera_id': camera_id, 'violations': violations},
            timeout=5
        )
        if r.status_code == 200:
            logger.info(f'[ingest] camera={camera_id} violations={len(violations)}')
        else:
            logger.warning(f'[ingest] {r.status_code} for camera={camera_id}')
    except Exception as e:
        logger.error(f'[ingest] post error: {e}')

def run_camera(camera, model, stop_event):
    camera_id = camera['id']
    ingest_url = resolve_ingest_url(camera)
    name      = camera.get('name', camera_id)
    protocol  = classify_stream_protocol(ingest_url)

    if not ingest_url:
        logger.warning(f'[{name}] No ingest URL, skipping')
        return
    if protocol == 'unknown':
        logger.warning(f'[{name}] Unsupported ingest URL protocol: {ingest_url}')
        return

    logger.info(f'[{name}] Opening {protocol} stream: {ingest_url}')
    cap = open_capture(ingest_url, protocol)

    if cap is None or not cap.isOpened():
        logger.error(f'[{name}] Could not open stream ({protocol})')
        return

    frame_count = 0
    consecutive_failures = 0
    open_started_at = time.time()

    while not stop_event.is_set():
        ret, frame = cap.read()
        if not ret:
            consecutive_failures += 1
            logger.warning(f'[{name}] Frame read failed ({consecutive_failures})')
            if protocol == 'hls' and (time.time() - open_started_at) < HLS_OPEN_TIMEOUT_SEC:
                time.sleep(1)
                continue
            if consecutive_failures >= MAX_READ_FAILURES:
                logger.warning(f'[{name}] Reopening stream after {consecutive_failures} failures')
                cap.release()
                time.sleep(RECONNECT_DELAY_SEC)
                cap = open_capture(ingest_url, protocol)
                if cap is None or not cap.isOpened():
                    logger.error(f'[{name}] Reconnect failed, stopping thread')
                    break
                consecutive_failures = 0
                open_started_at = time.time()
                continue
            time.sleep(RECONNECT_DELAY_SEC)
            continue

        consecutive_failures = 0
        frame_count += 1

        if frame_count % FRAME_SKIP != 0:
            continue

        # Skip corrupted/empty frames
        if frame is None or frame.size == 0 or len(frame.shape) != 3:
            continue

        try:
            # Convert BGR (OpenCV) → RGB PIL image — ultralytics handles this
            # cleanly and avoids the "Cannot convert numpy.ndarray" crash that
            # occurs when passing raw RTSP frames from OpenCV directly.
            pil_frame = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            results = model(pil_frame, verbose=False, conf=CONFIDENCE)
            violations = []

            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue
                for box in boxes:
                    class_id   = int(box.cls[0].cpu().numpy())
                    confidence = float(box.conf[0].cpu().numpy())
                    vtype      = VIOLATION_MAP.get(class_id)

                    if vtype is None:
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
                post_violations(camera_id, violations)

        except Exception as e:
            logger.error(f'[{name}] YOLO error: {e}')

    cap.release()
    logger.info(f'[{name}] Stream closed')

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
