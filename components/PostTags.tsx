import Link from 'next/link'
import { parseHashtags, tagToSlug } from '../lib/hashtags'
import styles from './PostTags.module.css'

interface PostTagsProps {
  hashtags?: string
  /** Original-case tag names for display (parseHashtags lower-cases) */
  size?: 'sm' | 'md'
}

/** Clickable hashtag chips linking to /tags/[tag] */
export default function PostTags({ hashtags, size = 'md' }: PostTagsProps) {
  if (!hashtags) return null
  // Keep the author's casing for display, but slug consistently
  const display = hashtags.split(',').map(t => t.trim()).filter(Boolean)
  const slugs = parseHashtags(hashtags).map(tagToSlug)
  if (display.length === 0) return null

  return (
    <ul className={`${styles.tags} ${size === 'sm' ? styles.sm : ''}`} aria-label="Tags">
      {display.map((tag, i) => (
        <li key={slugs[i]}>
          <Link href={`/tags/${slugs[i]}`} className={styles.tag}>
            <span aria-hidden="true">#</span>{tag}
          </Link>
        </li>
      ))}
    </ul>
  )
}
