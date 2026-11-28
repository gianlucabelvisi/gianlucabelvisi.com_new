import { useEffect, useRef } from 'react'
import type { CSSProperties, MouseEvent, TouchEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiArrowRight, FiCheck, FiX } from 'react-icons/fi'
import { countLabel, SeriesShelfItem } from '../lib/series'
import type { Project } from '../lib/projects'
import { FINISHED, STARTED } from '../lib/progress'
import { useProgress } from '../lib/useProgress'
import styles from './TitleSheet.module.css'

export interface ProjectStory {
  slug: string
  title: string
  readingTime: number
}

export type SheetItem =
  | { kind: 'series'; series: SeriesShelfItem }
  | { kind: 'project'; project: Project; story: ProjectStory | null }

interface TitleSheetProps {
  item: SheetItem | null
  onClose: () => void
}

const DISMISS_DISTANCE = 110 // px dragged down before letting go closes the sheet

/**
 * The preview that slides up when a series or a project is tapped: what it is, where to start, what's inside.
 * A bottom sheet on phones (drag it down to dismiss), a centred card on larger screens.
 * Built on <dialog>, which brings the focus trap, Escape and the backdrop for free.
 */
export default function TitleSheet({ item, onClose }: TitleSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; dy: number; active: boolean }>({ startY: 0, dy: 0, active: false })
  const progress = useProgress()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) {
      dialog.showModal()
      // Start focus on the sheet itself rather than on its close button
      panelRef.current?.focus({ preventScroll: true })
      // showModal doesn't stop the page behind from scrolling
      document.documentElement.style.overflow = 'hidden'
    } else if (!item && dialog.open) {
      dialog.close()
    }
    return () => { document.documentElement.style.overflow = '' }
  }, [item])

  // A click on the backdrop lands on the <dialog> itself
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  // Drag down to dismiss, only when the sheet's own content is scrolled to the top
  const onTouchStart = (e: TouchEvent) => {
    const panel = panelRef.current
    if (!panel || panel.scrollTop > 0 || !window.matchMedia('(max-width: 700px)').matches) return
    drag.current = { startY: e.touches[0].clientY, dy: 0, active: true }
  }
  const onTouchMove = (e: TouchEvent) => {
    const d = drag.current
    const panel = panelRef.current
    if (!d.active || !panel) return
    d.dy = e.touches[0].clientY - d.startY
    if (d.dy <= 0) {
      panel.style.transform = ''
      return
    }
    panel.style.transition = 'none'
    panel.style.transform = `translateY(${d.dy}px)`
  }
  const onTouchEnd = () => {
    const d = drag.current
    const panel = panelRef.current
    if (!d.active || !panel) return
    d.active = false
    panel.style.transition = ''
    panel.style.transform = ''
    if (d.dy > DISMISS_DISTANCE) onClose()
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose} onClick={onBackdrop} aria-labelledby="sheet-title">
      {item && (
        <div
          ref={panelRef}
          className={styles.panel}
          tabIndex={-1}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <span className={styles.grab} aria-hidden="true" />
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <FiX aria-hidden="true" />
          </button>

          {item.kind === 'series' ? (
            <SeriesBody series={item.series} progress={progress} />
          ) : (
            <ProjectBody project={item.project} story={item.story} />
          )}
        </div>
      )}
    </dialog>
  )
}

function SeriesBody({ series, progress }: { series: SeriesShelfItem; progress: ReturnType<typeof useProgress> }) {
  const done = (slug: string) => (progress[slug]?.p ?? 0) >= FINISHED
  // Where to send the reader: the part they're in the middle of, else the first one they haven't finished
  const current = series.parts.find(p => {
    const v = progress[p.slug]?.p ?? 0
    return v >= STARTED && v < FINISHED
  })
  const next = current ?? series.parts.find(p => !done(p.slug)) ?? series.parts[0]
  const nextIndex = series.parts.indexOf(next)
  const started = series.parts.some(p => (progress[p.slug]?.p ?? 0) >= STARTED)
  const serial = series.kind === 'serial'

  const cta = !started
    ? serial ? `Start with ${series.unit} 1` : 'Start reading'
    : current ? 'Keep reading' : serial ? `On to ${series.unit} ${nextIndex + 1}` : 'Read the next one'

  return (
    <>
      <div
        className={`${styles.cover} ${series.mark || !series.image ? styles.coverType : ''}`}
        style={{ '--accent': series.accent } as CSSProperties}
      >
        {series.mark || !series.image ? (
          <span className={styles.coverMark} aria-hidden="true">{series.mark ?? series.title.slice(0, 2)}</span>
        ) : (
          <Image src={series.image} alt="" fill sizes="(max-width: 700px) 100vw, 640px" />
        )}
      </div>

      <div className={styles.body}>
        <p className={styles.kicker} style={{ color: series.accent }}>
          {serial ? 'Series' : 'Collection'} · {countLabel(series.parts.length, series.unit)} · {series.minutes} min in all
        </p>
        <h2 id="sheet-title" className={styles.title}>{series.title}</h2>
        {series.tagline && <p className={styles.tagline}>{series.tagline}</p>}

        <div className={styles.actions}>
          <Link href={`/${next.slug}`} className={`${styles.button} ${styles.primary}`}>
            {cta} <FiArrowRight aria-hidden="true" />
          </Link>
        </div>

        <ol className={styles.parts}>
          {series.parts.map((part, i) => {
            const value = progress[part.slug]?.p ?? 0
            const finished = value >= FINISHED
            return (
              <li key={part.slug}>
                <Link href={`/${part.slug}`} className={styles.part}>
                  <span className={`${styles.number} ${finished ? styles.numberDone : ''}`} aria-hidden="true">
                    {finished ? <FiCheck /> : i + 1}
                  </span>
                  <span className={styles.partText}>
                    <span className={styles.partTitle}>{part.title}</span>
                    {part.subTitle && <span className={styles.partSub}>{part.subTitle}</span>}
                    {value >= STARTED && !finished && (
                      <span className={styles.partBar} role="img" aria-label={`${Math.round(value * 100)}% read`}>
                        <span style={{ width: `${Math.round(value * 100)}%` }} />
                      </span>
                    )}
                  </span>
                  <span className={styles.partTime}>{finished ? 'Read' : `${part.readingTime} min`}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}

function ProjectBody({ project, story }: { project: Project; story: ProjectStory | null }) {
  return (
    <>
      <div className={styles.cover}>
        <Image src={project.image} alt="" fill sizes="(max-width: 700px) 100vw, 640px" />
      </div>

      <div className={styles.body}>
        <p className={`${styles.kicker} ${styles.sea}`}>
          <span className={styles.dot} aria-hidden="true" />Project · {project.kicker}
        </p>
        <h2 id="sheet-title" className={styles.title}>{project.title}</h2>
        <p className={styles.tagline}>{project.blurb}</p>

        <div className={styles.actions}>
          <Link href={project.href} className={`${styles.button} ${styles.primary}`}>
            {project.enter} <FiArrowRight aria-hidden="true" />
          </Link>
          {story && (
            <Link href={`/${story.slug}`} className={`${styles.button} ${styles.secondary}`}>
              Read the story
            </Link>
          )}
        </div>

        <ul className={styles.verbs} aria-label="What you can do there">
          {project.verbs.map(v => <li key={v}>{v}</li>)}
        </ul>

        {story && (
          <Link href={`/${story.slug}`} className={styles.story}>
            <span className={styles.storyKicker}>The story behind it</span>
            <span className={styles.partTitle}>{story.title}</span>
            <span className={styles.partTime}>{story.readingTime} min read</span>
          </Link>
        )}
      </div>
    </>
  )
}
