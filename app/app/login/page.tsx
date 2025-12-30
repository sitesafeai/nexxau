'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password');
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
          router.push('/dashboard');
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

          <form onSubmit={handleSubmit} className="space-y-6">
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
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="block w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
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
