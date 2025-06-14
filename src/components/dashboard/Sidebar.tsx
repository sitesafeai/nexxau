'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  selected: string;
  onSelect: (key: string, tab?: string) => void;
}

const navigation = [
  {
    name: 'Site Overview',
    key: 'site-overview',
    icon: HomeIcon,
    tabs: [
      { name: 'Overview', key: 'overview' },
      { name: 'Alerts', key: 'alerts' },
      { name: 'Monitoring', key: 'monitoring' },
      { name: 'Reports', key: 'reports' },
      { name: 'Sites', key: 'sites' },
    ],
  },
  {
    name: 'Active Alerts',
    key: 'active-alerts',
    icon: BellIcon,
  },
  {
    name: 'Alert Rules',
    key: 'alert-rules',
    icon: WrenchScrewdriverIcon,
  },
  {
    name: 'Alert History',
    key: 'alert-history',
    icon: ArrowLeftOnRectangleIcon,
  },
  {
    name: 'Camera Feed',
    key: 'camera-feed',
    icon: VideoCameraIcon,
  },
  {
    name: 'Reports & Analytics',
    key: 'reports-analytics',
    icon: ChartBarIcon,
  },
  {
    name: 'Workflow Builder',
    key: 'workflow',
    icon: DocumentTextIcon,
  },
  {
    name: 'Blog',
    key: 'blog',
    icon: DocumentTextIcon,
    tabs: [
      { name: 'All Posts', key: 'all-posts' },
      { name: 'Create Blog', key: 'create' },
    ],
  },
  {
    name: 'Settings',
    key: 'settings',
    icon: CogIcon,
  },
];

export default function Sidebar({ selected, onSelect }: SidebarProps) {
  return (
    <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <img
              className="h-8 w-auto"
              src="/logo.png"
              alt="SiteSafe"
            />
          </div>
          <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
            {navigation.map((item) => (
              <div key={item.key}>
                {item.tabs ? (
                  <div>
                    <button
                      onClick={() => onSelect(item.key)}
                      className={`group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md ${
                        selected.startsWith(item.key)
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-6 w-6 flex-shrink-0 ${
                          selected.startsWith(item.key)
                            ? 'text-gray-500'
                            : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </button>
                    {selected.startsWith(item.key) && (
                      <div className="mt-1 space-y-1 px-2">
                        {item.tabs.map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => onSelect(item.key, tab.key)}
                            className={`group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md ${
                              selected === `${item.key}-${tab.key}`
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {tab.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => onSelect(item.key)}
                    className={`group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md ${
                      selected === item.key
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-6 w-6 flex-shrink-0 ${
                        selected === item.key
                          ? 'text-gray-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </button>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
} 