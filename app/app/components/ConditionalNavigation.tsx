'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname() || '';

  // Render app Navigation only on internal app routes, not on marketing pages
  // Exclude dashboard routes as they have their own sidebar navigation
  const appRoutes = [
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