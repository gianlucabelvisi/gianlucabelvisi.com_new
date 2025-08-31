import React from 'react'
import styles from './NetflixLayout.module.css'

interface NetflixLayoutProps {
  children: React.ReactNode
  isDark?: boolean
}

export default function NetflixLayout({ children, isDark = true }: NetflixLayoutProps) {
  return (
    <div className={`${styles.container} ${isDark ? styles.dark : styles.light}`}>
      {children}
    </div>
  )
}

// Gradient overlay component for between sections
export function GradientOverlay() {
  return <div className={styles.gradientOverlay} />
}
