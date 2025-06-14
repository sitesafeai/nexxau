'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface WorksiteFormProps {
  clientId: string;
  clientName: string;
}

type CameraSystemType = 'MILESTONE' | 'CLOUD' | 'RTSP' | 'ONVIF';

export default function WorksiteForm({ clientId, clientName }: WorksiteFormProps) {
  const router = useRouter();
  const [cameraSystemType, setCameraSystemType] = useState<CameraSystemType | ''>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const response = await fetch('/api/worksites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          name: formData.get('name'),
          address: formData.get('address'),
          cameraSystemType,
          config: getCameraConfig(formData),
        }),
      });

      if (response.ok) {
        router.push(`/onboarding/workers/${clientId}`);
      }
    } catch (error) {
      console.error('Error creating worksite:', error);
    }
  };

  const getCameraConfig = (formData: FormData) => {
    switch (cameraSystemType) {
      case 'MILESTONE':
        return {
          server: formData.get('milestone_server'),
          port: formData.get('milestone_port'),
          apiKey: formData.get('milestone_api_key'),
        };
      case 'CLOUD':
        return {
          provider: formData.get('cloud_provider'),
          apiUrl: formData.get('cloud_api_url'),
          apiKey: formData.get('cloud_api_key'),
        };
      case 'RTSP':
        return {
          name: formData.get('camera_name'),
          rtspUrl: formData.get('rtsp_url'),
        };
      case 'ONVIF':
        return {
          name: formData.get('camera_name'),
          ip: formData.get('ip_address'),
          port: formData.get('port'),
          username: formData.get('username'),
          password: formData.get('password'),
        };
      default:
        return {};
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/test-camera-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: cameraSystemType,
          config: getCameraConfig(new FormData(document.querySelector('form') as HTMLFormElement)),
        }),
      });

      const data = await response.json();
      setConnectionStatus({
        type: data.success ? 'success' : 'error',
        message: data.success ? 'Connection successful!' : data.error,
      });
    } catch (error) {
      setConnectionStatus({
        type: 'error',
        message: 'Failed to test connection',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Add Worksite for {clientName}</h2>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
          {['Worksite Details', 'Camera Setup', 'Workers'].map((step, index) => (
            <div key={step} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}>
                {index + 1}
              </div>
              <span className="mt-2 text-sm">{step}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Worksite Information */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Worksite Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                name="address"
                id="address"
                rows={3}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="cameraSystemType" className="block text-sm font-medium text-gray-700">
                Camera System Type
              </label>
              <select
                id="cameraSystemType"
                name="cameraSystemType"
                value={cameraSystemType}
                onChange={(e) => setCameraSystemType(e.target.value as CameraSystemType)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a system type</option>
                <option value="MILESTONE">Milestone XProtect</option>
                <option value="CLOUD">Cloud-based System</option>
                <option value="RTSP">Direct RTSP</option>
                <option value="ONVIF">ONVIF Protocol</option>
              </select>
            </div>
          </div>

          {/* Dynamic Camera Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {cameraSystemType === 'MILESTONE' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Milestone XProtect Configuration</h3>
                <div>
                  <label htmlFor="milestone_server" className="block text-sm font-medium text-gray-700">
                    Server Address
                  </label>
                  <input
                    type="text"
                    name="milestone_server"
                    id="milestone_server"
                    placeholder="e.g., 192.168.1.100"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="milestone_port" className="block text-sm font-medium text-gray-700">
                    Port
                  </label>
                  <input
                    type="number"
                    name="milestone_port"
                    id="milestone_port"
                    placeholder="e.g., 8080"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="milestone_api_key" className="block text-sm font-medium text-gray-700">
                    API Key
                  </label>
                  <input
                    type="text"
                    name="milestone_api_key"
                    id="milestone_api_key"
                    placeholder="Enter your Milestone API key"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {cameraSystemType === 'CLOUD' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Cloud Camera Configuration</h3>
                <div>
                  <label htmlFor="cloud_provider" className="block text-sm font-medium text-gray-700">
                    Cloud Provider
                  </label>
                  <select
                    name="cloud_provider"
                    id="cloud_provider"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Provider</option>
                    <option value="aws">AWS</option>
                    <option value="azure">Azure</option>
                    <option value="gcp">Google Cloud</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="cloud_api_url" className="block text-sm font-medium text-gray-700">
                    API Endpoint
                  </label>
                  <input
                    type="url"
                    name="cloud_api_url"
                    id="cloud_api_url"
                    placeholder="https://api.example.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="cloud_api_key" className="block text-sm font-medium text-gray-700">
                    API Key
                  </label>
                  <input
                    type="text"
                    name="cloud_api_key"
                    id="cloud_api_key"
                    placeholder="Enter your API key"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {cameraSystemType === 'RTSP' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">RTSP Camera Configuration</h3>
                <div>
                  <label htmlFor="camera_name" className="block text-sm font-medium text-gray-700">
                    Camera Name
                  </label>
                  <input
                    type="text"
                    name="camera_name"
                    id="camera_name"
                    placeholder="e.g., Front Entrance"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="rtsp_url" className="block text-sm font-medium text-gray-700">
                    RTSP URL
                  </label>
                  <input
                    type="url"
                    name="rtsp_url"
                    id="rtsp_url"
                    placeholder="rtsp://username:password@ip:port/stream"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {cameraSystemType === 'ONVIF' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">ONVIF Camera Configuration</h3>
                <div>
                  <label htmlFor="camera_name" className="block text-sm font-medium text-gray-700">
                    Camera Name
                  </label>
                  <input
                    type="text"
                    name="camera_name"
                    id="camera_name"
                    placeholder="e.g., Back Entrance"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700">
                    IP Address
                  </label>
                  <input
                    type="text"
                    name="ip_address"
                    id="ip_address"
                    placeholder="e.g., 192.168.1.100"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                    Port
                  </label>
                  <input
                    type="number"
                    name="port"
                    id="port"
                    placeholder="e.g., 80"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    id="username"
                    placeholder="Enter username"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    placeholder="Enter password"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Connection Test Button */}
          {cameraSystemType && (
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={testConnection}
                disabled={isTestingConnection}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isTestingConnection ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing Connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
              {connectionStatus.type && (
                <span className={`text-sm ${
                  connectionStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {connectionStatus.message}
                </span>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue to Worker Setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 