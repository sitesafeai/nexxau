# 🎯 YOLO Training Guide for SiteSafe PPE Detection

Complete guide for training your custom YOLOv8 model for construction site safety monitoring.

---

## 📊 **DETECTION CLASSES TO TRAIN**

Your YOLO model needs to detect **26 classes** across 5 categories:

### **🦺 Category 1: PPE (Personal Protective Equipment) - 12 classes**

**CRITICAL - Must have high accuracy (>90%)**

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 0 | `person_with_hardhat` | 🔴 CRITICAL | 5,000+ |
| 1 | `person_without_hardhat` | 🔴 CRITICAL | 5,000+ |
| 2 | `person_with_safety_vest` | 🔴 CRITICAL | 4,000+ |
| 3 | `person_without_safety_vest` | 🔴 CRITICAL | 4,000+ |
| 4 | `person_with_gloves` | 🟡 HIGH | 3,000+ |
| 5 | `person_without_gloves` | 🟡 HIGH | 3,000+ |
| 6 | `person_with_safety_goggles` | 🟡 HIGH | 2,500+ |
| 7 | `person_without_safety_goggles` | 🟡 HIGH | 2,500+ |
| 8 | `person_with_fall_harness` | 🔴 CRITICAL | 2,000+ |
| 9 | `person_without_fall_harness` | 🔴 CRITICAL | 2,000+ |
| 10 | `person_with_safety_boots` | 🟢 MEDIUM | 1,500+ |
| 11 | `person_without_safety_boots` | 🟢 MEDIUM | 1,500+ |

**Total PPE images needed: ~36,000 labeled images**

---

### **👤 Category 2: Person States - 4 classes**

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 12 | `person_standing` | 🟢 MEDIUM | 3,000+ |
| 13 | `person_fallen` | 🔴 CRITICAL | 2,000+ |
| 14 | `person_climbing` | 🟡 HIGH | 2,000+ |
| 15 | `person_running` | 🟡 HIGH | 1,500+ |

**Total: ~8,500 images**

---

### **🚜 Category 3: Heavy Equipment - 6 classes**

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 16 | `forklift` | 🟡 HIGH | 2,000+ |
| 17 | `excavator` | 🟡 HIGH | 1,500+ |
| 18 | `crane` | 🟡 HIGH | 1,500+ |
| 19 | `ladder` | 🟢 MEDIUM | 1,500+ |
| 20 | `scaffolding` | 🟡 HIGH | 1,500+ |
| 21 | `power_tool` | 🟢 MEDIUM | 1,000+ |

**Total: ~9,000 images**

---

### **🚗 Category 4: Vehicles - 3 classes**

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 22 | `truck` | 🟢 MEDIUM | 2,000+ |
| 23 | `van` | 🟢 MEDIUM | 1,000+ |
| 24 | `car` | 🟢 MEDIUM | 1,000+ |

**Total: ~4,000 images**

---

### **🚧 Category 5: Safety Barriers - 4 classes**

| Class ID | Class Name | Priority | Training Images Needed |
|----------|-----------|----------|------------------------|
| 25 | `safety_cone` | 🟢 MEDIUM | 1,500+ |
| 26 | `barrier` | 🟢 MEDIUM | 1,500+ |
| 27 | `caution_tape` | 🟢 MEDIUM | 1,000+ |
| 28 | `fire_extinguisher` | 🟢 MEDIUM | 1,000+ |

**Total: ~5,000 images**

---

## 📈 **TOTAL DATASET SIZE:**

- **Total Classes**: 29
- **Total Images Needed**: ~62,500 (minimum)
- **Recommended**: 100,000+ images for production-grade accuracy

---

## 🎯 **TRAINING PRIORITIES (Start Here)**

### **Phase 1: MVP (Minimum Viable Product)**
Train these **6 critical classes** first:

1. ✅ `person_with_hardhat` (5,000 images)
2. ✅ `person_without_hardhat` (5,000 images)
3. ✅ `person_with_safety_vest` (4,000 images)
4. ✅ `person_without_safety_vest` (4,000 images)
5. ✅ `person_fallen` (2,000 images)
6. ✅ `person_standing` (3,000 images)

**Total for MVP: 23,000 images**

This gives you:
- ✅ Hard hat detection (most critical PPE)
- ✅ Safety vest detection (OSHA requirement)
- ✅ Fall detection (life-threatening)

### **Phase 2: Expand PPE**
Add these **4 classes**:

7. `person_with_gloves`
8. `person_without_gloves`
9. `person_with_fall_harness`
10. `person_without_fall_harness`

### **Phase 3: Equipment & Zones**
Add remaining classes for complete coverage.

---

## 📁 **DATASET SOURCES**

### **Option 1: Public Datasets**

1. **Construction Site Safety Dataset (Roboflow)**
   - Link: https://universe.roboflow.com/search?q=construction+safety
   - Contains: Hard hats, safety vests, workers
   - Size: 10,000-50,000 images

2. **PPE Detection Dataset (Kaggle)**
   - Link: https://www.kaggle.com/datasets/snehilsanyal/ppe-dataset
   - Contains: Hard hats, safety vests, masks
   - Size: 5,000+ images

3. **Construction Worker Safety Dataset**
   - Link: https://universe.roboflow.com/workspace-yltkk/construction-site-safety
   - Contains: Full PPE detection
   - Size: 15,000+ images

4. **COCO Dataset (for general objects)**
   - Link: https://cocodataset.org/
   - Contains: Person, truck, car, etc.
   - Size: 330,000+ images

### **Option 2: Custom Data Collection**

**Collect your own data from:**
- Construction site cameras (with permission)
- YouTube construction videos (extract frames)
- Stock photo sites (Pexels, Unsplash, Shutterstock)
- Hire workers to pose with/without PPE

**Tools for collection:**
- `youtube-dl` or `yt-dlp` for video download
- `ffmpeg` for frame extraction
- Python script to automate

---

## 🏷️ **DATA ANNOTATION**

### **Recommended Tools:**

1. **Roboflow** (Recommended)
   - Web-based, easy to use
   - Auto-labeling with AI assistance
   - Export to YOLO format
   - Team collaboration
   - Free tier: 10,000 images

2. **LabelImg**
   - Desktop app, free
   - Good for small datasets
   - Manual labeling only

3. **CVAT (Computer Vision Annotation Tool)**
   - Open-source, self-hosted
   - Good for large teams
   - Supports video annotation

### **Annotation Format (YOLO):**

For each image `image001.jpg`, create `image001.txt`:

```
# Format: <class_id> <x_center> <y_center> <width> <height>
# All values normalized (0-1)

1 0.5 0.6 0.3 0.4     # person_without_hardhat at center
0 0.2 0.3 0.15 0.25   # person_with_hardhat on left
```

---

## 🧠 **YOLO TRAINING CONFIGURATION**

### **YOLOv8 Config File: `ppe_detection.yaml`**

```yaml
# Dataset paths
path: /path/to/your/dataset
train: images/train
val: images/val
test: images/test

# Classes (29 total)
names:
  0: person_with_hardhat
  1: person_without_hardhat
  2: person_with_safety_vest
  3: person_without_safety_vest
  4: person_with_gloves
  5: person_without_gloves
  6: person_with_safety_goggles
  7: person_without_safety_goggles
  8: person_with_fall_harness
  9: person_without_fall_harness
  10: person_with_safety_boots
  11: person_without_safety_boots
  12: person_standing
  13: person_fallen
  14: person_climbing
  15: person_running
  16: forklift
  17: excavator
  18: crane
  19: ladder
  20: scaffolding
  21: power_tool
  22: truck
  23: van
  24: car
  25: safety_cone
  26: barrier
  27: caution_tape
  28: fire_extinguisher
```

### **Training Command:**

```bash
# Install YOLOv8
pip install ultralytics

# Train the model
yolo task=detect mode=train \
  model=yolov8n.pt \
  data=ppe_detection.yaml \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  name=sitesafe_ppe_v1 \
  patience=20 \
  save=True \
  plots=True

# For better accuracy (slower):
yolo task=detect mode=train \
  model=yolov8m.pt \
  data=ppe_detection.yaml \
  epochs=200 \
  imgsz=1280 \
  batch=8 \
  name=sitesafe_ppe_v1_large
```

### **Hardware Requirements:**

| Model Size | GPU Required | Training Time | Inference Speed | Accuracy |
|------------|-------------|---------------|-----------------|----------|
| YOLOv8n (nano) | 4GB VRAM | 6-8 hours | 60+ FPS | ~85% |
| YOLOv8s (small) | 6GB VRAM | 10-12 hours | 45+ FPS | ~88% |
| YOLOv8m (medium) | 8GB VRAM | 16-20 hours | 30+ FPS | ~91% |
| YOLOv8l (large) | 12GB VRAM | 24-30 hours | 20+ FPS | ~93% |

**Recommendation**: Start with **YOLOv8s** (small) - good balance of speed and accuracy.

---

## 🎓 **TRAINING BEST PRACTICES**

### **Data Split:**
- **Train**: 70% (e.g., 43,750 images)
- **Validation**: 20% (e.g., 12,500 images)
- **Test**: 10% (e.g., 6,250 images)

### **Data Augmentation:**
```python
# YOLOv8 applies these automatically:
- Rotation: ±15°
- Brightness: ±20%
- Contrast: ±20%
- Saturation: ±20%
- Blur: Random
- Flip: Horizontal
- Mosaic: 4-image mosaic
```

### **Class Balancing:**
⚠️ **CRITICAL**: Balance your dataset!

- If you have 10,000 `person_with_hardhat` images
- You need ~10,000 `person_without_hardhat` images
- Otherwise model will be biased!

### **Validation Metrics:**

Track these during training:
- **mAP@0.5**: Should be >85% for production
- **Precision**: >90% for critical PPE classes
- **Recall**: >85% for safety violations
- **False Positive Rate**: <5% for violations

---

## 🚀 **QUICK START - GET TRAINING DATA NOW**

### **Option A: Use Pre-trained Models (Fastest)**

Download existing PPE detection models:

```bash
# 1. Roboflow Pre-trained PPE Model
# Visit: https://universe.roboflow.com/roboflow-universe-projects/ppe-detection-mhnfi
# Download model weights

# 2. Use transfer learning from these base models
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s.pt
```

Then fine-tune on your specific classes.

### **Option B: Scrape & Label Your Own (Best Quality)**

```python
# 1. Download construction videos
import yt_dlp

ydl_opts = {
    'format': 'best',
    'outtmpl': 'videos/%(title)s.%(ext)s',
}

urls = [
    'https://www.youtube.com/watch?v=construction_site_1',
    'https://www.youtube.com/watch?v=construction_site_2',
    # ... add 50-100 construction videos
]

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download(urls)

# 2. Extract frames
import cv2
import os

for video_file in os.listdir('videos'):
    cap = cv2.VideoCapture(f'videos/{video_file}')
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Save 1 frame per second
        if frame_count % 30 == 0:
            cv2.imwrite(f'frames/frame_{frame_count}.jpg', frame)
        
        frame_count += 1
    
    cap.release()

# 3. Label with Roboflow
# Upload frames to https://roboflow.com
# Use their auto-labeling AI to speed up annotation
# Export in YOLO format
```

---

## 📦 **DATASET STRUCTURE**

Your final dataset should look like:

```
sitesafe-ppe-dataset/
├── data.yaml                  # Configuration file
├── train/
│   ├── images/
│   │   ├── img0001.jpg
│   │   ├── img0002.jpg
│   │   └── ...
│   └── labels/
│       ├── img0001.txt
│       ├── img0002.txt
│       └── ...
├── val/
│   ├── images/
│   └── labels/
└── test/
    ├── images/
    └── labels/
```

---

## 🎯 **CRITICAL SUCCESS METRICS**

Your model MUST achieve these for production:

| Metric | Target | Critical For |
|--------|--------|--------------|
| **Hard Hat Detection** | >92% mAP | OSHA compliance |
| **Safety Vest Detection** | >90% mAP | OSHA compliance |
| **Fall Detection** | >95% recall | Life safety |
| **False Positive Rate** | <3% | Prevent alert fatigue |
| **Inference Speed** | >15 FPS | Real-time monitoring |

**Why these matter:**
- **High precision**: Prevents false alarms (workers ignore real alerts if too many false ones)
- **High recall**: Catches actual violations (false negatives = missed injuries)
- **Speed**: Must process multiple cameras in real-time

---

## 🔥 **RECOMMENDED DATASET PROVIDERS**

### **1. Roboflow Universe (Best for Construction)**
- **Link**: https://universe.roboflow.com/
- **Search**: "construction safety", "PPE detection", "hard hat"
- **Cost**: Free tier available
- **Quality**: Pre-labeled, ready to use
- **Download**: Export in YOLOv8 format

### **2. Kaggle Datasets**
- **PPE Detection**: https://www.kaggle.com/datasets/snehilsanyal/ppe-dataset
- **Hard Hat Detection**: https://www.kaggle.com/datasets/andrewmvd/hard-hat-detection
- **Construction Site Safety**: Search "construction" on Kaggle

### **3. Open Images Dataset**
- **Link**: https://storage.googleapis.com/openimages/web/index.html
- **Classes**: Person, truck, car, etc.
- **Size**: Millions of images
- **Use**: Supplement your dataset

### **4. Custom Data Collection Services**

If you have budget, hire these services:
- **Scale AI**: Professional data labeling
- **Labelbox**: AI-assisted annotation
- **Amazon SageMaker Ground Truth**: AWS labeling service

**Cost**: $0.05 - $0.50 per image (depending on complexity)

---

## 💰 **BUDGET ESTIMATES**

### **Option 1: DIY (Free - Low Cost)**
- **Datasets**: Free from Roboflow/Kaggle
- **Annotation**: Manual (your time)
- **Training**: Google Colab GPU (free) or local GPU
- **Total Cost**: $0 - $100
- **Time**: 2-4 weeks

### **Option 2: Semi-Professional**
- **Datasets**: Mix of public + purchased ($500)
- **Annotation**: Roboflow AI-assist ($200)
- **Training**: AWS EC2 GPU instance ($50-100)
- **Total Cost**: $750 - $800
- **Time**: 1-2 weeks

### **Option 3: Professional**
- **Data Collection**: Hire labelers ($2,000)
- **Annotation**: Professional service ($3,000)
- **Training**: High-end GPU or cloud ($500)
- **Total Cost**: $5,500+
- **Time**: 3-5 days
- **Result**: Production-grade model

---

## 🛠️ **TOOLS YOU'LL NEED**

### **Software:**
```bash
# Python packages
pip install ultralytics      # YOLOv8
pip install opencv-python    # Video processing
pip install pillow           # Image handling
pip install roboflow         # Dataset management
pip install albumentations   # Data augmentation

# Optional
pip install wandb            # Training metrics visualization
pip install tensorboard      # Alternative visualization
```

### **Hardware:**

**Minimum:**
- GPU: NVIDIA GTX 1660 (6GB VRAM)
- RAM: 16GB
- Storage: 100GB SSD

**Recommended:**
- GPU: NVIDIA RTX 3080 (10GB VRAM) or better
- RAM: 32GB
- Storage: 500GB NVMe SSD

**Cloud Alternative:**
- Google Colab Pro ($10/month) - Free GPU
- AWS EC2 g4dn.xlarge (~$0.50/hour)
- Paperspace Gradient (GPU notebooks)

---

## 📝 **EXAMPLE: Training Your First Model**

### **Step 1: Get Dataset**
```bash
# Install Roboflow
pip install roboflow

# Download a starter dataset
from roboflow import Roboflow
rf = Roboflow(api_key="YOUR_API_KEY")
project = rf.workspace("roboflow-universe-projects").project("ppe-detection-mhnfi")
dataset = project.version(1).download("yolov8")
```

### **Step 2: Train**
```bash
yolo task=detect mode=train \
  model=yolov8s.pt \
  data=PPE-Detection-1/data.yaml \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  device=0 \
  name=sitesafe_ppe_v1
```

### **Step 3: Test**
```bash
yolo task=detect mode=predict \
  model=runs/detect/sitesafe_ppe_v1/weights/best.pt \
  source=test_video.mp4 \
  conf=0.5 \
  save=True
```

### **Step 4: Export for Production**
```bash
# Export to ONNX for faster inference
yolo export model=runs/detect/sitesafe_ppe_v1/weights/best.pt format=onnx

# Or TensorRT for maximum speed (NVIDIA GPUs only)
yolo export model=runs/detect/sitesafe_ppe_v1/weights/best.pt format=engine
```

---

## 🎯 **QUICK START CHECKLIST**

**To start training TODAY:**

- [ ] Sign up for Roboflow account (free)
- [ ] Download 2-3 PPE datasets from Roboflow Universe
- [ ] Combine datasets (remove duplicates)
- [ ] Install ultralytics: `pip install ultralytics`
- [ ] Download base model: `wget yolov8s.pt`
- [ ] Start training: `yolo train ...`
- [ ] Monitor training in TensorBoard
- [ ] Test on sample videos
- [ ] Deploy best model to production

**Time estimate**: 1-2 days to get first working model!

---

## 🚨 **CRITICAL WARNINGS**

### **⚠️ Class Imbalance**
If you have:
- 10,000 images of `person_with_hardhat`
- 100 images of `person_without_hardhat`

Your model will **NEVER** detect violations! It will always predict "with hardhat" because that's what it saw most.

**Solution**: Balance your classes! Each class needs similar number of images.

### **⚠️ Lighting Conditions**
Train on images from:
- ✅ Bright sunny days
- ✅ Overcast/cloudy
- ✅ Early morning/late evening
- ✅ Indoor lighting
- ✅ Night (if using night cameras)

### **⚠️ Camera Angles**
Include images from:
- ✅ Ground level
- ✅ Elevated (like your mounted cameras)
- ✅ Different distances (close-up and far away)

---

## 📞 **NEXT STEPS**

1. **Choose your approach**:
   - Quick start: Use Roboflow pre-trained model
   - Custom: Collect and label your own data
   - Hybrid: Start with pre-trained, fine-tune on your data

2. **I'll help you**:
   - Integrate the trained model into `detection_service.py`
   - Set up the inference pipeline
   - Connect it to your backend
   - Deploy and monitor

**Let me know when you have a model trained, and I'll integrate it!** 🚀

---

## 💡 **MY RECOMMENDATION**

**Start with this 3-day plan:**

**Day 1:** Download 3 PPE datasets from Roboflow (15,000 images)
**Day 2:** Train YOLOv8s model on Google Colab (free GPU)
**Day 3:** Test, export, and deploy to your Python service

You can have a working model by this weekend! 🎉

