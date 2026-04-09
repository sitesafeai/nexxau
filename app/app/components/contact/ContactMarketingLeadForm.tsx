'use client';

import React, { useState } from 'react';

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

/**
 * Public marketing contact form. The outer `<form>` uses `suppressHydrationWarning` so password
 * managers and similar extensions that inject `fdprocessedid` (etc.) do not trigger React
 * hydration mismatch warnings in development.
 */
export default function ContactMarketingLeadForm() {
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" suppressHydrationWarning>
      {submitStatus.type && (
        <div
          className={`rounded-md p-4 ${
            submitStatus.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}
        >
          {submitStatus.message}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
            Name *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
            Email *
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
            Company
          </label>
          <input
            type="text"
            name="company"
            id="company"
            value={formData.company}
            onChange={handleChange}
            className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-white mb-2">
            Industry
          </label>
          <select
            id="industry"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm"
          >
            {industries.map((i) => (
              <option key={i.value} value={i.value} className="bg-gray-800">
                {i.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
          Message *
        </label>
        <textarea
          name="message"
          id="message"
          rows={4}
          value={formData.message}
          onChange={handleChange}
          required
          placeholder="Tell us about your site, camera setup, or what you're trying to solve."
          className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 sm:text-sm placeholder:text-gray-500"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-3.5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
