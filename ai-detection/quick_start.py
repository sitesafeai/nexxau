#!/usr/bin/env python3


"""
Nexxau AI Detection - Quick Start Script
Sets up the environment and provides easy commands for AI detection
"""

import os
import sys
import subprocess
import json
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AIDetectionSetup:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "data"
        self.scripts_dir = self.base_dir / "scripts"
        
    def check_environment(self):
        """Check if the AI detection environment is properly set up."""
        logger.info("🔍 Checking AI detection environment...")
        
        # Check Python version
        python_version = sys.version_info
        if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
            logger.error("❌ Python 3.8+ required. Current version: {}.{}".format(
                python_version.major, python_version.minor))
            return False
        
        logger.info(f"✅ Python {python_version.major}.{python_version.minor} detected")
        
        # Check required packages
        required_packages = ['torch', 'ultralytics', 'opencv', 'numpy']
        missing_packages = []
        
        for package in required_packages:
            try:
                if package == 'opencv':
                    __import__('cv2')
                else:
                    __import__(package.replace('-', '_'))
                logger.info(f"✅ {package} installed")
            except ImportError:
                missing_packages.append(package)
                logger.warning(f"⚠️ {package} not installed")
        
        if missing_packages:
            logger.error(f"❌ Missing packages: {', '.join(missing_packages)}")
            logger.info("Run: pip install -r requirements.txt")
            return False
        
        # Check directories
        required_dirs = ['data', 'scripts', 'models']
        for dir_name in required_dirs:
            dir_path = self.base_dir / dir_name
            if not dir_path.exists():
                logger.warning(f"⚠️ Directory {dir_name} not found, creating...")
                dir_path.mkdir(exist_ok=True)
        
        logger.info("✅ Environment check completed")
        return True
    
    def install_dependencies(self):
        """Install required dependencies."""
        logger.info("📦 Installing dependencies...")
        
        try:
            requirements_file = self.base_dir / "requirements.txt"
            if requirements_file.exists():
                subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)], 
                            check=True, capture_output=True)
                logger.info("✅ Dependencies installed successfully")
            else:
                logger.error("❌ requirements.txt not found")
                return False
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to install dependencies: {e}")
            return False
        
        return True
    
    def setup_camera_config(self):
        """Set up camera configuration file."""
        logger.info("📹 Setting up camera configuration...")
        
        config_file = self.base_dir / "cameras.json"
        if not config_file.exists():
            logger.info("Creating camera configuration template...")
            
            template_config = {
                "camera_001": {
                    "name": "Main Entrance",
                    "stream_url": "rtsp://username:password@camera_ip:554/stream1",
                    "location": "Main entrance of worksite",
                    "type": "entrance_monitoring",
                    "focus_areas": ["PPE compliance", "unauthorized access", "vehicle safety"]
                }
            }
            
            with open(config_file, 'w') as f:
                json.dump(template_config, f, indent=2)
            
            logger.info("✅ Camera configuration template created")
            logger.info("⚠️ Please edit cameras.json with your actual camera details")
        else:
            logger.info("✅ Camera configuration already exists")
        
        return True
    
    def collect_sample_data(self):
        """Collect sample data from cameras for testing."""
        logger.info("📸 Collecting sample data...")
        
        collector_script = self.scripts_dir / "data_collection" / "collect_footage.py"
        if not collector_script.exists():
            logger.error("❌ Data collection script not found")
            return False
        
        try:
            # Take snapshots from all cameras
            cmd = [sys.executable, str(collector_script), "--mode", "snapshot"]
            subprocess.run(cmd, check=True, cwd=self.base_dir)
            logger.info("✅ Sample data collected")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to collect sample data: {e}")
            return False
    
    def start_training_pipeline(self):
        """Start the YOLO training pipeline."""
        logger.info("🚀 Starting YOLO training pipeline...")
        
        training_script = self.scripts_dir / "training" / "train_yolo.py"
        if not training_script.exists():
            logger.error("❌ Training script not found")
            return False
        
        # Check if we have data
        data_path = self.data_dir / "annotated"
        if not data_path.exists() or not any(data_path.iterdir()):
            logger.warning("⚠️ No annotated data found. Please collect and annotate data first.")
            logger.info("💡 Use: python scripts/data_collection/collect_footage.py --mode continuous")
            return False
        
        try:
            # Start training with default parameters
            cmd = [sys.executable, str(training_script), "--data", str(data_path), "--epochs", "50"]
            subprocess.run(cmd, check=True, cwd=self.base_dir)
            logger.info("✅ Training pipeline completed")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Training pipeline failed: {e}")
            return False
    
    def show_help(self):
        """Show help information."""
        help_text = """
🎯 Nexxau AI Detection - Quick Start Guide

📋 Available Commands:
  setup          - Set up the AI detection environment
  check          - Check environment status
  collect        - Collect sample data from cameras
  train          - Start YOLO training pipeline
  help           - Show this help message

🚀 Quick Start Workflow:
  1. python quick_start.py setup      # Initial setup
  2. python quick_start.py collect    # Collect data from cameras
  3. Annotate data using LabelImg     # Manual annotation step
  4. python quick_start.py train      # Train YOLO model
  5. Deploy trained model             # Integration step

📁 Directory Structure:
  data/          - Training data and models
  scripts/       - Data collection and training scripts
  models/        - Trained models and weights

📚 Documentation:
  ANNOTATION_GUIDE.md  - How to annotate data
  training_config.yaml - Training configuration
  cameras.json        - Camera configuration

💡 Tips:
  - Edit cameras.json with your actual camera details
  - Use LabelImg for data annotation
  - Start with small datasets for testing
  - Monitor training progress in runs/train/
        """
        print(help_text)

def main():
    if len(sys.argv) < 2:
        print("Usage: python quick_start.py <command>")
        print("Commands: setup, check, collect, train, help")
        return
    
    command = sys.argv[1].lower()
    setup = AIDetectionSetup()
    
    if command == "setup":
        logger.info("🚀 Setting up Nexxau AI Detection...")
        
        if setup.check_environment():
            if setup.install_dependencies():
                if setup.setup_camera_config():
                    logger.info("✅ Setup completed successfully!")
                    logger.info("💡 Next steps:")
                    logger.info("   1. Edit cameras.json with your camera details")
                    logger.info("   2. Run: python quick_start.py collect")
                    logger.info("   3. Annotate collected data")
                    logger.info("   4. Run: python quick_start.py train")
                else:
                    logger.error("❌ Failed to setup camera configuration")
            else:
                logger.error("❌ Failed to install dependencies")
        else:
            logger.error("❌ Environment check failed")
    
    elif command == "check":
        setup.check_environment()
    
    elif command == "collect":
        if setup.check_environment():
            if setup.setup_camera_config():
                setup.collect_sample_data()
            else:
                logger.error("❌ Camera configuration not set up")
        else:
            logger.error("❌ Environment check failed")
    
    elif command == "train":
        if setup.check_environment():
            setup.start_training_pipeline()
        else:
            logger.error("❌ Environment check failed")
    
    elif command == "help":
        setup.show_help()
    
    else:
        logger.error(f"❌ Unknown command: {command}")
        print("Available commands: setup, check, collect, train, help")

if __name__ == "__main__":
    main()
