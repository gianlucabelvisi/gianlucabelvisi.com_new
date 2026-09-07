import React from 'react'
import styles from './Quote.module.css'

interface QuoteProps {
  children: React.ReactNode
  from?: string
  /** Short label announced to screen readers, e.g. "inspiring quote" */
  title?: string
  /** Legacy prop from the Gatsby blog; accepted for compatibility, no effect */
  bouncy?: boolean
}

const Quote = ({ children, from, title }: QuoteProps) => {
  return (
    <figure className={styles.quoteContainer} aria-label={title}>
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
        <figcaption className={styles.attribution}>
          — {from}
        </figcaption>
      )}
    </figure>
  )
}

export default Quote 