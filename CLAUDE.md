# Nexxau — working notes for Claude

Construction-site safety monitoring: cameras → YOLO PPE detection → rule engine → alerts/email.

**Read these two alongside this file:**

- `MEMORY.md` — standing rules for how we work. Read at the start of every session.
- `CONTEXT.md` — running log of what happened in past sessions, newest first. Skim the
  top few entries; read further back only if the task touches something you find there.

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

### Pushing a local camera into MediaMTX

The command, for a LAN camera republished to the Railway MediaMTX service. Keep the
ffmpeg call on ONE line — a backslash continuation with a trailing space after it makes
zsh read `\ ` as an escaped space, so ffmpeg gets `" "` as its output filename and the
rest of the command runs as separate garbage (`command not found: -rtsp_transport`).
The `while` loop reconnects when the camera drops, which it does:

```bash
while true; do
  ffmpeg -fflags +nobuffer -flags low_delay -rtsp_transport tcp -use_wallclock_as_timestamps 1 -i "rtsp://10.0.0.244/stream" -c:v copy -an -f rtsp -rtsp_transport tcp rtsp://admin:nexxau@zephyr.proxy.rlwy.net:46299/<CAMERA_DB_ID>
  echo "stream dropped — reconnecting in 3s"
  sleep 3
done
```

- **The path segment must be the camera's database id** (a cuid), or its `mediamtxPath`.
  `/api/cameras/stream-event` matches `$MTX_PATH` against `mediamtxPath` OR `id` — get it
  wrong and the stream publishes fine but the app never links it to a camera, so it stays
  "offline" in the dashboard with no error anywhere.
- **Host is Railway's TCP proxy** (`zephyr.proxy.rlwy.net:46299`), not the
  `mediamtx-production-….up.railway.app` HTTP domain. Railway → mediamtx → Settings →
  Networking if the proxy address changes.
- Credentials come from `authInternalUsers` in `docker/mediamtx/mediamtx.yml`
  (`admin`/`nexxau`).
- `-c:v copy` avoids re-encoding, which is why this runs fine on a laptop — but it
  requires the source to already be H.264. For a source that isn't, swap in
  `-c:v libx264 -preset veryfast -tune zerolatency`.
- `-an` drops audio. MediaMTX accepts it either way; the detector ignores it.

### Vest state is two-stage when enabled (Sept 2026)

`NO-Safety Vest` as a detector class is broken (0.214 mAP, 0.14 recall) and two training
runs failed to fix it. So `railway_service.py` can instead crop each `Person` box and run
a binary vest/no-vest classifier: **0.926 recall / 0.934 precision** on a de-leaked val
set. Trained by `ai-detection/kaggle_train_vest_cls.py` (~15 min, not 10 hours).

Off unless `VEST_CLS_MODEL` is set — then the detector's own `no_vest`/`vest` outputs are
discarded and replaced. Env vars: `VEST_CLS_MODEL`, `VEST_CLS_DOWNLOAD_URL`,
`VEST_CLS_THRESHOLD` (0.70), `VEST_CLS_PAD` (0.10), `VEST_CLS_MIN_PX` (32).

- **Python service only.** No class-name sync, no app deploy. Rollback = unset the var.
- **`PAD`, `MIN_PX` and colour order must match the training script.** OpenCV frames are
  BGR and ultralytics reads numpy as BGR, but training crops were PIL RGB — passing the
  raw crop swaps red and blue, which is fatal when the signal is hi-vis orange. The
  `cvtColor` in `classify_vest_crops()` is load-bearing.
- **Person recall is now the ceiling.** Anyone the detector misses never gets judged, so
  `YOLO_CONFIDENCE` matters more than it used to.
- **`no_vest` confidence now means classifier probability, not detector confidence.** A
  `CustomRule` whose `confidenceThreshold` was tuned against the old numbers will behave
  differently, and anything above 0.70 starts cutting into recall.

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

### Training-run history — don't re-litigate these

> **EVERY mAP NUMBER BELOW IS INFLATED. There is currently no trustworthy benchmark.**
> `check_val_leakage.py` (Sept 2026) found that **54% of d1's valid split appears in the
> training pool as a near-duplicate, and 11.5% is byte-for-byte identical**. d1's own
> train and valid splits overlap, and d3/d5 reshare photos with it. So v4's 0.786, v5's
> 0.779, the "clean" 0.7252 baseline and v6's 0.7270 were all scored partly on images the
> model trained on. Comparisons *between* those runs are roughly fair since all are
> inflated similarly; the absolute numbers are not real.
> Sharpest consequence: `NO-Safety Vest` managed only **0.214 with half its val set seen
> during training**. The true figure is worse. It is not a weak class, it is broken.
> Before trusting any future number, hold the val set out by content hash — see
> `kaggle_train_vest_cls.py`, which excludes training images that near-match a val image.

**Headline mAP numbers from different runs are not comparable even setting leakage aside.**
v4's 0.786 and v5's 0.779 were scored against the 5-way merged val set, which has the same
missing-label problem as the training data — it counts correct detections as false
positives. d1's val split alone (`personal-protective-equipment-combined-model` v8, 8,814
images) at least annotates every class consistently, which is why it became the benchmark
— but see the leakage warning above.

On that clean val set, **v5 scores 0.7252 mean mAP@50** over the 10 classes v6 kept. Per
class: Goggles 0.971, NO-Goggles 0.953, Hardhat 0.908, Person 0.884, Fall-Detected 0.840,
NO-Hardhat 0.743, Safety Vest 0.654, NO-Mask 0.608, Mask 0.478, **NO-Safety Vest 0.214**.
Note Person is 0.884, not the 0.560 the v5 run log claimed — that was a measurement
artefact of the contaminated val set, not a broken class.

**v6 (Sept 2026) — completed, NOT shipped.** Dropped 4 unused classes (Gloves, NO-Gloves,
Ladder, Safety Cone) and pseudo-labelled the merge. Final: **0.7270 vs v5's 0.7252.**
+0.002 is noise. Shipping it would have cost the four-file class sync, two Railway
deploys, and every `CustomRule` pointing at a dropped class — for nothing. v5 stays live.

Two things that run established, worth not rediscovering:
- **Class reduction alone doesn't help.** 14 → 10 moved nothing.
- **The pseudo-labelling hypothesis was never actually tested.** Person gained only 303
  labels from the 6.5k vest-no-vest images it was supposed to fix. v5 scores 0.884 on
  Person against d1 but barely fires on d5 at conf 0.45, and nobody knows why yet. Look
  at actual d5 images before designing anything else around them.

**d2 (`ppes-kaxsi`) classes 8 and 9 are `no_shoes` and `shoes`.** Mapping them to `-1` is
correct — there is no shoe class in the master list. Checked Sept 2026; don't re-check.
d2 has no Person and no vest classes at all.

`NO-Safety Vest` at 0.214 is still the actual problem. v5 and v6 both failed to move it.

If the model download fails, `ensure_model()` falls back to `yolov8n.pt` — bare COCO, **zero PPE classes**. Everything except `person_detected` silently stops detecting. Check startup logs for `Model:` and the downloaded KB figure.

## Gotchas

- `npx tsc --noEmit` reports ~256 **pre-existing** errors. Don't try to fix them; just
  confirm your own files are clean (`npx tsc --noEmit --pretty false | grep <yourfile>`).
  This note used to say they were all in `scripts/` and `sentry.server.config.ts` — that
  is wrong. Measured Sept 2026: only 9 are in `scripts/` and 1 in the sentry config. The
  bulk is `app/lib` (61), `app/lib/workflows` (55), `app/api/alerts/[id]/report` (23) and
  `app/lib/safety` (18), mostly Prisma enum/role typing.
- Pre-commit hooks frequently block commits. `git commit --no-verify` is the normal workaround here.
- `app/app/api/cameras/[id]/detections/route.ts` returns **mock data**. The real live-detection endpoint is `.../live-detections/route.ts`.
- `RealtimeDetectionOverlay.tsx` runs COCO-SSD **in the browser** — generic objects, not PPE, and unrelated to production. `AIVisionTab.tsx` shows what the real model saw.
- Roles go through `normalizeRole()` in `app/app/lib/roles.ts` — never compare `session.user.role` as a raw string.

## Working style

Luiz is non-technical about the details but ships fast and tests in production. Be concise. Prefer showing the exact command or diff over explaining the concept. Flag the trade-off when there is one rather than presenting a change as free.

When a change spans the Python service and the app, say so explicitly — they are separate Railway deploys and it's easy to ship half of a feature.
