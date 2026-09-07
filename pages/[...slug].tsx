import { GetStaticPaths, GetStaticProps } from 'next'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'
import { getAllPosts, getAllPostsForPaths, PostData, PostFrontmatter } from '../lib/posts'
import { getRelatedPosts, getSeriesPosts } from '../lib/hashtags'
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
  series: { name: string; posts: SeriesEntry[] } | null
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
}

export default function PostPage({
  source, frontmatter, slug, imagePath, readingTime, wordCount, headings,
  prevPost, nextPost, relatedPosts, series,
}: PostPageProps) {
  const getImagePath = (imageName: string) => {
    if (!imageName) return ''
    if (imageName.startsWith('/')) return imageName
    return `/images/posts/${imagePath}/${imageName}`
  }

  const ogImage = frontmatter.featureImage
    ? `/images/posts/${imagePath}/${frontmatter.featureImage}`
    : frontmatter.cardImage
      ? `/images/posts/${imagePath}/${frontmatter.cardImage}`
      : undefined

  const postPath = frontmatter.path || `/${slug}`

  return (
    <article className={styles.container}>
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

      <ReadingProgress />

      {/* Post Header */}
      <div className={styles.postHeader}>
        <p className={styles.dateHeader}>
          <time dateTime={frontmatter.date}>{formatDate(frontmatter.date)}</time>
          <span className={styles.metaDivider} aria-hidden="true">·</span>
          <span>{formatReadingTime(readingTime)}</span>
        </p>
      </div>

      {/* Feature Image */}
      {frontmatter.featureImage && (
        <div className={styles.featureImageContainer}>
          <Image
            src={getImagePath(frontmatter.featureImage || '')}
            alt={frontmatter.title}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 84vw"
            style={{ objectFit: 'cover', objectPosition: 'top' }}
          />
        </div>
      )}

      {/* Left rail - table of contents (wide screens only; the inline variant takes over below 1440px) */}
      <aside className={styles.tocRail}>
        <div className={styles.tocSticky}>
          <TableOfContents headings={headings} variant="sidebar" />
        </div>
      </aside>

      {/* Sidebar - Social Share */}
      <aside className={styles.sidebar}>
        <SocialShare path={postPath} title={frontmatter.title} description={frontmatter.subTitle} image={ogImage} />
      </aside>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Post */}
        <div className={styles.post}>
          <h1 className={styles.postTitle}>
            {frontmatter.title}
          </h1>

          <p className={styles.postSubtitle}>
            <span className={styles.quoteStart} aria-hidden="true">❝</span>
            {frontmatter.subTitle}
            <span className={styles.quoteEnd} aria-hidden="true">❞</span>
          </p>

          {series && <SeriesBox name={series.name} posts={series.posts} currentSlug={slug} />}

          <div className={styles.tocInline}>
            <TableOfContents headings={headings} variant="inline" />
          </div>

          <div className={`mdx-content ${styles.mdxContent}`}>
            <MDXRemote {...source} components={components} />
          </div>
        </div>

        {/* Post Footer */}
        <PostFooter
          path={postPath}
          author={frontmatter.author}
        />

        <PostTags hashtags={frontmatter.hashtags} />

        {/* Share row for narrow screens where the sticky sidebar is hidden */}
        <div className={styles.mobileShare}>
          <SocialShare path={postPath} title={frontmatter.title} description={frontmatter.subTitle} image={ogImage} layout="horizontal" />
        </div>

        <PostNavigation prev={prevPost} next={nextPost} />

        <Comments term={postPath} />

        <RelatedPosts posts={relatedPosts} />

        <MailChimpForm />
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
    series = { name: seriesName, posts: members.map(p => ({ slug: p.slug, title: p.frontmatter.title })) }
  }

  const mdxSource = await serialize(post.content, {
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
