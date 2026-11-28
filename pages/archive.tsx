import { GetStaticProps } from 'next'
import Link from 'next/link'
import SEO from '../components/SEO'
import PostCard, { CardPost, toCardPost } from '../components/PostCard'
import { getAllPostsSummary } from '../lib/posts'
import { getYear } from '../lib/dateUtils'
import { getAllHashtags, TagInfo } from '../lib/hashtags'
import styles from '../styles/ListingPage.module.css'

interface YearGroup {
  year: number
  posts: CardPost[]
}

interface ArchiveProps {
  years: YearGroup[]
  total: number
  /** The most used tags, for the strip under the search box */
  topTags: TagInfo[]
}

const TOP_TAGS = 12

/**
 * The archive doubles as the "Browse" hub (the Browse tab and nav link land here):
 * search and tags at the top, then every post by year.
 */
export default function Archive({ years, total, topTags }: ArchiveProps) {
  return (
    <div className={styles.page}>
      <SEO
        title="Archive"
        description={`Every post on the blog, ${total} of them, grouped by year.`}
        path="/archive"
      />

      <header className={styles.header}>
        <p className={styles.kicker}>Browse</p>
        <h1 className={styles.title}>
          Everything, <em>{total} posts</em> deep
        </h1>
        <p className={styles.lede}>
          Search, pick a topic, jump to a year, or just keep scrolling.
        </p>
      </header>

      <div className={styles.browseTools}>
        {/* A plain GET form: works without JavaScript, and /search takes over from ?q= */}
        <form className={styles.searchForm} role="search" action="/search" method="get">
          <label htmlFor="browse-search" className="sr-only">Search posts</label>
          <input
            id="browse-search"
            name="q"
            type="search"
            className={styles.searchInput}
            placeholder="Coffee, Caterina, books, unicorns…"
            autoComplete="off"
            spellCheck={false}
          />
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
        </form>

        <ul className={styles.tagStrip} aria-label="Popular tags">
          {topTags.map(({ tag, slug }) => (
            <li key={slug}>
              <Link href={`/tags/${slug}`} className={styles.tagChip}>
                <span className={styles.hash} aria-hidden="true">#</span>
                {tag}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/tags" className={styles.tagStripMore}>All tags →</Link>
          </li>
        </ul>
      </div>

      <nav aria-label="Jump to year">
        <ul className={styles.yearNav}>
          {years.map(({ year, posts }) => (
            <li key={year}>
              <a href={`#year-${year}`}>
                {year} <span className={styles.yearCount}>({posts.length})</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {years.map(({ year, posts }) => (
        <section key={year} id={`year-${year}`} className={styles.yearSection} aria-labelledby={`year-${year}-heading`}>
          <h2 id={`year-${year}-heading`} className={styles.yearHeading}>
            {year}
            <span className={styles.yearCount}>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
          </h2>
          <div className={styles.grid}>
            {posts.map(post => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export const getStaticProps: GetStaticProps<ArchiveProps> = async () => {
  const posts = getAllPostsSummary()
  const byYear = new Map<number, CardPost[]>()

  posts.forEach(post => {
    const year = getYear(post.frontmatter.date)
    const card = toCardPost(post)
    const bucket = byYear.get(year)
    if (bucket) bucket.push(card)
    else byYear.set(year, [card])
  })

  const years = Array.from(byYear.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, posts]) => ({ year, posts }))

  return {
    props: { years, total: posts.length, topTags: getAllHashtags(posts).slice(0, TOP_TAGS) },
    revalidate: 3600,
  }
}
