'use client';

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface NotificationToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
  index?: number;
}

export default function NotificationToast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  index = 0
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const pausedTimeRef = useRef<number>(0);

  const startProgressAnimation = () => {
    const updateProgress = () => {
      if (isPaused) {
        animationRef.current = requestAnimationFrame(updateProgress);
        return;
      }

      const now = Date.now();
      const elapsed = now - startTimeRef.current - pausedTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = (remaining / duration) * 100;
      setProgress(newProgress);

      if (remaining <= 0) {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300); // Wait for fade out animation
      } else {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    startProgressAnimation();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [id, duration, onClose]);

  useEffect(() => {
    if (isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      startProgressAnimation();
    }
  }, [isPaused]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    pausedTimeRef.current += Date.now() - startTimeRef.current;
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-700';
      case 'error':
        return 'bg-red-900/90 border-red-700';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-700';
      case 'info':
        return 'bg-blue-900/90 border-blue-700';
      default:
        return 'bg-gray-900/90 border-gray-700';
    }
  };

  const getProgressColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-400';
      case 'error':
        return 'bg-red-400';
      case 'warning':
        return 'bg-yellow-400';
      case 'info':
        return 'bg-blue-400';
      default:
        return 'bg-gray-400';
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{ transform: `translateY(${index * 80}px)` }}
    >
      <div 
        className={`${getBackgroundColor()} border rounded-lg shadow-lg p-4 relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20">
          <div 
            className={`h-full ${getProgressColor()} transition-all duration-100 ease-linear ${isPaused ? 'animate-pulse' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex items-start pt-1">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{title}</p>
            <p className="mt-1 text-sm text-gray-300 line-clamp-2">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification container component
interface NotificationContainerProps {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>;
  onClose: (id: string) => void;
}

export function NotificationContainer({ notifications, onClose }: NotificationContainerProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification, index) => (
        <NotificationToast
          key={notification.id}
          {...notification}
          onClose={onClose}
          index={index}
        />
      ))}
    </div>
  );
} 