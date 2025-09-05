# 🎯 Nexxau AI Detection System

## 🚀 Overview
The Nexxau AI Detection System is a comprehensive YOLO-based safety monitoring solution that can detect PPE compliance, equipment safety, site hazards, and behavioral violations in real-time.

## ✨ Features
- **Real-time Detection**: Live camera feed analysis using YOLOv8
- **Custom Training**: Train models on your specific safety scenarios
- **Data Collection**: Automated footage collection from multiple cameras
- **Annotation Tools**: Integrated tools for data labeling
- **Model Management**: Easy training, validation, and deployment
- **Safety Classes**: 14+ predefined safety detection categories

## 🏗️ Architecture

### **Core Components**
```
ai-detection/
├── src/                    # Core detection service
├── scripts/               # Training and data collection
├── data/                  # Training data and models
├── models/                # Trained model weights
└── configs/               # Configuration files
```

### **Detection Pipeline**
1. **Camera Streams** → RTSP/HLS feeds from worksite cameras
2. **Frame Processing** → Real-time frame analysis
3. **YOLO Detection** → Object detection and classification
4. **Rule Evaluation** → Safety rule checking
5. **Alert Generation** → Violation notifications and actions

## 🚀 Quick Start

### **1. Environment Setup**
```bash
cd ai-detection
python quick_start.py setup
```

### **2. Camera Configuration**
Edit `cameras.json` with your camera details:
```json
{
  "camera_001": {
    "name": "Main Entrance",
    "stream_url": "rtsp://username:password@camera_ip:554/stream1",
    "location": "Main entrance of worksite",
    "type": "entrance_monitoring"
  }
}
```

### **3. Data Collection**
```bash
# Take snapshots from all cameras
python quick_start.py collect

# Or use the data collection script directly
python scripts/data_collection/collect_footage.py --mode snapshot
```

### **4. Data Annotation**
Install and use LabelImg for annotation:
```bash
pip install labelImg
labelImg
```

### **5. Model Training**
```bash
python quick_start.py train
```

## 📊 Safety Detection Classes

### **PPE Compliance**
- `hard_hat` - Safety helmets, hard hats
- `safety_vest` - High-visibility vests
- `safety_glasses` - Safety goggles
- `work_boots` - Steel-toe boots

### **Equipment & Vehicles**
- `forklift` - Forklifts, lift trucks
- `crane` - Tower cranes, mobile cranes
- `excavator` - Excavators, diggers
- `truck` - Construction trucks
- `vehicle` - Other vehicles

### **People & Access**
- `worker` - Workers with proper PPE
- `unauthorized_person` - People without PPE/access

### **Hazards & Emergencies**
- `fire` - Fire, smoke, flames
- `spill` - Chemical spills, liquid hazards
- `hazard_zone` - Dangerous areas

## 🛠️ Usage Examples

### **Data Collection**
```bash
# Take snapshots from all cameras
python scripts/data_collection/collect_footage.py --mode snapshot

# Record 5-minute video from all cameras
python scripts/data_collection/collect_footage.py --mode record --duration 300

# Continuous capture every 30 seconds
python scripts/data_collection/collect_footage.py --mode continuous --interval 30
```

### **Model Training**
```bash
# Basic training with default parameters
python scripts/training/train_yolo.py --data data/annotated

# Custom training parameters
python scripts/training/train_yolo.py \
  --data data/annotated \
  --model-size m \
  --epochs 200 \
  --batch-size 32 \
  --img-size 640

# Prepare dataset only
python scripts/training/train_yolo.py --data data/raw --prepare-only
```

### **Model Validation**
```bash
# Validate trained model
python scripts/training/train_yolo.py \
  --data data/annotated \
  --validate \
  --export onnx
```

## 📁 Data Organization

### **Directory Structure**
```
data/
├── raw/                    # Original camera footage
│   ├── camera_001/        # Camera-specific folders
│   └── camera_002/
├── annotated/             # Labeled training data
│   ├── images/           # Image files
│   └── labels/           # YOLO format labels
├── training/              # Training dataset (80%)
│   ├── images/
│   └── labels/
└── validation/            # Validation dataset (20%)
    ├── images/
    └── labels/
```

### **File Naming Convention**
- **Images**: `camera_id_timestamp_description.jpg`
- **Labels**: `camera_id_timestamp_description.txt`
- **Examples**:
  - `camera_001_20240827_143022_construction_zone.jpg`
  - `camera_001_20240827_143022_construction_zone.txt`

## ⚙️ Configuration

### **Training Configuration**
Edit `training_config.yaml` to customize:
- Model size (nano, small, medium, large, xlarge)
- Training epochs and batch size
- Learning rates and optimization
- Data augmentation settings
- Hardware configuration

### **Camera Configuration**
Edit `cameras.json` to define:
- Camera stream URLs
- Location and type information
- Focus areas for detection
- Monitoring priorities

## 🔧 Advanced Features

### **Custom Model Training**
```python
from scripts.training.train_yolo import YOLOTrainer

trainer = YOLOTrainer("custom_config.yaml")
trainer.prepare_dataset("path/to/data")
results = trainer.train_model(
    model_size='m',
    epochs=150,
    batch_size=24
)
```

### **Real-time Detection**
```python
from src.main import AIDetectionService

service = AIDetectionService("config.json")
service.connect_camera("camera_001", "rtsp://...")
detections = service.process_frame(frame, "camera_001")
```

### **Model Export**
```python
# Export to different formats
trainer.export_model("best.pt", "onnx")      # ONNX format
trainer.export_model("best.pt", "tflite")    # TensorFlow Lite
trainer.export_model("best.pt", "coreml")    # Core ML
```

## 📈 Performance Optimization

### **Training Optimization**
- Use GPU acceleration when available
- Adjust batch size based on memory
- Use data augmentation for better generalization
- Implement early stopping to prevent overfitting

### **Inference Optimization**
- Use smaller model sizes for real-time applications
- Implement frame skipping for high-FPS streams
- Use model quantization for edge deployment
- Cache detection results for similar frames

## 🚨 Troubleshooting

### **Common Issues**

**Camera Connection Failed**
- Check RTSP URL format
- Verify network connectivity
- Check camera credentials
- Test with VLC player first

**Training Errors**
- Ensure sufficient disk space
- Check GPU memory availability
- Verify data format and structure
- Check Python package versions

**Poor Detection Accuracy**
- Increase training data quantity
- Improve annotation quality
- Adjust model size and parameters
- Use data augmentation

### **Debug Commands**
```bash
# Check environment
python quick_start.py check

# Test camera connection
python scripts/data_collection/collect_footage.py --mode snapshot

# Validate dataset
python scripts/training/train_yolo.py --data data/annotated --prepare-only
```

## 📚 Documentation

- **ANNOTATION_GUIDE.md** - Detailed annotation instructions
- **training_config.yaml** - Training configuration options
- **cameras.json** - Camera configuration template
- **requirements.txt** - Python dependencies

## 🤝 Contributing

1. Follow the established code structure
2. Add comprehensive documentation
3. Test with multiple camera types
4. Validate training results
5. Update configuration templates

## 📄 License

This project is proprietary to Nexxau. All rights reserved.

## 🆘 Support

For technical support and questions:
- Check the troubleshooting section
- Review configuration files
- Consult the annotation guide
- Contact the development team

---

**🎯 Remember**: Quality data + Proper training = Accurate safety detection! 🛡️
