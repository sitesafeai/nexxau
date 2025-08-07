'use client';

import React, { useState, useEffect } from 'react';

interface Camera {
  id: string;
  name: string;
  type: string;
  status: string;
  streamUrl?: string;
  location?: string;
  ipAddress?: string;
  port?: number;
  username?: string;
  password?: string;
  rtspPath?: string;
  hlsUrl?: string;
  mediamtxPath?: string;
  worksiteId: string;
  worksite?: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CameraFormData {
  name: string;
  type: string;
  status: string;
  streamUrl: string;
  location: string;
  ipAddress: string;
  port: string;
  username: string;
  password: string;
  rtspPath: string;
  hlsUrl: string;
  mediamtxPath: string;
  worksiteId: string;
}

const YOLO_STREAM_URL = 'http://localhost:5001/video_feed';

const YoloStream: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Handle image load
  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  // Handle image error
  const handleError = () => {
    setError(true);
    setLoading(false);
    // Try to reconnect after 2 seconds
    setTimeout(() => {
      setReloadKey((k) => k + 1);
      setLoading(true);
      setError(false);
    }, 2000);
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto', marginBottom: 24 }}>
      {loading && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#00000022', zIndex: 1 }}>
          <span style={{ color: '#333', fontSize: 18 }}>Loading YOLOv8 Stream...</span>
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff3', zIndex: 2 }}>
          <span style={{ color: 'red', fontSize: 16 }}>Stream error. Reconnecting...</span>
        </div>
      )}
      <img
        key={reloadKey}
        ref={imgRef}
        src={YOLO_STREAM_URL + '?t=' + reloadKey}
        alt="YOLOv8 Live Stream"
        style={{ width: '100%', maxWidth: 640, borderRadius: 8, display: loading ? 'none' : 'block' }}
        onLoad={handleLoad}
        onError={handleError}
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default function CameraManagement() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [worksites, setWorksites] = useState<any[]>([]);
  const [isAddingCamera, setIsAddingCamera] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CameraFormData>({
    name: '',
    type: 'IP Camera',
    status: 'active',
    streamUrl: '',
    location: '',
    ipAddress: '',
    port: '',
    username: '',
    password: '',
    rtspPath: '',
    hlsUrl: '',
    mediamtxPath: '',
    worksiteId: '',
  });

  useEffect(() => {
    fetchCameras();
    fetchWorksites();
  }, []);

  const fetchCameras = async () => {
    try {
      const response = await fetch('/api/cameras');
      const data = await response.json();
      setCameras(data);
    } catch (error) {
      console.error('Error fetching cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorksites = async () => {
    try {
      const response = await fetch('/api/worksites');
      const data = await response.json();
      setWorksites(data);
    } catch (error) {
      console.error('Error fetching worksites:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    try {
      let response, result;
      if (editingCamera) {
        // For editing, use the old endpoint (or you can extend /api/streams/[id] with PUT)
        response = await fetch(`/api/cameras/${editingCamera.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        result = await response.json();
      } else {
        // For adding, use the new register endpoint
        response = await fetch('/api/streams/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            streamUrl: formData.streamUrl,
            mediamtxPath: formData.mediamtxPath,
            worksiteId: formData.worksiteId,
          }),
        });
        result = await response.json();
      }
      if (response.ok) {
        await fetchCameras();
        resetForm();
      } else {
        alert('Failed to save camera: ' + (result.details || result.error));
      }
    } catch (error) {
      alert('Failed to save camera: ' + error);
    }
  };

  const handleDelete = async (cameraId: string) => {
    if (!confirm('Are you sure you want to delete this camera?')) return;
    try {
      // Use the new stream removal endpoint
      const response = await fetch(`/api/streams/${cameraId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchCameras();
      } else {
        alert('Error deleting camera');
      }
    } catch (error) {
      alert('Error deleting camera: ' + error);
    }
  };

  const handleEdit = (camera: Camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      type: camera.type,
      status: camera.status,
      streamUrl: camera.streamUrl || '',
      location: camera.location || '',
      ipAddress: camera.ipAddress || '',
      port: camera.port?.toString() || '',
      username: camera.username || '',
      password: camera.password || '',
      rtspPath: camera.rtspPath || '',
      hlsUrl: camera.hlsUrl || '',
      mediamtxPath: camera.mediamtxPath || '',
      worksiteId: camera.worksiteId,
    });
    setIsAddingCamera(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'IP Camera',
      status: 'active',
      streamUrl: '',
      location: '',
      ipAddress: '',
      port: '',
      username: '',
      password: '',
      rtspPath: '',
      hlsUrl: '',
      mediamtxPath: '',
      worksiteId: '',
    });
    setEditingCamera(null);
    setIsAddingCamera(false);
  };

  const generateStreamUrl = () => {
    if (formData.ipAddress && formData.rtspPath) {
      const protocol = formData.port === '554' ? 'rtsp' : 'rtsp';
      const port = formData.port ? `:${formData.port}` : '';
      const auth = formData.username ? `${formData.username}:${formData.password}@` : '';
      const streamUrl = `${protocol}://${auth}${formData.ipAddress}${port}${formData.rtspPath}`;
      setFormData(prev => ({ ...prev, streamUrl }));
    }
  };

  // Auto-convert RTSP to HLS
  const convertRtspToHls = (rtspUrl: string) => {
    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      return null;
    }

    // Extract a unique identifier from the RTSP URL
    const urlParts = rtspUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const pathName = lastPart || 'camera';
    
    // Generate a unique MediaMTX path name
    const mediamtxPath = `${pathName}_${Date.now()}`;
    
    // Convert to HLS URL
    const hlsUrl = `http://localhost:8888/live/${mediamtxPath}/index.m3u8`;
    
    return {
      originalRtsp: rtspUrl,
      mediamtxPath,
      hlsUrl,
      needsConversion: true
    };
  };

  const handleStreamUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, streamUrl: value }));
    
    // Auto-convert RTSP to HLS if detected
    if (value && value.startsWith('rtsp://')) {
      const conversion = convertRtspToHls(value);
      if (conversion) {
        setFormData(prev => ({
          ...prev,
          streamUrl: conversion.hlsUrl,
          mediamtxPath: conversion.mediamtxPath,
          hlsUrl: conversion.hlsUrl
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading cameras...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <YoloStream />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Camera Management</h2>
        <button
          onClick={() => setIsAddingCamera(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Add Camera
        </button>
      </div>

      {/* Camera Form */}
      {isAddingCamera && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingCamera ? 'Edit Camera' : 'Add New Camera'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Camera Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                >
                  <option value="IP Camera">IP Camera</option>
                  <option value="RTSP Camera">RTSP Camera</option>
                  <option value="HLS Camera">HLS Camera</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Worksite
                </label>
                <select
                  name="worksiteId"
                  value={formData.worksiteId}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  required
                >
                  <option value="">Select Worksite</option>
                  {worksites.map((worksite) => (
                    <option key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  placeholder="e.g., Front Door, Parking Lot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  name="ipAddress"
                  value={formData.ipAddress}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  placeholder="192.168.1.100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  name="port"
                  value={formData.port}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  placeholder="554"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  RTSP Path
                </label>
                <input
                  type="text"
                  name="rtspPath"
                  value={formData.rtspPath}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  placeholder="/stream1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  MediaMTX Path
                </label>
                <input
                  type="text"
                  name="mediamtxPath"
                  value={formData.mediamtxPath}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  placeholder="camera1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Stream URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="streamUrl"
                  value={formData.streamUrl}
                  onChange={handleStreamUrlChange}
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-md"
                  placeholder="rtsp://username:password@ip:port/path or HLS URL"
                />
                <button
                  type="button"
                  onClick={generateStreamUrl}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Direct HLS URL (Optional)
              </label>
              <input
                type="text"
                name="hlsUrl"
                value={formData.hlsUrl}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                placeholder="http://camera-ip:port/stream.m3u8"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
              >
                {editingCamera ? 'Update Camera' : 'Add Camera'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cameras List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Cameras ({cameras.length})</h3>
        </div>
        
        {cameras.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No cameras found. Add your first camera above.
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {cameras.map((camera) => (
              <div key={camera.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">{camera.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        camera.status === 'active' 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {camera.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                      <div>
                        <span className="font-medium">Type:</span> {camera.type}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {camera.location || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">IP Address:</span> {camera.ipAddress || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Worksite:</span> {camera.worksite?.name || 'N/A'}
                      </div>
                    </div>
                    
                    {camera.streamUrl && (
                      <div className="mt-2">
                        <span className="font-medium text-sm text-gray-400">Stream URL:</span>
                        <div className="text-xs text-gray-500 break-all mt-1">
                          {camera.streamUrl}
                        </div>
                      </div>
                    )}
                    {camera.mediamtxPath && (
                      <div className="mt-2">
                        <span className="font-medium text-sm text-gray-400">HLS URL:</span>
                        <div className="text-xs text-blue-400 break-all mt-1">
                          {`http://localhost:8888/live/${camera.mediamtxPath}/index.m3u8`}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(camera)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(camera.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 