'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl tracking-tight text-white font-bold">NEXXAU</span>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="pt-20">
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Terms of Service
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Please read these terms carefully before using our services.
            </p>
          </div>
        </div>
      </div>

      {/* Terms Content */}
      <div className="mx-auto max-w-4xl px-6 lg:px-8 pb-24">
        <div className="prose prose-invert max-w-none">
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">1. Acceptance of Terms</h2>
            <p className="text-gray-300 mb-6">
              By accessing and using Nexxau's services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">2. Description of Service</h2>
            <p className="text-gray-300 mb-4">
              Nexxau provides AI-powered safety monitoring services including:
            </p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Real-time video monitoring and analysis</li>
              <li>• Safety violation detection and alerts</li>
              <li>• Compliance tracking and reporting</li>
              <li>• Mobile applications and dashboards</li>
              <li>• Technical support and training</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">3. User Accounts</h2>
            <p className="text-gray-300 mb-4">
              To access certain features of our service, you must create an account. You are responsible for:
            </p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Maintaining the confidentiality of your account credentials</li>
              <li>• All activities that occur under your account</li>
              <li>• Notifying us immediately of any unauthorized use</li>
              <li>• Ensuring your account information is accurate and current</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">4. Acceptable Use</h2>
            <p className="text-gray-300 mb-4">
              You agree to use our services only for lawful purposes and in accordance with these terms. You agree not to:
            </p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Use the service for any illegal or unauthorized purpose</li>
              <li>• Interfere with or disrupt the service or servers</li>
              <li>• Attempt to gain unauthorized access to any part of the service</li>
              <li>• Use the service to transmit harmful or malicious code</li>
              <li>• Violate any applicable laws or regulations</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">5. Data and Privacy</h2>
            <p className="text-gray-300 mb-4">
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these terms by reference.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">6. Intellectual Property</h2>
            <p className="text-gray-300 mb-4">
              The service and its original content, features, and functionality are owned by Nexxau and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">7. Payment Terms</h2>
            <p className="text-gray-300 mb-4">
              Payment terms for our services are as follows:
            </p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Fees are billed in advance on a monthly or annual basis</li>
              <li>• All fees are non-refundable except as required by law</li>
              <li>• We may change our fees upon 30 days' notice</li>
              <li>• Late payments may result in service suspension</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">8. Service Availability</h2>
            <p className="text-gray-300 mb-4">
              We strive to maintain high service availability but do not guarantee uninterrupted access. We may temporarily suspend service for maintenance, updates, or other operational reasons.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">9. Limitation of Liability</h2>
            <p className="text-gray-300 mb-4">
              To the maximum extent permitted by law, Nexxau shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">10. Disclaimer of Warranties</h2>
            <p className="text-gray-300 mb-4">
              The service is provided on an "as is" and "as available" basis. We disclaim all warranties, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">11. Indemnification</h2>
            <p className="text-gray-300 mb-4">
              You agree to indemnify and hold harmless Nexxau from any claims, damages, or expenses arising from your use of the service or violation of these terms.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">12. Termination</h2>
            <p className="text-gray-300 mb-4">
              We may terminate or suspend your account and access to the service immediately, without prior notice, for any reason, including breach of these terms.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">13. Governing Law</h2>
            <p className="text-gray-300 mb-4">
              These terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">14. Changes to Terms</h2>
            <p className="text-gray-300 mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new terms on this page and updating the "Last Updated" date.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">15. Contact Information</h2>
            <p className="text-gray-300 mb-4">
              If you have any questions about these terms, please contact us at:
            </p>
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-gray-300">
                <strong>Email:</strong> legal@nexxau.com<br />
                <strong>Phone:</strong> +1 305-331-5002<br />
                <strong>Address:</strong> Miami, FL
              </p>
            </div>

            <div className="text-sm text-gray-400 mt-8 pt-6 border-t border-gray-700">
              <p>Last Updated: January 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Questions About Our Terms?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Our legal team is here to help clarify any terms or conditions.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Contact Us
              </Link>
              <Link href="/privacy" className="text-sm font-semibold leading-6 text-white">
                View Privacy Policy <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
} 