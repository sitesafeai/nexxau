'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Plus, Square, AlertCircle } from 'lucide-react';
import CameraFeed from '@/app/components/CameraFeed';

interface Zone {
  id: string;
  name: string;
  type: 'restricted' | 'required' | 'monitored';
  points: Array<{ x: number; y: number }>;
  color: string;
}

export default function CameraZonesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cameraId = searchParams.get('camera');
  const worksiteParam = searchParams.get('worksite');
  
  const [camera, setCamera] = useState<any>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cameraId) {
      loadCamera();
    }
  }, [cameraId]);

  const loadCamera = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cameras/${cameraId}`);
      if (res.ok) {
        const data = await res.json();
        const cameraData = data.data || data;
        setCamera(cameraData);
        
        // Load existing zones from metadata
        if (cameraData.metadata?.detectionZones) {
          setZones(cameraData.metadata.detectionZones);
        }
      }
    } catch (err) {
      console.error('Error loading camera:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveZones = async () => {
    if (!camera) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/cameras/${camera.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...camera.metadata,
            detectionZones: zones
          }
        })
      });
      
      if (res.ok) {
        alert('Zones saved successfully!');
      } else {
        alert('Failed to save zones');
      }
    } catch (err) {
      alert('Error saving zones');
    } finally {
      setSaving(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) {
      console.log('Click ignored:', { isDrawing, hasCanvas: !!canvasRef.current });
      return;
    }
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Percentage
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    console.log('Point added:', { x, y, totalPoints: currentPoints.length + 1 });
    setCurrentPoints([...currentPoints, { x, y }]);
  };

  const finishDrawing = () => {
    if (currentPoints.length < 4) {
      alert('Please draw at least 4 points to create a zone');
      return;
    }
    
    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name: `Zone ${zones.length + 1}`,
      type: 'monitored',
      points: currentPoints,
      color: '#FF0000'
    };
    
    setZones([...zones, newZone]);
    setCurrentPoints([]);
    setIsDrawing(false);
  };

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setIsDrawing(false);
  };

  const deleteZone = (zoneId: string) => {
    setZones(zones.filter(z => z.id !== zoneId));
    if (selectedZone === zoneId) setSelectedZone(null);
  };

  const updateZoneName = (zoneId: string, name: string) => {
    setZones(zones.map(z => z.id === zoneId ? { ...z, name } : z));
  };

  const updateZoneType = (zoneId: string, type: Zone['type']) => {
    setZones(zones.map(z => z.id === zoneId ? { ...z, type } : z));
  };

  const updateZoneColor = (zoneId: string, color: string) => {
    setZones(zones.map(z => z.id === zoneId ? { ...z, color } : z));
  };

  // Draw zones on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = videoContainerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Match canvas size to container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw existing zones
    zones.forEach(zone => {
      if (zone.points.length < 2) return;
      
      ctx.beginPath();
      const firstPoint = {
        x: (zone.points[0].x / 100) * canvas.width,
        y: (zone.points[0].y / 100) * canvas.height
      };
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      zone.points.slice(1).forEach(point => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / 100) * canvas.height;
        ctx.lineTo(x, y);
      });
      
      ctx.closePath();
      
      // Fill
      ctx.fillStyle = zone.color + '40'; // Add transparency
      ctx.fill();
      
      // Stroke
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw points
      zone.points.forEach(point => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / 100) * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = zone.color;
        ctx.fill();
      });
      
      // Draw zone name
      if (zone.points.length > 0) {
        const centerX = zone.points.reduce((sum, p) => sum + (p.x / 100) * canvas.width, 0) / zone.points.length;
        const centerY = zone.points.reduce((sum, p) => sum + (p.y / 100) * canvas.height, 0) / zone.points.length;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(zone.name, centerX - 30, centerY);
      }
    });
    
    // Draw current drawing
    if (currentPoints.length > 0) {
      ctx.beginPath();
      const firstPoint = {
        x: (currentPoints[0].x / 100) * canvas.width,
        y: (currentPoints[0].y / 100) * canvas.height
      };
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      currentPoints.slice(1).forEach(point => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / 100) * canvas.height;
        ctx.lineTo(x, y);
      });
      
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw points
      currentPoints.forEach(point => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / 100) * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
      });
    }
  }, [zones, currentPoints]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading camera...</p>
        </div>
      </div>
    );
  }

  if (!cameraId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No Camera Selected</h2>
            <p className="text-gray-400 mb-6">Please select a camera to configure detection zones</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Camera Not Found</h2>
            <p className="text-gray-400 mb-6">The selected camera could not be loaded</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Detection Zones</h1>
              <p className="text-gray-400">{camera.name} - {camera.location || 'Configure detection zones for this camera'}</p>
            </div>
            
            <button
              onClick={handleSaveZones}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-semibold ${
                saving
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Zones'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed with Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white mb-2">Camera Feed</h2>
                <p className="text-sm text-gray-400">Click on the video to draw detection zones</p>
              </div>
              
              <div ref={videoContainerRef} className={`relative aspect-video bg-black rounded-lg overflow-hidden ${isDrawing ? 'ring-4 ring-green-500' : ''}`}>
                <CameraFeed
                  streamUrl={camera.streamUrl || camera.hlsUrl}
                  cameraId={camera.id}
                  autoPlay={true}
                  enableDetection={false}
                  className="absolute inset-0"
                />
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className={`absolute inset-0 ${isDrawing ? 'cursor-crosshair' : 'pointer-events-none'}`}
                  style={{ zIndex: isDrawing ? 50 : 10, pointerEvents: isDrawing ? 'auto' : 'none' }}
                />
                {isDrawing && (
                  <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 z-50">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Drawing Mode - Click to Place Points
                  </div>
                )}
              </div>
              
              {/* Drawing Controls */}
              <div className="mt-4 flex gap-3">
                {!isDrawing ? (
                  <button
                    onClick={() => {
                      console.log('Starting drawing mode');
                      setIsDrawing(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Square className="w-5 h-5" />
                    Start Drawing Zone
                  </button>
                ) : (
                  <>
                    <button
                      onClick={finishDrawing}
                      disabled={currentPoints.length < 4}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      Finish Zone ({currentPoints.length} points - need {currentPoints.length < 4 ? 4 - currentPoints.length : 0} more)
                    </button>
                    <button
                      onClick={cancelDrawing}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
              
              {isDrawing && (
                <div className="mt-3 p-3 bg-blue-900/50 border border-blue-700 rounded-lg text-blue-200 text-sm">
                  <strong>Drawing Mode:</strong> Click on the video to place points. You need at least 4 points to create a zone. Click "Finish Zone" to save and create another.
                </div>
              )}
            </div>
          </div>

          {/* Zone List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Detection Zones</h2>
              
              {zones.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Square className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No zones configured</p>
                  <p className="text-sm mt-2">Click "Start Drawing Zone" to create one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {zones.map((zone) => (
                    <div
                      key={zone.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedZone === zone.id
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedZone(zone.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="text"
                          value={zone.name}
                          onChange={(e) => updateZoneName(zone.id, e.target.value)}
                          className="bg-gray-900 text-white px-2 py-1 rounded text-sm font-medium flex-1 mr-2"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteZone(zone.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Type</label>
                          <select
                            value={zone.type}
                            onChange={(e) => updateZoneType(zone.id, e.target.value as Zone['type'])}
                            className="w-full bg-gray-900 text-white px-2 py-1 rounded text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="monitored">Monitored</option>
                            <option value="restricted">Restricted</option>
                            <option value="required">Required</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Color</label>
                          <input
                            type="color"
                            value={zone.color}
                            onChange={(e) => updateZoneColor(zone.id, e.target.value)}
                            className="w-full h-8 bg-gray-900 rounded cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        <div className="text-xs text-gray-400 pt-1">
                          {zone.points.length} points
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

