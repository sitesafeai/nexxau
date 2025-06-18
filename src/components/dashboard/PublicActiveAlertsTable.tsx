import { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import Hls from 'hls.js';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED';
  source: string;
  location?: string;
  createdAt: string;
  site?: {
    name: string;
    id: string;
  };
  videoUrl?: string;
  metadata?: {
    cameraId?: string;
    coordinates?: { x: number; y: number };
    equipmentId?: string;
    speed?: number;
    distance?: number;
    detectionType?: 'speed' | 'proximity' | 'ppe' | 'unauthorized_access';
    confidence?: number;
    [key: string]: any;
  };
}

// Mock data for demonstration
const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'High Speed Alert',
    description: 'Vehicle exceeding speed limit in Zone A',
    severity: 'HIGH',
    status: 'ACTIVE',
    source: 'Speed Sensor',
    location: 'Zone A',
    createdAt: new Date().toISOString(),
    site: { 
      name: 'Main Warehouse',
      id: 'site-001'
    },
    videoUrl: 'https://stream.example.com/site-001/camera-001/stream.m3u8',
    metadata: {
      cameraId: 'CAM-001',
      coordinates: { x: 45.2, y: 12.3 },
      equipmentId: 'FORK-123',
      speed: 25,
      speedLimit: 15,
      detectionType: 'speed',
      confidence: 0.95
    }
  },
  {
    id: '2',
    title: 'Proximity Warning',
    description: 'Forklift too close to pedestrian',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    source: 'Proximity Sensor',
    location: 'Loading Dock',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    site: { name: 'Loading Area', id: 'site-002' },
    videoUrl: 'https://example.com/stream2',
    metadata: {
      cameraId: 'CAM-002',
      coordinates: { x: 32.1, y: 45.6 },
      equipmentId: 'FORK-456',
      distance: 1.2,
      safeDistance: 3.0
    }
  },
  {
    id: '3',
    title: 'Equipment Maintenance',
    description: 'Forklift #123 due for maintenance',
    severity: 'MEDIUM',
    status: 'ACTIVE',
    source: 'Maintenance System',
    location: 'Equipment Bay',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    site: { name: 'Main Warehouse', id: 'site-001' },
    videoUrl: 'https://example.com/stream3',
    metadata: {
      cameraId: 'CAM-003',
      equipmentId: 'FORK-123',
      lastMaintenance: '2024-01-15',
      nextMaintenance: '2024-03-15'
    }
  }
];

export default function PublicActiveAlertsTable() {
  const [alerts] = useState<Alert[]>(mockAlerts);
  const [search, setSearch] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Function to initialize HLS video stream
  const initializeVideoStream = (videoElement: HTMLVideoElement, streamUrl: string) => {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch(error => {
          console.error('Error playing video:', error);
          setVideoError('Failed to play video stream');
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS error:', data);
          setVideoError('Video stream error');
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari
      videoElement.src = streamUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        videoElement.play().catch(error => {
          console.error('Error playing video:', error);
          setVideoError('Failed to play video stream');
        });
      });
    }
  };

  // Effect to handle video stream when alert is selected
  useEffect(() => {
    if (selectedAlert?.videoUrl) {
      const videoElement = document.getElementById('alert-video') as HTMLVideoElement;
      if (videoElement) {
        const cleanup = initializeVideoStream(videoElement, selectedAlert.videoUrl);
        return cleanup;
      }
    }
  }, [selectedAlert]);

  const filteredAlerts = alerts.filter(alert => 
    alert.title.toLowerCase().includes(search.toLowerCase()) ||
    alert.description.toLowerCase().includes(search.toLowerCase()) ||
    alert.source.toLowerCase().includes(search.toLowerCase()) ||
    alert.site?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'MEDIUM':
      case 'LOW':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Active Alerts</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all active alerts in your sites.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
          />
        </div>
      </div>
      <div className="mt-8">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Alert
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Severity
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Site
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAlerts.map((alert) => (
                <tr 
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="font-medium text-gray-900">{alert.title}</div>
                    <div className="text-gray-500 text-xs mt-1">{alert.description}</div>
                  </td>
                  <td className="px-3 py-4 text-sm">
                    <div className="flex items-center">
                      {getSeverityIcon(alert.severity)}
                      <span className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {alert.status}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {alert.site?.name || 'N/A'}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{selectedAlert.title}</h3>
                <button
                  onClick={() => {
                    setSelectedAlert(null);
                    setVideoError(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
                    {selectedAlert.videoUrl ? (
                      <>
                        <video
                          id="alert-video"
                          className="w-full h-full object-cover"
                          controls
                          autoPlay
                          muted
                        />
                        {videoError && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 text-white">
                            {videoError}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No video feed available
                      </div>
                    )}
                  </div>
                  {selectedAlert.metadata?.detectionType && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900">AI Detection Details</h4>
                      <dl className="mt-2 space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Detection Type</dt>
                          <dd className="text-sm text-gray-900">{selectedAlert.metadata.detectionType}</dd>
                        </div>
                        {selectedAlert.metadata.confidence && (
                          <div>
                            <dt className="text-xs text-gray-500">Confidence</dt>
                            <dd className="text-sm text-gray-900">
                              {(selectedAlert.metadata.confidence * 100).toFixed(1)}%
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
                <div>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedAlert.description}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Severity</dt>
                      <dd className="mt-1">
                        <div className="flex items-center">
                          {getSeverityIcon(selectedAlert.severity)}
                          <span className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getSeverityColor(selectedAlert.severity)}`}>
                            {selectedAlert.severity}
                          </span>
                        </div>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedAlert.status}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Site</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedAlert.site?.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedAlert.location}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Source</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedAlert.source}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(selectedAlert.createdAt).toLocaleString()}
                      </dd>
                    </div>
                    {selectedAlert.metadata && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Additional Details</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <ul className="list-disc pl-5 space-y-1">
                            {Object.entries(selectedAlert.metadata).map(([key, value]) => (
                              <li key={key}>
                                <span className="font-medium">{key}:</span> {value.toString()}
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => setSelectedAlert(null)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 