'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CameraFeed from '@/app/components/CameraFeed';
import { useCameraStore, Camera } from '@/app/lib/camera-store';
import { ArrowLeft } from 'lucide-react';

export default function CameraManagementPage() {
  const router = useRouter();
  const { 
    cameras, 
    addCamera, 
    updateCamera, 
    deleteCamera,
    getStats 
  } = useCameraStore();
  
  const stats = getStats();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [previewCamera, setPreviewCamera] = useState<Camera | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    streamUrl: '',
    streamType: 'hls' as 'hls' | 'rtsp' | 'webrtc' | 'http',
    description: '',
    resolution: '1080p',
    fps: 30
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddCamera = () => {
    if (!formData.name || !formData.streamUrl) {
      alert('Please fill in required fields');
      return;
    }

    const newCam = addCamera({
      name: formData.name,
      location: formData.location,
      streamUrl: formData.streamUrl,
      streamType: formData.streamType,
      status: 'testing', // Will update to online when stream connects
      description: formData.description,
      resolution: formData.resolution,
      fps: formData.fps,
      hasVideo: true,
      alerts: 0
    });

    setIsAddModalOpen(false);
    resetForm();
    
    // Show success message
    setSuccessMessage(`✅ Camera "${newCam.name}" added successfully!`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleEditCamera = () => {
    if (!selectedCamera) return;

    updateCamera(selectedCamera.id, {
      name: formData.name,
      location: formData.location,
      streamUrl: formData.streamUrl,
      streamType: formData.streamType,
      description: formData.description,
      resolution: formData.resolution,
      fps: formData.fps
    });

    setIsEditModalOpen(false);
    setSelectedCamera(null);
    resetForm();
  };

  const handleDeleteCamera = (cameraId: string) => {
    if (confirm('Are you sure you want to delete this camera?')) {
      deleteCamera(cameraId);
    }
  };

  const openEditModal = (camera: Camera) => {
    setSelectedCamera(camera);
    setFormData({
      name: camera.name,
      location: camera.location,
      streamUrl: camera.streamUrl,
      streamType: camera.streamType,
      description: camera.description || '',
      resolution: camera.resolution || '1080p',
      fps: camera.fps || 30
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      streamUrl: '',
      streamType: 'hls',
      description: '',
      resolution: '1080p',
      fps: 30
    });
  };

  const testStream = (camera: Camera) => {
    setPreviewCamera(camera);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="p-6 space-y-6">
        {/* Success Notification */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-lg shadow-2xl border border-emerald-500/50 animate-slide-in-right">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{successMessage}</span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white transition-colors border border-slate-700 hover:border-slate-600"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Camera Management</h1>
              <p className="text-gray-300 text-lg">Add, configure, and monitor camera feeds</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Camera
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 p-6 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-semibold uppercase tracking-wide">Total Cameras</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.total}</p>
                <p className="text-blue-300 text-xs mt-1">{stats.totalAlerts} active alerts</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 backdrop-blur-sm border border-emerald-500/30 p-6 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-200 text-sm font-semibold uppercase tracking-wide">Online</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.online}</p>
                <p className="text-emerald-300 text-xs mt-1">Streaming live</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="relative">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 backdrop-blur-sm border border-red-500/30 p-6 rounded-xl shadow-lg hover:shadow-red-500/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-200 text-sm font-semibold uppercase tracking-wide">Offline</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.offline}</p>
                <p className="text-red-300 text-xs mt-1">{stats.error} with errors</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-600/20 to-violet-800/20 backdrop-blur-sm border border-violet-500/30 p-6 rounded-xl shadow-lg hover:shadow-violet-500/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-200 text-sm font-semibold uppercase tracking-wide">AI Enabled</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.total}</p>
                <p className="text-violet-300 text-xs mt-1">Active detection</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cameras.map((camera) => (
            <div key={camera.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
              {/* Camera Header */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{camera.name}</h3>
                    <p className="text-sm text-gray-400">{camera.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase rounded-md ${
                      camera.status === 'online' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {camera.status}
                    </span>
                    <button
                      onClick={() => testStream(camera)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => openEditModal(camera)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCamera(camera.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Camera Info */}
              <div className="p-4 bg-slate-900/30">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Stream Type</p>
                    <p className="text-white font-medium uppercase">{camera.streamType}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Resolution</p>
                    <p className="text-white font-medium">{camera.resolution || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">FPS</p>
                    <p className="text-white font-medium">{camera.fps || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Added</p>
                    <p className="text-white font-medium">{new Date(camera.addedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {camera.description && (
                  <div className="mt-3 pt-3 border-t border-slate-700/30">
                    <p className="text-gray-400 text-xs">Description</p>
                    <p className="text-white text-sm">{camera.description}</p>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-slate-700/30">
                  <p className="text-gray-400 text-xs mb-1">Stream URL</p>
                  <p className="text-blue-400 text-xs font-mono break-all">{camera.streamUrl}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Camera Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Add New Camera</h2>
                  <button
                    onClick={() => {
                      setIsAddModalOpen(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Camera Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., Main Entrance Camera"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="e.g., Building A - Floor 2"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief description of camera purpose..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Stream Type *
                      </label>
                      <select
                        value={formData.streamType}
                        onChange={(e) => setFormData({...formData, streamType: e.target.value as any})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="hls">HLS (.m3u8)</option>
                        <option value="rtsp">RTSP</option>
                        <option value="webrtc">WebRTC</option>
                        <option value="http">HTTP/MJPEG</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Resolution
                      </label>
                      <select
                        value={formData.resolution}
                        onChange={(e) => setFormData({...formData, resolution: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="4K">4K (3840x2160)</option>
                        <option value="1080p">1080p (1920x1080)</option>
                        <option value="720p">720p (1280x720)</option>
                        <option value="480p">480p (854x480)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        FPS
                      </label>
                      <input
                        type="number"
                        value={formData.fps}
                        onChange={(e) => setFormData({...formData, fps: parseInt(e.target.value) || 30})}
                        min="1"
                        max="60"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Stream URL *
                    </label>
                    <input
                      type="text"
                      value={formData.streamUrl}
                      onChange={(e) => setFormData({...formData, streamUrl: e.target.value})}
                      placeholder={
                        formData.streamType === 'rtsp' 
                          ? 'rtsp://username:password@camera-ip:554/stream'
                          : formData.streamType === 'hls'
                          ? 'https://example.com/stream/playlist.m3u8'
                          : formData.streamType === 'webrtc'
                          ? 'wss://example.com/webrtc'
                          : 'http://camera-ip/mjpeg'
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.streamType === 'rtsp' && '⚠️ RTSP streams require MediaMTX for web playback conversion'}
                      {formData.streamType === 'hls' && '✅ HLS streams work directly in browsers'}
                      {formData.streamType === 'webrtc' && '⚠️ WebRTC requires compatible signaling server'}
                      {formData.streamType === 'http' && '✅ HTTP/MJPEG streams work directly in browsers'}
                    </p>
                  </div>

                  {/* Example URLs */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-300 mb-3">📝 Example Stream URLs:</h4>
                    <div className="space-y-2 text-xs text-gray-300">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 font-semibold min-w-[60px]">HLS:</span>
                        <code className="text-green-400 font-mono break-all">https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-violet-400 font-semibold min-w-[60px]">RTSP:</span>
                        <code className="text-violet-400 font-mono break-all">rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-400 font-semibold min-w-[60px]">HTTP:</span>
                        <code className="text-orange-400 font-mono break-all">http://camera-ip:8080/video.mjpeg</code>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
                    <button
                      onClick={() => {
                        setIsAddModalOpen(false);
                        resetForm();
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCamera}
                      disabled={!formData.name || !formData.streamUrl}
                      className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium ${
                        !formData.name || !formData.streamUrl ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      Add Camera
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Camera Modal */}
        {isEditModalOpen && selectedCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Edit Camera</h2>
                  <button
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedCamera(null);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Camera Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Stream URL *
                    </label>
                    <input
                      type="text"
                      value={formData.streamUrl}
                      onChange={(e) => setFormData({...formData, streamUrl: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setSelectedCamera(null);
                        resetForm();
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditCamera}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-6xl w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{previewCamera.name}</h2>
                    <p className="text-gray-400">{previewCamera.location}</p>
                  </div>
                  <button
                    onClick={() => setPreviewCamera(null)}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="bg-black rounded-lg overflow-hidden">
                  <CameraFeed 
                    streamUrl={previewCamera.streamUrl}
                    cameraId={previewCamera.id}
                    autoPlay={true}
                    enableDetection={true}
                    className="w-full"
                  />
                </div>

                <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-white">Stream URL:</span>
                    <code className="ml-2 text-blue-400 font-mono text-xs">{previewCamera.streamUrl}</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

