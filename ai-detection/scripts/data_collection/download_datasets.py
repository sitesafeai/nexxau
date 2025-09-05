#!/usr/bin/env python3
"""
Nexxau AI Detection - Dataset Download Script
Downloads and organizes external training datasets
"""

import os
import requests
import zipfile
from pathlib import Path
import logging
from tqdm import tqdm

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatasetDownloader:
    def __init__(self, output_dir: str = "data/external_datasets"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Dataset sources and URLs
        self.datasets = {
            "coco_sample": {
                "url": "https://download.openmmlab.com/mmyolo/data/coco_sample.zip",
                "description": "COCO dataset sample with construction equipment",
                "size": "~50MB"
            },
            "ppe_sample": {
                "url": "https://github.com/ultralytics/yolov5/releases/download/v1.0/coco128.zip",
                "description": "Sample dataset for PPE detection",
                "size": "~25MB"
            }
        }
    
    def download_file(self, url: str, filename: str) -> bool:
        """Download a file with progress bar."""
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            filepath = self.output_dir / filename
            
            with open(filepath, 'wb') as f, tqdm(
                desc=filename,
                total=total_size,
                unit='B',
                unit_scale=True,
                unit_divisor=1024,
            ) as pbar:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        pbar.update(len(chunk))
            
            logger.info(f"✅ Downloaded {filename}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to download {filename}: {e}")
            return False
    
    def extract_zip(self, zip_path: Path, extract_dir: Path) -> bool:
        """Extract a zip file."""
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            logger.info(f"✅ Extracted {zip_path.name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to extract {zip_path.name}: {e}")
            return False
    
    def organize_dataset(self, dataset_name: str, source_dir: Path):
        """Organize downloaded dataset into proper structure."""
        target_dir = self.output_dir / dataset_name
        target_dir.mkdir(exist_ok=True)
        
        # Create standard structure
        (target_dir / "images").mkdir(exist_ok=True)
        (target_dir / "labels").mkdir(exist_ok=True)
        
        # Move images and labels
        for ext in ['.jpg', '.jpeg', '.png', '.bmp']:
            for img_file in source_dir.rglob(f"*{ext}"):
                if img_file.is_file():
                    # Move to images folder
                    img_dest = target_dir / "images" / img_file.name
                    img_file.rename(img_dest)
        
        for label_file in source_dir.rglob("*.txt"):
            if label_file.is_file():
                # Move to labels folder
                label_dest = target_dir / "labels" / label_file.name
                label_file.rename(label_dest)
        
        logger.info(f"✅ Organized {dataset_name} dataset")
    
    def download_all(self):
        """Download all available datasets."""
        logger.info("🚀 Starting dataset downloads...")
        
        for dataset_name, dataset_info in self.datasets.items():
            logger.info(f"📥 Downloading {dataset_name}: {dataset_info['description']}")
            
            # Extract filename from URL
            filename = dataset_info['url'].split('/')[-1]
            
            # Download dataset
            if self.download_file(dataset_info['url'], filename):
                # Extract if it's a zip file
                if filename.endswith('.zip'):
                    zip_path = self.output_dir / filename
                    extract_dir = self.output_dir / dataset_name
                    
                    if self.extract_zip(zip_path, extract_dir):
                        # Organize the extracted data
                        self.organize_dataset(dataset_name, extract_dir)
                        
                        # Clean up zip file
                        zip_path.unlink()
        
        logger.info("✅ Dataset download completed!")
    
    def create_synthetic_data_guide(self):
        """Create a guide for generating synthetic training data."""
        guide_path = self.output_dir / "SYNTHETIC_DATA_GUIDE.md"
        
        guide_content = """# 🎨 Synthetic Data Generation Guide

## Overview
Synthetic data can supplement real-world data for training safety detection models.

## Tools & Methods

### 1. Blender (Free)
- 3D modeling and rendering
- Create realistic construction scenes
- Generate diverse lighting conditions

### 2. Unity (Free for Personal Use)
- Game engine for synthetic data
- Physics-based simulations
- Multiple camera angles

### 3. Python Libraries
- **PIL/Pillow**: Image manipulation
- **OpenCV**: Image processing
- **Matplotlib**: Basic graphics

## Safety Scenarios to Generate

### PPE Compliance
- Workers with/without hard hats
- Safety vest variations
- Different lighting conditions
- Various work activities

### Equipment & Vehicles
- Forklifts in different positions
- Cranes in operation
- Construction equipment
- Vehicle safety violations

### Hazard Detection
- Restricted area access
- Unsafe work practices
- Emergency situations
- Environmental hazards

## Quality Standards
- Realistic appearance
- Varied backgrounds
- Different perspectives
- Consistent labeling

## Integration
- Convert to YOLO format
- Validate with real data
- Use for data augmentation
        """
        
        with open(guide_path, 'w') as f:
            f.write(guide_content)
        
        logger.info("✅ Created synthetic data generation guide")

def main():
    downloader = DatasetDownloader()
    
    print("🎯 Nexxau AI Detection - Dataset Downloader")
    print("=" * 50)
    
    # Show available datasets
    print("\n📚 Available Datasets:")
    for name, info in downloader.datasets.items():
        print(f"  • {name}: {info['description']} ({info['size']})")
    
    print("\n🚀 Starting download...")
    downloader.download_all()
    
    # Create synthetic data guide
    downloader.create_synthetic_data_guide()
    
    print("\n✅ Setup completed!")
    print("\n💡 Next steps:")
    print("  1. Review downloaded datasets")
    print("  2. Start collecting your own camera footage")
    print("  3. Begin annotation process")
    print("  4. Train your first model")

if __name__ == "__main__":
    main()
