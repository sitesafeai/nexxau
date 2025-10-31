'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building2, ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyUsername: '',
    email: '',
    contactEmail: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`);
      const data = await response.json();
      
      if (data.success) {
        setFormData({
          name: data.data.name || '',
          companyUsername: data.data.companyUsername || '',
          email: data.data.email || '',
          contactEmail: data.data.contactEmail || '',
          phone: data.data.phone || '',
          address: data.data.address || ''
        });
      } else {
        alert('Failed to load company');
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      alert('Error loading company');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Company updated successfully!');
        router.push('/admin/companies');
      } else {
        alert(`Failed to update company: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/companies')}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Companies
          </button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600/20 rounded-xl">
              <Building2 className="h-10 w-10 text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Edit Company</h1>
              <p className="text-gray-400 mt-2">Update company information</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="ABC Construction Group"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Username * (URL-friendly)
                </label>
                <input
                  type="text"
                  value={formData.companyUsername}
                  onChange={(e) => setFormData({ ...formData, companyUsername: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="abc-construction"
                  required
                />
                <p className="mt-1 text-xs text-gray-400">Used in URLs and identifiers</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="company@abc-construction.com"
                  required
                />
                <p className="mt-1 text-xs text-gray-400">Primary company email</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="admin@abc-construction.com"
                />
                <p className="mt-1 text-xs text-gray-400">Recipient for automated notifications</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="123 Main St, City, State ZIP"
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-700">
              <button
                type="button"
                onClick={() => router.push('/admin/companies')}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

