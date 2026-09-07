import { GetStaticProps } from 'next'
import Link from 'next/link'
import SEO from '../../components/SEO'
import { getAllPostsSummary } from '../../lib/posts'
import { getAllHashtags, TagInfo } from '../../lib/hashtags'
import styles from '../../styles/ListingPage.module.css'

interface TagsProps {
  tags: TagInfo[]
}

function sizeClass(count: number, max: number): string {
  const ratio = count / max
  if (ratio > 0.5) return styles.tagChipLg
  if (ratio > 0.2) return styles.tagChipMd
  return styles.tagChipSm
}

export default function Tags({ tags }: TagsProps) {
  const max = tags[0]?.count ?? 1

  return (
    <div className={styles.page}>
      <SEO
        title="Tags"
        description={`Browse the blog by topic: ${tags.length} tags and counting.`}
        path="/tags"
      />

      <header className={styles.header}>
        <p className={styles.kicker}>Topics</p>
        <h1 className={styles.title}>
          Browse by <em>tag</em>
        </h1>
        <p className={styles.lede}>
          {tags.length} tags, sorted by how often they show up. Bigger means more posts.
        </p>
      </header>

      <ul className={styles.tagCloud} aria-label="All tags">
        {tags.map(({ tag, slug, count }) => (
          <li key={slug}>
            <Link href={`/tags/${slug}`} className={`${styles.tagChip} ${sizeClass(count, max)}`}>
              <span className={styles.hash} aria-hidden="true">#</span>
              {tag}
              <span className={styles.tagCount} aria-label={`${count} posts`}>{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const getStaticProps: GetStaticProps<TagsProps> = async () => ({
  props: { tags: getAllHashtags(getAllPostsSummary()) },
  revalidate: 3600,
})
