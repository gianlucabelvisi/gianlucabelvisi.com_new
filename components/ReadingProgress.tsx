import { useEffect, useRef, useState } from 'react'
import { FiArrowUp } from 'react-icons/fi'
import styles from './ReadingProgress.module.css'

const SHOW_BACK_TO_TOP_AFTER = 600 // px

/**
 * Thin progress bar under the header showing how far through the page the
 * reader is, plus a "back to top" button that appears after some scrolling.
 * Scroll work happens in a rAF-throttled listener that writes straight to the
 * DOM, so React only re-renders when the button's visibility flips.
 */
export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`
      }
      setShowTop(window.scrollY > SHOW_BACK_TO_TOP_AFTER)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const scrollToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <>
      <div className={styles.track} aria-hidden="true">
        <div ref={barRef} className={styles.bar} />
      </div>
      <button
        type="button"
        className={`${styles.backToTop} ${showTop ? styles.visible : ''}`}
        onClick={scrollToTop}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
      >
        <FiArrowUp aria-hidden="true" />
      </button>
    </>
  )
}
