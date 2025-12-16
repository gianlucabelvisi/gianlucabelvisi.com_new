import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { BsChevronCompactLeft, BsChevronCompactRight } from 'react-icons/bs'
import { PostData, PostSummary } from '../lib/posts'
import { formatDateShort } from '../lib/dateUtils'
import styles from './NetflixSlider.module.css'

interface NetflixSliderProps {
  title: string
  posts: (PostData | PostSummary)[]
  imagePath?: (post: PostData | PostSummary) => string
}

export default function NetflixSlider({ title, posts, imagePath }: NetflixSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [enlargedCard, setEnlargedCard] = useState<number | null>(null)
  
  // Touch handling state
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)

  const itemsPerPage = 5 // Number of cards visible at once
  const totalPages = Math.ceil(posts.length / itemsPerPage)

  const checkScrollButtons = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1) // -1 for rounding
      
      // Calculate current page based on scroll position
      // More accurate calculation based on visible content
      const scrollPercentage = scrollLeft / (scrollWidth - clientWidth)
      const page = Math.round(scrollPercentage * (totalPages - 1))
      setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
    }
  }

  useEffect(() => {
    checkScrollButtons()
    const slider = sliderRef.current
    if (slider) {
      slider.addEventListener('scroll', checkScrollButtons)
      return () => slider.removeEventListener('scroll', checkScrollButtons)
    }
  }, [posts])

  // Handle window resize and mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      
      // Reset translateX on resize to prevent misalignment
      setTranslateX(0)
      setCanScrollLeft(false)
      setCanScrollRight(posts.length > itemsPerPage)
      setEnlargedCard(null) // Reset enlarged card on resize
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [posts.length, itemsPerPage])

  // Get responsive card width based on screen size
  const getCardWidth = () => {
    if (typeof window === 'undefined') return 308 // SSR fallback
    const width = window.innerWidth
    if (width <= 480) return 164 // 160px + 4px gap (0.25rem)
    if (width <= 768) return 204 // 200px + 4px gap (0.25rem)
    if (width <= 900) return 258 // 250px + 8px gap (0.5rem)
    if (width <= 1200) return 288 // 280px + 8px gap (0.5rem)
    return 308 // 300px + 8px gap (0.5rem - default)
  }

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

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
    setCurrentX(e.touches[0].clientX)
    setDragOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return
    e.preventDefault()
    
    const touch = e.touches[0]
    setCurrentX(touch.clientX)
    const offset = touch.clientX - startX
    setDragOffset(offset)
  }

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return
    setIsDragging(false)
    
    const threshold = 50 // Minimum swipe distance
    const cardWidth = getCardWidth()
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && canScrollLeft) {
        // Swipe right - scroll left
        scrollLeft()
      } else if (dragOffset < 0 && canScrollRight) {
        // Swipe left - scroll right  
        scrollRight()
      }
    }
    
    setDragOffset(0)
  }

  // Handle card tap for mobile
  const handleCardTap = (e: React.MouseEvent, index: number) => {
    if (!isMobile) return
    
    e.preventDefault()
    e.stopPropagation()
    
    if (enlargedCard === index) {
      // Tapping enlarged card opens the post
      return // Let the Link handle navigation
    } else {
      // Tapping normal card enlarges it
      setEnlargedCard(index)
    }
  }

  // Helper function to get card image path
  const getCardImagePath = (post: PostData) => {
    if (imagePath) {
      return imagePath(post)
    }
    
    if (!post.frontmatter.cardImage) return '/images/placeholder-card.jpg'
    
    // If cardImage is already an absolute path, return it as-is
    if (post.frontmatter.cardImage.startsWith('/')) {
      return post.frontmatter.cardImage
    }
    
    // Use imagePath (year-based structure) for co-located images
    return `/images/posts/${post.imagePath}/${post.frontmatter.cardImage}`
  }

  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderHeader}>
        <h2 className={styles.sliderTitle}>{title}</h2>
        {totalPages > 1 && (
          <div className={styles.progressBar}>
            {Array.from({ length: totalPages }, (_, index) => (
              <div
                key={index}
                className={`${styles.progressDot} ${
                  index === currentPage ? styles.activeDot : ''
                }`}
              />
            ))}
          </div>
        )}
      </div>
      
      <div 
        className={styles.sliderWrapper} 
        ref={sliderRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
              transition: isDragging ? 'none' : 'transform 300ms ease-out'
            }}
          >
          {posts.map((post, index) => {
            // Determine if this is one of the last few cards (for hover positioning)
            const isLast = index >= posts.length - 2
            return (
            <Link 
              key={post.slug} 
              href={`/${post.slug}`}
              className={`${styles.cardLink} ${isLast ? styles.lastCard : ''}`}
              onClick={(e) => {
                if (isMobile && enlargedCard !== index) {
                  handleCardTap(e, index)
                }
              }}
            >
              <div 
                className={`${styles.card} ${
                  enlargedCard === index ? styles.enlargedCard : ''
                }`}
              >
                <div className={styles.cardImageWrapper}>
                  <img
                    src={getCardImagePath(post)}
                    alt={post.frontmatter.title}
                    className={styles.cardImage}
                    loading="lazy"
                  />
                  
                  {/* Header that slides down from top */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderDate}>{formatDateShort(post.frontmatter.date)}</div>
                  </div>
                  
                  {/* Content that slides up from bottom */}
                  <div className={styles.cardOverlay}>
                    <div className={styles.cardContent}>
                      <h3 className={styles.cardTitle}>{post.frontmatter.title}</h3>
                      <p className={styles.cardSubtitle}>{post.frontmatter.subTitle}</p>
                      <div className={styles.cardMeta}>
                        {post.frontmatter.onHover && (
                          <span className={styles.cardEmoji}>{post.frontmatter.onHover}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )})}
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
    </div>
  )
}
