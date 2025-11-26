# AI Training Runs & Dataset Tracker

This log keeps a detailed record of every YOLO training session we run, the datasets that feed those runs, and the class balance for quick reference and audit purposes. Update it each time you add new imagery or retrain.

---

## 2025-11-13 &mdash; `safety_detection` run

| Item | Details |
| --- | --- |
| **Model** | YOLOv8n (pretrained base) |
| **Training entry point** | `python train_yolo.py --dataset ./first-training-batch/images-for-yolo/safety.v1i.yolov8/data.yaml --weights yolov8n.pt --epochs 100 --imgsz 640 --batch 8 --device cpu` |
| **Output directory** | `runs/train/safety_detection/` |
| **Artifacts** | Checkpoints (`weights/best.pt`, `weights/last.pt`), confusion matrices, precision/recall curves, `results.csv` |
| **Dataset source** | `first-training-batch/images-for-yolo/safety.v1i.yolov8/` (Roboflow export) |
| **Total labelled images (train split)** | 1,260 (matching label files in `train/labels/`) |
| **Validation/Test splits** | `valid/`, `test/` from the same Roboflow export (counts not recomputed yet) |

### Class distribution (train split)

| Class | Labels |
| --- | ---: |
| Boots | 1,899 |
| Ear Protection | 9 |
| Glass | 27 |
| Glove | 87 |
| Helmet | 1,104 |
| Mask | 42 |
| Person | 1,101 |
| Vest | 1,365 |

> Counts reflect the number of bounding boxes per class parsed from the YOLO label files. Keep them in mind when augmenting underrepresented categories (e.g. ear protection, masks).

### Notes & Follow‑ups

- Cloud storage snapshots were uploaded via `scripts/upload-training-data.js` prior to this run.
- The resulting checkpoint lives at `runs/train/safety_detection/weights/best.pt`; deploy-friendly copies should be exported to the model registry before production use.
- Next dataset targets: collect more images for **ear protection**, **gloves**, and **masks** to balance the detector.

---

## How to append new runs

1. Drop the raw dataset under `first-training-batch/` (or another versioned directory) and note the source.
2. Run class-count analysis:
   ```bash
   python scripts/analyze_dataset.py  # TODO: create helper or reuse counting snippet
   ```
3. Train with `python train_yolo.py ...` (record exact flags).
4. Copy-paste the section template above, updating dates, directories, counts, and observations.
5. Commit `TRAINING_RUNS.md` alongside any new checkpoints or data ingestion scripts.

Maintaining this tracker keeps our AI pipeline auditable and gives everyone the context they need when debugging or retraining models.

