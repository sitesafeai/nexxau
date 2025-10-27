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

interface ErrorState {
  message: string;
  timestamp: number;
  count: number;
}

// Unique color palette for each detection class - vibrant and techy
const CLASS_COLORS: { [key: string]: { box: string; label: string; glow: string } } = {
  // People
  'person': { box: '#00ff41', label: '#00ff41', glow: 'rgba(0, 255, 65, 0.4)' }, // Matrix green
  
  // Vehicles
  'car': { box: '#ff0080', label: '#ff0080', glow: 'rgba(255, 0, 128, 0.4)' }, // Hot pink
  'truck': { box: '#ff3d00', label: '#ff3d00', glow: 'rgba(255, 61, 0, 0.4)' }, // Red-orange
  'bus': { box: '#ffa000', label: '#ffa000', glow: 'rgba(255, 160, 0, 0.4)' }, // Amber
  'motorcycle': { box: '#e040fb', label: '#e040fb', glow: 'rgba(224, 64, 251, 0.4)' }, // Purple
  'bicycle': { box: '#00e5ff', label: '#00e5ff', glow: 'rgba(0, 229, 255, 0.4)' }, // Cyan
  
  // Equipment & Objects
  'backpack': { box: '#00bcd4', label: '#00bcd4', glow: 'rgba(0, 188, 212, 0.4)' }, // Teal
  'umbrella': { box: '#3f51b5', label: '#3f51b5', glow: 'rgba(63, 81, 181, 0.4)' }, // Indigo
  'handbag': { box: '#9c27b0', label: '#9c27b0', glow: 'rgba(156, 39, 176, 0.4)' }, // Deep purple
  'suitcase': { box: '#673ab7', label: '#673ab7', glow: 'rgba(103, 58, 183, 0.4)' }, // Purple
  'chair': { box: '#536dfe', label: '#536dfe', glow: 'rgba(83, 109, 254, 0.4)' }, // Blue
  'couch': { box: '#448aff', label: '#448aff', glow: 'rgba(68, 138, 255, 0.4)' }, // Light blue
  
  // Animals
  'dog': { box: '#ffeb3b', label: '#ffeb3b', glow: 'rgba(255, 235, 59, 0.4)' }, // Yellow
  'cat': { box: '#ffc107', label: '#ffc107', glow: 'rgba(255, 193, 7, 0.4)' }, // Amber
  'horse': { box: '#ff9800', label: '#ff9800', glow: 'rgba(255, 152, 0, 0.4)' }, // Orange
  
  // Safety Equipment (when custom YOLO is added)
  'hardhat': { box: '#ffff00', label: '#ffff00', glow: 'rgba(255, 255, 0, 0.4)' }, // Bright yellow
  'safety_vest': { box: '#ff6d00', label: '#ff6d00', glow: 'rgba(255, 109, 0, 0.4)' }, // Deep orange
  'forklift': { box: '#d500f9', label: '#d500f9', glow: 'rgba(213, 0, 249, 0.4)' }, // Magenta
  
  // Default
  'default': { box: '#76ff03', label: '#76ff03', glow: 'rgba(118, 255, 3, 0.4)' } // Lime
};

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
  const [error, setError] = useState<ErrorState | null>(null);
  const modelRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const lastErrorTimeRef = useRef<number>(0);

  // Get color for a specific class
  const getClassColor = (className: string) => {
    return CLASS_COLORS[className] || CLASS_COLORS['default'];
  };

  // Load TensorFlow.js and COCO-SSD model with enhanced error handling
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('🤖 Loading TensorFlow.js AI model...');
        setError(null);
        
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
          setError(null);
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to load AI model';
        console.error('❌ Error loading AI model:', err);
        setError({
          message: `Model Load Error: ${errorMsg}`,
          timestamp: Date.now(),
          count: 1
        });
        
        // Retry after 5 seconds
        setTimeout(() => {
          console.log('🔄 Retrying model load...');
          loadModel();
        }, 5000);
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

  // Draw detections on canvas with enhanced techy styling
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

    // Draw each detection with enhanced styling
    predictions.forEach((prediction, index) => {
      const [x, y, width, height] = prediction.bbox;
      
      // Scale coordinates to canvas size
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;

      // Get unique color for this class
      const colors = getClassColor(prediction.class);

      // Draw glowing effect (outer glow)
      ctx.shadowBlur = 15;
      ctx.shadowColor = colors.glow;
      
      // Draw main bounding box with rounded corners
      ctx.strokeStyle = colors.box;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw rounded rectangle
      const cornerRadius = 8;
      ctx.beginPath();
      ctx.moveTo(scaledX + cornerRadius, scaledY);
      ctx.lineTo(scaledX + scaledWidth - cornerRadius, scaledY);
      ctx.quadraticCurveTo(scaledX + scaledWidth, scaledY, scaledX + scaledWidth, scaledY + cornerRadius);
      ctx.lineTo(scaledX + scaledWidth, scaledY + scaledHeight - cornerRadius);
      ctx.quadraticCurveTo(scaledX + scaledWidth, scaledY + scaledHeight, scaledX + scaledWidth - cornerRadius, scaledY + scaledHeight);
      ctx.lineTo(scaledX + cornerRadius, scaledY + scaledHeight);
      ctx.quadraticCurveTo(scaledX, scaledY + scaledHeight, scaledX, scaledY + scaledHeight - cornerRadius);
      ctx.lineTo(scaledX, scaledY + cornerRadius);
      ctx.quadraticCurveTo(scaledX, scaledY, scaledX + cornerRadius, scaledY);
      ctx.closePath();
      ctx.stroke();

      // Draw corner accents (cyberpunk style)
      ctx.shadowBlur = 0;
      ctx.lineWidth = 4;
      const accentSize = 15;
      
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(scaledX, scaledY + accentSize);
      ctx.lineTo(scaledX, scaledY);
      ctx.lineTo(scaledX + accentSize, scaledY);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(scaledX + scaledWidth - accentSize, scaledY);
      ctx.lineTo(scaledX + scaledWidth, scaledY);
      ctx.lineTo(scaledX + scaledWidth, scaledY + accentSize);
      ctx.stroke();

      // Draw label with gradient background
      const label = `${prediction.class.toUpperCase()}`;
      const confidence = `${Math.round(prediction.score * 100)}%`;
      
      ctx.font = 'bold 13px "Courier New", monospace';
      const labelMetrics = ctx.measureText(label);
      ctx.font = 'bold 11px "Courier New", monospace';
      const confMetrics = ctx.measureText(confidence);
      
      const labelWidth = Math.max(labelMetrics.width, confMetrics.width) + 20;
      const labelHeight = 42;
      const labelX = scaledX;
      const labelY = scaledY > labelHeight + 5 ? scaledY - labelHeight - 5 : scaledY + scaledHeight + 5;

      // Draw label background with gradient and glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = colors.glow;
      
      const gradient = ctx.createLinearGradient(labelX, labelY, labelX, labelY + labelHeight);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      gradient.addColorStop(1, 'rgba(20, 20, 20, 0.95)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
      
      // Draw label border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = colors.box;
      ctx.lineWidth = 2;
      ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);

      // Draw label text (class name)
      ctx.fillStyle = colors.label;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.shadowBlur = 5;
      ctx.shadowColor = colors.glow;
      ctx.fillText(label, labelX + 10, labelY + 18);
      
      // Draw confidence text
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 3;
      ctx.fillText(confidence, labelX + 10, labelY + 34);

      // Draw detection index (small number in corner)
      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.box;
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(`#${index + 1}`, scaledX + scaledWidth - 25, scaledY + 20);
    });

    // Reset shadow for future draws
    ctx.shadowBlur = 0;
  }, [videoElement, getClassColor]);

  // Perform detection on video frame with enhanced error handling
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
      
      // Clear error on successful detection
      if (error) {
        setError(null);
        errorCountRef.current = 0;
      }
      
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
    } catch (err: any) {
      const currentTime = Date.now();
      errorCountRef.current++;
      
      // Only show error if it persists
      if (errorCountRef.current >= 3 && currentTime - lastErrorTimeRef.current > 5000) {
        const errorMsg = err?.message || 'Detection failed';
        console.error('❌ Detection error:', err);
        
        setError({
          message: `Detection Error: ${errorMsg}`,
          timestamp: currentTime,
          count: errorCountRef.current
        });
        
        lastErrorTimeRef.current = currentTime;
      }
      
      // Continue even on error for 24/7 reliability (with exponential backoff)
      const backoffDelay = Math.min(1000 * Math.pow(2, Math.min(errorCountRef.current - 1, 5)), 10000);
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
      }, backoffDelay);
    }
  }, [videoElement, isActive, drawDetections, error]);

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
      
      {/* Enhanced Detection Status - Top Right */}
      <div className="absolute top-3 right-3 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl text-xs border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
        {!isModelLoaded ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-yellow-400 font-bold tracking-wide">LOADING AI...</span>
          </div>
        ) : error ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-bold tracking-wide">ERROR</span>
            </div>
            <div className="text-red-300 text-[10px]">
              {error.message}
            </div>
            <div className="text-gray-400 text-[10px]">
              Retrying... ({error.count} errors)
            </div>
          </div>
        ) : isDetecting ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
              <span className="text-green-400 font-bold tracking-wider text-sm">AI ACTIVE</span>
            </div>
            <div className="text-white font-mono">
              <span className="text-cyan-400">●</span> {detections.length} OBJECT{detections.length !== 1 ? 'S' : ''}
            </div>
            {fps > 0 && (
              <div className="text-gray-300 font-mono">
                <span className="text-yellow-400">⚡</span> {fps} FPS
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span className="text-gray-400 font-bold tracking-wide">STANDBY</span>
          </div>
        )}
      </div>

      {/* Enhanced Detection Legend - Bottom Left */}
      {isDetecting && detections.length > 0 && (
        <div className="absolute bottom-3 left-3 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl text-xs border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 max-w-xs">
          <div className="font-bold mb-2 text-sm tracking-wider text-purple-300 flex items-center gap-2">
            <span className="text-purple-400">▶</span> DETECTED
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            {detections.slice(0, 8).map((det, idx) => {
              const colors = getClassColor(det.class);
              return (
                <div key={idx} className="flex items-center gap-2 group hover:bg-white/5 p-1 rounded transition-colors">
                  <div 
                    className="w-3 h-3 rounded-full shadow-lg animate-pulse" 
                    style={{ 
                      backgroundColor: colors.box,
                      boxShadow: `0 0 8px ${colors.glow}`
                    }}
                  ></div>
                  <span className="font-mono text-[11px] flex-1" style={{ color: colors.label }}>
                    #{idx + 1} {det.class.toUpperCase()}
                  </span>
                  <span className="text-gray-400 font-mono text-[10px]">
                    {Math.round(det.score * 100)}%
                  </span>
                </div>
              );
            })}
            {detections.length > 8 && (
              <div className="text-gray-500 text-center pt-1 border-t border-gray-700 font-mono text-[10px]">
                +{detections.length - 8} MORE OBJECTS
              </div>
            )}
          </div>
        </div>
      )}

      {/* Color Legend - Bottom Right (if detections present) */}
      {isDetecting && detections.length > 0 && (
        <div className="absolute bottom-3 right-3 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-[10px] border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20">
          <div className="font-bold mb-1.5 text-xs tracking-wider text-blue-300">COLOR KEY</div>
          <div className="space-y-1">
            {Array.from(new Set(detections.map(d => d.class))).slice(0, 5).map((className, idx) => {
              const colors = getClassColor(className);
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-sm" 
                    style={{ backgroundColor: colors.box }}
                  ></div>
                  <span className="font-mono uppercase" style={{ color: colors.label }}>
                    {className}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
