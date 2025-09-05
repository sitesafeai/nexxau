'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname() || '';

  // Render app Navigation only on internal app routes, not on marketing pages
  const appRoutes = [
    '/dashboard',
    '/workflow',
    '/cameras',
    '/admin',
    '/user-dashboard',
    '/onboarding',
    '/forbidden',
    '/forgot-password',
  ];

  const shouldShowAppNav = appRoutes.some((prefix) => pathname.startsWith(prefix));

  if (!shouldShowAppNav) return null;
  return <Navigation />;
}