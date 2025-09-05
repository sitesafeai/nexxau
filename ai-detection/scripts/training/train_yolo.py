#!/usr/bin/env python3
"""
Nexxau AI Detection - YOLO Training Script
Trains custom YOLO models for safety detection
"""

import os
import yaml
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional
import logging
from ultralytics import YOLO
import shutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class YOLOTrainer:
    def __init__(self, config_path: str = "training_config.yaml"):
        self.config = self._load_config(config_path)
        self.project_dir = Path(self.config.get('project_dir', 'runs/train'))
        self.data_yaml_path = self.config.get('data_yaml_path', 'data.yaml')
        
    def _load_config(self, config_path: str) -> dict:
        """Load training configuration."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {config_path} not found, using defaults")
            return self._get_default_config()
    
    def _get_default_config(self) -> dict:
        """Get default training configuration."""
        return {
            'model_size': 'n',  # n, s, m, l, x
            'epochs': 100,
            'batch_size': 16,
            'img_size': 640,
            'data_yaml_path': 'data.yaml',
            'project_dir': 'runs/train',
            'pretrained_weights': 'yolov8n.pt'
        }
    
    def prepare_dataset(self, data_dir: str, output_dir: str = "data"):
        """Prepare dataset for YOLO training."""
        data_dir = Path(data_dir)
        output_dir = Path(output_dir)
        
        # Create output directories
        train_dir = output_dir / "train"
        val_dir = output_dir / "val"
        train_dir.mkdir(parents=True, exist_ok=True)
        val_dir.mkdir(parents=True, exist_ok=True)
        
        # Create images and labels subdirectories
        for split_dir in [train_dir, val_dir]:
            (split_dir / "images").mkdir(exist_ok=True)
            (split_dir / "labels").mkdir(exist_ok=True)
        
        # Find all image files
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
        image_files = []
        
        for ext in image_extensions:
            image_files.extend(data_dir.rglob(f"*{ext}"))
            image_files.extend(data_dir.rglob(f"*{ext.upper()}"))
        
        logger.info(f"Found {len(image_files)} image files")
        
        # Split into train/validation (80/20)
        import random
        random.shuffle(image_files)
        split_idx = int(len(image_files) * 0.8)
        train_files = image_files[:split_idx]
        val_files = image_files[split_idx:]
        
        logger.info(f"Training: {len(train_files)}, Validation: {len(val_files)}")
        
        # Copy files to appropriate directories
        self._copy_dataset_files(train_files, train_dir, "train")
        self._copy_dataset_files(val_files, val_dir, "val")
        
        # Create data.yaml
        self._create_data_yaml(output_dir)
        
        logger.info(f"Dataset prepared in {output_dir}")
        return output_dir
    
    def _copy_dataset_files(self, files: List[Path], target_dir: Path, split_name: str):
        """Copy dataset files to target directory."""
        images_dir = target_dir / "images"
        labels_dir = target_dir / "labels"
        
        for img_file in files:
            # Copy image
            img_dest = images_dir / img_file.name
            shutil.copy2(img_file, img_dest)
            
            # Copy corresponding label file if it exists
            label_file = img_file.with_suffix('.txt')
            if label_file.exists():
                label_dest = labels_dir / label_file.name
                shutil.copy2(label_file, label_dest)
            else:
                logger.warning(f"No label file found for {img_file}")
        
        logger.info(f"Copied {len(files)} files to {split_name} set")
    
    def _create_data_yaml(self, data_dir: Path):
        """Create data.yaml file for YOLO training."""
        # Get class names from config or infer from labels
        class_names = self.config.get('classes', [
            'hard_hat', 'safety_vest', 'safety_glasses', 'work_boots',
            'forklift', 'crane', 'excavator', 'truck',
            'worker', 'unauthorized_person', 'vehicle',
            'fire', 'spill', 'hazard_zone'
        ])
        
        data_yaml = {
            'path': str(data_dir.absolute()),
            'train': 'train/images',
            'val': 'val/images',
            'nc': len(class_names),
            'names': class_names
        }
        
        yaml_path = data_dir / "data.yaml"
        with open(yaml_path, 'w') as f:
            yaml.dump(data_yaml, f, default_flow_style=False)
        
        logger.info(f"Created data.yaml with {len(class_names)} classes")
        self.data_yaml_path = str(yaml_path)
    
    def train_model(self, model_size: str = None, epochs: int = None, 
                   batch_size: int = None, img_size: int = None):
        """Train YOLO model."""
        # Use config values or defaults
        model_size = model_size or self.config.get('model_size', 'n')
        epochs = epochs or self.config.get('epochs', 100)
        batch_size = batch_size or self.config.get('batch_size', 16)
        img_size = img_size or self.config.get('img_size', 640)
        
        # Load base model
        model_name = f"yolov8{model_size}.pt"
        logger.info(f"Loading base model: {model_name}")
        
        try:
            model = YOLO(model_name)
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            logger.info("Downloading base model...")
            model = YOLO(model_name)
        
        # Training arguments
        train_args = {
            'data': self.data_yaml_path,
            'epochs': epochs,
            'batch': batch_size,
            'imgsz': img_size,
            'project': self.project_dir,
            'name': f'yolo_safety_{model_size}',
            'patience': 20,
            'save': True,
            'save_period': 10,
            'cache': False,
            'device': 'auto',  # Use GPU if available
            'workers': 4,
            'pretrained': True,
            'optimizer': 'auto',
            'lr0': 0.01,
            'lrf': 0.01,
            'momentum': 0.937,
            'weight_decay': 0.0005,
            'warmup_epochs': 3.0,
            'warmup_momentum': 0.8,
            'warmup_bias_lr': 0.1,
            'box': 7.5,
            'cls': 0.5,
            'dfl': 1.5,
            'pose': 12.0,
            'kobj': 1.0,
            'label_smoothing': 0.0,
            'nbs': 64,
            'overlap_mask': True,
            'mask_ratio': 4,
            'dropout': 0.0,
            'val': True
        }
        
        logger.info(f"Starting training with {epochs} epochs, batch size {batch_size}")
        logger.info(f"Training arguments: {train_args}")
        
        # Start training
        try:
            results = model.train(**train_args)
            logger.info("Training completed successfully!")
            
            # Save training results
            results_path = Path(self.project_dir) / f'yolo_safety_{model_size}' / 'results.json'
            with open(results_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"Training results saved to {results_path}")
            return results
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            return None
    
    def validate_model(self, model_path: str, data_yaml: str = None):
        """Validate trained model."""
        data_yaml = data_yaml or self.data_yaml_path
        
        if not os.path.exists(model_path):
            logger.error(f"Model file not found: {model_path}")
            return None
        
        logger.info(f"Validating model: {model_path}")
        
        try:
            model = YOLO(model_path)
            results = model.val(data=data_yaml)
            
            logger.info("Validation completed!")
            logger.info(f"mAP50: {results.box.map50:.4f}")
            logger.info(f"mAP50-95: {results.box.map:.4f}")
            
            return results
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return None
    
    def export_model(self, model_path: str, format: str = 'onnx'):
        """Export model to different formats."""
        if not os.path.exists(model_path):
            logger.error(f"Model file not found: {model_path}")
            return None
        
        logger.info(f"Exporting model to {format} format")
        
        try:
            model = YOLO(model_path)
            exported_path = model.export(format=format)
            
            logger.info(f"Model exported to: {exported_path}")
            return exported_path
            
        except Exception as e:
            logger.error(f"Export failed: {e}")
            return None

def main():
    parser = argparse.ArgumentParser(description="Train custom YOLO model for safety detection")
    parser.add_argument("--config", "-c", default="training_config.yaml", help="Training configuration file")
    parser.add_argument("--data", "-d", required=True, help="Path to dataset directory")
    parser.add_argument("--prepare-only", action="store_true", help="Only prepare dataset, don't train")
    parser.add_argument("--model-size", "-m", choices=['n', 's', 'm', 'l', 'x'], default='n', help="YOLO model size")
    parser.add_argument("--epochs", "-e", type=int, default=100, help="Number of training epochs")
    parser.add_argument("--batch-size", "-b", type=int, default=16, help="Training batch size")
    parser.add_argument("--img-size", "-i", type=int, default=640, help="Input image size")
    parser.add_argument("--validate", action="store_true", help="Validate model after training")
    parser.add_argument("--export", choices=['onnx', 'tflite', 'coreml'], help="Export model format")
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = YOLOTrainer(args.config)
    
    # Prepare dataset
    logger.info("Preparing dataset...")
    data_dir = trainer.prepare_dataset(args.data)
    
    if args.prepare_only:
        logger.info("Dataset preparation completed. Exiting.")
        return
    
    # Train model
    logger.info("Starting model training...")
    results = trainer.train_model(
        model_size=args.model_size,
        epochs=args.epochs,
        batch_size=args.batch_size,
        img_size=args.img_size
    )
    
    if results is None:
        logger.error("Training failed!")
        return
    
    # Find best model
    model_dir = Path(trainer.project_dir) / f'yolo_safety_{args.model_size}'
    best_model = model_dir / 'weights' / 'best.pt'
    
    if not best_model.exists():
        logger.error("Best model not found!")
        return
    
    # Validate model
    if args.validate:
        logger.info("Validating model...")
        trainer.validate_model(str(best_model))
    
    # Export model
    if args.export:
        logger.info(f"Exporting model to {args.export}...")
        trainer.export_model(str(best_model), args.export)
    
    logger.info("Training pipeline completed successfully!")

if __name__ == "__main__":
    main()
