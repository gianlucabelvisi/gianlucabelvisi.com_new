import React from 'react'
import styles from './Quote.module.css'

interface QuoteProps {
  children: React.ReactNode
  from?: string
  title?: string
  bouncy?: boolean
}

const Quote = ({ children, from, title, bouncy = false }: QuoteProps) => {
  return (
    <div className={styles.quoteContainer}>
      {/* Decorative background elements */}
      <div className={styles.decorativeTopRight} />
      <div className={styles.decorativeBottomLeft} />

      {/* Quote marks */}
      <div className={styles.quoteMark}>
        ❝
      </div>
      
      {/* Quote content */}
      <div className={`${styles.quoteContent} ${from ? styles.quoteContentWithAttribution : ''}`}>
        {children}
      </div>
      
      {/* Attribution */}
      {from && (
        <div className={styles.attribution}>
          — {from}
        </div>
      )}
    </div>
  )
}

export default Quote 