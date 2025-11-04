'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RoleBadge from './RoleBadge';
import { UserRole } from '@/app/lib/permissions';
import { Home, Building2, LayoutDashboard, Settings, LogOut, User } from 'lucide-react';
import { useState } from 'react';

export default function DashboardHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!session?.user) return null;

  const user = session.user as any;
  const userRole = user.role as UserRole;
  const companyId = user.companyId;

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const getDashboardLink = () => {
    // All roles go to /dashboard for worksite view
    // SUPER_ADMIN and COMPANY_ADMIN have their own separate nav links
    return '/dashboard';
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              Nexxau
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {userRole === 'SUPER_ADMIN' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
            
            {userRole === 'COMPANY_ADMIN' && (
              <>
                <Link
                  href="/company/dashboard"
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  Company
                </Link>
                <Link
                  href="/company/analytics"
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Analytics
                </Link>
                <Link
                  href="/company/users"
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                >
                  <User className="h-4 w-4" />
                  Team
                </Link>
              </>
            )}
            
            <Link
              href={getDashboardLink()}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <RoleBadge role={userRole} size="sm" />
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-white">{user.name || 'User'}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg border border-slate-700 shadow-xl py-2">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                  </div>
                  
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

