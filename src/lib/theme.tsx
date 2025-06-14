'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type ThemeStyle = 'corporate' | 'tech';

interface ThemeContextType {
  themeStyle: ThemeStyle;
  toggleThemeStyle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeStyle: 'corporate',
  toggleThemeStyle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>('corporate');

  useEffect(() => {
    const savedStyle = localStorage.getItem('themeStyle') as ThemeStyle;
    if (savedStyle) {
      setThemeStyle(savedStyle);
    }
  }, []);

  const toggleThemeStyle = () => {
    const newStyle = themeStyle === 'corporate' ? 'tech' : 'corporate';
    setThemeStyle(newStyle);
    localStorage.setItem('themeStyle', newStyle);
  };

  return (
    <ThemeContext.Provider value={{ themeStyle, toggleThemeStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
} 