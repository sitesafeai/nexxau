'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Factory,
  Building2,
  Cpu,
  Activity,
  Users,
  MapPin,
  TrendingUp,
  BarChart3,
  BellRing,
  LineChart,
  Layers3,
  Settings,
  FileBarChart2,
  DollarSign,
  LifeBuoy,
  X,
  Handshake,
  CloudUpload,
  CheckCircle2,
  Shield,
  Plug,
  CalendarClock,
  Video,
  Wifi,
  WifiOff,
  ArrowRight,
  TrendingDown,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '@/app/lib/use-auth';
type ClassValue = string | false | null | undefined;
const classNames = (...classes: ClassValue[]) => classes.filter(Boolean).join(' ');

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

type TimeRangeOption = '30d' | '90d' | 'year';

const normalizeStreamUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://')) {
    return `https://${url.slice(7)}`;
  }
  return url;
};

interface SummaryTotals {
  companies: number;
  worksites: number;
  cameras: number;
  users: number;
}

interface AlertsOverview {
  severity: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  status: {
    active: number;
    acknowledged: number;
    resolved: number;
    escalated: number;
    total: number;
  };
}

interface TrendPoint {
  date: string;
  value?: number;
  detections?: number;
}

interface CompanyInsight {
  id: string;
  name: string;
  slug?: string | null;
  siteCount: number;
  cameraCount: number;
  avgSafetyScore: number | null;
  complianceRate: number | null;
  latestActivity: string | null;
}

interface WorksiteActivityItem {
  id: string;
  name: string;
  status: string;
  location: string | null;
  companyId: string | null;
  companyName: string;
  cameraCount: number;
  onlineCameras: number;
  latestScore: number | null;
  latestScoreDate: string | null;
  lastActivity: string | null;
}

interface CameraStatusSummary {
  total: number;
  online: number;
  offline: number;
  error: number;
  other: number;
}

interface SubscriptionSummary {
  totalCompanies: number;
  placeholder?: boolean;
  message?: string;
}

interface CompanyWorksiteSnapshot {
  id: string;
  name: string;
  location?: string | null;
  status?: string | null;
  cameraCount: number;
  onlineCameraCount: number;
  latestScore: number | null;
  lastActivity: string | null;
}

interface AdminCompanySummary {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  worksiteCount: number;
  userCount: number;
  cameraCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminCompaniesResponse {
  success: boolean;
  data?: AdminCompanySummary[];
  error?: string;
  details?: string;
}

interface AdminWorksiteSummary {
  id: string;
  name: string;
  status: string | null;
  location?: string | null;
  address?: string | null;
  companyId: string;
  company?: {
    id: string;
    name: string;
    slug?: string | null;
  } | null;
  cameraCount: number;
  onlineCameraCount: number;
  latestScore: number | null;
  complianceRate: number | null;
  lastActivity: string | null;
  alerts: Array<{
    id: string;
    severity: string;
    status: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface AdminWorksitesResponse {
  success: boolean;
  data?: AdminWorksiteSummary[];
  count?: number;
  error?: string;
  details?: string;
}

interface AdminCameraSummary {
  id: string;
  name: string;
  status: string | null;
  type: string | null;
  streamUrl?: string | null;
  hlsUrl?: string | null;
  mediamtxPath?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  port?: number | null;
  username?: string | null;
  worksiteId: string | null;
  worksite?: {
    id: string;
    name: string;
    location?: string | null;
    status?: string | null;
    company?: {
      id: string;
      name: string;
      slug?: string | null;
    } | null;
  } | null;
  lastHeartbeat?: string | null;
  online: boolean;
  trainingImageCount: number;
  lastUpdated: string;
  createdAt: string;
}

interface BillingRecordSummary {
  id: string;
  companyId: string;
  proofUrl: string | null;
  paidThrough: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BillingCompanySummary {
  company: {
    id: string;
    name: string;
    address?: string | null;
  };
  latestRecord: BillingRecordSummary | null;
  worksites: Array<{
    id: string;
    name: string;
  }>;
}

type IntegrationStatus = 'Connected' | 'Onboarding' | 'Ready for outreach';

interface IntegrationClientSummary {
  id: string;
  name: string;
  contact: string;
  worksiteCount: number;
  status: IntegrationStatus;
}

interface IntegrationsSectionProps {
  companies: AdminCompanySummary[] | null;
  worksites: AdminWorksiteSummary[] | null;
  loadingCompanies: boolean;
  loadingWorksites: boolean;
  onRefresh: () => void;
  onManageConnection: (company: IntegrationClientSummary) => void;
}

interface BillingSectionProps {
  companies: BillingCompanySummary[] | null;
  loading: boolean;
  error: string | null;
  uploadingCompanyId: string | null;
  onRefresh: () => void;
  onUploadReceipt: (input: { companyId: string; file: File; paidThrough?: string; notes?: string }) => Promise<void> | void;
  onUpdateRecord: (input: { recordId: string; companyId: string; paidThrough?: string | null; notes?: string }) => Promise<void> | void;
}

interface OnboardingSectionProps {
  companies: AdminCompanySummary[] | null;
  worksites: AdminWorksiteSummary[] | null;
  currentUser: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  onRefresh: () => void;
}

const INVITE_ROLE_OPTIONS = [
  { value: 'COMPANY_ADMIN', label: 'Company Admin' },
  { value: 'SITE_ADMIN', label: 'Site Admin' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'VIEWER', label: 'Viewer' },
] as const;
const DEFAULT_INVITE_ROLE = INVITE_ROLE_OPTIONS[0].value;

interface UsersRolesSectionProps {
  companies: AdminCompanySummary[] | null;
  worksites: AdminWorksiteSummary[] | null;
  onRefresh: () => void;
  companiesLoading?: boolean;
}

function OnboardingSection({
  companies,
  worksites,
  currentUser,
  onRefresh,
}: OnboardingSectionProps) {
  const [companyForm, setCompanyForm] = useState({
    name: '',
    handle: '',
    companyEmail: '',
    contactEmail: '',
    phone: '',
    address: '',
  });
  const [handleTouched, setHandleTouched] = useState(false);
  const [inviteEmailTouched, setInviteEmailTouched] = useState(false);
  const [worksiteForm, setWorksiteForm] = useState({
    companyId: '',
    worksiteName: '',
    location: '',
  });
  const [inviteForm, setInviteForm] = useState({
    companyId: '',
    worksiteId: '',
    email: '',
    role: DEFAULT_INVITE_ROLE,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error' | 'info' | null>(null);
  const [invitePreview, setInvitePreview] = useState<string | null>(null);
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [worksiteSubmitting, setWorksiteSubmitting] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const companyOptions = useMemo(
    () => companies?.map((company) => ({ value: company.id, label: company.name })) ?? [],
    [companies]
  );

  const inviteWorksiteOptions = useMemo(
    () =>
      worksites?.filter((worksite) => worksite.companyId === inviteForm.companyId) ?? [],
    [worksites, inviteForm.companyId]
  );

  const clearStatus = useCallback(() => {
    setFeedback(null);
    setFeedbackTone(null);
    setInvitePreview(null);
  }, []);

  useEffect(() => {
    if (handleTouched) return;
    const computed = slugify(companyForm.name);
    if (computed !== companyForm.handle) {
      setCompanyForm((prev) => ({ ...prev, handle: computed }));
    }
  }, [companyForm.name, companyForm.handle, handleTouched]);

  useEffect(() => {
    if (inviteEmailTouched) return;
    if (companyForm.contactEmail) {
      setInviteForm((prev) => ({ ...prev, email: companyForm.contactEmail }));
    }
  }, [companyForm.contactEmail, inviteEmailTouched]);

  useEffect(() => {
    if (!worksiteForm.companyId && companyOptions.length > 0) {
      setWorksiteForm((prev) => ({
        ...prev,
        companyId: companyOptions[0].value,
      }));
    }
  }, [companyOptions, worksiteForm.companyId]);

  useEffect(() => {
    if (!inviteForm.companyId && companyOptions.length > 0) {
      setInviteForm((prev) => ({
        ...prev,
        companyId: companyOptions[0].value,
        worksiteId: '',
      }));
    }
  }, [companyOptions, inviteForm.companyId]);

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (companySubmitting) return;

    clearStatus();
    setCompanySubmitting(true);

    try {
      const trimmedName = companyForm.name.trim();
      if (!trimmedName) {
        throw new Error('Company name is required.');
      }

      const trimmedCompanyEmail = companyForm.companyEmail.trim().toLowerCase();
      if (!trimmedCompanyEmail) {
        throw new Error('Company email is required.');
      }

      const baseHandle = slugify(companyForm.handle || trimmedName);
      if (!baseHandle) {
        throw new Error('Unable to generate a company handle from the provided name.');
      }

      const trimmedContactEmail = companyForm.contactEmail.trim().toLowerCase();

      const payloadBase = {
        name: trimmedName,
        email: trimmedCompanyEmail,
        contactEmail: trimmedContactEmail || null,
        phone: companyForm.phone?.trim() || null,
        address: companyForm.address?.trim() || null,
      };

      let attempt = 0;
      let slugCandidate = baseHandle;
      let createdCompany:
        | {
            id: string;
            name: string;
            companyUsername?: string;
            contactEmail?: string | null;
          }
        | null = null;
      let lastError: string | null = null;

      while (attempt < 3 && !createdCompany) {
        const response = await fetch('/api/admin/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payloadBase,
            companyUsername: slugCandidate,
          }),
        });

        const result = await response.json().catch(() => null);

        if (response.status === 409) {
          lastError =
            result?.error ||
            'A company with a similar handle already exists. Adjust the company name or handle and try again.';
          attempt += 1;
          slugCandidate = `${baseHandle}-${Math.floor(Math.random() * 9000 + 1000)}`;
          continue;
        }

        if (!response.ok || !result?.success || !result?.data) {
          lastError =
            result?.error ||
            result?.details ||
            `Failed to create company (${response.status})`;
          throw new Error(lastError || 'Unknown error');
        }

        createdCompany = result.data as {
          id: string;
          name: string;
          companyUsername?: string;
          contactEmail?: string | null;
        };
      }

      if (!createdCompany) {
        throw new Error(
          lastError ||
            'Unable to create the company after multiple attempts. Please adjust the details and try again.'
        );
      }

      let inviteMessage = '';
      let tone: 'success' | 'info' = 'success';

      if (trimmedContactEmail && currentUser?.id) {
        const inviteResponse = await fetch('/api/invitations/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: trimmedContactEmail,
            role: 'COMPANY_ADMIN',
            companyId: createdCompany.id,
            invitedBy: currentUser.id,
          }),
        });

        const invitePayload = await inviteResponse.json().catch(() => null);

        if (!inviteResponse.ok || !invitePayload?.success) {
          inviteMessage =
            invitePayload?.error ||
            invitePayload?.details ||
            'Company created, but the invitation email could not be sent.';
          tone = 'info';
        } else {
          inviteMessage = 'Invitation email sent to the primary contact.';
          if (invitePayload?.data?.inviteUrl) {
            setInvitePreview(invitePayload.data.inviteUrl as string);
          }
        }
      } else if (!trimmedContactEmail) {
        inviteMessage =
          'Company created. Add a contact email or use the invite form below when you are ready to send access.';
        tone = 'info';
      } else {
        inviteMessage =
          'Company created. Invitation email not sent because the current admin session could not be identified.';
        tone = 'info';
      }

      const message = `Company "${createdCompany.name}" created successfully.${
        inviteMessage ? ` ${inviteMessage}` : ''
      }`;

      setFeedback(message);
      setFeedbackTone(tone);

      setCompanyForm({
        name: '',
        handle: '',
        companyEmail: '',
        contactEmail: '',
        phone: '',
        address: '',
      });
      setHandleTouched(false);
      setInviteEmailTouched(false);
      setWorksiteForm((prev) => ({
        companyId: createdCompany?.id ?? prev.companyId,
        worksiteName: '',
        location: '',
      }));
      setInviteForm((prev) => ({
        ...prev,
        companyId: createdCompany?.id ?? prev.companyId,
        worksiteId: '',
        email: trimmedContactEmail || '',
        role: DEFAULT_INVITE_ROLE,
      }));
      onRefresh();
    } catch (error: any) {
      console.error('[super-admin][onboarding] create company failed', error);
      setFeedback(error?.message || 'Failed to create company. Please try again.');
      setFeedbackTone('error');
    } finally {
      setCompanySubmitting(false);
    }
  };

  const handleWorksiteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (worksiteSubmitting) return;

    if (!worksiteForm.companyId) {
      clearStatus();
      setFeedback('Select a company before adding a worksite.');
      setFeedbackTone('error');
      return;
    }

    clearStatus();
    setWorksiteSubmitting(true);

    try {
      const trimmedName = worksiteForm.worksiteName.trim();
      if (!trimmedName) {
        throw new Error('Worksite name is required.');
      }

      const locationValue = (worksiteForm.location || '').trim();

      const response = await fetch('/api/worksites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          worksiteName: slugify(trimmedName),
          location: locationValue || undefined,
          address: locationValue || undefined,
          companyId: worksiteForm.companyId,
          cameraSystemType: 'mixed',
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success || !result?.data) {
        const message =
          result?.error || result?.details || `Failed to create worksite (${response.status})`;
        throw new Error(message);
      }

      const worksite = result.data as { name: string; companyId: string };
      const companyName =
        companies?.find((company) => company.id === worksite.companyId)?.name || 'selected company';

      setFeedback(`Worksite "${worksite.name}" created for ${companyName}.`);
      setFeedbackTone('success');
      setWorksiteForm({
        companyId: worksite.companyId,
        worksiteName: '',
        location: '',
      });
      onRefresh();
    } catch (error: any) {
      console.error('[super-admin][onboarding] create worksite failed', error);
      setFeedback(error?.message || 'Failed to create worksite. Please try again.');
      setFeedbackTone('error');
    } finally {
      setWorksiteSubmitting(false);
    }
  };

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviteSubmitting) return;

    clearStatus();

    if (!currentUser?.id) {
      setFeedback('You must be signed in as a super admin to send invitations.');
      setFeedbackTone('error');
      return;
    }

    if (!inviteForm.companyId) {
      setFeedback('Select the company you want to invite this user to.');
      setFeedbackTone('error');
      return;
    }

    const trimmedEmail = inviteForm.email.trim().toLowerCase();
    if (!trimmedEmail) {
      setFeedback('Enter an email address to send the invitation.');
      setFeedbackTone('error');
      return;
    }

    setInviteSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        email: trimmedEmail,
        role: inviteForm.role,
        invitedBy: currentUser.id,
        companyId: inviteForm.companyId,
      };
      if (inviteForm.worksiteId) {
        payload.worksiteId = inviteForm.worksiteId;
      }

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const message =
          result?.error ||
          result?.details ||
          `Failed to send invitation (${response.status})`;
        throw new Error(message);
      }

      const companyLabel =
        companyOptions.find((option) => option.value === inviteForm.companyId)?.label ??
        'selected company';

      setFeedback(`Invitation sent to ${trimmedEmail} for ${companyLabel}.`);
      setFeedbackTone('success');
      if (result?.data?.inviteUrl) {
        setInvitePreview(result.data.inviteUrl as string);
      } else {
        setInvitePreview(null);
      }

      setInviteForm((prev) => ({
        ...prev,
        email: '',
        worksiteId: '',
        role: DEFAULT_INVITE_ROLE,
      }));
      setInviteEmailTouched(false);
    } catch (error: any) {
      console.error('[super-admin][onboarding] invite user failed', error);
      setFeedback(error?.message || 'Failed to send invitation. Please try again.');
      setFeedbackTone('error');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Calculate onboarding progress
  const onboardingSteps = [
    { id: 'company', label: 'Create Company', complete: (companies?.length || 0) > 0 },
    { id: 'worksite', label: 'Add Worksite', complete: (worksites?.length || 0) > 0 },
    { id: 'invite', label: 'Invite User', complete: false }, // Can track invites if needed
  ];
  const completedSteps = onboardingSteps.filter(s => s.complete).length;
  const progressPercent = (completedSteps / onboardingSteps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Tracker */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader
            title="Client Onboarding"
            description="Capture company details, primary contacts, and initial worksites before granting dashboard access."
            icon={Plug}
            accent="sky"
          />
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Sync latest records
          </button>
        </div>

        {/* Onboarding Progress Steps */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Onboarding Progress</span>
            <span className="text-sm font-medium text-white">{completedSteps}/{onboardingSteps.length} steps</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {onboardingSteps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step.complete ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  {step.complete ? '✓' : index + 1}
                </div>
                <span className={`text-sm ${step.complete ? 'text-emerald-400' : 'text-slate-400'}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-white">{companies?.length || 0}</p>
            <p className="text-xs text-slate-500">Companies</p>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-white">{worksites?.length || 0}</p>
            <p className="text-xs text-slate-500">Worksites</p>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-white">--</p>
            <p className="text-xs text-slate-500">Pending Invites</p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={classNames(
            'rounded-xl border p-4 text-sm transition-colors',
            feedbackTone === 'error'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
              : feedbackTone === 'info'
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
          )}
        >
          <p>{feedback}</p>
          {invitePreview && (
            <p className="mt-2 text-xs text-slate-200/80">
              Invite link (dev):{' '}
              <span className="break-all font-mono text-slate-100/90">{invitePreview}</span>
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleCompanySubmit}
          className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6"
        >
          <h3 className="text-lg font-semibold text-white">1. Company intake</h3>
          <p className="text-sm text-slate-400">
            Capture the basics so billing, integrations, and access policies can be configured.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Company name
              </label>
              <input
                required
                value={companyForm.name}
                onChange={(event) =>
                  setCompanyForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Acme Construction LLC"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Company handle (URL friendly)
              </label>
              <div className="space-y-1">
                <input
                  value={companyForm.handle}
                  onChange={(event) => {
                    setHandleTouched(true);
                    setCompanyForm((prev) => ({
                      ...prev,
                      handle: slugify(event.target.value),
                    }));
                  }}
                  onBlur={() => setHandleTouched(true)}
                  placeholder="acme-construction"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  Used in dashboards and invite links (letters, numbers, dashes)
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Company email
                </label>
                <input
                  type="email"
                  required
                  value={companyForm.companyEmail}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({ ...prev, companyEmail: event.target.value }))
                  }
                  placeholder="hq@acme.co"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Primary contact email
                </label>
                <input
                  type="email"
                  value={companyForm.contactEmail}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({ ...prev, contactEmail: event.target.value }))
                  }
                  placeholder="safety@acme.co"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  Optional: automatically invited as company admin
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </label>
                <input
                  value={companyForm.phone}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="(555) 123-0101"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Headquarters
                </label>
                <input
                  value={companyForm.address}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                  placeholder="Austin, TX"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {companies?.length ?? 0} companies already onboarded.
            </p>
            <button
              type="submit"
              disabled={companySubmitting}
              aria-busy={companySubmitting}
              className={classNames(
                'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition',
                companySubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-blue-500'
              )}
            >
              {companySubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create company'
              )}
            </button>
          </div>
        </form>

        <form
          onSubmit={handleWorksiteSubmit}
          className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6"
        >
          <h3 className="text-lg font-semibold text-white">2. Worksite intake</h3>
          <p className="text-sm text-slate-400">
            Assign project sites to a client. Once saved, camera ingestion and alert routing can
            be configured from the company dashboard.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Company
              </label>
              <select
                value={worksiteForm.companyId}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, companyId: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select company…</option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Worksite name
              </label>
              <input
                required
                value={worksiteForm.worksiteName}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, worksiteName: event.target.value }))
                }
                placeholder="Downtown Tower Expansion"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Location
              </label>
              <input
                value={worksiteForm.location}
                onChange={(event) =>
                  setWorksiteForm((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="Houston, TX"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {worksites?.length ?? 0} worksites managed from this hub.
            </p>
            <button
              type="submit"
              disabled={worksiteSubmitting}
              aria-busy={worksiteSubmitting}
              className={classNames(
                'inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition',
                worksiteSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-emerald-500'
              )}
            >
              {worksiteSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </>
              ) : (
                'Create worksite'
              )}
            </button>
          </div>
        </form>
      </div>

      <form
        onSubmit={handleInviteSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6"
      >
        <h3 className="text-lg font-semibold text-white">3. Send an invitation</h3>
        <p className="text-sm text-slate-400">
          Give a customer or teammate access immediately. Invitations include a secure link to
          claim their account and set a password.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Company
            </label>
            <select
              value={inviteForm.companyId}
              onChange={(event) =>
                setInviteForm((prev) => ({
                  ...prev,
                  companyId: event.target.value,
                  worksiteId: '',
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select company…</option>
              {companyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Worksite (optional)
            </label>
            <select
              value={inviteForm.worksiteId}
              onChange={(event) =>
                setInviteForm((prev) => ({ ...prev, worksiteId: event.target.value }))
              }
              disabled={!inviteForm.companyId || inviteWorksiteOptions.length === 0}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">No specific worksite</option>
              {inviteWorksiteOptions.map((worksite) => (
                <option key={worksite.id} value={worksite.id}>
                  {worksite.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Invitee email
            </label>
            <input
              type="email"
              required
              value={inviteForm.email}
              onChange={(event) => {
                setInviteEmailTouched(true);
                setInviteForm((prev) => ({ ...prev, email: event.target.value }));
              }}
              placeholder="ceo@client-company.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role
            </label>
            <select
              value={inviteForm.role}
              onChange={(event) =>
                setInviteForm((prev) => ({ ...prev, role: event.target.value as typeof prev.role }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {INVITE_ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          Invitations expire after 72 hours. Resend from the Users & Roles tab if needed.
        </div>

        <div className="mt-auto flex items-center justify-end">
          <button
            type="submit"
            disabled={inviteSubmitting}
            aria-busy={inviteSubmitting}
            className={classNames(
              'inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition',
              inviteSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-blue-400'
            )}
          >
            {inviteSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending…
              </>
            ) : (
              'Send invite'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

interface SuperAdminOverviewResponse {
  success: boolean;
  generatedAt: string;
  data: {
    summary: {
      totals: SummaryTotals;
      detectionVolumeLast24h: number;
      complianceRate: number | null;
      cameraUptime: number | null;
    };
    alerts: AlertsOverview;
    companies: {
      topPerformers: CompanyInsight[];
      atRisk: CompanyInsight[];
      totalTracked: number;
    };
    worksiteActivity: WorksiteActivityItem[];
    charts: {
      complianceTrend: TrendPoint[];
      detectionTrend: TrendPoint[];
    };
    cameraStatus: CameraStatusSummary;
    subscription: SubscriptionSummary;
  };
}

const NAVIGATION = [
  { key: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
  { key: 'companies', label: 'Companies', icon: Factory },
  { key: 'worksites', label: 'Worksites', icon: Building2 },
  { key: 'onboarding', label: 'Onboarding', icon: Plug },
  { key: 'cameras', label: 'Cameras', icon: Activity },
  { key: 'integrations', label: 'Integrations', icon: Handshake },
  { key: 'billing', label: 'Billing & Collections', icon: DollarSign },
  { key: 'users', label: 'Users & Roles', icon: Users },
  { key: 'reports', label: 'Reports & Analytics', icon: FileBarChart2 },
  { key: 'ai', label: 'AI & Detection', icon: Cpu },
  { key: 'settings', label: 'System Settings', icon: Settings },
  { key: 'support', label: 'Support & Audit Logs', icon: LifeBuoy },
  { key: 'extras', label: 'Labs & Feature Flags', icon: Layers3 },
] as const;

const TIME_RANGE_OPTIONS: { value: TimeRangeOption; label: string }[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'Year to date' },
];

export default function SuperAdminDashboardPage() {
  const { isLoading: authLoading, isAuthenticated, userRole, user } = useAuth({
    requiredRole: 'SUPER_ADMIN',
    redirectTo: '/login',
  });

  const [activeSection, setActiveSection] = useState<typeof NAVIGATION[number]['key']>('overview');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SuperAdminOverviewResponse['data'] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [companiesData, setCompaniesData] = useState<AdminCompanySummary[] | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [worksitesData, setWorksitesData] = useState<AdminWorksiteSummary[] | null>(null);
  const [worksitesLoading, setWorksitesLoading] = useState(false);
  const [worksitesError, setWorksitesError] = useState<string | null>(null);
  const [selectedWorksitesCompany, setSelectedWorksitesCompany] = useState<string>('ALL');
  const [camerasData, setCamerasData] = useState<AdminCameraSummary[] | null>(null);
  const [camerasLoading, setCamerasLoading] = useState(false);
  const [camerasError, setCamerasError] = useState<string | null>(null);
  const [selectedCamerasCompany, setSelectedCamerasCompany] = useState<string>('ALL');
  const [selectedCamerasWorksite, setSelectedCamerasWorksite] = useState<string>('ALL');
  const [selectedCamera, setSelectedCamera] = useState<AdminCameraSummary | null>(null);
  const [billingData, setBillingData] = useState<BillingCompanySummary[] | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingUploadingCompany, setBillingUploadingCompany] = useState<string | null>(null);
  const [integrationSelection, setIntegrationSelection] =
    useState<IntegrationClientSummary | null>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const fetchOverview = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to load overview (${response.status})`);
      }

      const payload = (await response.json()) as SuperAdminOverviewResponse;
      setData(payload.data);
      setLastUpdated(payload.generatedAt);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[super-admin] overview fetch failed', err);
      setError(err?.message || 'Unable to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchOverview(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOverview().catch(() => undefined);
      fetchMetrics().catch(() => undefined);
    }, 1000 * 60 * 5);

    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      const response = await fetch('/api/admin/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMetricsData(result.data);
        }
      }
    } catch (error) {
      console.error('[super-admin] metrics fetch failed', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Expose setActiveSection to window for clickable cards in OverviewSection
  useEffect(() => {
    (window as any).__setActiveTab = (tab: string) => {
      const validTabs = ['overview', 'companies', 'worksites', 'cameras', 'integrations', 'billing', 'onboarding', 'users', 'reports', 'settings', 'support'];
      if (validTabs.includes(tab)) {
        setActiveSection(tab as typeof NAVIGATION[number]['key']);
      }
    };
    return () => {
      delete (window as any).__setActiveTab;
    };
  }, []);

  const fetchCompanies = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setCompaniesLoading(true);
        setCompaniesError(null);

        console.log('[super-admin] Fetching companies...');

        // Use AbortController with longer timeout (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000);

        const response = await fetch('/api/admin/companies', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: signal || controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Don't retry on 500 errors - set error and stop
          if (response.status === 500) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        let payload: AdminCompaniesResponse | null = null;
        try {
          const json = await response.json();
          payload = json as AdminCompaniesResponse;
        } catch (parseErr) {
          throw new Error('Invalid JSON response from server');
        }

        if (!payload) {
          throw new Error('Empty response from server');
        }

        if (!payload.success) {
          throw new Error(payload.error || payload.details || 'Failed to load companies');
        }

        if (!payload.data) {
          // If no data but success=true, set empty array
          setCompaniesData([]);
          return;
        }

        console.log('[super-admin] Companies loaded:', payload.data?.length || 0);
        setCompaniesData(payload.data);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.log('[super-admin] Request aborted');
          return;
        }
        console.error('[super-admin] Companies fetch error:', err);
        console.error('[super-admin] companies fetch failed', err);
        setCompaniesError(err?.message || 'Unable to load company summaries');
        // Set empty array on error to prevent crashes
        setCompaniesData([]);
      } finally {
        setCompaniesLoading(false);
      }
    },
    []
  );

  // Single useEffect to fetch companies - only when section is active and we need data
  const companiesFetchRef = useRef(false);
  const companiesFailedRef = useRef(false);

  useEffect(() => {
    // Only fetch if:
    // 1. We're on the companies section
    // 2. We don't have data yet
    // 3. We're not already loading
    // 4. We haven't already started a fetch
    // 5. We haven't permanently failed (500 error)
    if (activeSection !== 'companies') {
      companiesFailedRef.current = false; // Reset on section change
      return;
    }
    if (companiesData || companiesLoading || companiesFetchRef.current || companiesFailedRef.current) return;
    
    companiesFetchRef.current = true;
      const controller = new AbortController();
    
    fetchCompanies(controller.signal)
      .catch((err) => {
        console.error('[super-admin] Fetch companies error:', err);
        // Only set error if it's not an abort
        if (err?.name !== 'AbortError') {
          setCompaniesError(err?.message || 'Failed to load companies');
          // Mark as permanently failed if it's a 500 error
          if (err?.message?.includes('500') || err?.message?.includes('Server error')) {
            companiesFailedRef.current = true;
          }
        }
      })
      .finally(() => {
        companiesFetchRef.current = false;
      });
    
    return () => {
      controller.abort();
      companiesFetchRef.current = false;
    };
  }, [activeSection]); // Only depend on activeSection

  useEffect(() => {
    if (!companiesData || companiesData.length === 0) return;
    if (
      selectedWorksitesCompany !== 'ALL' &&
      !companiesData.some((company) => company.id === selectedWorksitesCompany)
    ) {
      setSelectedWorksitesCompany('ALL');
      setWorksitesData(null);
    }
  }, [companiesData, selectedWorksitesCompany]);

  useEffect(() => {
    if (!companiesData || companiesData.length === 0) return;
    if (
      selectedCamerasCompany !== 'ALL' &&
      !companiesData.some((company) => company.id === selectedCamerasCompany)
    ) {
      setSelectedCamerasCompany('ALL');
      setSelectedCamerasWorksite('ALL');
      setCamerasData(null);
    }
  }, [companiesData, selectedCamerasCompany]);

  const fetchWorksites = useCallback(
    async (companyId?: string, signal?: AbortSignal) => {
      try {
        setWorksitesLoading(true);
        setWorksitesError(null);

        const query = new URLSearchParams();
        if (companyId) {
          query.set('companyId', companyId);
        }

        const url = `/api/admin/worksites${query.toString() ? `?${query.toString()}` : ''}`;
        console.log('[super-admin] Fetching worksites from:', url, 'companyId:', companyId);

        const response = await fetch(
          url,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal,
            cache: 'no-store',
          }
        );

        let payload: AdminWorksitesResponse | null = null;
        try {
          payload = (await response.json()) as AdminWorksitesResponse;
        } catch {
          payload = null;
        }

        if (!response.ok || !payload?.success || !payload.data) {
          const message =
            payload?.error ||
            payload?.details ||
            `Failed to load worksites (${response.status})`;
          console.error('[super-admin] Worksites fetch failed:', message, payload);
          throw new Error(message);
        }

        console.log('[super-admin] Worksites loaded:', payload.data?.length || 0, 'worksites');
        setWorksitesData(payload.data);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[super-admin] worksites fetch failed', err);
        setWorksitesError(err?.message || 'Unable to load worksites');
      } finally {
        setWorksitesLoading(false);
      }
    },
    []
  );

  const fetchCameras = useCallback(
    async (
      companyId?: string,
      worksiteId?: string,
      signal?: AbortSignal
    ) => {
      try {
        setCamerasLoading(true);
        setCamerasError(null);

        const query = new URLSearchParams();
        if (companyId) {
          query.set('companyId', companyId);
        }
        if (worksiteId) {
          query.set('worksiteId', worksiteId);
        }

        const response = await fetch(
          `/api/admin/cameras${query.toString() ? `?${query.toString()}` : ''}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal,
            cache: 'no-store',
          }
        );

        let payload: { success: boolean; data?: AdminCameraSummary[]; error?: string; details?: string } | null =
          null;
        try {
          payload = (await response.json()) as {
            success: boolean;
            data?: AdminCameraSummary[];
            error?: string;
            details?: string;
          };
        } catch {
          payload = null;
        }

        if (!response.ok || !payload?.success || !payload.data) {
          const message =
            payload?.error ||
            payload?.details ||
            `Failed to load cameras (${response.status})`;
          throw new Error(message);
        }

        setCamerasData(payload.data);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[super-admin] cameras fetch failed', err);
        setCamerasError(err?.message || 'Unable to load cameras');
      } finally {
        setCamerasLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeSection === 'worksites') {
      const controller = new AbortController();
      const companyId =
        selectedWorksitesCompany && selectedWorksitesCompany !== 'ALL'
          ? selectedWorksitesCompany
          : undefined;
      fetchWorksites(companyId, controller.signal).catch(() => undefined);
      return () => controller.abort();
    }
    return undefined;
  }, [activeSection, selectedWorksitesCompany, fetchWorksites]);

  useEffect(() => {
    if (activeSection === 'reports') {
      const controller = new AbortController();
      fetchWorksites(undefined, controller.signal).catch(() => undefined);
      return () => controller.abort();
    }
    return undefined;
  }, [activeSection, fetchWorksites]);

  useEffect(() => {
    if (activeSection === 'cameras') {
      const controller = new AbortController();
      const companyId =
        selectedCamerasCompany !== 'ALL' ? selectedCamerasCompany : undefined;
      const worksiteId =
        selectedCamerasWorksite !== 'ALL' ? selectedCamerasWorksite : undefined;
      fetchCameras(companyId, worksiteId, controller.signal).catch(
        () => undefined
      );
      return () => controller.abort();
    }
    return undefined;
  }, [
    activeSection,
    selectedCamerasCompany,
    selectedCamerasWorksite,
    fetchCameras,
  ]);

  useEffect(() => {
    setSelectedCamerasWorksite('ALL');
  }, [selectedCamerasCompany]);

  const fetchBilling = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setBillingLoading(true);
        setBillingError(null);
        const response = await fetch('/api/admin/billing', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal,
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load billing records');
        }
        setBillingData(payload.data ?? []);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[super-admin] billing fetch failed', err);
        setBillingError(err?.message || 'Unable to load billing data');
      } finally {
        setBillingLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeSection === 'billing') {
      const controller = new AbortController();
      fetchBilling(controller.signal).catch(() => undefined);
      return () => controller.abort();
    }
    return undefined;
  }, [activeSection, fetchBilling]);

  const openCameraDetails = useCallback((camera: AdminCameraSummary) => {
    setSelectedCamera(camera);
  }, []);

  const handleBillingUpload = useCallback(
    async ({
      companyId,
      file,
      paidThrough,
      notes,
    }: {
      companyId: string;
      file: File;
      paidThrough?: string;
      notes?: string;
    }) => {
      if (!file) {
        setBillingError('Upload a proof of payment PDF before marking as paid.');
        return;
      }
      try {
        setBillingUploadingCompany(companyId);
        setBillingError(null);
        const formData = new FormData();
        formData.append('companyId', companyId);
        formData.append('file', file);
        if (paidThrough) {
          formData.append('paidThrough', paidThrough);
        }
        if (notes) {
          formData.append('notes', notes);
        }
        const response = await fetch('/api/admin/billing', {
          method: 'POST',
          body: formData,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to upload billing proof');
        }
        await fetchBilling();
    } catch (err: any) {
      console.error('[super-admin] billing upload failed', err);
      const message = err?.message || 'Unable to upload billing proof.';
      setBillingError(message);
      throw err;
    } finally {
        setBillingUploadingCompany(null);
      }
    },
    [fetchBilling]
  );

  const handleBillingSchedule = useCallback(
    async ({
      recordId,
      companyId,
      paidThrough,
      notes,
    }: {
      recordId: string;
      companyId: string;
      paidThrough?: string | null;
      notes?: string;
    }) => {
      try {
        setBillingUploadingCompany(companyId);
        setBillingError(null);
        const response = await fetch('/api/admin/billing', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recordId,
            paidThrough,
            notes,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to update billing record');
        }
        await fetchBilling();
      } catch (err: any) {
        console.error('[super-admin] billing update failed', err);
        const message = err?.message || 'Unable to update billing record.';
        setBillingError(message);
        throw err;
      } finally {
        setBillingUploadingCompany(null);
      }
    },
    [fetchBilling]
  );

  const complianceAverage = useMemo(() => {
    if (!data?.summary.complianceRate) return null;
    return Number(data.summary.complianceRate.toFixed(1));
  }, [data?.summary.complianceRate]);

  const uptimePercentage = useMemo(() => {
    if (!data?.summary.cameraUptime && data?.summary.cameraUptime !== 0) return null;
    return data.summary.cameraUptime;
  }, [data?.summary.cameraUptime]);

  const renderContent = () => {
    if (loading && !data) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          <p className="mt-4 text-sm text-slate-300">Loading SiteSafe control tower...</p>
        </div>
      );
    }

    if (error && !data) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/40 bg-red-950/30 p-10 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-200">Unable to load metrics</h3>
            <p className="mt-2 max-w-lg text-sm text-red-200/80">{error}</p>
          </div>
          <button
            onClick={() => fetchOverview()}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection
            data={data}
            metrics={metricsData}
            metricsLoading={metricsLoading}
            loading={loading}
            error={error}
            onRefresh={() => {
              fetchOverview();
              fetchMetrics();
            }}
            lastUpdated={lastUpdated}
            complianceAverage={complianceAverage}
            uptimePercentage={uptimePercentage}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        );
      case 'companies':
        return (
          <CompaniesSection
            companies={companiesData}
            loading={companiesLoading}
            error={companiesError}
            onRefresh={() => fetchCompanies().catch(() => undefined)}
          />
        );
      case 'worksites':
        return (
          <WorksitesSection
            companies={companiesData}
            selectedCompanyId={selectedWorksitesCompany}
            onSelectedCompanyChange={setSelectedWorksitesCompany}
            worksites={worksitesData}
            loading={worksitesLoading}
            error={worksitesError}
            onRefresh={() =>
              fetchWorksites(
                selectedWorksitesCompany !== 'ALL'
                  ? selectedWorksitesCompany
                  : undefined
              ).catch(() => undefined)
            }
          />
        );
      case 'cameras':
        return (
          <CamerasSection
            companies={companiesData}
            selectedCompanyId={selectedCamerasCompany}
            onSelectedCompanyChange={setSelectedCamerasCompany}
            selectedWorksiteId={selectedCamerasWorksite}
            onSelectedWorksiteChange={setSelectedCamerasWorksite}
            cameras={camerasData}
            loading={camerasLoading}
            error={camerasError}
            onRefresh={() =>
              fetchCameras(
                selectedCamerasCompany !== 'ALL'
                  ? selectedCamerasCompany
                  : undefined,
                selectedCamerasWorksite !== 'ALL'
                  ? selectedCamerasWorksite
                  : undefined
              ).catch(() => undefined)
            }
            onOpenCameraDetails={openCameraDetails}
          />
        );
      case 'onboarding':
        return (
          <OnboardingSection
            companies={companiesData}
            worksites={worksitesData}
            currentUser={user ?? null}
            onRefresh={() => {
              fetchCompanies().catch(() => undefined);
              fetchWorksites(undefined).catch(() => undefined);
            }}
          />
        );
      case 'integrations':
        return (
          <IntegrationsSection
            companies={companiesData}
            worksites={worksitesData}
            loadingCompanies={companiesLoading}
            loadingWorksites={worksitesLoading}
            onRefresh={() => {
              fetchCompanies().catch(() => undefined);
              fetchWorksites(undefined).catch(() => undefined);
            }}
            onManageConnection={setIntegrationSelection}
          />
        );
      case 'billing':
        return (
          <BillingSection
            companies={billingData}
            loading={billingLoading}
            error={billingError}
            uploadingCompanyId={billingUploadingCompany}
            onRefresh={() => fetchBilling().catch(() => undefined)}
            onUploadReceipt={handleBillingUpload}
            onUpdateRecord={handleBillingSchedule}
          />
        );
      case 'users':
        return (
          <UsersRolesSection
            companies={companiesData}
            worksites={worksitesData}
            companiesLoading={companiesLoading}
            onRefresh={() => {
              fetchCompanies().catch(() => undefined);
              fetchWorksites(undefined).catch(() => undefined);
            }}
          />
        );
      case 'ai':
        return (
          <ComingSoon
            title="AI & Detection Settings"
            description="Roll out YOLO model updates, manage inference thresholds, and audit detection performance."
            actions={[
              { label: 'Open AI training workspace', href: '/dashboard/ai-training' },
            ]}
          />
        );
      case 'reports':
        return (
          <ReportsSection
            overview={data}
            companies={companiesData}
            worksites={worksitesData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            loading={loading}
            companiesLoading={companiesLoading}
            worksitesLoading={worksitesLoading}
            onRefresh={() => {
              void fetchOverview();
              fetchCompanies().catch(() => undefined);
              fetchWorksites(undefined).catch(() => undefined);
            }}
          />
        );
      case 'settings':
        return (
          <SystemSettingsSection onRefresh={() => fetchOverview().catch(() => undefined)} />
        );
      case 'support':
        return (
          <SupportAuditSection onRefresh={() => fetchOverview().catch(() => undefined)} />
        );
      case 'extras':
        return (
          <ComingSoon
            title="Labs & Feature Flags"
            description="Enable beta features for pilot customers, manage partner integrations, and launch experiments."
            accent="purple"
            actions={[
              { label: 'Feature flag roadmap', href: '/FEATURE_FLAGS.md', disabled: true },
            ]}
          />
        );
      default:
        return null;
    }
  };

  if (authLoading || !isAuthenticated || userRole !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <p className="mt-4 text-sm text-slate-300">Authorizing super admin access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:w-72 lg:flex-col overflow-y-auto border-r border-slate-800/80 bg-slate-950/70 backdrop-blur lg:sticky lg:top-0 lg:h-screen">
          <div className="flex h-20 items-center gap-3 border-b border-slate-800/60 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">SiteSafe</p>
              <h1 className="text-lg font-semibold text-white">Global Control Tower</h1>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-1">
              {NAVIGATION.map(({ key, label, icon: Icon }) => {
                const isActive = activeSection === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-100 ring-1 ring-inset ring-blue-400/60'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="border-t border-slate-800/60 px-6 py-5 text-xs text-slate-500">
            <p className="font-semibold text-slate-300">Operational Guardrails</p>
            <p className="mt-1">
              Before production deployment, replace COCO-SSD fallback model with custom YOLO PPE detection (Option B).
            </p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <header className="border-b border-slate-800/60 bg-slate-950/80 px-6 py-6 shadow-lg shadow-black/30">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-semibold text-white">Super Admin Dashboard</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Monitor global safety performance, tenants, and platform health in real time.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 sm:flex">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  {uptimePercentage !== null ? (
                    <>
                      {uptimePercentage.toFixed(1)}% <span className="text-slate-500">camera uptime</span>
                    </>
                  ) : (
                    'Uptime data pending'
                  )}
                </div>
                <button
                  onClick={() => fetchOverview()}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <section className="relative px-6 py-8">
            <div className="mx-auto max-w-7xl space-y-8">
              {lastUpdated && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Updated {new Date(lastUpdated).toLocaleString()}
                  {loading && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Syncing
                    </span>
                  )}
                </div>
              )}

              {renderContent()}
            </div>
          </section>
          {selectedCamera && (
            <CameraDetailModal
              camera={selectedCamera}
              onClose={() => setSelectedCamera(null)}
            />
          )}
        </main>
        {integrationSelection && (
          <IntegrationDrawer
            company={integrationSelection}
            onClose={() => setIntegrationSelection(null)}
          />
        )}
      </div>
    </div>
  );
}

interface OverviewSectionProps {
  data: SuperAdminOverviewResponse['data'] | null;
  metrics: any;
  metricsLoading: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  lastUpdated: string | null;
  complianceAverage: number | null;
  uptimePercentage: number | null;
  timeRange: TimeRangeOption;
  onTimeRangeChange: (range: TimeRangeOption) => void;
}

function OverviewSection({
  data,
  metrics,
  metricsLoading,
  loading,
  error,
  onRefresh,
  lastUpdated,
  complianceAverage,
  uptimePercentage,
  timeRange,
  onTimeRangeChange,
}: OverviewSectionProps) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 text-slate-300">
        No data available yet.
      </div>
    );
  }

  const { summary, alerts, companies, worksiteActivity, charts, cameraStatus, subscription } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Companies"
          value={summary.totals.companies}
          icon={Factory}
          subtitle={`${companies.totalTracked} tracked in analytics`}
          onClick={() => (window as any).__setActiveTab?.('companies')}
        />
        <MetricCard
          title="Live Worksites"
          value={summary.totals.worksites}
          icon={Building2}
          subtitle={`${cameraStatus.online}/${cameraStatus.total} cameras online`}
          onClick={() => (window as any).__setActiveTab?.('worksites')}
        />
        <MetricCard
          title="Global Compliance"
          value={complianceAverage !== null ? `${complianceAverage.toFixed(1)}%` : 'Pending'}
          icon={ShieldCheck}
          subtitle={complianceAverage !== null ? 'Based on latest safety scores' : 'Awaiting safety score data'}
          accent={complianceAverage !== null ? (complianceAverage >= 90 ? 'emerald' : complianceAverage >= 70 ? 'amber' : 'red') : 'default'}
          percentage={complianceAverage ?? undefined}
        />
        <MetricCard
          title="Detections (24h)"
          value={summary.detectionVolumeLast24h.toLocaleString()}
          icon={Cpu}
          subtitle="AI inference volume last 24 hours"
          accent="violet"
          onClick={() => (window as any).__setActiveTab?.('reports')}
        />
      </div>

      {/* Camera Fleet Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{cameraStatus.online}</p>
          <p className="text-xs text-emerald-300/70">Online</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{cameraStatus.offline}</p>
          <p className="text-xs text-red-300/70">Offline</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{cameraStatus.error}</p>
          <p className="text-xs text-amber-300/70">Error</p>
        </div>
        <div className="rounded-xl border border-slate-500/30 bg-slate-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-slate-400">{cameraStatus.total}</p>
          <p className="text-xs text-slate-300/70">Total Fleet</p>
        </div>
      </div>

      {/* Global KPIs */}
      {metrics && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <SectionHeader
            title="Global KPIs"
            description="Platform operational metrics and performance indicators"
            icon={BarChart3}
            accent="violet"
          />
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* MTTA/MTTR */}
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">MTTA</p>
              <p className="mt-1 text-2xl font-bold text-blue-400">
                {metrics.alerts?.mttaFormatted || 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Mean Time To Acknowledge</p>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">MTTR</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {metrics.alerts?.mttrFormatted || 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Mean Time To Resolve</p>
            </div>
            {/* AI Performance */}
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">AI Precision</p>
              <p className="mt-1 text-2xl font-bold text-purple-400">
                {metrics.aiPerformance?.precision ? `${metrics.aiPerformance.precision}%` : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.aiPerformance?.falsePositives || 0} false positives
              </p>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">AI Recall</p>
              <p className="mt-1 text-2xl font-bold text-indigo-400">
                {metrics.aiPerformance?.recall ? `${metrics.aiPerformance.recall}%` : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.aiPerformance?.truePositives || 0} true positives
              </p>
            </div>
          </div>

          {/* Camera Health Diagnostics */}
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Avg Frame Rate</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {metrics.cameraHealth?.avgFrameRate ? `${metrics.cameraHealth.avgFrameRate} FPS` : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.cameraHealth?.camerasOnline || 0} cameras online
              </p>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Stream Quality</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {metrics.cameraHealth?.avgStreamQuality ? `${metrics.cameraHealth.avgStreamQuality}%` : 'N/A'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.cameraHealth?.streamFailures || 0} failures (24h)
              </p>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Inference Errors</p>
              <p className="mt-1 text-2xl font-bold text-red-400">
                {metrics.cameraHealth?.inferenceErrors || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.cameraHealth?.camerasWithErrors || 0} cameras with errors
              </p>
            </div>
          </div>

          {/* Security & Billing */}
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Failed Logins (24h)</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {metrics.security?.failedLogins || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Security incidents</p>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Past Due Accounts</p>
              <p className="mt-1 text-2xl font-bold text-red-400">
                {metrics.billing?.pastDueAccounts || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.billing?.upcomingRenewals || 0} renewals in 30d
              </p>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">API Requests (24h)</p>
              <p className="mt-1 text-2xl font-bold text-blue-400">
                {metrics.platformHealth?.apiRequests?.toLocaleString() || '0'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Platform activity</p>
            </div>
          </div>
        </div>
      )}

      {metricsLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="ml-4 text-sm text-slate-400">Loading platform metrics...</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Global Trends</h3>
            <p className="text-sm text-slate-400">
              Monitor compliance and detection throughput across the entire platform.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <TrendPanel
            title="Compliance Trend"
            description="Average safety score across all worksites"
            icon={LineChart}
            data={charts.complianceTrend}
            valueKey="value"
            suffix="%"
            color="#38bdf8"
          />
          <TrendPanel
            title="Detection Volume"
            description="AI detections captured daily"
            icon={Activity}
            data={charts.detectionTrend}
            valueKey="detections"
            color="#a855f7"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <SectionHeader
            title="Alert Summary"
            description="System-wide alert posture by severity and status."
            icon={BellRing}
            accent="red"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <AlertSummaryCard
              headline="By Severity"
              data={[
                { label: 'Critical', value: alerts.severity.critical, color: 'text-red-300' },
                { label: 'Warning', value: alerts.severity.warning, color: 'text-amber-300' },
                { label: 'Info', value: alerts.severity.info, color: 'text-slate-300' },
              ]}
              total={alerts.severity.total}
            />
            <AlertSummaryCard
              headline="By Status"
              data={[
                { label: 'Active', value: alerts.status.active, color: 'text-blue-300' },
                { label: 'Acknowledged', value: alerts.status.acknowledged, color: 'text-emerald-300' },
                { label: 'Resolved', value: alerts.status.resolved, color: 'text-slate-300' },
                { label: 'Escalated', value: alerts.status.escalated, color: 'text-red-300' },
              ]}
              total={alerts.status.total}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <SectionHeader
            title="Camera Uptime"
            description="Real-time health of the camera fleet"
            icon={Activity}
            accent="emerald"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <StatusGauge
              label="Fleet uptime"
              value={uptimePercentage !== null ? uptimePercentage : undefined}
              helper="Percent of cameras reporting online or active"
            />
            <StatusBreakdown
              totals={cameraStatus}
              items={[
                { label: 'Online', value: cameraStatus.online, color: 'bg-emerald-500/20 text-emerald-300' },
                { label: 'Offline', value: cameraStatus.offline, color: 'bg-red-500/20 text-red-300' },
                { label: 'Error', value: cameraStatus.error, color: 'bg-amber-500/20 text-amber-300' },
                { label: 'Other', value: cameraStatus.other, color: 'bg-slate-500/20 text-slate-300' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CompaniesTable
          title="Top Performing Companies"
          description="Highest average safety scores across their worksites."
          companies={companies.topPerformers}
          variant="positive"
        />
        <CompaniesTable
          title="At-Risk Companies"
          description="Lowest compliance scores or declining activity."
          companies={companies.atRisk}
          variant="risk"
        />
      </div>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <SectionHeader
          title="Worksite Activity"
          description="Recent activity across key worksites."
          icon={MapPin}
          accent="sky"
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {worksiteActivity.length === 0 ? (
            <p className="col-span-full rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-5 text-sm text-slate-400">
              No recent worksite activity recorded yet.
            </p>
          ) : (
            worksiteActivity.map((worksite) => (
              <WorksiteTile key={worksite.id} worksite={worksite} />
            ))
          )}
        </div>
      </div>

      {subscription.placeholder && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-amber-100">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5" />
            <div>
              <h3 className="text-lg font-semibold text-white">Billing dashboard coming soon</h3>
              <p className="text-sm text-amber-100/80">
                {subscription.message ||
                  'Revenue analytics will surface once billing integration is connected. This card tracks readiness.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {lastUpdated && (
        <p className="text-right text-xs text-slate-500">
          Snapshot generated {new Date(lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}

interface CompaniesSectionProps {
  companies: AdminCompanySummary[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function CompaniesSection({ companies, loading, error, onRefresh }: CompaniesSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'worksites' | 'users' | 'cameras'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterByWorksites, setFilterByWorksites] = useState<'all' | 'has' | 'none'>('all');
  const [filterByUsers, setFilterByUsers] = useState<'all' | 'has' | 'none'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    
    let filtered = [...companies];
    
    // Search filter
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((company) => {
        const searchFields = [
        company.name,
        company.email,
        company.phone,
        company.address,
      ]
        .filter(Boolean)
          .map((v) => String(v).toLowerCase());
        
        return searchFields.some((field) => field.includes(term));
      });
    }
    
    // Worksite filter
    if (filterByWorksites === 'has') {
      filtered = filtered.filter(c => (c.worksiteCount || 0) > 0);
    } else if (filterByWorksites === 'none') {
      filtered = filtered.filter(c => (c.worksiteCount || 0) === 0);
    }
    
    // User filter
    if (filterByUsers === 'has') {
      filtered = filtered.filter(c => (c.userCount || 0) > 0);
    } else if (filterByUsers === 'none') {
      filtered = filtered.filter(c => (c.userCount || 0) === 0);
    }
    
    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(c => {
        const created = new Date(c.createdAt);
        return created >= cutoff;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'created':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'worksites':
          aVal = a.worksiteCount || 0;
          bVal = b.worksiteCount || 0;
          break;
        case 'users':
          aVal = a.userCount || 0;
          bVal = b.userCount || 0;
          break;
        case 'cameras':
          aVal = a.cameraCount || 0;
          bVal = b.cameraCount || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [companies, searchTerm, sortBy, sortOrder, filterByWorksites, filterByUsers, dateRange]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / itemsPerPage));
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, filterByWorksites, filterByUsers, dateRange]);

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Companies</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage all tenant companies and their resources
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Search and Quick Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
        <input
              type="text"
          value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone, or address..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
          
        <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'worksites' | 'users' | 'cameras')}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="created">Newest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="worksites">Most Worksites</option>
              <option value="users">Most Users</option>
              <option value="cameras">Most Cameras</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 transition"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                showFilters || filterByWorksites !== 'all' || filterByUsers !== 'all' || dateRange !== 'all'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700 bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
        </div>
      </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Worksites
                </label>
                <select
                  value={filterByWorksites}
                  onChange={(e) => setFilterByWorksites(e.target.value as 'all' | 'has' | 'none')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All</option>
                  <option value="has">Has Worksites</option>
                  <option value="none">No Worksites</option>
                </select>
        </div>
              
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Users
                </label>
                <select
                  value={filterByUsers}
                  onChange={(e) => setFilterByUsers(e.target.value as 'all' | 'has' | 'none')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All</option>
                  <option value="has">Has Users</option>
                  <option value="none">No Users</option>
                </select>
        </div>
              
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Created Date
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as 'all' | 'today' | 'week' | 'month' | 'year')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </div>
            
            {(filterByWorksites !== 'all' || filterByUsers !== 'all' || dateRange !== 'all') && (
              <button
                onClick={() => {
                  setFilterByWorksites('all');
                  setFilterByUsers('all');
                  setDateRange('all');
                }}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {loading && !companies && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-3 text-sm text-slate-300">Loading companies...</span>
        </div>
      )}

      {error && !companies && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !companies && !error && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p className="text-lg font-semibold text-white">No companies yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Companies will appear here once they are created.
          </p>
        </div>
      )}

      {companies && companies.length > 0 && (
        <>
          {error && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
              {error} — showing cached data
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Showing {paginatedCompanies.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} companies
              {filteredCompanies.length !== companies.length && ` (${companies.length} total)`}
            </span>
            {(searchTerm || filterByWorksites !== 'all' || filterByUsers !== 'all' || dateRange !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterByWorksites('all');
                  setFilterByUsers('all');
                  setDateRange('all');
                }}
                className="text-blue-400 hover:text-blue-300"
              >
                Clear all filters
              </button>
            )}
          </div>
          
          {filteredCompanies.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-lg font-semibold text-white">No companies match your filters</p>
              <p className="mt-2 text-sm text-slate-400">
                Try adjusting your search terms or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {paginatedCompanies.map((company) => (
                  <CompanyCard 
                    key={company.id} 
                    company={company}
                  />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                  <div className="text-sm text-slate-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = 
                          page === 1 || 
                          page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1);
                        
                        if (!showPage) {
                          // Show ellipsis
                          if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="px-2 text-slate-500">...</span>;
                          }
                          return null;
                        }
                        
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-700 bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// Unused component - kept for potential future use
function CompanyDetailDrawer({
  company,
  details,
  loading,
  onClose,
  onRefresh,
}: {
  company: AdminCompanySummary;
  details: any;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    billingTier: details?.billingTier || 'standard',
    contractStart: details?.contractStart ? new Date(details.contractStart).toISOString().split('T')[0] : '',
    contractEnd: details?.contractEnd ? new Date(details.contractEnd).toISOString().split('T')[0] : '',
    slaLevel: details?.slaLevel || 'standard',
    insuranceCoverageStatus: details?.insuranceCoverageStatus || '',
    modelVersion: details?.modelVersion || '',
    mrr: details?.mrr || '',
    churnRisk: details?.churnRisk || 'low',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        onRefresh();
        onClose();
      }
    } catch (error) {
      console.error('Failed to update company:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{company.name}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metadata Form */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  Billing Tier
                </label>
                <select
                  value={formData.billingTier}
                  onChange={(e) => setFormData({ ...formData, billingTier: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="free">Free</option>
                  <option value="pilot">Pilot</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  SLA Level
                </label>
                <select
                  value={formData.slaLevel}
                  onChange={(e) => setFormData({ ...formData, slaLevel: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  Contract Start
                </label>
                <input
                  type="date"
                  value={formData.contractStart}
                  onChange={(e) => setFormData({ ...formData, contractStart: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  Contract End
                </label>
                <input
                  type="date"
                  value={formData.contractEnd}
                  onChange={(e) => setFormData({ ...formData, contractEnd: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  Insurance Coverage Status
                </label>
                <select
                  value={formData.insuranceCoverageStatus}
                  onChange={(e) => setFormData({ ...formData, insuranceCoverageStatus: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="">None</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  Model Version
                </label>
                <input
                  type="text"
                  value={formData.modelVersion}
                  onChange={(e) => setFormData({ ...formData, modelVersion: e.target.value })}
                  placeholder="e.g., v1.2.3"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  MRR ($)
                </label>
                <input
                  type="number"
                  value={formData.mrr}
                  onChange={(e) => setFormData({ ...formData, mrr: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  Churn Risk
                </label>
                <select
                  value={formData.churnRisk}
                  onChange={(e) => setFormData({ ...formData, churnRisk: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* User List, Worksite List, Camera List */}
            {details && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Users</p>
                  <p className="mt-2 text-2xl font-bold text-white">{details.users?.length || 0}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Worksites</p>
                  <p className="mt-2 text-2xl font-bold text-white">{details.worksites?.length || 0}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cameras</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {details.worksites?.reduce((sum: number, ws: any) => sum + (ws.cameras?.length || 0), 0) || 0}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyCard({ company, onClick }: { company: AdminCompanySummary; onClick?: () => void }) {
  const createdDisplay = company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—';
  const createdDate = company.createdAt ? new Date(company.createdAt) : null;
  const daysAgo = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const createdRelative = daysAgo !== null 
    ? daysAgo === 0 
      ? 'Today' 
      : daysAgo === 1 
        ? 'Yesterday' 
        : `${daysAgo} days ago`
    : '—';

  const content = (
    <div className="group block rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 transition hover:border-blue-500/60 hover:bg-slate-900/80">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-white group-hover:text-blue-300 truncate">
            {company.name}
          </h3>
          {company.email && (
            <p className="mt-1 text-sm text-slate-400 truncate">{company.email}</p>
          )}
          {company.address && (
            <p className="mt-1 text-xs text-slate-500 truncate">{company.address}</p>
          )}
        </div>
        <span className="flex-shrink-0 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            {company.worksiteCount ?? 0} sites
          </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <CompanyStat label="Worksites" value={company.worksiteCount ?? 0} />
        <CompanyStat label="Users" value={company.userCount ?? 0} />
        <CompanyStat label="Cameras" value={company.cameraCount ?? 0} />
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <span>Created {createdDisplay}</span>
        <span>{createdRelative}</span>
      </div>
      
      {company.phone && (
        <div className="mt-3 text-xs text-slate-500">
          {company.phone}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <div onClick={onClick} className="cursor-pointer">
        {content}
      </div>
    );
  }

  return content;
}

function CompanyStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  const displayValue =
    typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-white leading-tight break-words">
        {displayValue}
      </p>
      {helper && (
        <p className="mt-1 text-xs text-slate-500 leading-snug break-words">
          {helper}
        </p>
      )}
    </div>
  );
}

function CameraHealthSummaryCard({
  title,
  value,
  icon: Icon,
  color,
  percentage,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'emerald' | 'red' | 'amber';
  percentage?: number;
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {percentage !== undefined && (
            <p className={`text-xs ${color === 'emerald' ? 'text-emerald-400' : 'text-slate-400'}`}>
              {percentage.toFixed(0)}% of fleet
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function WorksiteSnapshotRow({ snapshot }: { snapshot: CompanyWorksiteSnapshot }) {
  const complianceDisplay =
    typeof snapshot.latestScore === 'number'
      ? `${snapshot.latestScore.toFixed(1)}%`
      : 'Pending';

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-white">{snapshot.name}</p>
        <p className="text-xs text-slate-500">
          {snapshot.location || 'Location pending'}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>
          {snapshot.onlineCameraCount}/{snapshot.cameraCount} cams
        </span>
        <span>{complianceDisplay}</span>
      </div>
    </div>
  );
}

interface WorksitesSectionProps {
  companies: AdminCompanySummary[] | null;
  selectedCompanyId: string;
  onSelectedCompanyChange: (value: string) => void;
  worksites: AdminWorksiteSummary[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function WorksitesSection({
  companies,
  selectedCompanyId,
  onSelectedCompanyChange,
  worksites,
  loading,
  error,
  onRefresh,
}: WorksitesSectionProps) {
  const hasWorksites = Array.isArray(worksites) && worksites.length > 0;
  const companyOptions = useMemo(() => {
    const options = companies?.map((company) => ({
      label: company.name,
      value: company.id,
    })) ?? [];
    return [{ label: 'All Companies', value: 'ALL' }, ...options];
  }, [companies]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ALERT' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(0);
  const pageSize = 3;

  const filteredWorksites = useMemo(() => {
    if (!worksites) return [];
    const term = searchTerm.trim().toLowerCase();
    return worksites.filter((worksite) => {
      const matchesCompany =
        selectedCompanyId === 'ALL' || worksite.companyId === selectedCompanyId;

      if (!matchesCompany) return false;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && (worksite.status || '').toUpperCase() === 'ACTIVE') ||
        (statusFilter === 'ALERT' && (worksite.status || '').toUpperCase() === 'ALERT') ||
        (statusFilter === 'INACTIVE' && (worksite.status || '').toUpperCase() === 'INACTIVE');

      if (!matchesStatus) return false;

      if (term.length === 0) return true;

      const fields = [
        worksite.name,
        worksite.location,
        worksite.company?.name,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());

      return fields.some((value) => value.includes(term));
    });
  }, [worksites, searchTerm, statusFilter, selectedCompanyId]);

  const totalPages = Math.max(1, Math.ceil(filteredWorksites.length / pageSize));
  const paginatedWorksites = useMemo(() => {
    const start = page * pageSize;
    return filteredWorksites.slice(start, start + pageSize);
  }, [filteredWorksites, page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter, selectedCompanyId]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <SectionHeader
            title="Worksite Explorer"
            description="Filter by company to inspect worksite readiness, compliance, and camera coverage."
            icon={Building2}
            accent="violet"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                onSelectedCompanyChange(event.target.value);
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {companyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {(!companies || companies.length === 0) && (
              <span className="text-xs text-slate-500">
                No companies available yet. Add tenants to populate this filter.
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-300' : 'text-slate-300'}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by worksite name or location…"
          className="w-full md:w-72 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="flex items-center gap-2">
          <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>
            All
          </FilterChip>
          <FilterChip active={statusFilter === 'ACTIVE'} onClick={() => setStatusFilter('ACTIVE')}>
            Active
          </FilterChip>
          <FilterChip active={statusFilter === 'ALERT'} onClick={() => setStatusFilter('ALERT')}>
            Alerting
          </FilterChip>
          <FilterChip
            active={statusFilter === 'INACTIVE'}
            onClick={() => setStatusFilter('INACTIVE')}
          >
            Inactive
          </FilterChip>
        </div>
      </div>

      {loading && !hasWorksites && (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-3 text-sm text-slate-300">Fetching worksites…</span>
        </div>
      )}

      {!loading && !hasWorksites && !error && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-10 text-center text-slate-300">
          <p className="text-lg font-semibold text-white">No worksites found</p>
          <p className="mt-2 text-sm text-slate-400">
            Create worksites for the selected company to see monitoring details here.
          </p>
        </div>
      )}

      {error && !hasWorksites && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {hasWorksites && (
        <>
          {error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
              {error} — showing previously loaded worksites.
            </div>
          )}
          {filteredWorksites.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-10 text-center text-slate-300">
              <p className="text-lg font-semibold text-white">No worksites match your filters</p>
              <p className="mt-2 text-sm text-slate-400">
                Adjust the search term or status filter to broaden your results.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
                {paginatedWorksites.map((worksite) => (
                  <WorksiteCard key={worksite.id} worksite={worksite} />
                ))}
              </div>
              <PaginationControls
                page={page}
                totalPages={totalPages}
                onPrev={() => setPage((prev) => Math.max(0, prev - 1))}
                onNext={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

interface ReportsSectionProps {
  overview: SuperAdminOverviewResponse['data'] | null;
  companies: AdminCompanySummary[] | null;
  worksites: AdminWorksiteSummary[] | null;
  timeRange: TimeRangeOption;
  onTimeRangeChange: (value: TimeRangeOption) => void;
  loading: boolean;
  companiesLoading: boolean;
  worksitesLoading: boolean;
  onRefresh: () => void;
}

interface ReportDataset {
  key: 'compliance' | 'alerts' | 'camera-health';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function ReportsSection({
  overview,
  companies,
  worksites,
  timeRange,
  onTimeRangeChange,
  loading,
  companiesLoading,
  worksitesLoading,
  onRefresh,
}: ReportsSectionProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedWorksite, setSelectedWorksite] = useState<string>('ALL');
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [detailedLoading, setDetailedLoading] = useState(false);

  const companyOptions = useMemo(() => {
    const options =
      companies?.map((company) => ({
        value: company.id,
        label: company.name,
      })) ?? [];
    return [{ value: 'ALL', label: 'All companies' }, ...options];
  }, [companies]);

  useEffect(() => {
    if (
      selectedCompany !== 'ALL' &&
      !companyOptions.some((option) => option.value === selectedCompany)
    ) {
      setSelectedCompany('ALL');
    }
  }, [companyOptions, selectedCompany]);

  const filteredWorksites = useMemo(() => {
    if (!worksites) return [];
    return worksites.filter((worksite) => {
      if (selectedCompany !== 'ALL' && worksite.companyId !== selectedCompany) {
        return false;
      }
      return true;
    });
  }, [worksites, selectedCompany]);

  const worksiteOptions = useMemo(() => {
    const options = filteredWorksites.map((worksite) => ({
      value: worksite.id,
      label: worksite.name,
    }));
    return [{ value: 'ALL', label: 'All worksites' }, ...options];
  }, [filteredWorksites]);

  useEffect(() => {
    setSelectedWorksite('ALL');
  }, [selectedCompany]);

  useEffect(() => {
    if (
      selectedWorksite !== 'ALL' &&
      !worksiteOptions.some((option) => option.value === selectedWorksite)
    ) {
      setSelectedWorksite('ALL');
    }
  }, [selectedWorksite, worksiteOptions]);

  // Fetch detailed report data
  useEffect(() => {
    const fetchDetailedData = async () => {
      setDetailedLoading(true);
      try {
        const params = new URLSearchParams({
          timeRange,
          ...(selectedCompany !== 'ALL' && { companyId: selectedCompany }),
          ...(selectedWorksite !== 'ALL' && { worksiteId: selectedWorksite }),
        });
        const response = await fetch(`/api/admin/reports/detailed?${params}`);
        const result = await response.json();
        if (result.success) {
          setDetailedData(result.data);
        }
      } catch (error) {
        console.error('[ReportsSection] Failed to fetch detailed data:', error);
      } finally {
        setDetailedLoading(false);
      }
    };

    fetchDetailedData();
  }, [selectedCompany, selectedWorksite, timeRange]);

  const datasets: ReportDataset[] = [
    {
      key: 'compliance',
      title: 'Compliance Snapshot',
      description: 'Latest safety scores, camera coverage, and activity per worksite.',
      icon: ShieldCheck,
    },
    {
      key: 'alerts',
      title: 'Alert Activity',
      description: 'Alert volume and severity breakdown for the selected scope.',
      icon: BellRing,
    },
    {
      key: 'camera-health',
      title: 'Camera Health',
      description: 'Online/offline status, last heartbeat, and stream metadata per camera.',
      icon: Activity,
    },
  ];

  const buildReportPayload = useCallback(
    (datasetKey: ReportDataset['key']) => {
      const timestamp = new Date().toISOString();
      const baseFilters = {
        timeRange,
        companyId: selectedCompany !== 'ALL' ? selectedCompany : null,
        worksiteId: selectedWorksite !== 'ALL' ? selectedWorksite : null,
      } as const;

      if (datasetKey === 'compliance') {
        const scopedWorksites =
          (selectedWorksite !== 'ALL'
            ? filteredWorksites.filter((worksite) => worksite.id === selectedWorksite)
            : filteredWorksites) ?? [];

        const records = scopedWorksites.map((worksite) => ({
          worksiteId: worksite.id,
          worksiteName: worksite.name,
          companyId: worksite.companyId,
          companyName: worksite.company?.name ?? null,
          complianceRate: worksite.complianceRate,
          latestScore: worksite.latestScore,
          cameraCount: worksite.cameraCount,
          onlineCameraCount: worksite.onlineCameraCount,
          lastActivity: worksite.lastActivity,
          status: worksite.status,
        }));

        return {
          type: 'compliance-snapshot',
          generatedAt: timestamp,
          filters: baseFilters,
          records,
          note:
            records.length === 0
              ? 'No worksites matched the selected filters at export time.'
              : undefined,
        };
      }

      if (datasetKey === 'alerts') {
        const alertSummary = overview?.alerts ?? null;

        return {
          type: 'alert-activity',
          generatedAt: timestamp,
          filters: baseFilters,
          summary: alertSummary,
          detections: overview?.charts.detectionTrend ?? [],
          note: alertSummary
            ? undefined
            : 'Alert metrics have not been generated for the selected scope.',
        };
      }

      if (datasetKey === 'camera-health') {
        const scopedWorksites =
          (selectedWorksite !== 'ALL'
            ? filteredWorksites.filter((worksite) => worksite.id === selectedWorksite)
            : filteredWorksites) ?? [];

        const cameraRecords = scopedWorksites.map((worksite) => ({
          worksiteId: worksite.id,
          worksiteName: worksite.name,
          companyId: worksite.companyId,
          companyName: worksite.company?.name ?? null,
          cameraCount: worksite.cameraCount,
          onlineCameraCount: worksite.onlineCameraCount,
          complianceRate: worksite.complianceRate,
          status: worksite.status,
          lastActivity: worksite.lastActivity,
        }));

        return {
          type: 'camera-health',
          generatedAt: timestamp,
          filters: baseFilters,
          totals: overview?.summary ?? null,
          records: cameraRecords,
          note:
            cameraRecords.length === 0
              ? 'No worksites available to generate camera health data for the selected filters.'
              : undefined,
        };
      }

      throw new Error('Unsupported dataset');
    },
    [filteredWorksites, overview, selectedCompany, selectedWorksite, timeRange]
  );

  const handleExport = useCallback(
    (datasetKey: ReportDataset['key']) => {
      setExportError(null);
      setExportingKey(datasetKey);
      try {
        const payload = buildReportPayload(datasetKey);
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const companySegment =
          selectedCompany !== 'ALL' ? `company-${selectedCompany}` : 'all-companies';
        const worksiteSegment =
          selectedWorksite !== 'ALL' ? `worksite-${selectedWorksite}` : 'all-worksites';
        link.href = url;
        link.download = `${datasetKey}-${companySegment}-${worksiteSegment}-${timeRange}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err: any) {
        setExportError(err?.message || 'Unable to export report.');
      } finally {
        setExportingKey(null);
      }
    },
    [buildReportPayload, selectedCompany, selectedWorksite, timeRange]
  );

  const complianceRate = overview?.summary.complianceRate ?? null;
  const cameraUptime = overview?.summary.cameraUptime ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader
            title="Reports & Analytics"
            description="Export executive-ready insights filtered by time, company, and worksite scope."
            icon={FileBarChart2}
            accent="violet"
          />
          <div className="flex items-center gap-3">
            <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh data
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Companies"
            value={overview?.summary.totals.companies ?? (companies?.length ?? 0)}
            icon={Factory}
          />
          <MetricCard
            title="Total Worksites"
            value={overview?.summary.totals.worksites ?? (worksites?.length ?? 0)}
            icon={Building2}
          />
          <MetricCard
            title="Global Compliance"
            value={
              complianceRate !== null ? `${(complianceRate * 100).toFixed(1)}%` : 'Pending'
            }
            subtitle="Average across all monitored worksites"
            icon={ShieldCheck}
            accent="emerald"
            percentage={complianceRate !== null ? complianceRate * 100 : undefined}
          />
          <MetricCard
            title="Camera Uptime"
            value={cameraUptime !== null ? `${(cameraUptime * 100).toFixed(1)}%` : 'Pending'}
            subtitle="Active cameras during selected window"
            icon={Activity}
            accent="violet"
            percentage={cameraUptime !== null ? cameraUptime * 100 : undefined}
          />
        </div>

        {/* Alert Trend Preview */}
        {overview?.charts?.detectionTrend && overview.charts.detectionTrend.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
            <h4 className="text-sm font-medium text-slate-400 mb-3">Detection Trend ({timeRange})</h4>
            <div className="flex items-end gap-1 h-16">
              {overview.charts.detectionTrend.slice(-14).map((point, i) => {
                const pointValue = point.detections ?? point.value ?? 0;
                const maxValue = Math.max(...overview.charts.detectionTrend.slice(-14).map(p => p.detections ?? p.value ?? 0), 1);
                const height = (pointValue / maxValue) * 100;
                return (
                  <div 
                    key={i} 
                    className="flex-1 bg-blue-500/60 hover:bg-blue-500 rounded-t transition-all"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${point.date}: ${pointValue} detections`}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Last {Math.min(overview.charts.detectionTrend.length, 14)} data points</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Company scope
            </label>
            <select
              value={selectedCompany}
              onChange={(event) => setSelectedCompany(event.target.value)}
              disabled={companiesLoading && companyOptions.length === 0}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-900 disabled:text-slate-500"
            >
              {companyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Worksite scope
            </label>
            <select
              value={selectedWorksite}
              onChange={(event) => setSelectedWorksite(event.target.value)}
              disabled={worksitesLoading && filteredWorksites.length === 0}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-900 disabled:text-slate-500"
            >
              {worksiteOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {datasets.map((dataset) => (
            <ReportCard
              key={dataset.key}
              dataset={dataset}
              onExport={() => handleExport(dataset.key)}
              exporting={exportingKey === dataset.key}
            />
          ))}
        </div>

        {exportError && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
            {exportError}
          </div>
        )}
      </div>

      {/* Detailed Analytics Section */}
      {detailedData && (
        <div className="space-y-6">
          {/* Alert Statistics */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Alert Statistics</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
                <p className="text-xs text-slate-400">Total Alerts</p>
                <p className="mt-1 text-2xl font-bold text-white">{detailedData.alerts.total}</p>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
                <p className="text-xs text-slate-400">Critical</p>
                <p className="mt-1 text-2xl font-bold text-red-400">
                  {detailedData.alerts.bySeverity.CRITICAL}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
                <p className="text-xs text-slate-400">Resolved</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {detailedData.alerts.byStatus.RESOLVED}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
                <p className="text-xs text-slate-400">Avg Response</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">
                  {detailedData.alerts.avgResponseTime
                    ? `${Math.round(detailedData.alerts.avgResponseTime)} min`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Camera Health */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Camera Health</h3>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
                <p className="text-xs text-slate-400">Total Cameras</p>
                <p className="mt-1 text-2xl font-bold text-white">{detailedData.cameras.total}</p>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
                <p className="text-xs text-slate-400">Online</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {detailedData.cameras.online}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
                <p className="text-xs text-slate-400">Offline</p>
                <p className="mt-1 text-2xl font-bold text-red-400">
                  {detailedData.cameras.offline}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
                <p className="text-xs text-slate-400">With Heartbeat</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">
                  {detailedData.cameras.withRecentHeartbeat}
                </p>
              </div>
            </div>
          </div>

          {/* Top Violations */}
          {detailedData.detections.byType.length > 0 && (
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Top Violations</h3>
              <div className="space-y-2">
                {detailedData.detections.byType.slice(0, 10).map((violation: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/40 p-3"
                  >
                    <span className="text-sm text-white">{violation.type}</span>
                    <span className="text-sm font-semibold text-slate-300">{violation.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worksite Performance */}
          {detailedData.worksites.length > 0 && (
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Worksite Performance</h3>
              <div className="space-y-3">
                {detailedData.worksites.slice(0, 10).map((worksite: any) => (
                  <div
                    key={worksite.id}
                    className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{worksite.name}</p>
                        <p className="text-xs text-slate-400">{worksite.companyName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {worksite.latestScore !== null
                            ? `${worksite.latestScore.toFixed(1)}%`
                            : 'N/A'}
                        </p>
                        <p className="text-xs text-slate-400">Compliance</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400">Cameras</p>
                        <p className="font-semibold text-white">
                          {worksite.onlineCameras}/{worksite.cameraCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Alerts</p>
                        <p className="font-semibold text-white">{worksite.alertCount}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Critical</p>
                        <p className="font-semibold text-red-400">{worksite.criticalAlerts}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Status</p>
                        <p className="font-semibold text-white">{worksite.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {detailedLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 p-12">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-sm text-slate-400">Loading detailed analytics...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function WorksiteCard({ worksite }: { worksite: AdminWorksiteSummary }) {
  const [expanded, setExpanded] = useState(false);
  const complianceScore = typeof worksite.latestScore === 'number' ? worksite.latestScore : null;
  const complianceDisplay = complianceScore !== null ? `${complianceScore.toFixed(0)}%` : 'Pending';
  const lastActivityDisplay = formatRelativeActivity(worksite.lastActivity);
  const cameraUptime = worksite.cameraCount > 0 ? (worksite.onlineCameraCount / worksite.cameraCount) * 100 : 0;
  const alertCount = worksite.alerts?.length || 0;

  // Risk score based on compliance and alerts
  const riskLevel = (() => {
    if (complianceScore === null) return 'unknown';
    if (complianceScore >= 90 && alertCount === 0) return 'low';
    if (complianceScore >= 70 && alertCount <= 2) return 'medium';
    return 'high';
  })();

  const riskColors = {
    low: 'border-emerald-500/30 bg-emerald-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    high: 'border-red-500/30 bg-red-500/5',
    unknown: 'border-slate-700 bg-slate-900/60',
  };

  const statusClass = (() => {
    const status = (worksite.status || '').toUpperCase();
    if (status === 'ACTIVE') return 'bg-emerald-500/20 text-emerald-300';
    if (status === 'INACTIVE') return 'bg-slate-500/20 text-slate-300';
    if (status === 'MAINTENANCE') return 'bg-amber-500/20 text-amber-300';
    if (status === 'ALERT') return 'bg-red-500/20 text-red-300';
    return 'bg-slate-500/20 text-slate-300';
  })();

  const complianceColor = complianceScore === null ? 'bg-slate-600' : 
    complianceScore >= 90 ? 'bg-emerald-500' : complianceScore >= 70 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={`rounded-2xl border ${riskColors[riskLevel]} transition-all self-start`}>
      {/* Main Card - Clickable to expand */}
      <div 
        className="p-5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500 truncate">
              {worksite.company?.name || 'Unassigned'}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white truncate">
              {worksite.name}
            </h3>
            {worksite.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {worksite.location}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
              {worksite.status || 'Unknown'}
            </span>
            {riskLevel !== 'unknown' && (
              <span className={`text-[10px] font-medium ${riskLevel === 'low' ? 'text-emerald-400' : riskLevel === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                {riskLevel.toUpperCase()} RISK
              </span>
            )}
          </div>
        </div>

        {/* Compact Metrics Row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {/* Camera Health */}
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Cameras</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold text-white">{worksite.onlineCameraCount}</span>
              <span className="text-xs text-slate-500">/ {worksite.cameraCount}</span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-slate-700 overflow-hidden">
              <div 
                className={`h-full ${cameraUptime >= 80 ? 'bg-emerald-500' : cameraUptime >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${cameraUptime}%` }}
              />
            </div>
          </div>

          {/* Compliance */}
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Compliance</div>
            <div className={`text-lg font-bold ${complianceScore === null ? 'text-slate-400' : complianceScore >= 90 ? 'text-emerald-400' : complianceScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
              {complianceDisplay}
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-slate-700 overflow-hidden">
              <div className={`h-full ${complianceColor}`} style={{ width: `${complianceScore ?? 0}%` }} />
            </div>
          </div>

          {/* Alerts */}
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Alerts</div>
            <div className={`text-lg font-bold ${alertCount === 0 ? 'text-emerald-400' : alertCount <= 2 ? 'text-amber-400' : 'text-red-400'}`}>
              {alertCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{lastActivityDisplay}</div>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="mt-3 flex items-center justify-center">
          <svg className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Mini-Dashboard */}
      {expanded && (
        <div className="border-t border-slate-800/60 p-5 space-y-4">
          {/* Alert Timeline */}
          {worksite.alerts.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recent Alerts</p>
              <div className="space-y-2">
                {worksite.alerts.slice(0, 5).map((alert) => (
                  <WorksiteAlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-3 text-sm text-slate-400">
              No active alerts
            </div>
          )}

          {/* Action Button - Using Link with prefetch for fast navigation */}
          <Link
            href={`/dashboard?worksite=${worksite.id}`}
            prefetch={true}
            className="block w-full text-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 transition-colors"
          >
            Open Worksite Dashboard →
          </Link>
        </div>
      )}
    </div>
  );
}

function WorksiteAlertRow({
  alert,
}: {
  alert: AdminWorksiteSummary['alerts'][number];
}) {
  const severityClass = (() => {
    const severity = alert.severity.toUpperCase();
    if (severity === 'CRITICAL' || severity === 'EMERGENCY') {
      return 'text-red-300';
    }
    if (severity === 'HIGH' || severity === 'WARNING') {
      return 'text-amber-300';
    }
    return 'text-slate-300';
  })();

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
      <span className={`font-semibold ${severityClass}`}>
        {alert.severity}
      </span>
      <span>{formatRelativeActivity(alert.createdAt)}</span>
      <span className="uppercase tracking-wide text-slate-500">{alert.status}</span>
    </div>
  );
}

interface CamerasSectionProps {
  companies: AdminCompanySummary[] | null;
  selectedCompanyId: string;
  onSelectedCompanyChange: (value: string) => void;
  selectedWorksiteId: string;
  onSelectedWorksiteChange: (value: string) => void;
  cameras: AdminCameraSummary[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenCameraDetails: (camera: AdminCameraSummary) => void;
}

function CamerasSection({
  companies,
  selectedCompanyId,
  onSelectedCompanyChange,
  selectedWorksiteId,
  onSelectedWorksiteChange,
  cameras,
  loading,
  error,
  onRefresh,
  onOpenCameraDetails,
}: CamerasSectionProps) {
  const companyOptions = useMemo(() => {
    const explicitCompanies =
      companies?.map((company) => ({
        label: company.name,
        value: company.id,
      })) ?? [];

    const derivedFromCameras =
      cameras
        ?.map((camera) => camera.worksite?.company)
        .filter((company): company is NonNullable<typeof company> => Boolean(company))
        .map((company) => ({
          label: company.name || 'Unnamed company',
          value: company.id,
        })) ?? [];

    const map = new Map<string, string>();

    [...explicitCompanies, ...derivedFromCameras].forEach(({ value, label }) => {
      if (value) {
        map.set(value, label);
      }
    });

    const entries = Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));

    return [{ label: 'All Companies', value: 'ALL' }, ...entries];
  }, [companies, cameras]);

  const worksiteOptions = useMemo(() => {
    if (!cameras || cameras.length === 0) {
      return [{ label: 'All Worksites', value: 'ALL' }];
    }
    const map = new Map<string, string>();
    cameras.forEach((camera) => {
      const worksite = camera.worksite;
      const cameraCompanyId = worksite?.company?.id;
      if (
        worksite &&
        worksite.id &&
        (selectedCompanyId === 'ALL' || cameraCompanyId === selectedCompanyId)
      ) {
        map.set(worksite.id, worksite.name || 'Unnamed worksite');
      }
    });
    const entries = Array.from(map.entries()).map(([value, label]) => ({
      label,
      value,
    }));
    return [{ label: 'All Worksites', value: 'ALL' }, ...entries];
  }, [cameras, selectedCompanyId]);

  useEffect(() => {
    if (selectedWorksiteId === 'ALL') return;
    if (!worksiteOptions.some((option) => option.value === selectedWorksiteId)) {
      onSelectedWorksiteChange('ALL');
    }
  }, [selectedWorksiteId, worksiteOptions, onSelectedWorksiteChange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <SectionHeader
            title="Camera Fleet"
            description="Monitor connection health, stream endpoints, and AI readiness across every deployed camera."
            icon={Activity}
            accent="emerald"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Company
              </label>
              <select
                value={selectedCompanyId}
                onChange={(event) => {
                  onSelectedCompanyChange(event.target.value);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Worksite
              </label>
              <select
                value={selectedWorksiteId}
                onChange={(event) => {
                  onSelectedWorksiteChange(event.target.value);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {worksiteOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-300' : 'text-slate-300'}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Camera Health Summary */}
      {cameras && cameras.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CameraHealthSummaryCard
            title="Total Cameras"
            value={cameras.length}
            icon={Video}
            color="blue"
          />
          <CameraHealthSummaryCard
            title="Online"
            value={cameras.filter(c => (c.status || '').toUpperCase() === 'ONLINE' || c.online).length}
            icon={Wifi}
            color="emerald"
            percentage={cameras.length > 0 ? (cameras.filter(c => (c.status || '').toUpperCase() === 'ONLINE' || c.online).length / cameras.length) * 100 : 0}
          />
          <CameraHealthSummaryCard
            title="Offline"
            value={cameras.filter(c => (c.status || '').toUpperCase() === 'OFFLINE').length}
            icon={WifiOff}
            color="red"
          />
          <CameraHealthSummaryCard
            title="Errors"
            value={cameras.filter(c => (c.status || '').toUpperCase() === 'ERROR').length}
            icon={AlertTriangle}
            color="amber"
          />
        </div>
      )}

      {loading && (!cameras || cameras.length === 0) && (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-3 text-sm text-slate-300">Loading cameras…</span>
        </div>
      )}

      {!loading && (!cameras || cameras.length === 0) && !error && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-10 text-center text-slate-300">
          <p className="text-lg font-semibold text-white">No cameras found</p>
          <p className="mt-2 text-sm text-slate-400">
            Assign cameras to the selected company/worksite to see them here.
          </p>
          <a
            href="/dashboard/cameras"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Manage cameras (current portal)
          </a>
        </div>
      )}

      {error && (!cameras || cameras.length === 0) && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {cameras && cameras.length > 0 && (
        <>
          {error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
              {error} — showing previously loaded camera data.
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {cameras.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onViewDetails={onOpenCameraDetails}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CameraCard({
  camera,
  onViewDetails,
}: {
  camera: AdminCameraSummary;
  onViewDetails: (camera: AdminCameraSummary) => void;
}) {
  const hlsUrl = normalizeStreamUrl(camera.hlsUrl || camera.streamUrl);
  const sourceUrl = normalizeStreamUrl(camera.streamUrl);

  const isOnline = (camera.status || '').toUpperCase() === 'ONLINE' || camera.online;
  const isError = (camera.status || '').toUpperCase() === 'ERROR';
  const isOffline = (camera.status || '').toUpperCase() === 'OFFLINE';

  const statusBadge = (() => {
    if (isOnline) return { label: 'Online', className: 'bg-emerald-500/20 text-emerald-300', dot: 'bg-emerald-500' };
    if (isOffline) return { label: 'Offline', className: 'bg-red-500/20 text-red-300', dot: 'bg-red-500' };
    if (isError) return { label: 'Error', className: 'bg-amber-500/20 text-amber-300', dot: 'bg-amber-500' };
    return { label: camera.status || 'Unknown', className: 'bg-slate-500/20 text-slate-300', dot: 'bg-slate-500' };
  })();

  const lastHeartbeat = camera.lastHeartbeat
    ? formatRelativeActivity(camera.lastHeartbeat)
    : 'No heartbeat';
  const worksite = camera.worksite;
  const company = worksite?.company;

  // AI readiness indicator
  const aiReadiness = camera.trainingImageCount >= 100 ? 'trained' : 
    camera.trainingImageCount >= 50 ? 'learning' : 'needs-data';

  return (
    <div className={`rounded-2xl border ${isOnline ? 'border-emerald-500/30' : isError ? 'border-amber-500/30' : isOffline ? 'border-red-500/30' : 'border-slate-800/70'} bg-slate-900/60 p-5 transition hover:bg-slate-900/80`}>
      {/* Header with status indicator */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${statusBadge.dot} ${isOnline ? 'animate-pulse' : ''}`} />
            <h3 className="text-base font-semibold text-white truncate">{camera.name}</h3>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {camera.id.slice(0, 12)}...</p>
          <p className="text-xs text-slate-400 mt-1">
            {company?.name || 'Unassigned'} → {worksite?.name || 'No worksite'}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Health Metrics Grid */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-800/50 p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Heartbeat</p>
          <p className={`mt-1 text-xs font-medium ${lastHeartbeat === 'No heartbeat' ? 'text-red-400' : 'text-white'}`}>
            {lastHeartbeat}
          </p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">AI Data</p>
          <p className="mt-1 text-xs font-medium text-white">{camera.trainingImageCount} <span className="text-slate-500">snaps</span></p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">AI Status</p>
          <p className={`mt-1 text-xs font-medium ${aiReadiness === 'trained' ? 'text-emerald-400' : aiReadiness === 'learning' ? 'text-amber-400' : 'text-red-400'}`}>
            {aiReadiness === 'trained' ? 'Ready' : aiReadiness === 'learning' ? 'Learning' : 'Needs Data'}
          </p>
        </div>
      </div>

      {/* Stream URL - Compact */}
      <div className="mt-3 rounded-lg bg-slate-800/30 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Stream</p>
        <p className="mt-0.5 text-[10px] text-slate-400 truncate font-mono">
          {camera.streamUrl || camera.hlsUrl || 'Not configured'}
        </p>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
        {camera.type && (
          <span className="rounded border border-slate-700/70 bg-slate-900 px-1.5 py-0.5">{camera.type}</span>
        )}
        {camera.metadata?.modelVersion && (
          <span className="rounded border border-slate-700/70 bg-slate-900 px-1.5 py-0.5">v{camera.metadata.modelVersion}</span>
        )}
        {camera.mediamtxPath && (
          <span className="rounded border border-slate-700/70 bg-slate-900 px-1.5 py-0.5">{camera.mediamtxPath}</span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {camera.type && (
          <span className="rounded-lg border border-slate-700/70 bg-slate-900 px-2 py-1">
            {camera.type}
          </span>
        )}
        {camera.metadata?.modelVersion && (
          <span className="rounded-lg border border-slate-700/70 bg-slate-900 px-2 py-1">
            Model {camera.metadata.modelVersion}
          </span>
        )}
        {camera.mediamtxPath && (
          <span className="rounded-lg border border-slate-700/70 bg-slate-900 px-2 py-1">
            MediaMTX: {camera.mediamtxPath}
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => onViewDetails(camera)}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20"
        >
          Open Camera Details
        </button>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Open Raw Stream
          </a>
        )}
      </div>
    </div>
  );
}

function CameraDetailModal({
  camera,
  onClose,
}: {
  camera: AdminCameraSummary;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsUrl = normalizeStreamUrl(camera.hlsUrl || camera.streamUrl);
  const sourceUrl = normalizeStreamUrl(camera.streamUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!hlsUrl) {
      video.removeAttribute('src');
      video.load();
      return;
    }
    video.src = hlsUrl;
    video.load();
  }, [hlsUrl]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {camera.worksite?.company?.name || 'Unassigned company'}
            </p>
            <h3 className="text-2xl font-semibold text-white">{camera.name}</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">ID: {camera.id}</p>
            {camera.worksite?.name && (
              <p className="text-xs text-slate-500 mt-1">{camera.worksite.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close camera details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-6">
          <div>
            {hlsUrl ? (
              <video
                key={hlsUrl}
                ref={videoRef}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="h-64 w-full rounded-lg bg-black"
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/70 px-4 py-6 text-sm text-slate-400">
                No HLS stream configured for this camera.
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Demo streams may return HTTP 403 from the CDN. Replace the HLS URL with a camera feed you can access, or download the raw stream below to test in your own player.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField
              label="Status"
              value={camera.status || (camera.online ? 'ONLINE' : 'UNKNOWN')}
            />
            <DetailField
              label="Last heartbeat"
              value={
                camera.lastHeartbeat
                  ? formatRelativeActivity(camera.lastHeartbeat)
                  : 'No heartbeat registered'
              }
            />
            <DetailField
              label="Last updated"
              value={formatRelativeActivity(camera.lastUpdated)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField
              label="Company"
              value={camera.worksite?.company?.name || 'Unassigned'}
            />
            <DetailField
              label="Worksite"
              value={camera.worksite?.name || 'Unassigned'}
            />
            <DetailField
              label="Location"
              value={camera.worksite?.location || 'Unknown'}
            />
            <DetailField
              label="MediaMTX Path"
              value={camera.mediamtxPath || '—'}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="Camera ID" value={<span className="font-mono text-xs">{camera.id}</span>} />
            <DetailField label="IP Address" value={camera.ipAddress || '—'} />
            <DetailField
              label="Port"
              value={camera.port ? camera.port.toString() : '—'}
            />
            <DetailField
              label="Stream URL (RTSP)"
              value={
                camera.streamUrl ? (
                  <a
                    href={camera.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-200 break-all text-xs"
                  >
                    {camera.streamUrl}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <DetailField
              label="HLS URL"
              value={
                camera.hlsUrl ? (
                  <a
                    href={camera.hlsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-200 break-all text-xs"
                  >
                    {camera.hlsUrl}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <DetailField
              label="Credentials"
              value={
                camera.username
                  ? `${camera.username}${camera.metadata?.password ? ` / ${camera.metadata.password}` : ''}`
                  : '—'
              }
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Open Raw Stream in New Tab
              </a>
            )}
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection({
  companies,
  worksites,
  loadingCompanies,
  loadingWorksites,
  onRefresh,
  onManageConnection,
}: IntegrationsSectionProps) {
  const totalCompanies = companies?.length ?? 0;
  const totalWorksites = worksites?.length ?? 0;
  const [syncing, setSyncing] = useState(false);

  const partnerPrograms = useMemo(
    () => [
      {
        id: 'guardian',
        name: 'Guardian Mutual Risk Alliance',
        status: 'Active',
        coverage: ['General Liability', 'Workers’ Compensation'],
        sla: '24h endorsements',
      },
      {
        id: 'fortress',
        name: 'Fortress Industrial Insurance',
        status: 'Pilot',
        coverage: ['Heavy Equipment', 'Builder’s Risk'],
        sla: '48h bind & issue',
      },
      {
        id: 'summit',
        name: 'Summit Specialty Underwriters',
        status: 'Discovery',
        coverage: ['Environmental Liability', 'Umbrella'],
        sla: 'Custom quoting',
      },
    ],
    []
  );

  const integrationRows = useMemo(() => {
    if (!companies) return [];
    return companies.map((company, index) => {
      const worksiteCount =
        worksites?.filter((worksite) => worksite.companyId === company.id).length ?? 0;
      const statusCycle = index % 3;
      const status: IntegrationStatus =
        statusCycle === 0
          ? 'Connected'
          : statusCycle === 1
          ? 'Onboarding'
          : 'Ready for outreach';
      return {
        id: company.id,
        name: company.name,
        contact: company.email || 'Not provided',
        worksiteCount,
        status,
      };
    });
  }, [companies, worksites]);

  const connectedClients = integrationRows.filter(
    (row) => row.status === 'Connected'
  ).length;
  const clientsNeedingAttention = integrationRows.filter(
    (row) => row.status !== 'Connected'
  ).length;

  useEffect(() => {
    if (loadingCompanies || loadingWorksites) {
      setSyncing(true);
      return;
    }
    const timeout = setTimeout(() => setSyncing(false), 300);
    return () => clearTimeout(timeout);
  }, [loadingCompanies, loadingWorksites]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader
            title="Insurance Integrations Control"
            description="You control every carrier connection. Clients can review their coverage, but cannot alter integration credentials."
            icon={Handshake}
            accent="emerald"
          />
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh status
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Centralizing insurance programs keeps sensitive premium and payment settings out of
          client dashboards. Your super-admin team can activate carriers, adjust coverage
          tiers, and audit renewals from one place.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Partner Programs"
            value={partnerPrograms.length}
            subtitle="Carriers available in the platform"
            icon={Shield}
            accent="violet"
          />
          <MetricCard
            title="Clients Connected"
            value={`${connectedClients}/${totalCompanies}`}
            subtitle="Active companies with insurance configured"
            icon={CheckCircle2}
            accent="emerald"
          />
          <MetricCard
            title="Worksites Covered"
            value={totalWorksites}
            subtitle="Sites tied to an insurance profile"
            icon={Building2}
            accent="default"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Carrier Programs</h3>
            {syncing && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                <Loader2 className="h-3 w-3 animate-spin text-blue-300" />
                Syncing
              </div>
            )}
          </div>
          <div className="space-y-4">
            {partnerPrograms.map((partner) => (
              <div
                key={partner.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{partner.name}</p>
                    <p className="text-xs text-slate-500">{partner.status}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                    <Plug className="h-3.5 w-3.5" />
                    Managed by admin
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {partner.coverage.map((coverage) => (
                    <span
                      key={coverage}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                    >
                      {coverage}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {partner.sla}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-white">Client dashboard message</h3>
          <p className="text-sm text-emerald-100/90">
            Clients see an &ldquo;Insurance Settings&rdquo; page where they can review active
            coverage, download certificates, and request adjustments. They cannot modify the
            carrier integration or billing credentials—those remain super-admin only.
          </p>
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-4 text-xs text-emerald-50">
            <strong>Tip:</strong> Keep messaging consistent so clients understand how to
            request endorsements or changes without touching sensitive settings.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Company integration status</h3>
          <span className="text-xs text-slate-500">
            {connectedClients} connected · {clientsNeedingAttention} needing attention
          </span>
          {syncing && (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
              <Loader2 className="h-3 w-3 animate-spin text-blue-300" />
              Syncing
            </div>
          )}
        </div>
        {integrationRows.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400">
            No companies are onboarded yet. Once clients are mapped to a carrier, their
            status will appear here.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {integrationRows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.contact}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1">
                    {row.worksiteCount} worksites
                  </span>
                  <span
                    className={`rounded-lg border px-2 py-1 ${
                      row.status === 'Connected'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : row.status === 'Onboarding'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                        : 'border-slate-700 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onManageConnection(row)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Manage connection
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BillingSection({
  companies,
  loading,
  error,
  uploadingCompanyId,
  onRefresh,
  onUploadReceipt,
  onUpdateRecord,
}: BillingSectionProps) {
  const [formState, setFormState] = useState<
    Record<string, { paidThrough?: string; notes?: string; file?: File | null }>
  >({});
  const [feedback, setFeedback] = useState<Record<string, { success?: string; error?: string }>>(
    {}
  );
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!companies) return;
    setFormState((prev) => {
      const next = { ...prev };
      companies.forEach((entry) => {
        if (!next[entry.company.id]) {
          next[entry.company.id] = {};
        }
      });
      return next;
    });
  }, [companies]);

  const handlePaidThroughChange = (companyId: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        paidThrough: value,
      },
    }));
  };

  const handleNotesChange = (companyId: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        notes: value,
      },
    }));
  };

  const handleFileChange = (companyId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFormState((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        file,
      },
    }));
    setFeedback((prev) => ({
      ...prev,
      [companyId]: {
        success: undefined,
        error: undefined,
      },
    }));
  };

  const resetForm = (companyId: string) => {
    setFormState((prev) => ({
      ...prev,
      [companyId]: {
        paidThrough: prev[companyId]?.paidThrough,
        notes: '',
        file: null,
      },
    }));
    const inputRef = fileInputRefs.current[companyId];
    if (inputRef) {
      inputRef.value = '';
    }
  };

  const handleSubmit = (companyId: string) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const state = formState[companyId];
    if (!state?.file) {
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { error: 'Upload a PDF or image of the paid invoice first.' },
      }));
      return;
    }
    try {
      await onUploadReceipt({
        companyId,
        file: state.file,
        paidThrough: state.paidThrough,
        notes: state.notes,
      });
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { success: 'Proof uploaded and payment recorded.' },
      }));
      resetForm(companyId);
    } catch (uploadErr: any) {
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { error: uploadErr?.message || 'Upload failed.' },
      }));
    }
  };

  const handleExtend = (companyId: string, recordId: string | null) => async () => {
    const state = formState[companyId];
    if (!recordId) {
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { error: 'Upload proof before setting a paid-through date.' },
      }));
      return;
    }
    if (!state?.paidThrough) {
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { error: 'Pick a paid-through date before updating.' },
      }));
      return;
    }
    try {
      await onUpdateRecord({
        recordId,
        companyId,
        paidThrough: state.paidThrough,
        notes: state.notes,
      });
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { success: 'Paid-through date updated.' },
      }));
    } catch (err: any) {
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { error: err?.message || 'Unable to update billing status.' },
      }));
    }
  };

  const handleMarkUnpaid = (companyId: string, recordId: string | null) => async () => {
    if (!recordId) {
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { error: 'No billing record to clear yet.' },
      }));
      return;
    }
    try {
      await onUpdateRecord({
        recordId,
        companyId,
        paidThrough: null,
      });
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { success: 'Marked as unpaid. Awaiting new proof.' },
      }));
    } catch (err: any) {
      setFeedback((prev) => ({
        ...prev,
        [companyId]: { error: err?.message || 'Unable to clear billing status.' },
      }));
    }
  };

  const hasCompanies = companies && companies.length > 0;

  // Billing summary stats
  const paidCompanies = companies?.filter(e => {
    const pt = e.latestRecord?.paidThrough;
    return pt && new Date(pt) >= new Date();
  }).length || 0;
  const overdueCompanies = companies?.filter(e => {
    const pt = e.latestRecord?.paidThrough;
    return pt && new Date(pt) < new Date();
  }).length || 0;
  const pendingCompanies = companies?.filter(e => !e.latestRecord?.paidThrough).length || 0;
  const totalCompanies = companies?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SectionHeader
          title="Billing & Collections"
          description="Upload invoice proof and control paid-through windows for each client company."
          icon={DollarSign}
          accent="violet"
        />
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh billing data
        </button>
      </div>

      {/* Billing Summary Dashboard */}
      {hasCompanies && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Clients</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalCompanies}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-400">Paid</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{paidCompanies}</p>
            <p className="text-xs text-emerald-400/70">{totalCompanies > 0 ? ((paidCompanies / totalCompanies) * 100).toFixed(0) : 0}% of clients</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-red-400">Overdue</p>
            <p className="mt-1 text-2xl font-bold text-red-300">{overdueCompanies}</p>
            {overdueCompanies > 0 && <p className="text-xs text-red-400/70">Requires attention</p>}
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-400">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{pendingCompanies}</p>
            {pendingCompanies > 0 && <p className="text-xs text-amber-400/70">Awaiting proof</p>}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && !hasCompanies && (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-3 text-sm text-slate-300">Loading company billing records…</span>
        </div>
      )}

      {!loading && !hasCompanies && !error && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-10 text-center text-slate-300">
          <p className="text-lg font-semibold text-white">No companies onboarded</p>
          <p className="mt-2 text-sm text-slate-400">
            Once clients are added, you can track invoice proof and paid status here.
          </p>
        </div>
      )}

      {hasCompanies && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {companies!.map((entry) => {
            const latest = entry.latestRecord;
            const companyId = entry.company.id;
            const statusBadge =
              latest?.paidThrough && new Date(latest.paidThrough) >= new Date()
                ? {
                    label: `Paid through ${new Date(latest.paidThrough).toLocaleDateString()}`,
                    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
                  }
                : {
                    label: 'Payment required',
                    className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
                  };
            const companyFeedback = feedback[companyId];
            const formValues = formState[companyId] || {};

            return (
              <form
                key={companyId}
                onSubmit={handleSubmit(companyId)}
                className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{entry.company.name}</h3>
                    <p className="text-xs text-slate-500">{entry.company.address || 'Address pending'}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {entry.worksites.length} worksites · Proofs stored centrally
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadge.className}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {statusBadge.label}
                  </span>
                </div>

                <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Latest proof</span>
                    <span>
                      {latest ? new Date(latest.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    {latest?.proofUrl ? (
                      <a
                        href={latest.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-blue-200 transition hover:bg-slate-800"
                      >
                        <FileBarChart2 className="h-3.5 w-3.5" />
                        View proof of payment
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">No invoice uploaded yet.</span>
                    )}
                    {latest?.notes && (
                      <span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400">
                        {latest.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Paid-through date
                    </label>
                    <input
                      type="date"
                      value={formValues.paidThrough || ''}
                      onChange={(event) =>
                        handlePaidThroughChange(companyId, event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="text-xs text-slate-500">
                      Optional: extend or adjust the paid-through window after proof is on file.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Upload proof (PDF / image)
                    </label>
                    <input
                      ref={(node) => {
                        fileInputRefs.current[companyId] = node;
                      }}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(event) => handleFileChange(companyId, event)}
                      className="w-full rounded-lg border border-dashed border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <textarea
                      value={formValues.notes || ''}
                      onChange={(event) => handleNotesChange(companyId, event.target.value)}
                      placeholder="Optional internal note"
                      className="h-16 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {companyFeedback?.error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                    {companyFeedback.error}
                  </div>
                )}
                {companyFeedback?.success && (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                    {companyFeedback.success}
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={uploadingCompanyId === companyId}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploadingCompanyId === companyId ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <CloudUpload className="h-3.5 w-3.5" />
                        Upload proof & mark paid
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleExtend(companyId, latest?.id ?? null)}
                    disabled={!latest || uploadingCompanyId === companyId}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Update paid-through date
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkUnpaid(companyId, latest?.id ?? null)}
                    disabled={!latest || uploadingCompanyId === companyId}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                    Mark unpaid / needs proof
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsersRolesSection({
  companies,
  worksites,
  onRefresh,
  companiesLoading = false,
}: UsersRolesSectionProps) {
  const auth = useAuth();
  const currentUser = auth.user;
  const totalCompanies = companies?.length ?? 0;
  const totalWorksites = worksites?.length ?? 0;

  const roleCatalog = useMemo(
    () => [
      {
        role: 'SUPER_ADMIN',
        audience: 'Internal',
        description: 'Full platform control. Reserved for SiteSafe core team.',
      },
      {
        role: 'COMPANY_ADMIN',
        audience: 'Client',
        description: 'Manages company-wide settings, billing, and worksites.',
      },
      {
        role: 'SITE_ADMIN',
        audience: 'Client',
        description: 'Oversees individual worksites, cameras, and alert routing.',
      },
      {
        role: 'SUPERVISOR',
        audience: 'Client',
        description: 'Acknowledges alerts, reviews detections, limited admin authority.',
      },
      {
        role: 'WORKER',
        audience: 'Client',
        description: 'View-only portal access with personal alert history.',
      },
    ],
    []
  );

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'COMPANY_ADMIN',
    companyId: '',
    worksiteId: '',
  });
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Filter worksites based on selected company
  const availableWorksites = useMemo(() => {
    if (!inviteForm.companyId || !worksites) return [];
    return worksites.filter((w) => w.companyId === inviteForm.companyId);
  }, [worksites, inviteForm.companyId]);

  const companyOptions = useMemo(
    () =>
      companies?.map((company) => ({
        value: company.id,
        label: company.name,
      })) ?? [],
    [companies]
  );

  // Debug logging
  useEffect(() => {
    console.log('[UsersRolesSection] Companies:', {
      count: companies?.length ?? 0,
      companies: companies?.map((c) => ({ id: c.id, name: c.name })),
      loading: companiesLoading,
      companyOptionsCount: companyOptions.length,
    });
  }, [companies, companiesLoading, companyOptions.length]);

  // Ensure companies are loaded when this section is active
  useEffect(() => {
    if (!companies && !companiesLoading) {
      console.log('[UsersRolesSection] No companies loaded, triggering refresh...');
      onRefresh();
    }
  }, [companies, companiesLoading, onRefresh]);

  // Fetch role permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      setPermissionsLoading(true);
      try {
        const response = await fetch('/api/admin/roles/permissions');
        const result = await response.json();
        if (result.success) {
          setPermissions(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      } finally {
        setPermissionsLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviteSubmitting) return;

    const trimmedEmail = inviteForm.email.trim();
    if (!trimmedEmail) {
      setInviteFeedback('Provide an email address to send the invite.');
      return;
    }

    if (!inviteForm.companyId) {
      setInviteFeedback('Please select a company for this user.');
      return;
    }

    if (!currentUser?.id) {
      setInviteFeedback('You must be logged in to send invitations.');
      return;
    }

    setInviteSubmitting(true);
    setInviteFeedback(null);

    try {
      const payload: any = {
        email: trimmedEmail.toLowerCase(),
        role: inviteForm.role,
        companyId: inviteForm.companyId,
        invitedBy: currentUser.id,
      };

      // Add worksiteId if selected
      if (inviteForm.worksiteId) {
        payload.worksiteId = inviteForm.worksiteId;
      }

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || result?.details || `Failed to send invitation (${response.status})`
        );
      }

      const companyName = companies?.find((c) => c.id === inviteForm.companyId)?.name || 'the company';
      const worksiteName = inviteForm.worksiteId 
        ? availableWorksites.find((w) => w.id === inviteForm.worksiteId)?.name 
        : null;

      setInviteFeedback(
        `Invitation sent to ${trimmedEmail} for ${companyName}${worksiteName ? ` - ${worksiteName}` : ''}. They will receive an email with instructions to claim their account.`
      );
      setInviteForm({ email: '', role: inviteForm.role, companyId: '', worksiteId: '' });
      onRefresh();
    } catch (error: any) {
      console.error('[super-admin][users] invite failed', error);
      setInviteFeedback(error?.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader
            title="Users & Roles"
            description="Grant access to client stakeholders while maintaining least-privilege control."
            icon={Users}
            accent="sky"
          />
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh directory
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Companies"
            value={totalCompanies}
            subtitle="Mapped to the platform"
            icon={Factory}
          />
          <MetricCard
            title="Worksites"
            value={totalWorksites}
            subtitle="Actively monitored"
            icon={Building2}
            accent="emerald"
          />
          <MetricCard
            title="Role catalog"
            value={roleCatalog.length}
            subtitle="Standard roles ready for assignment"
            icon={ShieldCheck}
            accent="violet"
          />
        </div>
      </div>

      {inviteFeedback && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {inviteFeedback}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleInvite}
          className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Invite a user</h3>
          <p className="text-sm text-slate-400">
            Send an invitation email to grant access. The user will receive a secure link to create their account.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(event) =>
                  setInviteForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="safety.manager@client.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Company <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={inviteForm.companyId}
                onChange={(event) =>
                  setInviteForm((prev) => ({ 
                    ...prev, 
                    companyId: event.target.value,
                    worksiteId: '', // Reset worksite when company changes
                  }))
                }
                disabled={companiesLoading || companyOptions.length === 0}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {companiesLoading 
                    ? 'Loading companies...' 
                    : companyOptions.length === 0 
                    ? 'No companies available' 
                    : 'Select a company'}
                </option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {companiesLoading && (
                <p className="mt-1 text-xs text-slate-500">Loading companies...</p>
              )}
              {!companiesLoading && companyOptions.length === 0 && (
                <p className="mt-1 text-xs text-amber-500">
                  No companies found. Create a company first in the Companies tab.
                </p>
              )}
            </div>

            {inviteForm.companyId && availableWorksites.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Worksite <span className="text-slate-400">(Optional)</span>
                </label>
                <select
                  value={inviteForm.worksiteId}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, worksiteId: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All worksites (company-wide access)</option>
                  {availableWorksites.map((worksite) => (
                    <option key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Leave empty for company-wide access, or select a specific worksite
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role
              </label>
              <select
                value={inviteForm.role}
                onChange={(event) =>
                  setInviteForm((prev) => ({ ...prev, role: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {['COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR', 'WORKER'].map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-end">
            <button
              type="submit"
              disabled={inviteSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {inviteSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send invite'
              )}
            </button>
          </div>
        </form>

        <div className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white">Role catalog</h3>
          <p className="text-sm text-slate-400">
            Map each user type to responsibilities. For advanced scenarios, extend the Prisma
            `UserRole` enum and add conditional UI gating.
          </p>
          <div className="space-y-3">
            {roleCatalog.map((item) => (
              <div
                key={item.role}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{item.role}</p>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {item.audience}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Permission Matrix */}
      {permissions && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <SectionHeader
            title="Role Permission Matrix"
            description="View/edit/execute permissions for each role across all resources"
            icon={ShieldCheck}
            accent="violet"
          />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Resource
                  </th>
                  {['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'].map((role) => (
                    <th
                      key={role}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {role.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'companies', label: 'Companies' },
                  { key: 'worksites', label: 'Worksites' },
                  { key: 'cameras', label: 'Cameras' },
                  { key: 'users', label: 'Users' },
                  { key: 'alerts', label: 'Alerts' },
                  { key: 'reports', label: 'Reports' },
                  { key: 'billing', label: 'Billing' },
                  { key: 'settings', label: 'Settings' },
                  { key: 'audit', label: 'Audit Logs' },
                ].map((resource) => (
                  <tr key={resource.key} className="border-b border-slate-800/50">
                    <td className="px-4 py-3 font-medium text-white">{resource.label}</td>
                    {['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'].map((role) => {
                      const rolePerms = permissions[role]?.[resource.key] || {};
                      const perms = [
                        rolePerms.view ? 'View' : null,
                        rolePerms.create ? 'Create' : null,
                        rolePerms.update ? 'Update' : null,
                        rolePerms.delete ? 'Delete' : null,
                        rolePerms.invite ? 'Invite' : null,
                        rolePerms.acknowledge ? 'Ack' : null,
                        rolePerms.resolve ? 'Resolve' : null,
                        rolePerms.export ? 'Export' : null,
                      ]
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <td key={role} className="px-4 py-3 text-center text-xs text-slate-400">
                          {perms || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {permissionsLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="ml-4 text-sm text-slate-400">Loading permission matrix...</p>
        </div>
      )}
    </div>
  );
}

interface SystemSettingsSectionProps {
  onRefresh: () => void;
}

function SystemSettingsSection({ onRefresh }: SystemSettingsSectionProps) {
  const [settings, setSettings] = useState({
    apiKeys: {
      openai: '',
      cloudinary: '',
      monday: '',
    },
    integrations: {
      emailEnabled: true,
      smsEnabled: false,
      webhookUrl: '',
    },
    observability: {
      logLevel: 'info',
      enableMetrics: true,
      enableTracing: false,
    },
    maintenance: {
      maintenanceMode: false,
      maintenanceMessage: '',
    },
    security: {
      twoFactorEnabled: false,
      ssoEnabled: false,
      ssoProvider: 'none',
      sessionTimeout: 3600,
      encryptionKeyRotation: '30',
    },
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [toolExecuting, setToolExecuting] = useState<string | null>(null);

  useEffect(() => {
    fetchSecuritySettings();
    fetchSystemHealth();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch('/api/admin/security-settings');
      const result = await response.json();
      if (result.success && result.data) {
        setSettings((prev) => ({
          ...prev,
          security: {
            twoFactorEnabled: result.data.twoFactorEnabled,
            ssoEnabled: result.data.ssoEnabled,
            ssoProvider: result.data.ssoProvider,
            sessionTimeout: result.data.sessionTimeout,
            encryptionKeyRotation: result.data.encryptionKeyRotation,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to fetch security settings:', error);
    }
  };

  const fetchSystemHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch('/api/admin/system-status');
      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      // Save security settings
      const securityResponse = await fetch('/api/admin/security-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.security),
      });

      const securityResult = await securityResponse.json();
      if (!securityResult.success) {
        throw new Error(securityResult.error || 'Failed to save security settings');
      }

      // TODO: Save other settings (API keys, integrations, etc.)
      setFeedback('Settings saved successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (error: any) {
      setFeedback(error?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSystemTool = async (action: string, cameraId?: string, worksiteId?: string) => {
    setToolExecuting(action);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/system-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, cameraId, worksiteId }),
      });

      const result = await response.json();
      if (result.success) {
        setFeedback(result.message || 'Tool executed successfully.');
        if (action === 'health_check') {
          setSystemHealth(result.health);
        }
        setTimeout(() => setFeedback(null), 5000);
      } else {
        throw new Error(result.error || 'Failed to execute tool');
      }
    } catch (error: any) {
      setFeedback(error?.message || 'Failed to execute tool.');
    } finally {
      setToolExecuting(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <SectionHeader
          title="System Settings"
          description="Configure API keys, integrations, observability, and maintenance windows."
          icon={Settings}
          accent="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">API Keys</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={settings.apiKeys.openai}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    apiKeys: { ...prev.apiKeys, openai: e.target.value },
                  }))
                }
                placeholder="sk-..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Cloudinary API Key
              </label>
              <input
                type="password"
                value={settings.apiKeys.cloudinary}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    apiKeys: { ...prev.apiKeys, cloudinary: e.target.value },
                  }))
                }
                placeholder="Cloudinary API key"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Monday.com API Key
              </label>
              <input
                type="password"
                value={settings.apiKeys.monday}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    apiKeys: { ...prev.apiKeys, monday: e.target.value },
                  }))
                }
                placeholder="Monday.com API token"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Integrations</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.integrations.emailEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    integrations: { ...prev.integrations, emailEnabled: e.target.checked },
                  }))
                }
                className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Email notifications enabled</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.integrations.smsEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    integrations: { ...prev.integrations, smsEnabled: e.target.checked },
                  }))
                }
                className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">SMS notifications enabled</span>
            </label>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={settings.integrations.webhookUrl}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    integrations: { ...prev.integrations, webhookUrl: e.target.value },
                  }))
                }
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Observability</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Log Level
              </label>
              <select
                value={settings.observability.logLevel}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    observability: { ...prev.observability, logLevel: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.observability.enableMetrics}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    observability: { ...prev.observability, enableMetrics: e.target.checked },
                  }))
                }
                className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Enable metrics collection</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.observability.enableTracing}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    observability: { ...prev.observability, enableTracing: e.target.checked },
                  }))
                }
                className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Enable distributed tracing</span>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Maintenance</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.maintenance.maintenanceMode}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maintenance: { ...prev.maintenance, maintenanceMode: e.target.checked },
                  }))
                }
                className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Maintenance mode</span>
            </label>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Maintenance Message
              </label>
              <textarea
                value={settings.maintenance.maintenanceMessage}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maintenance: { ...prev.maintenance, maintenanceMessage: e.target.value },
                  }))
                }
                placeholder="System is under maintenance..."
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security & Access Controls */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Security & Access Controls</h3>
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      security: { ...prev.security, twoFactorEnabled: e.target.checked },
                    }))
                  }
                  className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-300">Require 2FA for all users</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.security.ssoEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      security: { ...prev.security, ssoEnabled: e.target.checked },
                    }))
                  }
                  className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-300">Enable SSO</span>
              </label>
              {settings.security.ssoEnabled && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    SSO Provider
                  </label>
                  <select
                    value={settings.security.ssoProvider}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, ssoProvider: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="none">None</option>
                    <option value="okta">Okta</option>
                    <option value="google">Google Workspace</option>
                    <option value="azure">Azure AD</option>
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Session Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      security: { ...prev.security, sessionTimeout: parseInt(e.target.value, 10) },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Encryption Key Rotation (days)
                </label>
                <input
                  type="text"
                  value={settings.security.encryptionKeyRotation}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      security: { ...prev.security, encryptionKeyRotation: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Tools */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Tools</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => handleSystemTool('restart_mediamtx')}
            disabled={toolExecuting === 'restart_mediamtx'}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {toolExecuting === 'restart_mediamtx' ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Restarting...
              </>
            ) : (
              'Restart Camera Streams'
            )}
          </button>
          <button
            onClick={() => handleSystemTool('restart_ai_worker')}
            disabled={toolExecuting === 'restart_ai_worker'}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {toolExecuting === 'restart_ai_worker' ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Restarting...
              </>
            ) : (
              'Restart AI Inference Worker'
            )}
          </button>
          <button
            onClick={() => handleSystemTool('clear_stuck_alerts')}
            disabled={toolExecuting === 'clear_stuck_alerts'}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {toolExecuting === 'clear_stuck_alerts' ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Clearing...
              </>
            ) : (
              'Clear Stuck Alerts'
            )}
          </button>
          <button
            onClick={() => handleSystemTool('health_check')}
            disabled={toolExecuting === 'health_check' || healthLoading}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {toolExecuting === 'health_check' || healthLoading ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              'Run Health Check'
            )}
          </button>
        </div>

        {systemHealth && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Database</p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  systemHealth.database === 'healthy'
                    ? 'text-emerald-400'
                    : systemHealth.database === 'degraded'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {systemHealth.database || 'unknown'}
              </p>
              {systemHealth.database === 'unhealthy' && (
                <p className="mt-1 text-xs text-red-300">Check database connection</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">AI Detection</p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  systemHealth.aiDetection === 'healthy'
                    ? 'text-emerald-400'
                    : systemHealth.aiDetection === 'degraded'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {systemHealth.aiDetection || 'unknown'}
              </p>
              {systemHealth.aiDetection === 'unhealthy' && (
                <p className="mt-1 text-xs text-red-300">
                  Service not running. Check AI_SERVICE_URL env var or start AI service.
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">MediaMTX</p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  systemHealth.mediaMTX === 'healthy'
                    ? 'text-emerald-400'
                    : systemHealth.mediaMTX === 'degraded'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {systemHealth.mediaMTX || 'unknown'}
              </p>
              {systemHealth.mediaMTX === 'unhealthy' && (
                <p className="mt-1 text-xs text-red-300">
                  Service not running. Use "Restart Camera Streams" button or check Docker.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            feedback.includes('success') || feedback.includes('successfully')
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {feedback}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}

interface SupportAuditSectionProps {
  onRefresh: () => void;
}

function SupportAuditSection({ onRefresh }: SupportAuditSectionProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'support' | 'timeline' | 'troubleshooting'>('audit');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: 'ALL',
    entity: 'ALL',
    dateFrom: '',
    dateTo: '',
  });
  const [activityTimeline, setActivityTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedWorksite, setSelectedWorksite] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [troubleshootingResult, setTroubleshootingResult] = useState<any>(null);
  const [troubleshootingLoading, setTroubleshootingLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'timeline') {
      fetchActivityTimeline();
    }
  }, [filter, activeTab, selectedCompany, selectedWorksite, selectedUserId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.action !== 'ALL') params.append('action', filter.action);
      if (filter.entity !== 'ALL') params.append('entity', filter.entity);
      if (filter.dateFrom) params.append('from', filter.dateFrom);
      if (filter.dateTo) params.append('to', filter.dateTo);

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityTimeline = async () => {
    if (!selectedCompany && !selectedWorksite && !selectedUserId) {
      setActivityTimeline([]);
      return;
    }

    setTimelineLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany) params.append('companyId', selectedCompany);
      if (selectedWorksite) params.append('worksiteId', selectedWorksite);
      if (selectedUserId) params.append('userId', selectedUserId);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/support/activity-timeline?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setActivityTimeline(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching activity timeline:', error);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleTroubleshooting = async (action: string, cameraId?: string, worksiteId?: string) => {
    setTroubleshootingLoading(true);
    setTroubleshootingResult(null);
    try {
      const response = await fetch('/api/admin/support/troubleshooting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, cameraId, worksiteId }),
      });

      const result = await response.json();
      setTroubleshootingResult(result);
    } catch (error) {
      console.error('Error executing troubleshooting action:', error);
      setTroubleshootingResult({ success: false, error: 'Failed to execute troubleshooting action' });
    } finally {
      setTroubleshootingLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'IP Address'].join(','),
      ...logs.map((log) =>
        [
          new Date(log.createdAt).toISOString(),
          log.user?.email || 'Unknown',
          log.action,
          log.entity,
          log.entityId || '',
          log.ipAddress || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
      case 'UPDATE':
        return 'border-blue-500/40 bg-blue-500/10 text-blue-200';
      case 'DELETE':
        return 'border-red-500/40 bg-red-500/10 text-red-200';
      case 'LOGIN':
        return 'border-violet-500/40 bg-violet-500/10 text-violet-200';
      case 'INVITE':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
      default:
        return 'border-slate-700 bg-slate-900 text-slate-300';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader
            title="Support & Audit Logs"
            description="Audit trail of all super-admin actions, support tickets, and diagnostic event streams."
            icon={LifeBuoy}
            accent="sky"
          />
          {activeTab === 'audit' && (
            <button
              onClick={handleExport}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileBarChart2 className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-slate-800">
          {[
            { id: 'audit', label: 'Audit Logs' },
            { id: 'support', label: 'Support Tickets' },
            { id: 'timeline', label: 'Activity Timeline' },
            { id: 'troubleshooting', label: 'Troubleshooting' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Action
                </label>
                <select
                  value={filter.action}
                  onChange={(e) => setFilter((prev) => ({ ...prev, action: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                  <option value="LOGIN">Login</option>
                  <option value="INVITE">Invite</option>
                  <option value="ACKNOWLEDGE_ALERT">Acknowledge Alert</option>
                  <option value="RESOLVE_ALERT">Resolve Alert</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Entity
                </label>
                <select
                  value={filter.entity}
                  onChange={(e) => setFilter((prev) => ({ ...prev, entity: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Entities</option>
                  <option value="User">User</option>
                  <option value="Company">Company</option>
                  <option value="Worksite">Worksite</option>
                  <option value="Camera">Camera</option>
                  <option value="Alert">Alert</option>
                  <option value="Detection">Detection</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={filter.dateFrom}
                  onChange={(e) => setFilter((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={filter.dateTo}
                  onChange={(e) => setFilter((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                No audit logs found for the selected filters.
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const metadata = log.metadata as any;
                  const changes = log.changes as any;
                  const severity: 'critical' | 'high' | 'medium' | 'low' = metadata?.severity || 'low';
                  const correlationId = metadata?.correlationId;
                  const browser = metadata?.browser;
                  const os = metadata?.os;
                  const geoIP = metadata?.geoIP;

                  const severityColorMap: Record<'critical' | 'high' | 'medium' | 'low', string> = {
                    critical: 'border-red-500/40 bg-red-500/10 text-red-200',
                    high: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
                    medium: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200',
                    low: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
                  };
                  const severityColor = severityColorMap[severity] || 'border-slate-500/40 bg-slate-500/10 text-slate-300';

                  return (
                    <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getActionColor(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${severityColor}`}>
                              {severity}
                            </span>
                            <span className="text-xs text-slate-500">{log.entity}</span>
                            {log.entityId && (
                              <span className="text-xs text-slate-600">ID: {log.entityId}</span>
                            )}
                            {correlationId && (
                              <span className="text-xs text-slate-600 font-mono">Corr: {correlationId.substring(0, 12)}...</span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                            <span>{log.user?.email || 'System'}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(log.createdAt)}</span>
                            {log.ipAddress && (
                              <>
                                <span>•</span>
                                <span>{log.ipAddress}</span>
                              </>
                            )}
                            {geoIP && (
                              <>
                                <span>•</span>
                                <span>📍 {geoIP}</span>
                              </>
                            )}
                            {browser && (
                              <>
                                <span>•</span>
                                <span>{browser}</span>
                              </>
                            )}
                            {os && (
                              <>
                                <span>•</span>
                                <span>{os}</span>
                              </>
                            )}
                          </div>
                          {/* Before/After Changes */}
                          {changes && (changes.before || changes.after) && (
                            <div className="mt-3 rounded-lg border border-slate-800/70 bg-slate-900/40 p-3">
                              <p className="text-xs font-semibold text-slate-400 mb-2">Changes:</p>
                              <div className="grid gap-2 md:grid-cols-2 text-xs">
                                {changes.before && (
                                  <div>
                                    <p className="text-red-400 font-semibold mb-1">Before:</p>
                                    <pre className="text-slate-300 overflow-auto max-h-32">
                                      {JSON.stringify(changes.before, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {changes.after && (
                                  <div>
                                    <p className="text-emerald-400 font-semibold mb-1">After:</p>
                                    <pre className="text-slate-300 overflow-auto max-h-32">
                                      {JSON.stringify(changes.after, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Support Tickets Tab */}
      {activeTab === 'support' && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
          <p className="text-slate-400 text-center py-12">
            Support tickets system coming soon. This will integrate with Zendesk/Intercom or provide a full ticketing system.
          </p>
        </div>
      )}

      {/* Activity Timeline Tab */}
      {activeTab === 'timeline' && (
        <>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Filter Timeline</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Company ID
                </label>
                <input
                  type="text"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  placeholder="Company ID (optional)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Worksite ID
                </label>
                <input
                  type="text"
                  value={selectedWorksite}
                  onChange={(e) => setSelectedWorksite(e.target.value)}
                  placeholder="Worksite ID (optional)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="User ID (optional)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
            {timelineLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : activityTimeline.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                {selectedCompany || selectedWorksite || selectedUserId
                  ? 'No activity found for the selected filters.'
                  : 'Select a company, worksite, or user to view activity timeline.'}
              </div>
            ) : (
              <div className="space-y-3">
                {activityTimeline.map((event, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-200">
                            {event.type}
                          </span>
                          <span className="text-sm text-white">{event.details}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                          <span>{event.user}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(event.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Troubleshooting Tab */}
      {activeTab === 'troubleshooting' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Troubleshooting Tools</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => handleTroubleshooting('test_ai_inference')}
                disabled={troubleshootingLoading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Test AI Inference
              </button>
              <button
                onClick={() => {
                  const cameraId = prompt('Enter Camera ID:');
                  if (cameraId) handleTroubleshooting('snap_test_frame', cameraId);
                }}
                disabled={troubleshootingLoading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Snap Test Frame
              </button>
              <button
                onClick={() => {
                  const cameraId = prompt('Enter Camera ID:');
                  if (cameraId) handleTroubleshooting('view_raw_detections', cameraId);
                }}
                disabled={troubleshootingLoading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                View Raw Detections
              </button>
              <button
                onClick={() => handleTroubleshooting('check_network_latency')}
                disabled={troubleshootingLoading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Check Network Latency
              </button>
              <button
                onClick={() => {
                  const worksiteId = prompt('Enter Worksite ID:');
                  if (worksiteId) handleTroubleshooting('resync_camera_streams', undefined, worksiteId);
                }}
                disabled={troubleshootingLoading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Re-sync Camera Streams
              </button>
              <button
                onClick={() => {
                  const cameraId = prompt('Enter Camera ID:');
                  if (cameraId) handleTroubleshooting('export_camera_logs', cameraId);
                }}
                disabled={troubleshootingLoading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export Camera Logs
              </button>
            </div>
          </div>

          {troubleshootingResult && (
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Result</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    troubleshootingResult.success
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {troubleshootingResult.success ? 'Success' : 'Failed'}
                </span>
              </div>

              {troubleshootingResult.message && (
                <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-sm text-slate-300">{troubleshootingResult.message}</p>
                </div>
              )}

              {troubleshootingResult.error && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <p className="text-sm font-semibold text-red-300">Error: {troubleshootingResult.error}</p>
                  {troubleshootingResult.details && (
                    <p className="mt-1 text-xs text-red-200">{JSON.stringify(troubleshootingResult.details, null, 2)}</p>
                  )}
                </div>
              )}

              {troubleshootingResult.recommendation && (
                <div className="mb-4 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-300 mb-1">Recommendation</p>
                  <p className="text-sm text-blue-200">{troubleshootingResult.recommendation}</p>
                </div>
              )}

              {troubleshootingResult.recommendations && troubleshootingResult.recommendations.length > 0 && (
                <div className="mb-4 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-300 mb-2">Recommendations</p>
                  <ul className="space-y-1 text-sm text-blue-200">
                    {troubleshootingResult.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {troubleshootingResult.errors && Object.keys(troubleshootingResult.errors).length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-2">Service Errors</p>
                  <div className="space-y-1 text-xs text-amber-200">
                    {Object.entries(troubleshootingResult.errors).map(([service, error]: [string, any]) => (
                      <div key={service} className="flex items-start gap-2">
                        <span className="font-semibold capitalize">{service}:</span>
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {troubleshootingResult.latencies && (
                <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Network Latency</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(troubleshootingResult.latencies).map(([service, latency]: [string, any]) => (
                      <div key={service} className="flex items-center justify-between">
                        <span className="text-slate-400 capitalize">{service}:</span>
                        <span
                          className={`font-semibold ${
                            latency === 'Unreachable' ? 'text-red-300' : 'text-emerald-300'
                          }`}
                        >
                          {latency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {troubleshootingResult.streamAccessible !== undefined && (
                <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stream Status</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        troubleshootingResult.streamAccessible
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {troubleshootingResult.streamAccessible ? 'Accessible' : 'Not Accessible'}
                    </span>
                  </div>
                  {troubleshootingResult.streamError && (
                    <p className="text-xs text-red-300 mt-1">Error: {troubleshootingResult.streamError}</p>
                  )}
                  {troubleshootingResult.ffmpegAvailable !== undefined && (
                    <p className="text-xs text-slate-400 mt-1">
                      ffmpeg: {troubleshootingResult.ffmpegAvailable ? 'Available' : 'Not installed'}
                    </p>
                  )}
                </div>
              )}

              {troubleshootingResult.note && (
                <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs text-slate-400">{troubleshootingResult.note}</p>
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                  View Raw JSON
                </summary>
                <pre className="mt-2 rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300 overflow-auto max-h-96">
                  {JSON.stringify(troubleshootingResult, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {troubleshootingLoading && (
            <div className="flex items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-200 break-words">{value ?? '—'}</div>
    </div>
  );
}

function ReportCard({
  dataset,
  onExport,
  exporting,
}: {
  dataset: ReportDataset;
  onExport: () => void;
  exporting: boolean;
}) {
  const Icon = dataset.icon;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-blue-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{dataset.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{dataset.description}</p>
        </div>
      </div>
      <button
        onClick={onExport}
        disabled={exporting}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70"
        type="button"
      >
        {exporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing…
          </>
        ) : (
          <>
            <FileBarChart2 className="h-4 w-4" />
            Export JSON
          </>
        )}
      </button>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-blue-500/60 bg-blue-500/20 text-blue-200'
          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-white'
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
      >
        Previous
      </button>
      <span className="text-xs text-slate-500">
        Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages - 1}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
      >
        Next
      </button>
    </div>
  );
}

function IntegrationDrawer({
  company,
  onClose,
}: {
  company: IntegrationClientSummary;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl sm:max-w-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Integration control</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{company.name}</h3>
            <p className="text-xs text-slate-400">{company.contact}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close integration drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4 text-sm text-slate-300">
          <p>
            Status:{' '}
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                company.status === 'Connected'
                  ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : company.status === 'Onboarding'
                  ? 'border border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {company.status}
            </span>
          </p>
          <p>
            Worksites tied to insurance program:{' '}
            <span className="font-semibold text-white">{company.worksiteCount}</span>
          </p>
          <p className="text-xs text-slate-400">
            Update carrier credentials, endorsements, or coverage tiers from this panel. Clients
            can only request changes from their dashboard—they cannot modify integration details.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href={`mailto:insurance@sitesafe.ai?subject=Insurance%20update%20for%20${encodeURIComponent(
              company.name
            )}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20"
          >
            Email insurance desk
          </a>
          <button
            onClick={() => {
              navigator?.clipboard
                ?.writeText(company.contact)
                .catch(() => undefined);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Copy client contact
          </button>
          <a
            href="/dashboard/integrations/insurance"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 sm:col-span-2"
          >
            View client-facing insurance page
          </a>
        </div>
      </div>
    </div>
  );
}


interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'default' | 'emerald' | 'violet' | 'red' | 'amber';
}

function MetricCard({ title, value, subtitle, icon: Icon, accent = 'default', onClick, percentage, trend }: MetricCardProps & { onClick?: () => void; percentage?: number; trend?: 'up' | 'down' | 'neutral' }) {
  const accentClasses =
    accent === 'emerald'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
      : accent === 'violet'
      ? 'bg-violet-500/10 text-violet-300 border-violet-500/20'
      : accent === 'red'
      ? 'bg-red-500/10 text-red-300 border-red-500/20'
      : accent === 'amber'
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
      : 'bg-blue-500/10 text-blue-300 border-blue-500/20';

  // Color-coded compliance
  const getComplianceColor = (val: number) => {
    if (val >= 90) return 'text-emerald-400';
    if (val >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const isPercentage = typeof value === 'string' && value.includes('%');
  const numValue = isPercentage ? parseFloat(value) : (typeof value === 'number' ? value : null);

  return (
    <div 
      className={`relative flex items-center gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 transition-all ${onClick ? 'cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/60' : ''}`}
      onClick={onClick}
    >
      {/* Progress ring for percentages */}
      {percentage !== undefined && (
        <div className="relative h-14 w-14 shrink-0">
          <svg className="h-14 w-14 -rotate-90 transform">
            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-700" />
            <circle 
              cx="28" cy="28" r="24" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none" 
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 150.8} 150.8`}
              className={percentage >= 90 ? 'text-emerald-400' : percentage >= 70 ? 'text-amber-400' : 'text-red-400'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${percentage >= 90 ? 'text-emerald-400' : percentage >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
      )}
      {percentage === undefined && (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accentClasses}`}>
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm text-slate-400">{title}</p>
        <p className={`mt-1 text-2xl font-semibold ${isPercentage && numValue !== null ? getComplianceColor(numValue) : 'text-white'}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
          <TrendingUp className={`h-4 w-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
        </div>
      )}
      {onClick && (
        <div className="absolute right-4 top-4 text-slate-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'red' | 'emerald' | 'sky' | 'violet';
}

function SectionHeader({ title, description, icon: Icon, accent = 'violet' }: SectionHeaderProps) {
  const accentMap: Record<string, string> = {
    red: 'text-red-300 bg-red-500/10',
    emerald: 'text-emerald-300 bg-emerald-500/10',
    sky: 'text-sky-300 bg-sky-500/10',
    violet: 'text-violet-300 bg-violet-500/10',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentMap[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

interface TrendPanelProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  data: TrendPoint[];
  valueKey: 'value' | 'detections';
  color: string;
  suffix?: string;
}

function TrendPanel({ title, description, icon: Icon, data, valueKey, color, suffix }: TrendPanelProps) {
  const latestValue =
    data.length > 0 && data[data.length - 1][valueKey] !== undefined
      ? data[data.length - 1][valueKey]
      : null;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800/60 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h4 className="mt-1 text-2xl font-semibold text-white">
            {latestValue !== null ? (
              <>
                {latestValue?.toLocaleString()}
                {suffix}
              </>
            ) : (
              '--'
            )}
          </h4>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80">
          <Icon className="h-5 w-5 text-slate-300" />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
      <div className="mt-5 flex-1">
        {data.length < 2 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-800 text-xs text-slate-500">
            Not enough datapoints yet
          </div>
        ) : (
          <Sparkline data={data} valueKey={valueKey} color={color} />
        )}
      </div>
    </div>
  );
}

interface SparklineProps {
  data: TrendPoint[];
  valueKey: 'value' | 'detections';
  color: string;
}

function Sparkline({ data, valueKey, color }: SparklineProps) {
  const points = data
    .map((point, idx) => ({
      index: idx,
      value: point[valueKey] ?? 0,
    }))
    .filter((point) => point.value !== null && !Number.isNaN(point.value));

  if (points.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500">
        Not enough data
      </div>
    );
  }

  const minValue = Math.min(...points.map((p) => Number(p.value)));
  const maxValue = Math.max(...points.map((p) => Number(p.value)));
  const range = maxValue - minValue || 1;

  const coords = points
    .map((point, idx) => {
      const x = (idx / (points.length - 1)) * 100;
      const normalized = (Number(point.value) - minValue) / range;
      const y = 100 - normalized * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const gradientId = `sparkline-gradient-${btoa(color).replace(/=/g, '')}`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-32 w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.6} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#${gradientId})`}
        stroke="none"
        points={`0,100 ${coords} 100,100`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}

interface AlertSummaryCardProps {
  headline: string;
  data: Array<{ label: string; value: number; color?: string }>;
  total: number;
}

function AlertSummaryCard({ headline, data, total }: AlertSummaryCardProps) {
  // Calculate percentages for donut chart
  const segments = data.map((item, idx) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
    return { ...item, percentage, fillColor: colors[idx % colors.length] };
  });

  // Calculate stroke-dasharray for each segment
  const circumference = 2 * Math.PI * 32;
  let cumulativePercentage = 0;

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 overflow-hidden">
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">{headline}</p>
      
      <div className="flex items-start gap-4">
        {/* Donut Chart - smaller */}
        <div className="relative h-20 w-20 shrink-0">
          <svg className="h-20 w-20 -rotate-90 transform" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" stroke="#1e293b" strokeWidth="8" fill="none" />
            {segments.map((segment) => {
              const dashArray = (segment.percentage / 100) * circumference;
              const dashOffset = -(cumulativePercentage / 100) * circumference;
              cumulativePercentage += segment.percentage;
              return (
                <circle
                  key={segment.label}
                  cx="40"
                  cy="40"
                  r="32"
                  stroke={segment.fillColor}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${dashArray} ${circumference}`}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{total}</span>
          </div>
        </div>

        {/* Legend - compact */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {data.map((item, idx) => {
            const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500'];
            return (
              <div key={item.label} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${colors[idx % colors.length]}`} />
                  <span className={`truncate ${item.color ?? 'text-slate-300'}`}>{item.label}</span>
                </div>
                <span className="shrink-0 font-semibold text-white">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface StatusGaugeProps {
  label: string;
  value?: number;
  helper?: string;
}

function StatusGauge({ label, value, helper }: StatusGaugeProps) {
  const displayValue = value !== undefined ? value : null;
  const percentage = displayValue ?? 0;
  const getColor = (val: number) => {
    if (val >= 90) return { ring: 'text-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (val >= 70) return { ring: 'text-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { ring: 'text-red-400', text: 'text-red-400', bg: 'bg-red-500/10' };
  };
  const colors = getColor(percentage);

  return (
    <div className={`flex h-full flex-col items-center justify-center rounded-xl border border-slate-800/60 ${colors.bg} p-5`}>
      <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="relative h-28 w-28">
        <svg className="h-28 w-28 -rotate-90 transform">
          <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-700" />
          <circle 
            cx="56" cy="56" r="48" 
            stroke="currentColor" 
            strokeWidth="8" 
            fill="none" 
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 301.6} 301.6`}
            className={colors.ring}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${colors.text}`}>
            {displayValue !== null ? `${displayValue.toFixed(0)}%` : '--'}
          </span>
        </div>
      </div>
      {helper && <p className="mt-3 text-center text-xs text-slate-400">{helper}</p>}
    </div>
  );
}

interface StatusBreakdownProps {
  totals: CameraStatusSummary;
  items: Array<{ label: string; value: number; color: string }>;
}

function StatusBreakdown({ totals, items }: StatusBreakdownProps) {
  const total = totals.total || 1;

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-5 text-sm text-slate-300">
      <p className="text-xs uppercase tracking-wide text-slate-500">Camera Status</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between">
                <span>{item.label}</span>
                <span className="text-slate-200">{item.value.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CompaniesTableProps {
  title: string;
  description: string;
  companies: CompanyInsight[];
  variant: 'positive' | 'risk';
}

function CompaniesTable({ title, description, companies, variant }: CompaniesTableProps) {
  const badgeClass =
    variant === 'positive'
      ? 'bg-emerald-500/10 text-emerald-300'
      : 'bg-amber-500/10 text-amber-300';

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
          {variant === 'positive' ? 'High performers' : 'Needs attention'}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {companies.length === 0 ? (
          <p className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-4 text-sm text-slate-400">
            No companies on record yet.
          </p>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-white">{company.name}</p>
                <p className="text-xs text-slate-500">
                  {company.siteCount} worksites • {company.cameraCount} cameras
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Score</p>
                  <p className="text-sm font-semibold text-white">
                    {company.avgSafetyScore !== null ? company.avgSafetyScore.toFixed(1) : '--'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Last Activity</p>
                  <p className="text-sm text-slate-300">
                    {company.latestActivity ? new Date(company.latestActivity).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WorksiteTile({ worksite }: { worksite: WorksiteActivityItem }) {
  const activeRatio =
    worksite.cameraCount > 0 ? (worksite.onlineCameras / worksite.cameraCount) * 100 : 0;

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{worksite.name}</p>
          <p className="text-xs text-slate-500">{worksite.companyName}</p>
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
          {worksite.status}
        </span>
      </div>
      <div className="mt-4 space-y-3 text-xs text-slate-400">
        {worksite.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {worksite.location}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>Cameras online</span>
          <span className="text-slate-200">
            {worksite.onlineCameras}/{worksite.cameraCount} ({Math.round(activeRatio)}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Compliance score</span>
          <span className="text-slate-200">
            {worksite.latestScore !== null ? `${worksite.latestScore.toFixed(1)}%` : 'Pending'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Last activity</span>
          <span className="text-slate-200">
            {worksite.lastActivity ? new Date(worksite.lastActivity).toLocaleString() : 'No signals yet'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ComingSoonProps {
  title: string;
  description: string;
  actions?: Array<{ label: string; href: string; disabled?: boolean }>;
  accent?: 'default' | 'purple' | 'amber';
  children?: React.ReactNode;
}

function ComingSoon({ title, description, actions = [], accent = 'default', children }: ComingSoonProps) {
  const accentClass =
    accent === 'purple'
      ? 'border-violet-500/40 bg-violet-500/10 text-violet-100'
      : accent === 'amber'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
      : 'border-slate-800/70 bg-slate-900/60 text-slate-200';

  return (
    <div className={`min-h-[360px] rounded-2xl border ${accentClass} p-8`}>
      <h3 className="text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-3xl text-sm text-slate-200/80">{description}</p>
      {children && <div className="mt-6">{children}</div>}
      {actions.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-3">
          {actions.map((action) =>
            action.disabled ? (
              <span
                key={action.label}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300/40 px-4 py-2 text-sm text-slate-200/60"
              >
                {action.label}
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Coming soon</span>
              </span>
            ) : (
              <a
                key={action.href}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {action.label}
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}

function PlaceholderInsight({ message }: { message?: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100/90">
      {message ||
        'Integrate Stripe or preferred billing provider to populate MRR, churn, and plan metrics here.'}
    </div>
  );
}

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRangeOption;
  onChange: (next: TimeRangeOption) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1">
      {TIME_RANGE_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? 'bg-blue-500/80 text-white'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function formatRelativeActivity(value?: string | null) {
  if (!value) return 'No activity yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No activity yet';

  const diffMs = Date.now() - parsed.getTime();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diffMs < minute) {
    return 'Just now';
  }
  if (diffMs < hour) {
    const minutes = Math.round(diffMs / minute);
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffMs < day) {
    const hours = Math.round(diffMs / hour);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(diffMs / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDateString(value?: string | null) {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString();
}

