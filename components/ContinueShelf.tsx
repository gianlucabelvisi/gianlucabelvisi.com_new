import Shelf from './Shelf'
import { ReadCard } from './cards/Cards'
import type { CardPost } from './PostCard'
import type { SeriesShelfItem } from '../lib/series'
import { FINISHED, STARTED } from '../lib/progress'
import { useProgress } from '../lib/useProgress'

interface ContinueShelfProps {
  /** Every listed post, so any slug in the reader's history can be turned back into a card */
  posts: CardPost[]
  series: SeriesShelfItem[]
}

const LIMIT = 8

/**
 * "Pick up where you left off": posts the reader started and didn't finish, newest visit first, followed by
 * the next part of any serial they are partway through. Renders nothing for a first-time visitor.
 * Client-only data (localStorage), so it appears after hydration.
 */
export default function ContinueShelf({ posts, series }: ContinueShelfProps) {
  const progress = useProgress()
  const bySlug = new Map(posts.map(p => [p.slug, p]))

  const started = Object.entries(progress)
    .filter(([slug, e]) => e.p >= STARTED && e.p < FINISHED && bySlug.has(slug))
    .sort((a, b) => b[1].t - a[1].t)
    .map(([slug, e]) => {
      const post = bySlug.get(slug) as CardPost
      const left = Math.max(1, Math.round(post.readingTime * (1 - e.p)))
      return { post, progress: e.p as number | undefined, meta: `${left} min left` }
    })

  // In a serial: the first unread part after the last one they finished
  const upNext = series
    .filter(s => s.kind === 'serial')
    .flatMap(s => {
      const lastDone = s.parts.reduce((last, part, i) => ((progress[part.slug]?.p ?? 0) >= FINISHED ? i : last), -1)
      const next = s.parts[lastDone + 1]
      if (lastDone < 0 || !next || progress[next.slug]) return []
      const post = bySlug.get(next.slug)
      return post ? [{ post, progress: undefined as number | undefined, meta: `${s.title} · ${s.unit} ${lastDone + 2} of ${s.parts.length}` }] : []
    })

  const items = [...started, ...upNext].slice(0, LIMIT)
  if (items.length === 0) return null

  return (
    <Shelf title="Pick up where you left off">
      {items.map(({ post, progress: p, meta }) => (
        <ReadCard key={post.slug} post={post} progress={p} meta={meta} />
      ))}
    </Shelf>
  )
}
