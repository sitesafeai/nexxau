'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardHeader from '@/app/components/DashboardHeader';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

interface DetectionZone {
  id?: string;
  name: string;
  type: string;
  coordinates: Array<{ x: number; y: number }>;
  enabled: boolean;
}

export default function CameraSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const cameraId = params.id as string;

  const [camera, setCamera] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<DetectionZone[]>([]);
  const [newZone, setNewZone] = useState<DetectionZone>({
    name: '',
    type: 'RESTRICTED_AREA',
    coordinates: [],
    enabled: true
  });

  useEffect(() => {
    fetchCamera();
  }, [cameraId]);

  const fetchCamera = async () => {
    try {
      const res = await fetch(`/api/cameras/${cameraId}`);
      const data = await res.json();
      if (data.success) {
        setCamera(data.data);
        // Load existing zones from camera metadata
        if (data.data.metadata?.detectionZones) {
          setZones(data.data.metadata.detectionZones);
        }
      }
    } catch (err) {
      console.error('Error fetching camera:', err);
    } finally {
      setLoading(false);
    }
  };

  const addZone = () => {
    if (newZone.name) {
      setZones([...zones, { ...newZone }]);
      setNewZone({ name: '', type: 'RESTRICTED_AREA', coordinates: [], enabled: true });
    }
  };

  const removeZone = (index: number) => {
    setZones(zones.filter((_, i) => i !== index));
  };

  const saveSettings = async () => {
    try {
      const res = await fetch(`/api/cameras/${cameraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...camera.metadata,
            detectionZones: zones
          }
        })
      });

      if (res.ok) {
        alert('Settings saved successfully!');
        router.back();
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Error saving settings');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <DashboardHeader />
        <div className="p-6 flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <DashboardHeader />
        <div className="p-6">
          <div className="text-center text-white">Camera not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <DashboardHeader />
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-300 hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Camera Settings: {camera.name}</h1>
            <p className="text-slate-300">{camera.location}</p>
          </div>

          {/* Detection Zones */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Detection Zones</h2>
            <p className="text-slate-400 mb-6">Configure AI detection zones and parameters for this camera</p>

            {/* Add Zone Form */}
            <div className="bg-slate-700/30 p-6 rounded-lg space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Zone Name</label>
                <input
                  type="text"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="e.g., Main Entrance Zone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Detection Type</label>
                <select
                  value={newZone.type}
                  onChange={(e) => setNewZone({ ...newZone, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="RESTRICTED_AREA">Restricted Area (No Entry)</option>
                  <option value="PPE_REQUIRED">PPE Required Zone</option>
                  <option value="HARD_HAT">Hard Hat Detection</option>
                  <option value="SAFETY_VEST">Safety Vest Detection</option>
                  <option value="PERSON_COUNT">Person Counting</option>
                  <option value="VEHICLE_DETECTION">Vehicle Detection</option>
                  <option value="FALL_DETECTION">Fall Detection</option>
                  <option value="FIRE_SMOKE">Fire/Smoke Detection</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={newZone.enabled}
                  onChange={(e) => setNewZone({ ...newZone, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded"
                />
                <label htmlFor="enabled" className="text-sm text-slate-300">Enable this zone</label>
              </div>

              <button
                onClick={addZone}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Add Detection Zone
              </button>
            </div>

            {/* Zone List */}
            {zones.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Configured Zones ({zones.length})</h3>
                {zones.map((zone, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-white font-medium">{zone.name}</p>
                        <span className={`px-2 py-1 rounded text-xs ${
                          zone.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {zone.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{zone.type.replace(/_/g, ' ')}</p>
                    </div>
                    <button
                      onClick={() => removeZone(index)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {zones.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No detection zones configured yet. Add one above to enable AI detection.
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

