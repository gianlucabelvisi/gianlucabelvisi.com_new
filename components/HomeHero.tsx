import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, TouchEvent } from 'react'
import Link from 'next/link'
import { getImageProps } from 'next/image'
import { FiArrowRight } from 'react-icons/fi'
import type { PostSummary } from '../lib/posts'
import { parseHashtags } from '../lib/hashtags'
import { formatDate } from '../lib/dateUtils'
import styles from './HomeHero.module.css'

interface HomeHeroProps {
  /** Newest first. The first few become the slides. */
  posts: PostSummary[]
  interval?: number
}

const SLIDES = 5

const resolve = (post: PostSummary, image?: string) =>
  !image ? null : image.startsWith('/') ? image : `/images/posts/${post.imagePath}/${image}`

/**
 * The top of the homepage: the latest posts, one at a time, cross-fading.
 * A rounded stage on desktop; on phones a full-bleed poster (using each post's featureImagePhone) with
 * story-style segments at the top. Swipe, arrow keys or the segments change slide; it advances on its own
 * unless the reader is hovering, has focus inside, hid the tab, or prefers reduced motion.
 */
export default function HomeHero({ posts, interval = 7000 }: HomeHeroProps) {
  const slides = posts.slice(0, SLIDES)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [suspended, setSuspended] = useState(false)
  const touch = useRef({ x: 0, y: 0, swiping: false })

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSuspended(reduceMotion.matches || document.hidden)
    update()
    reduceMotion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      reduceMotion.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  const autoplay = slides.length > 1 && !paused && !suspended

  useEffect(() => {
    if (!autoplay) return
    const timer = setTimeout(() => setIndex(i => (i + 1) % slides.length), interval)
    return () => clearTimeout(timer)
  }, [autoplay, index, interval, slides.length])

  const go = (delta: number) => setIndex(i => (i + delta + slides.length) % slides.length)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  }

  const onTouchStart = (e: TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, swiping: false }
    setPaused(true)
  }
  const onTouchMove = (e: TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touch.current.x)
    const dy = Math.abs(e.touches[0].clientY - touch.current.y)
    if (dx > dy && dx > 10) touch.current.swiping = true
  }
  const onTouchEnd = (e: TouchEvent) => {
    setPaused(false)
    if (!touch.current.swiping) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    if (dx < -40) go(1)
    else if (dx > 40) go(-1)
  }

  if (slides.length === 0) return null

  return (
    <section
      className={styles.hero}
      aria-roledescription="carousel"
      aria-label="Latest posts"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false) }}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.stage} aria-live={autoplay ? 'off' : 'polite'}>
        {slides.map((post, i) => {
          const active = i === index
          const { title, subTitle, date, featureImage, featureImagePhone, cardImage, hashtags } = post.frontmatter
          const wide = resolve(post, featureImage || cardImage)
          const tall = resolve(post, featureImagePhone) ?? wide
          const eager = i === 0
          const shared = { alt: '', fill: true, sizes: '100vw', priority: eager } as const
          const wideProps = wide ? getImageProps({ ...shared, src: wide }).props : null
          const tallProps = tall ? getImageProps({ ...shared, src: tall }).props : null
          const tags = parseHashtags(hashtags).slice(0, 3)

          return (
            <article
              key={post.slug}
              className={`${styles.slide} ${active ? styles.active : ''}`}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              aria-hidden={!active}
              inert={!active}
            >
              {wideProps && (
                <picture className={styles.image}>
                  {tallProps && <source media="(max-width: 700px)" srcSet={tallProps.srcSet} sizes="100vw" />}
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes with the props from next/image's getImageProps (art direction needs <picture>) */}
                  <img {...wideProps} />
                </picture>
              )}
              <div className={styles.shade} />

              <div className={styles.copy}>
                <p className={styles.kicker}>
                  <span className={styles.kickerLabel}>{i === 0 ? 'Latest' : 'Recently'}</span>
                  <time dateTime={date}>{formatDate(date)}</time>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingTime} min read</span>
                </p>
                <h2 className={styles.title}>
                  <Link href={`/${post.slug}`}>{title}</Link>
                </h2>
                <p className={styles.sub}>{subTitle}</p>
                <div className={styles.actions}>
                  <Link href={`/${post.slug}`} className={styles.read} aria-label={`Read: ${title}`}>
                    Read <FiArrowRight aria-hidden="true" />
                  </Link>
                  {tags.length > 0 && <span className={styles.tags}>{tags.join(' · ')}</span>}
                </div>
              </div>
            </article>
          )
        })}

        {slides.length > 1 && (
          <div className={styles.pager} role="tablist" aria-label="Choose a post">
            {slides.map((post, i) => (
              <button
                key={post.slug}
                type="button"
                role="tab"
                className={`${styles.segment} ${i === index ? styles.segmentOn : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}: ${post.frontmatter.title}`}
                aria-selected={i === index}
              >
                <span className={styles.segmentTrack}>
                  {i === index && (
                    <span
                      key={`${index}-${autoplay}`}
                      className={`${styles.segmentFill} ${autoplay ? styles.segmentRun : ''}`}
                      style={{ animationDuration: `${interval}ms` }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
