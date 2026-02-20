'use client'

import { ReactNode, useMemo } from 'react'
import { useDarkMode } from '@/components/providers/DarkModeProvider'

interface ThemeWrapperProps {
  children: ReactNode
  theme?: 'arcade' | 'default'
}

// Enhanced theme system with comprehensive brand identity
const themeDefinitions = {
  arcade: {
    light: {
      primary: '#6366f1',      // Indigo - main brand color
      secondary: '#8b5cf6',    // Purple - secondary brand color
      accent: '#ec4899',       // Pink - accent color
      background: '#f8fafc',   // Light gray surface
      text: '#1e293b',         // Slate 800 - primary text
    },
    dark: {
      primary: '#818cf8',      // Lighter indigo for visibility
      secondary: '#a78bfa',    // Lighter purple
      accent: '#f472b6',       // Lighter pink
      background: '#0f172a',    // Slate 900 - dark background
      text: '#f1f5f9',         // Slate 50 - primary text
    }
  },
  default: {
    light: {
      primary: '#6366f1',      // Indigo - main brand color
      secondary: '#8b5cf6',    // Purple - secondary brand color
      accent: '#ec4899',       // Pink - accent color
      background: '#ffffff',   // Pure white
      text: '#000000',         // Black text
    },
    dark: {
      primary: '#818cf8',      // Lighter indigo for visibility
      secondary: '#a78bfa',    // Lighter purple
      accent: '#f472b6',       // Lighter pink
      background: '#000000',   // Pure black
      text: '#ffffff',         // White text
    }
  }
}

export function ThemeWrapper({ children, theme = 'default' }: ThemeWrapperProps) {
  const { isDarkMode } = useDarkMode()
  
  // Get theme colors based on current mode
  const currentTheme = useMemo(() => {
    const themeDef = themeDefinitions[theme]
    return isDarkMode ? themeDef.dark : themeDef.light
  }, [theme, isDarkMode])

  // Apply theme as CSS variables for global access
  const themeStyle = useMemo(() => ({
    '--color-primary': currentTheme.primary,
    '--color-secondary': currentTheme.secondary,
    '--color-accent': currentTheme.accent,
    '--color-background': currentTheme.background,
    '--color-text': currentTheme.text,
  } as React.CSSProperties), [currentTheme])

  const themeClasses = theme === 'arcade'
    ? 'writersarcade-theme min-h-screen'
    : 'bg-black text-white min-h-screen'

  return (
    <div className={themeClasses} style={themeStyle}>
      {children}
    </div>
  )
}