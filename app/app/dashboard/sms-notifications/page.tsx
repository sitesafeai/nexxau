'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  PhoneCall
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
  const [newContact, setNewContact] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    role: 'manager',
    worksiteId: '',
    priority: 1
  });

  useEffect(() => {
    fetchSMSData();
    const interval = setInterval(fetchSMSData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchSMSData = async () => {
    try {
      const [notificationsResponse, contactsResponse, statsResponse] = await Promise.all([
        fetch(`/api/sms/notifications?range=${timeRange}`),
        fetch('/api/emergency-contacts'),
        fetch('/api/sms/stats')
      ]);

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.data || []);
      }

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        setContacts(contactsData.data || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data || null);
      }
    } catch (error) {
      console.error('Failed to fetch SMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async () => {
    try {
      const response = await fetch('/api/emergency-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContact)
      });

      if (response.ok) {
        await fetchSMSData();
        setIsContactDialogOpen(false);
        setNewContact({
          name: '',
          phoneNumber: '',
          email: '',
          role: 'manager',
          worksiteId: '',
          priority: 1
        });
      }
    } catch (error) {
      console.error('Failed to create contact:', error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const response = await fetch(`/api/emergency-contacts/${contactId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchSMSData();
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'undelivered': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">SMS Notifications Dashboard</h1>
          <p className="text-gray-600">Monitor SMS notifications for safety violations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSMSData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.delivered} delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.delivered / stats.totalSent) * 100)}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.undelivered} undelivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.todaySent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.thisWeekSent} this week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications">SMS Notifications</TabsTrigger>
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search notifications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="undelivered">Undelivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="violationType">Violation Type</Label>
                  <Select value={violationTypeFilter} onValueChange={setViolationTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="hard_hat_violation">Hard Hat Violation</SelectItem>
                      <SelectItem value="safety_equipment_missing">Safety Equipment Missing</SelectItem>
                      <SelectItem value="unsafe_behavior">Unsafe Behavior</SelectItem>
                      <SelectItem value="restricted_area_access">Restricted Area Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timeRange">Time Range</Label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Notifications List */}
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(notification.status).split(' ')[0]}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{notification.phoneNumber}</h3>
                          <Badge className={getStatusColor(notification.status)}>
                            {getStatusIcon(notification.status)}
                            <span className="ml-1">{notification.status}</span>
                          </Badge>
                          {notification.severity && (
                            <Badge className={getSeverityColor(notification.severity)}>
                              {notification.severity}
                            </Badge>
                          )}
                          {notification.violationType && (
                            <Badge variant="outline">
                              {notification.violationType.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2 text-sm">
                          {notification.message.length > 100 
                            ? `${notification.message.substring(0, 100)}...` 
                            : notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedNotification(notification);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Emergency Contacts</CardTitle>
                  <CardDescription>Manage emergency contacts for SMS notifications</CardDescription>
                </div>
                <Button onClick={() => setIsContactDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <div>
                            <h3 className="font-semibold">{contact.name}</h3>
                            <p className="text-sm text-gray-600">{contact.phoneNumber}</p>
                            {contact.email && (
                              <p className="text-sm text-gray-500">{contact.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{contact.role}</Badge>
                        <Badge variant="outline">Priority: {contact.priority}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>SMS Delivery Trends</CardTitle>
                <CardDescription>SMS delivery rates over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <TrendingUp className="h-8 w-8 mr-2" />
                  SMS delivery trend chart will be displayed here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Violation Types</CardTitle>
                <CardDescription>Most common violation types triggering SMS</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.topViolationTypes.map((violation, index) => (
                    <div key={violation.violationType} className="flex justify-between items-center">
                      <span className="text-sm">{violation.violationType.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(violation.count / (stats.topViolationTypes[0]?.count || 1)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{violation.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Settings</CardTitle>
              <CardDescription>Configure SMS notification settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="smsEnabled">SMS Notifications</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="retryAttempts">Retry Attempts</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    placeholder="3"
                    min="0"
                    max="10"
                  />
                </div>
                <div>
                  <Label htmlFor="cooldownPeriod">Cooldown Period (minutes)</Label>
                  <Input
                    id="cooldownPeriod"
                    type="number"
                    placeholder="15"
                    min="0"
                    max="1440"
                  />
                </div>
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* SMS Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>SMS Notification Details</DialogTitle>
            <DialogDescription>
              Detailed information about the SMS notification
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number</Label>
                  <p className="text-sm">{selectedNotification.phoneNumber}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedNotification.status)}>
                    {selectedNotification.status}
                  </Badge>
                </div>
                <div>
                  <Label>Message ID</Label>
                  <p className="text-sm font-mono">{selectedNotification.messageId}</p>
                </div>
                <div>
                  <Label>Sent At</Label>
                  <p className="text-sm">{new Date(selectedNotification.sentAt).toLocaleString()}</p>
                </div>
                {selectedNotification.deliveredAt && (
                  <div>
                    <Label>Delivered At</Label>
                    <p className="text-sm">{new Date(selectedNotification.deliveredAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <Label>Retry Count</Label>
                  <p className="text-sm">{selectedNotification.retryCount}</p>
                </div>
              </div>
              
              <div>
                <Label>Message</Label>
                <Textarea
                  value={selectedNotification.message}
                  readOnly
                  className="font-mono text-xs"
                  rows={8}
                />
              </div>
              
              {selectedNotification.errorMessage && (
                <div>
                  <Label>Error Message</Label>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {selectedNotification.errorMessage}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
            <DialogDescription>
              Add a new emergency contact for SMS notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={newContact.phoneNumber}
                onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newContact.role} onValueChange={(value) => setNewContact({ ...newContact, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="emergency">Emergency Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                value={newContact.priority}
                onChange={(e) => setNewContact({ ...newContact, priority: parseInt(e.target.value) })}
                min="1"
                max="10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContact}>
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SMSNotificationDashboard;
