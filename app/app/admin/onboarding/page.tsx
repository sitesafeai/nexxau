'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Building2, ArrowRight, ArrowLeft, Check, MapPin, Users, Camera, 
  AlertTriangle, Settings, FileText, Clock, Phone, Mail, CreditCard,
  Shield, Calendar, Zap
} from 'lucide-react';

interface CompanyData {
  name: string;
  companyUsername: string;
  industry: string;
  companySize: string;
  hqAddress: string;
  timezone: string;
  email: string;
  phone: string;
}

interface AdminData {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  secondaryContactName?: string;
  secondaryContactEmail?: string;
  secondaryContactPhone?: string;
}

interface BillingData {
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  billingAddress: string;
  paymentMethod: 'credit_card' | 'ach' | 'none';
}

interface WorksiteData {
  name: string;
  worksiteName: string;
  address: string;
  location: string;
  timezone: string;
  worksiteType: string;
  status: 'active' | 'upcoming' | 'completed';
  operatingHours: {
    workDays: string[];
    startTime: string;
    endTime: string;
    specialHours?: Array<{ date: string; startTime: string; endTime: string }>;
  };
  hazardProfile?: {
    ppeCategories: string[];
    highRiskZones: string[];
    machineryPresent: boolean;
  };
}

interface SupervisorData {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  preferredAlertMethod: 'email' | 'sms' | 'both';
  worksites: string[];
  escalationRole: 'primary' | 'secondary';
}

interface CameraData {
  name: string;
  streamUrl: string;
  worksiteId: string;
  location: string;
  status: 'active' | 'inactive';
}

interface WorkflowData {
  enabled: boolean;
  realTimeAlerts: boolean;
  escalationDelay: number;
  reportRecipients: string[];
  quietHours: { start: string; end: string } | null;
}

interface UserData {
  name: string;
  email: string;
  role: string;
  worksiteAccess: string[];
}

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building2 },
  { id: 2, title: 'Admin Info', icon: Users },
  { id: 3, title: 'Billing', icon: CreditCard },
  { id: 4, title: 'Worksites', icon: MapPin },
  { id: 5, title: 'Supervisors', icon: Users },
  { id: 6, title: 'Cameras', icon: Camera },
  { id: 7, title: 'Workflows', icon: Settings },
  { id: 8, title: 'Team Access', icon: Shield },
  { id: 9, title: 'Review', icon: FileText },
];

export default function ClientOnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    companyUsername: '',
    industry: '',
    companySize: '',
    hqAddress: '',
    timezone: 'America/New_York',
    email: '',
    phone: '',
  });

  const [adminData, setAdminData] = useState<AdminData>({
    fullName: '',
    role: '',
    email: '',
    phone: '',
  });

  const [billingData, setBillingData] = useState<BillingData>({
    billingName: '',
    billingEmail: '',
    billingPhone: '',
    billingAddress: '',
    paymentMethod: 'none',
  });

  const [worksites, setWorksites] = useState<WorksiteData[]>([]);
  const [currentWorksite, setCurrentWorksite] = useState<WorksiteData>({
    name: '',
    worksiteName: '',
    address: '',
    location: '',
    timezone: 'America/New_York',
    worksiteType: '',
    status: 'active',
    operatingHours: {
      workDays: [],
      startTime: '08:00',
      endTime: '17:00',
    },
  });

  const [supervisors, setSupervisors] = useState<SupervisorData[]>([]);
  const [currentSupervisor, setCurrentSupervisor] = useState<SupervisorData>({
    fullName: '',
    role: '',
    email: '',
    phone: '',
    preferredAlertMethod: 'email',
    worksites: [],
    escalationRole: 'primary',
  });

  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [currentCamera, setCurrentCamera] = useState<CameraData>({
    name: '',
    streamUrl: '',
    worksiteId: '',
    location: '',
    status: 'active',
  });

  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    enabled: true,
    realTimeAlerts: true,
    escalationDelay: 5,
    reportRecipients: [],
    quietHours: null,
  });

  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData>({
    name: '',
    email: '',
    role: 'WORKER',
    worksiteAccess: [],
  });

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return companyData.name && companyData.companyUsername && companyData.email && companyData.timezone;
      case 2:
        return adminData.fullName && adminData.email && adminData.phone;
      case 3:
        return true; // Billing is optional
      case 4:
        return worksites.length > 0;
      case 5:
        return supervisors.length > 0;
      case 6:
        return true; // Cameras can be added later
      case 7:
        return true; // Workflows have defaults
      case 8:
        return true; // Users can be added later
      case 9:
        return true; // Review step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length && canProceed()) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create company
      const companyRes = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyData.name,
          companyUsername: companyData.companyUsername,
          email: companyData.email,
          phone: companyData.phone,
          address: companyData.hqAddress,
        }),
      });

      const companyResult = await companyRes.json();
      if (!companyResult.success) {
        // Check if it's a duplicate email/name error
        if (companyResult.error?.includes('already exists') || companyResult.error?.includes('Unique constraint')) {
          setError(`❌ ${companyResult.error}\n\nPlease check:\n- Company name is unique\n- Company email is unique\n- Company username is unique`);
        } else {
          setError(companyResult.error || 'Failed to create company');
        }
        setLoading(false);
        return;
      }

      const companyId = companyResult.data.id;

      // Step 2: Create admin user via invitation
      const adminInviteRes = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminData.email,
          role: 'COMPANY_ADMIN',
          companyId,
          invitedBy: (session?.user as any)?.id || 'system',
        }),
      });

      const adminInviteResult = await adminInviteRes.json();
      if (!adminInviteResult.success) {
        console.warn('Failed to send admin invitation:', adminInviteResult.error);
        // Continue anyway - admin can be invited manually
      }

      // Step 3: Create worksites
      const createdWorksites: string[] = [];
      for (const worksite of worksites) {
        const worksiteRes = await fetch('/api/worksites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: worksite.name,
            worksiteName: worksite.worksiteName,
            location: worksite.location,
            address: worksite.address,
            companyId,
            cameraSystemType: worksite.worksiteType || 'mixed',
          }),
        });

        const worksiteResult = await worksiteRes.json();
        if (worksiteResult.success) {
          createdWorksites.push(worksiteResult.data.id);
        } else {
          console.error('Failed to create worksite:', worksite.name, worksiteResult.error);
        }
      }

      // Step 4: Create supervisors (as users with invitations)
      for (const supervisor of supervisors) {
        // Find worksite IDs for this supervisor
        const supervisorWorksiteIds = worksites
          .filter(ws => supervisor.worksites.includes(ws.name))
          .map(ws => {
            const idx = worksites.findIndex(w => w.name === ws.name);
            return createdWorksites[idx];
          })
          .filter(Boolean);

        const supervisorInviteRes = await fetch('/api/invitations/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: supervisor.email,
            role: 'SUPERVISOR',
            companyId,
            worksiteId: supervisorWorksiteIds[0] || undefined, // Assign to first worksite if multiple
            invitedBy: (session?.user as any)?.id || 'system',
          }),
        });

        const supervisorInviteResult = await supervisorInviteRes.json();
        if (!supervisorInviteResult.success) {
          console.error('Failed to send supervisor invitation:', supervisor.email, supervisorInviteResult.error);
        }
      }

      // Step 5: Default workflows will be auto-provisioned by the worksite creation hook
      // (see app/app/api/worksites/route.ts)

      alert('Onboarding completed successfully! Redirecting to company page...');
      router.push(`/admin/companies/${companyId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Client Onboarding</h1>
          <p className="text-slate-300">Complete setup for new company and worksites</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between overflow-x-auto pb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1 min-w-[100px]">
                <div className={`flex items-center gap-2 ${currentStep >= step.id ? 'text-blue-500' : 'text-slate-500'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    currentStep > step.id
                      ? 'bg-blue-500 border-blue-500'
                      : currentStep === step.id
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-slate-600 bg-slate-800'
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="hidden md:block text-sm font-medium">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-blue-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Company Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Company Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Acme Construction"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Username * (URL-friendly)
                  </label>
                  <input
                    type="text"
                    value={companyData.companyUsername}
                    onChange={(e) => setCompanyData({ 
                      ...companyData, 
                      companyUsername: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') 
                    })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="acme-construction"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Industry *
                  </label>
                  <select
                    value={companyData.industry}
                    onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select industry</option>
                    <option value="construction">Construction</option>
                    <option value="oil_gas">Oil & Gas</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="mining">Mining</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Size *
                  </label>
                  <select
                    value={companyData.companySize}
                    onChange={(e) => setCompanyData({ ...companyData, companySize: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Headquarters Address *
                  </label>
                  <textarea
                    value={companyData.hqAddress}
                    onChange={(e) => setCompanyData({ ...companyData, hqAddress: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows={3}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Timezone *
                  </label>
                  <select
                    value={companyData.timezone}
                    onChange={(e) => setCompanyData({ ...companyData, timezone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Phoenix">Arizona Time</option>
                    <option value="America/Anchorage">Alaska Time</option>
                    <option value="Pacific/Honolulu">Hawaii Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Email *
                  </label>
                  <input
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="contact@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Phone
                  </label>
                  <input
                    type="tel"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Admin Info - will continue in next part due to length */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Primary Admin (Account Owner)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={adminData.fullName}
                    onChange={(e) => setAdminData({ ...adminData, fullName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Role/Title *
                  </label>
                  <input
                    type="text"
                    value={adminData.role}
                    onChange={(e) => setAdminData({ ...adminData, role: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Safety Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email * (for login + admin alerts)
                  </label>
                  <input
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="admin@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={adminData.phone}
                    onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">Optional: Secondary Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={adminData.secondaryContactName || ''}
                    onChange={(e) => setAdminData({ ...adminData, secondaryContactName: e.target.value })}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Name"
                  />
                  <input
                    type="email"
                    value={adminData.secondaryContactEmail || ''}
                    onChange={(e) => setAdminData({ ...adminData, secondaryContactEmail: e.target.value })}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Email"
                  />
                  <input
                    type="tel"
                    value={adminData.secondaryContactPhone || ''}
                    onChange={(e) => setAdminData({ ...adminData, secondaryContactPhone: e.target.value })}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Phone"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Billing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Billing Information</h2>
              <p className="text-slate-400 mb-6">Billing details (can be configured later)</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Billing Name/Company</label>
                  <input
                    type="text"
                    value={billingData.billingName}
                    onChange={(e) => setBillingData({ ...billingData, billingName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Acme Construction LLC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Billing Email</label>
                  <input
                    type="email"
                    value={billingData.billingEmail}
                    onChange={(e) => setBillingData({ ...billingData, billingEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="finance@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Billing Phone</label>
                  <input
                    type="tel"
                    value={billingData.billingPhone}
                    onChange={(e) => setBillingData({ ...billingData, billingPhone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                  <select
                    value={billingData.paymentMethod}
                    onChange={(e) => setBillingData({ ...billingData, paymentMethod: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="none">Not configured</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="ach">ACH</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Billing Address</label>
                  <textarea
                    value={billingData.billingAddress}
                    onChange={(e) => setBillingData({ ...billingData, billingAddress: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows={3}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Worksites */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Add Worksites</h2>
              
              <div className="bg-slate-700/30 p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-white">New Worksite</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Worksite Name *</label>
                    <input
                      type="text"
                      value={currentWorksite.name}
                      onChange={(e) => setCurrentWorksite({ ...currentWorksite, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Downtown Construction Site"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Worksite Username *</label>
                    <input
                      type="text"
                      value={currentWorksite.worksiteName}
                      onChange={(e) => setCurrentWorksite({ 
                        ...currentWorksite, 
                        worksiteName: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') 
                      })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="downtown-site"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                    <input
                      type="text"
                      value={currentWorksite.location}
                      onChange={(e) => setCurrentWorksite({ ...currentWorksite, location: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="New York, NY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                    <input
                      type="text"
                      value={currentWorksite.address}
                      onChange={(e) => setCurrentWorksite({ ...currentWorksite, address: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                    <select
                      value={currentWorksite.timezone}
                      onChange={(e) => setCurrentWorksite({ ...currentWorksite, timezone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Worksite Type</label>
                    <select
                      value={currentWorksite.worksiteType}
                      onChange={(e) => setCurrentWorksite({ ...currentWorksite, worksiteType: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="">Select type</option>
                      <option value="construction">Construction Site</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Work Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <label key={day} className="flex items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={currentWorksite.operatingHours.workDays.includes(day)}
                            onChange={(e) => {
                              const workDays = e.target.checked
                                ? [...currentWorksite.operatingHours.workDays, day]
                                : currentWorksite.operatingHours.workDays.filter(d => d !== day);
                              setCurrentWorksite({
                                ...currentWorksite,
                                operatingHours: { ...currentWorksite.operatingHours, workDays }
                              });
                            }}
                            className="rounded"
                          />
                          {day.slice(0, 3)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={currentWorksite.operatingHours.startTime}
                        onChange={(e) => setCurrentWorksite({
                          ...currentWorksite,
                          operatingHours: { ...currentWorksite.operatingHours, startTime: e.target.value }
                        })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">End Time</label>
                      <input
                        type="time"
                        value={currentWorksite.operatingHours.endTime}
                        onChange={(e) => setCurrentWorksite({
                          ...currentWorksite,
                          operatingHours: { ...currentWorksite.operatingHours, endTime: e.target.value }
                        })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (currentWorksite.name && currentWorksite.worksiteName) {
                      setWorksites([...worksites, { ...currentWorksite }]);
                      setCurrentWorksite({
                        name: '',
                        worksiteName: '',
                        address: '',
                        location: '',
                        timezone: companyData.timezone,
                        worksiteType: '',
                        status: 'active',
                        operatingHours: {
                          workDays: [],
                          startTime: '08:00',
                          endTime: '17:00',
                        },
                      });
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Worksite
                </button>
              </div>

              {worksites.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Added Worksites ({worksites.length})</h3>
                  {worksites.map((ws, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{ws.name}</p>
                        <p className="text-sm text-slate-400">{ws.location || ws.address}</p>
                      </div>
                      <button
                        onClick={() => setWorksites(worksites.filter((_, i) => i !== idx))}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Supervisors */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Add Supervisors / Alert Recipients</h2>
              
              <div className="bg-slate-700/30 p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-white">New Supervisor</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={currentSupervisor.fullName}
                      onChange={(e) => setCurrentSupervisor({ ...currentSupervisor, fullName: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Role/Title *</label>
                    <input
                      type="text"
                      value={currentSupervisor.role}
                      onChange={(e) => setCurrentSupervisor({ ...currentSupervisor, role: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Site Supervisor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                    <input
                      type="email"
                      value={currentSupervisor.email}
                      onChange={(e) => setCurrentSupervisor({ ...currentSupervisor, email: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={currentSupervisor.phone}
                      onChange={(e) => setCurrentSupervisor({ ...currentSupervisor, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Alert Method *</label>
                    <select
                      value={currentSupervisor.preferredAlertMethod}
                      onChange={(e) => setCurrentSupervisor({ 
                        ...currentSupervisor, 
                        preferredAlertMethod: e.target.value as any 
                      })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="both">Both</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Escalation Role</label>
                    <select
                      value={currentSupervisor.escalationRole}
                      onChange={(e) => setCurrentSupervisor({ 
                        ...currentSupervisor, 
                        escalationRole: e.target.value as any 
                      })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Worksites Covered</label>
                  <div className="flex flex-wrap gap-2">
                    {worksites.map((ws, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={currentSupervisor.worksites.includes(ws.name)}
                          onChange={(e) => {
                            const worksites = e.target.checked
                              ? [...currentSupervisor.worksites, ws.name]
                              : currentSupervisor.worksites.filter(w => w !== ws.name);
                            setCurrentSupervisor({ ...currentSupervisor, worksites });
                          }}
                          className="rounded"
                        />
                        {ws.name}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (currentSupervisor.fullName && currentSupervisor.email && currentSupervisor.phone) {
                      setSupervisors([...supervisors, { ...currentSupervisor }]);
                      setCurrentSupervisor({
                        fullName: '',
                        role: '',
                        email: '',
                        phone: '',
                        preferredAlertMethod: 'email',
                        worksites: [],
                        escalationRole: 'primary',
                      });
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Supervisor
                </button>
              </div>

              {supervisors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Added Supervisors ({supervisors.length})</h3>
                  {supervisors.map((sup, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{sup.fullName}</p>
                        <p className="text-sm text-slate-400">{sup.email} • {sup.phone}</p>
                      </div>
                      <button
                        onClick={() => setSupervisors(supervisors.filter((_, i) => i !== idx))}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Steps 6-9: Cameras, Workflows, Team Access, Review - simplified for now */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Camera Setup</h2>
              <p className="text-slate-400 mb-6">Cameras can be added after worksite creation. You'll be able to configure them in the dashboard.</p>
              <div className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  💡 Tip: After completing onboarding, you can add cameras from the worksite dashboard. 
                  Each camera will be tested automatically for connectivity.
                </p>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Configure Alerts & Workflows</h2>
              <p className="text-slate-400 mb-6">Default workflows will be created automatically. You can customize them later.</p>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-slate-300">
                  <input
                    type="checkbox"
                    checked={workflowData.realTimeAlerts}
                    onChange={(e) => setWorkflowData({ ...workflowData, realTimeAlerts: e.target.checked })}
                    className="rounded"
                  />
                  <span>Enable real-time alerts</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Escalation Delay (minutes)
                  </label>
                  <input
                    type="number"
                    value={workflowData.escalationDelay}
                    onChange={(e) => setWorkflowData({ ...workflowData, escalationDelay: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="1"
                    max="60"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Team Access (Users & Roles)</h2>
              <p className="text-slate-400 mb-6">Additional users can be invited after onboarding. The primary admin has been set up.</p>
              <div className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  💡 Tip: You can invite additional team members from the company dashboard after onboarding is complete.
                </p>
              </div>
            </div>
          )}

          {currentStep === 9 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Final Review</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Company</h3>
                  <p className="text-slate-300">{companyData.name}</p>
                  <p className="text-sm text-slate-400">{companyData.email}</p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Primary Admin</h3>
                  <p className="text-slate-300">{adminData.fullName}</p>
                  <p className="text-sm text-slate-400">{adminData.email}</p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Worksites</h3>
                  <p className="text-slate-300">{worksites.length} worksite(s) configured</p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Supervisors</h3>
                  <p className="text-slate-300">{supervisors.length} supervisor(s) configured</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              onClick={currentStep === STEPS.length ? handleSubmit : handleNext}
              disabled={!canProceed() || loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : currentStep === STEPS.length ? (
                <>
                  <Check className="h-4 w-4" />
                  Complete Onboarding
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

