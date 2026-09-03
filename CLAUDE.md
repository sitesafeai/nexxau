# Nexxau — working notes for Claude

Construction-site safety monitoring: cameras → YOLO PPE detection → rule engine → alerts/email.

## Layout

| Path | What it is |
|---|---|
| `app/` | Next.js 15 App Router, TypeScript, Prisma/Postgres, NextAuth. The product. |
| `ai-detection/railway_service.py` | The **live** YOLO service. Pulls RTSP, runs inference, POSTs detections. |
| `ai-detection/kaggle_train_v*.py` | Training scripts (run on Kaggle, not here). |
| `docker/mediamtx/` | MediaMTX config — the RTSP/HLS relay. |
| `services/`, `src/`, `backend/`, `rtsp-server/` | **Mostly dead.** Older attempts. Verify anything here is actually wired up before touching it. |

Three Railway services: the Next.js app, the YOLO detector (`ai-detection/`), and MediaMTX.

## The detection path

Camera/phone → FFmpeg pushes RTSP → **MediaMTX** → YOLO service pulls that stream →
`POST /api/yolo/ingest` → matched against `CustomRule` rows → `Alert` + `SafetyViolation` + Resend email.

`app/app/api/yolo/ingest/route.ts` is the heart of it. Read it before changing anything detection-related.

Two independent confidence gates, which confuses people:
1. `YOLO_CONFIDENCE` (env, currently `0.25`) — a floor applied at the model call in Python. Nothing below this ever reaches the backend.
2. `rule.confidenceThreshold` — per-rule, applied in the ingest route.

A rule set below `YOLO_CONFIDENCE` can never fire. Check the floor first when debugging "rule didn't trigger."

## Class names must stay in sync across four files

The YOLO model emits 14 class names; `PPE_CLASS_MAP` maps them to internal vtypes (`no_vest`, `helmet`, …). Those vtypes are then re-labelled for display in several places. Change one, change all:

- `ai-detection/railway_service.py` → `PPE_CLASS_MAP`, `VIOLATION_LABELS`
- `app/app/components/dashboard/DetectionPanel.tsx` → `TYPE_META`
- `app/app/components/cameras/AIVisionTab.tsx` → `TYPE_STYLE`
- `app/app/api/alerts/[id]/snapshot/route.ts` → `LABELS`

`app/app/lib/detection-classes.ts` is the UI-facing catalog used by the alert builder — its ids are what land in `rule.detectionCriteria.objectClass`, so they must match the vtypes above.

## Bounding-box coordinate spaces (easy to get wrong)

`bbox` is always `[x1,y1,x2,y2]` in **original frame pixels**. But the stored snapshot JPEG is downscaled to ≤640px longest side (`encode_frame`). So:

- **Live overlay** (AI Vision tab): browser plays the same MediaMTX stream, so `video.videoWidth/Height` is the correct denominator — no extra data needed.
- **Snapshot annotation** (emails): needs `frame_size` shipped from Python, stored as `metadata.frameW/frameH` on the Alert. Without it, the box is served unannotated rather than drawn wrong.

## Models

Weights are **not in git** — `.gitignore` blocks `*.pt`. They ship as GitHub Release assets and are fetched at boot by `ensure_model()` via `MODEL_DOWNLOAD_URL`.

- Current: `best_ppe_v4.pt`, 14 classes, mAP@50 ≈ 0.786
- Always upload the **stripped** checkpoint (~52MB). An unstripped one is ~155MB and re-downloads on every cold start.
- GitHub appends `.1` to a release asset whose filename collides — delete the old asset first, or `MODEL_DOWNLOAD_URL` silently serves stale weights.
- Weakest class by far: `NO-Safety Vest` (recall 0.14). Known, being worked on.

If the model download fails, `ensure_model()` falls back to `yolov8n.pt` — bare COCO, **zero PPE classes**. Everything except `person_detected` silently stops detecting. Check startup logs for `Model:` and the downloaded KB figure.

## Gotchas

- `npx tsc --noEmit` reports ~285 **pre-existing** errors, all in `scripts/` and `sentry.server.config.ts`. Don't try to fix them; just confirm your own files are clean.
- Pre-commit hooks frequently block commits. `git commit --no-verify` is the normal workaround here.
- `app/app/api/cameras/[id]/detections/route.ts` returns **mock data**. The real live-detection endpoint is `.../live-detections/route.ts`.
- `RealtimeDetectionOverlay.tsx` runs COCO-SSD **in the browser** — generic objects, not PPE, and unrelated to production. `AIVisionTab.tsx` shows what the real model saw.
- Roles go through `normalizeRole()` in `app/app/lib/roles.ts` — never compare `session.user.role` as a raw string.

## Working style

Luiz is non-technical about the details but ships fast and tests in production. Be concise. Prefer showing the exact command or diff over explaining the concept. Flag the trade-off when there is one rather than presenting a change as free.

When a change spans the Python service and the app, say so explicitly — they are separate Railway deploys and it's easy to ship half of a feature.
