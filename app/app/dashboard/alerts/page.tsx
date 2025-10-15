'use client';

import React, { useState, useEffect } from 'react';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  conditions: string[];
  actions: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface AlertResponse {
  id: string;
  alertRuleId: string;
  alertRule: AlertRule;
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  assignedTo?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  responseTime?: number;
  resolutionNotes?: string;
  resolutionMethod?: 'manual' | 'automatic' | 'escalated';
  resolutionCategory?: 'false_positive' | 'addressed' | 'monitoring' | 'escalated' | 'other';
  followUpRequired?: boolean;
  followUpDate?: string;
  evidence?: string[];
  witnesses?: string[];
  correctiveActions?: string[];
  preventiveMeasures?: string[];
}

const AlertManagementSystem: React.FC = () => {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertResponses, setAlertResponses] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedAlert, setSelectedAlert] = useState<AlertResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    resolvedBy: '',
    resolutionNotes: '',
    resolutionMethod: 'manual' as const,
    resolutionCategory: 'addressed' as const,
    followUpRequired: false,
    followUpDate: '',
    evidence: [''],
    witnesses: [''],
    correctiveActions: [''],
    preventiveMeasures: ['']
  });

  useEffect(() => {
    fetchAlertData();
    const interval = setInterval(fetchAlertData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAlertData = async () => {
    try {
      const [rulesResponse, responsesResponse] = await Promise.all([
        fetch('/api/alerts/rules'),
        fetch('/api/alerts/responses')
      ]);

      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setAlertRules(rulesData);
      } else {
        // Fallback sample data if API is not available
        setAlertRules([
          {
            id: 'rule-1',
            name: 'Hard Hat Violation',
            description: 'Detects when workers are not wearing hard hats in designated areas',
            severity: 'high' as const,
            isActive: true,
            conditions: ['Person detected without hard hat', 'Location: Construction Zone A', 'Time: 06:00-18:00'],
            actions: ['Send SMS to site manager', 'Log violation', 'Send email notification'],
            createdAt: '2024-01-15T08:00:00Z',
            updatedAt: '2024-01-15T08:00:00Z',
            createdBy: 'admin'
          },
          {
            id: 'rule-2',
            name: 'Unauthorized Access',
            description: 'Monitors restricted areas for unauthorized personnel',
            severity: 'critical' as const,
            isActive: true,
            conditions: ['Person detected in restricted area', 'No authorized badge detected', 'Outside normal hours'],
            actions: ['Immediate SMS alert', 'Sound alarm', 'Notify security'],
            createdAt: '2024-01-10T10:00:00Z',
            updatedAt: '2024-01-10T10:00:00Z',
            createdBy: 'admin'
          },
          {
            id: 'rule-3',
            name: 'Safety Equipment Check',
            description: 'Ensures proper safety equipment usage in high-risk areas',
            severity: 'medium' as const,
            isActive: true,
            conditions: ['Person in high-risk area', 'Missing safety vest or gloves', 'Duration > 5 minutes'],
            actions: ['Send reminder notification', 'Log safety concern', 'Notify supervisor'],
            createdAt: '2024-01-05T14:00:00Z',
            updatedAt: '2024-01-05T14:00:00Z',
            createdBy: 'site-manager'
          }
        ]);
      }

      if (responsesResponse.ok) {
        const responsesData = await responsesResponse.json();
        setAlertResponses(responsesData);
      } else {
        // Fallback sample data if API is not available
        setAlertResponses([
          {
            id: 'alert-1',
            alertRuleId: 'rule-1',
            alertRule: {
              id: 'rule-1',
              name: 'Hard Hat Violation',
              description: 'Detects when workers are not wearing hard hats in designated areas',
              severity: 'high' as const,
              isActive: true,
              conditions: ['Person detected without hard hat'],
              actions: ['Send SMS to site manager'],
              createdAt: '2024-01-15T08:00:00Z',
              updatedAt: '2024-01-15T08:00:00Z',
              createdBy: 'admin'
            },
            status: 'open' as const,
            severity: 'high' as const,
            location: 'Construction Zone A - Building 1',
            description: 'Worker detected without hard hat near scaffolding area',
            assignedTo: 'John Smith',
            createdAt: '2024-01-20T09:30:00Z'
          },
          {
            id: 'alert-2',
            alertRuleId: 'rule-2',
            alertRule: {
              id: 'rule-2',
      name: 'Unauthorized Access',
              description: 'Monitors restricted areas for unauthorized personnel',
              severity: 'critical' as const,
              isActive: true,
              conditions: ['Person detected in restricted area'],
              actions: ['Immediate SMS alert'],
              createdAt: '2024-01-10T10:00:00Z',
              updatedAt: '2024-01-10T10:00:00Z',
              createdBy: 'admin'
            },
            status: 'acknowledged' as const,
            severity: 'critical' as const,
            location: 'Electrical Room - Basement',
            description: 'Unauthorized person detected in restricted electrical room',
            assignedTo: 'Security Team',
            createdAt: '2024-01-20T08:15:00Z',
            acknowledgedAt: '2024-01-20T08:20:00Z',
            acknowledgedBy: 'Security Team Lead'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch alert data:', error);
      // Set fallback data on error
      setAlertRules([
        {
          id: 'rule-1',
          name: 'Hard Hat Violation',
          description: 'Detects when workers are not wearing hard hats in designated areas',
          severity: 'high' as const,
          isActive: true,
          conditions: ['Person detected without hard hat', 'Location: Construction Zone A'],
          actions: ['Send SMS to site manager', 'Log violation'],
          createdAt: '2024-01-15T08:00:00Z',
          updatedAt: '2024-01-15T08:00:00Z',
          createdBy: 'admin'
        }
      ]);
      setAlertResponses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (responseId: string) => {
    setIsProcessing(responseId);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get current user (in a real app, this would come from authentication)
      const currentUser = 'Current User'; // This would be from your auth system
      
      // Update the alert status locally
      setAlertResponses(prev => prev.map(alert => 
        alert.id === responseId 
          ? { 
              ...alert, 
              status: 'acknowledged' as const,
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: currentUser
            }
          : alert
      ));
      
      // Show success message (you could add a toast notification here)
      console.log(`Alert ${responseId} acknowledged successfully by ${currentUser}`);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleResolveAlert = async (responseId: string) => {
    // Open resolution modal instead of directly resolving
    const alert = alertResponses.find(a => a.id === responseId);
    if (alert) {
      setSelectedAlert(alert);
      setIsResolutionModalOpen(true);
    }
  };

  const handleSubmitResolution = async () => {
    if (!selectedAlert) return;
    
    setIsProcessing(selectedAlert.id);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get current user (in a real app, this would come from authentication)
      const currentUser = resolutionData.resolvedBy || 'Current User';
      const now = new Date();
      
      // Update the alert status locally with comprehensive resolution data
      setAlertResponses(prev => prev.map(alert => 
        alert.id === selectedAlert.id 
          ? { 
              ...alert, 
              status: 'resolved' as const,
              resolvedAt: now.toISOString(),
              resolvedBy: currentUser,
              resolutionNotes: resolutionData.resolutionNotes,
              resolutionMethod: resolutionData.resolutionMethod,
              resolutionCategory: resolutionData.resolutionCategory,
              followUpRequired: resolutionData.followUpRequired,
              followUpDate: resolutionData.followUpDate || undefined,
              evidence: resolutionData.evidence.filter(e => e.trim() !== ''),
              witnesses: resolutionData.witnesses.filter(w => w.trim() !== ''),
              correctiveActions: resolutionData.correctiveActions.filter(c => c.trim() !== ''),
              preventiveMeasures: resolutionData.preventiveMeasures.filter(p => p.trim() !== '')
            }
          : alert
      ));
      
      // Show success message
      console.log(`Alert ${selectedAlert.id} resolved successfully by ${currentUser} at ${now.toLocaleString()}`);
      
      // Close modal and reset form
      setIsResolutionModalOpen(false);
      setSelectedAlert(null);
      resetResolutionForm();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    } finally {
      setIsProcessing(null);
    }
  };

  const resetResolutionForm = () => {
    setResolutionData({
      resolvedBy: '',
      resolutionNotes: '',
      resolutionMethod: 'manual',
      resolutionCategory: 'addressed',
      followUpRequired: false,
      followUpDate: '',
      evidence: [''],
      witnesses: [''],
      correctiveActions: [''],
      preventiveMeasures: ['']
    });
  };

  const handleViewAlertDetails = (alert: AlertResponse) => {
    setSelectedAlert(alert);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedAlert(null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'acknowledged': return 'text-blue-600 bg-blue-100';
      case 'investigating': return 'text-yellow-600 bg-yellow-100';
      case 'open': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredResponses = alertResponses.filter(response => {
    const matchesSearch = response.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || response.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const stats = {
    total: alertResponses.length,
    open: alertResponses.filter(r => r.status === 'open').length,
    acknowledged: alertResponses.filter(r => r.status === 'acknowledged').length,
    investigating: alertResponses.filter(r => r.status === 'investigating').length,
    resolved: alertResponses.filter(r => r.status === 'resolved').length,
    critical: alertResponses.filter(r => r.severity === 'critical').length,
    high: alertResponses.filter(r => r.severity === 'high').length,
    medium: alertResponses.filter(r => r.severity === 'medium').length,
    low: alertResponses.filter(r => r.severity === 'low').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 p-6">
        <div className="space-y-6">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">SiteSafe</span>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            <a 
              href="/dashboard" 
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              <span>Dashboard</span>
            </a>

            <a 
              href="/dashboard/cameras" 
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Cameras</span>
            </a>

            <a 
              href="/dashboard/analytics" 
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </a>

            <div className="bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-3 text-blue-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Alert Management</span>
              </div>
            </div>

            <a 
              href="/dashboard/compliance" 
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Compliance</span>
            </a>

            <a 
              href="/dashboard/custom-rules" 
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Custom Rules</span>
            </a>

            <a 
              href="/dashboard/errors" 
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Error Dashboard</span>
            </a>

            <a 
              href="/dashboard/sms-notifications" 
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>SMS Notifications</span>
            </a>
          </nav>

          {/* Quick Stats */}
          <div className="mt-8 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Quick Stats</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Active Alerts</span>
                <span className="text-red-400 font-medium">{stats.open}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Critical</span>
                <span className="text-red-500 font-medium">{stats.critical}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Resolved</span>
                <span className="text-green-400 font-medium">{stats.resolved}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-8 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Alert Management</h1>
            <p className="text-gray-300 text-lg">Monitor and manage safety alerts and incidents</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-300">Live Monitoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 p-6 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-100">Total Alerts</h3>
                <p className="text-4xl font-bold text-white mt-2">{stats.total}</p>
                <p className="text-sm text-blue-200 mt-1">{stats.open} currently open</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 backdrop-blur-sm border border-red-500/30 p-6 rounded-xl shadow-lg hover:shadow-red-500/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-100">Critical</h3>
                <p className="text-4xl font-bold text-white mt-2">{stats.critical}</p>
                <p className="text-sm text-red-200 mt-1">Requires immediate attention</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm border border-green-500/30 p-6 rounded-xl shadow-lg hover:shadow-green-500/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-100">Resolved</h3>
                <p className="text-4xl font-bold text-white mt-2">{stats.resolved}</p>
                <p className="text-sm text-green-200 mt-1">Successfully resolved</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 p-6 rounded-xl shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-100">Response Rate</h3>
                <p className="text-4xl font-bold text-white mt-2">
                  {stats.total > 0 ? Math.round((stats.acknowledged + stats.investigating + stats.resolved) / stats.total * 100) : 0}%
                </p>
                <p className="text-sm text-purple-200 mt-1">Alerts with response</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-1">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'alerts'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Active Alerts
            </button>
          <button
              onClick={() => setActiveTab('rules')}
              className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'rules'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Alert Rules
          </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl shadow-lg">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search alerts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-end">
              <button 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setSeverityFilter('all');
                    }}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all duration-200 font-medium"
                  >
                    Clear Filters
              </button>
                </div>
              </div>
            </div>
            
            {/* Alert List */}
            <div className="space-y-4">
              {filteredResponses.map((alert) => (
                <div key={alert.id} className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`w-4 h-4 rounded-full mt-1 shadow-lg ${getSeverityColor(alert.severity).split(' ')[0]} ${
                        alert.severity === 'critical' ? 'animate-pulse' : ''
                      }`} />
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-white text-lg">{alert.alertRule.name}</h3>
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getSeverityColor(alert.severity)} shadow-sm`}>
                            {alert.severity.toUpperCase()}
                        </span>
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(alert.status)} shadow-sm`}>
                            {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                          </span>
                      </div>
                        <p className="text-gray-300 mb-4 text-base leading-relaxed">{alert.description}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">{alert.location}</span>
                        </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">{new Date(alert.createdAt).toLocaleString()}</span>
                        </div>
                          {alert.assignedTo && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                              <span className="font-medium">{alert.assignedTo}</span>
                        </div>
                          )}
                      </div>
                    </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {alert.status === 'open' && (
                      <button 
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          disabled={isProcessing === alert.id}
                          className={`px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25 ${
                            isProcessing === alert.id ? 'opacity-75 cursor-not-allowed' : ''
                          }`}
                        >
                          {isProcessing === alert.id ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Processing...
                            </div>
                          ) : (
                            'Acknowledge'
                          )}
                      </button>
                      )}
                      {alert.status === 'acknowledged' && (
                      <button 
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={isProcessing === alert.id}
                          className={`px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25 ${
                            isProcessing === alert.id ? 'opacity-75 cursor-not-allowed' : ''
                          }`}
                        >
                          {isProcessing === alert.id ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Processing...
                            </div>
                          ) : (
                            'Resolve'
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleViewAlertDetails(alert)}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="grid gap-6">
              {alertRules.map((rule) => (
                <div key={rule.id} className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-white text-lg">{rule.name}</h3>
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getSeverityColor(rule.severity)} shadow-sm`}>
                          {rule.severity.toUpperCase()}
                        </span>
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                          rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
              </div>
                      <p className="text-gray-300 mb-6 text-base leading-relaxed">{rule.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-700/30 p-4 rounded-lg">
                          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Conditions
                          </h4>
                          <ul className="text-sm text-gray-300 space-y-2">
                            {rule.conditions.map((condition, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>{condition}</span>
                              </li>
                            ))}
                          </ul>
            </div>
                        <div className="bg-gray-700/30 p-4 rounded-lg">
                          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Actions
                          </h4>
                          <ul className="text-sm text-gray-300 space-y-2">
                            {rule.actions.map((action, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
              ))}
              </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-white">Alert History</h3>
              </div>
              <p className="text-gray-300 mb-6 text-base">Complete history of all alerts and responses</p>
              <div className="space-y-4">
                {alertResponses.map((alert) => (
                  <div 
                    key={alert.id} 
                    className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600/30 hover:bg-gray-700/70 transition-colors cursor-pointer"
                    onClick={() => handleViewAlertDetails(alert)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-4 h-4 rounded-full shadow-lg ${getSeverityColor(alert.severity).split(' ')[0]}`} />
                          <div>
                        <div className="font-medium text-white">{alert.alertRule.name}</div>
                        <div className="text-sm text-gray-400">{alert.location}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(alert.createdAt).toLocaleString()}
                          </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getSeverityColor(alert.severity)} shadow-sm`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(alert.status)} shadow-sm`}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                        </div>
                      </div>
                    ))}
              </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

      {/* Alert Detail Modal */}
      {isDetailModalOpen && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${getSeverityColor(selectedAlert.severity).split(' ')[0]}`} />
                  <h2 className="text-2xl font-bold text-white">Alert Details</h2>
              </div>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
            </div>

              {/* Alert Information */}
          <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-700/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Alert Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Alert ID</label>
                      <p className="text-white">{selectedAlert.id}</p>
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Rule Name</label>
                      <p className="text-white">{selectedAlert.alertRule.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Severity</label>
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getSeverityColor(selectedAlert.severity)}`}>
                        {selectedAlert.severity.toUpperCase()}
                      </span>
                  </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(selectedAlert.status)}`}>
                        {selectedAlert.status.charAt(0).toUpperCase() + selectedAlert.status.slice(1)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                      <p className="text-white">{selectedAlert.location}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Assigned To</label>
                      <p className="text-white">{selectedAlert.assignedTo || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-700/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedAlert.description}</p>
                </div>

                {/* Rule Details */}
                <div className="bg-gray-700/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Rule Details</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-white mb-2">Conditions</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {selectedAlert.alertRule.conditions.map((condition, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{condition}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-2">Actions</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {selectedAlert.alertRule.actions.map((action, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-400 mt-1">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
              </div>
            </div>

                {/* Timeline */}
                <div className="bg-gray-700/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <div>
                        <p className="text-sm font-medium text-white">Alert Created</p>
                        <p className="text-xs text-gray-400">{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                    {selectedAlert.acknowledgedAt && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <div>
                          <p className="text-sm font-medium text-white">Alert Acknowledged</p>
                          <p className="text-xs text-gray-400">
                            {new Date(selectedAlert.acknowledgedAt).toLocaleString()}
                            {selectedAlert.acknowledgedBy && (
                              <span className="block text-gray-500">by {selectedAlert.acknowledgedBy}</span>
                            )}
                          </p>
                </div>
              </div>
                    )}
                    {selectedAlert.resolvedAt && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-white">Alert Resolved</p>
                          <p className="text-xs text-gray-400">
                            {new Date(selectedAlert.resolvedAt).toLocaleString()}
                            {selectedAlert.resolvedBy && (
                              <span className="block text-gray-500">by {selectedAlert.resolvedBy}</span>
                            )}
                          </p>
            </div>
          </div>
        )}
                  </div>
                </div>

                {/* Resolution Details */}
                {selectedAlert.status === 'resolved' && (
                  <div className="bg-gray-700/30 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-3">Resolution Details</h3>
                    <div className="space-y-4">
                      {selectedAlert.resolutionNotes && (
                <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Resolution Notes</label>
                          <p className="text-gray-300 leading-relaxed">{selectedAlert.resolutionNotes}</p>
                  </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedAlert.resolutionMethod && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Resolution Method</label>
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {selectedAlert.resolutionMethod.charAt(0).toUpperCase() + selectedAlert.resolutionMethod.slice(1)}
                            </span>
                </div>
                        )}
                        {selectedAlert.resolutionCategory && (
                  <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Resolution Category</label>
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              {selectedAlert.resolutionCategory.replace('_', ' ').charAt(0).toUpperCase() + selectedAlert.resolutionCategory.replace('_', ' ').slice(1)}
                            </span>
                          </div>
                        )}
                        </div>
                      {selectedAlert.followUpRequired && selectedAlert.followUpDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Follow-up Required</label>
                          <p className="text-yellow-300">{new Date(selectedAlert.followUpDate).toLocaleDateString()}</p>
                    </div>
                      )}
                  </div>
                  </div>
                )}

                {/* Evidence & Actions */}
                {selectedAlert.status === 'resolved' && (selectedAlert.evidence?.length || selectedAlert.correctiveActions?.length) && (
                  <div className="bg-gray-700/30 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-3">Resolution Actions</h3>
                    <div className="space-y-4">
                      {selectedAlert.evidence && selectedAlert.evidence.length > 0 && (
                  <div>
                          <h4 className="font-medium text-white mb-2">Evidence Collected</h4>
                          <ul className="text-sm text-gray-300 space-y-1">
                            {selectedAlert.evidence.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                          </div>
                      )}
                      {selectedAlert.correctiveActions && selectedAlert.correctiveActions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-white mb-2">Corrective Actions Taken</h4>
                          <ul className="text-sm text-gray-300 space-y-1">
                            {selectedAlert.correctiveActions.map((action, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedAlert.preventiveMeasures && selectedAlert.preventiveMeasures.length > 0 && (
                        <div>
                          <h4 className="font-medium text-white mb-2">Preventive Measures</h4>
                          <ul className="text-sm text-gray-300 space-y-1">
                            {selectedAlert.preventiveMeasures.map((measure, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-purple-400 mt-1">•</span>
                                <span>{measure}</span>
                              </li>
                            ))}
                          </ul>
                    </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
                  <button
                    onClick={closeDetailModal}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {selectedAlert.status === 'open' && (
                    <button
                      onClick={() => {
                        handleAcknowledgeAlert(selectedAlert.id);
                        closeDetailModal();
                      }}
                      disabled={isProcessing === selectedAlert.id}
                      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${
                        isProcessing === selectedAlert.id ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                    >
                      {isProcessing === selectedAlert.id ? 'Processing...' : 'Acknowledge'}
                    </button>
                  )}
                  {selectedAlert.status === 'acknowledged' && (
                    <button
                      onClick={() => {
                        handleResolveAlert(selectedAlert.id);
                        closeDetailModal();
                      }}
                      disabled={isProcessing === selectedAlert.id}
                      className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors ${
                        isProcessing === selectedAlert.id ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                    >
                      {isProcessing === selectedAlert.id ? 'Processing...' : 'Resolve'}
                    </button>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Resolution Modal */}
      {isResolutionModalOpen && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${getSeverityColor(selectedAlert.severity).split(' ')[0]}`} />
                  <h2 className="text-2xl font-bold text-white">Resolve Alert</h2>
                </div>
                <button 
                  onClick={() => {
                    setIsResolutionModalOpen(false);
                    setSelectedAlert(null);
                    resetResolutionForm();
                  }}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Alert Summary */}
              <div className="bg-gray-700/30 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Alert Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-400">Alert ID</p>
                    <p className="text-white font-medium">{selectedAlert.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Rule</p>
                    <p className="text-white font-medium">{selectedAlert.alertRule.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Location</p>
                    <p className="text-white font-medium">{selectedAlert.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Severity</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getSeverityColor(selectedAlert.severity)}`}>
                      {selectedAlert.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resolution Form */}
              <div className="space-y-6">
                {/* Basic Resolution Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Resolved By *</label>
                  <input
                    type="text"
                      value={resolutionData.resolvedBy}
                      onChange={(e) => setResolutionData(prev => ({ ...prev, resolvedBy: e.target.value }))}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                  />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Resolution Method</label>
                    <select
                      value={resolutionData.resolutionMethod}
                      onChange={(e) => setResolutionData(prev => ({ ...prev, resolutionMethod: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="manual">Manual Resolution</option>
                      <option value="automatic">Automatic Resolution</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                </div>

                {/* Resolution Category */}
                  <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Resolution Category</label>
                    <select
                    value={resolutionData.resolutionCategory}
                    onChange={(e) => setResolutionData(prev => ({ ...prev, resolutionCategory: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="addressed">Issue Addressed</option>
                    <option value="false_positive">False Positive</option>
                    <option value="monitoring">Under Monitoring</option>
                    <option value="escalated">Escalated to Higher Authority</option>
                    <option value="other">Other</option>
                    </select>
                  </div>

                {/* Resolution Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Resolution Notes *</label>
                  <textarea
                    value={resolutionData.resolutionNotes}
                    onChange={(e) => setResolutionData(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                    placeholder="Describe how the alert was resolved and what actions were taken..."
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Follow-up */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="followUpRequired"
                      checked={resolutionData.followUpRequired}
                      onChange={(e) => setResolutionData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="followUpRequired" className="text-sm font-medium text-gray-300">
                      Follow-up Required
                    </label>
                  </div>
                  {resolutionData.followUpRequired && (
                <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Follow-up Date</label>
                  <input
                        type="date"
                        value={resolutionData.followUpDate}
                        onChange={(e) => setResolutionData(prev => ({ ...prev, followUpDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                  </div>
                  )}
                </div>

                {/* Evidence Collection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Evidence Collected</label>
                  {resolutionData.evidence.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newEvidence = [...resolutionData.evidence];
                          newEvidence[index] = e.target.value;
                          setResolutionData(prev => ({ ...prev, evidence: newEvidence }));
                        }}
                        placeholder="Describe evidence collected..."
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {resolutionData.evidence.length > 1 && (
                  <button 
                          onClick={() => {
                            const newEvidence = resolutionData.evidence.filter((_, i) => i !== index);
                            setResolutionData(prev => ({ ...prev, evidence: newEvidence }));
                          }}
                          className="px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                  </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => setResolutionData(prev => ({ ...prev, evidence: [...prev.evidence, ''] }))}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Add Evidence
                  </button>
                </div>

                {/* Corrective Actions */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Corrective Actions Taken</label>
                  {resolutionData.correctiveActions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={action}
                        onChange={(e) => {
                          const newActions = [...resolutionData.correctiveActions];
                          newActions[index] = e.target.value;
                          setResolutionData(prev => ({ ...prev, correctiveActions: newActions }));
                        }}
                        placeholder="Describe corrective action taken..."
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {resolutionData.correctiveActions.length > 1 && (
                <button 
                          onClick={() => {
                            const newActions = resolutionData.correctiveActions.filter((_, i) => i !== index);
                            setResolutionData(prev => ({ ...prev, correctiveActions: newActions }));
                          }}
                          className="px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                      )}
              </div>
                  ))}
                  <button
                    onClick={() => setResolutionData(prev => ({ ...prev, correctiveActions: [...prev.correctiveActions, ''] }))}
                    className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Add Action
                  </button>
                </div>

                {/* Preventive Measures */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Preventive Measures</label>
                  {resolutionData.preventiveMeasures.map((measure, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={measure}
                        onChange={(e) => {
                          const newMeasures = [...resolutionData.preventiveMeasures];
                          newMeasures[index] = e.target.value;
                          setResolutionData(prev => ({ ...prev, preventiveMeasures: newMeasures }));
                        }}
                        placeholder="Describe preventive measure implemented..."
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {resolutionData.preventiveMeasures.length > 1 && (
                        <button
                          onClick={() => {
                            const newMeasures = resolutionData.preventiveMeasures.filter((_, i) => i !== index);
                            setResolutionData(prev => ({ ...prev, preventiveMeasures: newMeasures }));
                          }}
                          className="px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                        </div>
                      ))}
                  <button
                    onClick={() => setResolutionData(prev => ({ ...prev, preventiveMeasures: [...prev.preventiveMeasures, ''] }))}
                    className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Add Measure
                  </button>
              </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-600">
                <button 
                    onClick={() => {
                      setIsResolutionModalOpen(false);
                      setSelectedAlert(null);
                      resetResolutionForm();
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                    onClick={handleSubmitResolution}
                    disabled={isProcessing === selectedAlert.id || !resolutionData.resolvedBy.trim() || !resolutionData.resolutionNotes.trim()}
                    className={`px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium ${
                      isProcessing === selectedAlert.id || !resolutionData.resolvedBy.trim() || !resolutionData.resolutionNotes.trim()
                        ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isProcessing === selectedAlert.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Resolving...
                      </div>
                    ) : (
                      'Resolve Alert'
                    )}
                </button>
              </div>
            </div>
          </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default AlertManagementSystem;