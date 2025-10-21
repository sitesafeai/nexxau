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
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Search,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Settings,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Server,
  Shield,
  Zap,
  AlertCircle,
  Info,
  Bug,
  Wrench
} from 'lucide-react';

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'validation' | 'database' | 'external' | 'system' | 'business';
  userId?: string;
  user?: {
    name: string;
    email: string;
  };
  endpoint?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ErrorStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  unresolved: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  averageResolutionTime: number;
  topCategories: Array<{ category: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  errorTrend: Array<{ date: string; count: number }>;
}

interface RecoveryWorkflow {
  id: string;
  name: string;
  status: 'active' | 'running' | 'completed' | 'failed';
  progress: number;
  steps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    message?: string;
  }>;
  startTime: Date;
  endTime?: Date;
}

const ErrorDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [recoveryWorkflows, setRecoveryWorkflows] = useState<RecoveryWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchErrorData();
    const interval = setInterval(fetchErrorData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchErrorData = async () => {
    try {
      const [errorsResponse, statsResponse, workflowsResponse] = await Promise.all([
        fetch(`/api/errors?range=${timeRange}`),
        fetch('/api/errors/stats'),
        fetch('/api/errors/recovery-workflows')
      ]);

      if (errorsResponse.ok) {
        const errorsData = await errorsResponse.json();
        setErrors(errorsData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (workflowsResponse.ok) {
        const workflowsData = await workflowsResponse.json();
        setRecoveryWorkflows(workflowsData);
      }
    } catch (error) {
      console.error('Failed to fetch error data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveError = async (errorId: string) => {
    try {
      const response = await fetch(`/api/errors/${errorId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolvedBy: 'current-user' })
      });

      if (response.ok) {
        await fetchErrorData();
      }
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  };

  const handleTriggerRecovery = async (errorId: string) => {
    try {
      const response = await fetch(`/api/errors/${errorId}/trigger-recovery`, {
        method: 'POST'
      });

      if (response.ok) {
        await fetchErrorData();
      }
    } catch (error) {
      console.error('Failed to trigger recovery:', error);
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'authentication': return <Shield className="h-4 w-4" />;
      case 'external': return <Server className="h-4 w-4" />;
      case 'system': return <Activity className="h-4 w-4" />;
      case 'business': return <AlertCircle className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getStatusColor = (resolved: boolean) => {
    return resolved ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const filteredErrors = errors.filter(error => {
    const matchesSearch = error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.endpoint?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || error.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || error.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'resolved' && error.resolved) ||
                         (statusFilter === 'unresolved' && !error.resolved);
    
    return matchesSearch && matchesSeverity && matchesCategory && matchesStatus;
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
          <h1 className="text-3xl font-bold">Error Monitoring Dashboard</h1>
          <p className="text-gray-600">Monitor and manage system errors and recovery workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchErrorData}>
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
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unresolved} unresolved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">
                {stats.averageResolutionTime}m avg resolution
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
              <p className="text-xs text-muted-foreground">
                {stats.thisWeek} this week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="recovery">Recovery Workflows</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search errors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="unresolved">Unresolved</SelectItem>
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

          {/* Error List */}
          <div className="space-y-4">
            {filteredErrors.map((error) => (
              <Card key={error.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(error.category)}
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(error.severity).split(' ')[0]}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{error.message}</h3>
                          <Badge className={getSeverityColor(error.severity)}>
                            {error.severity}
                          </Badge>
                          <Badge variant="outline">
                            {error.category}
                          </Badge>
                          <Badge className={getStatusColor(error.resolved)}>
                            {error.resolved ? 'Resolved' : 'Unresolved'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">
                          {error.endpoint && (
                            <span className="text-sm">
                              <strong>Endpoint:</strong> {error.method} {error.endpoint}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(error.createdAt).toLocaleString()}
                          </div>
                          {error.user && (
                            <div className="flex items-center gap-1">
                              <span>User: {error.user.name}</span>
                            </div>
                          )}
                          {error.ipAddress && (
                            <div className="flex items-center gap-1">
                              <span>IP: {error.ipAddress}</span>
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
                          setSelectedError(error);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!error.resolved && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleResolveError(error.id)}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTriggerRecovery(error.id)}
                          >
                            <Wrench className="mr-1 h-4 w-4" />
                            Recover
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Workflows</CardTitle>
              <CardDescription>Active and completed recovery workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recoveryWorkflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <p className="text-sm text-gray-600">ID: {workflow.id}</p>
                      </div>
                      <Badge variant={
                        workflow.status === 'completed' ? 'default' :
                        workflow.status === 'failed' ? 'destructive' :
                        workflow.status === 'running' ? 'secondary' : 'outline'
                      }>
                        {workflow.status}
                      </Badge>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{workflow.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${workflow.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {workflow.steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            step.status === 'completed' ? 'bg-green-500' :
                            step.status === 'failed' ? 'bg-red-500' :
                            step.status === 'running' ? 'bg-blue-500' : 'bg-gray-300'
                          }`} />
                          <span className="text-sm">{step.name}</span>
                          {step.message && (
                            <span className="text-xs text-gray-500">- {step.message}</span>
                          )}
                        </div>
                      ))}
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
                <CardTitle>Error Trends</CardTitle>
                <CardDescription>Error frequency over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <TrendingUp className="h-8 w-8 mr-2" />
                  Error trend chart will be displayed here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Most common error categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.topCategories.map((category, index) => (
                    <div key={category.category} className="flex justify-between items-center">
                      <span className="text-sm">{category.category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(category.count / (stats.topCategories[0]?.count || 1)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{category.count}</span>
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
              <CardTitle>Error Handling Settings</CardTitle>
              <CardDescription>Configure error handling and recovery settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="autoRecovery">Auto Recovery</Label>
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
                  <Label htmlFor="notificationThreshold">Notification Threshold</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select threshold" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical Only</SelectItem>
                      <SelectItem value="high">High and Critical</SelectItem>
                      <SelectItem value="medium">Medium and Above</SelectItem>
                      <SelectItem value="all">All Errors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="escalationDelay">Escalation Delay (minutes)</Label>
                  <Input
                    id="escalationDelay"
                    type="number"
                    placeholder="30"
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

      {/* Error Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected error
            </DialogDescription>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Severity</Label>
                  <Badge className={getSeverityColor(selectedError.severity)}>
                    {selectedError.severity}
                  </Badge>
                </div>
                <div>
                  <Label>Category</Label>
                  <Badge variant="outline">{selectedError.category}</Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedError.resolved)}>
                    {selectedError.resolved ? 'Resolved' : 'Unresolved'}
                  </Badge>
                </div>
                <div>
                  <Label>Created At</Label>
                  <p className="text-sm">{new Date(selectedError.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <Label>Message</Label>
                <p className="text-sm bg-gray-100 p-2 rounded">{selectedError.message}</p>
              </div>
              
              {selectedError.stack && (
                <div>
                  <Label>Stack Trace</Label>
                  <Textarea
                    value={selectedError.stack}
                    readOnly
                    className="font-mono text-xs"
                    rows={10}
                  />
                </div>
              )}
              
              {selectedError.metadata && (
                <div>
                  <Label>Metadata</Label>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedError && !selectedError.resolved && (
              <Button onClick={() => {
                handleResolveError(selectedError.id);
                setIsDetailsOpen(false);
              }}>
                Resolve Error
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ErrorDashboard;
