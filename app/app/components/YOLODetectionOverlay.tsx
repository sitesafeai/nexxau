'use client';

import { useEffect, useRef, useState } from 'react';

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  timestamp: string;
}

interface YOLODetectionOverlayProps {
  cameraId: string;
  videoElement: HTMLVideoElement | null;
  isActive: boolean;
}

export default function YOLODetectionOverlay({ 
  cameraId, 
  videoElement, 
  isActive 
}: YOLODetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Color mapping for different object classes
  const getClassColor = (className: string): string => {
    switch (className) {
      case 'person':
        return '#00ff00'; // Green for people
      case 'car':
      case 'truck':
      case 'bus':
      case 'motorcycle':
        return '#ff0000'; // Red for vehicles
      case 'bicycle':
        return '#0000ff'; // Blue for bicycles
      default:
        return '#ffff00'; // Yellow for other objects
    }
  };

  // Draw bounding boxes on canvas
  const drawDetections = () => {
    const canvas = canvasRef.current;
    const video = videoElement;
    
    if (!canvas || !video || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each detection
    detections.forEach((detection) => {
      const { bbox, class_name, confidence } = detection;
      
      // Calculate coordinates relative to canvas size
      const x1 = (bbox.x1 / video.videoWidth) * canvas.width;
      const y1 = (bbox.y1 / video.videoHeight) * canvas.height;
      const x2 = (bbox.x2 / video.videoWidth) * canvas.width;
      const y2 = (bbox.y2 / video.videoHeight) * canvas.height;
      
      const width = x2 - x1;
      const height = y2 - y1;

      // Set color and style
      const color = getClassColor(class_name);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.font = '14px Arial';

      // Draw bounding box
      ctx.strokeRect(x1, y1, width, height);

      // Draw label background
      const label = `${class_name}: ${(confidence * 100).toFixed(1)}%`;
      const textMetrics = ctx.measureText(label);
      const labelWidth = textMetrics.width + 8;
      const labelHeight = 20;

      ctx.fillRect(x1, y1 - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x1 + 4, y1 - 6);
    });
  };

  // Fetch detections from API
  const fetchDetections = async () => {
    if (!isActive || !cameraId) return;

    try {
      const response = await fetch(`/api/yolo/detections?camera_id=${cameraId}&limit=1`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.detections.length > 0) {
        const latestDetection = data.detections[0];
        const detectionsArray = latestDetection.detections || [];
        setDetections(detectionsArray);
        console.log(`🎯 Fetched ${detectionsArray.length} detections for camera ${cameraId}`);
      } else {
        setDetections([]);
      }
    } catch (error) {
      console.error('Error fetching detections:', error);
    }
  };

  // Start detection polling
  useEffect(() => {
    if (!isActive || !cameraId) return;

    console.log(`🤖 Starting detection polling for camera ${cameraId}`);
    setIsDetecting(true);
    const interval = setInterval(fetchDetections, 1000); // Poll every second

    return () => {
      console.log(`🤖 Stopping detection polling for camera ${cameraId}`);
      clearInterval(interval);
      setIsDetecting(false);
    };
  }, [isActive, cameraId]);

  // Redraw when detections change
  useEffect(() => {
    if (detections.length > 0) {
      console.log(`🎨 Drawing ${detections.length} detections on canvas`);
    }
    drawDetections();
  }, [detections, videoElement, isActive]);

  // Redraw when video size changes
  useEffect(() => {
    if (!videoElement) return;

    const handleResize = () => {
      drawDetections();
    };

    videoElement.addEventListener('resize', handleResize);
    videoElement.addEventListener('loadedmetadata', handleResize);

    return () => {
      videoElement.removeEventListener('resize', handleResize);
      videoElement.removeEventListener('loadedmetadata', handleResize);
    };
  }, [videoElement]);

  if (!isActive || !videoElement) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 10 }}
      />
      
      {/* Detection Status Indicator */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
        {isDetecting ? (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            AI Detection Active
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            AI Detection Inactive
          </span>
        )}
      </div>

      {/* Detection Count */}
      {detections.length > 0 && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          {detections.length} object{detections.length !== 1 ? 's' : ''} detected
        </div>
      )}
    </div>
  );
}
