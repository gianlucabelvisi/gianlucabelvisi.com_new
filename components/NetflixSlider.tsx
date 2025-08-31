import React, { useRef } from 'react'
import Link from 'next/link'
import { PostData } from '../lib/posts'
import styles from './NetflixSlider.module.css'

interface NetflixSliderProps {
  title: string
  posts: PostData[]
  imagePath?: (post: PostData) => string
}

export default function NetflixSlider({ title, posts, imagePath }: NetflixSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)

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
        <div className={styles.sliderControls}>
          <button 
            className={styles.sliderButton} 
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            ‹
          </button>
          <button 
            className={styles.sliderButton} 
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>
      </div>
      
      <div className={styles.sliderWrapper}>
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
      </div>
    </div>
  )
}
