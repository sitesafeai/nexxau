from ultralytics import YOLO
import os

# Initialize YOLO model
model = YOLO('yolov8n.pt')  # Load a pretrained YOLOv8n model

# Set training parameters
training_args = {
    'data': 'images-for-yolo/safety.v1i.yolov8/data.yaml',  # Path to data config file
    'epochs': 100,  # Number of training epochs
    'imgsz': 640,  # Image size
    'batch': 8,  # Reduced batch size for CPU training
    'patience': 50,  # Early stopping patience
    'device': 'cpu',  # Use CPU for training
    'workers': 4,  # Reduced number of worker threads for CPU
    'project': 'runs/train',  # Project name
    'name': 'safety_detection',  # Experiment name
    'exist_ok': True,  # Overwrite existing experiment
    'pretrained': True,  # Use pretrained weights
    'optimizer': 'auto',  # Optimizer (SGD, Adam, etc.)
    'verbose': True,  # Print verbose output
    'seed': 42,  # Random seed for reproducibility
    'deterministic': True,  # Deterministic training
}

# Start training
results = model.train(**training_args)

# Save the trained model
model.save('safety_detection_model.pt')

print("Training completed! Model saved as 'safety_detection_model.pt'") 