import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { BsChevronCompactLeft, BsChevronCompactRight } from 'react-icons/bs'
import { PostData } from '../lib/posts'
import styles from './NetflixSlider.module.css'

interface NetflixSliderProps {
  title: string
  posts: PostData[]
  imagePath?: (post: PostData) => string
}

export default function NetflixSlider({ title, posts, imagePath }: NetflixSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

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

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -400, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 400, behavior: 'smooth' })
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
      
      <div className={styles.sliderWrapper}>
        {canScrollLeft && (
          <button 
            className={`${styles.sliderButton} ${styles.leftButton}`} 
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <BsChevronCompactLeft className={styles.sliderButtonIcon} />
          </button>
        )}
        
        <div className={styles.slider} ref={sliderRef}>
          {posts.map((post) => (
            <Link 
              key={post.slug} 
              href={`/${post.slug}`}
              className={styles.cardLink}
            >
              <div className={styles.card}>
                <div className={styles.cardImageWrapper}>
                  <img
                    src={getCardImagePath(post)}
                    alt={post.frontmatter.title}
                    className={styles.cardImage}
                    loading="lazy"
                  />
                  <div className={styles.cardOverlay}>
                    <div className={styles.cardContent}>
                      <h3 className={styles.cardTitle}>{post.frontmatter.title}</h3>
                      <p className={styles.cardSubtitle}>{post.frontmatter.subTitle}</p>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardDate}>{post.frontmatter.date}</span>
                        {post.frontmatter.onHover && (
                          <span className={styles.cardEmoji}>{post.frontmatter.onHover}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {canScrollRight && (
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
