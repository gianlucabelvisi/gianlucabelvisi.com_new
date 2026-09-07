import Head from 'next/head'
import { SITE_URL, SITE_NAME, AUTHOR_NAME } from '../lib/routes'

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
  /** Comma-separated hashtags — become article:tag + keywords */
  tags?: string
  /** Estimated reading time in minutes (used in JSON-LD timeRequired) */
  readingTime?: number
  wordCount?: number
  /** Set on listing pages that shouldn't be indexed (e.g. search) */
  noindex?: boolean
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  path = '/',
  type = 'website',
  publishedDate,
  author = AUTHOR_NAME,
  tags,
  readingTime,
  wordCount,
  noindex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${AUTHOR_NAME}` : SITE_NAME
  const normalizedPath = path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`
  const canonicalUrl = `${SITE_URL}${normalizedPath}`
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`
  const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

  const person = {
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: SITE_URL,
  }

  const jsonLd =
    type === 'article'
      ? {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: title,
          description,
          image: [imageUrl],
          url: canonicalUrl,
          mainEntityOfPage: canonicalUrl,
          datePublished: publishedDate,
          dateModified: publishedDate,
          author: person,
          publisher: person,
          inLanguage: 'en',
          keywords: tagList.length ? tagList.join(', ') : undefined,
          wordCount,
          timeRequired: readingTime ? `PT${readingTime}M` : undefined,
          isPartOf: { '@type': 'Blog', name: SITE_NAME, url: SITE_URL },
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          description: DEFAULT_DESCRIPTION,
          author: person,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={author} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      {tagList.length > 0 && <meta name="keywords" content={tagList.join(', ')} />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {readingTime ? <meta name="twitter:label1" content="Reading time" /> : null}
      {readingTime ? <meta name="twitter:data1" content={`${readingTime} min read`} /> : null}

      {/* RSS feed auto-discovery */}
      <link rel="alternate" type="application/rss+xml" title={SITE_NAME} href={`${SITE_URL}/feed.xml`} />

      {/* Article-specific */}
      {type === 'article' && publishedDate && (
        <meta property="article:published_time" content={publishedDate} />
      )}
      {type === 'article' && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && tagList.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  )
}
