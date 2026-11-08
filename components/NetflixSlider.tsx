import React, { useRef, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BsChevronCompactLeft, BsChevronCompactRight } from 'react-icons/bs'
import { PostData, PostSummary } from '../lib/posts'
import styles from './NetflixSlider.module.css'

const ITEMS_PER_PAGE = 5

// Touch physics, tuned to feel like an iOS UIScrollView. Units are px and ms.
const DECELERATION_TAU = 325 // time constant of the momentum glide after a flick
const RUBBER_BAND_COEFF = 0.55 // iOS's rubber-band constant: resistance when pulled past an edge
const BOUNCE_OMEGA = 0.016 // spring stiffness pulling the row back from past an edge
const SETTLE_OMEGA = 0.013 // spring stiffness for snaps from rest and arrow-button scrolls
const MAX_EDGE_VELOCITY = 3 // caps how far a hard flick can overshoot an edge
const MAX_VELOCITY = 8
const VELOCITY_WINDOW = 100 // touch history used to estimate the release velocity
const CATCH_VELOCITY = 0.1 // a touch that lands on a row moving faster than this just stops it

// Frame clock, kept outside the component: only ever called from handlers and rAF
const now = () => performance.now()

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// Past an edge the row moves less and less per px of finger travel, approaching `dimension`
const rubberBand = (overflow: number, dimension: number) =>
  Math.sign(overflow) * (1 - 1 / ((Math.abs(overflow) * RUBBER_BAND_COEFF) / dimension + 1)) * dimension

const inverseRubberBand = (offset: number, dimension: number) => {
  const ratio = Math.min(Math.abs(offset) / dimension, 0.99)
  return Math.sign(offset) * (dimension / RUBBER_BAND_COEFF) * (1 / (1 - ratio) - 1)
}

type Motion = { mode: 'decay' } | { mode: 'spring'; target: number; omega: number }

interface NetflixSliderProps {
  title: string
  posts: (PostData | PostSummary)[]
  imagePath?: (post: PostData | PostSummary) => string
  /** Optional "See all" destination shown next to the title */
  moreHref?: string
  moreLabel?: string
}

export default function NetflixSlider({ title, posts, imagePath, moreHref, moreLabel = 'See all' }: NetflixSliderProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  const [maxTranslate, setMaxTranslate] = useState(0)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)

  // Use refs for drag state to avoid stale closure issues
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const directionRef = useRef<'none' | 'horizontal' | 'vertical'>('none')
  const wasHorizontalDragRef = useRef(false)
  // Live position is written straight to the DOM each frame; React state (translateX)
  // only catches up when the row comes to rest
  const positionRef = useRef(0)
  const targetRef = useRef(0)
  const velocityRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const dragStartRawRef = useRef(0)
  const samplesRef = useRef<{ t: number; x: number }[]>([])
  const boundsRef = useRef({ min: 0, width: 1 })
  const containerRef = useRef<HTMLElement>(null)
  const sliderWrapperRef = useRef<HTMLDivElement>(null)

  const sliderRef = useRef<HTMLDivElement>(null)

  const itemsPerPage = ITEMS_PER_PAGE
  const totalPages = Math.ceil(posts.length / itemsPerPage)

  // Card width + gap, measured from the DOM so it always matches the CSS breakpoints
  const getCardWidth = (): number => {
    const cards = sliderRef.current?.children
    if (cards && cards.length > 1) {
      return (cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft
    }
    return (cards?.[0] as HTMLElement | undefined)?.offsetWidth ?? 308
  }

  // Furthest (negative) translate: the row's real overflow beyond the visible width.
  // Measured rather than derived from a fixed cards-per-page count, so a row that
  // overflows (e.g. 5 cards on a phone that shows 2) can always be scrolled to its end.
  const getMaxTranslate = (): number => {
    const slider = sliderRef.current
    const wrapper = sliderWrapperRef.current
    if (!slider || !wrapper) return 0
    return Math.min(0, wrapper.clientWidth - slider.scrollWidth)
  }

  // Progress dot derived from the current translate position
  const currentPage = useMemo(() => {
    if (totalPages <= 1 || maxTranslate === 0) return 0
    const page = Math.round((translateX / maxTranslate) * (totalPages - 1))
    return Math.max(0, Math.min(page, totalPages - 1))
  }, [translateX, maxTranslate, totalPages])

  // Collapse expanded card when tapping outside the slider
  useEffect(() => {
    if (!expandedSlug) return
    const handler = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpandedSlug(null)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [expandedSlug])

  // React registers touchmove as passive; preventDefault needs a native listener
  useEffect(() => {
    const el = sliderWrapperRef.current
    if (!el) return
    const blockHorizontalBrowserScroll = (e: TouchEvent) => {
      if (isDraggingRef.current && directionRef.current === 'horizontal') {
        e.preventDefault()
      }
    }
    el.addEventListener('touchmove', blockHorizontalBrowserScroll, { passive: false })
    return () => el.removeEventListener('touchmove', blockHorizontalBrowserScroll)
  }, [])

  const setPosition = (x: number) => {
    positionRef.current = x
    if (sliderRef.current) sliderRef.current.style.transform = `translate3d(${x}px, 0, 0)`
  }

  const syncRestingState = (x: number) => {
    const max = getMaxTranslate()
    setMaxTranslate(max)
    setTranslateX(x)
    setCanScrollLeft(x < -1)
    setCanScrollRight(x > max + 1)
  }

  const stopMotion = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    velocityRef.current = 0
  }

  // Frame loop: 'decay' glides with exponentially falling velocity (only used when the
  // glide will run past an edge, where it hands over to a bounce spring); 'spring' is a
  // critically damped spring, solved in closed form per frame so it stays stable at any fps
  const runMotion = (initial: Motion, initialVelocity: number) => {
    stopMotion()
    let motion = initial
    let v = initialVelocity
    let last = now()
    const min = boundsRef.current.min
    if (motion.mode === 'spring') targetRef.current = motion.target

    const step = (frameTime: number) => {
      const dt = Math.min(frameTime - last, 32)
      last = frameTime
      let x = positionRef.current

      if (motion.mode === 'decay') {
        v *= Math.exp(-dt / DECELERATION_TAU)
        x += v * dt
        if (x > 0 || x < min) {
          const edge = x > 0 ? 0 : min
          motion = { mode: 'spring', target: edge, omega: BOUNCE_OMEGA }
          targetRef.current = edge
          v = clamp(v, -MAX_EDGE_VELOCITY, MAX_EDGE_VELOCITY)
        }
      } else {
        const { target, omega } = motion
        const c1 = x - target
        const c2 = v + omega * c1
        const decay = Math.exp(-omega * dt)
        x = target + (c1 + c2 * dt) * decay
        v = (c2 - omega * (c1 + c2 * dt)) * decay
        if (Math.abs(x - target) < 0.3 && Math.abs(v) < 0.01) {
          setPosition(target)
          stopMotion()
          syncRestingState(target)
          return
        }
      }

      setPosition(x)
      velocityRef.current = v
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // Finger lifted: bounce back if past an edge, glide into the edge if the flick carries
  // that far, otherwise glide to the card nearest where momentum would naturally stop
  const release = (velocity: number) => {
    const { min } = boundsRef.current
    const x = positionRef.current

    if (x > 0 || x < min) {
      runMotion({ mode: 'spring', target: x > 0 ? 0 : min, omega: BOUNCE_OMEGA }, clamp(velocity, -MAX_EDGE_VELOCITY, MAX_EDGE_VELOCITY))
      return
    }

    const projected = x + velocity * DECELERATION_TAU
    if (projected > 0 || projected < min) {
      runMotion({ mode: 'decay' }, velocity)
      return
    }

    const cardWidth = getCardWidth()
    const target = clamp(Math.round(projected / cardWidth) * cardWidth, min, 0)
    const distance = target - x
    // Matching omega to velocity/distance makes the spring a pure exponential glide that
    // lands exactly on the card, so the snap feels like natural deceleration
    const omega = Math.abs(distance) > 1 && Math.sign(distance) === Math.sign(velocity)
      ? clamp(Math.abs(velocity / distance), 0.0025, 0.02)
      : SETTLE_OMEGA
    runMotion({ mode: 'spring', target, omega }, velocity)
  }

  const applyTranslate = (value: number) => {
    const max = getMaxTranslate()
    const target = clamp(value, max, 0)
    boundsRef.current = { min: max, width: sliderWrapperRef.current?.clientWidth || 1 }
    syncRestingState(target)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stopMotion()
      setPosition(target)
      targetRef.current = target
      return
    }
    runMotion({ mode: 'spring', target, omega: SETTLE_OMEGA }, velocityRef.current)
  }

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      stopMotion()
      setPosition(0)
      targetRef.current = 0
      syncRestingState(0)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [posts.length])

  useEffect(() => stopMotion, [])

  const scrollLeft = () => applyTranslate(targetRef.current + getCardWidth())
  const scrollRight = () => applyTranslate(targetRef.current - getCardWidth())

  // Jump to a page from the progress dots
  const goToPage = (page: number) => {
    applyTranslate(-page * itemsPerPage * getCardWidth())
  }

  // Keep a keyboard-focused card inside the visible window
  const ensureCardVisible = (index: number) => {
    if (getMaxTranslate() === 0) return
    const cardWidth = getCardWidth()
    const visibleCount = Math.max(1, Math.floor((sliderWrapperRef.current?.clientWidth ?? 0) / cardWidth))
    const firstVisible = Math.round(-targetRef.current / cardWidth)
    const lastVisible = firstVisible + visibleCount - 1
    if (index < firstVisible) {
      applyTranslate(-index * cardWidth)
    } else if (index > lastVisible) {
      applyTranslate(-(index - visibleCount + 1) * cardWidth)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && canScrollRight) {
      e.preventDefault()
      scrollRight()
    } else if (e.key === 'ArrowLeft' && canScrollLeft) {
      e.preventDefault()
      scrollLeft()
    }
  }

  const toDisplayed = (raw: number) => {
    const { min, width } = boundsRef.current
    if (raw > 0) return rubberBand(raw, width)
    if (raw < min) return min + rubberBand(raw - min, width)
    return raw
  }

  const toRaw = (shown: number) => {
    const { min, width } = boundsRef.current
    if (shown > 0) return inverseRubberBand(shown, width)
    if (shown < min) return min + inverseRubberBand(shown - min, width)
    return shown
  }

  const releaseVelocity = () => {
    const t = now()
    const samples = samplesRef.current.filter((s) => t - s.t <= VELOCITY_WINDOW)
    if (samples.length < 2) return 0
    const first = samples[0]
    const last = samples[samples.length - 1]
    // Finger paused before lifting: no fling
    if (t - last.t > 50 || last.t === first.t) return 0
    return clamp((last.x - first.x) / (last.t - first.t), -MAX_VELOCITY, MAX_VELOCITY)
  }

  // Touch handlers: detect direction so vertical swipes scroll the page natively
  const handleTouchStart = (e: React.TouchEvent) => {
    // Touching a gliding row stops it dead (like iOS); that touch must not also open a card
    const wasGliding = rafRef.current !== null && Math.abs(velocityRef.current) > CATCH_VELOCITY
    stopMotion()

    isDraggingRef.current = true
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    directionRef.current = 'none'
    wasHorizontalDragRef.current = wasGliding
    boundsRef.current = { min: getMaxTranslate(), width: sliderWrapperRef.current?.clientWidth || 1 }
    dragStartRawRef.current = toRaw(positionRef.current)
    samplesRef.current = [{ t: now(), x: positionRef.current }]
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return

    const dx = e.touches[0].clientX - startXRef.current
    const dy = e.touches[0].clientY - startYRef.current

    if (directionRef.current === 'none') {
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (adx > 8 || ady > 8) {
        directionRef.current = adx > ady ? 'horizontal' : 'vertical'
        if (directionRef.current === 'horizontal') setExpandedSlug(null)
      }
    }

    if (directionRef.current === 'horizontal') {
      wasHorizontalDragRef.current = true
      const x = toDisplayed(dragStartRawRef.current + dx)
      setPosition(x)
      const t = now()
      samplesRef.current.push({ t, x })
      while (samplesRef.current.length > 2 && t - samplesRef.current[0].t > VELOCITY_WINDOW) {
        samplesRef.current.shift()
      }
    } else if (directionRef.current === 'vertical') {
      // Let the browser handle vertical scrolling; settle a row caught mid-glide
      isDraggingRef.current = false
      release(0)
    }
  }

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    release(directionRef.current === 'horizontal' ? releaseVelocity() : 0)
  }

  const handleCardClick = (e: React.MouseEvent, slug: string) => {
    // Suppress navigation if the tap was actually a horizontal drag
    if (wasHorizontalDragRef.current) {
      e.preventDefault()
      wasHorizontalDragRef.current = false
      return
    }
    // Two-tap behavior on touch devices: first tap expands, second tap navigates
    const isTouchDevice =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none)').matches
    if (isTouchDevice && expandedSlug !== slug) {
      e.preventDefault()
      setExpandedSlug(slug)
    }
  }

  const getCardImagePath = (post: PostData | PostSummary) => {
    if (imagePath) return imagePath(post)
    if (!post.frontmatter.cardImage) return '/images/placeholder-card.jpg'
    if (post.frontmatter.cardImage.startsWith('/')) return post.frontmatter.cardImage
    return `/images/posts/${post.imagePath}/${post.frontmatter.cardImage}`
  }

  if (!posts || posts.length === 0) return null

  return (
    <section className={styles.sliderContainer} ref={containerRef} aria-label={title}>
      <div className={styles.sliderHeader}>
        <div className={styles.sliderTitleGroup}>
          <h2 className={styles.sliderTitle}>{title}</h2>
          {moreHref && (
            <Link href={moreHref} className={styles.moreLink}>
              {moreLabel} <span aria-hidden="true">›</span>
            </Link>
          )}
        </div>
        {totalPages > 1 && (
          <div className={styles.progressBar} role="tablist" aria-label={`${title} pages`}>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={index === currentPage}
                aria-label={`Page ${index + 1} of ${totalPages}`}
                className={`${styles.progressDot} ${index === currentPage ? styles.activeDot : ''}`}
                onClick={() => goToPage(index)}
              />
            ))}
          </div>
        )}
      </div>

      <div
        ref={sliderWrapperRef}
        className={styles.sliderWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onKeyDown={handleKeyDown}
      >
        {!isMobile && canScrollLeft && (
          <button
            className={`${styles.sliderButton} ${styles.leftButton}`}
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <BsChevronCompactLeft className={styles.sliderButtonIcon} />
          </button>
        )}

        <div
          ref={sliderRef}
          className={styles.slider}
        >
          {posts.map((post, index) => {
            const isLast = index >= posts.length - 2
            const isExpanded = expandedSlug === post.slug
            return (
              <Link
                key={post.slug}
                href={`/${post.slug}`}
                className={`${styles.cardLink} ${isLast ? styles.lastCard : ''} ${isExpanded ? styles.expandedLink : ''}`}
                onClick={(e) => handleCardClick(e, post.slug)}
                onFocus={() => ensureCardVisible(index)}
                aria-label={`${post.frontmatter.title} — ${post.frontmatter.subTitle}`}
              >
                <div className={`${styles.card} ${isExpanded ? styles.enlargedCard : ''}`}>
                  <div className={styles.cardImageWrapper}>
                    <Image
                      src={getCardImagePath(post)}
                      alt=""
                      fill
                      sizes="(max-width: 360px) 160px, (max-width: 480px) 175px, (max-width: 1200px) 280px, 300px"
                      style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
                    />
                    <div className={styles.cardOverlay}>
                      <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>{post.frontmatter.title}</h3>
                        <p className={styles.cardSubtitle}>{post.frontmatter.subTitle}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {!isMobile && canScrollRight && (
          <button
            className={`${styles.sliderButton} ${styles.rightButton}`}
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            <BsChevronCompactRight className={styles.sliderButtonIcon} />
          </button>
        )}
      </div>
    </section>
  )
}
