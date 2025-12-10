'use client'

import { ReactNode } from 'react'

interface ThemeWrapperProps {
  children: ReactNode
  theme?: 'arcade' | 'default'
}

export function ThemeWrapper({ children, theme = 'default' }: ThemeWrapperProps) {
  const themeClasses = theme === 'arcade' 
    ? 'writarcade-theme min-h-screen' 
    : 'bg-black text-white min-h-screen'

  return (
    <div className={themeClasses}>
      {children}
    </div>
  )
}