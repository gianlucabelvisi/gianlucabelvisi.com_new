import styles from './BlogSubTitle.module.css'

interface BlogSubTitleProps {
  children: React.ReactNode
}

const BlogSubTitle = ({ children }: BlogSubTitleProps) => {
  return (
    <div className={styles.subtitle}>
      <span className={styles.quoteStart}>❝</span>
      {children}
      <span className={styles.quoteEnd}>❞</span>
    </div>
  )
}

export default BlogSubTitle 