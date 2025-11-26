#!/usr/bin/env python3
"""
Train a YOLOv8 model on a local dataset.

Example usage:
    python train_yolo.py \
        --dataset ./first-training-batch/images-for-yolo/safety.v1i.yolov8/data.yaml \
        --weights yolov8n.pt \
        --epochs 100 \
        --imgsz 640
"""

from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a YOLOv8 model locally.")
    parser.add_argument(
        "--dataset",
        type=str,
        required=True,
        help="Path to the dataset's data.yaml file (relative or absolute).",
    )
    parser.add_argument(
        "--weights",
        type=str,
        default="yolov8n.pt",
        help="Initial weights to load (defaults to yolov8n.pt).",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=100,
        help="Number of training epochs.",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Training image size.",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=8,
        help="Batch size.",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        help="Device to use (cpu, cuda, or cuda:0, cuda:1, ...).",
    )
    parser.add_argument(
        "--project",
        type=str,
        default="runs/train",
        help="Directory where training runs are stored.",
    )
    parser.add_argument(
        "--name",
        type=str,
        default="safety_detection",
        help="Name of the training run folder.",
    )
    parser.add_argument(
        "--patience",
        type=int,
        default=50,
        help="Early stopping patience.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of dataloader workers.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    data_path = Path(args.dataset).expanduser().resolve()
    if not data_path.exists():
        raise FileNotFoundError(f"Could not find data.yaml at {data_path}")

    project_path = Path(args.project).expanduser().resolve()
    project_path.mkdir(parents=True, exist_ok=True)

    print(f"📁 Using dataset config: {data_path}")
    print(f"📦 Saving runs under:    {project_path}")

    model = YOLO(args.weights)

    training_args = {
        "data": str(data_path),
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "patience": args.patience,
        "device": args.device,
        "workers": args.workers,
        "project": str(project_path),
        "name": args.name,
        "exist_ok": True,
        "pretrained": True,
        "optimizer": "auto",
        "verbose": True,
        "seed": 42,
        "deterministic": True,
    }

    results = model.train(**training_args)
    print(f"✅ Training finished. Metrics: {results}")

    output_weights = project_path / args.name / "weights" / "best.pt"
    if output_weights.exists():
        print(f"💾 Best weights saved to: {output_weights}")
    else:
        print("⚠️  Training completed, but best weights file was not found.")


if __name__ == "__main__":
    main()