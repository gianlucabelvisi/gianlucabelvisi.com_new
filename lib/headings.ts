import GithubSlugger from 'github-slugger'

export interface Heading {
  /** Markdown depth: 1 for `#`, 2 for `##`, ... */
  depth: number
  /** Indent level relative to the shallowest heading in the post: 0, 1, 2 ... */
  level: number
  text: string
  /** Matches the id rehype-slug assigns to the rendered heading */
  id: string
}

/**
 * Extract `#` … `####` headings from raw MDX for the table of contents.
 * Uses github-slugger exactly like rehype-slug does, so the ids line up.
 * Fenced code blocks are skipped so a `# comment` inside code isn't a heading.
 * Posts differ on whether their top level is `#` or `##`, so `level` is
 * normalised to start at 0 for whichever depth the post uses first.
 */
export function extractHeadings(content: string): Heading[] {
  const slugger = new GithubSlugger()
  const headings: Heading[] = []
  let inFence = false

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd()
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const match = /^(#{1,4})\s+(.+?)\s*#*$/.exec(line)
    if (!match) continue

    const text = cleanHeadingText(match[2])
    if (!text) continue

    headings.push({
      depth: match[1].length,
      level: 0,
      text,
      id: slugger.slug(text),
    })
  }

  const minDepth = Math.min(...headings.map(h => h.depth))
  for (const h of headings) h.level = Math.min(h.depth - minDepth, 2)

  return headings
}

// Strip inline markdown / JSX so the TOC shows plain text
function cleanHeadingText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')                 // JSX tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')    // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/[*_`~]/g, '')                  // emphasis / code
    .replace(/\{[^}]*\}/g, '')               // JSX expressions
    .trim()
}
