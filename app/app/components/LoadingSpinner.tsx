import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'blue' | 'gray';
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const colorClasses = {
    white: 'text-white',
    blue: 'text-blue-500',
    gray: 'text-gray-400'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`} />
      {text && (
        <p className="mt-2 text-sm text-gray-400">{text}</p>
      )}
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-2/3"></div>
      </div>
    </div>
  );
}

export function LoadingTable() {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4">
          <div className="h-4 bg-gray-600 rounded w-1/4"></div>
        </div>
        {/* Rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-t border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/3"></div>
              <div className="h-4 bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-700 rounded w-1/5"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 