import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BsChevronCompactLeft, BsChevronCompactRight } from 'react-icons/bs'
import { PostData, PostSummary } from '../lib/posts'
import styles from './NetflixSlider.module.css'

interface NetflixSliderProps {
  title: string
  posts: (PostData | PostSummary)[]
  imagePath?: (post: PostData | PostSummary) => string
}

export default function NetflixSlider({ title, posts, imagePath }: NetflixSliderProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [translateX, setTranslateX] = useState(0)

  // Use refs for drag state to avoid stale closure issues
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)

  const itemsPerPage = 5
  const totalPages = Math.ceil(posts.length / itemsPerPage)

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

  // Update progress dots based on translateX
  useEffect(() => {
    if (posts.length <= itemsPerPage) return
    const cardWidth = getCardWidth()
    const maxTranslate = -(posts.length - itemsPerPage) * cardWidth
    const scrollPercentage = Math.abs(translateX) / Math.abs(maxTranslate)
    const page = Math.round(scrollPercentage * (totalPages - 1))
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
  }, [translateX, posts.length, totalPages])

  const getCardWidth = () => {
    if (typeof window === 'undefined') return 308
    const width = window.innerWidth
    if (width <= 360) return 168  // 160px + 8px gap (0.5rem)
    if (width <= 480) return 183  // 175px + 8px gap (0.5rem)
    if (width <= 768) return 258  // 250px + 8px gap (0.5rem)
    if (width <= 900) return 258  // 250px + 8px gap
    if (width <= 1200) return 288 // 280px + 8px gap
    return 308                    // 300px + 8px gap
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

  // Touch handlers using refs to avoid stale state
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true
    startXRef.current = e.touches[0].clientX
    setDragOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return
    const offset = e.touches[0].clientX - startXRef.current
    setDragOffset(offset)
  }

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

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

  const getCardImagePath = (post: PostData | PostSummary) => {
    if (imagePath) return imagePath(post)
    if (!post.frontmatter.cardImage) return '/images/placeholder-card.jpg'
    if (post.frontmatter.cardImage.startsWith('/')) return post.frontmatter.cardImage
    return `/images/posts/${post.imagePath}/${post.frontmatter.cardImage}`
  }

  if (!posts || posts.length === 0) return null

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderHeader}>
        <h2 className={styles.sliderTitle}>{title}</h2>
        {totalPages > 1 && (
          <div className={styles.progressBar}>
            {Array.from({ length: totalPages }, (_, index) => (
              <div
                key={index}
                className={`${styles.progressDot} ${index === currentPage ? styles.activeDot : ''}`}
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
            transform: `translateX(${translateX + (isDraggingRef.current ? dragOffset : 0)}px)`,
            transition: isDraggingRef.current ? 'none' : 'transform 300ms ease-out',
          }}
        >
          {posts.map((post, index) => {
            const isLast = index >= posts.length - 2
            return (
              <Link
                key={post.slug}
                href={`/${post.slug}`}
                className={`${styles.cardLink} ${isLast ? styles.lastCard : ''}`}
              >
                <div className={styles.card}>
                  <div className={styles.cardImageWrapper}>
                    <Image
                      src={getCardImagePath(post)}
                      alt={post.frontmatter.title}
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
    </div>
  )
}
