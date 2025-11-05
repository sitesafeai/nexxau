'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Trash2, RefreshCw, Info } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Zone {
  name: string;
  points: Point[];
  color: string;
  type: 'restricted' | 'safe' | 'monitored';
}

interface ZoneDrawingToolProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraId: string;
  onZoneComplete: (zone: Zone) => void;
  existingZones?: Zone[];
  className?: string;
}

export default function ZoneDrawingTool({
  videoRef,
  cameraId,
  onZoneComplete,
  existingZones = [],
  className = ''
}: ZoneDrawingToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [zones, setZones] = useState<Zone[]>(existingZones);
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState<'restricted' | 'safe' | 'monitored'>('restricted');
  const [showInstructions, setShowInstructions] = useState(true);

  // Zone colors
  const zoneColors = {
    restricted: 'rgba(239, 68, 68, 0.3)',      // Red
    safe: 'rgba(16, 185, 129, 0.3)',           // Green
    monitored: 'rgba(59, 130, 246, 0.3)'       // Blue
  };

  const zoneBorders = {
    restricted: '#ef4444',
    safe: '#10b981',
    monitored: '#3b82f6'
  };

  useEffect(() => {
    console.log('ZoneDrawingTool mounted', { cameraId, hasVideo: !!videoRef.current });
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [currentPoints, zones, videoRef]);

  // Redraw canvas when video loads and gets dimensions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoLoad = () => {
      console.log('Video loaded, redrawing canvas');
      drawCanvas();
    };

    video.addEventListener('loadedmetadata', handleVideoLoad);
    video.addEventListener('resize', handleVideoLoad);
    
    // Initial draw if video already loaded
    if (video.videoWidth > 0) {
      handleVideoLoad();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleVideoLoad);
      video.removeEventListener('resize', handleVideoLoad);
    };
  }, [videoRef.current]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) {
      console.log('drawCanvas: missing refs', { hasCanvas: !!canvas, hasVideo: !!video });
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video's DISPLAY size, not native size
    const rect = video.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth || 1920;
      canvas.height = displayHeight || 1080;
      console.log('Canvas sized:', { width: canvas.width, height: canvas.height, videoDisplay: { w: displayWidth, h: displayHeight } });
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing zones
    zones.forEach(zone => {
      if (zone.points.length > 0) {
        drawZone(ctx, zone.points, zone.color, zone.type, zone.name);
      }
    });

    // Draw current polygon being drawn
    if (currentPoints.length > 0) {
      drawZone(ctx, currentPoints, zoneColors[zoneType], zoneType, 'Drawing...');
    }
  };

  const drawZone = (
    ctx: CanvasRenderingContext2D, 
    points: Point[], 
    fillColor: string,
    type: 'restricted' | 'safe' | 'monitored',
    label: string
  ) => {
    if (points.length < 2) return;

    // Draw filled polygon
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = zoneBorders[type];
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw points
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = zoneBorders[type];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw point number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${index + 1}`, point.x - 4, point.y + 4);
    });

    // Draw label
    if (points.length > 0) {
      const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      
      ctx.fillStyle = zoneBorders[type];
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label.toUpperCase(), centerX, centerY);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    console.log('Canvas clicked', { 
      isDrawing, 
      hasCanvas: !!canvas,
      canvasDimensions: canvas ? { width: canvas.width, height: canvas.height, offsetWidth: canvas.offsetWidth, offsetHeight: canvas.offsetHeight } : null,
      clickPosition: { x: e.clientX, y: e.clientY }
    });
    
    if (!isDrawing) {
      console.log('Not in drawing mode - click ignored');
      return;
    }

    if (!canvas) {
      console.log('No canvas ref');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    console.log('Canvas rect:', rect);
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    console.log('Point added:', { x, y, scaleX, scaleY, totalPoints: currentPoints.length + 1 });
    setCurrentPoints([...currentPoints, { x, y }]);
  };

  const startDrawing = () => {
    console.log('Start drawing clicked', { zoneName: zoneName.trim() });
    if (!zoneName.trim()) {
      console.log('Zone name missing - showing alert');
      alert('Please enter a zone name first');
      return;
    }
    console.log('Starting drawing mode');
    setIsDrawing(true);
    setCurrentPoints([]);
    setShowInstructions(false);
  };

  const completeZone = () => {
    if (currentPoints.length < 4) {
      alert('Please draw at least 4 points to create a zone');
      return;
    }

    const newZone: Zone = {
      name: zoneName,
      points: currentPoints,
      color: zoneColors[zoneType],
      type: zoneType
    };

    const updatedZones = [...zones, newZone];
    setZones(updatedZones);
    onZoneComplete(newZone);
    
    console.log('Zone completed:', newZone);
    
    // Reset for next zone but stay in drawing mode
    setCurrentPoints([]);
    setZoneName('');
    setIsDrawing(false); // Go back to setup to name the next zone
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const clearZones = () => {
    if (confirm('Are you sure you want to clear all zones?')) {
      setZones([]);
      setCurrentPoints([]);
    }
  };

  const deleteZone = (index: number) => {
    setZones(zones.filter((_, i) => i !== index));
  };

  const undoLastPoint = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };

  return (
    <>
      {/* Canvas Overlay - absolute positioned over video */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`absolute inset-0 w-full h-full ${
          isDrawing ? 'cursor-crosshair z-50' : 'cursor-default pointer-events-none z-10'
        }`}
        style={{ pointerEvents: isDrawing ? 'auto' : 'none' }}
      />

      {/* UI Controls Overlay - absolute positioned at top */}
      <div className={`absolute top-0 left-0 right-0 z-50 p-4 space-y-3 pointer-events-none ${className}`}>
        {/* Instructions */}
        {showInstructions && (
          <div className="bg-blue-900/95 backdrop-blur border border-blue-700/50 rounded-xl p-4 flex gap-3 pointer-events-auto">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-2">How to Draw Restricted Zones</h4>
              <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
                <li>Enter a name for your zone (e.g., "Machine Area", "Crane Zone")</li>
                <li>Click "Start Drawing" button</li>
                <li>Click on the video to place points around the restricted area</li>
                <li>You need at least 4 points to create a zone</li>
                <li>Click "Complete Zone" when done to save and create another, or "Cancel" to start over</li>
                <li>The zone will be highlighted in red/green/blue</li>
              </ol>
              <button
                onClick={() => setShowInstructions(false)}
                className="mt-3 text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Got it, hide this
              </button>
            </div>
          </div>
        )}

        {/* Zone Setup */}
        {!isDrawing && (
          <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-4 pointer-events-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Zone Name *</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g., Crane Danger Zone"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Zone Type</label>
                <select
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="restricted">Restricted (Red) - No Entry</option>
                  <option value="monitored">Monitored (Blue) - Watch Only</option>
                  <option value="safe">Safe Zone (Green) - OK Area</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={startDrawing}
                  disabled={!zoneName.trim()}
                  className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                    zoneName.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Start Drawing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drawing Controls */}
        {isDrawing && (
          <div className="bg-gray-800/95 backdrop-blur border border-gray-700 rounded-xl p-4 pointer-events-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-white font-semibold">Drawing: {zoneName}</h4>
                <p className="text-gray-400 text-sm">
                  Points placed: {currentPoints.length} 
                {currentPoints.length < 4 && ` (need ${4 - currentPoints.length} more)`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={undoLastPoint}
                disabled={currentPoints.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  currentPoints.length > 0
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                title="Undo last point"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={cancelDrawing}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                title="Cancel drawing"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={completeZone}
                disabled={currentPoints.length < 4}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  currentPoints.length >= 4
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                title="Complete zone (saves and allows you to create another)"
              >
                <Check className="h-4 w-4" />
                Complete Zone {zones.length > 0 && `(${zones.length} saved)`}
              </button>
            </div>
          </div>
          <p className="text-yellow-400 text-sm">
            👆 Click on the video to place points. Click "Complete Zone" to save this zone and create another.
          </p>
        </div>
      )}

      {/* Show completed zones count and option to finish */}
      {zones.length > 0 && !isDrawing && (
        <div className="bg-green-900/95 backdrop-blur border border-green-700/50 rounded-xl p-4 flex items-center justify-between pointer-events-auto">
          <div>
            <h4 className="text-white font-semibold">✅ {zones.length} Zone{zones.length !== 1 ? 's' : ''} Created</h4>
            <p className="text-green-200 text-sm mt-1">
              You can create more zones or continue to the next step
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Existing Zones List - Bottom overlay */}
      {zones.length > 0 && false && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-semibold">Defined Zones ({zones.length})</h4>
            <button
              onClick={clearZones}
              className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          </div>
          
          <div className="space-y-2">
            {zones.map((zone, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: zoneBorders[zone.type] }}
                  />
                  <div>
                    <p className="text-white font-medium">{zone.name}</p>
                    <p className="text-gray-400 text-sm">
                      {zone.type.charAt(0).toUpperCase() + zone.type.slice(1)} Zone • {zone.points.length} points
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteZone(index)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone Preview (Coordinates) - Hidden for cleaner UI */}
      {currentPoints.length > 0 && isDrawing && false && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">Zone Coordinates</h4>
          <div className="font-mono text-xs text-gray-400 max-h-32 overflow-y-auto">
            <pre>{JSON.stringify(currentPoints, null, 2)}</pre>
          </div>
        </div>
      )}
    </>
  );
}

