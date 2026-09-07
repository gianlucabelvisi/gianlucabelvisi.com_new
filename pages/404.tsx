import { GetStaticProps } from 'next'
import Link from 'next/link'
import SEO from '../components/SEO'
import PostCard, { CardPost, toCardPost } from '../components/PostCard'
import { getAllPostsSummary } from '../lib/posts'
import styles from '../styles/StatusPage.module.css'

interface NotFoundProps {
  recent: CardPost[]
}

export default function NotFound({ recent }: NotFoundProps) {
  return (
    <div className={styles.page}>
      <SEO title="Page not found" path="/404" noindex />
      <div className={styles.emoji} aria-hidden="true">🦄</div>
      <h1 className={styles.title}>This page wandered off</h1>
      <p className={styles.text}>
        The link may be old, or the unicorn ate it. Either way, there&apos;s nothing here.
      </p>
      <div className={styles.actions}>
        <Link href="/" className={styles.primary}>Go to homepage</Link>
        <Link href="/search" className={styles.secondary}>Search the blog</Link>
        <Link href="/archive" className={styles.secondary}>Browse the archive</Link>
      </div>

      {recent.length > 0 && (
        <section className={styles.recent} aria-labelledby="recent-heading">
          <h2 id="recent-heading">Recent posts</h2>
          <div className={styles.recentGrid}>
            {recent.map(post => (
              <PostCard key={post.slug} post={post} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export const getStaticProps: GetStaticProps<NotFoundProps> = async () => ({
  props: { recent: getAllPostsSummary().slice(0, 4).map(toCardPost) },
  revalidate: 3600,
})
