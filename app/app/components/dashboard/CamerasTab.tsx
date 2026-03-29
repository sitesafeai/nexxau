'use client';

import { useState, useEffect } from 'react';
import CameraGrid from '../cameras/CameraGrid';
import { canCreateCamera } from '@/app/lib/permissions';

interface CamerasTabProps {
  selectedSite: { id: string; name: string; cameras?: any[] } | null;
  currentUser: any;
}

export default function CamerasTab({ selectedSite, currentUser }: CamerasTabProps) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSite?.id) {
      setCameras([]);
      return;
    }
    setLoading(true);
    fetch(`/api/cameras?worksiteId=${selectedSite.id}`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? data?.cameras ?? [];
        setCameras(Array.isArray(list) ? list : []);
      })
      .catch(() => setCameras([]))
      .finally(() => setLoading(false));
  }, [selectedSite?.id]);

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Site Selected</h3>
          <p className="text-slate-400 mb-6">
            Select a worksite from the dropdown above to view and manage cameras.
          </p>
        </div>
      </div>
    );
  }

  const canAdd = canCreateCamera((currentUser as any)?.role);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Cameras</h2>
        <p className="text-slate-400 mt-1">{selectedSite.name}</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6">
          <CameraGrid
            worksiteId={selectedSite.id}
            initialCameras={cameras.map((c: any) => ({
              id: c.id,
              name: c.name,
              zone: c.zone ?? c.location,
              location: c.location,
              status: c.status,
              streamUrl: c.streamUrl,
              rules: c.rules ?? [],
            }))}
            canAddCamera={canAdd}
          />
        </div>
      )}
    </div>
  );
}
