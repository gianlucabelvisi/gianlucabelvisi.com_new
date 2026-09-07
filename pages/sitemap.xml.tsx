import { GetServerSideProps } from 'next'
import { getAllPostsSummary } from '../lib/posts'
import { getAllHashtags, filterPostsByTagSlug } from '../lib/hashtags'
import { SITE_URL } from '../lib/routes'
import { escapeXml } from '../lib/xml'

interface Entry {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
}

function toUrl(entry: Entry): string {
  return `
  <url>
    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `
    <lastmod>${entry.lastmod}</lastmod>` : ''}${entry.changefreq ? `
    <changefreq>${entry.changefreq}</changefreq>` : ''}${entry.priority ? `
    <priority>${entry.priority}</priority>` : ''}
  </url>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const posts = getAllPostsSummary()
  const latest = posts[0]?.frontmatter.date

  const entries: Entry[] = [
    { loc: `${SITE_URL}/`, lastmod: latest, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/archive`, lastmod: latest, changefreq: 'weekly', priority: '0.6' },
    { loc: `${SITE_URL}/tags`, lastmod: latest, changefreq: 'weekly', priority: '0.5' },
    ...posts.map(post => ({
      loc: `${SITE_URL}/${post.slug}`,
      lastmod: post.frontmatter.date,
      changefreq: 'monthly',
      priority: '0.8',
    })),
    ...getAllHashtags(posts).map(({ slug }) => ({
      loc: `${SITE_URL}/tags/${slug}`,
      lastmod: filterPostsByTagSlug(posts, slug)[0]?.frontmatter.date,
      changefreq: 'monthly',
      priority: '0.4',
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(toUrl).join('')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(xml)
  res.end()

  return { props: {} }
}

export default function SitemapPage() {
  return null
}
