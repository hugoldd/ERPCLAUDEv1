'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'darkBlue' | 'purple' | 'light' | 'greenTeal' | 'deepPurple' | 'vivid';

interface ThemeColors {
  name: string;
  background: string;
  sidebar: string;
  sidebarHover: string;
  card: string;
  cardHover: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentHover: string;
  success: string;
  warning: string;
  danger: string;
}

const themes: Record<ThemeName, ThemeColors> = {
  darkBlue: {
    name: 'Dark Blue',
    background: '#1a1d2e',
    sidebar: '#0f1118',
    sidebarHover: '#1a1d2e',
    card: '#252838',
    cardHover: '#2d3142',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
    accent: '#ff6b35a9',
    accentHover: '#ff8255',
    success: '#2bb185ff',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  purple: {
    name: 'Purple Dark',
    background: '#1e1b4b',
    sidebar: '#0f0b2e',
    sidebarHover: '#1e1b4b',
    card: '#312e81',
    cardHover: '#3730a3',
    text: '#ffffff',
    textSecondary: '#c4b5fd',
    border: '#4c1d95',
    accent: '#8b5cf6',
    accentHover: '#a78bfa',
    success: '#10b981',
    warning: '#fbbf24',
    danger: '#f87171',
  },
  light: {
    name: 'Light',
    background: '#f8f9fa',
    sidebar: '#ffffff',
    sidebarHover: '#f3f4f6',
    card: '#ffffff',
    cardHover: '#f9fafb',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    accent: '#4f46e5',
    accentHover: '#6366f1',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
  },
  greenTeal: {
    name: 'Green Teal',
    background: '#0f172a',
    sidebar: '#020617',
    sidebarHover: '#0f172a',
    card: '#1e293b',
    cardHover: '#334155',
    text: '#ffffffff',
    textSecondary: '#94a3b8',
    border: '#334155',
    accent: '#267d5fff',
    accentHover: '#6acfaaff',
    success: '#22c55e',
    warning: '#eab308',
    danger: '#f43f5e',
  },
  deepPurple: {
    name: 'Deep Purple',
    background: '#2d1b4e',
    sidebar: '#1a0f3d',
    sidebarHover: '#2d1b4e',
    card: '#3d2465',
    cardHover: '#4a2d7a',
    text: '#ffffff',
    textSecondary: '#d8b4fe',
    border: '#5b21b6',
    accent: '#e879f9',
    accentHover: '#f0abfc',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#fb7185',
  },
  vivid: {
    name: 'Vivid',
    background: '#0f0f0f',
    sidebar: '#1a1a1a',
    sidebarHover: '#252525',
    card: '#1e1e1e',
    cardHover: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    border: '#333333',
    accent: '#6366f1', // Bleu vif
    accentHover: '#818cf8',
    success: '#22c55e', // Vert vif
    warning: '#f59e0b', // Orange vif
    danger: '#ef4444', // Rouge vif
  },
};

interface ThemeContextType {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
  themes: Record<ThemeName, ThemeColors>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('darkBlue');

  // Charger le thème depuis localStorage au montage
  useEffect(() => {
    const saved = localStorage.getItem('app-theme') as ThemeName;
    if (saved && themes[saved]) {
      setThemeState(saved);
    }
  }, []);

  // Sauvegarder le thème dans localStorage
  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        colors: themes[theme], 
        setTheme,
        themes 
      }}
    >
      <div 
        className="min-h-screen transition-colors duration-300"
        style={{ backgroundColor: themes[theme].background }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}