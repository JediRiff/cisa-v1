'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

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
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  // Apply theme to document
  const applyTheme = useCallback((newTheme: 'light' | 'dark') => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
    setResolvedTheme(newTheme)
  }, [])

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('capri-theme', newTheme)

    if (newTheme === 'system') {
      applyTheme(getSystemTheme())
    } else {
      applyTheme(newTheme)
    }
  }, [applyTheme, getSystemTheme])

  // Initialize theme on mount
  useEffect(() => {
    const stored = localStorage.getItem('capri-theme') as Theme | null
    const initialTheme = stored || 'system'
    setThemeState(initialTheme)

    if (initialTheme === 'system') {
      applyTheme(getSystemTheme())
    } else {
      applyTheme(initialTheme)
    }

    setMounted(true)
  }, [applyTheme, getSystemTheme])

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme(getSystemTheme())
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, applyTheme, getSystemTheme])

  // Prevent flash of incorrect theme
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Theme toggle button component
export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()

  const toggleTheme = () => {
    // Cycle through: light -> dark -> system -> light
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    if (theme === 'system') {
      return (
        <div className="relative">
          <Sun className="h-5 w-5 absolute opacity-50" />
          <Moon className="h-5 w-5 opacity-50" />
        </div>
      )
    }
    return resolvedTheme === 'dark' ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Sun className="h-5 w-5" />
    )
  }

  const getLabel = () => {
    if (theme === 'system') return 'System'
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
