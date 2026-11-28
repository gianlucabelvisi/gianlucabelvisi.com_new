import { useEffect } from 'react'
import { GetStaticPaths, GetStaticProps } from 'next'
import dynamic from 'next/dynamic'
import Image, { getImageProps } from 'next/image'
import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'
import { getAllPosts, getAllPostsForPaths, PostData, PostFrontmatter } from '../lib/posts'
import { getRelatedPosts, getSeriesPosts } from '../lib/hashtags'
import { seriesInfo } from '../lib/series'
import { numberCaptions } from '../lib/captions'
import { extractHeadings, Heading } from '../lib/headings'
import { formatDate, formatReadingTime } from '../lib/dateUtils'
import SEO from '../components/SEO'
import styles from './posts/PostPage.module.css'
import PostNavigation from '../components/PostNavigation'
import PostTags from '../components/PostTags'
import TableOfContents from '../components/TableOfContents'
import RelatedPosts from '../components/RelatedPosts'
import { CardPost, toCardPost } from '../components/PostCard'
import SeriesBox, { SeriesEntry } from '../components/SeriesBox'
import CodeBlock from '../components/mdx/CodeBlock'

// Below-the-fold / interactive chrome (react-share is ~30KB; load it lazily)
const SocialShare = dynamic(() => import('../components/SocialShare'), { ssr: false })
const ReadingProgress = dynamic(() => import('../components/ReadingProgress'), { ssr: false })
const Comments = dynamic(() => import('../components/Comments'), { ssr: false })

// ── Always-used lightweight components (static imports) ──
import Highlight from '../components/Highlight'
import BlogSubTitle from '../components/BlogSubTitle'
import Dialogue from '../components/Dialogue'
import Quote from '../components/Quote'
import TextBox from '../components/TextBox'
import GlyphLeft from '../components/GlyphLeft'
import GlyphRight from '../components/GlyphRight'
import FigureLabel from '../components/FigureLabel'
import MarginBottom from '../components/MarginBottom'
import Email from '../components/Email'
import Break from '../components/mdx/Break'
import Indented from '../components/mdx/Indented'
import Question from '../components/mdx/Question'
import SpicyTake from '../components/mdx/SpicyTake'
import LinkButton from '../components/mdx/LinkButton'
import Spoiler from '../components/Spoiler'

// ── Client-only components (no SSR) ──
const YouTube = dynamic(() => import('../components/YouTube'), { ssr: false })
const YouTubeAudio = dynamic(() => import('../components/YouTubeAudio'), { ssr: false })
const Poll = dynamic(() => import('../components/Poll'), { ssr: false })
const PostFooter = dynamic(() => import('../components/PostFooter'), { ssr: false })
const MailChimpForm = dynamic(() => import('../components/MailChimpForm'), { ssr: false })

// ── Rarely-used / heavy components (dynamic imports, with SSR) ──
const ResponsiveEmbed = dynamic(() => import('../components/ResponsiveEmbed'))
const Pony = dynamic(() => import('../components/Pony'))
const ShakyTitle = dynamic(() => import('../components/ShakyTitle').then(m => ({ default: m.ShakyTitle })))
const UnicornButton = dynamic(() => import('../components/UnicornButton'))
const ThreeColumns = dynamic(() => import('../components/ThreeColumns'))
const Col23 = dynamic(() => import('../components/Col23'))
const Richer = dynamic(() => import('../components/Richer'))
const Greenlights = dynamic(() => import('../components/Greenlights'))
const Hailmary = dynamic(() => import('../components/Hailmary'))
const Pride = dynamic(() => import('../components/Pride'))
const Crime = dynamic(() => import('../components/Crime'))
const Truth = dynamic(() => import('../components/Truth'))
const Books2022 = dynamic(() => import('../components/Books2022'))
const FilmCard = dynamic(() => import('../components/mdx/FilmCard'))
const Formula = dynamic(() => import('../components/mdx/Formula'))
const Listen = dynamic(() => import('../components/mdx/Listen'))
const Nsfw = dynamic(() => import('../components/mdx/Nsfw'))
const Batman = dynamic(() => import('../components/mdx/Batman'))
const Reddit = dynamic(() => import('../components/mdx/Reddit'))
const Song = dynamic(() => import('../components/mdx/Song'))
const ProfitBox = dynamic(() => import('../components/ProfitBox'))
const TvCard = dynamic(() => import('../components/mdx/TvCard'))
const ApartmentPipeline = dynamic(() => import('../components/mdx/ApartmentPipeline'))

interface NavPost {
  frontmatter: {
    title: string
    path: string
    cardImage?: string
  }
  imagePath: string
}

interface PostPageProps {
  source: MDXRemoteSerializeResult
  frontmatter: PostFrontmatter
  slug: string
  imagePath: string
  readingTime: number
  wordCount: number
  headings: Heading[]
  prevPost: NavPost | null
  nextPost: NavPost | null
  relatedPosts: CardPost[]
  series: { name: string; slug: string; title: string; kind: 'serial' | 'collection'; unit: string; posts: SeriesEntry[] } | null
}

type MdxImageProps = React.ImgHTMLAttributes<HTMLImageElement>

// MDX content image component using next/image for optimization
const MdxImage = ({ src, alt, width: _w, height: _h, ...rest }: MdxImageProps) => {
  if (!src || typeof src !== 'string') return null

  // External images — next/image can't optimize arbitrary remote hosts
  if (src.startsWith('http')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt || ''} loading="lazy" decoding="async" style={{ maxWidth: '100%', height: 'auto' }} />
  }

  return (
    <Image
      src={src}
      alt={alt || ''}
      width={800}
      height={450}
      loading="lazy"
      sizes="(max-width: 900px) 100vw, 700px"
      style={{ width: '100%', height: 'auto' }}
      {...rest}
    />
  )
}

type CodeProps = React.HTMLAttributes<HTMLElement>

// Define which components are available in MDX
const components = {
  // Override native elements
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => <CodeBlock {...props} />,
  code: (props: CodeProps) => {
    // If code has a className (language), it's likely inside a pre block — return as-is
    if (props.className && props.className.startsWith('language-')) {
      return <code {...props} />
    }
    // Inline code — styled via .mdxContent code:not(pre code)
    return <code {...props} />
  },
  img: MdxImage,
  // MDX components
  Highlight,
  BlogSubTitle,
  Dialogue,
  Email,
  GlyphLeft,
  GlyphRight,
  FigureLabel,
  MarginBottom,
  Quote,
  TextBox,
  YouTube,
  ResponsiveEmbed,
  Pony,
  Poll,
  PostFooter,
  ShakyTitle,
  UnicornButton,
  ThreeColumns,
  Col23,
  YouTubeAudio,
  Richer,
  Greenlights,
  Hailmary,
  Pride,
  Crime,
  Truth,
  Books2022,
  Spoiler,
  FilmCard,
  Formula,
  Indented,
  Listen,
  Nsfw,
  Batman,
  Reddit,
  Break,
  Song,
  Question,
  ProfitBox,
  TvCard,
  SpicyTake,
  LinkButton,
  ApartmentPipeline,
}

export default function PostPage({
  source, frontmatter, slug, imagePath, readingTime, wordCount, headings,
  prevPost, nextPost, relatedPosts, series,
}: PostPageProps) {
  const getImagePath = (imageName?: string) => {
    if (!imageName) return ''
    if (imageName.startsWith('/')) return imageName
    return `/images/posts/${imagePath}/${imageName}`
  }

  const ogImage = frontmatter.featureImage
    ? getImagePath(frontmatter.featureImage)
    : frontmatter.cardImage
      ? getImagePath(frontmatter.cardImage)
      : undefined

  const postPath = frontmatter.path || `/${slug}`

  // Hero art: the wide feature image, swapped for the phone crop on narrow screens
  const wide = getImagePath(frontmatter.featureImage || frontmatter.cardImage)
  const tall = getImagePath(frontmatter.featureImagePhone) || wide
  const heroShared = { alt: '', fill: true, sizes: '100vw', priority: true } as const
  const wideProps = wide ? getImageProps({ ...heroShared, src: wide }).props : null
  const tallProps = tall ? getImageProps({ ...heroShared, src: tall }).props : null

  // Arriving on a caption link (#caption-N, from the homepage's "Out of context" row): images above the caption
  // are still loading and keep pushing it down, so re-settle on it until they're in or the reader takes over.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id.startsWith('caption-')) return
    const target = document.getElementById(id)
    if (!target) return
    const settle = () => target.scrollIntoView({ block: 'end' })
    const stop = () => {
      document.removeEventListener('load', settle, true)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
      clearTimeout(timer)
    }
    const timer = setTimeout(stop, 6000)
    document.addEventListener('load', settle, true) // image loads don't bubble; capture catches them
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    settle()
    return stop
  }, [slug])

  // Where this post sits in its series, if it has one
  const seriesIndex = series ? series.posts.findIndex(p => p.slug === slug) : -1
  const serial = series?.kind === 'serial' && series.posts.length > 1
  const nextInSeries = serial && seriesIndex >= 0 ? series.posts[seriesIndex + 1] : undefined

  return (
    <article className={styles.article}>
      <SEO
        title={frontmatter.title}
        description={frontmatter.subTitle}
        image={ogImage}
        path={postPath}
        type="article"
        publishedDate={frontmatter.date}
        author={frontmatter.author}
        tags={frontmatter.hashtags}
        readingTime={readingTime}
        wordCount={wordCount}
      />

      <ReadingProgress slug={slug} />

      {/* Ink hero: the post opens in the same dark as the homepage, then the paper rises over it */}
      <header className={`${styles.hero} ${wideProps ? '' : styles.heroPlain}`} data-ink-zone>
        {wideProps && (
          <picture className={styles.heroImage}>
            {tallProps && <source media="(max-width: 700px)" srcSet={tallProps.srcSet} sizes="100vw" />}
            {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes with the props from next/image's getImageProps (art direction needs <picture>) */}
            <img {...wideProps} />
          </picture>
        )}
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <p className={styles.kicker}>
            {series && serial && seriesIndex >= 0 && (
              <Link href={`/?series=${series.slug}`} className={styles.kickerLabel}>{series.title} · {series.unit} {seriesIndex + 1} of {series.posts.length}</Link>
            )}
            <time dateTime={frontmatter.date}>{formatDate(frontmatter.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{formatReadingTime(readingTime)}</span>
          </p>
          <h1 className={styles.title}>{frontmatter.title}</h1>
          {frontmatter.subTitle && <p className={styles.subtitle}>{frontmatter.subTitle}</p>}
        </div>
      </header>

      <div className={styles.sheet}>
        {/* Left rail: share (wide screens) */}
        <aside className={styles.shareRail}>
          <div className={styles.sticky}>
            <SocialShare path={postPath} title={frontmatter.title} description={frontmatter.subTitle} image={ogImage} />
          </div>
        </aside>

        <div className={styles.column}>
          {series && serial && <SeriesBox name={series.title} kind="serial" posts={series.posts} currentSlug={slug} />}

          <div className={styles.tocInline}>
            <TableOfContents headings={headings} variant="inline" />
          </div>

          <div className={`mdx-content ${styles.mdxContent}`}>
            <MDXRemote {...source} components={components} />
          </div>

          {/* ReadingProgress measures to here: the end of the writing, not of the page */}
          <div data-reading-end />

          {nextInSeries && series && (
            <Link href={`/${nextInSeries.slug}`} className={styles.nextPart}>
              <span className={styles.nextKicker}>Next in {series.title} · {series.unit} {seriesIndex + 2} of {series.posts.length}</span>
              <span className={styles.nextTitle}>{nextInSeries.title} <FiArrowRight aria-hidden="true" /></span>
            </Link>
          )}

          <PostFooter
            path={postPath}
            author={frontmatter.author}
          />

          <PostTags hashtags={frontmatter.hashtags} />

          {/* Share row for narrow screens where the rail is hidden */}
          <div className={styles.mobileShare}>
            <SocialShare path={postPath} title={frontmatter.title} description={frontmatter.subTitle} image={ogImage} layout="horizontal" />
          </div>

          {series && !serial && series.posts.length > 1 && (
            <SeriesBox name={series.title} kind="collection" posts={series.posts} currentSlug={slug} />
          )}

          <PostNavigation prev={prevPost} next={nextPost} />

          <Comments term={postPath} />

          <RelatedPosts posts={relatedPosts} />

          <MailChimpForm />
        </div>

        {/* Right rail: table of contents (wide screens; the inline variant takes over below) */}
        <aside className={styles.tocRail}>
          <div className={styles.sticky}>
            <TableOfContents headings={headings} variant="sidebar" />
          </div>
        </aside>
      </div>
    </article>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = getAllPostsForPaths()
  const paths = posts.map(post => ({
    params: { slug: post.slug.split('/') }
  }))

  return { paths, fallback: false }
}



const SHIKI_LANGS = [
  'javascript', 'jsx', 'typescript', 'tsx', 'json', 'css', 'html', 'markdown',
  'bash', 'shell', 'python', 'csharp', 'yaml', 'sql', 'diff',
]

export const getStaticProps: GetStaticProps<PostPageProps> = async ({ params }) => {
  const slug = (params?.slug as string[])?.join('/')

  // Listed posts drive prev/next + related; hidden/scheduled posts are still reachable by URL
  const allPosts = getAllPosts()
  const allForPaths = getAllPostsForPaths()
  const currentIndex = allPosts.findIndex(p => p.slug === slug)
  const post = allPosts[currentIndex] ?? allForPaths.find(p => p.slug === slug) ?? null

  if (!post) {
    return { notFound: true }
  }

  const toNavPost = (p: PostData | undefined): NavPost | null => p ? {
    frontmatter: { title: p.frontmatter.title, path: p.frontmatter.path, cardImage: p.frontmatter.cardImage },
    imagePath: p.imagePath
  } : null

  const prevPost = currentIndex >= 0 ? toNavPost(allPosts[currentIndex + 1]) : null // older
  const nextPost = currentIndex >= 0 ? toNavPost(allPosts[currentIndex - 1]) : null // newer

  const relatedPosts = getRelatedPosts(post, allPosts, 4).map(toCardPost)

  const seriesName = typeof post.frontmatter.series === 'string' ? post.frontmatter.series : null
  let series: PostPageProps['series'] = null
  if (seriesName) {
    // Listed posts only, but a hidden/scheduled current post still sees itself in its own series
    const members = getSeriesPosts(seriesName, allPosts)
    if (!members.some(p => p.slug === post.slug)) {
      members.push(post)
      members.sort((a, b) => a.frontmatter.date.localeCompare(b.frontmatter.date))
    }
    const info = seriesInfo(seriesName)
    series = { name: seriesName, slug: info.slug, title: info.title, kind: info.kind, unit: info.unit, posts: members.map(p => ({ slug: p.slug, title: p.frontmatter.title })) }
  }

  // Figure captions get stable anchors (#caption-N) so the homepage's "Out of context" cards can link to them
  const mdxSource = await serialize(numberCaptions(post.content), {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeShiki, {
          theme: 'github-dark',
          addLanguageClass: true,
          // Preload only the grammars posts actually use; shiki's default is all ~220,
          // which costs ~3s on a cold start (every dev-server compile). Anything else
          // is loaded on demand thanks to `lazy`.
          langs: SHIKI_LANGS,
          lazy: true,
        }],
      ],
    },
    parseFrontmatter: false,
    scope: {},
    blockJS: false,
    blockDangerousJS: false,
  })

  return {
    props: {
      source: mdxSource,
      frontmatter: post.frontmatter,
      slug,
      imagePath: post.imagePath,
      readingTime: post.readingTime,
      wordCount: post.wordCount,
      headings: extractHeadings(post.content),
      prevPost,
      nextPost,
      relatedPosts,
      series,
    },
    revalidate: 3600
  }
}
