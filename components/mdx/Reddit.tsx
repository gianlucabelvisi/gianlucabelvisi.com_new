import styles from './Reddit.module.css'

interface RedditProps {
  children: React.ReactNode
  author?: string
  label?: string
}

export default function Reddit({ children, author, label }: RedditProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.badge}>
          🔗 Reddit
        </div>
      </div>
      
      <div className={styles.content}>
        {children}
      </div>
      
      {author && (
        <div className={styles.author}>
          <strong>u/{author}</strong>
        </div>
      )}
      
      {label && (
        <div className={styles.label}>
          <em>{label}</em>
        </div>
      )}
    </div>
  )
} 