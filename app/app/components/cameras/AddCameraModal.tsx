/**
 * AddCameraModal - Form to add a new camera to a worksite
 * 
 * Responsibilities:
 * - Collect camera name + RTSP URL
 * - Call backend API
 * - Close on success
 * - Surface errors cleanly
 * 
 * Constraints:
 * - No optimistic UI
 * - No retries
 * - No Janus logic
 * - No side effects outside submit handler
 */

'use client';

import React, { useState, useCallback } from 'react';

export interface Camera {
  id: string;
  name: string;
  status: string;
  location: string | null;
  streamUrl: string | null;
  janusFeedId: number | null;
  metadata: {
    aiEnabled?: boolean;
    [key: string]: any;
  } | null;
}

export interface AddCameraModalProps {
  worksiteId: string;
  isOpen: boolean;
  onClose: () => void;
  onCameraAdded: (camera: Camera) => void;
}

/**
 * AddCameraModal component
 */
const AddCameraModal: React.FC<AddCameraModalProps> = ({
  worksiteId,
  isOpen,
  onClose,
  onCameraAdded
}) => {
  const [name, setName] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Validate RTSP URL format
   */
  const validateRtspUrl = useCallback((url: string): boolean => {
    if (!url.trim()) {
      return false;
    }
    const lowerUrl = url.toLowerCase().trim();
    return lowerUrl.startsWith('rtsp://');
  }, []);
  
  /**
   * Handle form submit
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!name.trim()) {
      setError('Camera name is required');
      return;
    }
    
    if (!validateRtspUrl(rtspUrl)) {
      setError('RTSP URL must start with rtsp://');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call API to create camera
      const response = await fetch(`/api/worksites/${worksiteId}/cameras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          rtspUrl: rtspUrl.trim()
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add camera');
      }
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from server');
      }
      
      // Format camera data to match Camera interface
      const cameraData: Camera = {
        id: data.data.id,
        name: data.data.name,
        status: data.data.status,
        location: null,
        streamUrl: data.data.streamUrl,
        janusFeedId: data.data.janusFeedId,
        metadata: {
          aiEnabled: data.data.aiEnabled ?? false
        }
      };
      
      // Call callback with new camera
      onCameraAdded(cameraData);
      
      // Reset form
      setName('');
      setRtspUrl('');
      setError(null);
      
      // Close modal
      onClose();
    } catch (err: any) {
      console.error('[AddCameraModal] Failed to add camera:', err);
      setError(err.message || 'Failed to add camera');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, rtspUrl, worksiteId, validateRtspUrl, onCameraAdded, onClose]);
  
  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return; // Prevent close while submitting
    }
    setName('');
    setRtspUrl('');
    setError(null);
    onClose();
  }, [isSubmitting, onClose]);
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Camera</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Camera Name */}
            <div>
              <label htmlFor="camera-name" className="block text-sm font-medium text-gray-700 mb-1">
                Camera Name
              </label>
              <input
                id="camera-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="e.g., Entrance Camera"
                required
              />
            </div>
            
            {/* RTSP URL */}
            <div>
              <label htmlFor="rtsp-url" className="block text-sm font-medium text-gray-700 mb-1">
                RTSP URL
              </label>
              <input
                id="rtsp-url"
                type="text"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
                placeholder="rtsp://username:password@ip:port/path"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: rtsp://username:password@ip:port/path
              </p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !rtspUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCameraModal;

