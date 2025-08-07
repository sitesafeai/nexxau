'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon,
  BuildingOfficeIcon,
  VideoCameraIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  selected: string;
  onSelect: (key: string) => void;
}

const navigation = [
  {
    name: 'Overview',
    key: 'overview',
    icon: HomeIcon,
  },
  {
    name: 'Sites',
    key: 'sites',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Cameras',
    key: 'cameras',
    icon: VideoCameraIcon,
  },
  {
    name: 'Alerts',
    key: 'alerts',
    icon: BellIcon,
  },
  {
    name: 'Reports',
    key: 'reports',
    icon: ChartBarIcon,
  },
  {
    name: 'Workflows',
    key: 'workflows',
    icon: WrenchScrewdriverIcon,
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
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-700 bg-gray-900">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <img
              className="h-8 w-auto"
              src="/nexxau-logo.png"
              alt="Nexxau"
            />
            <span className="ml-2 text-xl font-bold text-white">Nexxau</span>
          </div>
          <nav className="mt-5 flex-1 space-y-1 bg-gray-900 px-2">
            {navigation.map((item) => (
                    <button
                key={item.key}
                    onClick={() => onSelect(item.key)}
                    className={`group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md ${
                      selected === item.key
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-6 w-6 flex-shrink-0 ${
                        selected === item.key
                      ? 'text-blue-400'
                      : 'text-gray-400 group-hover:text-gray-300'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
} 