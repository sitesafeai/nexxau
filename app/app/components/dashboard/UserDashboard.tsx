"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  TrendingUp,
  FileText,
  Settings,
  Bell,
  Search,
  Filter,
  Download,
  Eye,
  Play,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  MapPin,
  Users,
  Inbox,
  GitBranch,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  MoreVertical,
  CheckSquare,
  Square,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Video,
  Pause,
  RotateCcw,
  Image as ImageIcon,
  MessageSquare,
  Send,
  User,
  LogOut,
  X,
  Plus,
  Trash2,
  Edit,
  Copy,
  Zap
} from 'lucide-react';
import CameraStreamViewer from '@/app/components/camera/CameraStreamViewer';
import OverviewCameraThumb from '@/app/components/cameras/OverviewCameraThumb';

// ============================================================
// TYPES & INTERFACES
// ============================================================

type AlertSeverity = 'high' | 'medium' | 'low';
type AlertStatus = 'active' | 'acknowledged' | 'snoozed' | 'resolved';
type CameraStatus = 'online' | 'offline';
type UserRole = 'SITE_MANAGER' | 'SAFETY_OFFICER' | 'VIEWER' | 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SUPERVISOR' | 'WORKER';

interface SiteMetrics {
  activeCameras: number;
  offlineCameras: number;
  aiEnabledCameras: number;
  totalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  safetyScore: number | null;
  safetyScoreChange: number;
  lastActivity: string | null;
  avgResponseTime: number | null;
  violations24h: number;
  cameraUptime7d: number;
  lastSync: string;
}

interface SiteAlert {
  id: string;
  camera: string;
  cameraId: string;
  alertType: string;
  severity: AlertSeverity;
  time: string;
  status: AlertStatus;
  evidence?: string;
  videoClip?: string;
  assignedTo?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  notes?: string;
}

interface SiteCamera {
  id: string;
  name: string;
  zone?: string;
  location?: string;
  status: CameraStatus;
  aiEnabled: boolean;
  recording: boolean;
  recentViolations: number;
  lastDetection: string | null;
  uptime24h: number;
  thumbnailUrl?: string;
  streamUrl?: string | null;
  hlsUrl?: string | null;
  mediamtxPath?: string | null;
  rtspPath?: string | null;
  janusFeedId?: number | null;
}

interface RecentActivity {
  id: string;
  type: 'alert' | 'acknowledgement' | 'camera_status' | 'report' | 'rule_change' | 'user_action';
  description: string;
  user?: string;
  timestamp: string;
  resourceId?: string;
  resourceType?: string;
}

interface UserDashboardProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  selectedSite: {
    id: string;
    name: string;
    location?: string;
    address?: string;
    status?: 'active' | 'maintenance' | 'offline';
    timezone?: string;
    safetyScore?: number | null;
  } | null;
}

// ============================================================
// STYLE CONSTANTS (NEXXAU Design System - Dark Theme)
// ============================================================

const colors = {
  deepNavy: '#0D1B2A',
  steelGray: '#1B263B',
  graphite: '#415A77',
  cloudGray: '#E0E5EB',
  white: '#FFFFFF',
  success: '#32D583',
  warning: '#FACC15',
  alert: '#F04438',
  info: '#3B82F6',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
};

const getSeverityConfig = (severity: AlertSeverity | string) => {
  const s = severity?.toLowerCase?.() || severity;
  switch (s) {
    case 'emergency':
      return { 
        bg: 'bg-purple-500/10', 
        text: 'text-purple-400', 
        border: 'border-purple-500/30',
        dot: 'bg-purple-500',
        label: 'Emergency'
      };
    case 'critical':
      return { 
        bg: 'bg-purple-500/10', 
        text: 'text-purple-400', 
        border: 'border-purple-500/30',
        dot: 'bg-purple-500',
        label: 'Critical'
      };
    case 'high':
      return { 
        bg: 'bg-red-500/10', 
        text: 'text-red-400', 
        border: 'border-red-500/30',
        dot: 'bg-red-500',
        label: 'High'
      };
    case 'medium':
    case 'warning':
      return { 
        bg: 'bg-amber-500/10', 
        text: 'text-amber-400', 
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
        label: 'Medium'
      };
    case 'low':
      return { 
        bg: 'bg-blue-500/10', 
        text: 'text-blue-400', 
        border: 'border-blue-500/30',
        dot: 'bg-blue-500',
        label: 'Low'
      };
    case 'info':
      return { 
        bg: 'bg-slate-500/10', 
        text: 'text-slate-400', 
        border: 'border-slate-500/30',
        dot: 'bg-slate-500',
        label: 'Info'
      };
    default:
      return { 
        bg: 'bg-slate-500/10', 
        text: 'text-slate-400', 
        border: 'border-slate-500/30',
        dot: 'bg-slate-500',
        label: severity || 'Unknown'
      };
  }
};

const getStatusConfig = (status: AlertStatus | string) => {
  const s = status?.toLowerCase?.() || status;
  switch (s) {
    case 'active':
      return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Active' };
    case 'acknowledged':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' };
    case 'snoozed':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Snoozed' };
    case 'resolved':
      return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Resolved' };
    case 'confirmed':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Confirmed' };
    case 'false_positive':
      return { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'False Positive' };
    case 'archived':
      return { bg: 'bg-slate-600/20', text: 'text-slate-500', label: 'Archived' };
    default:
      return { bg: 'bg-slate-500/20', text: 'text-slate-400', label: status || 'Unknown' };
  }
};

const hasPermission = (role: UserRole | undefined, action: string): boolean => {
  if (!role) return false;
  
  const permissions: Record<string, UserRole[]> = {
    acknowledge: ['SITE_MANAGER', 'SAFETY_OFFICER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'SUPERVISOR'],
    assign: ['SITE_MANAGER', 'SAFETY_OFFICER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    escalate: ['SITE_MANAGER', 'SAFETY_OFFICER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    resolve: ['SITE_MANAGER', 'SAFETY_OFFICER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    addCamera: ['SITE_MANAGER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    configureRules: ['SITE_MANAGER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    generateReport: ['SITE_MANAGER', 'SAFETY_OFFICER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'SUPERVISOR'],
    manageWorkflows: ['SITE_MANAGER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    manageUsers: ['SITE_MANAGER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    viewSettings: ['SITE_MANAGER', 'SAFETY_OFFICER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
    editSettings: ['SITE_MANAGER', 'SUPER_ADMIN', 'COMPANY_ADMIN'],
  };
  
  return permissions[action]?.includes(role) ?? false;
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

// KPI Card Component (Dark Theme)
const KPICard = ({ 
  title, 
  value, 
  subValue, 
  change, 
  changeDirection,
  icon: Icon,
  onClick,
  color = 'blue',
  highlight = false
}: {
  title: string;
  value: string | number;
  subValue?: string;
  change?: number;
  changeDirection?: 'up' | 'down';
  icon: typeof Camera;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  highlight?: boolean;
}) => {
  const colorClasses = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    yellow: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-slate-400'
  };

  const bgHighlight = {
    blue: 'border-blue-500/30 bg-blue-500/5',
    green: 'border-emerald-500/30 bg-emerald-500/5',
    yellow: 'border-amber-500/30 bg-amber-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    gray: 'border-slate-600/50 bg-slate-800/50'
  };

  return (
    <div 
      onClick={onClick}
      className={`rounded-lg border p-5 transition-all duration-200 backdrop-blur-sm ${
        highlight ? bgHighlight[color] : 'border-slate-700/50 bg-slate-800/50'
      } ${onClick ? 'cursor-pointer hover:border-slate-600' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
      </div>
      
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold text-white">
          {value}
        </span>
        {subValue && (
          <span className="text-sm text-slate-400">{subValue}</span>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-2 flex items-center space-x-1">
          {changeDirection === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm font-medium ${
            changeDirection === 'up' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {change}%
          </span>
          <span className="text-sm text-slate-500">vs 24h</span>
        </div>
      )}
    </div>
  );
};

// Alert Row Component (Dark Theme)
const AlertRow = ({ 
  alert, 
  onAcknowledge,
  onViewDetails,
  userRole
}: {
  alert: SiteAlert;
  onAcknowledge: () => void;
  onViewDetails: () => void;
  userRole?: UserRole;
}) => {
  const severityConfig = getSeverityConfig(alert.severity);
  const statusConfig = getStatusConfig(alert.status);

  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${severityConfig.dot}`} />
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${severityConfig.bg} ${severityConfig.text}`}>
            {severityConfig.label}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{alert.alertType}</p>
          <p className="text-xs text-slate-400">{alert.camera} • {formatTimeAgo(alert.time)}</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <span className={`text-xs font-medium px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
        
        {alert.status === 'active' && hasPermission(userRole, 'acknowledge') && (
          <button 
            onClick={onAcknowledge}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            Acknowledge
          </button>
        )}
        
        <button 
          onClick={onViewDetails}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Modal Component (Dark Theme)
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = '500px'
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full mx-4"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

/** Overview tab: fewer alerts on first load (full list on Alerts tab) */
const OVERVIEW_ALERTS_LIMIT = 40;

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function UserDashboard({ currentUser, selectedSite }: UserDashboardProps) {
  const router = useRouter();
  
  // State
  const [metrics, setMetrics] = useState<SiteMetrics | null>(null);
  const [alerts, setAlerts] = useState<SiteAlert[]>([]);
  const [cameras, setCameras] = useState<SiteCamera[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'all' | AlertSeverity>('all');
  const [recalculatingScore, setRecalculatingScore] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showLiveFeedModal, setShowLiveFeedModal] = useState(false);
  const [selectedCameraForLive, setSelectedCameraForLive] = useState<SiteCamera | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedCameraForConfig, setSelectedCameraForConfig] = useState<SiteCamera | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [rawCameraData, setRawCameraData] = useState<any>(null);
  const [showCameraInfoPopup, setShowCameraInfoPopup] = useState(false);
  const [selectedCameraForInfo, setSelectedCameraForInfo] = useState<SiteCamera | null>(null);

  // Handle camera configuration
  const handleSaveConfiguration = async (formData: any) => {
    if (!selectedCameraForConfig) return;
    
    try {
      console.log('[UserDashboard] Saving camera config:', selectedCameraForConfig.id, formData);
      
      const response = await fetch(`/api/cameras/${selectedCameraForConfig.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowConfigModal(false);
        setSelectedCameraForConfig(null);
        // Refresh camera data
        fetchSiteData(true);
        alert('Camera configuration saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[UserDashboard] Error saving configuration:', error);
      alert('Error saving camera configuration');
    }
  };

  const handleToggleAI = async (camera: SiteCamera) => {
    try {
      await fetch(`/api/cameras/${camera.id}/ai-detection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !camera.aiEnabled })
      });
      fetchSiteData(true);
    } catch (error) {
      console.error('Error toggling AI:', error);
    }
  };

  // State for camera HLS URLs (cached after conversion)
  const [cameraHlsUrls, setCameraHlsUrls] = useState<Map<string, string>>(new Map());
  const [cameraHlsLoading, setCameraHlsLoading] = useState<Set<string>>(new Set());
  const [cameraHlsErrors, setCameraHlsErrors] = useState<Map<string, string>>(new Map());
  const [currentLiveHlsUrl, setCurrentLiveHlsUrl] = useState<string | null>(null);
  const [currentLiveLoading, setCurrentLiveLoading] = useState(false);
  const [currentLiveError, setCurrentLiveError] = useState<string | null>(null);

  // Helper function to get or convert camera stream URL
  // This function handles RTSP → HLS conversion via API
  const getCameraStreamUrl = async (camera: SiteCamera): Promise<string | null> => {
    // Priority: hlsUrl > already converted > mediamtxPath > streamUrl conversion
    
    // 1. If camera already has HLS URL, use it
    if (camera.hlsUrl) {
      return camera.hlsUrl;
    }
    
    // 2. Check if we've already converted this camera
    if (cameraHlsUrls.has(camera.id)) {
      return cameraHlsUrls.get(camera.id) || null;
    }
    
    // 3. If mediamtxPath exists, use MediaMTX (legacy support)
    if ((camera as any).mediamtxPath) {
      const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL;
      if (!streamBaseUrl) {
        console.error('[UserDashboard] NEXT_PUBLIC_STREAM_BASE_URL is not configured');
        throw new Error('Stream base URL is not configured');
      }
      return `${streamBaseUrl}/live/${(camera as any).mediamtxPath}/index.m3u8`;
    }
    
    // 4. If streamUrl is already HLS or HTTP, use it directly
    if (camera.streamUrl) {
      if (camera.streamUrl.includes('.m3u8') || (camera.streamUrl.startsWith('http') && !camera.streamUrl.startsWith('rtsp://'))) {
        return camera.streamUrl;
      }
      
      // 5. If it's RTSP, convert it via API
      if (camera.streamUrl.startsWith('rtsp://')) {
        // Prevent duplicate API calls
        if (cameraHlsLoading.has(camera.id)) {
          return null; // Still loading
        }
        
        // Check for cached error
        if (cameraHlsErrors.has(camera.id)) {
          return null; // Previous conversion failed
        }
        
        try {
          setCameraHlsLoading(prev => new Set(prev).add(camera.id));
          
          console.log(`[UserDashboard] Converting RTSP to HLS for camera ${camera.id}`);
          const response = await fetch(`/api/streams/${camera.id}?rtspUrl=${encodeURIComponent(camera.streamUrl)}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Failed to convert RTSP: ${response.status}`);
      }
          
          const data = await response.json();
          const hlsUrl = data.hlsUrl;
          
          if (!hlsUrl) {
            throw new Error('API did not return HLS URL');
    }
    
          // Cache the HLS URL
          setCameraHlsUrls(prev => new Map(prev).set(camera.id, hlsUrl));
          console.log(`[UserDashboard] ✅ RTSP converted to HLS: ${hlsUrl}`);
          
          return hlsUrl;
        } catch (error: any) {
          console.error(`[UserDashboard] ❌ Failed to convert RTSP for camera ${camera.id}:`, error);
          setCameraHlsErrors(prev => new Map(prev).set(camera.id, error.message || 'Conversion failed'));
          return null;
        } finally {
          setCameraHlsLoading(prev => {
            const next = new Set(prev);
            next.delete(camera.id);
            return next;
          });
        }
      }
    }
    
    // 6. If rtspPath exists, try MediaMTX (legacy)
    if ((camera as any).rtspPath) {
      const pathName = (camera as any).rtspPath.replace(/^\//, '').replace(/\/$/, '') || `camera-${camera.id}`;
      return `http://localhost:8888/live/${pathName}/index.m3u8`;
    }
    
    return null;
  };

  // Data Fetching — prefer one round-trip (site-summary); fallback: metrics first then alerts + cameras
  const fetchSiteData = useCallback(async (isBackground = false) => {
    if (!selectedSite?.id) return;
    const siteId = selectedSite.id;

    const applyMetrics = (data: any) => {
      setMetrics({
        activeCameras: data.activeCameras ?? 0,
        offlineCameras: data.offlineCameras ?? 0,
        aiEnabledCameras: data.aiEnabledCameras ?? 0,
        totalAlerts: data.totalAlerts ?? 0,
        highAlerts: data.highAlerts ?? 0,
        mediumAlerts: data.mediumAlerts ?? 0,
        lowAlerts: data.lowAlerts ?? 0,
        safetyScore: data.safetyScore ?? null,
        safetyScoreChange: data.safetyScoreChange ?? 0,
        lastActivity: data.lastActivity ?? null,
        avgResponseTime: data.avgResponseTime ?? null,
        violations24h: data.violations24h ?? 0,
        cameraUptime7d: data.cameraUptime7d ?? 99.5,
        lastSync: new Date().toISOString(),
      });
    };

    const applyAlertsFromRawList = (alertsList: any[]) => {
      const activeAlerts = alertsList.filter(
        (a: any) =>
          a.status?.toUpperCase() === 'ACTIVE' ||
          a.status?.toLowerCase() === 'active'
      );
      const formattedAlerts = activeAlerts.map((a: any) => ({
        id: a.id,
        camera:
          a.camera?.name || a.worksite?.name || a.camera || 'Unknown Camera',
        cameraId: a.cameraId || a.camera?.id || '',
        alertType: a.title || a.alertType || 'Alert',
        severity: (a.severity?.toLowerCase() || 'low') as AlertSeverity,
        time: a.createdAt || a.time || new Date().toISOString(),
        status: (a.status?.toLowerCase() || 'active') as AlertStatus,
        evidence: a.evidence,
        videoClip: a.videoClipUrl || a.metadata?.videoClipUrl,
      }));
      setAlerts(formattedAlerts);
    };

    const applyCamerasFromRawList = (camerasList: any[]) => {
      const formattedCameras = camerasList.map((c: any) => ({
        id: c.id,
        name: c.name || 'Unnamed Camera',
        zone: c.zone || c.location,
        location: c.location || c.zone,
        status: (c.status?.toLowerCase() === 'online' ||
        c.status?.toLowerCase() === 'active'
          ? 'online'
          : 'offline') as CameraStatus,
        aiEnabled: c.aiEnabled ?? c.aiDetection ?? false,
        recording: c.recording ?? true,
        recentViolations: c.recentViolations ?? 0,
        lastDetection: c.lastDetection,
        uptime24h: c.uptime24h ?? 99,
        thumbnailUrl: c.thumbnailUrl,
        streamUrl: c.streamUrl || null,
        hlsUrl: c.hlsUrl || null,
        mediamtxPath: c.mediamtxPath || null,
        rtspPath: c.rtspPath || null,
        janusFeedId: c.janusFeedId ?? null,
      }));
      setCameras(formattedCameras);
    };

    const applyRecentActivity = () => {
      setRecentActivity([
        {
          id: '1',
          type: 'alert',
          description: 'New alert triggered',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'acknowledgement',
          description: 'Alert acknowledged',
          user: currentUser?.name,
          timestamp: new Date(Date.now() - 300000).toISOString(),
        },
      ]);
    };

    try {
      if (!isBackground) {
        setLoading(true);
      }

      const summaryRes = await fetch(
        `/api/dashboard/site-summary?worksiteId=${encodeURIComponent(siteId)}`
      ).catch(() => null);

      if (summaryRes?.ok) {
        const body = await summaryRes.json();
        if (body.success && body.metrics) {
          applyMetrics(body.metrics);
          if (Array.isArray(body.alerts)) {
            applyAlertsFromRawList(body.alerts);
          }
          if (Array.isArray(body.cameras)) {
            applyCamerasFromRawList(body.cameras);
          }
          applyRecentActivity();
          return;
        }
      }

      const metricsRes = await fetch(
        `/api/worksites/${siteId}/metrics`
      ).catch(() => null);
      if (metricsRes?.ok) {
        const data = await metricsRes.json();
        applyMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching site metrics:', error);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }

    try {
      const [alertsRes, camerasRes] = await Promise.all([
        fetch(
          `/api/alerts?worksiteId=${siteId}&limit=${OVERVIEW_ALERTS_LIMIT}`
        ).catch(() => null),
        fetch(`/api/cameras?worksiteId=${siteId}`).catch(() => null),
      ]);

      if (alertsRes?.ok) {
        const data = await alertsRes.json();
        const alertsList = Array.isArray(data)
          ? data
          : data.data || data.alerts || [];
        applyAlertsFromRawList(alertsList);
      }

      if (camerasRes?.ok) {
        const data = await camerasRes.json();
        const camerasList = Array.isArray(data)
          ? data
          : data.cameras || data.data || [];
        applyCamerasFromRawList(camerasList);
      }

      applyRecentActivity();
    } catch (error) {
      console.error('Error fetching alerts/cameras:', error);
    }
  }, [selectedSite?.id, currentUser?.name]);

  useEffect(() => {
    if (selectedSite?.id) {
      fetchSiteData(false); // Initial load - show loading
      // Background refresh every 60 seconds (less intrusive)
      const interval = setInterval(() => fetchSiteData(true), 60000);
      return () => clearInterval(interval);
    }
  }, [selectedSite?.id, fetchSiteData]);

  // Handlers
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: '' })
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => 
          a.id === alertId ? { ...a, status: 'acknowledged' as AlertStatus } : a
        ));
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleAcknowledgeAll = async () => {
    const activeAlertIds = alerts.filter(a => a.status === 'active').map(a => a.id);
    for (const id of activeAlertIds) {
      await handleAcknowledgeAlert(id);
    }
  };

  const handleRecalculateSafetyScore = async () => {
    if (!selectedSite?.id || recalculatingScore) return;
    
    setRecalculatingScore(true);
    try {
      const res = await fetch(`/api/safety-score/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksiteId: selectedSite.id })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update only the safety score, not full page refresh
        setMetrics(prev => prev ? {
          ...prev,
          safetyScore: data.safetyScore ?? prev.safetyScore,
          lastSync: new Date().toISOString()
        } : prev);
      }
    } catch (error) {
      console.error('Error recalculating safety score:', error);
    } finally {
      setRecalculatingScore(false);
    }
  };

  const handleRunDiagnostics = async () => {
    if (!selectedSite?.id || runningDiagnostics) return;
    
    setRunningDiagnostics(true);
    setShowDiagnosticsModal(true);
    setDiagnosticsResult(null);
    
    try {
      // Check camera health
      const camerasRes = await fetch(`/api/cameras?worksiteId=${selectedSite.id}`);
      const camerasData = camerasRes.ok ? await camerasRes.json() : [];
      const camerasList = Array.isArray(camerasData) ? camerasData : camerasData.data || [];
      
      // Check API health
      const healthRes = await fetch('/api/health').catch(() => null);
      const healthData = healthRes?.ok ? await healthRes.json() : { status: 'unknown' };
      
      // Calculate diagnostics
      const onlineCameras = camerasList.filter((c: any) => 
        (c.status || 'offline').toLowerCase() === 'online' || 
        (c.status || 'offline').toLowerCase() === 'active'
      ).length;
      const offlineCameras = camerasList.length - onlineCameras;
      const aiEnabled = camerasList.filter((c: any) => c.aiEnabled).length;
      
      setDiagnosticsResult({
        systemHealth: healthData.status === 'ok' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        cameras: {
          total: camerasList.length,
          online: onlineCameras,
          offline: offlineCameras,
          aiEnabled: aiEnabled,
          healthScore: camerasList.length > 0 ? Math.round((onlineCameras / camerasList.length) * 100) : 100
        },
        api: {
          status: healthData.status || 'unknown',
          database: healthData.database || 'unknown',
          latency: healthData.latency || 'N/A'
        },
        alerts: {
          pending: alerts.filter(a => a.status === 'active').length,
          acknowledged: alerts.filter(a => a.status === 'acknowledged').length
        }
      });
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setDiagnosticsResult({
        systemHealth: 'error',
        error: 'Failed to run diagnostics',
        timestamp: new Date().toISOString()
      });
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const handleGenerateReport = (type: string) => {
    setShowReportModal(false);
    router.push(`/dashboard/reports?type=${type}&worksite=${selectedSite?.id}`);
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return alerts.filter(a => a.status === 'active');
    return alerts.filter(a => a.status === 'active' && a.severity === alertFilter);
  }, [alerts, alertFilter]);

  // No site selected
  if (!selectedSite) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Site Selected</h2>
          <p className="text-slate-400">Please select a worksite from the sidebar to view your dashboard.</p>
        </div>
      </div>
    );
  }

  // Loading state — only until metrics resolve (alerts/cameras fill in after)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading site data...</p>
        </div>
      </div>
    );
  }

  const activeAlertCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Site Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            {selectedSite.name} • Last updated: {metrics?.lastSync ? formatTimeAgo(metrics.lastSync) : 'Never'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {activeAlertCount > 0 && hasPermission(currentUser?.role, 'acknowledge') && (
            <button 
              onClick={handleAcknowledgeAll}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors border border-slate-600"
            >
              Acknowledge All ({activeAlertCount})
            </button>
          )}
          {hasPermission(currentUser?.role, 'generateReport') && (
            <button 
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Quick Report</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Safety Score"
          value={metrics?.safetyScore?.toFixed(0) ?? '—'}
          subValue="/ 100"
          change={metrics?.safetyScoreChange}
          changeDirection={metrics?.safetyScoreChange && metrics.safetyScoreChange > 0 ? 'up' : 'down'}
          icon={ShieldCheck}
          color={metrics?.safetyScore && metrics.safetyScore >= 80 ? 'green' : metrics?.safetyScore && metrics.safetyScore >= 60 ? 'yellow' : 'red'}
          onClick={handleRecalculateSafetyScore}
          highlight={true}
        />
        <KPICard
          title="Active Alerts"
          value={activeAlertCount}
          icon={AlertTriangle}
          color={metrics?.highAlerts && metrics.highAlerts > 0 ? 'red' : activeAlertCount > 0 ? 'yellow' : 'green'}
          highlight={activeAlertCount > 0}
        />
        <KPICard
          title="Cameras Online"
          value={`${metrics?.activeCameras ?? 0}`}
          subValue={`/ ${(metrics?.activeCameras ?? 0) + (metrics?.offlineCameras ?? 0)}`}
          icon={Camera}
          color={metrics?.offlineCameras && metrics.offlineCameras > 0 ? 'yellow' : 'green'}
        />
        <KPICard
          title="Violations (24h)"
          value={metrics?.violations24h ?? 0}
          icon={Activity}
          color="gray"
        />
        <KPICard
          title="Avg Response"
          value={metrics?.avgResponseTime ? `${metrics.avgResponseTime}m` : '—'}
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Alerts (2/3 width) */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-lg backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="font-semibold text-white">Active Alerts</h3>
              {activeAlertCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                  {activeAlertCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value as any)}
                className="text-sm bg-slate-700 border border-slate-600 text-white rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="font-medium text-white">No active alerts</p>
                <p className="text-sm text-slate-400">All systems operating normally</p>
              </div>
            ) : (
              filteredAlerts.slice(0, 10).map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={() => handleAcknowledgeAlert(alert.id)}
                  onViewDetails={() => router.push(`/dashboard/alerts/${alert.id}`)}
                  userRole={currentUser?.role}
                />
              ))
            )}
          </div>

          {filteredAlerts.length > 10 && (
            <div className="px-5 py-3 border-t border-slate-700/50">
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: 'alerts' }))
                }
                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                View all {filteredAlerts.length} alerts →
              </button>
            </div>
          )}
        </div>

        {/* Site Health (1/3 width) */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-white">Site Health</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Camera Uptime (7d)</span>
              <span className="text-sm font-semibold text-white">
                {metrics?.cameraUptime7d?.toFixed(1) ?? '—'}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">AI Cameras Active</span>
              <span className="text-sm font-semibold text-white">
                {metrics?.aiEnabledCameras ?? 0} / {(metrics?.activeCameras ?? 0) + (metrics?.offlineCameras ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">High Priority Alerts</span>
              <span className="text-sm font-semibold text-red-400">
                {metrics?.highAlerts ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Last Activity</span>
              <span className="text-sm font-semibold text-white">
                {metrics?.lastActivity ? formatTimeAgo(metrics.lastActivity) : '—'}
              </span>
            </div>
            
            <div className="pt-4 border-t border-slate-700/50 space-y-2">
              <button 
                onClick={handleRecalculateSafetyScore}
                disabled={recalculatingScore}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${recalculatingScore ? 'animate-spin' : ''}`} />
                <span>{recalculatingScore ? 'Recalculating...' : 'Recalculate Safety Score'}</span>
              </button>
              <button 
                onClick={handleRunDiagnostics}
                disabled={runningDiagnostics}
                className="w-full py-2.5 border border-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Zap className={`w-4 h-4 ${runningDiagnostics ? 'animate-pulse' : ''}`} />
                <span>{runningDiagnostics ? 'Running...' : 'Run Diagnostics'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cameras Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Camera Monitoring</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live camera previews (go2rtc)</p>
          </div>
          <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {cameras.filter(c => c.status === 'online').length} / {cameras.length} online
          </span>
            <button
              onClick={async () => {
                try {
                  // Fetch raw camera data from API
                  const response = await fetch(`/api/cameras?worksiteId=${selectedSite?.id}`, { cache: 'no-store' });
                  const data = await response.json();
                  setRawCameraData({
                    apiResponse: data,
                    camerasInState: cameras,
                    selectedSiteId: selectedSite?.id,
                    timestamp: new Date().toISOString()
                  });
                  setShowDebugModal(true);
                } catch (error) {
                  console.error('Error fetching camera debug data:', error);
                  setRawCameraData({
                    error: error instanceof Error ? error.message : 'Unknown error',
                    camerasInState: cameras,
                    selectedSiteId: selectedSite?.id,
                    timestamp: new Date().toISOString()
                  });
                  setShowDebugModal(true);
                }
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex items-center gap-2"
              title="Show all camera information for debugging"
            >
              <Settings className="w-4 h-4" />
              Debug Cameras
            </button>
          </div>
        </div>
        
        <div className="p-5">
          {cameras.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No cameras configured for this site</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-300">Live Cameras</h4>
                <span className="text-xs text-slate-500">
                  {cameras.length} camera{cameras.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {cameras.slice(0, 8).map((camera) => (
                  <OverviewCameraThumb
                    key={camera.id}
                    camera={{ id: camera.id, name: camera.name }}
                  />
                ))}
              </div>
            </>
          )}
          
          {cameras.length > 8 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: 'cameras' }))
                }
                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                View all {cameras.length} cameras →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Generate Quick Report"
      >
        <div className="space-y-3">
          <button 
            onClick={() => handleGenerateReport('daily')}
            className="w-full p-4 text-left border border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/5 transition-colors"
          >
            <h4 className="font-medium text-white">Daily Summary</h4>
            <p className="text-sm text-slate-400">Activity and alerts from today</p>
          </button>
          <button 
            onClick={() => handleGenerateReport('weekly')}
            className="w-full p-4 text-left border border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/5 transition-colors"
          >
            <h4 className="font-medium text-white">Weekly Report</h4>
            <p className="text-sm text-slate-400">Trends and analysis for the past 7 days</p>
          </button>
          <button 
            onClick={() => handleGenerateReport('monthly')}
            className="w-full p-4 text-left border border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/5 transition-colors"
          >
            <h4 className="font-medium text-white">Monthly Compliance</h4>
            <p className="text-sm text-slate-400">Audit-ready monthly report</p>
          </button>
        </div>
      </Modal>

      {/* Diagnostics Modal */}
      <Modal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        title="System Diagnostics"
      >
        {runningDiagnostics ? (
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-400">Running diagnostics...</p>
          </div>
        ) : diagnosticsResult ? (
          <div className="space-y-4">
            {/* System Health */}
            <div className="p-4 rounded-lg border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">System Health</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  diagnosticsResult.systemHealth === 'healthy' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : diagnosticsResult.systemHealth === 'degraded'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {diagnosticsResult.systemHealth?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Checked at {new Date(diagnosticsResult.timestamp).toLocaleTimeString()}
              </p>
            </div>

            {/* Camera Health */}
            {diagnosticsResult.cameras && (
              <div className="p-4 rounded-lg border border-slate-600">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Camera Health</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-slate-700/50 rounded">
                    <div className="text-lg font-bold text-white">{diagnosticsResult.cameras.total}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
                  <div className="text-center p-2 bg-emerald-500/10 rounded">
                    <div className="text-lg font-bold text-emerald-400">{diagnosticsResult.cameras.online}</div>
                    <div className="text-xs text-slate-400">Online</div>
                  </div>
                  <div className="text-center p-2 bg-red-500/10 rounded">
                    <div className="text-lg font-bold text-red-400">{diagnosticsResult.cameras.offline}</div>
                    <div className="text-xs text-slate-400">Offline</div>
                  </div>
                  <div className="text-center p-2 bg-blue-500/10 rounded">
                    <div className="text-lg font-bold text-blue-400">{diagnosticsResult.cameras.aiEnabled}</div>
                    <div className="text-xs text-slate-400">AI Enabled</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Health Score</span>
                    <span className={`text-sm font-bold ${
                      diagnosticsResult.cameras.healthScore >= 80 ? 'text-emerald-400' :
                      diagnosticsResult.cameras.healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {diagnosticsResult.cameras.healthScore}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* API Status */}
            {diagnosticsResult.api && (
              <div className="p-4 rounded-lg border border-slate-600">
                <h4 className="text-sm font-medium text-slate-300 mb-3">API Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Status</span>
                    <span className={`text-xs font-medium ${
                      diagnosticsResult.api.status === 'ok' ? 'text-emerald-400' : 'text-yellow-400'
                    }`}>
                      {diagnosticsResult.api.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Database</span>
                    <span className={`text-xs font-medium ${
                      diagnosticsResult.api.database === 'connected' ? 'text-emerald-400' : 'text-yellow-400'
                    }`}>
                      {diagnosticsResult.api.database?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Alerts Summary */}
            {diagnosticsResult.alerts && (
              <div className="p-4 rounded-lg border border-slate-600">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Alerts Summary</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Pending Alerts</span>
                  <span className="text-sm font-bold text-yellow-400">{diagnosticsResult.alerts.pending}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">Acknowledged</span>
                  <span className="text-sm font-bold text-emerald-400">{diagnosticsResult.alerts.acknowledged}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDiagnosticsModal(false)}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">No diagnostics data available</p>
          </div>
        )}
      </Modal>

      {/* Live Feed Modal */}
      {showLiveFeedModal && selectedCameraForLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-xl w-full max-w-5xl border border-slate-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedCameraForLive.name}</h3>
                  <p className="text-sm text-slate-400">{(selectedCameraForLive as any).location || selectedSite?.name || 'Unknown Location'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  selectedCameraForLive.status === 'online' 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}>
                  {selectedCameraForLive.status}
                </span>
                {selectedCameraForLive.aiEnabled && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    AI Active
                  </span>
                )}
                <button
                  onClick={() => {
                    setShowLiveFeedModal(false);
                    setSelectedCameraForLive(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Video Container */}
            <div className="aspect-video bg-black relative">
              {currentLiveLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-white font-medium mb-2">Converting RTSP to HLS...</p>
                  <p className="text-slate-400 text-sm">Starting FFmpeg stream conversion</p>
                </div>
              ) : currentLiveError ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <XCircle className="w-20 h-20 text-red-500 mb-4" />
                  <p className="text-white font-medium mb-2">Stream Error</p>
                  <p className="text-red-400 text-sm">{currentLiveError}</p>
                  <button
                    onClick={async () => {
                      setCurrentLiveError(null);
                      setCurrentLiveLoading(true);
                      const url = await getCameraStreamUrl(selectedCameraForLive);
                      if (url) {
                        setCurrentLiveHlsUrl(url);
                        setCurrentLiveLoading(false);
                      } else {
                        setCurrentLiveError('Failed to get stream URL');
                        setCurrentLiveLoading(false);
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : currentLiveHlsUrl ? (
                <>
                  <CameraStreamViewer
                    hlsUrl={currentLiveHlsUrl}
                    protocol="hls"
                    autoPlay={true}
                    controls={true}
                    className="w-full h-full"
                    onError={(error) => {
                      console.error('[UserDashboard] Stream error:', error);
                      setCurrentLiveError(error);
                    }}
                  />
                  
                  {/* Live indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-600 rounded text-white text-xs font-bold z-10">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Camera className="w-20 h-20 text-slate-700 mb-4" />
                  <p className="text-white font-medium mb-2">No Stream Available</p>
                  <p className="text-slate-400 text-sm">This camera does not have a configured stream URL.</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700 grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs uppercase">Violations (24h)</p>
                <p className={`font-semibold ${selectedCameraForLive.recentViolations > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  {selectedCameraForLive.recentViolations || 0}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase">Status</p>
                <p className="font-semibold text-slate-300">{selectedCameraForLive.status}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase">AI Detection</p>
                <p className={`font-semibold ${selectedCameraForLive.aiEnabled ? 'text-blue-400' : 'text-slate-400'}`}>
                  {selectedCameraForLive.aiEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowLiveFeedModal(false);
                    setSelectedCameraForLive(null);
                    setSelectedCameraForConfig(selectedCameraForLive);
                    setShowConfigModal(true);
                  }}
                  className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors"
                >
                  Configure
                </button>
                <button
                  onClick={() => {
                    setShowLiveFeedModal(false);
                    setSelectedCameraForLive(null);
                  }}
                  className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure Camera Modal */}
      {showConfigModal && selectedCameraForConfig && (
        <ConfigureCameraModal
          camera={selectedCameraForConfig}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedCameraForConfig(null);
          }}
          onSave={handleSaveConfiguration}
          onToggleAI={() => handleToggleAI(selectedCameraForConfig)}
          onStreamSwitched={() => fetchSiteData(true)}
        />
      )}

      {/* Camera Info Popup */}
      {showCameraInfoPopup && selectedCameraForInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => {
          setShowCameraInfoPopup(false);
          setSelectedCameraForInfo(null);
        }}>
          <div className="bg-slate-900 rounded-xl w-full max-w-3xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900">
              <h3 className="text-xl font-semibold text-white">Camera Information: {selectedCameraForInfo.name}</h3>
              <button
                onClick={() => {
                  setShowCameraInfoPopup(false);
                  setSelectedCameraForInfo(null);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h4 className="text-lg font-semibold text-white mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 text-sm">Camera ID:</span>
                    <p className="text-white font-mono text-sm mt-1">{selectedCameraForInfo.id}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Name:</span>
                    <p className="text-white mt-1">{selectedCameraForInfo.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Location:</span>
                    <p className="text-white mt-1">{(selectedCameraForInfo as any).location || (selectedCameraForInfo as any).zone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Status:</span>
                    <p className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedCameraForInfo.status === 'online' ? 'bg-green-500/20 text-green-400' :
                      selectedCameraForInfo.status === 'offline' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedCameraForInfo.status || 'unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">AI Detection:</span>
                    <p className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedCameraForInfo.aiEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedCameraForInfo.aiEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Recent Violations (24h):</span>
                    <p className="text-white mt-1">{selectedCameraForInfo.recentViolations || 0}</p>
                  </div>
                </div>
              </div>

              {/* Stream URLs */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h4 className="text-lg font-semibold text-white mb-4">Stream Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 text-sm">HLS URL:</span>
                    <p className="text-white font-mono text-xs mt-1 break-all bg-slate-900/50 p-2 rounded">
                      {selectedCameraForInfo.hlsUrl || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Stream URL:</span>
                    <p className="text-white font-mono text-xs mt-1 break-all bg-slate-900/50 p-2 rounded">
                      {selectedCameraForInfo.streamUrl || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">MediaMTX Path:</span>
                    <p className="text-white font-mono text-xs mt-1 break-all bg-slate-900/50 p-2 rounded">
                      {selectedCameraForInfo.mediamtxPath || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">RTSP Path:</span>
                    <p className="text-white font-mono text-xs mt-1 break-all bg-slate-900/50 p-2 rounded">
                      {selectedCameraForInfo.rtspPath || 'Not configured'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Metadata */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h4 className="text-lg font-semibold text-white mb-4">Additional Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Uptime (24h):</span>
                    <span className="text-white">{selectedCameraForInfo.uptime24h || 'N/A'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Recording:</span>
                    <span className={`${selectedCameraForInfo.recording ? 'text-green-400' : 'text-gray-400'}`}>
                      {selectedCameraForInfo.recording ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw Data (for debugging) */}
              <details className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <summary className="text-lg font-semibold text-white cursor-pointer">Raw Camera Data (Debug)</summary>
                <pre className="mt-4 text-xs text-slate-300 bg-slate-900/50 p-4 rounded overflow-auto max-h-64">
                  {JSON.stringify(selectedCameraForInfo, null, 2)}
                </pre>
              </details>
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => {
                  setShowCameraInfoPopup(false);
                  setSelectedCameraForInfo(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Camera Data Modal */}
      <Modal
        isOpen={showDebugModal}
        onClose={() => {
          setShowDebugModal(false);
          setRawCameraData(null);
        }}
        title="Camera Debug Information"
        maxWidth="900px"
      >
        {rawCameraData ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900 rounded border border-slate-700">
              <h4 className="text-sm font-semibold text-white mb-2">Debug Info</h4>
              <div className="text-xs text-slate-400 space-y-1">
                <p><strong>Selected Site ID:</strong> {rawCameraData.selectedSiteId || 'None'}</p>
                <p><strong>Cameras in State:</strong> {rawCameraData.camerasInState?.length || 0}</p>
                <p><strong>Timestamp:</strong> {rawCameraData.timestamp}</p>
                {rawCameraData.error && (
                  <p className="text-red-400"><strong>Error:</strong> {rawCameraData.error}</p>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded border border-slate-700">
              <h4 className="text-sm font-semibold text-white mb-2">API Response</h4>
              <pre className="text-xs text-slate-300 overflow-auto max-h-96 p-3 bg-slate-950 rounded border border-slate-800">
                {JSON.stringify(rawCameraData.apiResponse, null, 2)}
              </pre>
            </div>

            <div className="p-3 bg-slate-900 rounded border border-slate-700">
              <h4 className="text-sm font-semibold text-white mb-2">Cameras in Component State</h4>
              <pre className="text-xs text-slate-300 overflow-auto max-h-96 p-3 bg-slate-950 rounded border border-slate-800">
                {JSON.stringify(rawCameraData.camerasInState, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(rawCameraData, null, 2));
                  alert('Debug data copied to clipboard!');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded transition-colors"
              >
                Copy All Data
              </button>
              <button
                onClick={() => {
                  setShowDebugModal(false);
                  setRawCameraData(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading camera debug data...</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Configure Camera Modal Component
function ConfigureCameraModal({ 
  camera, 
  onClose, 
  onSave, 
  onToggleAI,
  onStreamSwitched
}: { 
  camera: any; 
  onClose: () => void; 
  onSave: (data: any) => void;
  onToggleAI: () => void;
  onStreamSwitched?: () => void;
}) {
  const [janusStreams, setJanusStreams] = useState<Array<{ id: number; name?: string; description?: string }>>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [selectedFeedId, setSelectedFeedId] = useState<string>(String(camera.janusFeedId ?? ''));
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFeedId(String(camera.janusFeedId ?? ''));
  }, [camera?.id, camera?.janusFeedId]);

  useEffect(() => {
    setLoadingStreams(true);
    fetch('/api/janus/streams')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) setJanusStreams(data.data);
      })
      .catch(() => setJanusStreams([]))
      .finally(() => setLoadingStreams(false));
  }, []);

  const handleSwitchStream = async () => {
    const feedId = Number(selectedFeedId);
    if (!Number.isInteger(feedId) || feedId <= 0) return;
    if (feedId === (camera.janusFeedId ?? null)) return;
    setSwitchError(null);
    setSwitching(true);
    try {
      const res = await fetch(`/api/cameras/${camera.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ janusFeedId: feedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      onStreamSwitched?.();
      onClose();
    } catch (e: any) {
      setSwitchError(e?.message || 'Failed to switch stream');
    } finally {
      setSwitching(false);
    }
  };

  // Initialize form data from camera object, handling both SiteCamera and full camera API response structures
  const getInitialFormData = () => {
    const location = camera.location || camera.zone || '';
    const hlsUrl = camera.hlsUrl || '';
    const streamUrl = (camera.streamUrl && camera.streamUrl.startsWith('rtsp://')) ? camera.streamUrl : '';
    const mediamtxPath = camera.mediamtxPath || '';
    const status = camera.status || 'online';
    
    return {
      name: camera.name || '',
      location,
      hlsUrl,
      streamUrl,
      mediamtxPath,
      status
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  
  // Update form data when camera prop changes
  useEffect(() => {
    setFormData(getInitialFormData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera?.id, camera?.name, camera?.location, camera?.zone, camera?.hlsUrl, camera?.streamUrl, camera?.mediamtxPath, camera?.status]);

  const handleSubmit = () => {
    const updateData: any = {
      name: formData.name,
      location: formData.location,
      status: formData.status
    };

    // Add URLs if they've changed
    if (formData.hlsUrl && formData.hlsUrl !== camera.hlsUrl) {
      updateData.hlsUrl = formData.hlsUrl;
    }
    if (formData.streamUrl && formData.streamUrl !== camera.streamUrl) {
      updateData.streamUrl = formData.streamUrl;
    }
    if (formData.mediamtxPath && formData.mediamtxPath !== (camera as any).mediamtxPath) {
      updateData.mediamtxPath = formData.mediamtxPath;
    }

    onSave(updateData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">Configure Camera: {camera.name}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Camera Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location / Description</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Main Entrance, Zone A, North Building"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Stream URL (HLS)</label>
            <input
              type="text"
              value={formData.hlsUrl}
              onChange={(e) => setFormData({ ...formData, hlsUrl: e.target.value })}
              placeholder="https://example.com/stream.m3u8"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">For HLS streams (.m3u8) - browser compatible</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">RTSP URL (Optional)</label>
            <input
              type="text"
              value={formData.streamUrl}
              onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
              placeholder="rtsp://username:password@192.168.1.100:554/stream"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">Requires transcoding service like MediaMTX</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">MediaMTX Path (Optional)</label>
            <input
              type="text"
              value={formData.mediamtxPath}
              onChange={(e) => setFormData({ ...formData, mediamtxPath: e.target.value })}
              placeholder="camera-path-name"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">MediaMTX path name (auto-generates HLS URL: http://localhost:8888/live/{'{path}'}/index.m3u8)</p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Switch to Janus stream</label>
            <p className="text-xs text-slate-500 mb-2">Use stream 6 if you run feed-stream-6.sh on your Mac. Current: {camera.janusFeedId != null ? `Stream ${camera.janusFeedId}` : 'Not set'}</p>
            <select
              value={selectedFeedId}
              onChange={(e) => { setSelectedFeedId(e.target.value); setSwitchError(null); }}
              disabled={loadingStreams || switching}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="">Select stream</option>
              {janusStreams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.description ?? s.name ?? `Stream ${s.id}`} (ID: {s.id})
                </option>
              ))}
            </select>
            {switchError && <p className="text-red-400 text-xs mt-1">{switchError}</p>}
            <button
              onClick={handleSwitchStream}
              disabled={!selectedFeedId || Number(selectedFeedId) === (camera.janusFeedId ?? 0) || switching}
              className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg text-sm"
            >
              {switching ? 'Switching…' : 'Switch to this stream'}
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">AI Detection</p>
              <p className="text-xs text-slate-400">Enable real-time object detection</p>
            </div>
            <button
              onClick={onToggleAI}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                camera.aiEnabled ?? camera.aiDetection ?? false ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  camera.aiEnabled ?? camera.aiDetection ?? false ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="online">Online</option>
              <option value="active">Active</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete camera "${camera.name}"?`)) {
                fetch(`/api/cameras/${camera.id}`, { method: 'DELETE' })
                  .then(res => {
                    if (res.ok) {
                      alert('Camera deleted successfully');
                      onClose();
                      window.location.reload();
                    } else {
                      alert('Failed to delete camera');
                    }
                  });
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Delete Camera
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
