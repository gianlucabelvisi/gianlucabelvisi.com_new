import { useTheme } from '../contexts/ThemeContext'
import styles from './ThemeToggle.module.css'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`${styles.toggle} ${className || ''}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className={`${styles.track} ${isDark ? styles.dark : styles.light}`}>
        <div className={`${styles.thumb} ${isDark ? styles.thumbRight : ''}`}>
          {/* Sun */}
          <svg
            className={`${styles.icon} ${styles.sun} ${isDark ? styles.iconHidden : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          {/* Moon */}
          <svg
            className={`${styles.icon} ${styles.moon} ${isDark ? '' : styles.iconHidden}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="#e5e7eb"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
      </div>
    </button>
  )
}
