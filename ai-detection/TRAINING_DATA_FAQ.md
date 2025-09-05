# 🎯 Training Data FAQ - Quick Answers

## 📸 **Can I use pictures or does it have to be videos?**

**✅ PICTURES ARE PREFERRED for training!**

- **Images are easier to annotate** (faster, more accurate)
- **Videos can be used** but need to be converted to frames
- **Best approach**: Use videos to extract key frames, then annotate the frames
- **Our system handles both**: Automatically converts videos to images

## 🌐 **Where can I get training data?**

### **1. YOUR OWN CAMERAS (BEST OPTION)**
```bash
# Use our script to collect from your worksites
python3 scripts/data_collection/collect_footage.py --mode continuous --interval 30
```
- **Real worksite conditions** - perfect for your use case
- **No copyright issues** - you own the data
- **Specific to your safety scenarios** - exactly what you need

### **2. FREE PUBLIC DATASETS**
```bash
# Download safety-related datasets
python3 scripts/data_collection/download_datasets.py
```
- **COCO Dataset**: Construction equipment and people
- **Open Images**: Safety equipment and PPE
- **PPE Detection Datasets**: Academic research data

### **3. STOCK PHOTOS (PAID)**
- Shutterstock, iStock, Adobe Stock
- Construction company websites
- Safety training materials

### **4. SYNTHETIC DATA (EXPERIMENTAL)**
- Blender (3D modeling)
- Unity (game engine)
- Python libraries (PIL, OpenCV)

## 🔍 **What training content should I search for?**

### **HIGH PRIORITY - PPE Compliance**
```
"construction worker hard hat"
"safety vest construction site" 
"safety glasses worker"
"steel toe boots construction"
"PPE compliance construction"
"hard hat safety equipment"
```

### **MEDIUM PRIORITY - Equipment & Vehicles**
```
"forklift warehouse operation"
"crane construction site"
"excavator construction"
"construction truck"
"heavy equipment safety"
```

### **LOWER PRIORITY - Safety Scenarios**
```
"construction site safety"
"workplace safety violations"
"hazard zone construction"
"emergency response construction"
```

## 📊 **How much data do I need?**

### **Minimum Requirements:**
- **Per safety class**: 100-200 images
- **Total dataset**: 1,500-3,000 images
- **Validation split**: 20% of total

### **Optimal Amounts:**
- **Per safety class**: 300-500 images
- **Total dataset**: 3,000-5,000 images
- **Balanced distribution**: Equal representation of each class

## 🚀 **Quick Start Data Collection Plan**

### **Week 1: Get Started**
```bash
# 1. Set up your cameras
python3 quick_start.py setup

# 2. Collect baseline data
python3 scripts/data_collection/collect_footage.py --mode snapshot

# 3. Download external datasets
python3 scripts/data_collection/download_datasets.py
```

### **Week 2: Build Your Dataset**
```bash
# Collect from your cameras
python3 scripts/data_collection/collect_footage.py --mode continuous --interval 60

# Focus on safety scenarios
python3 scripts/data_collection/collect_footage.py --mode record --duration 300
```

### **Week 3: Organize & Annotate**
- Organize collected data by category
- Start annotation process with LabelImg
- Validate data quality and coverage

## 💡 **Pro Tips for Data Collection**

### **What to Capture:**
- **Normal operations**: Workers following safety protocols
- **Safety violations**: Missing PPE, unsafe practices  
- **Different conditions**: Various lighting, weather, angles
- **Multiple scenarios**: Different work activities

### **Quality Standards:**
- **Clear visibility**: Objects clearly visible
- **Good resolution**: Minimum 640x640 pixels
- **Varied conditions**: Different backgrounds and lighting
- **Real scenarios**: Actual worksite situations

### **Organization:**
- **Clear naming**: `camera_id_timestamp_description.jpg`
- **Logical structure**: Organize by safety category
- **Metadata tracking**: Document what you collect
- **Regular backup**: Keep multiple copies

## 🔧 **Ready-to-Use Commands**

```bash
# Check your setup
python3 quick_start.py check

# Collect data from cameras
python3 quick_start.py collect

# Download external datasets
python3 scripts/data_collection/download_datasets.py

# Start training (after annotation)
python3 quick_start.py train
```

## 🎯 **Bottom Line**

**Start with your own camera footage** - it's the best training data you can get! 

- **Images are preferred** over videos for training
- **Your worksites** provide the most relevant data
- **Quality matters more** than quantity
- **Our scripts** make collection easy and automated

**Next step**: Configure your cameras and start collecting data today! 🚀
