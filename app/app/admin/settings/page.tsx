'use client';

import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { 
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  KeyIcon,
  DocumentTextIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { ServerIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { key: 'general', name: 'General', icon: CogIcon },
    { key: 'notifications', name: 'Notifications', icon: BellIcon },
    { key: 'security', name: 'Security', icon: ShieldCheckIcon },
    { key: 'data', name: 'Data Management', icon: ServerIcon },
    { key: 'integrations', name: 'Integrations', icon: GlobeAltIcon },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure your system preferences and security settings</p>
        </div>

        {/* Settings Tabs */}
        <div className="bg-white shadow border rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'general' && <GeneralSettings onSave={handleSave} />}
            {activeTab === 'notifications' && <NotificationSettings onSave={handleSave} />}
            {activeTab === 'security' && <SecuritySettings onSave={handleSave} />}
            {activeTab === 'data' && <DataSettings onSave={handleSave} />}
            {activeTab === 'integrations' && <IntegrationSettings onSave={handleSave} />}
          </div>
        </div>

        {/* Save Success Message */}
        {saved && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center">
            <CheckIcon className="h-5 w-5 mr-2" />
            Settings saved successfully!
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function GeneralSettings({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">System Name</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="Nexxau Safety System"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">System Description</label>
            <textarea
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="Advanced safety monitoring system for construction and industrial sites"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Time Zone</label>
            <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option>UTC-5 (Eastern Time)</option>
              <option>UTC-8 (Pacific Time)</option>
              <option>UTC+0 (GMT)</option>
              <option>UTC+1 (Central European Time)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Format</label>
            <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        <button
          onClick={onSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Save General Settings
        </button>
      </div>
    </div>
  );
}

function NotificationSettings({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Alert Notification Email</label>
            <input
              type="email"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="alerts@nexxau.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">SMS Notifications</label>
            <input
              type="tel"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="+1 (555) 123-4567"
            />
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Notification Types</h4>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                defaultChecked
              />
              <label className="ml-2 block text-sm text-gray-900">Safety violations</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                defaultChecked
              />
              <label className="ml-2 block text-sm text-gray-900">Equipment malfunctions</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">System maintenance</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                defaultChecked
              />
              <label className="ml-2 block text-sm text-gray-900">Daily reports</label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notification Frequency</label>
            <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option>Immediate</option>
              <option>Every 5 minutes</option>
              <option>Every 15 minutes</option>
              <option>Every hour</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        <button
          onClick={onSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Save Notification Settings
        </button>
      </div>
    </div>
  );
}

function SecuritySettings({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
            <input
              type="number"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="30"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              defaultChecked
            />
            <label className="ml-2 block text-sm text-gray-900">Require two-factor authentication</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              defaultChecked
            />
            <label className="ml-2 block text-sm text-gray-900">Force password change every 90 days</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Block access from unknown IP addresses</label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Password Length</label>
            <input
              type="number"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="8"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Failed Login Attempts Before Lockout</label>
            <input
              type="number"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="5"
            />
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        <button
          onClick={onSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Save Security Settings
        </button>
      </div>
    </div>
  );
}

function DataSettings({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Retention Period (days)</label>
            <input
              type="number"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="90"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              defaultChecked
            />
            <label className="ml-2 block text-sm text-gray-900">Enable automatic backups</label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Backup Frequency</label>
            <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Backup Storage Location</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="/backups/nexxau"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Compress backup files</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              defaultChecked
            />
            <label className="ml-2 block text-sm text-gray-900">Encrypt backup files</label>
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        <button
          onClick={onSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Save Data Settings
        </button>
      </div>
    </div>
  );
}

function IntegrationSettings({ onSave }: { onSave: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Integrations</h3>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Slack Integration</h4>
                <p className="text-sm text-gray-500">Send alerts to Slack channels</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-green-600 mr-2">Connected</span>
                <button className="text-red-600 hover:text-red-800 text-sm font-medium">Disconnect</button>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Microsoft Teams</h4>
                <p className="text-sm text-gray-500">Send alerts to Teams channels</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Not connected</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Connect</button>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Webhook Integration</h4>
                <p className="text-sm text-gray-500">Send data to external systems</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Not configured</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Configure</button>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">API Access</h4>
                <p className="text-sm text-gray-500">Manage API keys and access</p>
              </div>
              <div className="flex items-center">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Manage Keys</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        <button
          onClick={onSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Save Integration Settings
        </button>
      </div>
    </div>
  );
} 