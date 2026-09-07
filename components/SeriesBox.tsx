import Link from 'next/link'
import styles from './SeriesBox.module.css'

export interface SeriesEntry {
  slug: string
  title: string
}

interface SeriesBoxProps {
  name: string
  posts: SeriesEntry[]
  currentSlug: string
}

/**
 * "Part N of M" box for multi-post series (e.g. Caterina Sforza).
 * Driven by the `series:` frontmatter field; posts sharing the same value
 * are listed in reading order with the current one marked.
 */
export default function SeriesBox({ name, posts, currentSlug }: SeriesBoxProps) {
  if (posts.length < 2) return null
  const index = posts.findIndex(p => p.slug === currentSlug)

  return (
    <aside className={styles.box} aria-labelledby="series-heading">
      <p className={styles.kicker}>Series</p>
      <h2 id="series-heading" className={styles.name}>
        {name}
        {index >= 0 && <span className={styles.part}> · Part {index + 1} of {posts.length}</span>}
      </h2>
      <ol className={styles.list}>
        {posts.map((p, i) => {
          const isCurrent = p.slug === currentSlug
          return (
            <li key={p.slug} className={isCurrent ? styles.current : undefined}>
              <span className={styles.number} aria-hidden="true">{i + 1}</span>
              {isCurrent ? (
                <span aria-current="page" className={styles.currentTitle}>{p.title}</span>
              ) : (
                <Link href={`/${p.slug}`} className={styles.link}>{p.title}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
