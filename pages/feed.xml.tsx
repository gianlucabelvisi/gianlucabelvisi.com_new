import { GetServerSideProps } from 'next'
import { getAllPosts } from '../lib/posts'

const SITE_URL = 'https://gianlucabelvisi.com'
const SITE_NAME = 'Gianluca Belvisi'
const SITE_DESCRIPTION = 'A blog about tech, books, coffee, history, and whatever else crosses my mind.'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateRssFeed(posts: ReturnType<typeof getAllPosts>): string {
  const items = posts
    .slice(0, 50) // limit to 50 most recent
    .map(post => {
      const url = `${SITE_URL}${post.frontmatter.path}`
      const title = escapeXml(post.frontmatter.title || '')
      const description = escapeXml(post.frontmatter.subTitle || '')
      const pubDate = new Date(post.frontmatter.date).toUTCString()
      const imageUrl = post.frontmatter.featureImage
        ? `${SITE_URL}/images/posts/${post.imagePath}/${post.frontmatter.featureImage}`
        : null

      return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      ${imageUrl ? `<enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />` : ''}
      ${post.frontmatter.author ? `<author>${escapeXml(post.frontmatter.author)}</author>` : ''}
    </item>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const posts = getAllPosts()
  const feed = generateRssFeed(posts)

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(feed)
  res.end()

  return { props: {} }
}

export default function FeedPage() {
  return null
}
