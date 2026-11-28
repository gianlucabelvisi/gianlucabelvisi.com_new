import styles from './Reddit.module.css'

interface RedditProps {
  /** Embed URL of a Reddit post (redditmedia.com/…&embed=true) */
  source?: string
  /** Heading above the embed */
  title?: string
  /** Caption under it */
  label?: string
  /** For a quoted comment instead of an embed: who wrote it */
  author?: string
  /** Embed height in px */
  height?: number
  children?: React.ReactNode
}

/** A Reddit post embedded in the page, or a quoted comment when given children instead of a source */
export default function Reddit({ source, title, label, author, height = 520, children }: RedditProps) {
  return (
    <figure className={styles.reddit}>
      <div className={styles.header}>
        <span className={styles.mark} aria-hidden="true" />
        <span className={styles.site}>Reddit</span>
        {title && <span className={styles.title}>{title}</span>}
        {author && <span className={styles.author}>u/{author}</span>}
      </div>

      {source && (
        <iframe
          className={styles.frame}
          src={source}
          title={title ? `Reddit: ${title}` : 'Reddit post'}
          height={height}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      )}

      {children && <div className={styles.quote}>{children}</div>}

      {label && <figcaption className={styles.label}>{label}</figcaption>}
    </figure>
  )
}
