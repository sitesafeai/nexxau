#!/usr/bin/env python3
"""
Nexxau AI Detection - Image Upload & Organization Script
Helps organize uploaded images for YOLO training
"""

import os
import shutil
import argparse
from pathlib import Path
from typing import List, Dict
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ImageUploader:
    def __init__(self, base_dir: str = "data"):
        self.base_dir = Path(base_dir)
        self.upload_dir = self.base_dir / "raw" / "uploaded_images"
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Safety detection categories
        self.categories = {
            'ppe_compliance': ['hard_hat', 'safety_vest', 'safety_glasses', 'work_boots'],
            'equipment': ['forklift', 'crane', 'excavator', 'truck', 'vehicle'],
            'hazards': ['fire', 'spill', 'hazard_zone'],
            'people': ['worker', 'unauthorized_person'],
            'normal_operations': ['safe_work', 'compliance']
        }
    
    def upload_images(self, source_path: str, organize: bool = False):
        """Upload images from source path."""
        source_path = Path(source_path)
        
        if not source_path.exists():
            logger.error(f"Source path does not exist: {source_path}")
            return False
        
        # Find all image files
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
        image_files = []
        
        for ext in image_extensions:
            image_files.extend(source_path.rglob(f"*{ext}"))
            image_files.extend(source_path.rglob(f"*{ext.upper()}"))
        
        logger.info(f"Found {len(image_files)} image files")
        
        if organize:
            # Organize by category
            self._organize_by_category(image_files)
        else:
            # Simple upload to uploaded_images folder
            self._simple_upload(image_files)
        
        return True
    
    def _simple_upload(self, image_files: List[Path]):
        """Simple upload to uploaded_images folder."""
        logger.info("📤 Uploading images to uploaded_images folder...")
        
        for img_file in image_files:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"uploaded_{timestamp}_{img_file.name}"
            dest_path = self.upload_dir / filename
            
            # Copy file
            shutil.copy2(img_file, dest_path)
            logger.info(f"✅ Uploaded: {filename}")
        
        logger.info(f"✅ Uploaded {len(image_files)} images to {self.upload_dir}")
    
    def _organize_by_category(self, image_files: List[Path]):
        """Organize images by safety category."""
        logger.info("📁 Organizing images by safety category...")
        
        # Create category directories
        for category in self.categories.keys():
            category_dir = self.base_dir / "raw" / category
            category_dir.mkdir(parents=True, exist_ok=True)
        
        # Ask user to categorize each image
        print("\n🎯 Image Organization - Categorize your images:")
        print("Available categories:")
        for i, category in enumerate(self.categories.keys(), 1):
            print(f"  {i}. {category}")
        print("  0. Skip organization (upload to uploaded_images)")
        
        organized_count = 0
        skipped_count = 0
        
        for img_file in image_files:
            print(f"\n📸 Image: {img_file.name}")
            print("Categories:")
            for i, category in enumerate(self.categories.keys(), 1):
                print(f"  {i}. {category}")
            print("  0. Skip")
            
            try:
                choice = input("Choose category (0-5): ").strip()
                
                if choice == "0":
                    # Skip organization
                    dest_path = self.upload_dir / img_file.name
                    shutil.copy2(img_file, dest_path)
                    skipped_count += 1
                    logger.info(f"⏭️ Skipped: {img_file.name}")
                elif choice.isdigit() and 1 <= int(choice) <= len(self.categories):
                    # Organize by category
                    category_name = list(self.categories.keys())[int(choice) - 1]
                    category_dir = self.base_dir / "raw" / category_name
                    
                    # Generate unique filename
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                    filename = f"{category_name}_{timestamp}_{img_file.name}"
                    dest_path = category_dir / filename
                    
                    shutil.copy2(img_file, dest_path)
                    organized_count += 1
                    logger.info(f"✅ Organized: {filename} -> {category_name}")
                else:
                    logger.warning(f"⚠️ Invalid choice, skipping: {img_file.name}")
                    skipped_count += 1
                    
            except KeyboardInterrupt:
                logger.info("🛑 Organization interrupted by user")
                break
            except Exception as e:
                logger.error(f"❌ Error processing {img_file.name}: {e}")
                skipped_count += 1
        
        logger.info(f"✅ Organization completed: {organized_count} organized, {skipped_count} skipped")
    
    def create_dataset_structure(self):
        """Create the standard YOLO dataset structure."""
        logger.info("📁 Creating YOLO dataset structure...")
        
        # Create main directories
        (self.base_dir / "annotated").mkdir(exist_ok=True)
        (self.base_dir / "training").mkdir(exist_ok=True)
        (self.base_dir / "validation").mkdir(exist_ok=True)
        
        # Create subdirectories
        for main_dir in ["annotated", "training", "validation"]:
            main_path = self.base_dir / main_dir
            (main_path / "images").mkdir(exist_ok=True)
            (main_path / "labels").mkdir(exist_ok=True)
        
        logger.info("✅ Dataset structure created")
    
    def show_upload_summary(self):
        """Show summary of uploaded and organized images."""
        logger.info("📊 Upload Summary:")
        
        # Count images in each directory
        for category_dir in self.base_dir.rglob("*"):
            if category_dir.is_dir() and category_dir.name in ["images", "labels"]:
                parent_dir = category_dir.parent.name
                image_count = len(list(category_dir.glob("*.jpg"))) + len(list(category_dir.glob("*.png")))
                if image_count > 0:
                    logger.info(f"  {parent_dir}: {image_count} images")
        
        # Show next steps
        logger.info("\n💡 Next Steps:")
        logger.info("  1. Review uploaded images")
        logger.info("  2. Annotate images using LabelImg")
        logger.info("  3. Run training preparation script")
        logger.info("  4. Start YOLO training")

def main():
    parser = argparse.ArgumentParser(description="Upload and organize images for YOLO training")
    parser.add_argument("source_path", help="Path to folder containing images")
    parser.add_argument("--organize", "-o", action="store_true", help="Organize images by category")
    parser.add_argument("--create-structure", "-s", action="store_true", help="Create YOLO dataset structure")
    
    args = parser.parse_args()
    
    uploader = ImageUploader()
    
    # Create dataset structure if requested
    if args.create_structure:
        uploader.create_dataset_structure()
    
    # Upload images
    if uploader.upload_images(args.source_path, args.organize):
        uploader.show_upload_summary()
    else:
        logger.error("❌ Upload failed!")

if __name__ == "__main__":
    main()
