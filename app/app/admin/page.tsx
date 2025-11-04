'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to companies page as the default admin view
    router.push('/admin/companies');
  }, [router]);

  return null;
}

