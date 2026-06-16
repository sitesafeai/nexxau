"use client";

/** Shared utility: one skeleton block */
function Sk({ className }: { className: string }) {
  return <div className={`bg-slate-700/60 rounded animate-pulse ${className}`} />;
}

/** 4 KPI cards in a row */
function MetricCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Sk className="h-4 w-24" />
            <Sk className="h-8 w-8 rounded-lg" />
          </div>
          <Sk className="h-8 w-16" />
          <Sk className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Generic tall card wrapper */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

/* ─── Tab skeletons ─────────────────────────────────────────────────────── */

export function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* site selector */}
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-48" />
        <Sk className="h-9 w-36 rounded-lg" />
      </div>

      <MetricCards />

      {/* two-column: chart + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <Sk className="h-5 w-40" />
          <Sk className="h-48 w-full rounded-lg" />
        </Card>
        <Card>
          <Sk className="h-5 w-32" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 py-2">
              <Sk className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk className="h-3 w-3/4" />
                <Sk className="h-3 w-1/2" />
              </div>
              <Sk className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </Card>
      </div>

      {/* camera grid */}
      <Card>
        <Sk className="h-5 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-video bg-slate-700/60 rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function GlobalDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* top bar */}
      <div className="flex items-center justify-between py-2">
        <Sk className="h-7 w-40" />
        <div className="flex space-x-3">
          <Sk className="h-9 w-48 rounded-lg" />
          <Sk className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      <MetricCards />

      {/* quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Sk key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* alerts feed */}
        <Card>
          <Sk className="h-5 w-32" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 py-3 border-t border-slate-700/30">
              <Sk className="h-9 w-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk className="h-4 w-3/4" />
                <Sk className="h-3 w-1/2" />
              </div>
              <Sk className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </Card>

        {/* system health / camera grid */}
        <Card>
          <div className="flex items-center justify-between">
            <Sk className="h-5 w-32" />
            <Sk className="h-8 w-20 rounded-lg" />
          </div>
          <div className="flex space-x-2">
            {[...Array(4)].map((_, i) => <Sk key={i} className="h-7 w-20 rounded-full" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-video bg-slate-700/60 rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function CamerasTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Sk className="h-7 w-28" />
          <Sk className="h-4 w-40" />
        </div>
        <Sk className="h-10 w-32 rounded-lg" />
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        {/* filter/search bar */}
        <div className="flex items-center justify-between mb-6">
          <Sk className="h-9 w-64 rounded-lg" />
          <div className="flex space-x-2">
            {[...Array(3)].map((_, i) => <Sk key={i} className="h-9 w-24 rounded-lg" />)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-700/30 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="aspect-video bg-slate-700/60" />
              <div className="p-3 space-y-2">
                <Sk className="h-4 w-3/4" />
                <div className="flex items-center space-x-2">
                  <Sk className="h-3 w-3 rounded-full" />
                  <Sk className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteManagementSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Sk className="h-8 w-48" />
        <Sk className="h-10 w-32 rounded-lg" />
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Sk className="h-10 w-10 rounded-lg flex-shrink-0" />
            <Sk className="h-5 w-1/4" />
            <Sk className="h-5 w-1/4" />
            <Sk className="h-5 w-1/6" />
            <div className="flex-1" />
            <Sk className="h-7 w-20 rounded-full" />
            <Sk className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* header + tabs */}
      <div className="flex items-center justify-between">
        <Sk className="h-8 w-36" />
        <div className="flex space-x-2">
          {[...Array(3)].map((_, i) => <Sk key={i} className="h-9 w-24 rounded-lg" />)}
        </div>
      </div>
      <div className="flex space-x-2">
        {[...Array(4)].map((_, i) => <Sk key={i} className="h-8 w-28 rounded-full" />)}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl divide-y divide-slate-700/30">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-start space-x-4 p-4">
            <Sk className="h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <Sk className="h-4 w-1/2" />
                <Sk className="h-5 w-16 rounded-full" />
              </div>
              <Sk className="h-3 w-3/4" />
              <Sk className="h-3 w-40" />
            </div>
            <Sk className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlertRulesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Sk className="h-8 w-36" />
          <Sk className="h-4 w-56" />
        </div>
        <Sk className="h-10 w-36 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Sk className="h-5 w-1/2" />
              <Sk className="h-6 w-12 rounded-full" />
            </div>
            <Sk className="h-3 w-3/4" />
            <div className="flex space-x-2">
              <Sk className="h-6 w-20 rounded-full" />
              <Sk className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
              <Sk className="h-4 w-28" />
              <Sk className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Sk className="h-8 w-36" />
        <div className="flex space-x-2">
          <Sk className="h-9 w-36 rounded-lg" />
          <Sk className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <Sk className="h-4 w-24" />
            <Sk className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <Sk className="h-5 w-40" />
            <Sk className="h-52 w-full rounded-lg" />
          </Card>
        ))}
      </div>

      {/* table */}
      <Card>
        <Sk className="h-5 w-32" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-2">
            <Sk className="h-4 w-1/4" />
            <Sk className="h-4 w-1/4" />
            <Sk className="h-4 w-1/6" />
            <Sk className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function WorkflowsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Sk className="h-8 w-36" />
          <Sk className="h-4 w-56" />
        </div>
        <Sk className="h-10 w-40 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Sk className="h-5 w-3/4" />
                <Sk className="h-3 w-full" />
                <Sk className="h-3 w-2/3" />
              </div>
              <Sk className="h-6 w-16 rounded-full ml-3" />
            </div>
            <div className="flex space-x-2">
              {[...Array(3)].map((_, j) => <Sk key={j} className="h-6 w-20 rounded-full" />)}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
              <Sk className="h-4 w-24" />
              <div className="flex space-x-2">
                <Sk className="h-8 w-20 rounded-lg" />
                <Sk className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="max-w-3xl space-y-6 animate-pulse">
      <Sk className="h-8 w-28" />

      {[...Array(3)].map((_, section) => (
        <div key={section} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5">
          <Sk className="h-5 w-40" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Sk className="h-4 w-28" />
              <Sk className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Sk className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditLogSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Sk className="h-8 w-32" />
          <Sk className="h-4 w-64" />
        </div>
        <div className="flex space-x-2">
          <Sk className="h-9 w-24 rounded-lg" />
          <Sk className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* category tabs */}
      <div className="flex space-x-1">
        {[...Array(6)].map((_, i) => <Sk key={i} className="h-9 w-32 rounded-lg" />)}
      </div>

      {/* filters */}
      <div className="flex items-center space-x-3">
        <Sk className="h-9 flex-1 rounded-lg max-w-xs" />
        <Sk className="h-9 w-36 rounded-lg" />
        <Sk className="h-9 w-36 rounded-lg" />
        <Sk className="h-9 w-20 rounded-lg" />
      </div>

      {/* table */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        {/* header row */}
        <div className="flex items-center space-x-4 px-4 py-3 border-b border-slate-700/50">
          <Sk className="h-4 w-32" />
          <Sk className="h-4 w-24" />
          <Sk className="h-4 flex-1" />
          <Sk className="h-4 w-20" />
          <Sk className="h-4 w-16" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 px-4 py-3.5 border-b border-slate-700/30">
            <Sk className="h-4 w-32" />
            <Sk className="h-5 w-20 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Sk className="h-4 w-3/4" />
              <Sk className="h-3 w-1/2" />
            </div>
            <Sk className="h-5 w-16 rounded-full" />
            <Sk className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
