import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const TOAST_STYLES = {
  success: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    icon: CheckCircleIcon,
    iconColor: 'text-green-400',
    hover: 'hover:bg-green-100',
    focus: 'focus:ring-green-600',
    border: 'border-green-200',
    progress: 'bg-green-500'
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    icon: ExclamationCircleIcon,
    iconColor: 'text-red-400',
    hover: 'hover:bg-red-100',
    focus: 'focus:ring-red-600',
    border: 'border-red-200',
    progress: 'bg-red-500'
  },
  warning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-400',
    hover: 'hover:bg-yellow-100',
    focus: 'focus:ring-yellow-600',
    border: 'border-yellow-200',
    progress: 'bg-yellow-500'
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    icon: InformationCircleIcon,
    iconColor: 'text-blue-400',
    hover: 'hover:bg-blue-100',
    focus: 'focus:ring-blue-600',
    border: 'border-blue-200',
    progress: 'bg-blue-500'
  }
};

export default function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const styles = TOAST_STYLES[type];
  const Icon = styles.icon;

  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = endTime - now;
      const newProgress = (remaining / duration) * 100;

      if (newProgress <= 0) {
        onClose();
        return;
      }

      setProgress(newProgress);
      requestAnimationFrame(updateProgress);
    };

    const animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [duration, onClose]);

  return (
    <div className={`min-w-[400px] max-w-lg rounded-lg border shadow-lg ${styles.bg} ${styles.border}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${styles.iconColor}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${styles.text}`}>{message}</p>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className={`inline-flex rounded-md ${styles.bg} ${styles.text} ${styles.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.focus}`}
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-1 w-full bg-gray-200">
        <div
          className={`h-full transition-all duration-100 ${styles.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
} 