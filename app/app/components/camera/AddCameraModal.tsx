'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

// Types
export type CameraType = 'IP Camera (RTSP)' | 'ONVIF Camera' | 'Cloud Stream';

export interface AddCameraFormData {
  name: string;
  type: CameraType;
  streamUrl: string;
  username?: string;
  password?: string;
  frameRate?: number;
  resolution?: string;
}

export interface FormErrors {
  name?: string;
  type?: string;
  streamUrl?: string;
  username?: string;
  password?: string;
  frameRate?: string;
  resolution?: string;
  submit?: string;
}

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  worksiteId: string;
  worksiteName: string;
  onSuccess: () => void;
}

// Constants
const CAMERA_TYPES: CameraType[] = ['IP Camera (RTSP)', 'ONVIF Camera', 'Cloud Stream'];
const DEFAULT_FRAME_RATE = 30;
const DEFAULT_RESOLUTION = 'auto';

/**
 * Add Camera Modal Component
 * 
 * A robust modal for adding cameras with comprehensive validation,
 * error handling, and user feedback.
 */
export default function AddCameraModal({
  isOpen,
  onClose,
  worksiteId,
  worksiteName,
  onSuccess
}: AddCameraModalProps) {
  // Form state
  const [formData, setFormData] = useState<AddCameraFormData>({
    name: '',
    type: 'IP Camera (RTSP)',
    streamUrl: '',
    username: '',
    password: '',
    frameRate: DEFAULT_FRAME_RATE,
    resolution: DEFAULT_RESOLUTION
  });

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form state
      setFormData({
        name: '',
        type: 'IP Camera (RTSP)',
        streamUrl: '',
        username: '',
        password: '',
        frameRate: DEFAULT_FRAME_RATE,
        resolution: DEFAULT_RESOLUTION
      });
      setErrors({});
      setShowAdvanced(false);
      setIsSubmitting(false);
      
      // Focus first input after a brief delay (allows modal to render)
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  /**
   * Validate form field
   */
  const validateField = useCallback((name: keyof AddCameraFormData, value: any): string | undefined => {
    switch (name) {
      case 'name':
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'Camera name is required';
        }
        if (value.trim().length < 2) {
          return 'Camera name must be at least 2 characters';
        }
        if (value.trim().length > 100) {
          return 'Camera name must be less than 100 characters';
        }
        return undefined;

      case 'type':
        if (!value || !CAMERA_TYPES.includes(value)) {
          return 'Valid camera type is required';
        }
        return undefined;

      case 'streamUrl':
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'Stream URL is required';
        }
        const trimmedUrl = value.trim();
        if (formData.type === 'IP Camera (RTSP)' || formData.type === 'ONVIF Camera') {
          if (!trimmedUrl.startsWith('rtsp://')) {
            return 'RTSP URL must start with rtsp://';
          }
          // Basic RTSP URL format validation
          if (!/^rtsp:\/\/[^\s]+$/.test(trimmedUrl)) {
            return 'Invalid RTSP URL format';
          }
        }
        return undefined;

      case 'username':
        // Optional field, but if provided, should not be empty
        if (value && typeof value === 'string' && value.trim().length === 0) {
          return 'Username cannot be empty if provided';
        }
        return undefined;

      case 'password':
        // Optional field, but if provided, should not be empty
        if (value && typeof value === 'string' && value.trim().length === 0) {
          return 'Password cannot be empty if provided';
        }
        return undefined;

      case 'frameRate':
        if (value !== undefined && value !== null && value !== '') {
          const num = Number(value);
          if (isNaN(num) || num < 1 || num > 60) {
            return 'Frame rate must be between 1 and 60';
          }
        }
        return undefined;

      case 'resolution':
        // Optional field, no validation needed
        return undefined;

      default:
        return undefined;
    }
  }, [formData.type]);

  /**
   * Validate entire form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate required fields
    const nameError = validateField('name', formData.name);
    if (nameError) newErrors.name = nameError;

    const typeError = validateField('type', formData.type);
    if (typeError) newErrors.type = typeError;

    const streamUrlError = validateField('streamUrl', formData.streamUrl);
    if (streamUrlError) newErrors.streamUrl = streamUrlError;

    // Validate optional fields if provided
    if (formData.username) {
      const usernameError = validateField('username', formData.username);
      if (usernameError) newErrors.username = usernameError;
    }

    if (formData.password) {
      const passwordError = validateField('password', formData.password);
      if (passwordError) newErrors.password = passwordError;
    }

    if (formData.frameRate !== undefined && formData.frameRate !== null) {
      const frameRateError = validateField('frameRate', formData.frameRate);
      if (frameRateError) newErrors.frameRate = frameRateError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  /**
   * Check if form is valid (for submit button state)
   */
  const isFormValid = useCallback((): boolean => {
    if (!formData.name?.trim()) return false;
    if (!formData.type || !CAMERA_TYPES.includes(formData.type)) return false;
    if (!formData.streamUrl?.trim()) return false;
    
    // Validate RTSP URL format if required
    if ((formData.type === 'IP Camera (RTSP)' || formData.type === 'ONVIF Camera')) {
      if (!formData.streamUrl.trim().startsWith('rtsp://')) return false;
    }

    // Validate optional fields if provided
    if (formData.username && formData.username.trim().length === 0) return false;
    if (formData.password && formData.password.trim().length === 0) return false;
    if (formData.frameRate !== undefined && (isNaN(Number(formData.frameRate)) || Number(formData.frameRate) < 1 || Number(formData.frameRate) > 60)) {
      return false;
    }

    return true;
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare payload
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        streamUrl: formData.streamUrl.trim(),
        worksiteId
      };

      // Add optional fields if provided
      if (formData.username?.trim()) {
        payload.username = formData.username.trim();
      }
      if (formData.password?.trim()) {
        payload.password = formData.password.trim();
      }
      if (formData.frameRate !== undefined && formData.frameRate !== null) {
        payload.frameRate = Number(formData.frameRate);
      }
      if (formData.resolution?.trim()) {
        payload.resolution = formData.resolution.trim();
      }

      console.log('[AddCameraModal] Submitting camera:', payload);

      const response = await fetch('/api/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Handle error response
        const errorMessage = result.error || result.message || `Failed to create camera: ${response.status}`;
        setErrors({ submit: errorMessage });
        console.error('[AddCameraModal] Error creating camera:', errorMessage);
        return; // Keep modal open on error
      }

      // Success - close modal and refresh camera list
      console.log('[AddCameraModal] ✅ Camera created successfully:', result.data);
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('[AddCameraModal] Exception during submission:', error);
      setErrors({
        submit: error.message || 'Failed to create camera. Please check your connection and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle field change with real-time validation
   */
  const handleFieldChange = (name: keyof AddCameraFormData, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Validate field in real-time (but don't show error until blur or submit)
    // This allows for better UX - user can type without constant error messages
  };

  /**
   * Handle field blur - validate on blur
   */
  const handleFieldBlur = (name: keyof AddCameraFormData) => {
    const error = validateField(name, formData[name]);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close on backdrop click, but not if submitting
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Add New Camera</h2>
            <p className="text-sm text-slate-400 mt-1">
              Camera will not stream until fully configured and verified
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Close (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium">Failed to create camera</p>
                <p className="text-red-300 text-sm mt-1">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Section 1: Camera Identity */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Camera Identity</h3>
            
            {/* Camera Name */}
            <div>
              <label htmlFor="camera-name" className="block text-sm font-medium text-gray-300 mb-2">
                Camera Name <span className="text-red-400">*</span>
              </label>
              <input
                ref={firstInputRef}
                id="camera-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                className={`w-full px-4 py-2.5 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.name ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="e.g., Main Entrance Camera"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Camera Type */}
            <div>
              <label htmlFor="camera-type" className="block text-sm font-medium text-gray-300 mb-2">
                Camera Type <span className="text-red-400">*</span>
              </label>
              <select
                id="camera-type"
                value={formData.type}
                onChange={(e) => {
                  handleFieldChange('type', e.target.value as CameraType);
                  // Clear stream URL error if type changes (validation rules may differ)
                  if (errors.streamUrl) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.streamUrl;
                      return newErrors;
                    });
                  }
                }}
                onBlur={() => handleFieldBlur('type')}
                className={`w-full px-4 py-2.5 bg-slate-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.type ? 'border-red-500' : 'border-slate-600'
                }`}
                required
              >
                {CAMERA_TYPES.map((type) => (
                  <option key={type} value={type} disabled={type === 'Cloud Stream'}>
                    {type} {type === 'Cloud Stream' ? '(Coming Soon)' : ''}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-400">{errors.type}</p>
              )}
            </div>
          </div>

          {/* Section 2: Stream Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Stream Configuration</h3>
            
            {/* RTSP Stream URL */}
            <div>
              <label htmlFor="stream-url" className="block text-sm font-medium text-gray-300 mb-2">
                RTSP Stream URL <span className="text-red-400">*</span>
              </label>
              <input
                id="stream-url"
                type="text"
                value={formData.streamUrl}
                onChange={(e) => handleFieldChange('streamUrl', e.target.value)}
                onBlur={() => handleFieldBlur('streamUrl')}
                className={`w-full px-4 py-2.5 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm ${
                  errors.streamUrl ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="rtsp://username:password@camera-ip:554/stream1"
                required
              />
              {errors.streamUrl ? (
                <p className="mt-1 text-sm text-red-400">{errors.streamUrl}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">
                  Format: rtsp://[username]:[password]@[ip-address]:[port]/[path]
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Worksite Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Worksite Assignment</h3>
            
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Worksite
              </label>
              <p className="text-white font-medium">{worksiteName}</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">ID: {worksiteId}</p>
            </div>
          </div>

          {/* Advanced Options (Collapsible) */}
          <div className="border-t border-slate-700 pt-6">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg font-semibold text-white">Advanced Options</h3>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                    Username (Optional)
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => handleFieldChange('username', e.target.value)}
                    onBlur={() => handleFieldBlur('username')}
                    className={`w-full px-4 py-2.5 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.username ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Camera username"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-400">{errors.username}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password (Optional)
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    onBlur={() => handleFieldBlur('password')}
                    className={`w-full px-4 py-2.5 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.password ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder="Camera password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                {/* Frame Rate */}
                <div>
                  <label htmlFor="frame-rate" className="block text-sm font-medium text-gray-300 mb-2">
                    Frame Rate (Optional)
                  </label>
                  <input
                    id="frame-rate"
                    type="number"
                    min="1"
                    max="60"
                    value={formData.frameRate || ''}
                    onChange={(e) => handleFieldChange('frameRate', e.target.value ? Number(e.target.value) : undefined)}
                    onBlur={() => handleFieldBlur('frameRate')}
                    className={`w-full px-4 py-2.5 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.frameRate ? 'border-red-500' : 'border-slate-600'
                    }`}
                    placeholder={`${DEFAULT_FRAME_RATE} (default)`}
                  />
                  {errors.frameRate ? (
                    <p className="mt-1 text-sm text-red-400">{errors.frameRate}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">
                      Frames per second (1-60). Default: {DEFAULT_FRAME_RATE} fps
                    </p>
                  )}
                </div>

                {/* Resolution */}
                <div>
                  <label htmlFor="resolution" className="block text-sm font-medium text-gray-300 mb-2">
                    Resolution (Optional)
                  </label>
                  <input
                    id="resolution"
                    type="text"
                    value={formData.resolution || ''}
                    onChange={(e) => handleFieldChange('resolution', e.target.value)}
                    onBlur={() => handleFieldBlur('resolution')}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder={`${DEFAULT_RESOLUTION} (auto-detect)`}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Format: 1920x1080 or "auto" for automatic detection
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding Camera...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Add Camera
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

