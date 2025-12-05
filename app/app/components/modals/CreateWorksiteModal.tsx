'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface AddressDetails {
  street: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  lat: number | null;
  lon: number | null;
}

interface OperatingHours {
  [key: string]: { start: string; end: string; enabled: boolean };
}

interface Contact {
  name: string;
  email: string;
  phone: string;
}

interface SlaSettings {
  responseTimeMinutes: number;
  escalationEnabled: boolean;
  autoAssign: boolean;
}

interface WorksiteData {
  name: string;
  slug: string;
  addressDetails: AddressDetails;
  timezone: string;
  industry: string;
  businessUnit: string;
  retentionPolicy: string;
  dataResidency: string;
  operatingHours: OperatingHours;
  contact: Contact;
  slaSettings: SlaSettings;
  companyId: string;
}

interface Company {
  id: string;
  name: string;
}

interface CreateWorksiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (worksite: WorksiteData) => Promise<void>;
  companies: Company[];
  defaultCompanyId?: string;
}

const INDUSTRIES = [
  { value: 'construction', label: 'Construction' },
  { value: 'oil_gas', label: 'Oil & Gas' },
  { value: 'warehouse', label: 'Warehouse & Logistics' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'mining', label: 'Mining' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'other', label: 'Other' },
];

const RETENTION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

const DATA_RESIDENCY_OPTIONS = [
  { value: 'us-east', label: 'US East' },
  { value: 'us-west', label: 'US West' },
  { value: 'eu-west', label: 'EU West' },
  { value: 'eu-central', label: 'EU Central' },
  { value: 'ap-south', label: 'Asia Pacific South' },
  { value: 'ap-northeast', label: 'Asia Pacific Northeast' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const defaultOperatingHours: OperatingHours = {
  mon: { start: '08:00', end: '17:00', enabled: true },
  tue: { start: '08:00', end: '17:00', enabled: true },
  wed: { start: '08:00', end: '17:00', enabled: true },
  thu: { start: '08:00', end: '17:00', enabled: true },
  fri: { start: '08:00', end: '17:00', enabled: true },
  sat: { start: '08:00', end: '12:00', enabled: false },
  sun: { start: '08:00', end: '12:00', enabled: false },
};

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
};

export default function CreateWorksiteModal({
  isOpen,
  onClose,
  onSave,
  companies,
  defaultCompanyId,
}: CreateWorksiteModalProps) {
  // Form state
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  
  const [addressDetails, setAddressDetails] = useState<AddressDetails>({
    street: '',
    city: '',
    state: '',
    postal: '',
    country: 'US',
    lat: null,
    lon: null,
  });
  
  const [timezone, setTimezone] = useState('America/New_York');
  const [industry, setIndustry] = useState('construction');
  const [businessUnit, setBusinessUnit] = useState('');
  const [retentionPolicy, setRetentionPolicy] = useState('30');
  const [dataResidency, setDataResidency] = useState('us-east');
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(defaultOperatingHours);
  
  const [contact, setContact] = useState<Contact>({
    name: '',
    email: '',
    phone: '',
  });
  
  const [slaSettings, setSlaSettings] = useState<SlaSettings>({
    responseTimeMinutes: 15,
    escalationEnabled: true,
    autoAssign: false,
  });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugEdited]);

  // Set default company
  useEffect(() => {
    if (defaultCompanyId) {
      setCompanyId(defaultCompanyId);
    } else if (companies.length === 1) {
      setCompanyId(companies[0].id);
    }
  }, [defaultCompanyId, companies]);

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNum === 1) {
      if (!name.trim()) {
        newErrors.name = 'Worksite name is required';
      } else if (name.length < 3 || name.length > 120) {
        newErrors.name = 'Name must be 3-120 characters';
      }

      if (!slug.trim()) {
        newErrors.slug = 'Worksite code is required';
      } else if (!/^[a-z0-9-]+$/.test(slug)) {
        newErrors.slug = 'Code can only contain lowercase letters, numbers, and hyphens';
      }

      if (!companyId) {
        newErrors.companyId = 'Company is required';
      }
    }

    if (stepNum === 2) {
      if (!addressDetails.street.trim()) {
        newErrors.street = 'Street address is required';
      }
      if (!addressDetails.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!addressDetails.state.trim()) {
        newErrors.state = 'State is required';
      }
    }

    if (stepNum === 3) {
      if (!contact.name.trim()) {
        newErrors.contactName = 'Contact name is required';
      }
      if (!contact.email.trim()) {
        newErrors.contactEmail = 'Contact email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        newErrors.contactEmail = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSave = async () => {
    if (!validateStep(3)) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        companyId,
        addressDetails,
        timezone,
        industry,
        businessUnit: businessUnit.trim(),
        retentionPolicy,
        dataResidency,
        operatingHours,
        contact,
        slaSettings,
      });
      onClose();
    } catch (error: any) {
      setErrors({ save: error.message || 'Failed to create worksite' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateOperatingHours = (day: string, field: 'start' | 'end' | 'enabled', value: any) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white">Create Worksite</h2>
            <p className="text-sm text-slate-400 mt-1">
              Step {step} of 4: {step === 1 ? 'Basic Info' : step === 2 ? 'Location & Schedule' : step === 3 ? 'Contact & Settings' : 'Review'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-700/50">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step ? 'bg-green-600 text-white' :
                  s === step ? 'bg-blue-600 text-white' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {s < step ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${s < step ? 'bg-green-600' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Worksite Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Main Construction Site"
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Worksite Code <span className="text-red-400">*</span>
                  <span className="text-slate-500 text-xs ml-2">(auto-generated, editable)</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setSlugEdited(true);
                  }}
                  placeholder="main-construction-site"
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.slug ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                {errors.slug && <p className="text-red-400 text-sm mt-1">{errors.slug}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Company <span className="text-red-400">*</span>
                </label>
                <select
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyId ? 'border-red-500' : 'border-slate-600'
                  }`}
                >
                  <option value="">Select company...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.companyId && <p className="text-red-400 text-sm mt-1">{errors.companyId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {INDUSTRIES.map(i => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Unit / Client
                  </label>
                  <input
                    type="text"
                    value={businessUnit}
                    onChange={e => setBusinessUnit(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location & Schedule */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                Address
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Street Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={addressDetails.street}
                  onChange={e => setAddressDetails(prev => ({ ...prev, street: e.target.value }))}
                  placeholder="123 Main Street"
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.street ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                {errors.street && <p className="text-red-400 text-sm mt-1">{errors.street}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressDetails.city}
                    onChange={e => setAddressDetails(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="New York"
                    className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.city ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    State <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressDetails.state}
                    onChange={e => setAddressDetails(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="NY"
                    className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.state ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={addressDetails.postal}
                    onChange={e => setAddressDetails(prev => ({ ...prev, postal: e.target.value }))}
                    placeholder="10001"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>

              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mt-8">
                Operating Hours
              </h3>
              <p className="text-sm text-slate-400 -mt-4">
                Set working hours for alert rule suppression during off-hours
              </p>

              <div className="space-y-3">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <label className="flex items-center gap-2 w-32">
                      <input
                        type="checkbox"
                        checked={operatingHours[day]?.enabled ?? false}
                        onChange={e => updateOperatingHours(day, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                      />
                      <span className="text-sm text-slate-300">{DAY_LABELS[day]}</span>
                    </label>
                    <input
                      type="time"
                      value={operatingHours[day]?.start ?? '08:00'}
                      onChange={e => updateOperatingHours(day, 'start', e.target.value)}
                      disabled={!operatingHours[day]?.enabled}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white text-sm disabled:opacity-50"
                    />
                    <span className="text-slate-500">to</span>
                    <input
                      type="time"
                      value={operatingHours[day]?.end ?? '17:00'}
                      onChange={e => updateOperatingHours(day, 'end', e.target.value)}
                      disabled={!operatingHours[day]?.enabled}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white text-sm disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Contact & Settings */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                Contact Person
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={e => setContact(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Smith"
                    className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.contactName ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                  {errors.contactName && <p className="text-red-400 text-sm mt-1">{errors.contactName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={e => setContact(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={e => setContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.smith@company.com"
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactEmail ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                {errors.contactEmail && <p className="text-red-400 text-sm mt-1">{errors.contactEmail}</p>}
              </div>

              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mt-8">
                Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Retention Policy
                  </label>
                  <select
                    value={retentionPolicy}
                    onChange={e => setRetentionPolicy(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {RETENTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data Residency
                  </label>
                  <select
                    value={dataResidency}
                    onChange={e => setDataResidency(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DATA_RESIDENCY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mt-8">
                SLA & Escalation
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Response Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={slaSettings.responseTimeMinutes}
                    onChange={e => setSlaSettings(prev => ({ ...prev, responseTimeMinutes: parseInt(e.target.value) || 15 }))}
                    className="w-32 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Time allowed to acknowledge alerts before escalation</p>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={slaSettings.escalationEnabled}
                      onChange={e => setSlaSettings(prev => ({ ...prev, escalationEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                    />
                    <span className="text-sm text-slate-300">Enable escalation chain</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={slaSettings.autoAssign}
                      onChange={e => setSlaSettings(prev => ({ ...prev, autoAssign: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                    />
                    <span className="text-sm text-slate-300">Auto-assign alerts</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                Review & Confirm
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Basic Info</h4>
                    <p className="text-white font-medium">{name}</p>
                    <p className="text-sm text-slate-400 font-mono">{slug}</p>
                    <p className="text-sm text-slate-400 mt-2">
                      {INDUSTRIES.find(i => i.value === industry)?.label}
                      {businessUnit && ` • ${businessUnit}`}
                    </p>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Location</h4>
                    <p className="text-white">{addressDetails.street}</p>
                    <p className="text-sm text-slate-400">
                      {addressDetails.city}, {addressDetails.state} {addressDetails.postal}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {TIMEZONES.find(tz => tz.value === timezone)?.label}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Contact</h4>
                    <p className="text-white">{contact.name}</p>
                    <p className="text-sm text-slate-400">{contact.email}</p>
                    {contact.phone && <p className="text-sm text-slate-400">{contact.phone}</p>}
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Settings</h4>
                    <p className="text-sm text-white">
                      Retention: {RETENTION_OPTIONS.find(r => r.value === retentionPolicy)?.label}
                    </p>
                    <p className="text-sm text-white">
                      Response SLA: {slaSettings.responseTimeMinutes} minutes
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {slaSettings.escalationEnabled ? 'Escalation enabled' : 'No escalation'}
                      {slaSettings.autoAssign && ' • Auto-assign'}
                    </p>
                  </div>
                </div>
              </div>

              {errors.save && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{errors.save}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <div>
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Worksite'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

