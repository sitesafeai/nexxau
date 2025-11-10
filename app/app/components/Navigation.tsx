'use client';

import { useSession, signOut } from 'next-auth/react';
import { useAuth } from '../lib/use-auth';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatRoleLabel, isAdminRole, normalizeRole } from '../lib/roles';

export default function Navigation() {
  const { data: session, status } = useSession();
  const { user, hasRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Safe role checking function
  const checkRole = (requiredRoles: string | string[]) => {
    if (typeof hasRole === 'function') {
      return hasRole(requiredRoles);
    }
    return false;
  };

  const normalizedRole = normalizeRole(user?.role);

  const roleBadgeClass = useMemo(() => {
    if (!normalizedRole) return 'bg-gray-700 text-gray-200';
    if (normalizedRole === 'SUPER_ADMIN') return 'bg-purple-900 text-purple-200';
    if (isAdminRole(normalizedRole)) return 'bg-blue-900 text-blue-200';
    if (normalizedRole === 'SUPERVISOR') return 'bg-green-900 text-green-200';
    if (normalizedRole === 'WORKER') return 'bg-amber-900 text-amber-200';
    return 'bg-gray-700 text-gray-200';
  }, [normalizedRole]);

  if (status === 'loading') {
    return (
      <nav className="bg-gray-900 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-white">Nexxau</h1>
              </div>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // During development, show nav even when unauthenticated to avoid redirect loops
  // if (status === 'unauthenticated') { /* temporarily disabled */ }

  return (
    <nav className="bg-gray-900 shadow-lg border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard" className="text-xl font-bold text-white hover:text-blue-400">
                Nexxau
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              
              {checkRole(['ADMIN', 'SITE_ADMIN']) && (
                <Link
                  href="/workflow"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Workflow
                </Link>
              )}
              
              {checkRole(['ADMIN', 'SITE_ADMIN']) && (
                <Link
                  href="/cameras"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Cameras
                </Link>
              )}
              
              {checkRole(['ADMIN', 'SITE_ADMIN', 'SUPERVISOR', 'WORKER']) && (
                <Link
                  href="/dashboard/object-detection"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Safety Monitor
                </Link>
              )}
              
              {checkRole('ADMIN') && (
                <Link
                  href="/admin"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <div className="hidden md:ml-4 md:flex md:items-center">
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-300">
                    {user?.name || user?.email}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass}`}>
                    {formatRoleLabel(user?.role)}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={handleMobileMenuToggle}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800 border-t border-gray-700">
            <Link
              href="/dashboard"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            
            {checkRole(['ADMIN', 'SITE_ADMIN']) && (
              <Link
                href="/workflow"
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Workflow
              </Link>
            )}
            
            {checkRole(['ADMIN', 'SITE_ADMIN']) && (
              <Link
                href="/cameras"
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Cameras
              </Link>
            )}
            
            {checkRole(['ADMIN', 'SITE_ADMIN', 'SUPERVISOR', 'WORKER']) && (
              <Link
                href="/dashboard/object-detection"
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Safety Monitor
              </Link>
            )}
            
            {checkRole('ADMIN') && (
              <Link
                href="/admin"
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            
            <div className="border-t border-gray-700 pt-4 mt-4">
              <div className="px-3 py-2">
                <p className="text-sm text-gray-300">{user?.name || user?.email}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  user?.role === 'admin' ? 'bg-purple-900 text-purple-200' :
                  user?.role === 'site-manager' ? 'bg-blue-900 text-blue-200' :
                  user?.role === 'worker' ? 'bg-green-900 text-green-200' :
                  'bg-gray-700 text-gray-200'
                }`}>
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('-', ' ') : 'User'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
} 