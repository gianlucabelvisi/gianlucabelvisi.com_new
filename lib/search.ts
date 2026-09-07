import type { PostData } from './posts'
import { parseHashtags } from './hashtags'
import { toCardPost, CardPost } from '../components/PostCard'

/** Per-post search record shipped to the client. Keep it small: ~50 posts × ~2 KB. */
export interface SearchDoc {
  post: CardPost
  /** Lower-cased, punctuation-stripped body text (first N chars) */
  body: string
  tags: string[]
}

const BODY_CHARS = 2000

/** Strip MDX/JSX/markdown down to plain words */
export function toPlainText(mdx: string): string {
  return mdx
    .replace(/```[\s\S]*?```/g, ' ') // code fences
    .replace(/<[^>]+>/g, ' ') // JSX / HTML tags
    .replace(/\{[^}]*\}/g, ' ') // JSX expressions
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/^import\s.*$/gm, ' ')
    .replace(/^export\s.*$/gm, ' ')
    .replace(/[#>*_`~|-]+/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSearchIndex(posts: PostData[]): SearchDoc[] {
  return posts.map(({ content, ...post }) => ({
    post: toCardPost(post),
    body: toPlainText(content).slice(0, BODY_CHARS).toLowerCase(),
    tags: parseHashtags(post.frontmatter.hashtags),
  }))
}

export interface SearchHit {
  doc: SearchDoc
  score: number
  /** Short body snippet around the first match, or the subtitle */
  snippet: string
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(t => t.length > 1)
}

function snippetAround(body: string, term: string, radius = 70): string | null {
  const idx = body.indexOf(term)
  if (idx === -1) return null
  const start = Math.max(0, idx - radius)
  const end = Math.min(body.length, idx + term.length + radius)
  return `${start > 0 ? '…' : ''}${body.slice(start, end)}${end < body.length ? '…' : ''}`
}

/**
 * Tiny ranked search: title matches weigh most, then tags, subtitle, body.
 * Every token must match somewhere (AND semantics) so results stay relevant.
 */
export function searchPosts(index: SearchDoc[], query: string, limit = 20): SearchHit[] {
  const terms = tokenize(query)
  if (terms.length === 0) return []

  const hits: SearchHit[] = []

  for (const doc of index) {
    const title = (doc.post.frontmatter.title || '').toLowerCase()
    const subtitle = (doc.post.frontmatter.subTitle || '').toLowerCase()
    const tags = doc.tags.join(' ')
    let score = 0
    let firstBodyTerm: string | null = null

    for (const term of terms) {
      let termScore = 0
      if (title.includes(term)) termScore += title.startsWith(term) ? 12 : 8
      if (tags.includes(term)) termScore += 6
      if (subtitle.includes(term)) termScore += 4
      if (doc.body.includes(term)) {
        termScore += 1
        firstBodyTerm ??= term
      }
      if (termScore === 0) {
        score = 0
        break
      }
      score += termScore
    }

    if (score > 0) {
      const snippet =
        (firstBodyTerm && snippetAround(doc.body, firstBodyTerm)) || doc.post.frontmatter.subTitle || ''
      hits.push({ doc, score, snippet })
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || b.doc.post.frontmatter.date.localeCompare(a.doc.post.frontmatter.date))
    .slice(0, limit)
}
