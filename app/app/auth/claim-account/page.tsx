'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertTriangle, User, Lock, Phone, MapPin, Mail, Building2, Shield, ChevronRight, Check } from 'lucide-react';

function ClaimAccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const termsScrollRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1); // 1: Info, 2: Terms, 3: Success
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  });

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid or missing invitation token');
        setValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/invitations/validate?token=${token}`);
        const result = await response.json();

        if (result.success) {
          setInviteData(result.data);
          setError(null);
        } else {
          setError(result.error || 'Invalid invitation');
        }
      } catch (err) {
        setError('Failed to validate invitation');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Check if user scrolled to bottom of terms
  const handleTermsScroll = () => {
    if (termsScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsScrollRef.current;
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10;
      if (scrolledToBottom) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError(null);
    setStep(2); // Move to Terms
  };

  const handleFinalSubmit = async () => {
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/invitations/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: formData.name,
          password: formData.password,
          phone: formData.phone,
          timezone: formData.timezone,
          agreedToTerms: true
        })
      });

      const result = await response.json();

      if (result.success) {
        setStep(3); // Success!
        
        // Role-based redirect
        const userRole = result.data?.role;
        let redirectPath = '/dashboard'; // default
        
        if (userRole === 'SUPER_ADMIN') {
          redirectPath = '/admin';
        } else if (userRole === 'COMPANY_ADMIN') {
          redirectPath = '/company/dashboard';
        } else {
          // SITE_ADMIN, SUPERVISOR, WORKER, VIEWER
          redirectPath = '/dashboard';
        }
        
        setTimeout(() => {
          router.push(redirectPath);
        }, 2000);
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 max-w-md w-full border border-slate-700">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-white">Validating invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 max-w-md w-full border border-red-700">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-16 w-16 text-red-500" />
            <h2 className="text-2xl font-bold text-white">Invalid Invitation</h2>
            <p className="text-gray-400 text-center">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 max-w-md w-full border border-green-700">
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-20 w-20 text-green-500" />
            <h2 className="text-3xl font-bold text-white">Welcome to SiteSafe!</h2>
            <p className="text-gray-300 text-center">
              Your account has been created successfully.
            </p>
            <p className="text-gray-400 text-center text-sm">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 max-w-2xl w-full border border-slate-700 shadow-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600' : 'bg-gray-700'}`}>
              {step > 1 ? <Check className="h-5 w-5" /> : '1'}
            </div>
            <span className="text-sm font-medium">Your Info</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-500" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600' : 'bg-gray-700'}`}>
              {step > 2 ? <Check className="h-5 w-5" /> : '2'}
            </div>
            <span className="text-sm font-medium">Terms & Privacy</span>
          </div>
        </div>

        {/* Step 1: User Information */}
        {step === 1 && (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-600/20 rounded-2xl">
                  <Shield className="h-12 w-12 text-blue-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to SiteSafe!</h1>
              <p className="text-gray-400">
                Complete your account setup to get started
              </p>
            </div>

            {/* Invitation Info */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">📧 Invitation Details</h3>
              <div className="space-y-2 text-sm">
                {inviteData?.email && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Email:</span>
                    <span className="font-semibold text-white">{inviteData.email}</span>
                  </div>
                )}
                {inviteData?.companyName && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Organization:</span>
                    <span className="font-semibold text-white">{inviteData.companyName}</span>
                  </div>
                )}
                {inviteData?.role && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Role:</span>
                    <span className="font-semibold text-white">{inviteData.role}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleStep1Submit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 pl-10 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="John Smith"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 pl-10 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">At least 8 characters, mix of letters and numbers recommended</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 pl-10 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              {/* Phone (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 pl-10 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">For SMS safety alerts and notifications</p>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 pl-10 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  >
                    <option value="America/New_York">Eastern (EST/EDT)</option>
                    <option value="America/Chicago">Central (CST/CDT)</option>
                    <option value="America/Denver">Mountain (MST/MDT)</option>
                    <option value="America/Los_Angeles">Pacific (PST/PDT)</option>
                    <option value="America/Phoenix">Arizona (MST)</option>
                    <option value="America/Anchorage">Alaska (AKST/AKDT)</option>
                    <option value="Pacific/Honolulu">Hawaii (HST)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-blue-500/25 text-white"
              >
                Continue to Terms & Privacy
                <ChevronRight className="inline h-5 w-5 ml-2" />
              </button>
            </form>
          </>
        )}

        {/* Step 2: Terms of Service */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Terms of Service & Privacy Policy</h2>
              <p className="text-gray-400 text-sm">Please read and agree to continue</p>
            </div>

            {/* Terms Content (Scrollable) */}
            <div 
              ref={termsScrollRef}
              onScroll={handleTermsScroll}
              className="bg-gray-900/50 rounded-lg p-6 border border-gray-700 mb-6 h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800"
            >
              <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                <h3 className="text-xl font-bold text-white mb-4">Terms of Service</h3>
                
                <p><strong>Effective Date:</strong> October 30, 2025</p>
                
                <h4 className="text-lg font-semibold text-white mt-6 mb-3">1. Acceptance of Terms</h4>
                <p>
                  By accessing and using SiteSafe ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">2. Use of Service</h4>
                <p>
                  SiteSafe is an AI-powered construction safety monitoring system designed to detect safety violations, manage compliance, and improve workplace safety. You agree to use the Service only for lawful purposes and in accordance with these Terms.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">3. User Responsibilities</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Ensure accurate and up-to-date information</li>
                  <li>Comply with all applicable safety regulations</li>
                  <li>Not misuse or interfere with the Service</li>
                  <li>Report any security vulnerabilities immediately</li>
                </ul>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">4. AI Detection Disclaimer</h4>
                <p className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
                  <strong className="text-yellow-400">IMPORTANT:</strong> While SiteSafe uses advanced AI technology to detect safety violations, the system should be used as a supplementary tool only. Human oversight and judgment are required. SiteSafe does not replace proper safety training, equipment, or protocols. Users are responsible for ensuring compliance with all safety regulations.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">5. Data Collection & Usage</h4>
                <p>
                  We collect and process data including but not limited to: video feeds, detection results, user information, and worksite data. This data is used solely for safety monitoring, compliance reporting, and system improvement.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">6. Privacy Policy</h4>
                <p>
                  Your privacy is important to us. We collect and use your information in accordance with our Privacy Policy:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Personal Information:</strong> Name, email, phone number, timezone</li>
                  <li><strong>Usage Data:</strong> Login times, page views, system interactions</li>
                  <li><strong>Safety Data:</strong> Alerts, violations, compliance records</li>
                  <li><strong>Video Data:</strong> Camera feeds and AI detection results</li>
                </ul>
                <p className="mt-3">
                  We do not sell your data to third parties. Data is stored securely and retained according to industry standards and legal requirements.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">7. Service Availability</h4>
                <p>
                  We strive for 99.9% uptime but cannot guarantee uninterrupted service. Scheduled maintenance will be announced in advance. We are not liable for service interruptions or data loss.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">8. Limitation of Liability</h4>
                <p>
                  SiteSafe and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the Service, including but not limited to workplace accidents, injuries, or property damage.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">9. Intellectual Property</h4>
                <p>
                  All content, features, and functionality of the Service are owned by SiteSafe and are protected by copyright, trademark, and other intellectual property laws.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">10. Account Termination</h4>
                <p>
                  We reserve the right to suspend or terminate your account for violation of these Terms, illegal activity, or misuse of the Service. You may terminate your account at any time by contacting support.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">11. Changes to Terms</h4>
                <p>
                  We reserve the right to modify these Terms at any time. We will notify users of significant changes via email. Continued use of the Service after changes constitutes acceptance of the new Terms.
                </p>

                <h4 className="text-lg font-semibold text-white mt-6 mb-3">12. Contact Information</h4>
                <p>
                  For questions about these Terms or Privacy Policy, contact us at:
                  <br />
                  Email: <a href="mailto:legal@sitesafe.ai" className="text-blue-400 hover:text-blue-300">legal@sitesafe.ai</a>
                  <br />
                  Support: <a href="mailto:support@sitesafe.ai" className="text-blue-400 hover:text-blue-300">support@sitesafe.ai</a>
                </p>

                <div className="mt-8 pt-6 border-t border-gray-700">
                  <p className="text-center text-gray-400 text-sm">
                    © {new Date().getFullYear()} SiteSafe. All rights reserved.
                  </p>
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            {!hasScrolledToBottom && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4 text-center">
                <p className="text-yellow-400 text-sm font-medium">
                  📜 Please scroll to the bottom to continue
                </p>
              </div>
            )}

            {/* Agreement Checkbox */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    disabled={!hasScrolledToBottom}
                    className="w-5 h-5 rounded border-2 border-gray-600 bg-gray-900/50 checked:bg-blue-600 checked:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <span className={`text-sm ${hasScrolledToBottom ? 'text-gray-300' : 'text-gray-500'}`}>
                  I have read and agree to the <span className="text-blue-400 font-semibold">Terms of Service</span> and <span className="text-blue-400 font-semibold">Privacy Policy</span>
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!agreedToTerms || loading}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  !agreedToTerms || loading
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-green-500/25'
                } text-white`}
              >
                {loading ? 'Creating Account...' : 'Create Account & Continue'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ClaimAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
        </div>
      }
    >
      <ClaimAccountPageContent />
    </Suspense>
  );
}
