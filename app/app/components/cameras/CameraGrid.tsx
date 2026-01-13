/**
 * CameraGrid - Responsive grid container for camera tiles
 * 
 * Responsibilities:
 * - Render responsive grid of CameraTile components
 * - Pass actions down
 * - NOTHING else
 * 
 * Constraints:
 * - No WebRTC logic
 * - No state management
 * - Memoized to prevent unnecessary re-renders
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import CameraTile, { CameraTileProps } from './CameraTile';
import { useCameraManager } from '@/app/hooks/useCameraManager';

export interface CameraGridProps {
  cameras: Array<{
    id: string;
    name: string;
    janusFeedId: number | null;
    rtspUrl: string | null;
    metadata: {
      aiEnabled?: boolean;
      [key: string]: any;
    } | null;
  }>;
  cameraManager: ReturnType<typeof useCameraManager>;
  onToggleAI: (cameraId: string, enabled: boolean) => Promise<void>;
  onRemoveCamera: (cameraId: string) => void;
}

/**
 * CameraGrid component
 * 
 * Grid Layout Rules:
 * - 1-4 cameras → 2x2 grid
 * - 5-9 cameras → 3x3 grid
 * - 9+ cameras → scrollable grid
 */
const CameraGrid: React.FC<CameraGridProps> = ({
  cameras,
  cameraManager,
  onToggleAI,
  onRemoveCamera
}) => {
  /**
   * Determine grid columns based on camera count
   */
  const gridCols = useMemo(() => {
    if (cameras.length <= 4) {
      return 'grid-cols-2';
    } else if (cameras.length <= 9) {
      return 'grid-cols-3';
    } else {
      return 'grid-cols-3'; // Scrollable grid
    }
  }, [cameras.length]);
  
  /**
   * Stable callback for toggle AI
   */
  const handleToggleAI = useCallback(async (cameraId: string, enabled: boolean) => {
    await onToggleAI(cameraId, enabled);
  }, [onToggleAI]);
  
  /**
   * Stable callback for remove camera
   */
  const handleRemoveCamera = useCallback((cameraId: string) => {
    onRemoveCamera(cameraId);
  }, [onRemoveCamera]);
  
  if (cameras.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-gray-500 text-center">
          <p className="text-lg font-medium mb-2">No cameras configured</p>
          <p className="text-sm">Add a camera to get started</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`grid ${gridCols} gap-4 ${cameras.length > 9 ? 'max-h-[calc(100vh-200px)] overflow-y-auto' : ''}`}>
      {cameras.map((camera) => (
        <CameraTile
          key={camera.id}
          camera={camera}
          cameraManager={cameraManager}
          onToggleAI={handleToggleAI}
          onRemove={handleRemoveCamera}
        />
      ))}
    </div>
  );
};

export default CameraGrid;

