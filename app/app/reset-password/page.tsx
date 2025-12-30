'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    passwordConfirm: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
    setValidating(false);
  }, [token]);

  const validateField = (name: string, value: string) => {
    const errors: Record<string, string> = {};

    if (name === 'password') {
      if (!value) {
        errors.password = 'Password is required';
      } else if (value.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else {
        const hasLowercase = /[a-z]/.test(value);
        const hasUppercase = /[A-Z]/.test(value);
        const hasNumber = /\d/.test(value);
        const hasSpecial = /[@$!%*?&]/.test(value);
        const onlyAllowedChars = /^[A-Za-z\d@$!%*?&]+$/.test(value);
        
        if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecial || !onlyAllowedChars) {
          errors.password = 'Password must contain uppercase, lowercase, number, and special character';
        }
      }
    }

    if (name === 'passwordConfirm') {
      if (value && formData.password && value !== formData.password) {
        errors.passwordConfirm = 'Passwords do not match';
      }
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    const passwordValid = validateField('password', formData.password);
    const passwordConfirmValid = validateField('passwordConfirm', formData.passwordConfirm);

    if (!passwordValid || !passwordConfirmValid) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password.trim(),
          passwordConfirm: formData.passwordConfirm.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?passwordReset=true');
        }, 2000);
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
            <p className="text-sm text-slate-300 text-center">Validating reset token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-white mb-2">
                Invalid Reset Link
              </h1>
              <p className="text-sm text-slate-300 mb-6">
                {error}
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-white mb-2">
                Password updated successfully
              </h1>
              <p className="text-sm text-slate-300">
                Redirecting to login...
              </p>
            </div>
            <Link
              href="/login"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Create a new password
            </h1>
            <p className="text-sm text-slate-300">
              Choose a strong password to secure your account.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-md p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (validationErrors.password) validateField('password', e.target.value);
                    if (formData.passwordConfirm) {
                      validateField('passwordConfirm', formData.passwordConfirm);
                    }
                  }}
                  onBlur={() => validateField('password', formData.password)}
                  className={`block w-full px-3 py-2 pr-10 bg-slate-900/50 border rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    validationErrors.password ? 'border-red-500/50' : 'border-slate-600'
                  }`}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-300 hover:text-white"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1.5 text-xs text-red-300">{validationErrors.password}</p>
              )}
              <div className="mt-1.5 text-xs text-slate-400">
                Minimum 8 characters • One uppercase • One number
              </div>
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  id="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={(e) => {
                    setFormData({ ...formData, passwordConfirm: e.target.value });
                    if (e.target.value && formData.password) {
                      validateField('passwordConfirm', e.target.value);
                    }
                  }}
                  onBlur={() => validateField('passwordConfirm', formData.passwordConfirm)}
                  className={`block w-full px-3 py-2 pr-10 bg-slate-900/50 border rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    validationErrors.passwordConfirm ? 'border-red-500/50' : 'border-slate-600'
                  }`}
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-300 hover:text-white"
                >
                  {showPasswordConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {validationErrors.passwordConfirm && (
                <p className="mt-1.5 text-xs text-red-300">{validationErrors.passwordConfirm}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white ${
                  loading
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {loading ? 'Updating password...' : 'Update password'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-slate-300 hover:text-white"
              >
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
