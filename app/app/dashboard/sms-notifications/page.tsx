'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Search,
  RefreshCw,
  Download,
  Eye,
  Settings,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Info,
  Users,
  Plus,
  Edit,
  Trash2,
  Send,
  PhoneCall,
  ArrowLeft
} from 'lucide-react';

interface SMSNotification {
  id: string;
  messageId: string;
  phoneNumber: string;
  message: string;
  violationType?: string;
  severity?: string;
  location?: string;
  worksiteId?: string;
  worksite?: {
    name: string;
    worksiteName: string;
  };
  cameraId?: string;
  camera?: {
    name: string;
    location: string;
  };
  status: 'sent' | 'delivered' | 'failed' | 'undelivered';
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: Date;
  sentAt: Date;
  deliveredAt?: Date;
  updatedAt: Date;
}

interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  role: string;
  worksiteId?: string;
  worksite?: {
    name: string;
    worksiteName: string;
  };
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SMSStats {
  totalSent: number;
  delivered: number;
  failed: number;
  undelivered: number;
  todaySent: number;
  thisWeekSent: number;
  thisMonthSent: number;
  averageDeliveryTime: number;
  topViolationTypes: Array<{ violationType: string; count: number }>;
  deliveryTrend: Array<{ date: string; count: number }>;
}

const SMSNotificationDashboard: React.FC = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<SMSNotification[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [stats, setStats] = useState<SMSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [violationTypeFilter, setViolationTypeFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedNotification, setSelectedNotification] = useState<SMSNotification | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [newContact, setNewContact] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    role: 'manager',
    worksiteId: '',
    priority: 1
  });

  // Mock data for demo
  useEffect(() => {
    const mockNotifications: SMSNotification[] = [
      {
        id: '1',
        messageId: 'msg_123456',
        phoneNumber: '+1 (555) 123-4567',
        message: 'SAFETY ALERT: Hard hat violation detected at Construction Zone. Worker without proper PPE identified. Please address immediately.',
        violationType: 'hard_hat_violation',
        severity: 'high',
        location: 'Construction Zone',
        worksite: { name: 'Downtown Construction', worksiteName: 'Main Site' },
        camera: { name: 'Construction Zone Camera', location: 'Zone A' },
        status: 'delivered',
        retryCount: 0,
        sentAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        deliveredAt: new Date(Date.now() - 1000 * 60 * 14), // 14 minutes ago
        updatedAt: new Date()
      },
      {
        id: '2',
        messageId: 'msg_123457',
        phoneNumber: '+1 (555) 987-6543',
        message: 'SAFETY ALERT: Safety equipment missing detected at Warehouse. Worker without safety vest identified.',
        violationType: 'safety_equipment_missing',
        severity: 'medium',
        location: 'Warehouse',
        worksite: { name: 'Warehouse Operations', worksiteName: 'Storage Facility' },
        camera: { name: 'Warehouse Monitoring', location: 'Loading Bay' },
        status: 'sent',
        retryCount: 0,
        sentAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        updatedAt: new Date()
      },
      {
        id: '3',
        messageId: 'msg_123458',
        phoneNumber: '+1 (555) 456-7890',
        message: 'SAFETY ALERT: Restricted area access detected at Parking Lot. Unauthorized personnel in restricted zone.',
        violationType: 'restricted_area_access',
        severity: 'critical',
        location: 'Parking Lot',
        worksite: { name: 'Main Facility', worksiteName: 'Headquarters' },
        camera: { name: 'Parking Lot Camera', location: 'Main Entrance' },
        status: 'failed',
        errorMessage: 'Invalid phone number format',
        retryCount: 2,
        lastRetryAt: new Date(Date.now() - 1000 * 60 * 5),
        sentAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
        updatedAt: new Date()
      }
    ];

    const mockContacts: EmergencyContact[] = [
      {
        id: '1',
        name: 'John Smith',
        phoneNumber: '+1 (555) 123-4567',
        email: 'john.smith@company.com',
        role: 'Site Manager',
        worksite: { name: 'Downtown Construction', worksiteName: 'Main Site' },
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        phoneNumber: '+1 (555) 987-6543',
        email: 'sarah.johnson@company.com',
        role: 'Safety Supervisor',
        worksite: { name: 'Warehouse Operations', worksiteName: 'Storage Facility' },
        isActive: true,
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Mike Wilson',
        phoneNumber: '+1 (555) 456-7890',
        email: 'mike.wilson@company.com',
        role: 'Emergency Contact',
        worksite: { name: 'Main Facility', worksiteName: 'Headquarters' },
        isActive: false,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockStats: SMSStats = {
      totalSent: 1247,
      delivered: 1189,
      failed: 45,
      undelivered: 13,
      todaySent: 23,
      thisWeekSent: 156,
      thisMonthSent: 1247,
      averageDeliveryTime: 2.3,
      topViolationTypes: [
        { violationType: 'hard_hat_violation', count: 456 },
        { violationType: 'safety_equipment_missing', count: 234 },
        { violationType: 'unsafe_behavior', count: 189 },
        { violationType: 'restricted_area_access', count: 123 }
      ],
      deliveryTrend: []
    };

    setNotifications(mockNotifications);
    setContacts(mockContacts);
    setStats(mockStats);
    setLoading(false);
  }, [timeRange]);

  const handleCreateContact = async () => {
    try {
      // Mock API call
      const newContactData = {
        ...newContact,
        id: Date.now().toString(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setContacts(prev => [newContactData, ...prev]);
      setIsContactDialogOpen(false);
      setNewContact({
        name: '',
        phoneNumber: '',
        email: '',
        role: 'manager',
        worksiteId: '',
        priority: 1
      });
    } catch (error) {
      console.error('Failed to create contact:', error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      setContacts(prev => prev.filter(contact => contact.id !== contactId));
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100 border-green-200';
      case 'sent': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'failed': return 'text-red-600 bg-red-100 border-red-200';
      case 'undelivered': return 'text-orange-600 bg-orange-100 border-orange-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Clock className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'undelivered': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.phoneNumber.includes(searchTerm) ||
                         notification.violationType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    const matchesViolationType = violationTypeFilter === 'all' || 
                                notification.violationType === violationTypeFilter;
    
    return matchesSearch && matchesStatus && matchesViolationType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">SMS Notifications Dashboard</h1>
              <p className="text-gray-400">Monitor SMS notifications for safety violations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">Total Sent</h3>
                <MessageSquare className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.totalSent.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.delivered.toLocaleString()} delivered
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">Delivered</h3>
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400">{stats.delivered.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">
                {Math.round((stats.delivered / stats.totalSent) * 100)}% success rate
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">Failed</h3>
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-400">{stats.failed.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.undelivered.toLocaleString()} undelivered
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">Today</h3>
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400">{stats.todaySent.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.thisWeekSent.toLocaleString()} this week
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
          <div className="flex border-b border-white/20">
            {[
              { id: 'notifications', label: 'SMS Notifications', icon: MessageSquare },
              { id: 'contacts', label: 'Emergency Contacts', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-blue-400 bg-white/5'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search notifications..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Statuses</option>
                        <option value="delivered">Delivered</option>
                        <option value="sent">Sent</option>
                        <option value="failed">Failed</option>
                        <option value="undelivered">Undelivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Violation Type</label>
                      <select
                        value={violationTypeFilter}
                        onChange={(e) => setViolationTypeFilter(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Types</option>
                        <option value="hard_hat_violation">Hard Hat Violation</option>
                        <option value="safety_equipment_missing">Safety Equipment Missing</option>
                        <option value="unsafe_behavior">Unsafe Behavior</option>
                        <option value="restricted_area_access">Restricted Area Access</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
                      <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="1h">Last Hour</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SMS Notifications List */}
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div key={notification.id} className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center space-x-2">
                            <Phone className="h-5 w-5 text-blue-400" />
                            <div className={`w-3 h-3 rounded-full ${
                              notification.status === 'delivered' ? 'bg-green-400' :
                              notification.status === 'sent' ? 'bg-blue-400' :
                              notification.status === 'failed' ? 'bg-red-400' : 'bg-orange-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-white">{notification.phoneNumber}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(notification.status)}`}>
                                {getStatusIcon(notification.status)}
                                {notification.status}
                              </span>
                              {notification.severity && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(notification.severity)}`}>
                                  {notification.severity}
                                </span>
                              )}
                              {notification.violationType && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-200 border border-gray-500">
                                  {notification.violationType.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 mb-2 text-sm">
                              {notification.message.length > 100 
                                ? `${notification.message.substring(0, 100)}...` 
                                : notification.message}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(notification.sentAt).toLocaleString()}
                              </div>
                              {notification.retryCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <span>Retries: {notification.retryCount}</span>
                                </div>
                              )}
                              {notification.worksite && (
                                <div className="flex items-center gap-1">
                                  <span>Worksite: {notification.worksite.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedNotification(notification);
                              setIsDetailsOpen(true);
                            }}
                            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Emergency Contacts</h3>
                    <p className="text-gray-400">Manage emergency contacts for SMS notifications</p>
                  </div>
                  <button
                    onClick={() => setIsContactDialogOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Contact
                  </button>
                </div>

                <div className="space-y-4">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Users className="h-5 w-5 text-blue-400" />
                            <div>
                              <h3 className="font-semibold text-white">{contact.name}</h3>
                              <p className="text-sm text-gray-300">{contact.phoneNumber}</p>
                              {contact.email && (
                                <p className="text-sm text-gray-400">{contact.email}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-200 border border-gray-500">
                            {contact.role}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-200 border border-gray-500">
                            Priority: {contact.priority}
                          </span>
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-2">SMS Delivery Trends</h3>
                  <p className="text-gray-400 mb-4">SMS delivery rates over time</p>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                      <p>SMS delivery trend chart will be displayed here</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-2">Top Violation Types</h3>
                  <p className="text-gray-400 mb-4">Most common violation types triggering SMS</p>
                  <div className="space-y-3">
                    {stats?.topViolationTypes.map((violation, index) => (
                      <div key={violation.violationType} className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">{violation.violationType.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(violation.count / (stats.topViolationTypes[0]?.count || 1)) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-white w-8 text-right">{violation.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-2">SMS Settings</h3>
                  <p className="text-gray-400 mb-6">Configure SMS notification settings</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">SMS Notifications</label>
                      <select className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Retry Attempts</label>
                      <input
                        type="number"
                        placeholder="3"
                        min="0"
                        max="10"
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Cooldown Period (minutes)</label>
                      <input
                        type="number"
                        placeholder="15"
                        min="0"
                        max="1440"
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SMS Details Modal */}
        {isDetailsOpen && selectedNotification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">SMS Notification Details</h2>
                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                <p className="text-gray-400 mt-1">Detailed information about the SMS notification</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                    <p className="text-sm text-white">{selectedNotification.phoneNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(selectedNotification.status)}`}>
                      {getStatusIcon(selectedNotification.status)}
                      {selectedNotification.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Message ID</label>
                    <p className="text-sm text-white font-mono">{selectedNotification.messageId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sent At</label>
                    <p className="text-sm text-white">{new Date(selectedNotification.sentAt).toLocaleString()}</p>
                  </div>
                  {selectedNotification.deliveredAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Delivered At</label>
                      <p className="text-sm text-white">{new Date(selectedNotification.deliveredAt).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Retry Count</label>
                    <p className="text-sm text-white">{selectedNotification.retryCount}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    value={selectedNotification.message}
                    readOnly
                    className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {selectedNotification.errorMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Error Message</label>
                    <p className="text-sm text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800">
                      {selectedNotification.errorMessage}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-700 flex justify-end">
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Contact Modal */}
        {isContactDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Add Emergency Contact</h2>
                <p className="text-gray-400 mt-1">Add a new emergency contact for SMS notifications</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={newContact.phoneNumber}
                    onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email (Optional)</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <select
                    value={newContact.role}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="manager">Manager</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="emergency">Emergency Contact</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <input
                    type="number"
                    value={newContact.priority}
                    onChange={(e) => setNewContact({ ...newContact, priority: parseInt(e.target.value) })}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-700 flex justify-end gap-2">
                <button
                  onClick={() => setIsContactDialogOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateContact}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SMSNotificationDashboard;