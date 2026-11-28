import Link from 'next/link'
import Image from 'next/image'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { CardPost, getCardImage } from '../PostCard'
import { formatDateShort } from '../../lib/dateUtils'
import { countLabel, SeriesShelfItem } from '../../lib/series'
import type { Caption } from '../../lib/captions'
import type { Project } from '../../lib/projects'
import styles from './Cards.module.css'

/**
 * The card shapes of the homepage rows. One shape per kind of thing, so a row tells you what it holds at a glance:
 *   ReadCard    landscape   a post
 *   SeriesCard  poster      several posts that belong together
 *   ProjectCard wide, sea   something you walk through instead of read
 *   CaptionCard paper slip  a figure caption out of context, linking to its spot in the post
 */

interface ReadCardProps {
  post: CardPost
  /** 0..1 reading progress; draws the bar */
  progress?: number
  /** Replaces the "date · minutes" line */
  meta?: ReactNode
  priority?: boolean
}

export function ReadCard({ post, progress, meta, priority = false }: ReadCardProps) {
  const image = getCardImage(post)
  const { title, date, onHover } = post.frontmatter
  return (
    <Link href={`/${post.slug}`} className={`${styles.card} ${styles.read}`}>
      {/* data-vt-image: this thumbnail grows into the post's hero on the way in (lib/viewTransitions.ts) */}
      <span className={styles.thumb} data-vt-image>
        {image ? (
          <Image src={image} alt="" fill priority={priority} sizes="(max-width: 700px) 62vw, 300px" />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">{onHover || '📝'}</span>
        )}
        {onHover && image && <span className={styles.emoji} aria-hidden="true">{onHover}</span>}
        {progress !== undefined && progress > 0 && (
          <span className={styles.progress} role="img" aria-label={`${Math.round(progress * 100)}% read`}>
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        )}
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.meta}>
        {meta ?? (
          <>
            <time dateTime={date}>{formatDateShort(date)}</time>
            <span aria-hidden="true"> · </span>
            {post.readingTime} min
          </>
        )}
      </span>
    </Link>
  )
}

interface SeriesCardProps {
  series: SeriesShelfItem
  /** Opens the series sheet. Without JavaScript the card is a plain link to the first part. */
  onOpen: (series: SeriesShelfItem) => void
}

export function SeriesCard({ series, onOpen }: SeriesCardProps) {
  const open = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onOpen(series)
  }
  const typographic = series.mark !== null || !series.image
  return (
    <a
      href={`/${series.parts[0].slug}`}
      onClick={open}
      className={`${styles.card} ${styles.poster} ${typographic ? styles.posterType : ''}`}
      style={{ '--accent': series.accent } as CSSProperties}
      aria-haspopup="dialog"
    >
      <span className={styles.thumb}>
        {typographic ? (
          <span className={styles.mark} aria-hidden="true">{series.mark ?? series.title.slice(0, 2)}</span>
        ) : (
          <Image src={series.image as string} alt="" fill sizes="(max-width: 700px) 40vw, 200px" />
        )}
        <span className={styles.posterLabel}>
          <span className={styles.posterTitle}>{series.title}</span>
          <span className={styles.posterCount}>{countLabel(series.parts.length, series.unit)}</span>
        </span>
      </span>
    </a>
  )
}

interface ProjectCardProps {
  project: Project
  onOpen: (project: Project) => void
}

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const open = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onOpen(project)
  }
  return (
    <Link href={project.href} onClick={open} className={`${styles.card} ${styles.project}`} aria-haspopup="dialog">
      <span className={styles.thumb}>
        <Image src={project.image} alt="" fill sizes="(max-width: 700px) 78vw, 380px" />
        <span className={styles.badge}><span className={styles.dot} aria-hidden="true" />{project.kicker}</span>
      </span>
      <span className={styles.title}>{project.title}</span>
      <span className={styles.meta}>{project.verbs.join(' · ')}</span>
    </Link>
  )
}

export function CaptionCard({ caption }: { caption: Caption }) {
  return (
    <Link href={`/${caption.slug}#${caption.anchor}`} className={`${styles.card} ${styles.caption}`}>
      <span className={styles.thumb}>
        <Image src={caption.image} alt="" fill sizes="(max-width: 700px) 60vw, 260px" />
      </span>
      <span className={styles.captionText}>{caption.text}</span>
      <span className={styles.captionFrom}>{caption.postTitle}</span>
    </Link>
  )
}
