import React, { useState } from 'react'
import styles from './Reveal.module.css'

interface RevealProps {
  children: React.ReactNode
  /** Small label on the cover: what kind of thing is hidden */
  kicker: string
  /** The cover's button text */
  cta: string
  /** paper: a tinted box in the page's own colours. ink: a dark cover, for things that deserve a warning. */
  tone?: 'paper' | 'ink'
}

const FADE_MS = 350

/**
 * Content hidden behind a cover until the reader asks for it. Shared by <Spoiler> and <Nsfw>.
 * The hidden content keeps its real size (blurred, inert) so nothing jumps when it is revealed.
 */
export default function Reveal({ children, kicker, cta, tone = 'paper' }: RevealProps) {
  const [open, setOpen] = useState(false)
  // The cover stays mounted while it fades, then leaves so it can't hold the box taller than its content
  const [coverGone, setCoverGone] = useState(false)

  const reveal = () => {
    setOpen(true)
    window.setTimeout(() => setCoverGone(true), FADE_MS)
  }

  return (
    <div className={`${styles.reveal} ${tone === 'ink' ? styles.ink : ''} ${open ? styles.open : ''}`}>
      <div className={styles.content} inert={!open} aria-hidden={!open}>
        {children}
      </div>
      {!coverGone && (
        <button type="button" className={styles.cover} onClick={reveal} disabled={open}>
          <span className={styles.kicker}>{kicker}</span>
          <span className={styles.cta}>{cta}</span>
        </button>
      )}
    </div>
  )
}
