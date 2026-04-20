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

HEADERS = {'Authorization': f'Bearer {SERVICE_TOKEN}'}

VIOLATION_MAP = {
    0: 'person_detected',
}

cooldowns = {}
cooldown_lock = threading.Lock()

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
    rtsp_url  = camera.get('rtspUrl', '')
    name      = camera.get('name', camera_id)

    if not rtsp_url or not rtsp_url.startswith('rtsp://'):
        logger.warning(f'[{name}] No valid RTSP URL, skipping')
        return

    logger.info(f'[{name}] Opening stream: {rtsp_url}')
    cap = cv2.VideoCapture(rtsp_url)

    if not cap.isOpened():
        logger.error(f'[{name}] Could not open stream')
        return

    frame_count = 0
    consecutive_failures = 0

    while not stop_event.is_set():
        ret, frame = cap.read()
        if not ret:
            consecutive_failures += 1
            logger.warning(f'[{name}] Frame read failed ({consecutive_failures})')
            if consecutive_failures >= 10:
                logger.error(f'[{name}] Too many failures, stopping thread')
                break
            time.sleep(2)
            continue

        consecutive_failures = 0
        frame_count += 1

        if frame_count % FRAME_SKIP != 0:
            continue

        try:
            results = model(frame, verbose=False, conf=CONFIDENCE)
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
    model = YOLO(MODEL_PATH)
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
                continue
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
