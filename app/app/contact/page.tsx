'use client';

import React, { useState } from 'react';
import { EnvelopeIcon, PhoneIcon, MapPinIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import MarketingNavbar from '../components/MarketingNavbar';

const industries = [
  { value: '', label: 'Select an industry' },
  { value: 'construction', label: 'Construction' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'logistics', label: 'Logistics & Warehousing' },
  { value: 'oil-gas', label: 'Oil & Gas' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const faqs = [
  {
    question: 'What does deployment look like for a 10-camera site?',
    answer: 'We connect to your existing IP cameras via RTSP, configure detection zones with your safety team, and run a 48-hour calibration period. Most sites are fully operational within 3-5 business days.'
  },
  {
    question: 'How do you handle false positives?',
    answer: 'Our detection engine runs confidence thresholds tuned per-site. Safety managers can flag false positives directly in the dashboard, and those corrections feed into site-specific model tuning.'
  },
  {
    question: 'What data do insurers get access to?',
    answer: 'Violation frequency, compliance scores, incident timelines, and video evidence — structured for underwriting and claims. We provide API access and scheduled reports in formats your actuarial team can use.'
  },
  {
    question: 'Can we run a pilot before committing?',
    answer: 'Yes. We offer 30-day pilots on a single site with full functionality. You pay only if you proceed after the pilot period.'
  }
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    industry: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sourcePage: 'contact',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to send message';
        throw new Error(errorMsg);
      }

      setSubmitStatus({
        type: 'success',
        message: 'Message received. Expect a response within 24 hours.',
      });
      setFormData({ name: '', email: '', company: '', message: '', industry: '' });
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send message',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <MarketingNavbar variant="dark" />
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Talk to Someone Who Understands High-Risk Safety
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Not a chatbot. Not a sales script. Direct access to people who've deployed safety AI on construction sites.
            </p>
            {/* Response Time Badge */}
            <div className="mt-6 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2">
              <ClockIcon className="h-5 w-5 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Response within 24 hours — usually faster</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          {/* Contact Information */}
          <div className="lg:pr-8">
            <dl className="space-y-6 text-base leading-7 text-gray-300">
              <div className="flex gap-x-4 items-center">
                <EnvelopeIcon className="h-6 w-6 text-blue-400 flex-shrink-0" aria-hidden="true" />
                <a className="hover:text-white text-white" href="mailto:support@nexxau.com">support@nexxau.com</a>
              </div>
              <div className="flex gap-x-4 items-center">
                <PhoneIcon className="h-6 w-6 text-blue-400 flex-shrink-0" aria-hidden="true" />
                <a className="hover:text-white text-white" href="tel:+13053315002">+1 (305) 331-5002</a>
              </div>
              <div className="flex gap-x-4 items-start">
                <MapPinIcon className="h-6 w-6 text-blue-400 flex-shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-white">Miami, FL</span>
                  <span className="text-gray-400 text-sm block">Serving U.S. and LATAM</span>
                </div>
              </div>
            </dl>

            {/* Trust Elements */}
            <div className="mt-12 space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">What Happens Next</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">We respond within 24 hours with a real human</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">If relevant, we schedule a 30-min discovery call</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">No pushy sales — we'll tell you if we're not a fit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-5">
            {submitStatus.type && (
                <div className={`rounded-md p-4 ${submitStatus.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
                {submitStatus.message}
              </div>
            )}
              <div className="grid grid-cols-2 gap-4">
            <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-2">Name *</label>
                  <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required
                    className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
            </div>
            <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">Email *</label>
                  <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required
                    className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
            <div>
                  <label htmlFor="company" className="block text-sm font-medium text-white mb-2">Company</label>
                  <input type="text" name="company" id="company" value={formData.company} onChange={handleChange}
                    className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm" />
            </div>
            <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-white mb-2">Industry</label>
                  <select id="industry" name="industry" value={formData.industry} onChange={handleChange}
                    className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm">
                    {industries.map((i) => <option key={i.value} value={i.value} className="bg-gray-800">{i.label}</option>)}
                </select>
              </div>
            </div>
            <div>
                <label htmlFor="message" className="block text-sm font-medium text-white mb-2">Message *</label>
                <textarea name="message" id="message" rows={4} value={formData.message} onChange={handleChange} required
                  placeholder="Tell us about your site, camera setup, or what you're trying to solve."
                  className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm placeholder:text-gray-500" />
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 px-3.5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
            </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-800 border-t border-gray-700">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-10 text-center">Common Questions</h2>
          <div className="mx-auto max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                <dt className="text-sm font-semibold text-white mb-2">{faq.question}</dt>
                <dd className="text-sm text-gray-400">{faq.answer}</dd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
