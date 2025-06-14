'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

const stats = [
  { name: 'Total Clients', value: '89', icon: UserGroupIcon },
  { name: 'Active Sites', value: '234', icon: BuildingOfficeIcon },
  { name: 'Risk Score', value: 'Low', icon: ShieldCheckIcon },
  { name: 'Claims This Month', value: '2', icon: CurrencyDollarIcon },
];

const riskAnalysis = [
  {
    id: 1,
    client: 'Construction Corp A',
    riskLevel: 'Low',
    violations: 2,
    trend: 'decreasing',
    lastUpdated: '2 hours ago',
  },
  {
    id: 2,
    client: 'Manufacturing Co B',
    riskLevel: 'Medium',
    violations: 5,
    trend: 'increasing',
    lastUpdated: '4 hours ago',
  },
  {
    id: 3,
    client: 'Mining Corp C',
    riskLevel: 'High',
    violations: 8,
    trend: 'stable',
    lastUpdated: '1 day ago',
  },
];

const recentClaims = [
  {
    id: 1,
    client: 'Construction Corp A',
    type: 'Safety Violation',
    amount: '$5,000',
    status: 'Pending',
    date: '2 days ago',
  },
  {
    id: 2,
    client: 'Manufacturing Co B',
    type: 'Equipment Damage',
    amount: '$12,000',
    status: 'Approved',
    date: '1 week ago',
  },
  {
    id: 3,
    client: 'Mining Corp C',
    type: 'Safety Violation',
    amount: '$8,000',
    status: 'Under Review',
    date: '2 weeks ago',
  },
];

export default function InsuranceDashboard() {
  return (
    <DashboardLayout userRole="insurance">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Insurance Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Client risk analysis and claims management.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-blue-50 p-3">
                    <stat.icon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                </div>
              </div>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Risk Analysis */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Risk Analysis</h3>
            <p className="mt-1 text-sm text-gray-500">
              Current risk levels and trends for your clients.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul role="list" className="divide-y divide-gray-200">
              {riskAnalysis.map((client) => (
                <li key={client.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {client.riskLevel === 'Low' && (
                          <ShieldCheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                        )}
                        {client.riskLevel === 'Medium' && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        )}
                        {client.riskLevel === 'High' && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{client.client}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-500">
                            Risk Level: {client.riskLevel}
                          </p>
                          <span className="text-sm text-gray-500">•</span>
                          <p className="text-sm text-gray-500">
                            Violations: {client.violations}
                          </p>
                          <span className="text-sm text-gray-500">•</span>
                          <p className="text-sm text-gray-500">
                            Trend: {client.trend}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0">
                      <p className="text-sm text-gray-500">{client.lastUpdated}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recent Claims */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Claims</h3>
            <p className="mt-1 text-sm text-gray-500">
              Latest insurance claims and their status.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul role="list" className="divide-y divide-gray-200">
              {recentClaims.map((claim) => (
                <li key={claim.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{claim.client}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-500">
                            {claim.type}
                          </p>
                          <span className="text-sm text-gray-500">•</span>
                          <p className="text-sm text-gray-500">
                            Amount: {claim.amount}
                          </p>
                          <span className="text-sm text-gray-500">•</span>
                          <p className="text-sm text-gray-500">
                            Status: {claim.status}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0">
                      <p className="text-sm text-gray-500">{claim.date}</p>
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