import { useEffect, useRef, useState } from 'react'
import { FiArrowUp } from 'react-icons/fi'
import { saveProgress } from '../lib/progress'
import styles from './ReadingProgress.module.css'

const SHOW_BACK_TO_TOP_AFTER = 600 // px

/**
 * Thin progress bar at the top showing how far through the writing the reader is
 * (measured to the [data-reading-end] marker, so comments and related posts don't count),
 * plus a "back to top" button that appears after some scrolling.
 * Scroll work happens in a rAF-throttled listener that writes straight to the
 * DOM, so React only re-renders when the button's visibility flips.
 *
 * Given a `slug`, it also remembers the furthest point reached (lib/progress.ts), which feeds
 * the homepage's "Pick up where you left off" row.
 */
export default function ReadingProgress({ slug }: { slug?: string }) {
  const barRef = useRef<HTMLDivElement>(null)
  const furthest = useRef(0)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const doc = document.documentElement
      const end = document.querySelector('[data-reading-end]')
      // Done when the end of the writing reaches the lower part of the screen
      const max = end
        ? end.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.8
        : doc.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`
      }
      furthest.current = Math.max(furthest.current, progress)
      setShowTop(window.scrollY > SHOW_BACK_TO_TOP_AFTER)
    }

    // Persist rarely: every few seconds while reading, and when the reader leaves
    const save = () => { if (slug) saveProgress(slug, furthest.current) }
    const saveTimer = slug ? window.setInterval(save, 4000) : 0
    const onHide = () => { if (document.visibilityState === 'hidden') save() }
    furthest.current = 0

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', save)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', save)
      if (saveTimer) window.clearInterval(saveTimer)
      if (frame) cancelAnimationFrame(frame)
      save() // navigating away inside the site
    }
  }, [slug])

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
