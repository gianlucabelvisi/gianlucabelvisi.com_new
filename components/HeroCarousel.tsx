import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BsChevronCompactLeft, BsChevronCompactRight } from 'react-icons/bs'
import { PostData, PostSummary } from '../lib/posts'
import { formatDate, formatReadingTime } from '../lib/dateUtils'
import styles from './HeroCarousel.module.css'

interface HeroCarouselProps {
  posts: (PostData | PostSummary)[]
  autoAdvanceInterval?: number
}

export default function HeroCarousel({ posts, autoAdvanceInterval = 6000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  // Pause when the tab is hidden or the user prefers reduced motion
  const [isSuspended, setIsSuspended] = useState(false)

  // Touch swipe support using refs to avoid stale state
  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)
  const isTouchSwipeRef = useRef(false)

  // Take only the first 6 posts
  const carouselPosts = posts.slice(0, 6)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setIsSuspended(reduceMotion.matches || document.hidden)
    update()
    reduceMotion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      reduceMotion.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  const autoplayActive = carouselPosts.length > 1 && !isPaused && !isSuspended

  // Auto-advance carousel with smooth infinite loop
  useEffect(() => {
    if (!autoplayActive) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselPosts.length)
    }, autoAdvanceInterval)

    return () => clearInterval(interval)
  }, [autoAdvanceInterval, carouselPosts.length, autoplayActive])

  const nextSlide = () => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev + 1) % carouselPosts.length)
    
    setTimeout(() => setIsTransitioning(false), 600) // Match CSS transition duration
  }

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return

    setIsTransitioning(true)
    setCurrentIndex(index)

    setTimeout(() => setIsTransitioning(false), 600)
  }

  const prevSlide = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev - 1 + carouselPosts.length) % carouselPosts.length)
    setTimeout(() => setIsTransitioning(false), 600)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
    isTouchSwipeRef.current = false
    setIsPaused(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartXRef.current)
    const dy = Math.abs(e.touches[0].clientY - touchStartYRef.current)
    if (dx > dy && dx > 10) isTouchSwipeRef.current = true
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTouchSwipeRef.current) {
      setIsPaused(false)
      return
    }
    const dx = e.changedTouches[0].clientX - touchStartXRef.current
    if (dx < -40) {
      nextSlide()
    } else if (dx > 40) {
      prevSlide()
    }
    setIsPaused(false)
  }

  // Helper function to get feature image path
  const getFeatureImagePath = (post: PostData | PostSummary) => {
    const featureImage = post.frontmatter.featureImage || post.frontmatter.cardImage
    if (!featureImage) return '/images/placeholder-feature.jpg'
    
    // If featureImage is already an absolute path, return it as-is
    if (featureImage.startsWith('/')) {
      return featureImage
    }
    
    // Use imagePath (year-based structure) for co-located images
    return `/images/posts/${post.imagePath}/${featureImage}`
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextSlide()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prevSlide()
    }
  }

  if (!carouselPosts.length) return null

  return (
    <section
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured posts"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsPaused(false)
      }}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.carouselContainer}>
        <div 
          className={styles.slidesWrapper}
          style={{
            transform: `translateX(-${currentIndex * 16.666}%)`,
          }}
          aria-live={autoplayActive ? 'off' : 'polite'}
        >
          {carouselPosts.map((post, index) => (
            <div
              key={post.slug}
              className={`${styles.slide} ${index === currentIndex ? styles.active : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${carouselPosts.length}`}
              aria-hidden={index !== currentIndex}
            >
            <div className={styles.heroBackground}>
              <Image
                src={getFeatureImagePath(post)}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
              <div className={styles.heroGradient} />
            </div>
            
            <div className={styles.heroContent}>
              <div className={styles.heroText}>
                <h1 className={styles.heroTitle}>{post.frontmatter.title}</h1>
                <p className={styles.heroSubtitle}>{post.frontmatter.subTitle}</p>
                
                <div className={styles.heroMeta}>
                  <span className={styles.heroDate}>{formatDate(post.frontmatter.date)}</span>
                  <span className={styles.heroDivider}>•</span>
                  <span className={styles.heroDate}>{formatReadingTime(post.readingTime)}</span>
                  <span className={styles.heroAuthorGroup}>
                    <span className={styles.heroDivider}>•</span>
                    <span className={styles.heroAuthor}>by {post.frontmatter.author}</span>
                  </span>
                  {post.frontmatter.onHover && (
                    <>
                      <span className={styles.heroDivider}>•</span>
                      <span className={styles.heroEmoji}>{post.frontmatter.onHover}</span>
                    </>
                  )}
                </div>

                <div className={styles.heroActions}>
                  <Link
                    href={`/${post.slug}`}
                    className={styles.heroButton}
                    tabIndex={index === currentIndex ? 0 : -1}
                  >
                    <span className={styles.heroButtonIcon} aria-hidden="true">{'▶︎'}</span>
                    Read<span className={styles.heroButtonPost}> Post</span>
                  </Link>
                  
                  <div className={styles.heroTags}>
                    {post.frontmatter.hashtags && (
                      <span className={styles.heroTagsText}>
                        {post.frontmatter.hashtags.split(',').slice(0, 3).map(tag => tag.trim()).join(' • ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {carouselPosts.length > 1 && (
        <>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navPrev}`}
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <BsChevronCompactLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navNext}`}
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <BsChevronCompactRight aria-hidden="true" />
          </button>
        </>
      )}

      {/* Progress Dots */}
      <div className={styles.dotsContainer} role="tablist" aria-label="Choose slide">
        {carouselPosts.map((post, index) => (
          <button
            key={post.slug}
            type="button"
            role="tab"
            className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Slide ${index + 1}: ${post.frontmatter.title}`}
            aria-selected={index === currentIndex}
          >
            <span className={styles.dotProgress}>
              {index === currentIndex && autoplayActive && (
                <span
                  className={styles.dotProgressBar}
                  style={{
                    animationDuration: `${autoAdvanceInterval}ms`
                  }}
                  key={`progress-${currentIndex}`}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
