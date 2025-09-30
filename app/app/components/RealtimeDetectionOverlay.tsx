'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

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
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Draw detections on canvas with smoothing
  const drawDetections = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoElement || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    const rect = videoElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 0) return;

    // Draw each detection with smoothing
    detections.forEach((detection) => {
      const { bbox, class_name, confidence } = detection;
      
      // Calculate scaled coordinates
      const x1 = (bbox.x1 / videoElement.videoWidth) * canvas.width;
      const y1 = (bbox.y1 / videoElement.videoHeight) * canvas.height;
      const x2 = (bbox.x2 / videoElement.videoWidth) * canvas.width;
      const y2 = (bbox.y2 / videoElement.videoHeight) * canvas.height;
      
      const width = x2 - x1;
      const height = y2 - y1;

      // Skip very small detections to reduce noise
      if (width < 10 || height < 10) return;

      // Draw bounding box with better visibility
      ctx.strokeStyle = '#00ff00'; // Green
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.strokeRect(x1, y1, width, height);

      // Draw label background with better contrast
      const label = `${class_name}: ${Math.round(confidence * 100)}%`;
      ctx.font = 'bold 12px Arial';
      const textMetrics = ctx.measureText(label);
      const labelWidth = textMetrics.width + 12;
      const labelHeight = 18;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(x1, y1 - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = '#00ff00';
      ctx.fillText(label, x1 + 6, y1 - 4);
    });
  }, [detections, videoElement, isActive]);

  // Set up real-time detection stream
  useEffect(() => {
    if (!isActive || !cameraId) return;

    console.log(`🎯 Starting real-time detection stream for camera ${cameraId}`);
    setIsDetecting(true);

    // Create Server-Sent Events connection for real-time detections
    const eventSource = new EventSource(`/api/yolo/detections/stream?camera_id=${cameraId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.detections && Array.isArray(data.detections)) {
          setDetections(data.detections);
          setLastUpdate(new Date());
          console.log(`🎯 Received ${data.detections.length} real-time detections`);
        }
      } catch (error) {
        console.error('Error parsing detection data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Detection stream error:', error);
      // Try to reconnect after 1 second for faster recovery
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔄 Reconnecting detection stream...');
          eventSource.close();
          // The useEffect will recreate the connection
        }
      }, 1000);
    };

    return () => {
      console.log(`🛑 Stopping real-time detection stream for camera ${cameraId}`);
      eventSource.close();
      eventSourceRef.current = null;
      setIsDetecting(false);
    };
  }, [isActive, cameraId]);

  // Redraw when detections change
  useEffect(() => {
    drawDetections();
  }, [drawDetections]);

  // Redraw when video size changes
  useEffect(() => {
    if (!videoElement) return;

    const handleResize = () => {
      drawDetections();
    };

    videoElement.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      videoElement.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, [videoElement, drawDetections]);

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
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        {isDetecting ? (
          <span className="text-green-400">
            🎯 Live Detection: {detections.length} objects
          </span>
        ) : (
          <span className="text-gray-400">🔴 Detection Off</span>
        )}
        {lastUpdate && (
          <div className="text-xs text-gray-300">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
