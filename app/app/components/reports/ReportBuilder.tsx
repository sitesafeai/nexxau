'use client';

import { useState, useEffect } from 'react';

interface Worksite {
  id: string;
  name: string;
}

interface ReportBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  worksites: Worksite[];
  initialTemplate?: any;
  onSave: (spec: any) => Promise<void>;
}

// Available fields by entity
const ENTITY_FIELDS: Record<string, { id: string; label: string; type: string }[]> = {
  ALERT: [
    { id: 'id', label: 'Alert ID', type: 'string' },
    { id: 'title', label: 'Title', type: 'string' },
    { id: 'description', label: 'Description', type: 'string' },
    { id: 'severity', label: 'Severity', type: 'enum' },
    { id: 'status', label: 'Status', type: 'enum' },
    { id: 'createdAt', label: 'Created At', type: 'datetime' },
    { id: 'resolvedAt', label: 'Resolved At', type: 'datetime' },
    { id: 'camera.name', label: 'Camera Name', type: 'string' },
    { id: 'worksite.name', label: 'Worksite Name', type: 'string' },
    { id: 'rule.name', label: 'Rule Name', type: 'string' },
    { id: 'confidence', label: 'Confidence', type: 'number' },
  ],
  INCIDENT: [
    { id: 'id', label: 'Incident ID', type: 'string' },
    { id: 'title', label: 'Title', type: 'string' },
    { id: 'description', label: 'Description', type: 'string' },
    { id: 'severity', label: 'Severity', type: 'enum' },
    { id: 'status', label: 'Status', type: 'enum' },
    { id: 'createdAt', label: 'Created At', type: 'datetime' },
    { id: 'resolvedAt', label: 'Resolved At', type: 'datetime' },
    { id: 'ownerId', label: 'Owner ID', type: 'string' },
    { id: 'resolutionType', label: 'Resolution Type', type: 'string' },
  ],
  CAMERA: [
    { id: 'id', label: 'Camera ID', type: 'string' },
    { id: 'name', label: 'Name', type: 'string' },
    { id: 'status', label: 'Status', type: 'enum' },
    { id: 'enabled', label: 'Enabled', type: 'boolean' },
    { id: 'aiEnabled', label: 'AI Enabled', type: 'boolean' },
    { id: 'worksite.name', label: 'Worksite', type: 'string' },
    { id: 'lastTestAt', label: 'Last Test', type: 'datetime' },
    { id: 'lastTestOk', label: 'Test OK', type: 'boolean' },
  ],
  USER: [
    { id: 'id', label: 'User ID', type: 'string' },
    { id: 'name', label: 'Name', type: 'string' },
    { id: 'email', label: 'Email', type: 'string' },
    { id: 'role', label: 'Role', type: 'enum' },
    { id: 'lastLogin', label: 'Last Login', type: 'datetime' },
    { id: 'createdAt', label: 'Created At', type: 'datetime' },
  ],
  DETECTION: [
    { id: 'id', label: 'Detection ID', type: 'string' },
    { id: 'timestamp', label: 'Timestamp', type: 'datetime' },
    { id: 'camera.name', label: 'Camera', type: 'string' },
    { id: 'confidence', label: 'Confidence', type: 'number' },
    { id: 'objectType', label: 'Object Type', type: 'string' },
  ],
  AUDIT: [
    { id: 'id', label: 'Log ID', type: 'string' },
    { id: 'action', label: 'Action', type: 'string' },
    { id: 'entity', label: 'Entity Type', type: 'string' },
    { id: 'entityId', label: 'Entity ID', type: 'string' },
    { id: 'user.name', label: 'User', type: 'string' },
    { id: 'createdAt', label: 'Timestamp', type: 'datetime' },
    { id: 'ipAddress', label: 'IP Address', type: 'string' },
  ],
};

const AGGREGATION_TYPES = [
  { id: 'count', label: 'Count' },
  { id: 'sum', label: 'Sum' },
  { id: 'avg', label: 'Average' },
  { id: 'min', label: 'Minimum' },
  { id: 'max', label: 'Maximum' },
];

const GROUP_BY_OPTIONS = [
  { id: 'date', label: 'Date' },
  { id: 'camera.name', label: 'Camera' },
  { id: 'worksite.name', label: 'Worksite' },
  { id: 'severity', label: 'Severity' },
  { id: 'status', label: 'Status' },
  { id: 'rule.name', label: 'Rule' },
];

export default function ReportBuilder({
  isOpen,
  onClose,
  worksites,
  initialTemplate,
  onSave,
}: ReportBuilderProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Step 1: Scope
  const [name, setName] = useState(initialTemplate?.name || '');
  const [selectedWorksites, setSelectedWorksites] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('last7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedEntities, setSelectedEntities] = useState<string[]>(initialTemplate?.entities || ['ALERT']);
  
  // Step 2: Fields
  const [selectedFields, setSelectedFields] = useState<string[]>(initialTemplate?.fields || []);
  
  // Step 3: Filters & Aggregations
  const [filters, setFilters] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [aggregations, setAggregations] = useState<any[]>([]);
  
  // Step 4: Layout
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf' | 'xlsx'>('csv');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeCharts, setIncludeCharts] = useState(false);
  
  // Step 5: Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [deliveryMethod, setDeliveryMethod] = useState('email');
  const [deliveryRecipients, setDeliveryRecipients] = useState('');

  const availableFields = selectedEntities.flatMap(entity => 
    (ENTITY_FIELDS[entity] || []).map(f => ({
      ...f,
      entityId: `${entity}.${f.id}`,
    }))
  );

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const toggleEntity = (entity: string) => {
    setSelectedEntities(prev => {
      if (prev.includes(entity)) {
        // Remove entity and its fields
        const newEntities = prev.filter(e => e !== entity);
        setSelectedFields(f => f.filter(field => !field.startsWith(`${entity}.`)));
        return newEntities;
      } else {
        return [...prev, entity];
      }
    });
  };

  const addFilter = () => {
    setFilters(prev => [...prev, { field: '', op: 'eq', value: '' }]);
  };

  const updateFilter = (index: number, updates: any) => {
    setFilters(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build date range
      let from = customFrom;
      let to = customTo;
      
      if (dateRange !== 'custom') {
        const now = new Date();
        to = now.toISOString();
        
        switch (dateRange) {
          case 'last7d':
            from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'last30d':
            from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'last90d':
            from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
            break;
        }
      }

      const spec = {
        name,
        scope: {
          worksiteIds: selectedWorksites.length > 0 ? selectedWorksites : worksites.map(w => w.id),
          from,
          to,
        },
        entities: selectedEntities,
        fields: selectedFields,
        filters: filters.filter(f => f.field && f.value),
        groupBy,
        aggregations,
        layout: {
          format,
          orientation: pdfOrientation,
          includeCharts,
        },
        schedule: scheduleEnabled ? {
          frequency: scheduleFrequency,
          delivery: {
            method: deliveryMethod,
            recipients: deliveryRecipients.split(',').map(s => s.trim()).filter(Boolean),
          },
        } : null,
      };

      await onSave(spec);
    } catch (error) {
      console.error('Failed to save report:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative bg-slate-900 rounded-lg border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white">Custom Report Builder</h2>
            <p className="text-sm text-slate-400 mt-1">
              Step {step} of 5: {
                step === 1 ? 'Define Scope' :
                step === 2 ? 'Select Fields' :
                step === 3 ? 'Filters & Aggregations' :
                step === 4 ? 'Layout & Format' :
                'Schedule & Delivery'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-700/50">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <button
                  onClick={() => setStep(s)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s < step ? 'bg-green-600 text-white' :
                    s === step ? 'bg-blue-600 text-white' :
                    'bg-slate-700 text-slate-400'
                  }`}
                >
                  {s < step ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </button>
                {s < 5 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${s < step ? 'bg-green-600' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Scope */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Report Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Custom Report"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Worksites
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedWorksites([])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedWorksites.length === 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 border border-slate-600'
                    }`}
                  >
                    All Worksites
                  </button>
                  {worksites.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setSelectedWorksites(prev => 
                          prev.includes(ws.id)
                            ? prev.filter(id => id !== ws.id)
                            : [...prev, ws.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedWorksites.includes(ws.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {ws.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white"
                >
                  <option value="last7d">Last 7 Days</option>
                  <option value="last30d">Last 30 Days</option>
                  <option value="last90d">Last 90 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">From</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">To</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Data Entities
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(ENTITY_FIELDS).map(entity => (
                    <button
                      key={entity}
                      onClick={() => toggleEntity(entity)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors text-left ${
                        selectedEntities.includes(entity)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {entity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Fields */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-slate-400">
                Select the fields you want to include in your report. Click to toggle.
              </p>

              {selectedEntities.map(entity => (
                <div key={entity} className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">{entity}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(ENTITY_FIELDS[entity] || []).map(field => {
                      const fieldId = `${entity}.${field.id}`;
                      return (
                        <button
                          key={fieldId}
                          onClick={() => toggleField(fieldId)}
                          className={`p-2 rounded-lg text-sm transition-colors text-left ${
                            selectedFields.includes(fieldId)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <span className="font-medium">{field.label}</span>
                          <span className="text-xs opacity-60 ml-1">({field.type})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {selectedFields.length > 0 && (
                <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-2">Selected Fields ({selectedFields.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedFields.map(field => (
                      <span
                        key={field}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded"
                      >
                        {field}
                        <button onClick={() => toggleField(field)} className="hover:text-white">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Filters & Aggregations */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Filters */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">Filters</h4>
                  <button
                    onClick={addFilter}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    + Add Filter
                  </button>
                </div>
                
                {filters.length === 0 ? (
                  <p className="text-sm text-slate-400">No filters added. All data will be included.</p>
                ) : (
                  <div className="space-y-2">
                    {filters.map((filter, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <select
                          value={filter.field}
                          onChange={e => updateFilter(idx, { field: e.target.value })}
                          className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                        >
                          <option value="">Select field...</option>
                          {availableFields.map(f => (
                            <option key={f.entityId} value={f.entityId}>{f.label}</option>
                          ))}
                        </select>
                        <select
                          value={filter.op}
                          onChange={e => updateFilter(idx, { op: e.target.value })}
                          className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                        >
                          <option value="eq">equals</option>
                          <option value="neq">not equals</option>
                          <option value="gt">greater than</option>
                          <option value="lt">less than</option>
                          <option value="contains">contains</option>
                          <option value="in">in list</option>
                        </select>
                        <input
                          type="text"
                          value={filter.value}
                          onChange={e => updateFilter(idx, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder-slate-500"
                        />
                        <button
                          onClick={() => removeFilter(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Group By */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Group By</h4>
                <div className="flex flex-wrap gap-2">
                  {GROUP_BY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setGroupBy(prev => 
                          prev.includes(opt.id)
                            ? prev.filter(g => g !== opt.id)
                            : [...prev, opt.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        groupBy.includes(opt.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aggregations */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Aggregations</h4>
                <div className="flex flex-wrap gap-2">
                  {AGGREGATION_TYPES.map(agg => (
                    <button
                      key={agg.id}
                      onClick={() => {
                        const exists = aggregations.some(a => a.op === agg.id);
                        if (exists) {
                          setAggregations(prev => prev.filter(a => a.op !== agg.id));
                        } else {
                          setAggregations(prev => [...prev, { op: agg.id, field: 'id', name: `${agg.id}_total` }]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        aggregations.some(a => a.op === agg.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {agg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Layout */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Output Format
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'csv', label: 'CSV', desc: 'Spreadsheet compatible' },
                    { id: 'json', label: 'JSON', desc: 'Structured data' },
                    { id: 'pdf', label: 'PDF', desc: 'Human readable' },
                    { id: 'xlsx', label: 'Excel', desc: 'Excel format' },
                  ].map(fmt => (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id as any)}
                      className={`p-4 rounded-lg text-left transition-colors ${
                        format === fmt.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <span className="font-medium uppercase">{fmt.label}</span>
                      <p className="text-xs mt-1 opacity-70">{fmt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {format === 'pdf' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Page Orientation
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setPdfOrientation('portrait')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pdfOrientation === 'portrait'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-600'
                        }`}
                      >
                        Portrait
                      </button>
                      <button
                        onClick={() => setPdfOrientation('landscape')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pdfOrientation === 'landscape'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-600'
                        }`}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={e => setIncludeCharts(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                    />
                    <span className="text-sm text-slate-300">Include charts and visualizations</span>
                  </label>
                </>
              )}
            </div>
          )}

          {/* Step 5: Schedule */}
          {step === 5 && (
            <div className="space-y-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={e => setScheduleEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-white">Enable scheduled generation</span>
                  <p className="text-xs text-slate-400">Automatically generate this report on a schedule</p>
                </div>
              </label>

              {scheduleEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Frequency
                    </label>
                    <select
                      value={scheduleFrequency}
                      onChange={e => setScheduleFrequency(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white"
                    >
                      <option value="daily">Daily (9:00 AM)</option>
                      <option value="weekly">Weekly (Monday 9:00 AM)</option>
                      <option value="monthly">Monthly (1st at 9:00 AM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Delivery Method
                    </label>
                    <select
                      value={deliveryMethod}
                      onChange={e => setDeliveryMethod(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white"
                    >
                      <option value="email">Email</option>
                      <option value="webhook">Webhook</option>
                      <option value="s3">Save to S3</option>
                      <option value="slack">Slack</option>
                    </select>
                  </div>

                  {deliveryMethod === 'email' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Recipients (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={deliveryRecipients}
                        onChange={e => setDeliveryRecipients(e.target.value)}
                        placeholder="email1@example.com, email2@example.com"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Summary */}
              <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-3">Report Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white ml-2">{name || 'Untitled'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Format:</span>
                    <span className="text-white ml-2 uppercase">{format}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Entities:</span>
                    <span className="text-white ml-2">{selectedEntities.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Fields:</span>
                    <span className="text-white ml-2">{selectedFields.length} selected</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Filters:</span>
                    <span className="text-white ml-2">{filters.length} active</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Schedule:</span>
                    <span className="text-white ml-2">{scheduleEnabled ? scheduleFrequency : 'One-time'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !name.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Report'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

