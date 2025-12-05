"use client";

interface QuickActionsPanelProps {
  onAddSite: () => void;
  onGenerateReport: () => void;
  onViewWorkflows: () => void;
}

export default function QuickActionsPanel({
  onAddSite,
  onGenerateReport,
  onViewWorkflows
}: QuickActionsPanelProps) {
  const actions = [
    {
      title: 'Add New Site',
      description: 'Create a new worksite and configure cameras',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      onClick: onAddSite,
      color: 'blue'
    },
    {
      title: 'Generate Global Report',
      description: 'Create daily, weekly, or custom reports',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: onGenerateReport,
      color: 'emerald'
    },
    {
      title: 'View Workflows',
      description: 'Manage automated alert responses',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      onClick: onViewWorkflows,
      color: 'purple'
    }
  ];

  const colorClasses: Record<string, { bg: string; hover: string; icon: string; border: string }> = {
    blue: {
      bg: 'bg-blue-500/10',
      hover: 'hover:bg-blue-500/20 hover:border-blue-500/40',
      icon: 'text-blue-400 bg-blue-500/20',
      border: 'border-blue-500/20'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      hover: 'hover:bg-emerald-500/20 hover:border-emerald-500/40',
      icon: 'text-emerald-400 bg-emerald-500/20',
      border: 'border-emerald-500/20'
    },
    purple: {
      bg: 'bg-purple-500/10',
      hover: 'hover:bg-purple-500/20 hover:border-purple-500/40',
      icon: 'text-purple-400 bg-purple-500/20',
      border: 'border-purple-500/20'
    }
  };

  return (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Quick Actions</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action, index) => {
          const colors = colorClasses[action.color] || colorClasses.blue;
          
          return (
            <button
              key={index}
              onClick={action.onClick}
              className={`group relative flex items-center space-x-4 p-4 rounded-xl border ${colors.border} ${colors.bg} ${colors.hover} transition-all duration-300`}
            >
              <div className={`w-12 h-12 rounded-lg ${colors.icon} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <div className="text-left min-w-0">
                <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors">{action.title}</h3>
                <p className="text-xs text-slate-400 truncate">{action.description}</p>
              </div>
              <svg className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

