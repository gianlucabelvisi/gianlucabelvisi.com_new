import { GetServerSideProps } from 'next'
import { getAllPostsSummary, PostSummary } from '../lib/posts'
import { parseHashtags } from '../lib/hashtags'
import { SITE_URL, SITE_NAME, AUTHOR_NAME } from '../lib/routes'
import { escapeXml } from '../lib/xml'

const SITE_DESCRIPTION = 'A blog about tech, books, coffee, history, and whatever else crosses my mind.'

function mimeFor(file: string): string {
  const ext = file.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'image/jpeg'
}

function generateRssFeed(posts: PostSummary[]): string {
  const items = posts
    .slice(0, 50) // limit to 50 most recent
    .map(post => {
      const url = `${SITE_URL}/${post.slug}`
      const title = escapeXml(post.frontmatter.title || '')
      const description = escapeXml(post.frontmatter.subTitle || '')
      const pubDate = new Date(post.frontmatter.date).toUTCString()
      const image = post.frontmatter.featureImage || post.frontmatter.cardImage
      const imageUrl = image ? `${SITE_URL}/images/posts/${post.imagePath}/${image}` : null
      const categories = parseHashtags(post.frontmatter.hashtags)
        .map(tag => `<category>${escapeXml(tag)}</category>`)
        .join('')

      return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(post.frontmatter.author || AUTHOR_NAME)}</dc:creator>
      ${categories}
      ${imageUrl ? `<enclosure url="${escapeXml(imageUrl)}" type="${mimeFor(imageUrl)}" length="0" />` : ''}
    </item>`
    })
    .join('')

  const lastBuildDate = posts[0] ? new Date(posts[0].frontmatter.date).toUTCString() : new Date().toUTCString()

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${lastBuildDate}</lastBuildDate>${items}
  </channel>
</rss>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const feed = generateRssFeed(getAllPostsSummary())

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(feed)
  res.end()

  return { props: {} }
}

export default function FeedPage() {
  return null
}
