'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Apply theme to document
  const applyTheme = useCallback((newTheme: 'light' | 'dark') => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
  }, [])

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('capri-theme', newTheme)
    applyTheme(newTheme)
  }, [applyTheme])

  // Initialize theme on mount
  useEffect(() => {
    const stored = localStorage.getItem('capri-theme') as Theme | null
    // Migrate 'system' to 'dark' for users who had it selected
    const initialTheme = (stored === 'system' || !stored) ? 'dark' : stored
    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [applyTheme])

  // Prevent flash of incorrect theme
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Theme toggle button component
export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const getIcon = () => {
    return theme === 'dark' ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Sun className="h-5 w-5" />
    )
  }

  const getLabel = () => {
    return theme === 'dark' ? 'Dark' : 'Light'
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
      title={`Theme: ${getLabel()}`}
    >
      {getIcon()}
      <span className="text-sm font-medium hidden sm:inline">{getLabel()}</span>
    </button>
  )
}
