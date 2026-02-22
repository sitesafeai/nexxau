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

import React, { useState, useCallback, useEffect } from 'react';

export interface Camera {
  id: string;
  name: string;
  status: string;
  location: string | null;
  streamUrl: string | null;
  janusFeedId: number | null;
  metadata: {
    aiEnabled?: boolean;
    overlayEnabled?: boolean;
    [key: string]: any;
  } | null;
}

interface WorksiteOption {
  id: string;
  name: string;
  companyName?: string | null;
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
type SourceType = 'janus_stream' | 'rtsp';

interface JanusStreamOption {
  id: number;
  name?: string;
  description?: string;
  type?: string;
}

const AddCameraModal: React.FC<AddCameraModalProps> = ({
  worksiteId,
  isOpen,
  onClose,
  onCameraAdded
}) => {
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('janus_stream');
  const [selectedJanusStreamId, setSelectedJanusStreamId] = useState<string>('');
  const [janusStreams, setJanusStreams] = useState<JanusStreamOption[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [rtspUrl, setRtspUrl] = useState('');
  const [zone, setZone] = useState('');
  const [enableAi, setEnableAi] = useState(true);
  const [selectedWorksiteId, setSelectedWorksiteId] = useState(worksiteId);
  const [worksites, setWorksites] = useState<WorksiteOption[]>([]);
  const [isLoadingWorksites, setIsLoadingWorksites] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  
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
    setInfo(null);
    
    if (!name.trim()) {
      setError('Camera name is required');
      return;
    }

    if (sourceType === 'janus_stream') {
      if (!selectedJanusStreamId || selectedJanusStreamId === '') {
        setError('Please choose a stream from the dropdown');
        return;
      }
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/worksites/${selectedWorksiteId}/cameras`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            janusFeedId: Number(selectedJanusStreamId),
            location: zone.trim() || null,
            enableAi,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.details ? `${data.error || 'Failed'}: ${data.details}` : data.error || 'Failed to add camera');
        }
        if (!data.success || !data.data) {
          throw new Error('Invalid response from server');
        }
        const cameraData: Camera = {
          id: data.data.id,
          name: data.data.name,
          status: data.data.status,
          location: zone.trim() || null,
          streamUrl: data.data.streamUrl,
          janusFeedId: data.data.janusFeedId,
          metadata: {
            aiEnabled: data.data.aiEnabled ?? enableAi,
            overlayEnabled: data.data.overlayEnabled ?? enableAi,
          },
        };
        if (selectedWorksiteId === worksiteId) {
          onCameraAdded(cameraData);
        } else {
          setInfo('Camera connected. Switch worksites to view it.');
        }
        setName('');
        setSelectedJanusStreamId('');
        setZone('');
        setError(null);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to add camera');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    if (!validateRtspUrl(rtspUrl)) {
      setError('RTSP URL must start with rtsp://');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const validationResponse = await fetch('/api/cameras/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rtspUrl: rtspUrl.trim() })
      });

      const validationData = await validationResponse.json().catch(() => ({}));
      if (!validationResponse.ok) {
        const message =
          validationData?.message ||
          (validationData?.error === 'auth_failed' 
            ? 'RTSP authentication failed. Please check your username and password in the RTSP URL.'
            : validationData?.error === 'timeout'
            ? 'RTSP stream connection timed out. Please check that the camera is online.'
            : validationData?.error === 'dns_failed'
            ? 'Cannot resolve hostname. Please check that the IP address or hostname is correct and replace placeholder IPs (like 192.168.X.X) with actual camera addresses.'
            : validationData?.error === 'invalid_data'
            ? 'Invalid stream data. The RTSP stream may be corrupted or use an unsupported codec. Please verify the stream URL and ensure the camera supports H.264.'
            : validationData?.error === 'unreachable'
            ? 'Cannot reach RTSP stream. Please check the URL and network connection.'
            : validationData?.details ||
            validationData?.error ||
            'RTSP validation failed');
        throw new Error(message);
      }

      const response = await fetch(`/api/worksites/${selectedWorksiteId}/cameras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          rtspUrl: rtspUrl.trim(),
          location: zone.trim() || null,
          enableAi
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Show detailed error message if available
        const errorMessage = data.details 
          ? `${data.error || 'Failed to add camera'}: ${data.details}`
          : data.error || 'Failed to add camera';
        console.error('[AddCameraModal] Camera creation failed:', {
          status: response.status,
          error: data.error,
          details: data.details,
          fullResponse: data
        });
        throw new Error(errorMessage);
      }
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from server');
      }
      
      // Format camera data to match Camera interface
      const cameraData: Camera = {
        id: data.data.id,
        name: data.data.name,
        status: data.data.status,
        location: zone.trim() || null,
        streamUrl: data.data.streamUrl,
        janusFeedId: data.data.janusFeedId,
        metadata: {
          aiEnabled: data.data.aiEnabled ?? enableAi,
          overlayEnabled: data.data.overlayEnabled ?? enableAi
        }
      };
      
      // Call callback with new camera
      if (selectedWorksiteId === worksiteId) {
        onCameraAdded(cameraData);
      } else {
        setInfo('Camera connected. Switch worksites to view it.');
      }
      
      // Reset form
      setName('');
      setRtspUrl('');
      setZone('');
      setEnableAi(true);
      setError(null);
      
      // Close modal
      onClose();
    } catch (err: any) {
      console.error('[AddCameraModal] Failed to add camera:', err);
      setError(err.message || 'Failed to add camera');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name,
    sourceType,
    selectedJanusStreamId,
    rtspUrl,
    zone,
    enableAi,
    worksiteId,
    selectedWorksiteId,
    validateRtspUrl,
    onCameraAdded,
    onClose
  ]);
  
  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setName('');
    setSourceType('janus_stream');
    setSelectedJanusStreamId('');
    setRtspUrl('');
    setZone('');
    setEnableAi(true);
    setError(null);
    setInfo(null);
    onClose();
  }, [isSubmitting, onClose]);
  
  // Fetch Janus streams for dropdown when modal opens
  useEffect(() => {
    if (!isOpen || sourceType !== 'janus_stream') return;
    setIsLoadingStreams(true);
    fetch('/api/janus/streams')
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setJanusStreams(result.data);
          if (result.data.length > 0 && !selectedJanusStreamId) {
            setSelectedJanusStreamId(String(result.data[0].id));
          }
        } else {
          setJanusStreams([]);
        }
      })
      .catch(() => setJanusStreams([]))
      .finally(() => setIsLoadingStreams(false));
  }, [isOpen, sourceType]);
  
  useEffect(() => {
    if (!isOpen) return;
    setSelectedWorksiteId(worksiteId);
    const fetchWorksites = async () => {
      setIsLoadingWorksites(true);
      try {
        const response = await fetch('/api/worksites');
        const data = await response.json();
        if (response.ok && data?.success) {
          const options = (data.data || []).map((site: any) => ({
            id: site.id,
            name: site.name,
            companyName: site.company?.name || null,
          }));
          setWorksites(options);
        } else {
          setWorksites([]);
        }
      } catch {
        setWorksites([]);
      } finally {
        setIsLoadingWorksites(false);
      }
    };
    fetchWorksites();
  }, [isOpen, worksiteId]);

  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Connect Camera</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Worksite */}
            <div>
              <label htmlFor="camera-worksite" className="block text-sm font-medium text-slate-300 mb-1">
                Worksite
              </label>
              <select
                id="camera-worksite"
                value={selectedWorksiteId}
                onChange={(e) => setSelectedWorksiteId(e.target.value)}
                disabled={isSubmitting || isLoadingWorksites}
                className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                {worksites.length === 0 && (
                  <option value={worksiteId}>Loading worksites...</option>
                )}
                {worksites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.companyName ? `${site.companyName} — ${site.name}` : site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Camera Name */}
            <div>
              <label htmlFor="camera-name" className="block text-sm font-medium text-slate-300 mb-1">
                Camera Name
              </label>
              <input
                id="camera-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                placeholder="e.g., Entrance Camera"
                required
              />
            </div>

            {/* Source: Choose from list first, or paste RTSP URL */}
            <div>
              <label htmlFor="source-type" className="block text-sm font-medium text-slate-300 mb-1">
                Source
              </label>
              <select
                id="source-type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                <option value="janus_stream">Choose from Janus stream list</option>
                <option value="rtsp">Paste RTSP URL</option>
              </select>
            </div>

            {sourceType === 'janus_stream' && (
              <div>
                <label htmlFor="janus-stream" className="block text-sm font-medium text-slate-300 mb-1">
                  Janus Stream
                </label>
                <select
                  id="janus-stream"
                  value={selectedJanusStreamId}
                  onChange={(e) => setSelectedJanusStreamId(e.target.value)}
                  disabled={isSubmitting || isLoadingStreams}
                  className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingStreams
                      ? 'Loading streams...'
                      : janusStreams.length === 0
                        ? 'No streams — is Janus running?'
                        : 'Select a stream'}
                  </option>
                  {janusStreams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ?? s.description ?? `Stream ${s.id}`} (ID: {s.id})
                    </option>
                  ))}
                </select>
                {janusStreams.length === 0 && !isLoadingStreams && (
                  <p className="mt-1 text-xs text-amber-400">
                    Start Janus (e.g. Docker) and add streams in config, or use &quot;Paste RTSP URL&quot; below.
                  </p>
                )}
              </div>
            )}

            {sourceType === 'rtsp' && (
              <div>
                <label htmlFor="rtsp-url" className="block text-sm font-medium text-slate-300 mb-1">
                  RTSP URL
                </label>
                <input
                  id="rtsp-url"
                  type="text"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 font-mono text-sm"
                  placeholder="rtsp://username:password@ip:port/path"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Format: rtsp://username:password@ip:port/path
                </p>
              </div>
            )}

            {/* Zone (optional) */}
            <div>
              <label htmlFor="camera-zone" className="block text-sm font-medium text-slate-300 mb-1">
                Zone (optional)
              </label>
              <input
                id="camera-zone"
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                placeholder="e.g., North Gate"
              />
            </div>

            {/* Enable AI */}
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={enableAi}
                onChange={(e) => setEnableAi(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              Enable AI (recommended)
            </label>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
            {info && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
                <p className="text-sm text-blue-300">{info}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-300 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !name.trim() ||
                (sourceType === 'janus_stream' ? !selectedJanusStreamId : !rtspUrl.trim())
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Connecting...' : sourceType === 'janus_stream' ? 'Add Camera' : 'Connect Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCameraModal;

