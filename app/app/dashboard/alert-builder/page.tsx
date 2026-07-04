'use client';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, Info, MapPin } from 'lucide-react';
import { 
  DETECTION_CLASSES, 
  DETECTION_TYPES, 
  ALERT_ACTIONS, 
  SEVERITY_LEVELS,
  getClassesByCategory,
  DetectionClass
} from '@/app/lib/detection-classes';
import ZoneDrawingTool from '@/app/components/ZoneDrawingTool';

function AlertBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worksiteParam = searchParams.get('worksite');
  const [cameras, setCameras] = useState<any[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detectionType: 'object_present',
    objectClass: 'person_detected',
    minConfidence: 0.5,
    severity: 'high',
    actions: ['create_alert', 'log_event', 'send_email'],
    cameraIds: [] as string[],
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

  const [smsCustomInput, setSmsCustomInput] = useState('');
  const [emailCustomInput, setEmailCustomInput] = useState('');
  const [worksiteWorkers, setWorksiteWorkers] = useState<
    Array<{ id: string; name: string | null; email: string | null; phoneNumber: string | null }>
  >([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showZoneDrawing, setShowZoneDrawing] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/dashboard');

  // Load existing rule if in edit mode & detect return URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // Support both 'edit' and 'rule' URL parameters
    const editId = urlParams.get('edit') || urlParams.get('rule');
    const from = urlParams.get('from');
    const worksite = urlParams.get('worksite');
    
    // Build worksite query string
    const wsParam = worksite ? `worksite=${worksite}` : '';
    
    // Set return URL based on 'from' parameter, preserving worksite
    if (from === 'alerts') {
      setReturnUrl(`/dashboard?tab=alerts${wsParam ? `&${wsParam}` : ''}`);
    } else if (from === 'custom-rules') {
      setReturnUrl(`/dashboard/custom-rules${wsParam ? `?${wsParam}` : ''}`);
    } else if (from === 'alert-rules') {
      setReturnUrl(`/dashboard/alert-rules${wsParam ? `?${wsParam}` : ''}`);
    } else {
      setReturnUrl(`/dashboard${wsParam ? `?${wsParam}` : ''}`);
    }
    
    if (editId) {
      console.log('[AlertBuilder] Loading rule for editing:', editId);
      setIsEditMode(true);
      setEditingRuleId(editId);
      loadRuleData(editId);
    }
  }, []);

  // Fetch cameras for the worksite so the user can pick which ones the rule applies to
  useEffect(() => {
    if (!worksiteParam) return;
    let cancelled = false;
    fetch(`/api/cameras?worksiteId=${worksiteParam}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const list = Array.isArray(j) ? j : Array.isArray(j?.cameras) ? j.cameras : [];
        setCameras(list.map((c: any) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [worksiteParam]);

  useEffect(() => {
    if (!worksiteParam) return;
    let cancelled = false;
    setRosterLoading(true);
    fetch(`/api/worksites/${worksiteParam}/users`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success && Array.isArray(j.data)) {
          setWorksiteWorkers(
            j.data.map((u: { id: string; name?: string | null; email?: string | null; phoneNumber?: string | null }) => ({
              id: u.id,
              name: u.name ?? null,
              email: u.email ?? null,
              phoneNumber: u.phoneNumber ?? null,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRosterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worksiteParam]);

  const loadRuleData = async (ruleId: string) => {
    setLoading(true);
    try {
      console.log('[AlertBuilder] Fetching rule data for:', ruleId);
      const response = await fetch(`/api/custom-rules/${ruleId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[AlertBuilder] API response:', result);
        
        if (result.success && result.data) {
          const rule = result.data;
          console.log('[AlertBuilder] Rule data received:', rule);
          
          // Parse JSON fields if they're strings
          const parseJsonField = (field: any, defaultValue: any = null) => {
            if (!field) return defaultValue;
            if (typeof field === 'string') {
              try {
                return JSON.parse(field);
              } catch {
                return defaultValue;
              }
            }
            return field;
          };

          // Extract actions from alertSettings
          let actions = rule.alertSettings?.actions || 
                         (rule.alertSettings && typeof rule.alertSettings === 'object' 
                           ? (Array.isArray(rule.alertSettings.actions) 
                               ? rule.alertSettings.actions 
                               : ['create_alert'])
                           : ['create_alert']);
          
          // Ensure actions array includes send_sms/send_email if those are enabled
          if (rule.smsEnabled && !actions.includes('send_sms')) {
            actions.push('send_sms');
          }
          if (rule.emailEnabled && !actions.includes('send_email')) {
            actions.push('send_email');
          }
          
          // Always include create_alert if not present
          if (!actions.includes('create_alert')) {
            actions = ['create_alert', ...actions];
          }

          // Parse recipients - handle both array and JSON string
          const smsRecipients = parseJsonField(rule.smsRecipients, []);
          const emailRecipients = parseJsonField(rule.emailRecipients, []);
          
          // Parse schedule/timeConstraints
          let schedule = {
            enabled: false,
            workHoursOnly: true,
            startTime: '08:00',
            endTime: '18:00',
            days: [1, 2, 3, 4, 5]
          };
          
          if (rule.timeConstraints) {
            const timeConstraints = parseJsonField(rule.timeConstraints, {});
            schedule = {
              enabled: timeConstraints.enabled || false,
              workHoursOnly: timeConstraints.workHoursOnly !== false,
              startTime: timeConstraints.startTime || '08:00',
              endTime: timeConstraints.endTime || '18:00',
              days: timeConstraints.days || [1, 2, 3, 4, 5]
            };
          }

          // Parse zone coordinates
          const zoneCoordinates = parseJsonField(
            rule.detectionCriteria?.zoneCoordinates, 
            null
          );

          // Parse zone object triggers
          const zoneObjectTriggers = parseJsonField(
            rule.triggerConditions?.zoneObjectTriggers || 
            rule.detectionCriteria?.zoneObjectTriggers,
            ['person_standing']
          );

          // Pre-fill form with existing rule data
          const newFormData = {
            name: rule.name || '',
            description: rule.description || '',
            detectionType: rule.detectionCriteria?.detectionType ||
                          (rule.ruleType === 'area_monitoring' ? 'zone_violation' : 'object_present'),
            objectClass: rule.detectionCriteria?.objectClass || 'person_without_hardhat',
            minConfidence: rule.confidenceThreshold || 0.7,
            severity: (rule.severity || 'high').toLowerCase(),
            actions: Array.isArray(actions) ? actions : ['create_alert'],
            // cameraIds array; fall back to wrapping legacy cameraId if present
            cameraIds: Array.isArray(rule.cameraIds) && rule.cameraIds.length > 0
              ? rule.cameraIds
              : rule.cameraId ? [rule.cameraId] : [],
            zoneCoordinates: zoneCoordinates,
            zoneName: rule.triggerConditions?.zoneName || 
                     rule.detectionCriteria?.zoneName || 
                     '',
            zoneType: (rule.triggerConditions?.zoneType || 
                      rule.detectionCriteria?.zoneType || 
                      'restricted') as 'restricted' | 'safe' | 'monitored',
            zoneObjectTriggers: Array.isArray(zoneObjectTriggers) ? zoneObjectTriggers : ['person_standing'],
            smsRecipients: Array.isArray(smsRecipients) ? smsRecipients : [],
            emailRecipients: Array.isArray(emailRecipients) ? emailRecipients : [],
            schedule: schedule
          };

          console.log('[AlertBuilder] Setting form data:', newFormData);
          setFormData(newFormData);
          
          // Set appropriate step based on rule data
          // If it's a zone violation with coordinates, show zone step
          // Otherwise start from step 1 so user can review/edit all fields
          if (newFormData.detectionType === 'zone_violation' && zoneCoordinates) {
            // Zone already exists, show zone step
            setStep(2.5);
          } else {
            // Start from step 1 so all fields are visible and editable
            setStep(1);
          }
        } else {
          console.error('[AlertBuilder] Invalid API response:', result);
          setErrorMessage('Failed to load rule: Invalid response format');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[AlertBuilder] API error:', response.status, errorData);
        setErrorMessage(`Failed to load rule: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('[AlertBuilder] Failed to load rule:', error);
      setErrorMessage('Failed to load rule data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        cameraIds: formData.cameraIds,
        worksiteId: worksiteParam || null, // Include worksiteId from URL parameter
        zoneCoordinates: formData.zoneCoordinates,
        smsRecipients: formData.smsRecipients,
        emailRecipients: formData.emailRecipients
      };

      // Use PATCH for edit mode, POST for create mode
      const url = isEditMode ? `/api/custom-rules/${editingRuleId}` : '/api/custom-rules';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      let result: any = {};
      try { result = await response.json(); } catch { result = { success: false, error: `HTTP ${response.status}` }; }

      if (response.ok && result.success) {
        const action = isEditMode ? 'updated' : 'created';
        setSuccessMessage(`✅ Alert "${formData.name}" ${action} successfully!`);
        setTimeout(() => { router.push(returnUrl); }, 1500);
      } else {
        const msg = result.error || result.details || `HTTP ${response.status} — failed to save alert`;
        console.error('[AlertBuilder] API error:', msg, result);
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 8000);
      }

    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} alert:`, error);
      setErrorMessage(error?.message || `Network error — check your connection and try again.`);
      setTimeout(() => setErrorMessage(null), 8000);
    }
  };

  const selectedDetectionType = DETECTION_TYPES.find(dt => dt.id === formData.detectionType);
  const selectedClass = DETECTION_CLASSES.find(dc => dc.id === formData.objectClass);
  const selectedSeverity = SEVERITY_LEVELS.find(sl => sl.id === formData.severity);

  const toggleSmsForPhone = (phone: string | null | undefined) => {
    const p = (phone || '').trim();
    if (!p) return;
    setFormData((prev) => {
      const has = prev.smsRecipients.some((x) => x.trim() === p);
      return {
        ...prev,
        smsRecipients: has ? prev.smsRecipients.filter((x) => x.trim() !== p) : [...prev.smsRecipients, p],
      };
    });
  };

  const toggleEmailFor = (email: string | null | undefined) => {
    const e = (email || '').trim();
    if (!e) return;
    const el = e.toLowerCase();
    setFormData((prev) => {
      const has = prev.emailRecipients.some((x) => x.trim().toLowerCase() === el);
      return {
        ...prev,
        emailRecipients: has
          ? prev.emailRecipients.filter((x) => x.trim().toLowerCase() !== el)
          : [...prev.emailRecipients, e],
      };
    });
  };

  const addCustomSms = () => {
    const v = smsCustomInput.trim();
    if (!v) return;
    if (formData.smsRecipients.some((x) => x.trim() === v)) return;
    setFormData((prev) => ({ ...prev, smsRecipients: [...prev.smsRecipients, v] }));
    setSmsCustomInput('');
  };

  const addCustomEmail = () => {
    const v = emailCustomInput.trim();
    if (!v) return;
    const low = v.toLowerCase();
    if (formData.emailRecipients.some((x) => x.trim().toLowerCase() === low)) return;
    setFormData((prev) => ({ ...prev, emailRecipients: [...prev.emailRecipients, v] }));
    setEmailCustomInput('');
  };

  const removeSmsValue = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      smsRecipients: prev.smsRecipients.filter((x) => x !== value),
    }));
  };

  const removeEmailValue = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter((x) => x !== value),
    }));
  };

  const rosterPhoneSet = new Set(
    worksiteWorkers.map((w) => w.phoneNumber?.trim()).filter(Boolean) as string[]
  );
  const smsRecipientsCustomOnly = formData.smsRecipients.filter((r) => !rosterPhoneSet.has(r.trim()));

  const rosterEmailSet = new Set(
    worksiteWorkers.map((w) => w.email?.trim().toLowerCase()).filter(Boolean) as string[]
  );
  const emailRecipientsCustomOnly = formData.emailRecipients.filter(
    (r) => !rosterEmailSet.has(r.trim().toLowerCase())
  );

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
            onClick={() => router.push(returnUrl)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white">
              {isEditMode ? 'Edit Custom Alert' : 'Create Custom Alert'}
            </h1>
            <p className="text-gray-400">
              {isEditMode ? 'Update your intelligent safety alert' : 'Build intelligent safety alerts for your cameras'}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="text-white font-semibold">Loading rule data...</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-start justify-between mb-10">
          {([
            { num: 1, label: 'Basic Info' },
            { num: 2, label: 'Detection' },
            { num: 2.5, label: 'Draw Zone', hidden: formData.detectionType !== 'zone_violation' },
            { num: 3, label: 'Actions' },
            { num: 4, label: 'Review' }
          ] as { num: number; label: string; hidden?: boolean }[]).filter(s => !s.hidden).map((s, i, arr) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-2">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm flex-shrink-0 ${
                  step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {Math.round(s.num)}
                </div>
                <span className={`text-xs text-center leading-tight max-w-[64px] ${
                  step >= s.num ? 'text-white' : 'text-gray-500'
                }`}>
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-1 mt-5 mx-2 ${
                  step > s.num ? 'bg-blue-600' : 'bg-gray-700'
                }`} />
              )}
            </React.Fragment>
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
                <label className="block text-gray-300 font-medium mb-2">Apply to Cameras</label>
                {!worksiteParam && (
                  <p className="text-amber-400 text-sm mb-2 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2">
                    Add <code className="text-amber-200">?worksite=…</code> to the URL to load cameras for this worksite.
                  </p>
                )}
                {cameras.length === 0 && worksiteParam ? (
                  <p className="text-gray-500 text-sm">No cameras found for this worksite.</p>
                ) : (
                  <div className="space-y-2 rounded-xl border border-gray-700/60 bg-gray-900/40 p-3">
                    {cameras.map((cam) => {
                      const checked = formData.cameraIds.includes(cam.id);
                      return (
                        <label
                          key={cam.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-800/80"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setFormData((prev) => ({
                                ...prev,
                                cameraIds: checked
                                  ? prev.cameraIds.filter((id) => id !== cam.id)
                                  : [...prev.cameraIds, cam.id],
                              }));
                            }}
                            className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-white">{cam.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-gray-500 text-sm mt-2">
                  {formData.cameraIds.length === 0
                    ? 'No cameras selected — rule will apply to ALL cameras in this worksite.'
                    : `Rule will only fire on ${formData.cameraIds.length} selected camera${formData.cameraIds.length > 1 ? 's' : ''}.`}
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

          {/* Step 2: Detection Configuration */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">What should trigger this alert?</h2>
                <p className="text-gray-400 mt-1">Pick what the AI camera should watch for.</p>
              </div>

              {/* Safety Violations — most common */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400">⚠ Safety Violations</span>
                  <span className="text-xs text-gray-600">Alert when a worker is NOT wearing required PPE</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'person_without_hardhat',     label: 'No Hard Hat',     emoji: '⛑️', desc: 'Worker missing helmet' },
                    { id: 'person_without_safety_vest', label: 'No Safety Vest',  emoji: '🦺', desc: 'Worker missing hi-vis vest' },
                    { id: 'person_without_gloves',      label: 'No Gloves',       emoji: '🧤', desc: 'Worker missing protective gloves' },
                    { id: 'person_without_safety_boots',label: 'No Safety Boots', emoji: '👢', desc: 'Worker missing safety footwear' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({...formData, objectClass: item.id, detectionType: 'object_present'})}
                      className={`p-4 rounded-xl text-left transition-all border-2 ${
                        formData.objectClass === item.id
                          ? 'bg-red-600/20 border-red-500'
                          : 'bg-gray-900/50 border-gray-700 hover:border-red-900/60'
                      }`}
                    >
                      <div className="text-2xl mb-2">{item.emoji}</div>
                      <div className="font-semibold text-white text-sm">{item.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Presence & Compliance */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-400">✓ Presence &amp; Compliance</span>
                  <span className="text-xs text-gray-600">Alert when a person or PPE item IS detected</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'person_detected',          label: 'Person Detected',  emoji: '👤', desc: 'Any person enters camera view' },
                    { id: 'person_with_hardhat',       label: 'Hard Hat Worn',    emoji: '⛑️', desc: 'Worker wearing helmet' },
                    { id: 'person_with_safety_vest',   label: 'Safety Vest Worn', emoji: '🦺', desc: 'Worker wearing hi-vis vest' },
                    { id: 'person_with_gloves',        label: 'Gloves Worn',      emoji: '🧤', desc: 'Worker wearing gloves' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({...formData, objectClass: item.id, detectionType: 'object_present'})}
                      className={`p-4 rounded-xl text-left transition-all border-2 ${
                        formData.objectClass === item.id
                          ? 'bg-green-600/20 border-green-500'
                          : 'bg-gray-900/50 border-gray-700 hover:border-green-900/60'
                      }`}
                    >
                      <div className="text-2xl mb-2">{item.emoji}</div>
                      <div className="font-semibold text-white text-sm">{item.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced: Zone Violation */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Advanced</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    detectionType: formData.detectionType === 'zone_violation' ? 'object_present' : 'zone_violation',
                    objectClass: 'person_detected'
                  })}
                  className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                    formData.detectionType === 'zone_violation'
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-gray-900/30 border-gray-700/60 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <div className="font-semibold text-white text-sm">
                        Zone Violation
                        {formData.detectionType === 'zone_violation' && (
                          <span className="ml-2 text-xs text-blue-400">✓ selected</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Draw a restricted area on your camera — alert when someone enters it</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Confidence Threshold */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">
                  AI Confidence: <span className="text-white font-bold">{(formData.minConfidence * 100).toFixed(0)}%</span>
                  <span className="text-gray-500 text-sm font-normal ml-2">
                    {formData.minConfidence >= 0.8 ? '(strict — fewer false alarms)' :
                     formData.minConfidence >= 0.65 ? '(balanced — recommended)' :
                     '(lenient — catches more, may have false alarms)'}
                  </span>
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
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>50% lenient</span>
                  <span>95% strict</span>
                </div>
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
                  <strong>Draw a zone on your camera feed.</strong> Use the controls that appear at the top of the video to configure 
                  the zone name, type, and what objects should trigger alerts. Click on the video to place points and create a polygon zone. 
                  When you're done, click "Finish Zone".
                </div>
              </div>

              {/* Camera Feed with Zone Drawing */}
              {formData.cameraId && (
                <div>
                  <label className="block text-gray-300 font-medium mb-3">Draw Zone on Camera Feed</label>
                  <div className="bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-700 relative">
                    <div className="aspect-video relative">
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400">Camera feed functionality has been removed</p>
                      </div>
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
                  <label className="block text-gray-300 font-medium mb-2">SMS recipients *</label>
                  <p className="text-gray-500 text-sm mb-3">
                    Select people on this worksite or add a custom number. Use E.164 format when possible (e.g. +1…).
                  </p>
                  {!worksiteParam && (
                    <p className="text-amber-400 text-sm mb-3 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2">
                      Add <code className="text-amber-200">?worksite=…</code> to the URL to load team members from that
                      site.
                    </p>
                  )}
                  {rosterLoading && <p className="text-gray-400 text-sm mb-2">Loading team…</p>}
                  <div className="space-y-2 rounded-xl border border-gray-700/60 bg-gray-900/40 p-3">
                    {worksiteWorkers.map((w) => {
                      const phone = w.phoneNumber?.trim();
                      const checked = phone ? formData.smsRecipients.some((x) => x.trim() === phone) : false;
                      return (
                        <label
                          key={w.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-800/80 ${
                            phone ? '' : 'cursor-not-allowed opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!phone}
                            checked={checked}
                            onChange={() => phone && toggleSmsForPhone(phone)}
                            className="mt-1 h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-white">{w.name || w.email || 'User'}</div>
                            {phone ? (
                              <div className="text-sm text-gray-400">{phone}</div>
                            ) : (
                              <div className="text-sm text-gray-500">No phone on file</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {worksiteParam && !rosterLoading && worksiteWorkers.length === 0 && (
                      <p className="text-gray-500 text-sm">No worksite users found.</p>
                    )}
                  </div>
                  {smsRecipientsCustomOnly.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Custom numbers</p>
                      {smsRecipientsCustomOnly.map((phone) => (
                        <div key={phone} className="flex items-center gap-2 rounded-lg bg-gray-900/60 px-3 py-2">
                          <span className="flex-1 truncate text-sm text-gray-200">{phone}</span>
                          <button
                            type="button"
                            onClick={() => removeSmsValue(phone)}
                            className="shrink-0 rounded-md bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="tel"
                      value={smsCustomInput}
                      onChange={(e) => setSmsCustomInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSms())}
                      placeholder="+1234567890"
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomSms}
                      className="rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-500"
                    >
                      Add custom
                    </button>
                  </div>
                </div>
              )}

              {/* Email Recipients */}
              {formData.actions.includes('send_email') && (
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Email recipients *</label>
                  <p className="text-gray-500 text-sm mb-3">Select worksite members or add a custom address.</p>
                  {!worksiteParam && (
                    <p className="text-amber-400 text-sm mb-3 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2">
                      Add <code className="text-amber-200">?worksite=…</code> to the URL to load team emails.
                    </p>
                  )}
                  {rosterLoading && <p className="text-gray-400 text-sm mb-2">Loading team…</p>}
                  <div className="space-y-2 rounded-xl border border-gray-700/60 bg-gray-900/40 p-3">
                    {worksiteWorkers.map((w) => {
                      const em = w.email?.trim();
                      const checked = em
                        ? formData.emailRecipients.some((x) => x.trim().toLowerCase() === em.toLowerCase())
                        : false;
                      return (
                        <label
                          key={`e-${w.id}`}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-800/80 ${
                            em ? '' : 'cursor-not-allowed opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!em}
                            checked={checked}
                            onChange={() => em && toggleEmailFor(em)}
                            className="mt-1 h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-white">{w.name || 'User'}</div>
                            {em ? (
                              <div className="truncate text-sm text-gray-400">{em}</div>
                            ) : (
                              <div className="text-sm text-gray-500">No email on file</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {emailRecipientsCustomOnly.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Custom addresses</p>
                      {emailRecipientsCustomOnly.map((addr) => (
                        <div key={addr} className="flex items-center gap-2 rounded-lg bg-gray-900/60 px-3 py-2">
                          <span className="flex-1 truncate text-sm text-gray-200">{addr}</span>
                          <button
                            type="button"
                            onClick={() => removeEmailValue(addr)}
                            className="shrink-0 rounded-md bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="email"
                      value={emailCustomInput}
                      onChange={(e) => setEmailCustomInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomEmail())}
                      placeholder="supervisor@company.com"
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomEmail}
                      className="rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-500"
                    >
                      Add custom
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
                  {formData.cameraIds.length === 0 ? (
                    <p className="text-white font-semibold">All Cameras (Global)</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.cameraIds.map((id) => {
                        const cam = cameras.find((c) => c.id === id);
                        return (
                          <span key={id} className="px-3 py-1 bg-slate-700 text-white rounded-lg text-sm font-medium">
                            {cam?.name ?? id}
                          </span>
                        );
                      })}
                    </div>
                  )}
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
                  {isEditMode ? '✓ Update Alert' : '✓ Create Alert'}
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

export default function AlertBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
        </div>
      }
    >
      <AlertBuilderPageContent />
    </Suspense>
  );
}

