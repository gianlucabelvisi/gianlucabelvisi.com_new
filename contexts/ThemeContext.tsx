import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  /** True when the current route forces a theme and the toggle is a no-op */
  isForced: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  forceTheme?: Theme // For pages that should always be a specific theme
}

const STORAGE_KEY = 'blog-theme'
const TRANSITION_MS = 1100 // Slightly longer than the CSS transition

/**
 * The reader's preferred theme: saved choice first, then OS preference.
 * The blocking script in _document.tsx applies the same logic before first paint,
 * so on the client we can also trust the data-theme attribute it left behind.
 */
function readPreferredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return null
}

export function ThemeProvider({ children, defaultTheme = 'light', forceTheme }: ThemeProviderProps) {
  // Only ever holds the reader's *preference*; forced routes are layered on top so
  // navigating homepage -> post never overwrites the saved choice.
  const [preference, setPreference] = useState<Theme>(
    () => readPreferredTheme() || defaultTheme
  )

  const theme: Theme = forceTheme ?? preference

  // Apply to <html> and persist the preference (never the forced value)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (!forceTheme) {
      try {
        localStorage.setItem(STORAGE_KEY, preference)
      } catch {}
    }
  }, [theme, preference, forceTheme])

  // Follow OS changes while the reader has not made an explicit choice
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return // explicit choice wins
      } catch {}
      setPreference(e.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const animateTo = useCallback((next: Theme | ((prev: Theme) => Theme)) => {
    const root = document.documentElement
    root.classList.add('theme-transition')
    setPreference(next)
    window.setTimeout(() => root.classList.remove('theme-transition'), TRANSITION_MS)
  }, [])

  const toggleTheme = useCallback(() => {
    if (forceTheme) return
    animateTo(prev => (prev === 'light' ? 'dark' : 'light'))
  }, [forceTheme, animateTo])

  const setTheme = useCallback((newTheme: Theme) => {
    if (forceTheme) return
    animateTo(newTheme)
  }, [forceTheme, animateTo])

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme, isForced: Boolean(forceTheme) }),
    [theme, toggleTheme, setTheme, forceTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
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
