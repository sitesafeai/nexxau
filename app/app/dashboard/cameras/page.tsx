'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CameraFeed from '../../components/CameraFeed';

export default function CamerasPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCamera, setSelectedCamera] = useState<any>(null);
  const [showAddCamera, setShowAddCamera] = useState(false);

  const cameras = [
    {
      id: '1',
      name: 'Main Construction Site Camera',
      location: 'Main Entrance',
      status: 'online',
      lastSeen: '2 minutes ago',
      alerts: 0,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: true,
      resolution: '1080p',
      fps: 30,
      uptime: '99.8%',
      temperature: '42°C',
      ipAddress: '192.168.1.101',
      model: 'Hikvision DS-2CD2347G2-LU'
    },
    {
      id: '2',
      name: 'Safety Zone A Camera',
      location: 'Safety Zone A',
      status: 'online',
      lastSeen: '1 minute ago',
      alerts: 2,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false,
      resolution: '4K',
      fps: 25,
      uptime: '98.5%',
      temperature: '45°C',
      ipAddress: '192.168.1.102',
      model: 'Dahua IPC-HFW4431R-Z'
    },
    {
      id: '3',
      name: 'Loading Dock Camera',
      location: 'Loading Dock',
      status: 'offline',
      lastSeen: '5 minutes ago',
      alerts: 0,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false,
      resolution: '720p',
      fps: 15,
      uptime: '85.2%',
      temperature: 'N/A',
      ipAddress: '192.168.1.103',
      model: 'Axis M3045-V'
    },
    {
      id: '4',
      name: 'Warehouse B Camera',
      location: 'Warehouse B',
      status: 'online',
      lastSeen: '30 seconds ago',
      alerts: 1,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false,
      resolution: '1080p',
      fps: 30,
      uptime: '99.1%',
      temperature: '41°C',
      ipAddress: '192.168.1.104',
      model: 'Hikvision DS-2CD2347G2-LU'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-900 text-green-300';
      case 'offline': return 'bg-red-900 text-red-300';
      case 'maintenance': return 'bg-yellow-900 text-yellow-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const handleCameraSelect = (camera: any) => {
    setSelectedCamera(camera);
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
          </div>
          <button
            onClick={() => setShowAddCamera(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Add Camera
          </button>
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
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(camera.status)}`}>
                          {camera.status}
                        </div>
                      </div>
                      <div className="text-sm opacity-80">
                        <div>{camera.location}</div>
                        <div>Last seen: {camera.lastSeen}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Camera Details */}
            <div className="lg:col-span-2">
              {selectedCamera ? (
                <div className="space-y-6">
                  {/* Camera Feed */}
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4">{selectedCamera.name}</h2>
                    <CameraFeed
                      title={selectedCamera.name}
                      streamUrl={selectedCamera.streamUrl}
                      fallbackVideo="/demo-third-aprty-sitesafe.mov"
                      showControls={true}
                      autoPlay={true}
                    />
                  </div>

                  {/* Camera Stats */}
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Camera Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{selectedCamera.resolution}</div>
                        <div className="text-sm text-gray-400">Resolution</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{selectedCamera.fps}</div>
                        <div className="text-sm text-gray-400">FPS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{selectedCamera.uptime}</div>
                        <div className="text-sm text-gray-400">Uptime</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{selectedCamera.temperature}</div>
                        <div className="text-sm text-gray-400">Temperature</div>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Camera Name</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter camera name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">IP Address</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter location"
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
                    onClick={() => {
                      console.log('Adding new camera');
                      setShowAddCamera(false);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Camera
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 