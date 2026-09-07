import type { CardPost } from './PostCard'
import PostCard from './PostCard'
import styles from './RelatedPosts.module.css'

interface RelatedPostsProps {
  posts: CardPost[]
  title?: string
}

export default function RelatedPosts({ posts, title = 'You might also like' }: RelatedPostsProps) {
  if (posts.length === 0) return null

  return (
    <section className={styles.related} aria-labelledby="related-heading">
      <h2 id="related-heading" className={styles.heading}>{title}</h2>
      <div className={styles.grid}>
        {posts.map(post => (
          <PostCard key={post.slug} post={post} compact />
        ))}
      </div>
    </section>
  )
}
