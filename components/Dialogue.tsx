import styles from './Dialogue.module.css'

interface DialogueProps {
  children: React.ReactNode
  /** Who is speaking, shown as a small label above the line. Optional: most lines are clear from the prose around them. */
  by?: string
  /** Push the line to the other side, for the second voice of a back-and-forth */
  side?: 'left' | 'right'
}

/**
 * A spoken line. Set apart from the narration the way a play or a comic would do it: its own voice
 * (the display face, in italics), a hanging opening quote in the accent colour, and room to breathe.
 * Lines that follow each other close up into an exchange.
 *
 * Inside a line, <GlyphRight/> … <GlyphLeft/> close and reopen the quotes around a bit of narration.
 */
export default function Dialogue({ children, by, side = 'left' }: DialogueProps) {
  return (
    <div className={`${styles.dialogue} ${side === 'right' ? styles.right : ''}`}>
      {by && <span className={styles.by}>{by}</span>}
      <span className={styles.line}>
        <span className={styles.open} aria-hidden="true">&ldquo;</span>
        <span className={styles.text}>{children}</span>
        <span className={styles.close} aria-hidden="true">&rdquo;</span>
      </span>
    </div>
  )
}
