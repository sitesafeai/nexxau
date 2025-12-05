'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface CameraConnection {
  type: 'RTSP' | 'RTMP' | 'ONVIF' | 'MJPEG' | 'S3' | 'WebRTC' | 'PreSignedURL';
  rtspUrl: string;
  webrtcUrl: string;
  hlsUrl: string;
  snapshotUrl: string;
  username: string;
  password: string;
  profile: 'low' | 'medium' | 'high' | '720p' | '1080p' | '4k';
}

interface CameraMetadata {
  lat: number | null;
  lon: number | null;
  mountHeight: number | null;
  orientation: number | null;
  fov: number | null;
  tags: string[];
  model: string;
  notes: string;
  resolution: string;
  fps: number | null;
  codec: string;
}

interface Worksite {
  id: string;
  name: string;
}

interface Camera {
  id?: string;
  name: string;
  externalId: string;
  worksiteId: string;
  connection: CameraConnection;
  metadata: CameraMetadata;
  enabled: boolean;
  retentionDays: number;
  aiEnabled: boolean;
  confidenceThreshold: number;
}

interface TestConnectionResult {
  ok: boolean;
  snapshotUrl?: string;
  latencyMs?: number;
  codecs?: string[];
  resolution?: string;
  fps?: number;
  warnings?: string[];
  error?: string;
}

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (camera: Camera) => Promise<void>;
  worksites: Worksite[];
  defaultWorksiteId?: string;
  editCamera?: Camera | null; // If editing existing camera
}

const CONNECTION_TYPES = [
  { value: 'RTSP', label: 'RTSP', placeholder: 'rtsp://user:pass@192.168.1.50:554/stream1' },
  { value: 'RTMP', label: 'RTMP', placeholder: 'rtmp://server/live/stream' },
  { value: 'ONVIF', label: 'ONVIF', placeholder: 'http://192.168.1.50:80/onvif/device_service' },
  { value: 'MJPEG', label: 'MJPEG', placeholder: 'http://192.168.1.50/mjpg/video.mjpg' },
  { value: 'S3', label: 'S3 / Cloud Upload', placeholder: 's3://bucket/path/stream.m3u8' },
  { value: 'WebRTC', label: 'WebRTC', placeholder: 'wss://server/webrtc/stream' },
  { value: 'PreSignedURL', label: 'Pre-signed URL', placeholder: 'https://cdn.example.com/stream.m3u8' },
];

const STREAM_PROFILES = [
  { value: 'low', label: 'Low (480p)' },
  { value: 'medium', label: 'Medium (720p)' },
  { value: 'high', label: 'High (1080p)' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '4k', label: '4K' },
];

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const CAMERA_TAGS = [
  'entrance', 'exit', 'scaffold', 'crane', 'yard', 'gate', 
  'loading-dock', 'parking', 'perimeter', 'interior', 'roof',
  'hazard-zone', 'ppe-check', 'high-traffic'
];

const defaultConnection: CameraConnection = {
  type: 'RTSP',
  rtspUrl: '',
  webrtcUrl: '',
  hlsUrl: '',
  snapshotUrl: '',
  username: '',
  password: '',
  profile: 'medium',
};

const defaultMetadata: CameraMetadata = {
  lat: null,
  lon: null,
  mountHeight: null,
  orientation: null,
  fov: null,
  tags: [],
  model: '',
  notes: '',
  resolution: '',
  fps: null,
  codec: '',
};

export default function AddCameraModal({
  isOpen,
  onClose,
  onSave,
  worksites,
  defaultWorksiteId,
  editCamera,
}: AddCameraModalProps) {
  // Form state
  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [worksiteId, setWorksiteId] = useState(defaultWorksiteId || '');
  const [connection, setConnection] = useState<CameraConnection>(defaultConnection);
  const [metadata, setMetadata] = useState<CameraMetadata>(defaultMetadata);
  const [enabled, setEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  // UI state
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [acceptWithoutTest, setAcceptWithoutTest] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Tag input state
  const [tagInput, setTagInput] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (editCamera) {
      setName(editCamera.name);
      setExternalId(editCamera.externalId || '');
      setWorksiteId(editCamera.worksiteId);
      setConnection(editCamera.connection || defaultConnection);
      setMetadata(editCamera.metadata || defaultMetadata);
      setEnabled(editCamera.enabled);
      setRetentionDays(editCamera.retentionDays);
      setAiEnabled(editCamera.aiEnabled);
      setConfidenceThreshold(editCamera.confidenceThreshold);
    } else {
      resetForm();
    }
  }, [editCamera, isOpen]);

  // Set default worksite when modal opens
  useEffect(() => {
    if (isOpen && defaultWorksiteId && !editCamera) {
      setWorksiteId(defaultWorksiteId);
    }
  }, [isOpen, defaultWorksiteId, editCamera]);

  const resetForm = () => {
    setName('');
    setExternalId('');
    setWorksiteId(defaultWorksiteId || '');
    setConnection(defaultConnection);
    setMetadata(defaultMetadata);
    setEnabled(true);
    setRetentionDays(30);
    setAiEnabled(true);
    setConfidenceThreshold(0.7);
    setTestResult(null);
    setErrors({});
    setAcceptWithoutTest(false);
    setIsDirty(false);
    setTagInput('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Camera name is required';
    } else if (name.length < 3 || name.length > 120) {
      newErrors.name = 'Name must be 3-120 characters';
    } else if (!/^[a-zA-Z0-9\-_\s]+$/.test(name)) {
      newErrors.name = 'Only letters, numbers, hyphens, underscores, and spaces allowed';
    }

    // Worksite validation
    if (!worksiteId) {
      newErrors.worksiteId = 'Worksite is required';
    }

    // Stream URL validation
    const streamUrl = connection.rtspUrl || connection.hlsUrl;
    if (!streamUrl && connection.type !== 'S3') {
      newErrors.streamUrl = 'Stream URL is required';
    } else if (streamUrl) {
      try {
        new URL(streamUrl.replace('rtsp://', 'http://').replace('rtmp://', 'http://'));
      } catch {
        newErrors.streamUrl = 'Invalid URL format';
      }
    }

    // Location validation
    if (metadata.lat !== null && (metadata.lat < -90 || metadata.lat > 90)) {
      newErrors.lat = 'Latitude must be between -90 and 90';
    }
    if (metadata.lon !== null && (metadata.lon < -180 || metadata.lon > 180)) {
      newErrors.lon = 'Longitude must be between -180 and 180';
    }

    // Mount height validation
    if (metadata.mountHeight !== null && (metadata.mountHeight < 0.5 || metadata.mountHeight > 50)) {
      newErrors.mountHeight = 'Mount height must be between 0.5m and 50m';
    }

    // Orientation validation
    if (metadata.orientation !== null && (metadata.orientation < 0 || metadata.orientation > 360)) {
      newErrors.orientation = 'Orientation must be between 0 and 360 degrees';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!connection.rtspUrl && !connection.hlsUrl) {
      setErrors({ streamUrl: 'Enter a stream URL to test' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/cameras/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: connection.type,
          url: connection.rtspUrl || connection.hlsUrl,
          username: connection.username,
          password: connection.password,
        }),
      });

      const result = await response.json();
      setTestResult(result);

      // Auto-populate metadata from test result
      if (result.ok) {
        setMetadata(prev => ({
          ...prev,
          resolution: result.resolution || prev.resolution,
          fps: result.fps || prev.fps,
          codec: result.codecs?.[0] || prev.codec,
        }));
      }
    } catch (error) {
      setTestResult({
        ok: false,
        error: 'Failed to test connection. Check network connectivity.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (addAnother: boolean = false) => {
    if (!validateForm()) return;

    // Check if test passed or admin override
    if (!testResult?.ok && !acceptWithoutTest) {
      setErrors({ test: 'Test connection first, or check "Add without test"' });
      return;
    }

    setIsSaving(true);
    try {
      const camera: Camera = {
        id: editCamera?.id,
        name: name.trim(),
        externalId: externalId.trim(),
        worksiteId,
        connection,
        metadata,
        enabled,
        retentionDays,
        aiEnabled,
        confidenceThreshold,
      };

      await onSave(camera);

      if (addAnother) {
        resetForm();
      } else {
        onClose();
      }
    } catch (error: any) {
      setErrors({ save: error.message || 'Failed to save camera' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        resetForm();
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  const updateConnection = (field: keyof CameraConnection, value: any) => {
    setConnection(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const updateMetadata = (field: keyof CameraMetadata, value: any) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const addTag = (tag: string) => {
    if (tag && !metadata.tags.includes(tag)) {
      updateMetadata('tags', [...metadata.tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    updateMetadata('tags', metadata.tags.filter(t => t !== tag));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white">
              {editCamera ? 'Edit Camera' : 'Add Camera'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure camera connection and metadata
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column - Connection Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                Connection Details
              </h3>

              {/* Connection Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Connection Type
                </label>
                <select
                  value={connection.type}
                  onChange={e => updateConnection('type', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CONNECTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stream URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Stream URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={connection.rtspUrl}
                  onChange={e => {
                    updateConnection('rtspUrl', e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder={CONNECTION_TYPES.find(t => t.value === connection.type)?.placeholder}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.streamUrl ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                {errors.streamUrl && (
                  <p className="text-red-400 text-sm mt-1">{errors.streamUrl}</p>
                )}
              </div>

              {/* Credentials */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={connection.username}
                    onChange={e => updateConnection('username', e.target.value)}
                    placeholder="Camera username"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={connection.password}
                      onChange={e => updateConnection('password', e.target.value)}
                      placeholder="Camera password"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stream Profile */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Stream Profile
                </label>
                <select
                  value={connection.profile}
                  onChange={e => updateConnection('profile', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STREAM_PROFILES.map(profile => (
                    <option key={profile.value} value={profile.value}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Snapshot URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Snapshot Endpoint
                  <span className="text-slate-500 text-xs ml-2">(optional)</span>
                </label>
                <input
                  type="text"
                  value={connection.snapshotUrl}
                  onChange={e => updateConnection('snapshotUrl', e.target.value)}
                  placeholder="http://192.168.1.50/snapshot.jpg"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Test Connection */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Test Connection</span>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isTesting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Testing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Test Connection
                      </>
                    )}
                  </button>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className={`p-3 rounded-lg ${testResult.ok ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.ok ? (
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-sm font-medium ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                        {testResult.ok ? 'Connection Successful' : 'Connection Failed'}
                      </span>
                    </div>
                    
                    {testResult.ok && (
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                        <div>Latency: {testResult.latencyMs}ms</div>
                        <div>Resolution: {testResult.resolution}</div>
                        <div>FPS: {testResult.fps}</div>
                      </div>
                    )}
                    
                    {testResult.snapshotUrl && (
                      <div className="mt-3">
                        <img 
                          src={testResult.snapshotUrl} 
                          alt="Camera preview" 
                          className="w-full h-32 object-cover rounded-lg border border-slate-700"
                        />
                      </div>
                    )}
                    
                    {testResult.error && (
                      <p className="text-sm text-red-400 mt-1">{testResult.error}</p>
                    )}
                    
                    {testResult.warnings && testResult.warnings.length > 0 && (
                      <div className="mt-2">
                        {testResult.warnings.map((warning, i) => (
                          <p key={i} className="text-xs text-yellow-400">{warning}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Admin override */}
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptWithoutTest}
                    onChange={e => setAcceptWithoutTest(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-400">Add without testing (admin only)</span>
                </label>
              </div>
            </div>

            {/* Right Column - Metadata */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                Camera Details
              </h3>

              {/* Camera Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Camera Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Gate A Camera"
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* External ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  External ID
                  <span className="text-slate-500 text-xs ml-2">(third-party reference)</span>
                </label>
                <input
                  type="text"
                  value={externalId}
                  onChange={e => {
                    setExternalId(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="AXIS-12345"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Worksite */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Worksite <span className="text-red-400">*</span>
                </label>
                <select
                  value={worksiteId}
                  onChange={e => {
                    setWorksiteId(e.target.value);
                    setIsDirty(true);
                  }}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.worksiteId ? 'border-red-500' : 'border-slate-600'
                  }`}
                >
                  <option value="">Select worksite...</option>
                  {worksites.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
                {errors.worksiteId && (
                  <p className="text-red-400 text-sm mt-1">{errors.worksiteId}</p>
                )}
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={metadata.lat ?? ''}
                    onChange={e => updateMetadata('lat', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="40.7128"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={metadata.lon ?? ''}
                    onChange={e => updateMetadata('lon', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="-74.0060"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Mount & Orientation */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Mount Height (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="50"
                    value={metadata.mountHeight ?? ''}
                    onChange={e => updateMetadata('mountHeight', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="6.5"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Orientation (°)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={metadata.orientation ?? ''}
                    onChange={e => updateMetadata('orientation', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="210"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    FOV (°)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    value={metadata.fov ?? ''}
                    onChange={e => updateMetadata('fov', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="90"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Camera Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {metadata.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-lg"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-white"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={tagInput}
                    onChange={e => {
                      if (e.target.value) addTag(e.target.value);
                    }}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Add tag...</option>
                    {CAMERA_TAGS.filter(t => !metadata.tags.includes(t)).map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Model & Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Camera Model
                </label>
                <input
                  type="text"
                  value={metadata.model}
                  onChange={e => updateMetadata('model', e.target.value)}
                  placeholder="Axis P3245-V"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={metadata.notes}
                  onChange={e => updateMetadata('notes', e.target.value)}
                  placeholder="Any additional notes about this camera..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Settings */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-300">Camera Enabled</span>
                    <p className="text-xs text-slate-500">Camera will record and monitor when enabled</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEnabled(!enabled);
                      setIsDirty(true);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-300">AI Detection</span>
                    <p className="text-xs text-slate-500">Run AI safety detection on this camera</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAiEnabled(!aiEnabled);
                      setIsDirty(true);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      aiEnabled ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        aiEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Retention Policy
                  </label>
                  <select
                    value={retentionDays}
                    onChange={e => {
                      setRetentionDays(parseInt(e.target.value));
                      setIsDirty(true);
                    }}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {RETENTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {(errors.test || errors.save) && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.test || errors.save}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save & Add Another
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save & Close'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

