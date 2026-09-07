import React, { useRef, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BsChevronCompactLeft, BsChevronCompactRight } from 'react-icons/bs'
import { PostData, PostSummary } from '../lib/posts'
import styles from './NetflixSlider.module.css'

const ITEMS_PER_PAGE = 5

// Card width + gap at the current viewport, matching the CSS breakpoints
function getCardWidth(): number {
  if (typeof window === 'undefined') return 308
  const width = window.innerWidth
  if (width <= 360) return 168  // 160px + 8px gap (0.5rem)
  if (width <= 480) return 183  // 175px + 8px gap (0.5rem)
  if (width <= 768) return 258  // 250px + 8px gap (0.5rem)
  if (width <= 900) return 258  // 250px + 8px gap
  if (width <= 1200) return 288 // 280px + 8px gap
  return 308                    // 300px + 8px gap
}

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
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)

  // Use refs for drag state to avoid stale closure issues
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const directionRef = useRef<'none' | 'horizontal' | 'vertical'>('none')
  const wasHorizontalDragRef = useRef(false)
  const containerRef = useRef<HTMLElement>(null)

  const itemsPerPage = ITEMS_PER_PAGE
  const totalPages = Math.ceil(posts.length / itemsPerPage)

  // Progress dot derived from the current translate position
  const currentPage = useMemo(() => {
    if (posts.length <= itemsPerPage || totalPages <= 1) return 0
    const cardWidth = getCardWidth()
    const maxTranslate = (posts.length - itemsPerPage) * cardWidth
    const scrollPercentage = Math.abs(translateX) / maxTranslate
    const page = Math.round(scrollPercentage * (totalPages - 1))
    return Math.max(0, Math.min(page, totalPages - 1))
  }, [translateX, posts.length, totalPages, itemsPerPage])

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      setTranslateX(0)
      setCanScrollLeft(false)
      setCanScrollRight(posts.length > itemsPerPage)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [posts.length, itemsPerPage])

  const scrollLeft = () => {
    const cardWidth = getCardWidth()
    const newTranslateX = Math.min(translateX + cardWidth, 0)
    setTranslateX(newTranslateX)
    setCanScrollLeft(newTranslateX < 0)
    setCanScrollRight(newTranslateX > -(posts.length - itemsPerPage) * cardWidth)
  }

  const scrollRight = () => {
    const cardWidth = getCardWidth()
    const maxTranslate = -(posts.length - itemsPerPage) * cardWidth
    const newTranslateX = Math.max(translateX - cardWidth, maxTranslate)
    setTranslateX(newTranslateX)
    setCanScrollLeft(newTranslateX < 0)
    setCanScrollRight(newTranslateX > maxTranslate)
  }

  const applyTranslate = (value: number) => {
    const cardWidth = getCardWidth()
    const maxTranslate = -(Math.max(0, posts.length - itemsPerPage)) * cardWidth
    const clamped = Math.max(Math.min(value, 0), maxTranslate)
    setTranslateX(clamped)
    setCanScrollLeft(clamped < 0)
    setCanScrollRight(clamped > maxTranslate)
  }

  // Jump to a page from the progress dots
  const goToPage = (page: number) => {
    applyTranslate(-page * itemsPerPage * getCardWidth())
  }

  // Keep a keyboard-focused card inside the visible window
  const ensureCardVisible = (index: number) => {
    if (posts.length <= itemsPerPage) return
    const cardWidth = getCardWidth()
    const firstVisible = Math.round(-translateX / cardWidth)
    const lastVisible = firstVisible + itemsPerPage - 1
    if (index < firstVisible) {
      applyTranslate(-index * cardWidth)
    } else if (index > lastVisible) {
      applyTranslate(-(index - itemsPerPage + 1) * cardWidth)
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

  // Touch handlers: detect direction so vertical swipes scroll the page natively
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true
    setIsDragging(true)
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    directionRef.current = 'none'
    wasHorizontalDragRef.current = false
    setDragOffset(0)
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
      }
    }

    if (directionRef.current === 'horizontal') {
      wasHorizontalDragRef.current = true
      setDragOffset(dx)
    } else if (directionRef.current === 'vertical') {
      // Let the browser handle vertical scrolling
      isDraggingRef.current = false
      setIsDragging(false)
      setDragOffset(0)
    }
  }

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)

    const threshold = 30
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && canScrollLeft) {
        scrollLeft()
      } else if (dragOffset < 0 && canScrollRight) {
        scrollRight()
      }
    }
    setDragOffset(0)
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
        className={styles.sliderWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          className={styles.slider}
          style={{
            transform: `translateX(${translateX + (isDragging ? dragOffset : 0)}px)`,
            transition: isDragging ? 'none' : 'transform 300ms ease-out',
          }}
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
