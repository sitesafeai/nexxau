'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Dynamic import for TensorFlow.js to avoid SSR issues
let cocoSsd: any = null;
let tf: any = null;

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

interface RealtimeDetectionOverlayProps {
  cameraId: string;
  videoElement: HTMLVideoElement | null;
  isActive: boolean;
}

export default function RealtimeDetectionOverlay({
  cameraId,
  videoElement,
  isActive
}: RealtimeDetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [fps, setFps] = useState(0);
  const modelRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Load TensorFlow.js and COCO-SSD model
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('🤖 Loading TensorFlow.js AI model...');
        
        // Dynamic import to avoid SSR
        if (!tf) {
          tf = await import('@tensorflow/tfjs');
          await tf.ready();
          console.log('✅ TensorFlow.js loaded');
        }
        
        if (!cocoSsd) {
          cocoSsd = await import('@tensorflow-models/coco-ssd');
          console.log('✅ COCO-SSD module loaded');
        }
        
        if (!modelRef.current) {
          modelRef.current = await cocoSsd.load({
            base: 'lite_mobilenet_v2' // Faster model for real-time
          });
          console.log('✅ COCO-SSD AI model loaded and ready!');
          setIsModelLoaded(true);
        }
      } catch (error) {
        console.error('❌ Error loading AI model:', error);
      }
    };

    loadModel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Map COCO-SSD classes to safety-relevant names
  const mapToSafetyClass = (className: string): string => {
    const safetyMappings: { [key: string]: string } = {
      'person': 'person',
      'car': 'vehicle',
      'truck': 'vehicle',
      'bus': 'vehicle',
      'motorcycle': 'vehicle',
      'bicycle': 'vehicle',
      'backpack': 'equipment',
      'umbrella': 'equipment',
      'handbag': 'equipment',
      'tie': 'person',
      'suitcase': 'equipment',
      'chair': 'equipment',
      'couch': 'equipment',
      'potted plant': 'barrier',
      'dog': 'animal',
      'cat': 'animal',
      'horse': 'animal'
    };

    return safetyMappings[className] || className;
  };

  // Draw detections on canvas
  const drawDetections = useCallback((predictions: Detection[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video display size
    const rect = videoElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factors
    const scaleX = canvas.width / videoElement.videoWidth;
    const scaleY = canvas.height / videoElement.videoHeight;

    // Draw each detection
    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      
      // Scale coordinates to canvas size
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;

      // Determine color based on class
      const safetyClass = mapToSafetyClass(prediction.class);
      let color = '#00ff00'; // Green default
      
      if (safetyClass === 'person') color = '#00ff00'; // Green for people
      else if (safetyClass === 'vehicle') color = '#ffaa00'; // Orange for vehicles
      else if (safetyClass === 'equipment') color = '#00aaff'; // Blue for equipment
      else if (safetyClass === 'barrier') color = '#ff00ff'; // Magenta for barriers

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw label background
      const label = `${prediction.class}: ${Math.round(prediction.score * 100)}%`;
      ctx.font = 'bold 14px Arial';
      const textMetrics = ctx.measureText(label);
      const labelWidth = textMetrics.width + 12;
      const labelHeight = 22;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(scaledX, scaledY - labelHeight - 2, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = color;
      ctx.fillText(label, scaledX + 6, scaledY - 8);
    });
  }, [videoElement]);

  // Perform detection on video frame (continues even when tab is hidden)
  const detectFrame = useCallback(async () => {
    if (!videoElement || !modelRef.current || !isActive) {
      return;
    }

    try {
      // Check if video is ready
      if (videoElement.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      // Run detection - continues even when tab is hidden for 24/7 monitoring
      const predictions = await modelRef.current.detect(videoElement);
      
      // Filter out low confidence detections
      const filteredPredictions = predictions.filter((p: Detection) => p.score > 0.5);
      
      setDetections(filteredPredictions);
      
      // Only draw if page is visible (optimization)
      if (document.visibilityState === 'visible') {
        drawDetections(filteredPredictions);
      }

      // Calculate FPS
      const currentTime = performance.now();
      if (lastFrameTimeRef.current) {
        const timeDiff = currentTime - lastFrameTimeRef.current;
        frameCountRef.current++;
        
        if (frameCountRef.current % 10 === 0) {
          const avgFps = 1000 / timeDiff;
          setFps(Math.round(avgFps));
        }
      }
      lastFrameTimeRef.current = currentTime;

      // Continue detection loop - runs continuously for 24/7 monitoring
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    } catch (error) {
      console.error('Detection error:', error);
      // Continue even on error for 24/7 reliability
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    }
  }, [videoElement, isActive, drawDetections]);

  // Start/stop detection when active state changes
  useEffect(() => {
    if (isActive && isModelLoaded && videoElement) {
      console.log('🎯 Starting real-time AI detection on video feed');
      setIsDetecting(true);
      detectFrame();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsDetecting(false);
      setDetections([]);
      
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isModelLoaded, videoElement, detectFrame]);

  // Redraw when video size changes
  useEffect(() => {
    if (!videoElement) return;

    const handleResize = () => {
      drawDetections(detections);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [videoElement, detections, drawDetections]);

  if (!isActive || !videoElement) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 10 }}
      />
      
      {/* Detection Status */}
      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs border border-gray-700/50">
        {!isModelLoaded ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-yellow-400">Loading AI Model...</span>
          </div>
        ) : isDetecting ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold">AI ACTIVE</span>
            </div>
            <div className="text-white">
              🎯 {detections.length} object{detections.length !== 1 ? 's' : ''} detected
            </div>
            {fps > 0 && (
              <div className="text-gray-300">
                ⚡ {fps} FPS
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-400">🔴 Detection Off</span>
        )}
      </div>

      {/* Detection Legend */}
      {isDetecting && detections.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs border border-gray-700/50">
          <div className="font-semibold mb-1">Detected Objects:</div>
          <div className="space-y-0.5">
            {detections.slice(0, 5).map((det, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 
                  mapToSafetyClass(det.class) === 'person' ? '#00ff00' :
                  mapToSafetyClass(det.class) === 'vehicle' ? '#ffaa00' :
                  mapToSafetyClass(det.class) === 'equipment' ? '#00aaff' : '#ff00ff'
                }}></div>
                <span>{det.class}: {Math.round(det.score * 100)}%</span>
              </div>
            ))}
            {detections.length > 5 && (
              <div className="text-gray-400">+{detections.length - 5} more...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
