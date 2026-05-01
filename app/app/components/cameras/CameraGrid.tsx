'use client';

import { useEffect, useState } from 'react';
import CameraTile from './CameraTile';
import AddCameraWizard from './AddCameraWizard';

interface Camera {
  id: string;
  name: string;
  zone?: string | null;
  location?: string | null;
  status?: string;
  streamUrl?: string | null;
  rules?: any[];
}

interface CameraGridProps {
  worksiteId: string;
  initialCameras: Camera[];
  canAddCamera?: boolean;
}

export default function CameraGrid({
  worksiteId,
  initialCameras,
  canAddCamera = true,
}: CameraGridProps) {
  const [cameras, setCameras] = useState<Camera[]>(initialCameras);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // Keep internal state in sync when switching worksites or when the parent fetch completes.
    // This avoids "0 cameras connected" when initialCameras arrives after first render.
    setCameras((prev) => {
      const prevIds = prev.map((c) => c.id).join('|');
      const nextIds = initialCameras.map((c) => c.id).join('|');
      if (prevIds === nextIds) return prev;
      return initialCameras;
    });
  }, [worksiteId, initialCameras]);

  function onCameraAdded(camera: any) {
    setCameras((prev) => [
      ...prev,
      {
        id: camera.id,
        name: camera.name,
        status: camera.status,
        streamUrl: camera.streamUrl,
        zone: camera.location,
        location: camera.location,
        rules: [],
      },
    ]);
    setShowWizard(false);
  }

  function onCameraDeleted(id: string) {
    setCameras((prev) => prev.filter((c) => c.id !== id));
  }

  function onCameraUpdated(updated: { id: string; name: string; zone?: string | null; location?: string | null }) {
    setCameras((prev) =>
      prev.map((c) =>
        c.id === updated.id
          ? {
              ...c,
              name: updated.name,
              zone: updated.zone ?? c.zone,
              location: updated.location ?? updated.zone ?? c.location,
            }
          : c
      )
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Cameras
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {cameras.length} camera{cameras.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        {canAddCamera && (
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Add Camera
          </button>
        )}
      </div>

      {cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            No cameras connected yet
          </p>
          {canAddCamera && (
            <button
              onClick={() => setShowWizard(true)}
              className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
            >
              Add your first camera
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((camera) => (
            <CameraTile
              key={camera.id}
              camera={camera}
              onDeleted={() => onCameraDeleted(camera.id)}
              onUpdated={onCameraUpdated}
            />
          ))}
        </div>
      )}

      {showWizard && (
        <AddCameraWizard
          worksiteId={worksiteId}
          onSuccess={onCameraAdded}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
