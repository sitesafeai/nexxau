'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { 
  BuildingOfficeIcon, 
  VideoCameraIcon, 
  BellIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  CogIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Site {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive' | 'maintenance';
  cameras: number;
  alerts: number;
  lastActivity: string;
  safetyScore: number;
}

interface Camera {
  id: string;
  name: string;
  site: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  alerts: number;
}

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  site: string;
  camera: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'acknowledged';
  description: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'active' | 'inactive';
  lastLogin: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sites, setSites] = useState<Site[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setSites([
        {
          id: '1',
          name: 'Downtown Construction Site',
          address: '123 Main St, Downtown, NY',
          status: 'active',
          cameras: 8,
          alerts: 2,
          lastActivity: '2 hours ago',
          safetyScore: 85
        },
        {
          id: '2',
          name: 'Industrial Warehouse',
          address: '456 Industrial Blvd, Queens, NY',
          status: 'active',
          cameras: 12,
          alerts: 0,
          lastActivity: '1 hour ago',
          safetyScore: 92
        },
        {
          id: '3',
          name: 'Highway Bridge Project',
          address: '789 Bridge Rd, Brooklyn, NY',
          status: 'maintenance',
          cameras: 6,
          alerts: 1,
          lastActivity: '30 minutes ago',
          safetyScore: 78
        }
      ]);

      setCameras([
        {
          id: '1',
          name: 'Main Entrance',
          site: 'Downtown Construction Site',
          status: 'online',
          lastSeen: '2 minutes ago',
          alerts: 0
        },
        {
          id: '2',
          name: 'Safety Zone A',
          site: 'Downtown Construction Site',
          status: 'online',
          lastSeen: '1 minute ago',
          alerts: 2
        },
        {
          id: '3',
          name: 'Loading Dock',
          site: 'Industrial Warehouse',
          status: 'offline',
          lastSeen: '5 minutes ago',
          alerts: 0
        }
      ]);

      setAlerts([
        {
          id: '1',
          type: 'Safety Violation',
          severity: 'high',
          site: 'Downtown Construction Site',
          camera: 'Safety Zone A',
          timestamp: '2 minutes ago',
          status: 'active',
          description: 'Worker not wearing hard hat in restricted area'
        },
        {
          id: '2',
          type: 'Equipment Malfunction',
          severity: 'medium',
          site: 'Highway Bridge Project',
          camera: 'Crane Camera',
          timestamp: '15 minutes ago',
          status: 'acknowledged',
          description: 'Crane movement detected outside operational hours'
        }
      ]);

      setUsers([
        {
          id: '1',
          name: 'John Smith',
          email: 'john@nexxau.com',
          role: 'admin',
          status: 'active',
          lastLogin: '1 hour ago'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah@nexxau.com',
          role: 'manager',
          status: 'active',
          lastLogin: '30 minutes ago'
        },
        {
          id: '3',
          name: 'Mike Wilson',
          email: 'mike@nexxau.com',
          role: 'viewer',
          status: 'active',
          lastLogin: '2 hours ago'
        }
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
        return 'bg-green-900 text-green-300';
      case 'inactive':
      case 'offline':
        return 'bg-red-900 text-red-300';
      case 'maintenance':
        return 'bg-yellow-900 text-yellow-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900 text-red-300';
      case 'high':
        return 'bg-orange-900 text-orange-300';
      case 'medium':
        return 'bg-yellow-900 text-yellow-300';
      case 'low':
        return 'bg-blue-900 text-blue-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-900 text-purple-300';
      case 'manager':
        return 'bg-blue-900 text-blue-300';
      case 'viewer':
        return 'bg-green-900 text-green-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">🔐 Nexxau Operations Center</h1>
            <p className="text-gray-300">Internal command center for platform management & client support</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New Site
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', name: 'Operations', icon: ChartBarIcon },
              { key: 'sites', name: 'Worksites', icon: BuildingOfficeIcon },
              { key: 'cameras', name: 'Camera Mgmt', icon: VideoCameraIcon },
              { key: 'alerts', name: 'Alert History', icon: BellIcon },
              { key: 'users', name: 'User Mgmt', icon: UserGroupIcon },
              { key: 'settings', name: 'System Config', icon: CogIcon },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'overview' && <OverviewTab sites={sites} cameras={cameras} alerts={alerts} users={users} />}
          {activeTab === 'sites' && <SitesTab sites={sites} getStatusColor={getStatusColor} />}
          {activeTab === 'cameras' && <CamerasTab cameras={cameras} getStatusColor={getStatusColor} />}
          {activeTab === 'alerts' && <AlertsTab alerts={alerts} getSeverityColor={getSeverityColor} />}
          {activeTab === 'users' && <UsersTab users={users} getRoleColor={getRoleColor} />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>

        {/* Internal Operations Panel */}
        <div className="mt-8 bg-gray-800 rounded-lg shadow border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">🔧 Internal Operations</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium">System Logs</div>
                <div className="text-sm text-blue-200">View backend logs & errors</div>
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-medium">AI Model Config</div>
                <div className="text-sm text-green-200">YOLO settings & thresholds</div>
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">💳</div>
                <div className="font-medium">Billing & Licensing</div>
                <div className="text-sm text-purple-200">Client subscriptions & payments</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function OverviewTab({ sites, cameras, alerts, users }: { sites: Site[], cameras: Camera[], alerts: Alert[], users: User[] }) {
  const activeSites = sites.filter(site => site.status === 'active').length;
  const onlineCameras = cameras.filter(camera => camera.status === 'online').length;
  const activeAlerts = alerts.filter(alert => alert.status === 'active').length;
  const activeUsers = users.filter(user => user.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-900 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Active Worksites</p>
              <p className="text-2xl font-bold text-white">{activeSites}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-900 rounded-lg">
              <VideoCameraIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Online Cameras</p>
              <p className="text-2xl font-bold text-white">{onlineCameras}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-red-900 rounded-lg">
              <BellIcon className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Unresolved Alerts</p>
              <p className="text-2xl font-bold text-white">{activeAlerts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-900 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Client Accounts</p>
              <p className="text-2xl font-bold text-white">{activeUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Activity Log */}
      <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">🔧 System Activity Log</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full ${alert.severity === 'high' || alert.severity === 'critical' ? 'bg-red-900' : 'bg-yellow-900'}`}>
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">{alert.type}</p>
                    <p className="text-sm text-gray-400">{alert.site} - {alert.camera}</p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {alert.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SitesTab({ sites, getStatusColor }: { sites: Site[], getStatusColor: (status: string) => string }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">🏗️ Worksite Management</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Worksite
        </button>
      </div>

      <div className="bg-gray-800 shadow border border-gray-700 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">All Worksites</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
                              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Worksite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cameras</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Alerts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Safety Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {sites.map((site) => (
                <tr key={site.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">{site.name}</div>
                      <div className="text-sm text-gray-400">{site.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(site.status)}`}>
                      {site.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{site.cameras}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{site.alerts}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-600 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${site.safetyScore >= 90 ? 'bg-green-400' : site.safetyScore >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${site.safetyScore}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-white">{site.safetyScore}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{site.lastActivity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-indigo-400 hover:text-indigo-300">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CamerasTab({ cameras, getStatusColor }: { cameras: Camera[], getStatusColor: (status: string) => string }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">📹 Camera Management</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Camera
        </button>
      </div>

      <div className="bg-gray-800 shadow border border-gray-700 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">All Cameras</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
                              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Camera</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Alerts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {cameras.map((camera) => (
                <tr key={camera.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{camera.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{camera.site}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(camera.status)}`}>
                      {camera.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{camera.alerts}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{camera.lastSeen}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-indigo-400 hover:text-indigo-300">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AlertsTab({ alerts, getSeverityColor }: { alerts: Alert[], getSeverityColor: (severity: string) => string }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">🚨 Alert History</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Alert Rule
        </button>
      </div>

      <div className="bg-gray-800 shadow border border-gray-700 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">All Alerts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
                              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Camera</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{alert.type}</div>
                    <div className="text-sm text-gray-400">{alert.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{alert.site}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{alert.camera}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      alert.status === 'active' ? 'bg-red-900 text-red-300' :
                      alert.status === 'resolved' ? 'bg-green-900 text-green-300' :
                      'bg-yellow-900 text-yellow-300'
                    }`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{alert.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-green-400 hover:text-green-300">
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, getRoleColor }: { users: User[], getRoleColor: (role: string) => string }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">👥 User Management</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      <div className="bg-gray-800 shadow border border-gray-700 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">All Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
                              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.lastLogin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-indigo-400 hover:text-indigo-300">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">🔧 System Configuration</h2>
      
      <div className="bg-gray-800 shadow border border-gray-700 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">General Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300">System Name</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="Nexxau Safety System"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">Alert Notification Email</label>
            <input
              type="email"
              className="mt-1 block w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="alerts@nexxau.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">Data Retention (days)</label>
            <input
              type="number"
              className="mt-1 block w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue="90"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
              defaultChecked
            />
            <label className="ml-2 block text-sm text-gray-300">Enable real-time alerts</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
              defaultChecked
            />
            <label className="ml-2 block text-sm text-gray-300">Enable automatic backups</label>
          </div>
          
          <div className="pt-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 