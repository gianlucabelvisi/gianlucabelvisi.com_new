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

export function ThemeProvider({ children, defaultTheme = 'light', forceTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(forceTheme || defaultTheme)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (forceTheme) {
      setThemeState(forceTheme)
      setIsInitialized(true)
      return
    }

    // Load theme from localStorage on client side
    const savedTheme = localStorage.getItem('blog-theme') as Theme
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme)
    }
    setIsInitialized(true)
  }, [forceTheme])

  useEffect(() => {
    // Apply theme to document root immediately
    document.documentElement.setAttribute('data-theme', theme)
    
    // Never add transition class automatically - only during manual toggles
    // This prevents any initial load transitions on both homepage and posts
    document.documentElement.classList.remove('theme-transition')
    
    // Save to localStorage (unless forced)
    if (!forceTheme) {
      localStorage.setItem('blog-theme', theme)
    }
  }, [theme, forceTheme, isInitialized])

  const toggleTheme = () => {
    if (forceTheme) return // Can't toggle if theme is forced
    
    // Enable transitions for manual toggle
    document.documentElement.classList.add('theme-transition')
    
    setThemeState(prev => prev === 'light' ? 'dark' : 'light')
    
    // Remove transition class after animation completes to prevent future flashes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 1100) // Slightly longer than transition duration
  }

  const setTheme = (newTheme: Theme) => {
    if (forceTheme) return // Can't change if theme is forced
    
    // Enable transitions for manual theme change
    document.documentElement.classList.add('theme-transition')
    
    setThemeState(newTheme)
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
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
