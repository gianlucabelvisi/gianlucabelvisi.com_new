import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'posts')

export interface PostFrontmatter {
  path: string
  date: string
  title: string
  subTitle: string
  author: string
  hashtags: string
  hidden: boolean
  cardImage?: string
  featureImage?: string
  featureImagePhone?: string
  onHover?: string
  /** Optional series name; posts sharing it get a Series box (e.g. "Caterina Sforza") */
  series?: string
  [key: string]: unknown
}

export interface PostData {
  slug: string
  imagePath: string // Original file path for image resolution
  frontmatter: PostFrontmatter
  content: string
  /** Estimated reading time in minutes (rounded up, minimum 1) */
  readingTime: number
  /** Word count of the MDX body (prose only, code/JSX stripped) */
  wordCount: number
}

// Lightweight version without content for homepage performance
export type PostSummary = Omit<PostData, 'content'>

const WORDS_PER_MINUTE = 220

// Rewrite relative image paths to absolute paths
function rewriteImagePaths(content: string, fileName: string): string {
  const postDir = path.dirname(fileName)

  // Replace markdown image syntax: ![alt](relative-image.jpg) -> ![alt](/images/posts/path/relative-image.jpg)
  return content.replace(
    /!\[([^\]]*)\]\(([^)]+\.(jpg|jpeg|png|gif|webp|svg))\)/gi,
    (match, alt, imagePath) => {
      if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
        const absolutePath = `/images/posts/${postDir}/${imagePath}`
        return `![${alt}](${absolutePath})`
      }
      return match
    }
  )
}

// Rough word count: strip code fences, JSX tags, import/export lines, markdown syntax
export function countWords(content: string): number {
  const prose = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^(import|export)\s.*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]+/g, ' ')
  const words = prose.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w))
  return words.length
}

function toIsoDate(raw: unknown): string | null {
  if (typeof raw === 'string' && raw.trim()) {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString()
  }
  return null
}

function deriveSlug(fileName: string, data: Record<string, unknown>): string {
  if (data.path && typeof data.path === 'string') {
    return data.path.startsWith('/') ? data.path.slice(1) : data.path
  }

  let slug = fileName.replace(/\.mdx$/, '')
  const parts = slug.split('/')

  // test-mdx/test-mdx.mdx -> test-mdx
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
    parts.pop()
    slug = parts.join('/')
  }
  // loggo/index.mdx -> loggo
  if (parts.length >= 1 && parts[parts.length - 1] === 'index') {
    parts.pop()
    slug = parts.join('/')
  }
  // 2024/chess -> chess
  const slugParts = slug.split('/')
  if (slugParts.length > 1 && /^\d{4}$/.test(slugParts[0])) {
    slug = slugParts.slice(1).join('/')
  }
  return slug
}

function deriveImagePath(fileName: string): string {
  let imagePath = fileName.replace(/\.mdx$/, '')
  const pathParts = imagePath.split('/')
  if (pathParts.length >= 2 && pathParts[pathParts.length - 1] === pathParts[pathParts.length - 2]) {
    pathParts.pop()
    imagePath = pathParts.join('/')
  }
  if (pathParts.length >= 1 && pathParts[pathParts.length - 1] === 'index') {
    pathParts.pop()
    imagePath = pathParts.join('/')
  }
  return imagePath
}

function parsePost(fileName: string): PostData | null {
  const fullPath = path.join(postsDirectory, fileName)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const isoDate = toIsoDate(data.date)
  if (!isoDate) {
    console.warn(`[posts] Skipping ${fileName}: missing or invalid frontmatter date`)
    return null
  }

  const processedContent = rewriteImagePaths(content, fileName)
  const wordCount = countWords(content)

  return {
    slug: deriveSlug(fileName, data),
    imagePath: deriveImagePath(fileName),
    frontmatter: { ...data, date: isoDate } as PostFrontmatter,
    content: processedContent,
    wordCount,
    readingTime: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
  }
}

function loadAllPosts(): PostData[] {
  const fileNames = getAllMdxFiles(postsDirectory)
  const posts = fileNames
    .map(parsePost)
    .filter((p): p is PostData => p !== null)
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1))

  // Duplicate slugs would silently shadow each other — fail loudly at build time
  const seen = new Map<string, string>()
  for (const post of posts) {
    const existing = seen.get(post.slug)
    if (existing) {
      throw new Error(
        `[posts] Duplicate slug "${post.slug}" in "${post.imagePath}" and "${existing}". ` +
        `Set a unique "path" in one of the frontmatters.`
      )
    }
    seen.set(post.slug, post.imagePath)
  }

  return posts
}

// Module-level cache. In production (build / ISR) the posts directory is immutable,
// so every getStaticProps call can share one parse. In development we always re-read so
// new or edited posts show up without restarting the dev server.
let postsCache: PostData[] | null = null

function getAllPostsIncludingHidden(): PostData[] {
  if (process.env.NODE_ENV !== 'production') {
    return loadAllPosts()
  }
  if (!postsCache) {
    postsCache = loadAllPosts()
  }
  return postsCache
}

/** Scheduled posts: a date in the future keeps a post out of listings until it arrives. */
function isPublished(post: PostData, now = Date.now()): boolean {
  return new Date(post.frontmatter.date).getTime() <= now
}

/** Public, listed posts: not hidden, not scheduled in the future. Newest first. */
export function getAllPosts(): PostData[] {
  const now = Date.now()
  return getAllPostsIncludingHidden()
    .filter(post => !post.frontmatter.hidden && isPublished(post, now))
}

// Lightweight version for homepage - excludes content to reduce page data size
export function getAllPostsSummary(): PostSummary[] {
  return getAllPosts().map(({ content: _content, ...rest }) => rest)
}

/** All posts, including hidden and scheduled ones — used only for generating static paths. */
export function getAllPostsForPaths(): PostData[] {
  return getAllPostsIncludingHidden()
}

export function getPostBySlug(slug: string): PostData | null {
  return getAllPostsIncludingHidden().find(post => post.slug === slug) || null
}

// Efficient version: find a post within a pre-loaded list (avoids re-reading all files)
export function findPostInList(slug: string, posts: PostData[]): PostData | null {
  return posts.find(post => post.slug === slug) || null
}

function getAllMdxFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return fileList
  }

  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      getAllMdxFiles(filePath, fileList)
    } else if (file.endsWith('.mdx')) {
      fileList.push(path.relative(postsDirectory, filePath))
    }
  })

  return fileList
}
