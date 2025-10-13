'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Users, 
  Camera,
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

interface SafetyMetrics {
  totalIncidents: number;
  incidentsToday: number;
  incidentsThisWeek: number;
  incidentsThisMonth: number;
  safetyScore: number;
  complianceRate: number;
  activeAlerts: number;
  resolvedAlerts: number;
  averageResponseTime: number;
  totalCameras: number;
  activeCameras: number;
  totalUsers: number;
  activeUsers: number;
}

interface IncidentData {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
  description: string;
  assignedTo?: string;
  resolutionTime?: number;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

const SafetyAnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SafetyMetrics | null>(null);
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`/api/analytics/safety?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setIncidents(data.incidents);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600';
      case 'investigating': return 'text-yellow-600';
      case 'open': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Mock data for demonstration
  const mockMetrics: SafetyMetrics = {
    totalIncidents: 47,
    incidentsToday: 3,
    incidentsThisWeek: 12,
    incidentsThisMonth: 28,
    safetyScore: 87,
    complianceRate: 94,
    activeAlerts: 5,
    resolvedAlerts: 42,
    averageResponseTime: 12.5,
    totalCameras: 24,
    activeCameras: 22,
    totalUsers: 156,
    activeUsers: 89
  };

  const mockIncidents: IncidentData[] = [
    {
      id: 'INC-001',
      type: 'Safety Violation',
      severity: 'high',
      location: 'Building A - Floor 3',
      timestamp: '2025-10-03T10:30:00Z',
      status: 'investigating',
      description: 'Worker not wearing hard hat in construction zone',
      assignedTo: 'John Smith'
    },
    {
      id: 'INC-002',
      type: 'Equipment Malfunction',
      severity: 'medium',
      location: 'Building B - Equipment Room',
      timestamp: '2025-10-03T09:15:00Z',
      status: 'resolved',
      description: 'Crane safety system alert',
      assignedTo: 'Sarah Johnson',
      resolutionTime: 45
    },
    {
      id: 'INC-003',
      type: 'Environmental Hazard',
      severity: 'critical',
      location: 'Building C - Basement',
      timestamp: '2025-10-03T08:45:00Z',
      status: 'open',
      description: 'Gas leak detected in basement area'
    }
  ];

  const incidentTrendData = [
    { name: 'Mon', incidents: 4, resolved: 3 },
    { name: 'Tue', incidents: 2, resolved: 5 },
    { name: 'Wed', incidents: 6, resolved: 4 },
    { name: 'Thu', incidents: 3, resolved: 6 },
    { name: 'Fri', incidents: 5, resolved: 3 },
    { name: 'Sat', incidents: 1, resolved: 2 },
    { name: 'Sun', incidents: 2, resolved: 4 }
  ];

  const severityDistribution = [
    { name: 'Critical', value: 3, color: '#ef4444' },
    { name: 'High', value: 8, color: '#f97316' },
    { name: 'Medium', value: 15, color: '#eab308' },
    { name: 'Low', value: 21, color: '#22c55e' }
  ];

  const complianceData = [
    { name: 'Jan', compliance: 89 },
    { name: 'Feb', compliance: 92 },
    { name: 'Mar', compliance: 88 },
    { name: 'Apr', compliance: 94 },
    { name: 'May', compliance: 91 },
    { name: 'Jun', compliance: 96 },
    { name: 'Jul', compliance: 93 },
    { name: 'Aug', compliance: 95 },
    { name: 'Sep', compliance: 97 },
    { name: 'Oct', compliance: 94 }
  ];

  const currentMetrics = metrics || mockMetrics;
  const currentIncidents = incidents.length > 0 ? incidents : mockIncidents;

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
          <h1 className="text-3xl font-bold">Safety Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time safety monitoring and incident analysis</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={timeRange === '24h' ? 'default' : 'outline'}
            onClick={() => setTimeRange('24h')}
          >
            24H
          </Button>
          <Button 
            variant={timeRange === '7d' ? 'default' : 'outline'}
            onClick={() => setTimeRange('7d')}
          >
            7D
          </Button>
          <Button 
            variant={timeRange === '30d' ? 'default' : 'outline'}
            onClick={() => setTimeRange('30d')}
          >
            30D
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{currentMetrics.safetyScore}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +2.1% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{currentMetrics.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {currentMetrics.resolvedAlerts} resolved this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{currentMetrics.complianceRate}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +1.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{currentMetrics.averageResponseTime}m</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline h-3 w-3 mr-1" />
              -3.2m from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Incident Trends</CardTitle>
                <CardDescription>Daily incidents vs resolved</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={incidentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="incidents" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="resolved" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>Current incident severity breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
              <CardDescription>Latest safety incidents and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentIncidents.map((incident) => (
                  <div key={incident.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`} />
                      <div>
                        <div className="font-medium">{incident.type}</div>
                        <div className="text-sm text-gray-600">{incident.location}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(incident.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {incident.severity}
                      </Badge>
                      <Badge className={getStatusColor(incident.status)}>
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>Monthly compliance rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={complianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[80, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="compliance" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Camera and user activity status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Active Cameras</span>
                    <span className="font-bold">{currentMetrics.activeCameras}/{currentMetrics.totalCameras}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active Users</span>
                    <span className="font-bold">{currentMetrics.activeUsers}/{currentMetrics.totalUsers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>System Uptime</span>
                    <span className="font-bold text-green-600">99.8%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common safety management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Create New Alert
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Camera className="mr-2 h-4 w-4" />
                    Camera Settings
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Activity className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SafetyAnalyticsDashboard;