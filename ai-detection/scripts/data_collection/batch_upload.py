#!/usr/bin/env python3
"""
Nexxau AI Detection - Batch Image Upload Script
Simple script to upload many images at once
"""

import os
import shutil
from pathlib import Path
import argparse

def batch_upload(source_folder: str, destination: str = "data/raw/uploaded_images"):
    """Upload all images from source folder to destination."""
    
    source_path = Path(source_folder)
    dest_path = Path(destination)
    
    if not source_path.exists():
        print(f"❌ Source folder not found: {source_path}")
        return False
    
    # Create destination folder
    dest_path.mkdir(parents=True, exist_ok=True)
    
    # Find all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
    image_files = []
    
    for ext in image_extensions:
        image_files.extend(source_path.rglob(f"*{ext}"))
        image_files.extend(source_path.rglob(f"*{ext.upper()}"))
    
    if not image_files:
        print(f"❌ No image files found in {source_path}")
        return False
    
    print(f"📤 Found {len(image_files)} images to upload")
    
    # Copy images
    copied_count = 0
    for img_file in image_files:
        try:
            # Generate unique filename
            filename = f"uploaded_{copied_count:04d}_{img_file.name}"
            dest_file = dest_path / filename
            
            shutil.copy2(img_file, dest_file)
            copied_count += 1
            
            if copied_count % 10 == 0:
                print(f"✅ Uploaded {copied_count}/{len(image_files)} images...")
                
        except Exception as e:
            print(f"❌ Failed to copy {img_file.name}: {e}")
    
    print(f"✅ Successfully uploaded {copied_count} images to {dest_path}")
    return True

def main():
    parser = argparse.ArgumentParser(description="Batch upload images for YOLO training")
    parser.add_argument("source_folder", help="Folder containing images to upload")
    parser.add_argument("--destination", "-d", default="data/raw/uploaded_images", 
                       help="Destination folder (default: data/raw/uploaded_images)")
    
    args = parser.parse_args()
    
    print("🚀 Nexxau AI Detection - Batch Image Upload")
    print("=" * 50)
    
    if batch_upload(args.source_folder, args.destination):
        print("\n💡 Next steps:")
        print("  1. Review uploaded images")
        print("  2. Organize by category (optional)")
        print("  3. Annotate images using LabelImg")
        print("  4. Start training preparation")
    else:
        print("❌ Upload failed!")

if __name__ == "__main__":
    main()
