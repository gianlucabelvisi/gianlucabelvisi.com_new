import Link from 'next/link'
import Image from 'next/image'
import type { PostSummary } from '../lib/posts'
import { formatDateShort, formatReadingTime } from '../lib/dateUtils'
import styles from './PostCard.module.css'

/** The minimum a card needs — lets list pages ship slimmer props than a full PostSummary */
export interface CardPost {
  slug: string
  imagePath: string
  readingTime: number
  frontmatter: Pick<PostSummary['frontmatter'], 'title' | 'subTitle' | 'date' | 'cardImage' | 'featureImage' | 'onHover'>
}

export function toCardPost(post: PostSummary): CardPost {
  const { title, subTitle, date, cardImage, featureImage, onHover } = post.frontmatter
  return {
    slug: post.slug,
    imagePath: post.imagePath,
    readingTime: post.readingTime,
    frontmatter: { title, subTitle, date, cardImage, featureImage, onHover },
  }
}

interface PostCardProps {
  post: CardPost
  /** Compact variant used in "related posts" rows */
  compact?: boolean
  priority?: boolean
}

export function getCardImage(post: CardPost): string | null {
  const img = post.frontmatter.cardImage || post.frontmatter.featureImage
  if (!img) return null
  return img.startsWith('/') ? img : `/images/posts/${post.imagePath}/${img}`
}

/**
 * Static card for list pages (archive, tags, search, related posts).
 * Unlike the Netflix slider it has no hover expansion and works in a grid.
 */
export default function PostCard({ post, compact = false, priority = false }: PostCardProps) {
  const image = getCardImage(post)

  return (
    <Link href={`/${post.slug}`} className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={styles.imageWrap}>
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            priority={priority}
            sizes={compact ? '(max-width: 600px) 100vw, 240px' : '(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 340px'}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">{post.frontmatter.onHover || '📝'}</div>
        )}
        {post.frontmatter.onHover && image && (
          <span className={styles.emoji} aria-hidden="true">{post.frontmatter.onHover}</span>
        )}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{post.frontmatter.title}</h3>
        {!compact && <p className={styles.subtitle}>{post.frontmatter.subTitle}</p>}
        <p className={styles.meta}>
          <time dateTime={post.frontmatter.date}>{formatDateShort(post.frontmatter.date)}</time>
          <span aria-hidden="true"> · </span>
          {formatReadingTime(post.readingTime)}
        </p>
      </div>
    </Link>
  )
}
