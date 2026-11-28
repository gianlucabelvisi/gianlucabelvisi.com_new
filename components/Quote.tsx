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

/** A pull quote: someone else's words, set large in the display face with the source underneath */
const Quote = ({ children, from, title }: QuoteProps) => (
  <figure className={styles.quote} aria-label={title}>
    <span className={styles.mark} aria-hidden="true">&ldquo;</span>
    <blockquote className={styles.text}>{children}</blockquote>
    {from && <figcaption className={styles.from}>{from}</figcaption>}
  </figure>
)

export default Quote
