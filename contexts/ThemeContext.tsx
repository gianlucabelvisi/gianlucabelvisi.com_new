import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  forceTheme?: Theme // For pages that should always be a specific theme
}

function readPersistedTheme(): Theme | null {
  if (typeof document === 'undefined') return null
  // The blocking script in _document.tsx already applied this from localStorage;
  // trust it so React's initial state matches the DOM and we avoid a flicker.
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  try {
    const saved = localStorage.getItem('blog-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return null
}

export function ThemeProvider({ children, defaultTheme = 'light', forceTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => forceTheme || readPersistedTheme() || defaultTheme
  )
  const [isManualToggle, setIsManualToggle] = useState(false)

  // Re-sync state when navigating between homepage (forced) and posts (persisted).
  useEffect(() => {
    if (forceTheme) {
      setThemeState(forceTheme)
      return
    }
    const persisted = readPersistedTheme()
    if (persisted) setThemeState(persisted)
  }, [forceTheme])

  useEffect(() => {
    // Apply theme to document root immediately
    document.documentElement.setAttribute('data-theme', theme)
    
    // Only remove transition class on initial load, not during manual toggles
    if (!isManualToggle) {
      document.documentElement.classList.remove('theme-transition')
    }
    
    // Save to localStorage (unless forced)
    if (!forceTheme) {
      localStorage.setItem('blog-theme', theme)
    }
  }, [theme, forceTheme, isManualToggle])

  const toggleTheme = () => {
    if (forceTheme) return // Can't toggle if theme is forced
    
    // Mark as manual toggle to prevent removing transition class
    setIsManualToggle(true)
    
    // Enable transitions for manual toggle
    document.documentElement.classList.add('theme-transition')
    
    setThemeState(prev => prev === 'light' ? 'dark' : 'light')
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
      setIsManualToggle(false)
    }, 1100) // Slightly longer than transition duration
  }

  const setTheme = (newTheme: Theme) => {
    if (forceTheme) return // Can't change if theme is forced
    
    // Mark as manual toggle to prevent removing transition class
    setIsManualToggle(true)
    
    // Enable transitions for manual theme change
    document.documentElement.classList.add('theme-transition')
    
    setThemeState(newTheme)
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
      setIsManualToggle(false)
    }, 1100) // Slightly longer than transition duration
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
