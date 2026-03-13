import Head from 'next/head'

const SITE_URL = 'https://gianlucabelvisi.com'
const SITE_NAME = 'Gianluca Belvisi'
const DEFAULT_DESCRIPTION = 'A blog about tech, books, coffee, history, and whatever else crosses my mind.'
const DEFAULT_IMAGE = `${SITE_URL}/images/og-default.jpg`

interface SEOProps {
  title?: string
  description?: string
  image?: string
  path?: string
  type?: 'website' | 'article'
  publishedDate?: string
  author?: string
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  path = '/',
  type = 'website',
  publishedDate,
  author = SITE_NAME,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
  const canonicalUrl = `${SITE_URL}${path}`
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={author} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* RSS feed auto-discovery */}
      <link rel="alternate" type="application/rss+xml" title={SITE_NAME} href={`${SITE_URL}/feed.xml`} />

      {/* Article-specific */}
      {type === 'article' && publishedDate && (
        <meta property="article:published_time" content={publishedDate} />
      )}
      {type === 'article' && (
        <meta property="article:author" content={author} />
      )}
    </Head>
  )
}
