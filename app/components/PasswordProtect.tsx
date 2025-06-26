'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PasswordProtectProps {
  children: React.ReactNode;
}

const CORRECT_PASSWORD = 'Flamengo';

export const dynamic = "force-dynamic";

export default function PasswordProtect({ children }: PasswordProtectProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasWrongPassword = searchParams.get('password') === 'incorrect';

  useEffect(() => {
    // Check if already authenticated (e.g., from session storage)
    const storedAuth = sessionStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      return;
    }

    let passwordAttempt = prompt(
      hasWrongPassword
        ? 'Wrong password. Please try again:'
        : 'Please enter the password to access this page:'
    );

    if (passwordAttempt === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('isAuthenticated', 'true');
      // Clear any 'wrong password' query param on successful login
      router.replace(window.location.pathname, undefined);
    } else {
      // Redirect back to previous page or home if no previous page
      const previousPath = document.referrer || '/';
      // Add query param to indicate wrong password
      router.replace(`${previousPath}?password=incorrect`);
    }
  }, [router, hasWrongPassword]); // Re-run effect if router or wrong password status changes

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        {hasWrongPassword ? (
          <p className="text-red-500">Wrong password. Redirecting...</p>
        ) : (
          <p>Please enter password...</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
} 