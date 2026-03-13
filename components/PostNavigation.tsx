import Link from 'next/link'
import styles from './PostNavigation.module.css'

interface NavPost {
  frontmatter: {
    title: string
    path: string
    cardImage?: string
  }
  imagePath: string
}

interface PostNavigationProps {
  prev: NavPost | null  // older post
  next: NavPost | null  // newer post
}

export default function PostNavigation({ prev, next }: PostNavigationProps) {
  if (!prev && !next) return null

  return (
    <nav className={styles.nav} aria-label="Post navigation">
      <div className={styles.grid}>
        {prev ? (
          <Link href={prev.frontmatter.path} className={`${styles.card} ${styles.cardPrev}`}>
            {prev.frontmatter.cardImage && (
              <img
                src={`/images/posts/${prev.imagePath}/${prev.frontmatter.cardImage}`}
                alt=""
                className={styles.thumb}
              />
            )}
            <div className={styles.cardBody}>
              <span className={styles.label}>← Older</span>
              <span className={styles.title}>{prev.frontmatter.title}</span>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {next ? (
          <Link href={next.frontmatter.path} className={`${styles.card} ${styles.cardNext}`}>
            {next.frontmatter.cardImage && (
              <img
                src={`/images/posts/${next.imagePath}/${next.frontmatter.cardImage}`}
                alt=""
                className={styles.thumb}
              />
            )}
            <div className={styles.cardBody}>
              <span className={styles.label}>Newer →</span>
              <span className={styles.title}>{next.frontmatter.title}</span>
            </div>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </nav>
  )
}
