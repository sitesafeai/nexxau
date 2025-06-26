'use client';

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import DashboardLayout from "@/src/components/dashboard/DashboardLayout";
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import PasswordProtect from '@/app/components/PasswordProtect';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { classNames } from '@/lib/utils';

interface PendingUser {
  id: string;
  name?: string | null;
  email: string;
  company?: string | null;
  status: string;
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
    <PasswordProtect>
      <DashboardLayout userRole="admin" onSelect={handleSidebarSelect}>
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Admin Dashboard
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              System overview and management controls.
            </p>
          </div>

          {/* User Approval Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm shadow-lg sm:rounded-lg border border-gray-700">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-white">Pending User Approvals</h3>
              <p className="mt-1 text-sm text-gray-400">
                Approve new users to grant them access to the platform.
              </p>
            </div>
            <div className="flow-root">
              <ul role="list" className="divide-y divide-gray-700">
                {pendingUsers.map((user) => (
                  <li key={user.id} className="flex items-center justify-between gap-x-6 px-4 py-5 sm:px-6">
                    <div className="min-w-0">
                      <div className="flex items-start gap-x-3">
                        <p className="text-sm font-semibold leading-6 text-white">{user.name}</p>
                        <p
                          className={`rounded-md whitespace-nowrap px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            user.status === 'pending'
                              ? 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20'
                              : 'bg-green-500/10 text-green-400 ring-green-500/20'
                          }`}
                        >
                          {user.status}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-400">
                        <p className="whitespace-nowrap">
                          Email: {user.email}
                        </p>
                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                          <circle cx={1} cy={1} r={1} />
                        </svg>
                        <p className="truncate">Company: {user.company}</p>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-x-4">
                      {user.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="hidden rounded-md bg-blue-500 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:block"
                        >
                          Approve<span className="sr-only">, {user.name}</span>
                        </button>
                      )}
                      <Menu as="div" className="relative flex-none">
                        <Menu.Button className="-m-2.5 block p-2.5 text-gray-500 hover:text-gray-900">
                          <span className="sr-only">Open options</span>
                          <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                        </Menu.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                            <Menu.Item>
                              {({ active }) => (
                                <a
                                  href="#"
                                  className={classNames(
                                    active ? 'bg-gray-50' : '',
                                    'block px-3 py-1 text-sm leading-6 text-gray-900'
                                  )}
                                >
                                  View profile<span className="sr-only">, {user.name}</span>
                                </a>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <a
                                  href="#"
                                  className={classNames(
                                    active ? 'bg-gray-50' : '',
                                    'block px-3 py-1 text-sm leading-6 text-gray-900'
                                  )}
                                >
                                  Message<span className="sr-only">, {user.name}</span>
                                </a>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-4 sm:px-6 text-right">
              <a href="#" className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                View all<span className="sr-only"> pending approvals</span>
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="relative overflow-hidden rounded-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700 px-4 pb-12 pt-5 shadow-lg sm:px-6 sm:pt-6"
              >
                <dt>
                  <div className="absolute rounded-md bg-blue-500/10 p-3">
                    <stat.icon className="h-6 w-6 text-blue-400" aria-hidden="true" />
                  </div>
                  <p className="ml-16 truncate text-sm font-medium text-gray-400">{stat.name}</p>
                </dt>
                <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                </dd>
              </div>
            ))}
          </div>

          {/* System Metrics */}
          <div className="bg-gray-800/50 backdrop-blur-sm shadow-lg sm:rounded-lg border border-gray-700">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-white">System Metrics</h3>
              <p className="mt-1 text-sm text-gray-400">
                Real-time system performance indicators.
              </p>
            </div>
            <div className="border-t border-gray-700">
              <dl className="divide-y divide-gray-700">
                {systemMetrics.map((metric) => (
                  <div key={metric.name} className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-400">{metric.name}</dt>
                    <dd className="mt-1 text-sm text-white sm:col-span-2 sm:mt-0">
                      <div className="flex items-center">
                        <span className="font-medium">{metric.value}</span>
                        <span
                          className={`ml-2 text-sm ${
                            metric.changeType === 'increase' ? 'text-green-400' : 'text-red-400'
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
          <div className="bg-gray-800/50 backdrop-blur-sm shadow-lg sm:rounded-lg border border-gray-700">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-white">Recent Alerts</h3>
              <p className="mt-1 text-sm text-gray-400">
                Latest system alerts and notifications.
              </p>
            </div>
            <div className="border-t border-gray-700">
              <ul role="list" className="divide-y divide-gray-700">
                {recentAlerts.map((alert) => (
                  <li key={alert.id} className="flex items-center justify-between gap-x-6 px-4 py-5 sm:px-6">
                    <div className="min-w-0">
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
                          <p className="text-sm font-medium text-white">{alert.site}</p>
                          <p className="text-sm text-gray-400">{alert.description}</p>
                        </div>
                      </div>
                      <div className="ml-2 flex flex-shrink-0">
                        <p className="text-sm text-gray-400">{alert.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PasswordProtect>
  );
} 