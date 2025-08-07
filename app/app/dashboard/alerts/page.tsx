'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AlertsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('rules');
  const [saving, setSaving] = useState(false);

  const alertRules = [
    {
      id: 1,
      name: 'No Hard Hat Detection',
      description: 'Detect workers without safety helmets',
      severity: 'high',
      enabled: true,
      camera: 'All Cameras',
      threshold: 0.8
    },
    {
      id: 2,
      name: 'Unauthorized Access',
      description: 'Detect unauthorized personnel in restricted areas',
      severity: 'critical',
      enabled: true,
      camera: 'Perimeter Cameras',
      threshold: 0.9
    },
    {
      id: 3,
      name: 'Equipment Malfunction',
      description: 'Detect equipment operating outside normal parameters',
      severity: 'medium',
      enabled: false,
      camera: 'Equipment Cameras',
      threshold: 0.7
    },
    {
      id: 4,
      name: 'Speed Violation',
      description: 'Detect vehicles exceeding speed limits',
      severity: 'high',
      enabled: true,
      camera: 'Vehicle Cameras',
      threshold: 0.85
    }
  ];

  const notificationSettings = [
    { id: 'email', name: 'Email Notifications', enabled: true },
    { id: 'sms', name: 'SMS Alerts', enabled: false },
    { id: 'push', name: 'Push Notifications', enabled: true },
    { id: 'webhook', name: 'Webhook Integration', enabled: false }
  ];

  const handleSaveSettings = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    console.log('Alert settings saved');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900 text-red-300 border-red-700';
      case 'high': return 'bg-orange-900 text-orange-300 border-orange-700';
      case 'medium': return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'low': return 'bg-blue-900 text-blue-300 border-blue-700';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white">Alert Configuration</h1>
            <p className="text-gray-400 mt-2">Configure safety alert rules and notification preferences</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              saving
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
          {[
            { id: 'rules', name: 'Alert Rules' },
            { id: 'notifications', name: 'Notifications' },
            { id: 'sensitivity', name: 'Detection Sensitivity' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Alert Rules</h2>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Add New Rule
              </button>
            </div>
            
            <div className="grid gap-4">
              {alertRules.map((rule) => (
                <div key={rule.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                          {rule.severity}
                        </span>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-300">Enabled</span>
                        </label>
                      </div>
                      <p className="text-gray-400 mb-3">{rule.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Camera:</span>
                          <span className="text-white ml-2">{rule.camera}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Threshold:</span>
                          <span className="text-white ml-2">{rule.threshold}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="text-red-400 hover:text-red-300 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="space-y-4">
                {notificationSettings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{setting.name}</div>
                      <div className="text-gray-400 text-sm">
                        {setting.id === 'email' && 'Receive alerts via email'}
                        {setting.id === 'sms' && 'Receive critical alerts via SMS'}
                        {setting.id === 'push' && 'Receive real-time push notifications'}
                        {setting.id === 'webhook' && 'Send alerts to external systems'}
                      </div>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={setting.enabled}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Notification Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quiet Hours</label>
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      defaultValue="22:00"
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-400 self-center">to</span>
                    <input
                      type="time"
                      defaultValue="06:00"
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Escalation Delay</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>5 minutes</option>
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sensitivity' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Detection Sensitivity</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Overall Detection Sensitivity</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="75"
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Object Detection</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Person Detection', value: 85 },
                        { name: 'Vehicle Detection', value: 90 },
                        { name: 'Equipment Detection', value: 75 },
                        { name: 'Safety Gear Detection', value: 80 }
                      ].map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm text-gray-300 mb-1">
                            <span>{item.name}</span>
                            <span>{item.value}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue={item.value}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Behavior Analysis</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Movement Speed', value: 70 },
                        { name: 'Area Violations', value: 85 },
                        { name: 'Equipment Usage', value: 75 },
                        { name: 'Safety Compliance', value: 90 }
                      ].map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm text-gray-300 mb-1">
                            <span>{item.name}</span>
                            <span>{item.value}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue={item.value}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 