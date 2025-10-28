'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Camera, Bell, Shield, User } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = searchParams.get('site') || '1';

  const [settings, setSettings] = useState({
    camera: {
      autoDetect: true,
      detectionConfidence: 0.7,
      alertThreshold: 3,
      frameRate: 30
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      alertFrequency: 'immediate'
    },
    safety: {
      maxViolationsPerHour: 10,
      autoEscalate: true,
      complianceThreshold: 0.85
    },
    user: {
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      language: 'en'
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white">Settings</h1>
            <p className="text-gray-400">Configure Site #{siteId} settings</p>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Camera Settings */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Camera Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">Auto-detect objects</label>
                  <p className="text-sm text-gray-400">Automatically detect and track objects in video feeds</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.camera.autoDetect}
                  onChange={(e) => setSettings({ ...settings, camera: { ...settings.camera, autoDetect: e.target.checked } })}
                  className="w-12 h-6 rounded-full appearance-none bg-gray-700 checked:bg-blue-600 relative transition-colors duration-200"
                  style={{
                    background: settings.camera.autoDetect ? '#2563eb' : '#374151'
                  }}
                />
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">
                  Detection Confidence: {(settings.camera.detectionConfidence * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={settings.camera.detectionConfidence}
                  onChange={(e) => setSettings({ ...settings, camera: { ...settings.camera, detectionConfidence: parseFloat(e.target.value) } })}
                  className="w-full h-2 rounded-lg appearance-none bg-gray-700"
                />
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Alert Threshold</label>
                <select
                  value={settings.camera.alertThreshold}
                  onChange={(e) => setSettings({ ...settings, camera: { ...settings.camera, alertThreshold: parseInt(e.target.value) } })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                >
                  <option value={1}>Immediate (1 violation)</option>
                  <option value={3}>3 violations</option>
                  <option value={5}>5 violations</option>
                  <option value={10}>10 violations</option>
                </select>
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Frame Rate (FPS)</label>
                <select
                  value={settings.camera.frameRate}
                  onChange={(e) => setSettings({ ...settings, camera: { ...settings.camera, frameRate: parseInt(e.target.value) } })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                >
                  <option value={15}>15 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-6 w-6 text-green-400" />
              <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">Email notifications</label>
                  <p className="text-sm text-gray-400">Receive alerts via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailEnabled}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, emailEnabled: e.target.checked } })}
                  className="w-12 h-6 rounded-full appearance-none bg-gray-700 checked:bg-green-600 relative transition-colors duration-200"
                  style={{
                    background: settings.notifications.emailEnabled ? '#16a34a' : '#374151'
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">SMS notifications</label>
                  <p className="text-sm text-gray-400">Receive alerts via SMS</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.smsEnabled}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, smsEnabled: e.target.checked } })}
                  className="w-12 h-6 rounded-full appearance-none bg-gray-700 checked:bg-green-600 relative transition-colors duration-200"
                  style={{
                    background: settings.notifications.smsEnabled ? '#16a34a' : '#374151'
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">Push notifications</label>
                  <p className="text-sm text-gray-400">Receive browser push notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.pushEnabled}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, pushEnabled: e.target.checked } })}
                  className="w-12 h-6 rounded-full appearance-none bg-gray-700 checked:bg-green-600 relative transition-colors duration-200"
                  style={{
                    background: settings.notifications.pushEnabled ? '#16a34a' : '#374151'
                  }}
                />
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Alert Frequency</label>
                <select
                  value={settings.notifications.alertFrequency}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, alertFrequency: e.target.value } })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                >
                  <option value="immediate">Immediate</option>
                  <option value="hourly">Hourly digest</option>
                  <option value="daily">Daily digest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Safety Settings */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Safety Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-white font-medium mb-2 block">Max Violations Per Hour</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.safety.maxViolationsPerHour}
                  onChange={(e) => setSettings({ ...settings, safety: { ...settings.safety, maxViolationsPerHour: parseInt(e.target.value) } })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">Auto-escalate</label>
                  <p className="text-sm text-gray-400">Automatically escalate critical violations</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.safety.autoEscalate}
                  onChange={(e) => setSettings({ ...settings, safety: { ...settings.safety, autoEscalate: e.target.checked } })}
                  className="w-12 h-6 rounded-full appearance-none bg-gray-700 checked:bg-red-600 relative transition-colors duration-200"
                  style={{
                    background: settings.safety.autoEscalate ? '#dc2626' : '#374151'
                  }}
                />
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">
                  Compliance Threshold: {(settings.safety.complianceThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={settings.safety.complianceThreshold}
                  onChange={(e) => setSettings({ ...settings, safety: { ...settings.safety, complianceThreshold: parseFloat(e.target.value) } })}
                  className="w-full h-2 rounded-lg appearance-none bg-gray-700"
                />
              </div>
            </div>
          </div>

          {/* User Settings */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-6 w-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">User Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-white font-medium mb-2 block">Timezone</label>
                <select
                  value={settings.user.timezone}
                  onChange={(e) => setSettings({ ...settings, user: { ...settings.user, timezone: e.target.value } })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                >
                  <option value="America/New_York">Eastern (EST/EDT)</option>
                  <option value="America/Chicago">Central (CST/CDT)</option>
                  <option value="America/Denver">Mountain (MST/MDT)</option>
                  <option value="America/Los_Angeles">Pacific (PST/PDT)</option>
                </select>
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Date Format</label>
                <select
                  value={settings.user.dateFormat}
                  onChange={(e) => setSettings({ ...settings, user: { ...settings.user, dateFormat: e.target.value } })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Language</label>
                <select
                  value={settings.user.language}
                  onChange={(e) => setSettings({ ...settings, user: { ...settings.user, language: e.target.value } })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

