'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const email = formData.email.trim().toLowerCase();
      const result = await signIn('credentials', {
        email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'CredentialsSignin') {
          setError(
            'Invalid email or password — or login blocked (expired pilot, suspended company, or user missing in this database). Check the dev server log for lines starting with [auth].'
          );
        } else if (result.error.includes('inactive') || result.error.includes('disabled')) {
          setError('Your account is inactive — contact your administrator');
        } else {
          setError('Invalid email or password');
        }
      } else {
        const session = await getSession();
        const userRole = (session?.user as any)?.role?.toUpperCase();
        
        if (userRole === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else {
          // Always go to the worksite picker first, even if there's only one site.
          // Never skip straight to /dashboard — that bypasses the picker entirely.
          router.push('/company/dashboard');
        }
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Client Login
            </h1>
            <p className="text-sm text-slate-300">
              Access your Nexxau dashboard
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-md p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* suppressHydrationWarning: browser extensions (e.g. password managers) inject attributes like fdprocessedid and cause React 19 hydration noise */}
          <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="you@company.com"
                autoComplete="email"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="block w-full px-3 py-2 pr-10 bg-slate-900/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your password"
                autoComplete="current-password"
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                suppressHydrationWarning
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.58 10.59A2 2 0 0013.41 13.4M9.88 5.09A9.77 9.77 0 0112 4.8c5.74 0 9.4 7.2 9.4 7.2a17.2 17.2 0 01-3.32 4.35M6.61 6.62C3.83 8.35 2.6 12 2.6 12a17.16 17.16 0 004.56 5.27A9.74 9.74 0 0012 19.2c1.37 0 2.67-.28 3.87-.78"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.6 12S6.26 4.8 12 4.8s9.4 7.2 9.4 7.2-3.66 7.2-9.4 7.2S2.6 12 2.6 12z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                suppressHydrationWarning
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white ${
                  isLoading
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isLoading ? 'Logging in...' : 'Log in'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-slate-300 hover:text-white"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-300">
            Terms of Service
          </Link>
          <span className="mx-2 text-xs text-slate-500">•</span>
          <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-300">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
