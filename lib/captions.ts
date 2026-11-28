import type { PostData } from './posts'

/**
 * Figure captions are where a lot of the jokes live. This module finds them so the homepage can show a few
 * "out of context", each linking back to its exact spot in the post.
 *
 * Both halves agree on one numbering: the Nth <FigureLabel> of a post gets the anchor #caption-N.
 *  - numberCaptions() stamps those ids into the MDX before it is compiled (pages/[...slug].tsx)
 *  - extractCaptions() reads the same order to build the links (pages/index.tsx)
 */

const LABEL_OPEN = /<FigureLabel>/g
// An image, optionally followed by blank lines, then its caption
const IMAGE_BEFORE = /!\[[^\]]*\]\(([^)\s]+)\)\s*$/

export const captionAnchor = (n: number) => `caption-${n}`

/** Give every <FigureLabel> an id, in document order */
export function numberCaptions(content: string): string {
  let n = 0
  return content.replace(LABEL_OPEN, () => `<FigureLabel id="${captionAnchor(++n)}">`)
}

export interface Caption {
  /** Plain text of the caption */
  text: string
  image: string
  /** Post it comes from */
  slug: string
  postTitle: string
  anchor: string
}

function toPlainText(mdx: string): string {
  return mdx
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]+/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

// Captions that are credits or instructions rather than lines worth quoting
const NOT_A_JOKE = /\b(source|credit|click to|courtesy|photo by|image by|via )\b|https?:|©|\(c\)/i

/** Captions that sit right under a still image and can stand alone as a one-liner */
export function extractCaptions(post: PostData): Caption[] {
  const out: Caption[] = []
  const content = post.content
  let n = 0
  let match: RegExpExecArray | null
  const re = new RegExp(LABEL_OPEN.source, 'g')

  while ((match = re.exec(content))) {
    n += 1
    const end = content.indexOf('</FigureLabel>', match.index)
    if (end === -1) break
    const raw = content.slice(match.index + match[0].length, end)
    const image = IMAGE_BEFORE.exec(content.slice(Math.max(0, match.index - 400), match.index))?.[1]
    if (!image || !image.startsWith('/') || /\.(gif|svg)$/i.test(image)) continue
    // Links and embedded markup mean the caption is pointing somewhere, not landing a line
    if (/<a\b|\]\(/.test(raw)) continue
    const text = toPlainText(raw)
    if (text.length < 18 || text.length > 120 || NOT_A_JOKE.test(text)) continue
    out.push({ text, image, slug: post.slug, postTitle: post.frontmatter.title, anchor: captionAnchor(n) })
  }

  return out
}

/** A shuffled handful for the homepage, at most `perPost` from any one post so no post dominates the row */
export function pickCaptions(posts: PostData[], limit = 14, perPost = 2): Caption[] {
  const shuffle = <T,>(items: T[]): T[] => {
    const arr = [...items]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
  const pool = posts.flatMap(post => shuffle(extractCaptions(post)).slice(0, perPost))
  return shuffle(pool).slice(0, limit)
}
