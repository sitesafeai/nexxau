/**
 * AddCameraButton - Purple button to add new cameras via go2rtc
 * 
 * Simple, focused component for the new go2rtc architecture
 */

'use client';

import React, { useState } from 'react';
import AddCameraWizard from './AddCameraWizard';

interface AddCameraButtonProps {
  worksiteId: string;
  onCameraAdded?: () => void;
}

const AddCameraButton: React.FC<AddCameraButtonProps> = ({ worksiteId, onCameraAdded }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Camera
      </button>

      {isModalOpen && (
        <AddCameraWizard
          worksiteId={worksiteId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            onCameraAdded?.();
          }}
        />
      )}
    </>
  );
};

export default AddCameraButton;
