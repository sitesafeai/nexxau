#!/usr/bin/env python3
"""
Nexxau AI Detection - Integrate Existing Dataset Script
Integrates existing YOLO datasets with our safety detection system
"""

import os
import shutil
import yaml
import json
from pathlib import Path
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatasetIntegrator:
    def __init__(self, base_dir: str = "data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
        # Map existing classes to our safety detection classes
        self.class_mapping = {
            'boots': 'work_boots',
            'gloves': 'safety_gloves',
            'helmet': 'hard_hat',
            'human': 'worker',
            'vest': 'safety_vest'
        }
        
        # Our complete safety detection classes
        self.safety_classes = [
            'hard_hat', 'safety_vest', 'safety_glasses', 'work_boots', 'safety_gloves',
            'forklift', 'crane', 'excavator', 'truck', 'vehicle',
            'worker', 'unauthorized_person',
            'fire', 'spill', 'hazard_zone'
        ]
    
    def integrate_dataset(self, source_path: str, dataset_name: str = "construction_worker_v1"):
        """Integrate existing YOLO dataset into our system."""
        source_path = Path(source_path)
        
        if not source_path.exists():
            logger.error(f"Source dataset not found: {source_path}")
            return False
        
        logger.info(f"🔗 Integrating dataset: {source_path}")
        
        # Create dataset directory
        dataset_dir = self.base_dir / "integrated" / dataset_name
        dataset_dir.mkdir(parents=True, exist_ok=True)
        
        # Create standard structure
        (dataset_dir / "images").mkdir(exist_ok=True)
        (dataset_dir / "labels").mkdir(exist_ok=True)
        
        # Find and copy images and labels
        image_count = 0
        label_count = 0
        
        # Look for common image extensions
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
        
        for ext in image_extensions:
            # Find images
            for img_file in source_path.rglob(f"*{ext}"):
                if img_file.is_file():
                    # Copy image
                    img_dest = dataset_dir / "images" / img_file.name
                    shutil.copy2(img_file, img_dest)
                    image_count += 1
                    
                    # Look for corresponding label file
                    label_file = img_file.with_suffix('.txt')
                    if label_file.exists():
                        # Convert labels to our class mapping
                        converted_labels = self._convert_labels(label_file)
                        if converted_labels:
                            label_dest = dataset_dir / "labels" / label_file.name
                            with open(label_dest, 'w') as f:
                                f.write(converted_labels)
                            label_count += 1
        
        logger.info(f"✅ Integrated {image_count} images and {label_count} labels")
        
        # Create data.yaml for YOLO training
        self._create_data_yaml(dataset_dir)
        
        # Create dataset summary
        self._create_dataset_summary(dataset_dir, image_count, label_count)
        
        return True
    
    def _convert_labels(self, label_file: Path) -> Optional[str]:
        """Convert existing labels to our class mapping."""
        try:
            with open(label_file, 'r') as f:
                lines = f.readlines()
            
            converted_lines = []
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5:
                    old_class_id = int(parts[0])
                    coordinates = parts[1:5]
                    
                    # Get old class name based on the actual dataset class order
                    # From data.yaml: ['boots', 'gloves', 'helmet', 'human', 'vest']
                    old_classes = ['boots', 'gloves', 'helmet', 'human', 'vest']
                    
                    if old_class_id < len(old_classes):
                        old_class_name = old_classes[old_class_id]
                        new_class_name = self.class_mapping.get(old_class_name)
                        
                        if new_class_name:
                            new_class_id = self.safety_classes.index(new_class_name)
                            new_line = f"{new_class_id} {' '.join(coordinates)}\n"
                            converted_lines.append(new_line)
                        else:
                            # Keep original if no mapping found
                            converted_lines.append(line)
                    else:
                        # Keep original if class ID is out of range
                        converted_lines.append(line)
            
            return ''.join(converted_lines)
            
        except Exception as e:
            logger.error(f"Error converting labels in {label_file}: {e}")
            return None
    
    def _create_data_yaml(self, dataset_dir: Path):
        """Create data.yaml file for YOLO training."""
        data_yaml = {
            'path': str(dataset_dir.absolute()),
            'train': 'images',
            'val': 'images',  # Using same images for validation initially
            'nc': len(self.safety_classes),
            'names': self.safety_classes
        }
        
        yaml_path = dataset_dir / "data.yaml"
        with open(yaml_path, 'w') as f:
            yaml.dump(data_yaml, f, default_flow_style=False)
        
        logger.info(f"✅ Created data.yaml with {len(self.safety_classes)} classes")
    
    def _create_dataset_summary(self, dataset_dir: Path, image_count: int, label_count: int):
        """Create a summary of the integrated dataset."""
        summary = {
            'dataset_name': dataset_dir.name,
            'integration_date': str(Path().cwd()),
            'source_path': str(dataset_dir),
            'statistics': {
                'total_images': image_count,
                'total_labels': label_count,
                'label_coverage': f"{(label_count/image_count*100):.1f}%" if image_count > 0 else "0%"
            },
            'class_mapping': self.class_mapping,
            'safety_classes': self.safety_classes,
            'next_steps': [
                "Review integrated dataset",
                "Validate label conversions",
                "Split into train/validation sets",
                "Start YOLO training"
            ]
        }
        
        summary_path = dataset_dir / "dataset_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"✅ Created dataset summary: {summary_path}")
    
    def prepare_for_training(self, dataset_path: str):
        """Prepare integrated dataset for YOLO training."""
        dataset_path = Path(dataset_path)
        
        if not dataset_path.exists():
            logger.error(f"Dataset not found: {dataset_path}")
            return False
        
        # Create training and validation splits
        train_dir = self.base_dir / "training"
        val_dir = self.base_dir / "validation"
        
        train_dir.mkdir(parents=True, exist_ok=True)
        val_dir.mkdir(parents=True, exist_ok=True)
        
        (train_dir / "images").mkdir(exist_ok=True)
        (train_dir / "labels").mkdir(exist_ok=True)
        (val_dir / "images").mkdir(exist_ok=True)
        (val_dir / "labels").mkdir(exist_ok=True)
        
        # Get all images
        images_dir = dataset_path / "images"
        images = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))
        
        # Split 80/20
        import random
        random.shuffle(images)
        split_idx = int(len(images) * 0.8)
        train_images = images[:split_idx]
        val_images = images[split_idx:]
        
        # Copy to training set
        for img_file in train_images:
            # Copy image
            img_dest = train_dir / "images" / img_file.name
            shutil.copy2(img_file, img_dest)
            
            # Copy label
            label_file = dataset_path / "labels" / img_file.with_suffix('.txt').name
            if label_file.exists():
                label_dest = train_dir / "labels" / label_file.name
                shutil.copy2(label_file, label_dest)
        
        # Copy to validation set
        for img_file in val_images:
            # Copy image
            img_dest = val_dir / "images" / img_file.name
            shutil.copy2(img_file, img_dest)
            
            # Copy label
            label_file = dataset_path / "labels" / img_file.with_suffix('.txt').name
            if label_file.exists():
                label_dest = val_dir / "labels" / label_file.name
                shutil.copy2(label_file, label_dest)
        
        logger.info(f"✅ Prepared training set: {len(train_images)} images")
        logger.info(f"✅ Prepared validation set: {len(val_images)} images")
        
        # Create training data.yaml
        training_data_yaml = {
            'path': str(self.base_dir.absolute()),
            'train': 'training/images',
            'val': 'validation/images',
            'nc': len(self.safety_classes),
            'names': self.safety_classes
        }
        
        training_yaml_path = self.base_dir / "data.yaml"
        with open(training_yaml_path, 'w') as f:
            yaml.dump(training_data_yaml, f, default_flow_style=False)
        
        logger.info(f"✅ Created training data.yaml: {training_yaml_path}")
        return True

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Integrate existing YOLO dataset with safety detection system")
    parser.add_argument("dataset_path", help="Path to existing YOLO dataset folder")
    parser.add_argument("--dataset-name", "-n", default="construction_worker_v1", 
                       help="Name for the integrated dataset")
    parser.add_argument("--prepare-training", "-p", action="store_true", 
                       help="Prepare dataset for training after integration")
    
    args = parser.parse_args()
    
    integrator = DatasetIntegrator()
    
    print("🔗 Nexxau AI Detection - Dataset Integration")
    print("=" * 50)
    
    # Integrate dataset
    if integrator.integrate_dataset(args.dataset_path, args.dataset_name):
        print(f"✅ Successfully integrated dataset: {args.dataset_name}")
        
        # Prepare for training if requested
        if args.prepare_training:
            dataset_path = integrator.base_dir / "integrated" / args.dataset_name
            if integrator.prepare_for_training(str(dataset_path)):
                print("✅ Dataset prepared for training!")
                print("\n💡 Next steps:")
                print("  1. Review integrated dataset")
                print("  2. Start YOLO training:")
                print(f"     python3 scripts/training/train_yolo.py --data {integrator.base_dir}")
            else:
                print("❌ Failed to prepare dataset for training")
    else:
        print("❌ Dataset integration failed!")

if __name__ == "__main__":
    main()
