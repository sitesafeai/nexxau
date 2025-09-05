# 💻 Portable Training Setup - Train on Any Computer

## 🚀 **Overview**
This guide shows you how to set up YOLO training on any computer, including laptops, desktops, or cloud instances.

## 📋 **System Requirements**

### **Minimum Requirements:**
- **OS**: Windows 10+, macOS 10.14+, Ubuntu 18.04+
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space minimum
- **Python**: 3.8+ (3.11 recommended)

### **Recommended for Training:**
- **RAM**: 32GB+
- **Storage**: 50GB+ SSD
- **GPU**: NVIDIA GPU with 6GB+ VRAM (optional but recommended)
- **CPU**: 8+ cores for faster training

## 🔧 **Setup on New Computer**

### **Step 1: Install Python**
```bash
# Download Python 3.11+ from python.org
# Or use package manager:

# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-pip python3.11-venv

# macOS (using Homebrew)
brew install python@3.11

# Windows
# Download installer from python.org
```

### **Step 2: Clone/Copy Your Project**
```bash
# Option 1: Clone from Git (if using version control)
git clone <your-repo-url>
cd nexxau/ai-detection

# Option 2: Copy project folder
# Copy the entire ai-detection folder to new computer
```

### **Step 3: Create Virtual Environment**
```bash
# Create virtual environment
python3.11 -m venv nexxau-env

# Activate virtual environment
# On Windows:
nexxau-env\Scripts\activate

# On macOS/Linux:
source nexxau-env/bin/activate
```

### **Step 4: Install Dependencies**
```bash
# Install requirements
pip install -r requirements.txt

# Or install core packages manually
pip install torch torchvision ultralytics opencv-python numpy pillow pyyaml
```

### **Step 5: Verify Setup**
```bash
# Check if everything is working
python3 quick_start.py check
```

## 📁 **Data Transfer Options**

### **Option 1: USB Drive/External Storage**
```bash
# Copy your data folder
cp -r /path/to/your/data /path/to/new/computer/ai-detection/

# Or use rsync for large datasets
rsync -av --progress /path/to/your/data/ /path/to/new/computer/ai-detection/data/
```

### **Option 2: Cloud Storage (Google Drive, Dropbox)**
```bash
# Upload data folder to cloud storage
# Download on new computer
# Extract to ai-detection/data/
```

### **Option 3: Network Transfer**
```bash
# SCP (Secure Copy)
scp -r /path/to/your/data user@new-computer:/path/to/ai-detection/

# SFTP
sftp user@new-computer
put -r /path/to/your/data /path/to/ai-detection/
```

### **Option 4: Git LFS (Large File Storage)**
```bash
# If using Git with LFS
git lfs pull
git lfs checkout
```

## 🎯 **Training on Different Computers**

### **Laptop Training (Lower Performance)**
```bash
# Use smaller model size
python3 scripts/training/train_yolo.py \
  --data data/annotated \
  --model-size n \
  --batch-size 8 \
  --epochs 50 \
  --img-size 416
```

### **Desktop Training (Better Performance)**
```bash
# Use larger model size
python3 scripts/training/train_yolo.py \
  --data data/annotated \
  --model-size m \
  --batch-size 16 \
  --epochs 100 \
  --img-size 640
```

### **GPU Training (Best Performance)**
```bash
# Check GPU availability
python3 -c "import torch; print('GPU available:', torch.cuda.is_available())"

# Train with GPU
python3 scripts/training/train_yolo.py \
  --data data/annotated \
  --model-size l \
  --batch-size 32 \
  --epochs 150 \
  --img-size 640
```

## 📊 **Data Organization for Portability**

### **Recommended Structure**
```
ai-detection/
├── data/
│   ├── raw/                    # Original images
│   │   ├── ppe_compliance/
│   │   ├── equipment/
│   │   └── hazards/
│   ├── annotated/              # Images with labels
│   │   ├── images/
│   │   └── labels/
│   ├── training/               # Training dataset
│   └── validation/             # Validation dataset
├── models/                     # Trained models
├── scripts/                    # Training scripts
└── configs/                    # Configuration files
```

### **Portable Configuration**
```yaml
# training_config.yaml
project_dir: './runs/train'  # Relative paths
data_yaml_path: './data/data.yaml'
model_size: 'n'              # Adjust based on computer
batch_size: 8                # Adjust based on RAM
device: 'auto'               # Auto-detect GPU/CPU
```

## 🔄 **Workflow Between Computers**

### **Development Computer (Data Collection)**
```bash
# 1. Collect and organize data
python3 scripts/data_collection/collect_footage.py --mode snapshot

# 2. Annotate images
labelImg

# 3. Prepare dataset
python3 scripts/training/train_yolo.py --data data/annotated --prepare-only

# 4. Transfer to training computer
# Copy data/annotated/ folder
```

### **Training Computer (Model Training)**
```bash
# 1. Receive data from development computer
# 2. Verify data structure
python3 quick_start.py check

# 3. Start training
python3 scripts/training/train_yolo.py --data data/annotated

# 4. Transfer trained model back
# Copy runs/train/ folder
```

## 🚨 **Common Issues & Solutions**

### **Memory Issues**
```bash
# Reduce batch size
--batch-size 4

# Use smaller image size
--img-size 416

# Use smaller model
--model-size n
```

### **Storage Issues**
```bash
# Clean up old training runs
rm -rf runs/train/*

# Use external storage for data
--data /path/to/external/data
```

### **GPU Issues**
```bash
# Force CPU training
--device cpu

# Check GPU compatibility
python3 -c "import torch; print(torch.version.cuda)"
```

## 📱 **Mobile/Tablet Training (Advanced)**

### **Google Colab (Free GPU)**
```python
# Upload your data to Google Drive
# Use Colab notebook for training
# Download trained model

# Colab provides free GPU for training
# Limited to 12 hours per session
```

### **Kaggle Notebooks (Free GPU)**
```python
# Upload dataset to Kaggle
# Use Kaggle's free GPU notebooks
# Download results
```

## 🔐 **Security Considerations**

### **Data Privacy**
- **Encrypt sensitive data** before transfer
- **Use secure transfer methods** (SCP, SFTP)
- **Don't upload sensitive images** to public cloud
- **Clean data** of company identifiers

### **Access Control**
- **Limit access** to training computers
- **Use VPN** for remote access
- **Regular backups** of important data
- **Audit trail** of data transfers

## 💡 **Pro Tips for Portable Training**

### **Efficiency Tips:**
1. **Start small**: Test with small dataset first
2. **Monitor resources**: Watch RAM, GPU, storage usage
3. **Batch processing**: Train multiple models overnight
4. **Cloud backup**: Keep models in cloud storage

### **Organization Tips:**
1. **Consistent naming**: Use same structure everywhere
2. **Version control**: Track data and model versions
3. **Documentation**: Keep notes on each training run
4. **Results tracking**: Log performance metrics

## 🎯 **Quick Start Commands**

### **New Computer Setup:**
```bash
# 1. Install Python 3.11+
# 2. Copy ai-detection folder
# 3. Create virtual environment
python3.11 -m venv nexxau-env
source nexxau-env/bin/activate  # or nexxau-env\Scripts\activate on Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Verify setup
python3 quick_start.py check
```

### **Transfer Data:**
```bash
# Copy your annotated data
cp -r /path/to/your/data/annotated/ ./data/

# Start training
python3 scripts/training/train_yolo.py --data data/annotated
```

---

**🎯 Remember**: You can train your safety detection models on any computer! The key is proper setup and data organization. 🚀
