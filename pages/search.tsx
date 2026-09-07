import { GetStaticProps } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import SEO from '../components/SEO'
import PostCard from '../components/PostCard'
import { getAllPosts } from '../lib/posts'
import { buildSearchIndex, searchPosts, SearchDoc } from '../lib/search'
import styles from '../styles/ListingPage.module.css'

interface SearchProps {
  index: SearchDoc[]
}

export default function Search({ index }: SearchProps) {
  const router = useRouter()
  const urlQuery = typeof router.query.q === 'string' ? router.query.q : ''
  // null = untouched: fall back to ?q= from the URL (empty on the first static render, filled after hydration)
  const [typed, setTyped] = useState<string | null>(null)
  const query = typed ?? urlQuery
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (router.isReady) inputRef.current?.focus()
  }, [router.isReady])

  // Keep the URL shareable without spamming history
  useEffect(() => {
    if (typed === null || typed === urlQuery) return
    const timer = setTimeout(() => {
      router.replace(typed ? `/search?q=${encodeURIComponent(typed)}` : '/search', undefined, { shallow: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [typed, urlQuery, router])

  const hits = useMemo(() => searchPosts(index, query), [index, query])
  const trimmed = query.trim()

  return (
    <div className={styles.page}>
      <SEO title="Search" description="Search every post on the blog." path="/search" noindex />

      <header className={styles.header}>
        <p className={styles.kicker}>Search</p>
        <h1 className={styles.title}>
          Find <em>something</em>
        </h1>
      </header>

      <form
        className={styles.searchForm}
        role="search"
        onSubmit={e => e.preventDefault()}
      >
        <label htmlFor="search-input" className="sr-only">Search posts</label>
        <input
          ref={inputRef}
          id="search-input"
          type="search"
          className={styles.searchInput}
          placeholder="Coffee, Caterina, books, unicorns…"
          value={query}
          onChange={e => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <span className={styles.searchIcon} aria-hidden="true">🔍</span>
      </form>

      <p className={styles.status} role="status" aria-live="polite">
        {trimmed
          ? `${hits.length} ${hits.length === 1 ? 'result' : 'results'} for “${trimmed}”`
          : `Searching ${index.length} posts by title, tags and content.`}
      </p>

      {trimmed && hits.length === 0 && (
        <div className={styles.empty}>
          <p>Nothing matched. Try fewer or different words.</p>
          <p>
            Or <Link href="/tags">browse by tag</Link> / <Link href="/archive">scroll the archive</Link>.
          </p>
        </div>
      )}

      {hits.length > 0 && (
        <div className={styles.grid}>
          {hits.map(({ doc }) => (
            <PostCard key={doc.post.slug} post={doc.post} />
          ))}
        </div>
      )}
    </div>
  )
}

export const getStaticProps: GetStaticProps<SearchProps> = async () => ({
  props: { index: buildSearchIndex(getAllPosts()) },
  revalidate: 3600,
})
