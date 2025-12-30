'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Your privacy is important to us. Learn how we collect, use, and protect your information.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Content */}
      <div className="mx-auto max-w-4xl px-6 lg:px-8 pb-24">
        <div className="prose prose-invert max-w-none">
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Information We Collect</h2>
            <p className="text-gray-300 mb-4">
              We collect information you provide directly to us, such as when you create an account, contact us, or use our services. This may include:
            </p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Name, email address, and contact information</li>
              <li>• Company information and job title</li>
              <li>• Video data from safety monitoring systems</li>
              <li>• Usage data and analytics</li>
              <li>• Communication records</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">How We Use Your Information</h2>
            <p className="text-gray-300 mb-4">
              We use the information we collect to:
            </p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Provide and improve our safety monitoring services</li>
              <li>• Process transactions and send related information</li>
              <li>• Send technical notices, updates, and support messages</li>
              <li>• Respond to your comments and questions</li>
              <li>• Monitor and analyze trends and usage</li>
              <li>• Detect, investigate, and prevent fraudulent transactions</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">Data Security</h2>
            <p className="text-gray-300 mb-4">
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Encryption of data in transit and at rest</li>
              <li>• Regular security assessments and updates</li>
              <li>• Access controls and authentication</li>
              <li>• Secure data centers and infrastructure</li>
              <li>• Employee training on data protection</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">Data Retention</h2>
            <p className="text-gray-300 mb-4">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. Video data is typically retained for 30 days unless required for longer periods by law or your organization's policies.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">Your Rights</h2>
            <p className="text-gray-300 mb-4">
              You have the right to:
            </p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Access your personal information</li>
              <li>• Correct inaccurate information</li>
              <li>• Request deletion of your information</li>
              <li>• Object to processing of your information</li>
              <li>• Request data portability</li>
              <li>• Withdraw consent where applicable</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">Third-Party Services</h2>
            <p className="text-gray-300 mb-4">
              We may use third-party service providers to help us operate our business and provide services. These providers have access to your information only to perform tasks on our behalf and are obligated not to disclose or use it for any other purpose.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">Cookies and Tracking</h2>
            <p className="text-gray-300 mb-4">
              We use cookies and similar tracking technologies to collect information about your browsing activities and to understand and save your preferences for future visits. You can control cookie settings through your browser preferences.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">Children's Privacy</h2>
            <p className="text-gray-300 mb-4">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">Changes to This Policy</h2>
            <p className="text-gray-300 mb-4">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. We encourage you to review this policy periodically.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">Contact Us</h2>
            <p className="text-gray-300 mb-4">
              If you have any questions about this privacy policy or our data practices, please contact us at:
            </p>
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-gray-300">
                <strong>Email:</strong> privacy@nexxau.com<br />
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
              Questions About Privacy?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Our team is here to help with any privacy-related questions or concerns.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Contact Us
              </Link>
              <Link href="/terms" className="text-sm font-semibold leading-6 text-white">
                View Terms of Service <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
} 