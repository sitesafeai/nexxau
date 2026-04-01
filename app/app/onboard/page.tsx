'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { COUNTRY_CODES } from '@/lib/country-codes';

function OnboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [onboardData, setOnboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+1',
    phone: '',
    password: '',
    passwordConfirm: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  useEffect(() => {
    const fetchOnboardData = async () => {
      if (!token) {
        setError('Invalid or missing invitation token');
        setValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/onboard?token=${token}`);
        const result = await response.json();

        if (result.success) {
          setOnboardData(result.data);
          setFormData(prev => ({
            ...prev,
            name: result.data.name || ''
          }));
          setError(null);
        } else {
          setError(result.error || 'Invalid or expired token');
        }
      } catch (err) {
        setError('Failed to validate invitation. Please try again.');
      } finally {
        setValidating(false);
      }
    };

    fetchOnboardData();
  }, [token]);

  const validateField = (name: string, value: string) => {
    const errors: Record<string, string> = {};

    if (name === 'name') {
      if (!value || value.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters';
      }
    }

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

    if (name === 'phone' && value) {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    const nameValid = validateField('name', formData.name);
    const passwordValid = validateField('password', formData.password);
    const passwordConfirmValid = validateField('passwordConfirm', formData.passwordConfirm);
    const phoneValid = !formData.phone || validateField('phone', formData.phone);

    if (!nameValid || !passwordValid || !passwordConfirmValid || !phoneValid) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/users/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: formData.name.trim(),
          phone: formData.phone.trim() ? `${formData.countryCode}${formData.phone.trim()}` : null,
          password: formData.password.trim(),
          passwordConfirm: formData.passwordConfirm.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?onboarded=true');
        }, 2000);
      } else {
        setError(result.error || 'Failed to complete account setup');
      }
    } catch (err: any) {
      setError('Failed to complete account setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <p className="text-sm text-gray-600 text-center">Validating invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !onboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Invalid Invitation
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                {error}
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Account Setup Complete
              </h1>
              <p className="text-sm text-gray-600 mb-4">
                Your account has been successfully set up.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to login...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Complete Your Account Setup
            </h1>
            <p className="text-sm text-gray-600">
              You've been invited to join {onboardData?.worksite?.name || 'a worksite'}. Complete your account to get started.
            </p>
          </div>

          {onboardData && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="space-y-2 text-sm">
                {onboardData.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="text-gray-900 font-medium">{onboardData.email}</span>
                  </div>
                )}
                {onboardData.worksite && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Worksite:</span>
                    <span className="text-gray-900 font-medium">{onboardData.worksite.name}</span>
                  </div>
                )}
                {onboardData.company && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company:</span>
                    <span className="text-gray-900 font-medium">{onboardData.company.name}</span>
                  </div>
                )}
                {onboardData.role && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="text-gray-900 font-medium">{onboardData.role}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (validationErrors.name) validateField('name', e.target.value);
                }}
                onBlur={() => validateField('name', formData.name)}
                className={`block w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="John Smith"
                required
              />
              {validationErrors.name && (
                <p className="mt-1.5 text-xs text-red-600">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                >
                  {COUNTRY_CODES.map((country) => (
                    <option key={`${country.code}-${country.country}`} value={country.code}>
                      {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (validationErrors.phone) validateField('phone', e.target.value);
                  }}
                  onBlur={() => formData.phone && validateField('phone', formData.phone)}
                  className={`flex-1 px-3 py-2 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm ${
                    validationErrors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="(555) 000-0000"
                />
              </div>
              {validationErrors.phone && (
                <p className="mt-1.5 text-xs text-red-600">{validationErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
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
                  className={`block w-full px-3 py-2 pr-10 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm ${
                    validationErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1.5 text-xs text-red-600">{validationErrors.password}</p>
              )}
              <div className="mt-1.5 text-xs text-gray-500">
                Minimum 8 characters • One uppercase • One number
              </div>
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
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
                  className={`block w-full px-3 py-2 pr-10 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm ${
                    validationErrors.passwordConfirm ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  {showPasswordConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {validationErrors.passwordConfirm && (
                <p className="mt-1.5 text-xs text-red-600">{validationErrors.passwordConfirm}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900'
                }`}
              >
                {loading ? 'Completing Setup...' : 'Complete Account Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
        </div>
      }
    >
      <OnboardPageContent />
    </Suspense>
  );
}
