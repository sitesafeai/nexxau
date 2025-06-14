'use client';

import { useTheme } from '@/lib/theme';

export default function ThemeSwitcher() {
  const { themeStyle, toggleThemeStyle } = useTheme();

  return (
    <button
      onClick={toggleThemeStyle}
      className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
    >
      <div className="w-6 h-6 flex items-center justify-center">
        {themeStyle === 'corporate' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
            />
          </svg>
        )}
      </div>
    </button>
  );
} 