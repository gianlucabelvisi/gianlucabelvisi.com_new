import { PostData, PostSummary } from './posts'

// Type that works with both PostData and PostSummary (since hashtags only use frontmatter)
type PostWithHashtags = PostData | PostSummary

/** Split a frontmatter hashtags string into trimmed, lower-cased tags. */
export function parseHashtags(hashtags?: string | null): string[] {
  if (!hashtags) return []
  return hashtags
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
}

/** URL-safe slug for a tag: "Caterina Sforza" -> "caterina-sforza" */
export function tagToSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Check if a post contains any of the specified hashtags
 * Matches the functionality from the old Gatsby blog (substring match)
 */
export function containsHashtags(post: PostWithHashtags, ...tags: string[]): boolean {
  const postHashtags = parseHashtags(post.frontmatter.hashtags)
  if (postHashtags.length === 0) return false

  return tags.some(tag =>
    postHashtags.some(postTag => postTag.includes(tag.toLowerCase()))
  )
}

/**
 * Filter posts by hashtags (substring match, any-of)
 */
export function filterPostsByHashtags<T extends PostWithHashtags>(posts: T[], ...tags: string[]): T[] {
  return posts.filter(post => containsHashtags(post, ...tags))
}

/** Exact-match filter by tag slug — used by /tags/[tag] pages */
export function filterPostsByTagSlug<T extends PostWithHashtags>(posts: T[], tagSlug: string): T[] {
  return posts.filter(post =>
    parseHashtags(post.frontmatter.hashtags).some(tag => tagToSlug(tag) === tagSlug)
  )
}

export interface TagInfo {
  tag: string
  slug: string
  count: number
}

/**
 * Get all unique hashtags from posts with counts, sorted by count desc then name.
 * Tags that differ only by case/whitespace are merged.
 */
export function getAllHashtags(posts: PostWithHashtags[]): TagInfo[] {
  const counts = new Map<string, TagInfo>()

  posts.forEach(post => {
    parseHashtags(post.frontmatter.hashtags).forEach(tag => {
      const slug = tagToSlug(tag)
      const existing = counts.get(slug)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(slug, { tag, slug, count: 1 })
      }
    })
  })

  return Array.from(counts.values()).sort((a, b) =>
    b.count - a.count || a.tag.localeCompare(b.tag)
  )
}

/**
 * Related posts: score by number of shared hashtags, tie-break by date proximity.
 * Excludes the post itself. Falls back to nearest-in-time posts if nothing shares a tag.
 */
export function getRelatedPosts<T extends PostWithHashtags>(
  current: PostWithHashtags,
  posts: T[],
  limit = 4
): T[] {
  const currentTags = new Set(parseHashtags(current.frontmatter.hashtags))
  const currentTime = new Date(current.frontmatter.date).getTime()

  const scored = posts
    .filter(p => p.slug !== current.slug)
    .map(p => {
      const shared = parseHashtags(p.frontmatter.hashtags).filter(t => currentTags.has(t)).length
      const distance = Math.abs(new Date(p.frontmatter.date).getTime() - currentTime)
      return { post: p, shared, distance }
    })
    .sort((a, b) => b.shared - a.shared || a.distance - b.distance)

  return scored.slice(0, limit).map(s => s.post)
}

/** All posts in a series, oldest first (reading order). */
export function getSeriesPosts<T extends PostWithHashtags>(series: string, posts: T[]): T[] {
  const key = series.trim().toLowerCase()
  return posts
    .filter(p => typeof p.frontmatter.series === 'string' && p.frontmatter.series.trim().toLowerCase() === key)
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? -1 : 1))
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Cap for the "All Posts" homepage row; the full list lives on /archive. */
export const CHRONOLOGICAL_ROW_LIMIT = 12

/**
 * Group posts by content categories for Netflix-style sliders
 */
export function groupPostsForHomepage<T extends PostWithHashtags>(posts: T[]) {
  const latest = posts.slice(1, 14) // Skip featured post, get next 13
  const featured = posts[0] // Latest post as hero

  // Caterina Sforza series (your pride and joy!)
  const caterina = filterPostsByHashtags(posts, 'caterina sforza').reverse()

  // Food & lifestyle content
  const food = filterPostsByHashtags(posts, 'food', 'coffee', 'diet', '9barista', 'pizza', 'meat').reverse()

  // Mindfulness & self-improvement
  const mindfulness = shuffle(filterPostsByHashtags(posts, 'mindfulness')).slice(0, 15)

  // Books content
  const books = shuffle(filterPostsByHashtags(posts, 'books', 'bucket list')).slice(0, 15)

  // Random chaos mode
  const randomized = shuffle(posts).slice(0, 15)

  // "From the archive": the oldest posts, capped — the full list is on /archive
  const chronological = [...posts].reverse().slice(0, CHRONOLOGICAL_ROW_LIMIT)

  return {
    featured,
    latest,
    caterina,
    food,
    mindfulness,
    books,
    randomized,
    chronological
  }
}
