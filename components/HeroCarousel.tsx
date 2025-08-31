import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { PostData } from '../lib/posts'
import { formatDate } from '../lib/dateUtils'
import styles from './HeroCarousel.module.css'

interface HeroCarouselProps {
  posts: PostData[]
  autoAdvanceInterval?: number
}

export default function HeroCarousel({ posts, autoAdvanceInterval = 6000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Take only the first 6 posts
  const carouselPosts = posts.slice(0, 6)

  // Auto-advance carousel with smooth infinite loop
  useEffect(() => {
    if (carouselPosts.length <= 1 || isPaused) return // Don't auto-advance if paused or only one slide

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1
        console.log(`Auto-advancing from ${prev} to ${nextIndex}`) // Debug log
        
        // If we've reached the end, we'll handle the loop in a separate effect
        if (nextIndex >= carouselPosts.length) {
          return 0 // Reset to first slide
        }
        
        return nextIndex
      })
    }, autoAdvanceInterval)

    return () => clearInterval(interval)
  }, [autoAdvanceInterval, carouselPosts.length, isPaused])

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

  // Helper function to get feature image path
  const getFeatureImagePath = (post: PostData) => {
    const featureImage = post.frontmatter.featureImage || post.frontmatter.cardImage
    if (!featureImage) return '/images/placeholder-feature.jpg'
    
    // If featureImage is already an absolute path, return it as-is
    if (featureImage.startsWith('/')) {
      return featureImage
    }
    
    // Use imagePath (year-based structure) for co-located images
    return `/images/posts/${post.imagePath}/${featureImage}`
  }

  if (!carouselPosts.length) return null

  return (
    <div 
      className={styles.carousel}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.carouselContainer}>
        <div 
          className={styles.slidesWrapper}
          style={{
            transform: `translateX(-${currentIndex * 16.666}%)`,
          }}
        >
          {carouselPosts.map((post, index) => (
            <div
              key={post.slug}
              className={`${styles.slide} ${index === currentIndex ? styles.active : ''}`}
            >
            <div className={styles.heroBackground}>
              <img
                src={getFeatureImagePath(post)}
                alt={post.frontmatter.title}
                className={styles.heroImage}
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
                  <span className={styles.heroAuthor}>by {post.frontmatter.author}</span>
                  {post.frontmatter.onHover && (
                    <>
                      <span className={styles.heroDivider}>•</span>
                      <span className={styles.heroEmoji}>{post.frontmatter.onHover}</span>
                    </>
                  )}
                </div>
                
                <div className={styles.heroActions}>
                  <Link href={`/${post.slug}`} className={styles.heroButton}>
                    <span className={styles.heroButtonIcon}>▶</span>
                    Read Post
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

      {/* Progress Dots */}
      <div className={styles.dotsContainer}>
        {carouselPosts.map((_, index) => (
          <button
            key={index}
            className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          >
            <div className={styles.dotProgress}>
              {index === currentIndex && (
                <div 
                  className={styles.dotProgressBar}
                  style={{
                    animationDuration: `${autoAdvanceInterval}ms`
                  }}
                  key={`progress-${currentIndex}-${Date.now()}`} // Force re-animation
                />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
