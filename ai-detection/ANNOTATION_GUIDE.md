# 🎯 Nexxau AI Detection - Annotation Guide

## 📋 Overview
This guide explains how to annotate safety detection data for YOLO training. Proper annotation is crucial for training accurate AI models.

## 🏗️ Safety Detection Classes

### **PPE (Personal Protective Equipment)**
- **`hard_hat`** - Safety helmets, hard hats
- **`safety_vest`** - High-visibility vests, safety jackets
- **`safety_glasses`** - Safety goggles, protective eyewear
- **`work_boots`** - Steel-toe boots, safety footwear

### **Equipment & Vehicles**
- **`forklift`** - Forklifts, lift trucks
- **`crane`** - Tower cranes, mobile cranes
- **`excavator`** - Excavators, diggers
- **`truck`** - Construction trucks, delivery vehicles
- **`vehicle`** - Other vehicles not in specific categories

### **People & Access Control**
- **`worker`** - Workers wearing proper PPE
- **`unauthorized_person`** - People without proper PPE or access

### **Hazards & Emergencies**
- **`fire`** - Fire, smoke, flames
- **`spill`** - Chemical spills, liquid hazards
- **`hazard_zone`** - Dangerous areas, restricted zones

## 🖼️ Annotation Guidelines

### **Bounding Box Rules**
1. **Tight Fit**: Draw boxes that tightly contain the object
2. **Complete Object**: Include the entire object, not just visible parts
3. **Consistent Size**: Use consistent box sizes for similar objects
4. **Clear Boundaries**: Ensure boxes don't overlap unnecessarily

### **Class Assignment Rules**
1. **Primary Function**: Label based on the object's primary purpose
2. **PPE Priority**: If someone is wearing PPE, label both the person and PPE
3. **Equipment State**: Label equipment even if it's not in use
4. **Hazard Assessment**: Label potential hazards even if they're not active

### **Quality Standards**
- **Accuracy**: 95%+ correct class assignments
- **Completeness**: All visible objects of target classes must be labeled
- **Consistency**: Same objects should have same labels across images
- **Clarity**: Boxes should be clearly visible and readable

## 🛠️ Annotation Tools

### **LabelImg (Recommended)**
```bash
# Install LabelImg
pip install labelImg

# Launch LabelImg
labelImg

# Or use the GUI version
labelImg
```

### **CVAT (Advanced)**
- Web-based annotation tool
- Better for team collaboration
- More advanced features

## 📁 File Organization

### **Directory Structure**
```
data/
├── raw/                    # Original images from cameras
├── annotated/             # Images with labels
│   ├── images/           # Image files (.jpg, .png)
│   └── labels/           # Label files (.txt)
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

## 🎨 Annotation Process

### **Step 1: Image Review**
1. Open image in annotation tool
2. Identify all objects that need labeling
3. Plan annotation order (largest to smallest)

### **Step 2: Bounding Box Creation**
1. Click and drag to create bounding box
2. Adjust box size to fit object tightly
3. Ensure box includes entire object

### **Step 3: Class Assignment**
1. Select appropriate class from dropdown
2. Verify class matches object type
3. Use consistent terminology

### **Step 4: Quality Check**
1. Review all annotations
2. Verify box accuracy
3. Check class assignments
4. Ensure no objects missed

### **Step 5: Save & Export**
1. Save annotations in YOLO format
2. Export to appropriate directory
3. Verify file integrity

## 📊 YOLO Label Format

### **Label File Structure**
Each line represents one object:
```
class_id center_x center_y width height
```

### **Coordinate System**
- **center_x, center_y**: Normalized center coordinates (0-1)
- **width, height**: Normalized dimensions (0-1)
- **class_id**: Integer corresponding to class index

### **Example Labels**
```
0 0.5 0.3 0.2 0.4    # hard_hat at center, 20% width, 40% height
1 0.7 0.6 0.3 0.5    # safety_vest at right side
2 0.2 0.8 0.1 0.2    # safety_glasses at left side
```

## 🔍 Common Annotation Scenarios

### **PPE Compliance**
- Label each piece of PPE separately
- Include person if clearly visible
- Note if PPE is worn incorrectly

### **Equipment Operation**
- Label equipment being operated
- Include operator if visible
- Note safety violations

### **Hazard Detection**
- Label all visible hazards
- Include context (area, time)
- Note severity indicators

### **Access Control**
- Label unauthorized access
- Include entry/exit points
- Note security violations

## ✅ Quality Assurance Checklist

- [ ] All target objects labeled
- [ ] Bounding boxes are tight and accurate
- [ ] Class assignments are correct
- [ ] No overlapping boxes
- [ ] Labels exported in correct format
- [ ] Files saved to correct directories
- [ ] Naming conventions followed
- [ ] Quality standards met

## 🚀 Best Practices

1. **Consistency**: Use same approach across all images
2. **Accuracy**: Prioritize quality over speed
3. **Documentation**: Note any unusual cases or decisions
4. **Review**: Have team members review each other's work
5. **Training**: Regular training on new scenarios
6. **Feedback**: Continuous improvement based on model performance

## 📞 Support & Questions

- **Technical Issues**: Check tool documentation
- **Annotation Questions**: Consult team lead
- **Quality Concerns**: Review with supervisor
- **Process Improvements**: Submit suggestions to team

---

**Remember**: Quality annotations = Better AI models = Improved safety detection! 🎯
