'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  site: string;
  createdAt: string;
}

// Mock data for demonstration
const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'High Speed Alert',
    description: 'Vehicle exceeding speed limit in Zone A',
    severity: 'HIGH',
    status: 'ACTIVE',
    site: 'Main Warehouse',
    createdAt: '6/8/2025'
  },
  {
    id: '2',
    title: 'Proximity Warning',
    description: 'Forklift too close to pedestrian',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    site: 'Loading Area',
    createdAt: '6/8/2025'
  },
  {
    id: '3',
    title: 'Equipment Maintenance',
    description: 'Forklift #123 due for maintenance',
    severity: 'MEDIUM',
    status: 'ACTIVE',
    site: 'Main Warehouse',
    createdAt: '6/7/2025'
  }
];

export default function ActiveAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [search, setSearch] = useState('');

  const filteredAlerts = alerts.filter(alert => 
    alert.title.toLowerCase().includes(search.toLowerCase()) ||
    alert.description.toLowerCase().includes(search.toLowerCase()) ||
    alert.site.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = (id: string, newStatus: Alert['status']) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, status: newStatus } : alert
    ));
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'HIGH':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'MEDIUM':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'LOW':
        return <InformationCircleIcon className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Active Alerts</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all active alerts in your sites.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-4 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
                      Alert
                    </th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-semibold text-gray-900">
                      Severity
                    </th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-semibold text-gray-900">
                      Site
                    </th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-semibold text-gray-900">
                      Created
                    </th>
                    <th scope="col" className="relative py-4 pl-3 pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredAlerts.map((alert) => (
                    <tr 
                      key={alert.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-sm">
                        <div className="font-medium text-gray-900">{alert.title}</div>
                        <div className="text-gray-500 mt-1">{alert.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-sm text-gray-500">
                        <div className="flex items-center">
                          {getSeverityIcon(alert.severity)}
                          <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                            ${alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'}`}>
                            {alert.severity}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${alert.status === 'ACTIVE' ? 'bg-red-100 text-red-800' :
                            alert.status === 'ACKNOWLEDGED' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-sm text-gray-500">
                        {alert.site}
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-sm text-gray-500">
                        {alert.createdAt}
                      </td>
                      <td className="relative whitespace-nowrap py-5 pl-3 pr-6 text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {alert.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(alert.id, 'ACKNOWLEDGED');
                                }}
                                className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50"
                              >
                                <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(alert.id, 'RESOLVED');
                                }}
                                className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50"
                              >
                                <XCircleIcon className="h-5 w-5" aria-hidden="true" />
                              </button>
                            </>
                          )}
                          {alert.status === 'ACKNOWLEDGED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(alert.id, 'RESOLVED');
                              }}
                              className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50"
                            >
                              <XCircleIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{selectedAlert.title}</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedAlert.description}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Severity</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${selectedAlert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        selectedAlert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        selectedAlert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'}`}>
                      {selectedAlert.severity}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${selectedAlert.status === 'ACTIVE' ? 'bg-red-100 text-red-800' :
                        selectedAlert.status === 'ACKNOWLEDGED' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'}`}>
                      {selectedAlert.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Site</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedAlert.site}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedAlert.createdAt}</dd>
                </div>
              </dl>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              {selectedAlert.status === 'ACTIVE' && (
                <>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedAlert.id, 'ACKNOWLEDGED');
                      setSelectedAlert(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedAlert.id, 'RESOLVED');
                      setSelectedAlert(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Resolve
                  </button>
                </>
              )}
              {selectedAlert.status === 'ACKNOWLEDGED' && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedAlert.id, 'RESOLVED');
                    setSelectedAlert(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Resolve
                </button>
              )}
              <button
                onClick={() => setSelectedAlert(null)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 