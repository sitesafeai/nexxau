'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Account claiming form state
  const [claimData, setClaimData] = useState({
    companyUsername: '',
    worksiteName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: loginData.email,
        password: loginData.password,
        redirect: false,
        callbackUrl: '/dashboard'
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate passwords match
    if (claimData.password !== claimData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/claim-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyUsername: claimData.companyUsername,
          worksiteName: claimData.worksiteName,
          email: claimData.email,
          password: claimData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Account claimed successfully! You can now log in.');
        setIsClaiming(false);
        setClaimData({
          companyUsername: '',
          worksiteName: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      } else {
        setError(data.error || 'Failed to claim account');
      }
    } catch (error) {
      setError('An error occurred while claiming your account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Nexxau</h2>
          <p className="mt-2 text-gray-400">Safety Monitoring Platform</p>
        </div>

        {/* Toggle between Login and Account Claiming */}
        <div className="bg-gray-800 rounded-lg p-1">
          <div className="flex">
            <button
              onClick={() => setIsClaiming(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isClaiming
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsClaiming(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isClaiming
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Claim Account
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Login Form */}
        {!isClaiming && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white transition-colors ${
                  isLoading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                First time here?{' '}
                <button
                  type="button"
                  onClick={() => setIsClaiming(true)}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Set up your account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Account Claiming Form */}
        {isClaiming && (
          <form onSubmit={handleAccountClaim} className="space-y-6">
            <div>
              <label htmlFor="companyUsername" className="block text-sm font-medium text-gray-300">
                Company Username
              </label>
              <input
                id="companyUsername"
                name="companyUsername"
                type="text"
                required
                value={claimData.companyUsername}
                onChange={(e) => setClaimData({ ...claimData, companyUsername: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., buildsafeinc"
              />
            </div>

            <div>
              <label htmlFor="worksiteName" className="block text-sm font-medium text-gray-300">
                Worksite Name
              </label>
              <input
                id="worksiteName"
                name="worksiteName"
                type="text"
                required
                value={claimData.worksiteName}
                onChange={(e) => setClaimData({ ...claimData, worksiteName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., downtown-site-a"
              />
            </div>

            <div>
              <label htmlFor="claimEmail" className="block text-sm font-medium text-gray-300">
                Your Email
              </label>
              <input
                id="claimEmail"
                name="email"
                type="email"
                required
                value={claimData.email}
                onChange={(e) => setClaimData({ ...claimData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="claimPassword" className="block text-sm font-medium text-gray-300">
                Choose Password
              </label>
              <div className="relative mt-1">
                <input
                  id="claimPassword"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={claimData.password}
                  onChange={(e) => setClaimData({ ...claimData, password: e.target.value })}
                  className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Choose a password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <div className="relative mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={claimData.confirmPassword}
                  onChange={(e) => setClaimData({ ...claimData, confirmPassword: e.target.value })}
                  className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white transition-colors ${
                  isLoading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }`}
              >
                {isLoading ? 'Claiming Account...' : 'Claim Account'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsClaiming(false)}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
