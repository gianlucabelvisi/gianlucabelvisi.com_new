import styles from './BlogSubTitle.module.css'

interface BlogSubTitleProps {
  children: React.ReactNode
}

const BlogSubTitle = ({ children }: BlogSubTitleProps) => {
  return (
    <div className={styles.subtitle}>
      {children}
    </div>
  )
}

export default BlogSubTitle 