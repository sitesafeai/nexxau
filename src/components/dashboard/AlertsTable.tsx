'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

const sampleAlerts = [
  { id: 1, location: 'MIA', cause: 'No High Vis Vest', camera: 'Warehouse', danger: 'High', date: 'May 3', manager: '...' },
  { id: 2, location: 'MIA', cause: 'No PPE, Crossed Boundary', camera: 'Port Dock 4', danger: 'High', date: 'Dec 5', manager: '...' },
];

export default function AlertsTable({
  searchTerm
}: { searchTerm: string }) {
  const filteredAlerts = sampleAlerts.filter(alert =>
    Object.values(alert).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Location</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Alert Cause</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Camera #</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Danger</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Manager</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredAlerts.map((alert) => (
              <tr key={alert.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{alert.location}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{alert.cause}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{alert.camera}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500"><span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">{alert.danger}</span></td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{alert.date}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{alert.manager}</td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                  <a href="#" className="text-primary-600 hover:text-primary-900">
                    Details<span className="sr-only">, {alert.cause}</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 