/**
 * PHASE 5: Camera List Component
 * 
 * This component displays a list of cameras and their status.
 * It reads state from the camera store and calls services to mutate state.
 * 
 * Constraints:
 * - Reads state (via useCameraStore hook)
 * - Calls services to mutate state (testCamera, etc.)
 * - No direct state mutation
 * - No business logic
 */

'use client';

import { useCameras } from '@/app/hooks/useCameraStore';
import { testCamera, monitorCameraStatus, removeCamera } from '@/app/lib/camera/camera-service';
import { Camera } from '@/app/lib/camera/types';
import { useEffect, useState } from 'react';
import { cameraStore } from '@/app/lib/camera/camera-store';

interface CameraListProps {
  onSelectCamera?: (cameraId: string) => void;
  selectedCameraId?: string | null;
}

export default function CameraList({ onSelectCamera, selectedCameraId }: CameraListProps) {
  const cameras = useCameras();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to store for loading and error state
  useEffect(() => {
    const unsubscribe = cameraStore.subscribe(() => {
      const state = cameraStore.getState();
      setIsLoading(state.isLoading);
      setError(state.error);
    });
    return unsubscribe;
  }, []);
  const [monitoringCameras, setMonitoringCameras] = useState<Map<string, () => void>>(new Map());

  // Start monitoring for all cameras
  useEffect(() => {
    const stopFunctions = new Map<string, () => void>();

    cameras.forEach((camera) => {
      // Only monitor live cameras
      if (camera.status === 'live' || camera.status === 'connecting') {
        const stop = monitorCameraStatus(camera.id, 30000); // Check every 30 seconds
        stopFunctions.set(camera.id, stop);
      }
    });

    setMonitoringCameras(stopFunctions);

    // Cleanup: stop monitoring when component unmounts or cameras change
    return () => {
      stopFunctions.forEach((stop) => stop());
    };
  }, [cameras.map((c) => c.id).join(',')]); // Re-run when camera IDs change

  const handleTestCamera = async (camera: Camera) => {
    await testCamera(camera);
  };

  const getStatusColor = (status: CameraStatus) => {
    switch (status) {
      case 'live':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'connecting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'offline':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: CameraStatus) => {
    switch (status) {
      case 'live':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'connecting':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (cameras.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-12 text-center">
        <svg
          className="w-16 h-16 text-slate-600 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-xl font-semibold text-white mb-2">No Cameras</h3>
        <p className="text-slate-400">Add cameras to start monitoring</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((camera) => (
          <div
            key={camera.id}
            className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{camera.name}</h3>
                <p className="text-xs text-slate-400 font-mono truncate">{camera.streamUrl}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  camera.status
                )}`}
              >
                {getStatusIcon(camera.status)}
                {camera.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <span className="px-2 py-0.5 bg-slate-700/50 rounded">{camera.protocol.toUpperCase()}</span>
            </div>

            <div className="flex gap-2">
              {onSelectCamera && (
                <button
                  onClick={() => onSelectCamera(camera.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCameraId === camera.id
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {selectedCameraId === camera.id ? 'Viewing' : 'View Stream'}
                </button>
              )}
              <button
                onClick={() => handleTestCamera(camera)}
                disabled={isLoading}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isLoading ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={() => removeCamera(camera.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                title="Remove camera"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

