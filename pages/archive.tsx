import { GetStaticProps } from 'next'
import SEO from '../components/SEO'
import PostCard, { CardPost, toCardPost } from '../components/PostCard'
import { getAllPostsSummary } from '../lib/posts'
import { getYear } from '../lib/dateUtils'
import styles from '../styles/ListingPage.module.css'

interface YearGroup {
  year: number
  posts: CardPost[]
}

interface ArchiveProps {
  years: YearGroup[]
  total: number
}

export default function Archive({ years, total }: ArchiveProps) {
  return (
    <div className={styles.page}>
      <SEO
        title="Archive"
        description={`Every post on the blog, ${total} of them, grouped by year.`}
        path="/archive"
      />

      <header className={styles.header}>
        <p className={styles.kicker}>Archive</p>
        <h1 className={styles.title}>
          Everything, <em>{total} posts</em> deep
        </h1>
        <p className={styles.lede}>
          Every post ever published, newest first. Jump to a year or just keep scrolling.
        </p>
      </header>

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
    props: { years, total: posts.length },
    revalidate: 3600,
  }
}
