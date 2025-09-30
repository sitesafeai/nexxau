'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CameraFeed from '../../components/CameraFeed';
import SimpleHLSTest from '../../components/SimpleHLSTest';
import WorkingStreamsTest from '../../components/WorkingStreamsTest';

export default function CamerasPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCamera, setSelectedCamera] = useState<any>(null);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [errorCameras, setErrorCameras] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', location: '', rtspUrl: '' });
  const [cameraKey, setCameraKey] = useState(0);
  const [enableDetection, setEnableDetection] = useState(true);

  // Debug logging
  console.log('showAddCamera state:', showAddCamera);

  const refreshCameras = async () => {
    setLoadingCameras(true);
    setErrorCameras(null);
    try {
      const res = await fetch('/api/cameras');
      if (!res.ok) throw new Error('Failed to load cameras');
      const data = await res.json();
      setCameras(data);
      if (!selectedCamera && data.length > 0) setSelectedCamera(data[0]);
    } catch (err: any) {
      setErrorCameras(err.message || 'Failed to load cameras');
    } finally {
      setLoadingCameras(false);
    }
  };

  useEffect(() => {
    refreshCameras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-900 text-green-300';
      case 'offline': return 'bg-red-900 text-red-300';
      case 'maintenance': return 'bg-yellow-900 text-yellow-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const handleCameraSelect = useCallback((camera: any) => {
    console.log('Camera selected:', camera.name);
    setSelectedCamera(camera);
    setCameraKey(prev => prev + 1); // Force component remount when camera changes
  }, []);

  const handleRetryCamera = useCallback(() => {
    console.log('Retrying camera connection');
    setCameraKey(prev => prev + 1); // Force component remount to retry connection
  }, []);

  const handleToggleAddCamera = useCallback(() => {
    setShowAddCamera(prev => {
      console.log('showAddCamera state:', !prev);
      return !prev;
    });
  }, []);

  const handleAddCamera = async () => {
    try {
      if (!form.name || !form.rtspUrl) {
        alert('Please provide a name and RTSP URL');
        return;
      }
      setShowAddCamera(false);

      const createRes = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          location: form.location,
          type: 'IP Camera',
          streamUrl: form.rtspUrl
        })
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        console.error('Camera creation failed:', err);
        throw new Error(err?.details || err?.error || 'Failed to create camera');
      }
      const newCamera = await createRes.json();

      const mediamtxPath = `camera-${newCamera.id}`;
      await fetch('/api/mediamtx/update-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId: newCamera.id, rtspUrl: form.rtspUrl, mediamtxPath })
      }).catch(() => undefined);

      setForm({ name: '', location: '', rtspUrl: '' });
      await refreshCameras();
    } catch (e: any) {
      alert(e.message || 'Failed to add camera');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white">Camera Management</h1>
            <p className="text-gray-400 mt-2">Monitor and configure camera settings and performance</p>
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-1">
              Debug: showAddCamera = {showAddCamera.toString()}
            </div>
          </div>
                      <div className="flex space-x-3">
          <button
          onClick={handleToggleAddCamera}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Add Camera
          </button>
              {/* Add Demo Camera button */}
              <button
                onClick={async () => {
                  try {
                    console.log('Adding demo camera...');
                    const res = await fetch('/api/cameras', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: 'Demo Camera ' + (cameras.length + 1),
                        location: 'Demo Location',
                        type: 'IP Camera',
                        streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8'
                      })
                    });
                    if (res.ok) {
                      console.log('Demo camera added successfully');
                      await refreshCameras();
                    } else {
                      const error = await res.json();
                      console.error('Failed to add demo camera:', error);
                      alert('Failed to add demo camera: ' + (error.details || error.error));
                    }
                  } catch (e) {
                    console.error('Error adding demo camera:', e);
                    alert('Error adding demo camera: ' + e);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                title="Add a demo camera with working video stream"
              >
                Add Demo Camera
              </button>

              {/* Add People Detection Camera button */}
              <button
                onClick={async () => {
                  try {
                    console.log('Adding people detection camera...');
                    const res = await fetch('/api/cameras', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: 'People Detection Camera ' + (cameras.length + 1),
                        location: 'Construction Site',
                        type: 'People Detection',
                        streamUrl: 'rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people',
                        hlsUrl: 'http://localhost:8888/streams/people/index.m3u8'
                      })
                    });
                    if (res.ok) {
                      console.log('People detection camera added successfully');
                      await refreshCameras();
                    } else {
                      const error = await res.json();
                      console.error('Failed to add people detection camera:', error);
                      alert('Failed to add people detection camera: ' + (error.details || error.error));
                    }
                  } catch (e) {
                    console.error('Error adding people detection camera:', e);
                    alert('Error adding people detection camera: ' + e);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                title="Add a people detection camera with live RTSP stream"
              >
                Add People Detection Camera
              </button>

              {/* Debug button */}
              <button
                onClick={() => {
                  console.log('Debug button clicked!');
                  setShowAddCamera(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-3 rounded-lg font-medium transition-colors text-sm"
                title="Force show modal for debugging"
              >
                Debug
              </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'settings', name: 'Settings' },
            { id: 'maintenance', name: 'Maintenance' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Camera List */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">Cameras</h2>
                {loadingCameras && (
                  <div className="text-gray-400 text-sm mb-3">Loading cameras...</div>
                )}
                {errorCameras && (
                  <div className="text-red-400 text-sm mb-3">{errorCameras}</div>
                )}
                <div className="space-y-3">
                  {cameras.map((camera) => (
                    <button
                      key={camera.id}
                      onClick={() => handleCameraSelect(camera)}
                      className={`w-full text-left p-4 rounded-lg transition-colors ${
                        selectedCamera?.id === camera.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{camera.name}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(camera.status || 'online')}`}>
                          {camera.status || 'online'}
                        </div>
                      </div>
                      <div className="text-sm opacity-80">
                        <div>{camera.location || 'N/A'}</div>
                        <div>Path: {camera.hlsUrl || camera.streamUrl || '—'}</div>
                      </div>
                    </button>
                  ))}
                  {(!cameras || cameras.length === 0) && !loadingCameras && (
                    <div className="text-gray-400 text-sm">No cameras yet. Click "Add Camera" to get started.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Camera Details */}
            <div className="lg:col-span-2">
              {selectedCamera ? (
                <div className="space-y-6">
                  {/* Camera Feed */}
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-white">{selectedCamera.name}</h2>
                      <button
                        onClick={handleRetryCamera}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        title="Retry camera connection"
                      >
                        Retry Connection
                      </button>
                      
                      <button
                        onClick={() => setEnableDetection(!enableDetection)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          enableDetection 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                        }`}
                        title={enableDetection ? 'Disable AI Detection' : 'Enable AI Detection'}
                      >
                        {enableDetection ? '🤖 AI ON' : '🤖 AI OFF'}
                      </button>
                    </div>
                    <CameraFeed
                      key={`camera-${selectedCamera.id}-${cameraKey}`}
                      streamUrl={selectedCamera.hlsUrl || 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8'}
                      autoPlay={true}
                      className="w-full h-auto"
                      cameraId={selectedCamera.id}
                      enableDetection={enableDetection}
                    />
                  </div>

                  {/* Camera Stats */}
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Camera Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{selectedCamera.resolution || '1920x1080'}</div>
                        <div className="text-sm text-gray-400">Resolution</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{selectedCamera.fps || '30'}</div>
                        <div className="text-sm text-gray-400">FPS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{selectedCamera.uptime || '24h'}</div>
                        <div className="text-sm text-gray-400">Uptime</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{selectedCamera.temperature || '45°C'}</div>
                        <div className="text-sm text-gray-400">Temperature</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${enableDetection ? 'text-green-400' : 'text-gray-400'}`}>
                          {enableDetection ? '🤖 ON' : '🤖 OFF'}
                        </div>
                        <div className="text-sm text-gray-400">AI Detection</div>
                      </div>
                    </div>
                  </div>

                  {/* Camera Info */}
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Camera Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500">Model:</span>
                        <span className="text-white ml-2">{selectedCamera.model}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">IP Address:</span>
                        <span className="text-white ml-2">{selectedCamera.ipAddress}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <span className="text-white ml-2">{selectedCamera.location}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedCamera.status)}`}>
                          {selectedCamera.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex items-center justify-center h-64">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400">Select a camera to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Camera Settings</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Global Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Default Resolution</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>720p</option>
                    <option>1080p</option>
                    <option>4K</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Default FPS</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>15</option>
                    <option>25</option>
                    <option>30</option>
                    <option>60</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Recording Quality</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Motion Detection</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Disabled</option>
                    <option>Low Sensitivity</option>
                    <option>Medium Sensitivity</option>
                    <option>High Sensitivity</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Network Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Network Protocol</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>RTSP</option>
                    <option>HTTP</option>
                    <option>HTTPS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Port</label>
                  <input
                    type="number"
                    defaultValue="554"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Maintenance</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Storage Usage</span>
                    <span className="text-white">75%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Network Status</span>
                    <span className="text-green-400">Good</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Last Backup</span>
                    <span className="text-white">2 hours ago</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Restart All Cameras
                  </button>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Run Diagnostics
                  </button>
                  <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Update Firmware
                  </button>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Backup Configuration
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Maintenance Log</h3>
              <div className="space-y-3">
                {[
                  { action: 'Camera restart', camera: 'Main Construction Site Camera', time: '2 hours ago', status: 'success' },
                  { action: 'Firmware update', camera: 'Safety Zone A Camera', time: '1 day ago', status: 'success' },
                  { action: 'Configuration backup', camera: 'All cameras', time: '3 days ago', status: 'success' },
                  { action: 'Network diagnostics', camera: 'Loading Dock Camera', time: '1 week ago', status: 'warning' }
                ].map((log, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                    <div>
                      <div className="text-white font-medium">{log.action}</div>
                      <div className="text-gray-400 text-sm">{log.camera}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm">{log.time}</div>
                      <span className={`text-sm ${
                        log.status === 'success' ? 'text-green-400' : 
                        log.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Camera Modal */}
        {showAddCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border-2 border-blue-500 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Add New Camera</h3>
                <button 
                  onClick={() => setShowAddCamera(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {/* Debug message */}
                <div className="text-green-400 text-sm text-center bg-green-900 p-2 rounded">
                  Modal is visible! showAddCamera = {showAddCamera.toString()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Camera Name</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter camera name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Main Entrance"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">RTSP URL</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="rtsp://user:pass@ip:554/path"
                    value={form.rtspUrl}
                    onChange={(e) => setForm((f) => ({ ...f, rtspUrl: e.target.value }))}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => setShowAddCamera(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddCamera}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Camera
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simple HLS Test Component */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">HLS Debug Test</h3>
          <SimpleHLSTest />
        </div>

        {/* Working Streams Test Component */}
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-green-800">Working Streams Test</h3>
          <WorkingStreamsTest />
        </div>
      </div>
    </div>
  );
} 