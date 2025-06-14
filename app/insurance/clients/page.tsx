'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Client {
  id: number;
  name: string;
  industry: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  activeSites: number;
  violations: number;
  lastUpdated: string;
  status: 'Active' | 'Suspended';
  complianceScore: number;
  complianceLabel: 'HighCompliance' | 'MediumCompliance' | 'LowCompliance';
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  workers: number;
  averageCharge: number;
  totalAlerts: number;
  criticalAlerts: number;
  lastAlertDate: string;
}

const clientLabels = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-red-100 text-red-800',
  Active: 'bg-blue-100 text-blue-800',
  Suspended: 'bg-gray-100 text-gray-800',
  HighCompliance: 'bg-green-100 text-green-800',
  MediumCompliance: 'bg-yellow-100 text-yellow-800',
  LowCompliance: 'bg-red-100 text-red-800',
};

const riskColors = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-red-100 text-red-800'
};

const clients: Client[] = [
  {
    id: 1,
    name: 'Construction Corp A',
    industry: 'Construction',
    riskLevel: 'Medium',
    activeSites: 15,
    violations: 3,
    lastUpdated: '1 hour ago',
    status: 'Active',
    complianceScore: 85,
    complianceLabel: 'HighCompliance',
    contact: {
      name: 'John Smith',
      email: 'john.smith@constructioncorp.com',
      phone: '(555) 123-4567'
    },
    workers: 250,
    averageCharge: 1500,
    totalAlerts: 12,
    criticalAlerts: 2,
    lastAlertDate: '2024-03-15'
  },
  {
    id: 2,
    name: 'Manufacturing Co B',
    industry: 'Manufacturing',
    riskLevel: 'Medium',
    activeSites: 22,
    violations: 5,
    lastUpdated: '4 hours ago',
    status: 'Active',
    complianceScore: 78,
    complianceLabel: 'MediumCompliance',
    contact: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@manufacturingco.com',
      phone: '(555) 987-6543'
    },
    workers: 450,
    averageCharge: 2200,
    totalAlerts: 18,
    criticalAlerts: 3,
    lastAlertDate: '2024-03-14'
  },
  {
    id: 3,
    name: 'Healthcare Services C',
    industry: 'Healthcare',
    riskLevel: 'Low',
    activeSites: 8,
    violations: 1,
    lastUpdated: '2 days ago',
    status: 'Active',
    complianceScore: 92,
    complianceLabel: 'HighCompliance',
    contact: {
      name: 'Michael Brown',
      email: 'michael.brown@healthcareservices.com',
      phone: '(555) 456-7890'
    },
    workers: 120,
    averageCharge: 1800,
    totalAlerts: 5,
    criticalAlerts: 0,
    lastAlertDate: '2024-03-13'
  }
];

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const router = useRouter();

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Insurance Clients</h2>
            <p className="text-sm text-gray-500">
              View and manage all insurance clients and their safety data.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 min-w-0">
              <div className="relative text-gray-400 focus-within:text-gray-500">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Client List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <li key={client.id}>
                  <div
                    className={`block hover:bg-gray-50 cursor-pointer ${
                      selectedClientId === client.id ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {client.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              riskColors[client.riskLevel]
                            }`}
                          >
                            <ShieldCheckIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                            {client.riskLevel}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              clientLabels[client.complianceLabel as keyof typeof clientLabels]
                            }`}
                          >
                            <ChartBarIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                            {client.complianceScore}%
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <UserGroupIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                            {client.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <BuildingOfficeIcon className="mr-1.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                            {client.activeSites} Active Sites
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <ShieldCheckIcon className="mr-1.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                            {client.violations} Violations
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <ChartBarIcon className="mr-1.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                          Last Updated: {client.lastUpdated}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Client Details - Expanded */}
                  {selectedClientId === client.id && (
                    <div className="bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                          Client Details
                        </h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              // Export client data to CSV
                              const data = [
                                ['Name', client.name],
                                ['Industry', client.industry],
                                ['Risk Level', client.riskLevel],
                                ['Active Sites', client.activeSites],
                                ['Violations', client.violations],
                                ['Compliance Score', `${client.complianceScore}%`],
                                ['Status', client.status],
                                ['Workers', client.workers],
                                ['Average Charge', `$${client.averageCharge}`],
                                ['Total Alerts', client.totalAlerts],
                                ['Critical Alerts', client.criticalAlerts],
                                ['Last Alert Date', client.lastAlertDate],
                                ['Contact Name', client.contact.name],
                                ['Contact Email', client.contact.email],
                                ['Contact Phone', client.contact.phone]
                              ];
                              
                              const csv = data.map(row => row.join(',')).join('\n');
                              const blob = new Blob([csv], { type: 'text/csv' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${client.name.replace(/\s+/g, '_')}_details.csv`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                            Export Details
                          </button>
                          <button
                            onClick={() => {
                              // Navigate to alerts history
                              router.push(`/insurance/clients/${client.id}/alerts`);
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <BellIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                            View Alerts
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Industry</dt>
                          <dd className="mt-1 text-sm text-gray-900">{client.industry}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {client.contact.name}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {client.contact.email}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {client.contact.phone}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Workers</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {client.workers}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Average Charge</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            ${client.averageCharge.toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Total Alerts</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {client.totalAlerts}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Critical Alerts</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {client.criticalAlerts}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Last Alert Date</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {client.lastAlertDate}
                          </dd>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
