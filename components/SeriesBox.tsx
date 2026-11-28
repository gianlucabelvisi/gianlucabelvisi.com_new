import Link from 'next/link'
import styles from './SeriesBox.module.css'

export interface SeriesEntry {
  slug: string
  title: string
}

interface SeriesBoxProps {
  name: string
  /** serial: numbered, "Part N of M". collection: same family, any order. */
  kind?: 'serial' | 'collection'
  posts: SeriesEntry[]
  currentSlug: string
}

/**
 * The other posts of a series, with the current one marked. Driven by the `series:` frontmatter field
 * (presentation in lib/series.ts). A serial (Caterina Sforza) shows "Part N of M" at the top of the post;
 * a collection (the "On…" essays) shows "More from" at the end.
 */
export default function SeriesBox({ name, kind = 'serial', posts, currentSlug }: SeriesBoxProps) {
  if (posts.length < 2) return null
  const index = posts.findIndex(p => p.slug === currentSlug)

  return (
    <aside className={`${styles.box} ${kind === 'collection' ? styles.collection : ''}`} aria-labelledby="series-heading">
      <p className={styles.kicker}>{kind === 'serial' ? 'Series' : 'More from the collection'}</p>
      <h2 id="series-heading" className={styles.name}>
        {name}
        {kind === 'serial' && index >= 0 && <span className={styles.part}> · Part {index + 1} of {posts.length}</span>}
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
