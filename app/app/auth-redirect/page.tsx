'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Auth Redirect Page
 * Redirects users to the appropriate dashboard based on their role
 */
export default function AuthRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any).role;

      switch (userRole) {
        case 'SUPER_ADMIN':
          router.push('/super-admin');
          break;
        case 'COMPANY_ADMIN':
          router.push('/company/dashboard');
          break;
        case 'SITE_ADMIN':
        case 'SUPERVISOR':
        case 'WORKER':
        case 'VIEWER':
        default:
          router.push('/dashboard');
          break;
      }
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}

