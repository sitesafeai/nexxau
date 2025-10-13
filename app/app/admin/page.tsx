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
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Users, 
  Database, 
  Server, 
  Shield, 
  Bell,
  Camera,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Edit,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';

interface SystemStatus {
  database: 'healthy' | 'degraded' | 'unhealthy';
  aiDetection: 'healthy' | 'degraded' | 'unhealthy';
  mediaMTX: 'healthy' | 'degraded' | 'unhealthy';
  websocket: 'healthy' | 'degraded' | 'unhealthy';
  notifications: 'healthy' | 'degraded' | 'unhealthy';
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
}

interface SystemConfig {
  general: {
    siteName: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    twoFactorAuth: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    webhookEnabled: boolean;
    defaultRecipients: string[];
  };
  ai: {
    detectionEnabled: boolean;
    confidenceThreshold: number;
    alertThreshold: number;
    modelVersion: string;
  };
  storage: {
    maxFileSize: number;
    retentionPeriod: number;
    backupFrequency: string;
  };
}

const SystemAdministrationPanel: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemData = async () => {
    try {
      const [statusResponse, usersResponse, configResponse] = await Promise.all([
        fetch('/api/admin/system-status'),
        fetch('/api/admin/users'),
        fetch('/api/admin/config')
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSystemStatus(statusData);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }

      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
      }
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchSystemData();
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  const handleConfigUpdate = async (updatedConfig: Partial<SystemConfig>) => {
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig),
      });

      if (response.ok) {
        await fetchSystemData();
        setIsEditingConfig(false);
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

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
          <h1 className="text-3xl font-bold">System Administration</h1>
          <p className="text-gray-600">Manage system settings, users, and monitor system health</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSystemData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* System Status */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              {getStatusIcon(systemStatus.database)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge className={getStatusColor(systemStatus.database)}>
                  {systemStatus.database}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Detection</CardTitle>
              {getStatusIcon(systemStatus.aiDetection)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge className={getStatusColor(systemStatus.aiDetection)}>
                  {systemStatus.aiDetection}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MediaMTX</CardTitle>
              {getStatusIcon(systemStatus.mediaMTX)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge className={getStatusColor(systemStatus.mediaMTX)}>
                  {systemStatus.mediaMTX}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WebSocket</CardTitle>
              {getStatusIcon(systemStatus.websocket)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge className={getStatusColor(systemStatus.websocket)}>
                  {systemStatus.websocket}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Metrics */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.cpuUsage}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${systemStatus.cpuUsage}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.memoryUsage}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${systemStatus.memoryUsage}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.diskUsage}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${systemStatus.diskUsage}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Current system configuration and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uptime:</span>
                    <span className="font-medium">{systemStatus?.uptime || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Users:</span>
                    <span className="font-medium">{users.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Users:</span>
                    <span className="font-medium">
                      {users.filter(u => u.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">System Version:</span>
                    <span className="font-medium">v1.0.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Add New User
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Backup Database
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Restart Services
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{user.role}</Badge>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserAction(user.id, 'suspend')}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserAction(user.id, 'activate')}
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUserAction(user.id, 'delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Configure system settings and parameters</CardDescription>
            </CardHeader>
            <CardContent>
              {config && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="siteName">Site Name</Label>
                        <Input
                          id="siteName"
                          value={config.general.siteName}
                          onChange={(e) => setConfig({
                            ...config,
                            general: { ...config.general, siteName: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={config.general.timezone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Switch
                        checked={config.general.maintenanceMode}
                        onCheckedChange={(checked) => setConfig({
                          ...config,
                          general: { ...config.general, maintenanceMode: checked }
                        })}
                      />
                      <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                        <Input
                          id="sessionTimeout"
                          type="number"
                          value={config.security.sessionTimeout}
                          onChange={(e) => setConfig({
                            ...config,
                            security: { ...config.security, sessionTimeout: parseInt(e.target.value) }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                        <Input
                          id="maxLoginAttempts"
                          type="number"
                          value={config.security.maxLoginAttempts}
                          onChange={(e) => setConfig({
                            ...config,
                            security: { ...config.security, maxLoginAttempts: parseInt(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Switch
                        checked={config.security.twoFactorAuth}
                        onCheckedChange={(checked) => setConfig({
                          ...config,
                          security: { ...config.security, twoFactorAuth: checked }
                        })}
                      />
                      <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">AI Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="confidenceThreshold">Confidence Threshold (%)</Label>
                        <Input
                          id="confidenceThreshold"
                          type="number"
                          value={config.ai.confidenceThreshold}
                          onChange={(e) => setConfig({
                            ...config,
                            ai: { ...config.ai, confidenceThreshold: parseInt(e.target.value) }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                        <Input
                          id="alertThreshold"
                          type="number"
                          value={config.ai.alertThreshold}
                          onChange={(e) => setConfig({
                            ...config,
                            ai: { ...config.ai, alertThreshold: parseInt(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Switch
                        checked={config.ai.detectionEnabled}
                        onCheckedChange={(checked) => setConfig({
                          ...config,
                          ai: { ...config.ai, detectionEnabled: checked }
                        })}
                      />
                      <Label htmlFor="detectionEnabled">AI Detection Enabled</Label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsEditingConfig(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => handleConfigUpdate(config)}>
                      Save Configuration
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>View and manage system logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-1 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
                  <div>2025-10-03 18:30:15 [INFO] System started successfully</div>
                  <div>2025-10-03 18:30:16 [INFO] Database connection established</div>
                  <div>2025-10-03 18:30:17 [INFO] AI detection service initialized</div>
                  <div>2025-10-03 18:30:18 [INFO] MediaMTX server started</div>
                  <div>2025-10-03 18:30:19 [INFO] WebSocket server listening on port 3000</div>
                  <div>2025-10-03 18:35:22 [WARN] High CPU usage detected: 85%</div>
                  <div>2025-10-03 18:40:15 [INFO] User login: admin@nexxau.com</div>
                  <div>2025-10-03 18:45:30 [ERROR] Failed to send notification: SMTP connection timeout</div>
                  <div>2025-10-03 18:46:01 [INFO] Alert rule triggered: Safety violation detected</div>
                  <div>2025-10-03 18:50:15 [INFO] Database backup completed successfully</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemAdministrationPanel;