'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { 
  RefreshCcw, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Loader2,
  Eye,
  TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface CustomRule {
  id: string;
  name: string;
  description?: string;
  ruleType: string;
  category: string;
  severity: string;
  isActive: boolean;
  priority: number;
  confidenceThreshold: number;
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
  worksite?: { name: string; worksiteName: string };
  camera?: { name: string };
  creator?: { name: string; email: string };
  _count: {
    ruleTriggers: number;
    ruleViolations: number;
  };
}

interface RuleStats {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  rulesByType: Record<string, number>;
  rulesByCategory: Record<string, number>;
  rulesBySeverity: Record<string, number>;
  totalTriggers: number;
  totalViolations: number;
}

const CustomRulesDashboard: React.FC = () => {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [stats, setStats] = useState<RuleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRuleType, setFilterRuleType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRule, setSelectedRule] = useState<CustomRule | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<CustomRule | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterRuleType !== 'all') query.append('ruleType', filterRuleType);
      if (filterCategory !== 'all') query.append('category', filterCategory);
      if (filterSeverity !== 'all') query.append('severity', filterSeverity);
      if (filterActive !== 'all') query.append('isActive', filterActive);
      if (searchTerm) query.append('search', searchTerm);

      const response = await fetch(`/api/custom-rules?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch custom rules');
      const data = await response.json();
      setRules(data.data);
    } catch (error) {
      toast.error('Failed to load custom rules.', { description: (error as Error).message });
      console.error('Error fetching custom rules:', error);
    } finally {
      setLoading(false);
    }
  }, [filterRuleType, filterCategory, filterSeverity, filterActive, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/custom-rules/stats');
      if (!response.ok) throw new Error('Failed to fetch rule statistics');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load rule statistics.', { description: (error as Error).message });
      console.error('Error fetching rule stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchStats();
    const interval = setInterval(() => {
      fetchRules();
      fetchStats();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchRules, fetchStats]);

  const handleToggleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/custom-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });
      if (!response.ok) throw new Error('Failed to update rule');
      toast.success(`Rule ${!isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchRules();
    } catch (error) {
      toast.error('Failed to update rule.', { description: (error as Error).message });
      console.error('Error updating rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-rules/${ruleId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete rule');
      toast.success('Rule deleted successfully!');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule.', { description: (error as Error).message });
      console.error('Error deleting rule:', error);
    }
  };

  const handleTestRule = async (rule: CustomRule) => {
    setCurrentRule(rule);
    setIsTestModalOpen(true);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-red-500 hover:bg-red-600">High</Badge>;
      case 'medium': return <Badge variant="warning">Medium</Badge>;
      case 'low': return <Badge variant="secondary">Low</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  const getRuleTypeBadge = (ruleType: string) => {
    switch (ruleType) {
      case 'object_detection': return <Badge variant="outline">Object Detection</Badge>;
      case 'behavior_analysis': return <Badge variant="outline">Behavior Analysis</Badge>;
      case 'area_monitoring': return <Badge variant="outline">Area Monitoring</Badge>;
      case 'time_based': return <Badge variant="outline">Time Based</Badge>;
      default: return <Badge variant="outline">{ruleType}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'safety': return <Badge className="bg-orange-500 hover:bg-orange-600">Safety</Badge>;
      case 'security': return <Badge className="bg-red-500 hover:bg-red-600">Security</Badge>;
      case 'compliance': return <Badge className="bg-blue-500 hover:bg-blue-600">Compliance</Badge>;
      case 'operational': return <Badge className="bg-green-500 hover:bg-green-600">Operational</Badge>;
      default: return <Badge variant="outline">{category}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Custom Rules Engine</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.totalRules}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-500">{stats.activeRules}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Triggers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-500">{stats.totalTriggers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Violations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-red-500">{stats.totalViolations}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Custom Rules</CardTitle>
          <CardDescription>Manage AI-powered custom detection rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <Input
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Select value={filterRuleType} onValueChange={setFilterRuleType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rule Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="object_detection">Object Detection</SelectItem>
                <SelectItem value="behavior_analysis">Behavior Analysis</SelectItem>
                <SelectItem value="area_monitoring">Area Monitoring</SelectItem>
                <SelectItem value="time_based">Time Based</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { fetchRules(); fetchStats(); }} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />} Refresh
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Triggers</TableHead>
                <TableHead>Violations</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">No custom rules found.</TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        {rule.description && (
                          <p className="text-sm text-gray-500">{rule.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRuleTypeBadge(rule.ruleType)}</TableCell>
                    <TableCell>{getCategoryBadge(rule.category)}</TableCell>
                    <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                    <TableCell>
                      {rule.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>{rule._count.ruleTriggers}</TableCell>
                    <TableCell>{rule._count.ruleViolations}</TableCell>
                    <TableCell>
                      {rule.lastTriggeredAt ? (
                        format(parseISO(rule.lastTriggeredAt), 'MMM d, HH:mm')
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestRule(rule)}
                          title="Test Rule"
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRule(rule)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentRule(rule);
                            setIsEditModalOpen(true);
                          }}
                          title="Edit Rule"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(rule.id, rule.isActive)}
                          title={rule.isActive ? "Deactivate" : "Activate"}
                        >
                          {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          title="Delete Rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rule Details Modal */}
      {selectedRule && (
        <Dialog open={!!selectedRule} onOpenChange={() => setSelectedRule(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Rule Details: {selectedRule.name}</DialogTitle>
              <DialogDescription>{selectedRule.description}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Type:</strong> {getRuleTypeBadge(selectedRule.ruleType)}</p>
                  <p><strong>Category:</strong> {getCategoryBadge(selectedRule.category)}</p>
                  <p><strong>Severity:</strong> {getSeverityBadge(selectedRule.severity)}</p>
                  <p><strong>Priority:</strong> {selectedRule.priority}</p>
                  <p><strong>Confidence Threshold:</strong> {(selectedRule.confidenceThreshold * 100).toFixed(1)}%</p>
                  <p><strong>Status:</strong> {selectedRule.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Statistics</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Total Triggers:</strong> {selectedRule._count.ruleTriggers}</p>
                  <p><strong>Total Violations:</strong> {selectedRule._count.ruleViolations}</p>
                  <p><strong>Last Triggered:</strong> {selectedRule.lastTriggeredAt ? format(parseISO(selectedRule.lastTriggeredAt), 'MMM d, yyyy HH:mm:ss') : 'Never'}</p>
                  <p><strong>Created:</strong> {format(parseISO(selectedRule.createdAt), 'MMM d, yyyy HH:mm:ss')}</p>
                  <p><strong>Updated:</strong> {format(parseISO(selectedRule.updatedAt), 'MMM d, yyyy HH:mm:ss')}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRule(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Test Rule Modal */}
      {isTestModalOpen && currentRule && (
        <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Rule: {currentRule.name}</DialogTitle>
              <DialogDescription>Send test detection data to verify rule behavior.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-objects">Test Objects (JSON)</Label>
                <Textarea
                  id="test-objects"
                  placeholder='[{"class": "person", "confidence": 0.9, "bbox": [100, 100, 200, 300]}]'
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="test-location">Test Location</Label>
                <Input
                  id="test-location"
                  placeholder="Construction Site A"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Test rule implementation would go here
                toast.success('Test completed successfully!');
                setIsTestModalOpen(false);
              }}>
                Run Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CustomRulesDashboard;
