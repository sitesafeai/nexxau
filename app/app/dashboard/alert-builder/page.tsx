'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, Info, MapPin } from 'lucide-react';
import { 
  DETECTION_CLASSES, 
  DETECTION_TYPES, 
  ALERT_ACTIONS, 
  SEVERITY_LEVELS,
  getClassesByCategory,
  DetectionClass
} from '@/app/lib/detection-classes';
import { useCameraStore } from '@/app/lib/camera-store';
import ZoneDrawingTool from '@/app/components/ZoneDrawingTool';
import CameraFeed from '@/app/components/CameraFeed';

export default function AlertBuilderPage() {
  const router = useRouter();
  const { cameras } = useCameraStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detectionType: 'object_present',
    objectClass: 'person_without_hardhat',
    minConfidence: 0.7,
    severity: 'high',
    actions: ['create_alert', 'log_event'],
    cameraId: '',
    zoneCoordinates: null as any,
    zoneName: '',
    zoneType: 'restricted' as 'restricted' | 'safe' | 'monitored',
    zoneObjectTriggers: ['person_standing'] as string[], // What objects trigger this zone
    smsRecipients: [] as string[],
    emailRecipients: [] as string[],
    schedule: {
      enabled: false,
      workHoursOnly: true,
      startTime: '08:00',
      endTime: '18:00',
      days: [1, 2, 3, 4, 5] // Monday-Friday
    }
  });

  const [smsInput, setSmsInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showZoneDrawing, setShowZoneDrawing] = useState(false);

  const handleSubmit = async () => {
    try {
      // Enhanced payload with zone trigger objects
      const payload = {
        name: formData.name,
        description: formData.description,
        detectionType: formData.detectionType,
        objectClass: formData.objectClass,
        minConfidence: formData.minConfidence,
        conditions: {
          object: formData.objectClass,
          state: formData.detectionType === 'object_missing' ? 'missing' : 'present',
          confidence_min: formData.minConfidence,
          schedule: formData.schedule.enabled ? formData.schedule : null,
          // Zone-specific triggers
          zoneName: formData.zoneName || null,
          zoneType: formData.zoneType || null,
          zoneObjectTriggers: formData.zoneObjectTriggers || null // Objects that trigger zone alerts
        },
        actions: formData.actions,
        severity: formData.severity,
        cameraId: formData.cameraId || null,
        zoneCoordinates: formData.zoneCoordinates,
        smsRecipients: formData.smsRecipients,
        emailRecipients: formData.emailRecipients
      };

      const response = await fetch('/api/custom-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(`✅ Alert "${formData.name}" created successfully!`);
        setTimeout(() => {
          router.push('/dashboard/custom-rules');
        }, 1500);
      } else {
        setErrorMessage(result.error || 'Failed to create alert');
        setTimeout(() => setErrorMessage(null), 5000);
      }

    } catch (error) {
      console.error('Error creating alert:', error);
      setErrorMessage('Failed to create alert. Please try again.');
    }
  };

  const selectedDetectionType = DETECTION_TYPES.find(dt => dt.id === formData.detectionType);
  const selectedClass = DETECTION_CLASSES.find(dc => dc.id === formData.objectClass);
  const selectedSeverity = SEVERITY_LEVELS.find(sl => sl.id === formData.severity);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl border border-green-500/50 flex items-center gap-3">
            <CheckCircle className="h-6 w-6" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl border border-red-500/50 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <span className="font-semibold">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="ml-2">×</button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white">Create Custom Alert</h1>
            <p className="text-gray-400">Build intelligent safety alerts for your cameras</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {[
            { num: 1, label: 'Basic Info' },
            { num: 2, label: 'Detection Type' },
            { num: 2.5, label: formData.detectionType === 'zone_violation' ? 'Draw Zone' : '', hidden: formData.detectionType !== 'zone_violation' },
            { num: 3, label: 'Actions' },
            { num: 4, label: 'Review' }
          ].filter(s => !s.hidden).map((s) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {s.num}
              </div>
              <div className={`flex-1 h-1 ${step > s.num ? 'bg-blue-600' : 'bg-gray-700'} ${s.num === 4 ? 'hidden' : ''}`} />
              <span className={`ml-2 text-sm ${step >= s.num ? 'text-white' : 'text-gray-500'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 border border-gray-700/50">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
              
              <div>
                <label className="block text-gray-300 font-medium mb-2">Alert Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Missing Hard Hat Alert"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe what this alert monitors and why it's important..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  style={{ color: '#ffffff' }}
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">Apply to Camera</label>
                <select
                  value={formData.cameraId}
                  onChange={(e) => setFormData({...formData, cameraId: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Cameras (Global Rule)</option>
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>
                      {cam.name} - {cam.location}
                    </option>
                  ))}
                </select>
                <p className="text-gray-500 text-sm mt-2">
                  Leave as "All Cameras" to apply this rule to every camera, or select a specific camera.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.name}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    formData.name
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next: Detection Type →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Detection Type */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Detection Configuration</h2>

              <div>
                <label className="block text-gray-300 font-medium mb-3">What should trigger this alert? *</label>
                <div className="grid grid-cols-1 gap-3">
                  {DETECTION_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({...formData, detectionType: type.id})}
                      className={`p-4 rounded-xl text-left transition-all border-2 ${
                        formData.detectionType === type.id
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-semibold mb-1">{type.name}</div>
                      <div className="text-sm text-gray-400">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-3">What object should the AI look for? *</label>
                
                {/* Filter by category */}
                <div className="flex gap-2 mb-4">
                  {['ppe', 'person', 'equipment', 'vehicle', 'zone'].map(category => (
                    <button
                      key={category}
                      type="button"
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                    >
                      {category.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                  {DETECTION_CLASSES.map(cls => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setFormData({...formData, objectClass: cls.id})}
                      className={`p-4 rounded-xl text-left transition-all border-2 ${
                        formData.objectClass === cls.id
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{cls.name}</span>
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cls.color }}
                        />
                      </div>
                      <div className="text-sm text-gray-400">{cls.description}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        Category: {cls.category} • Severity: {cls.severity}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  Confidence Threshold: {(formData.minConfidence * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={formData.minConfidence}
                  onChange={(e) => setFormData({...formData, minConfidence: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-gray-500 text-sm mt-2">
                  Higher = fewer false alarms, but might miss some violations. 
                  Recommended: 70-80% for PPE detection.
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    // If zone violation, go to zone drawing step
                    if (formData.detectionType === 'zone_violation') {
                      setStep(2.5);
                    } else {
                      setStep(3);
                    }
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                >
                  {formData.detectionType === 'zone_violation' ? 'Next: Draw Zone →' : 'Next: Actions →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2.5: Zone Drawing (Only for zone_violation type) */}
          {step === 2.5 && formData.detectionType === 'zone_violation' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Draw Restricted Zone</h2>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 flex gap-3 mb-6">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <strong>Draw a zone on your camera feed.</strong> When ANY of the selected objects (person, forklift, van, etc.) 
                  enters this zone, the alert will trigger. This is perfect for lunch areas, machine zones, or any restricted space.
                </div>
              </div>

              {/* Zone Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Zone Name *</label>
                  <input
                    type="text"
                    value={formData.zoneName}
                    onChange={(e) => setFormData({...formData, zoneName: e.target.value})}
                    placeholder="e.g., Lunch Area, Machine Zone, Crane Area"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-2">Zone Type</label>
                  <select
                    value={formData.zoneType}
                    onChange={(e) => setFormData({...formData, zoneType: e.target.value as any})}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="restricted">🔴 Restricted (No Entry)</option>
                    <option value="monitored">🔵 Monitored (Watch Only)</option>
                    <option value="safe">🟢 Safe Zone</option>
                  </select>
                </div>
              </div>

              {/* What Triggers This Zone */}
              <div className="mb-6">
                <label className="block text-gray-300 font-medium mb-3">
                  What objects should trigger alerts in this zone? *
                </label>
                <p className="text-gray-500 text-sm mb-3">
                  Select all objects that should NOT be allowed in this zone. 
                  Example: "Lunch Area" → Select "Forklift" and "Van" to prevent vehicles from entering.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1 bg-gray-900/30 rounded-xl p-4">
                  {DETECTION_CLASSES.map(cls => (
                    <label
                      key={cls.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                        formData.zoneObjectTriggers.includes(cls.id)
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.zoneObjectTriggers.includes(cls.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              zoneObjectTriggers: [...formData.zoneObjectTriggers, cls.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              zoneObjectTriggers: formData.zoneObjectTriggers.filter(id => id !== cls.id)
                            });
                          }
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-gray-600 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{cls.name}</span>
                          <span 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cls.color }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{cls.category}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Camera Feed with Zone Drawing */}
              {formData.cameraId && (
                <div>
                  <label className="block text-gray-300 font-medium mb-3">Draw Zone on Camera Feed</label>
                  <div className="bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-700 relative">
                    <div className="aspect-video relative">
                      <CameraFeed
                        streamUrl={cameras.find(c => c.id === formData.cameraId)?.streamUrl || ''}
                        cameraId={formData.cameraId}
                        autoPlay={true}
                        className="w-full h-full"
                        enableDetection={false}
                        ref={videoRef}
                      />
                      <ZoneDrawingTool
                        videoRef={videoRef}
                        cameraId={formData.cameraId}
                        onZoneComplete={(zone) => {
                          setFormData({
                            ...formData,
                            zoneCoordinates: zone.points,
                            zoneName: zone.name,
                            zoneType: zone.type
                          });
                        }}
                        className="absolute inset-0"
                      />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mt-2">
                    👆 Click on the video to place points. You need at least 3 points to create a zone.
                  </p>
                </div>
              )}

              {!formData.cameraId && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <strong>Please select a camera in Step 1</strong> before drawing zones. 
                    Zone coordinates are specific to each camera's view.
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.zoneCoordinates || formData.zoneObjectTriggers.length === 0}
                  className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                    formData.zoneCoordinates && formData.zoneObjectTriggers.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next: Actions →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Actions */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Alert Actions</h2>

              <div>
                <label className="block text-gray-300 font-medium mb-3">
                  What should happen when this alert triggers? *
                </label>
                <div className="space-y-3">
                  {ALERT_ACTIONS.map(action => (
                    <label
                      key={action.id}
                      className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                        formData.actions.includes(action.id)
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.actions.includes(action.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, actions: [...formData.actions, action.id]});
                          } else {
                            setFormData({...formData, actions: formData.actions.filter(a => a !== action.id)});
                          }
                        }}
                        className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-white mb-1">{action.name}</div>
                        <div className="text-sm text-gray-400">{action.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-3">Severity Level *</label>
                <div className="grid grid-cols-2 gap-4">
                  {SEVERITY_LEVELS.map(level => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setFormData({...formData, severity: level.id})}
                      className={`p-5 rounded-xl text-left transition-all border-2 ${
                        formData.severity === level.id
                          ? 'border-current'
                          : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                      }`}
                      style={{
                        backgroundColor: formData.severity === level.id ? `${level.color}20` : undefined,
                        borderColor: formData.severity === level.id ? level.color : undefined
                      }}
                    >
                      <div className="font-semibold text-white mb-2 text-base">{level.name}</div>
                      <div className="text-sm text-gray-400 leading-relaxed">{level.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SMS Recipients */}
              {formData.actions.includes('send_sms') && (
                <div>
                  <label className="block text-gray-300 font-medium mb-3">SMS Recipients *</label>
                  <p className="text-gray-500 text-sm mb-3">Enter phone numbers to receive SMS alerts. Format: +1234567890</p>
                  <div className="space-y-2">
                    {formData.smsRecipients.map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            const newRecipients = [...formData.smsRecipients];
                            newRecipients[index] = e.target.value;
                            setFormData({...formData, smsRecipients: newRecipients});
                          }}
                          placeholder="+1234567890"
                          className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newRecipients = formData.smsRecipients.filter((_, i) => i !== index);
                            setFormData({...formData, smsRecipients: newRecipients});
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, smsRecipients: [...formData.smsRecipients, '']})}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      + Add Phone Number
                    </button>
                  </div>
                </div>
              )}

              {/* Email Recipients */}
              {formData.actions.includes('send_email') && (
                <div>
                  <label className="block text-gray-300 font-medium mb-3">Email Recipients *</label>
                  <p className="text-gray-500 text-sm mb-3">Enter email addresses to receive email alerts</p>
                  <div className="space-y-2">
                    {formData.emailRecipients.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newRecipients = [...formData.emailRecipients];
                            newRecipients[index] = e.target.value;
                            setFormData({...formData, emailRecipients: newRecipients});
                          }}
                          placeholder="supervisor@company.com"
                          className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newRecipients = formData.emailRecipients.filter((_, i) => i !== index);
                            setFormData({...formData, emailRecipients: newRecipients});
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, emailRecipients: [...formData.emailRecipients, '']})}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      + Add Email Address
                    </button>
                  </div>
                </div>
              )}

              {/* Video Capture Recipients */}
              {formData.actions.includes('capture_video') && (
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
                  <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <strong>Video Evidence:</strong> When violations occur, a 30-second video clip will be saved and can be sent via email. 
                      Select "Send Email" above and add recipients to automatically receive video evidence.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => {
                    if (formData.detectionType === 'zone_violation') {
                      setStep(2.5);
                    } else {
                      setStep(2);
                    }
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={formData.actions.length === 0}
                  className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                    formData.actions.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next: Review →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Review & Create</h2>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Alert Name</label>
                  <p className="text-white text-xl font-semibold">{formData.name}</p>
                </div>

                {formData.description && (
                  <div>
                    <label className="text-gray-400 text-sm">Description</label>
                    <p className="text-gray-300">{formData.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Detection Type</label>
                    <p className="text-white font-semibold">{selectedDetectionType?.name}</p>
                    <p className="text-gray-500 text-sm">{selectedDetectionType?.description}</p>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm">Object to Detect</label>
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedClass?.color }}
                      />
                      <p className="text-white font-semibold">{selectedClass?.name}</p>
                    </div>
                    <p className="text-gray-500 text-sm">{selectedClass?.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Confidence Threshold</label>
                    <p className="text-white font-semibold">{(formData.minConfidence * 100).toFixed(0)}%</p>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm">Severity</label>
                    <span 
                      className="inline-block px-3 py-1 rounded-full text-white font-semibold text-sm"
                      style={{ backgroundColor: selectedSeverity?.color }}
                    >
                      {selectedSeverity?.name.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Actions ({formData.actions.length})</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.actions.map(actionId => {
                      const action = ALERT_ACTIONS.find(a => a.id === actionId);
                      return (
                        <span key={actionId} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium">
                          {action?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Camera Scope</label>
                  <p className="text-white font-semibold">
                    {formData.cameraId 
                      ? cameras.find(c => c.id === formData.cameraId)?.name || 'Specific Camera'
                      : 'All Cameras (Global)'}
                  </p>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 flex gap-3">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <strong>Important:</strong> This alert will be synced with your AI detection service immediately. 
                  The AI will start checking for "{selectedClass?.name}" in real-time.
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-green-500/25"
                >
                  ✓ Create Alert
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            How Custom Alerts Work
          </h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li>• Your YOLO model detects objects in real-time from camera feeds</li>
            <li>• When a detection matches your alert rule, the system triggers the configured actions</li>
            <li>• Alerts are checked every frame (30 times per second on 30 FPS cameras)</li>
            <li>• You can create multiple alerts per camera or global alerts for all cameras</li>
            <li>• Higher confidence = fewer false alarms, but might miss some real violations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

