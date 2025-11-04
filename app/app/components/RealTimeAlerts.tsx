'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from './Toast';
import { AlertTriangle, Bell } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  worksiteId: string;
  worksite?: {
    name: string;
  };
}

export default function RealTimeAlerts({ userId, worksiteIds }: { userId: string; worksiteIds: string[] }) {
  const { lastMessage, isConnected, subscribe } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws',
    onConnect: () => {
      console.log('🔌 Connected to real-time alerts');
    }
  });

  const { success, warning, error: showError } = useToast();
  const [alertCount, setAlertCount] = useState(0);

  // Subscribe to worksite alerts
  useEffect(() => {
    if (isConnected && worksiteIds.length > 0) {
      const topics = worksiteIds.map(id => `worksite:${id}:alerts`);
      subscribe(topics, userId);
    }
  }, [isConnected, worksiteIds, userId, subscribe]);

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'alert') {
      const alert = lastMessage.data as Alert;
      
      // Show toast notification
      if (alert.severity === 'CRITICAL') {
        showError(
          `🚨 Critical Alert: ${alert.title}`,
          `${alert.worksite?.name || 'Worksite'}: ${alert.description}`
        );
        
        // Play sound for critical alerts (optional)
        playAlertSound();
      } else if (alert.severity === 'HIGH') {
        warning(
          `⚠️ High Priority: ${alert.title}`,
          `${alert.worksite?.name || 'Worksite'}: ${alert.description}`
        );
      } else {
        success(
          `Alert: ${alert.title}`,
          `${alert.worksite?.name || 'Worksite'}: ${alert.description}`
        );
      }

      setAlertCount(prev => prev + 1);
    }
  }, [lastMessage, showError, warning, success]);

  const playAlertSound = () => {
    // Optional: Play alert sound
    try {
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(e => console.log('Could not play sound:', e));
    } catch (e) {
      // Silently fail if sound not available
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isConnected && alertCount > 0 && (
        <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-semibold">{alertCount} new {alertCount === 1 ? 'alert' : 'alerts'}</span>
        </div>
      )}
      
      {!isConnected && (
        <div className="bg-yellow-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs">
          <AlertTriangle className="h-3 w-3" />
          Real-time updates offline
        </div>
      )}
    </div>
  );
}

