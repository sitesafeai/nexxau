'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  BellIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Sidebar from './Sidebar';

const navigation = {
  user: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Sites', href: '/dashboard/sites', icon: BuildingOfficeIcon },
    { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon },
    { name: 'Alerts', href: '/dashboard/alerts', icon: BellIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
  ],
  admin: [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Sites', href: '/admin/sites', icon: BuildingOfficeIcon },
    { name: 'Users', href: '/admin/users', icon: UserGroupIcon },
    { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon },
    { name: 'Alerts', href: '/admin/alerts', icon: BellIcon },
    { name: 'Blog', href: '/admin/blog', icon: DocumentTextIcon },
    { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
  ],
  insurance: [
    { name: 'Dashboard', href: '/insurance', icon: HomeIcon },
    { name: 'Clients', href: '/insurance/clients', icon: BuildingOfficeIcon },
    { name: 'Risk Analysis', href: '/insurance/risk', icon: ChartBarIcon },
    { name: 'Claims', href: '/insurance/claims', icon: ShieldCheckIcon },
    { name: 'Settings', href: '/insurance/settings', icon: Cog6ToothIcon },
  ],
};

export default function DashboardLayout({
  children,
  userRole = 'user',
  onSelect,
}: {
  children: React.ReactNode;
  userRole?: 'user' | 'admin' | 'insurance';
  onSelect?: (key: string, tab?: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected, setSelected] = useState('site-overview');
  const pathname = usePathname();
  const { data: session } = useSession();

  const currentNavigation = navigation[userRole];

  // Handler to update selected and call onSelect
  const handleSidebarSelect = (key: string, tab?: string) => {
    setSelected(tab ? `${key}-${tab}` : key);
    if (onSelect) onSelect(key, tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900/95 backdrop-blur-md border-r border-gray-700/50 px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <img
                      className="h-8 w-auto"
                      src="/logo.png"
                      alt="Nexxau"
                    />
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {currentNavigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors duration-200
                                  ${pathname === item.href
                                    ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                  }
                                `}
                              >
                                <item.icon
                                  className={`h-6 w-6 shrink-0 ${
                                    pathname === item.href ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'
                                  }`}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-700/50 bg-gray-900/95 backdrop-blur-md px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <img
              className="h-8 w-auto"
              src="/logo.png"
              alt="Nexxau"
            />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {currentNavigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors duration-200
                          ${pathname === item.href
                            ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            pathname === item.href ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <button
                  onClick={() => signOut()}
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors duration-200"
                >
                  <XMarkIcon
                    className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-white"
                    aria-hidden="true"
                  />
                  Sign out
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-white transition-colors duration-200 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-700/50 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Profile dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="-m-1.5 flex items-center p-1.5 hover:bg-gray-700/50 rounded-full transition-colors duration-200"
                  id="user-menu-button"
                >
                  <span className="sr-only">Open user menu</span>
                  <img
                    className="h-8 w-8 rounded-full bg-gray-800 ring-1 ring-gray-700"
                    src={session?.user?.image || "https://avatars.githubusercontent.com/u/1?v=4"}
                    alt=""
                  />
                  <span className="hidden lg:flex lg:items-center">
                    <span
                      className="ml-4 text-sm font-semibold leading-6 text-white"
                      aria-hidden="true"
                    >
                      {session?.user?.name || 'User'}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Sidebar for desktop */}
      <Sidebar selected={selected} onSelect={handleSidebarSelect} />
    </div>
  );
} 