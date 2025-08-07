"use client";
import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '@/src/components/dashboard/Sidebar';
import WorkflowBuilder from '@/src/components/dashboard/WorkflowBuilder';
import PublicActiveAlertsTable from '@/src/components/dashboard/PublicActiveAlertsTable';
import PublicAlertRulesConfig from '@/src/components/dashboard/PublicAlertRulesConfig';
import ErrorBoundary from '@/src/components/ErrorBoundary';

const YOLO_STREAM_URL = 'http://localhost:5001/video_feed';

const YoloStream: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Handle image load
  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  // Handle image error
  const handleError = () => {
    setError(true);
    setLoading(false);
    // Try to reconnect after 2 seconds
    setTimeout(() => {
      setReloadKey((k) => k + 1);
      setLoading(true);
      setError(false);
    }, 2000);
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto' }}>
      {loading && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#00000022', zIndex: 1 }}>
          <span style={{ color: '#333', fontSize: 18 }}>Loading YOLOv8 Stream...</span>
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff3', zIndex: 2 }}>
          <span style={{ color: 'red', fontSize: 16 }}>Stream error. Reconnecting...</span>
        </div>
      )}
      <img
        key={reloadKey}
        ref={imgRef}
        src={YOLO_STREAM_URL + '?t=' + reloadKey}
        alt="YOLOv8 Live Stream"
        style={{ width: '100%', maxWidth: 640, borderRadius: 8, display: loading ? 'none' : 'block' }}
        onLoad={handleLoad}
        onError={handleError}
        crossOrigin="anonymous"
      />
    </div>
  );
};

const UserDashboardPage = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>User Dashboard</h1>
      <YoloStream />
    </div>
  );
};

export default UserDashboardPage; 