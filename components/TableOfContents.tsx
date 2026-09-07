import { useEffect, useRef, useState } from 'react'
import type { Heading } from '../lib/headings'
import styles from './TableOfContents.module.css'

interface TableOfContentsProps {
  headings: Heading[]
  /**
   * sidebar — always-open, docs-style list meant for the empty column beside the post (wide screens)
   * inline  — collapsible "In this post" toggle placed in the content flow (narrow screens)
   */
  variant?: 'sidebar' | 'inline'
  /** Only render when there are at least this many headings */
  minHeadings?: number
}

/** Distance from the viewport top at which a heading counts as "reached" (fixed header + breathing room) */
const ACTIVATION_OFFSET = 96

/**
 * Which section is the reader in? The last heading whose top has scrolled past
 * the header line. Before the first heading, the first one is highlighted so the
 * list never looks inert. Scroll-driven (rAF-throttled) rather than an
 * IntersectionObserver so long sections stay highlighted while you read them.
 */
function useActiveHeading(headings: Heading[], enabled: boolean): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const elements = headings
      .map(h => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    let frame = 0
    const update = () => {
      frame = 0
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      let current = elements[0].id
      if (scrolledToBottom) {
        current = elements[elements.length - 1].id
      } else {
        for (const el of elements) {
          if (el.getBoundingClientRect().top <= ACTIVATION_OFFSET) current = el.id
          else break
        }
      }
      setActiveId(current)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [headings, enabled])

  return activeId
}

const LEVEL_CLASS = [styles.level0, styles.level1, styles.level2]

export default function TableOfContents({ headings, variant = 'inline', minHeadings = 3 }: TableOfContentsProps) {
  const enabled = headings.length >= minHeadings
  const activeId = useActiveHeading(headings, enabled)
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  // If the sidebar list itself scrolls (very long posts), keep the active entry in view
  useEffect(() => {
    const list = listRef.current
    if (!list || !activeId || list.scrollHeight <= list.clientHeight) return
    const link = list.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`)
    if (!link) return
    const top = link.offsetTop - list.offsetTop
    const bottom = top + link.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top - 8
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 8
  }, [activeId])

  if (!enabled) return null

  const items = (onPick?: () => void) =>
    headings.map(h => (
      <li key={h.id} className={LEVEL_CLASS[h.level] ?? styles.level2}>
        <a
          href={`#${h.id}`}
          className={`${styles.link} ${activeId === h.id ? styles.active : ''}`}
          aria-current={activeId === h.id ? 'location' : undefined}
          onClick={onPick}
        >
          {h.text}
        </a>
      </li>
    ))

  if (variant === 'sidebar') {
    return (
      <nav className={styles.sidebar} aria-label="Table of contents">
        <p className={styles.sidebarLabel}>In this post</p>
        <ol ref={listRef} className={styles.sidebarList}>{items()}</ol>
      </nav>
    )
  }

  return (
    <nav className={styles.inline} aria-label="Table of contents">
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="toc-list"
      >
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">›</span>
        <span>In this post</span>
        <span className={styles.count}>{headings.length}</span>
      </button>
      <ol id="toc-list" className={`${styles.list} ${open ? styles.listOpen : ''}`}>
        {items(() => setOpen(false))}
      </ol>
    </nav>
  )
}
