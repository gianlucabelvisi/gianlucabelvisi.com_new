import { GetStaticPaths, GetStaticProps } from 'next'
import Link from 'next/link'
import SEO from '../../components/SEO'
import PostCard, { CardPost, toCardPost } from '../../components/PostCard'
import { getAllPostsSummary } from '../../lib/posts'
import { getAllHashtags, filterPostsByTagSlug } from '../../lib/hashtags'
import styles from '../../styles/ListingPage.module.css'

interface TagPageProps {
  tag: string
  slug: string
  posts: CardPost[]
}

export default function TagPage({ tag, slug, posts }: TagPageProps) {
  return (
    <div className={styles.page}>
      <SEO
        title={`#${tag}`}
        description={`${posts.length} ${posts.length === 1 ? 'post' : 'posts'} tagged "${tag}".`}
        path={`/tags/${slug}`}
      />

      <header className={styles.header}>
        <p className={styles.kicker}>Tag</p>
        <h1 className={styles.title}>
          <em>#</em>{tag}
        </h1>
        <p className={styles.lede}>
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}, newest first.
        </p>
      </header>

      <div className={styles.grid}>
        {posts.map((post, i) => (
          <PostCard key={post.slug} post={post} priority={i < 3} />
        ))}
      </div>

      <Link href="/tags" className={styles.backLink}>
        <span aria-hidden="true">←</span> All tags
      </Link>
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const tags = getAllHashtags(getAllPostsSummary())
  return {
    paths: tags.map(({ slug }) => ({ params: { tag: slug } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<TagPageProps> = async ({ params }) => {
  const slug = String(params?.tag ?? '')
  const all = getAllPostsSummary()
  const info = getAllHashtags(all).find(t => t.slug === slug)

  if (!info) return { notFound: true }

  return {
    props: {
      tag: info.tag,
      slug,
      posts: filterPostsByTagSlug(all, slug).map(toCardPost),
    },
    revalidate: 3600,
  }
}
