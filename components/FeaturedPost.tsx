import React from 'react'
import Link from 'next/link'
import { PostData } from '../lib/posts'
import { formatDate } from '../lib/dateUtils'
import styles from './FeaturedPost.module.css'

interface FeaturedPostProps {
  post: PostData
  imagePath?: (post: PostData) => string
}

export default function FeaturedPost({ post, imagePath }: FeaturedPostProps) {
  // Helper function to get feature image path
  const getFeatureImagePath = (post: PostData) => {
    if (imagePath) {
      return imagePath(post)
    }
    
    const featureImage = post.frontmatter.featureImage || post.frontmatter.cardImage
    if (!featureImage) return '/images/placeholder-feature.jpg'
    
    // If featureImage is already an absolute path, return it as-is
    if (featureImage.startsWith('/')) {
      return featureImage
    }
    
    // Use imagePath (year-based structure) for co-located images
    return `/images/posts/${post.imagePath}/${featureImage}`
  }

  return (
    <div className={styles.hero}>
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
  )
}
