'use client';

import { useEffect, useState } from "react";
import DashboardLayout from "@/src/components/dashboard/DashboardLayout";
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface PendingUser {
  id: string;
  name?: string | null;
  email: string;
  company?: string | null;
}

const stats = [
  { name: 'Total Sites', value: '156', icon: BuildingOfficeIcon },
  { name: 'Active Users', value: '1,234', icon: UserGroupIcon },
  { name: 'Monthly Revenue', value: '$45,678', icon: CurrencyDollarIcon },
  { name: 'System Health', value: '100%', icon: CheckCircleIcon },
];

const recentAlerts = [
  {
    id: 1,
    type: 'critical',
    site: 'Construction Site A',
    description: 'Multiple safety violations detected',
    time: '1 hour ago',
  },
  {
    id: 2,
    type: 'warning',
    site: 'Manufacturing Plant B',
    description: 'System maintenance required',
    time: '3 hours ago',
  },
  {
    id: 3,
    type: 'info',
    site: 'Mining Site C',
    description: 'New user registration',
    time: '5 hours ago',
  },
];

const systemMetrics = [
  { name: 'API Response Time', value: '45ms', change: '+2.5%', changeType: 'increase' },
  { name: 'Error Rate', value: '0.1%', change: '-0.2%', changeType: 'decrease' },
  { name: 'Active Sessions', value: '892', change: '+12%', changeType: 'increase' },
  { name: 'Storage Usage', value: '68%', change: '+5%', changeType: 'increase' },
];

export default function AdminDashboard() {
  // State for unapproved users
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch unapproved users
  useEffect(() => {
    async function fetchPendingUsers() {
      setLoading(true);
      const res = await fetch("/api/admin/unapproved-users");
      const data = await res.json();
      setPendingUsers(data.users || []);
      setLoading(false);
    }
    fetchPendingUsers();
  }, []);

  // Approve user handler
  async function handleApprove(userId: string) {
    const res = await fetch("/api/admin/approve-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setPendingUsers((users) => users.filter((u: PendingUser) => u.id !== userId));
      window.alert("User approved!");
    } else {
      window.alert("Failed to approve user.");
    }
  }

  // Handle sidebar selection
  const handleSidebarSelect = (key: string, tab?: string) => {
    if (key === 'blog' && tab === 'create') {
      window.location.href = '/admin/blog/new';
    }
  };

  return (
    <DashboardLayout userRole="admin" onSelect={handleSidebarSelect}>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Admin Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            System overview and management controls.
          </p>
        </div>

        {/* User Approval Section */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Pending User Approvals</h3>
            <p className="mt-1 text-sm text-gray-500">
              Approve new users to grant them access to the platform.
            </p>
          </div>
          <div className="border-t border-gray-200 overflow-x-auto">
            {loading ? (
              <div className="p-4 text-gray-500">Loading...</div>
            ) : pendingUsers.length === 0 ? (
              <div className="p-4 text-gray-500">No users pending approval.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingUsers.map((user: PendingUser) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.company || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="rounded-md bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
            >
              <dt>
                <div className="absolute rounded-md bg-blue-50 p-3">
                  <stat.icon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{stat.name}</p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </dd>
            </div>
          ))}
        </div>

        {/* System Metrics */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">System Metrics</h3>
            <p className="mt-1 text-sm text-gray-500">
              Real-time system performance indicators.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              {systemMetrics.map((metric) => (
                <div key={metric.name} className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">{metric.name}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    <div className="flex items-center">
                      <span className="font-medium">{metric.value}</span>
                      <span
                        className={`ml-2 text-sm ${
                          metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {metric.change}
                      </span>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Alerts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Latest system alerts and notifications.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul role="list" className="divide-y divide-gray-200">
              {recentAlerts.map((alert) => (
                <li key={alert.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {alert.type === 'critical' && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                        )}
                        {alert.type === 'warning' && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        )}
                        {alert.type === 'info' && (
                          <ChartBarIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{alert.site}</p>
                        <p className="text-sm text-gray-500">{alert.description}</p>
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0">
                      <p className="text-sm text-gray-500">{alert.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 