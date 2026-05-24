import { GetStaticPaths, GetStaticProps } from 'next'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import remarkGfm from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'
import { getAllPosts, getAllPostsForPaths, findPostInList, PostData } from '../lib/posts'
import { formatDate } from '../lib/dateUtils'
import SEO from '../components/SEO'
import styles from './posts/PostPage.module.css'
import SocialShare from '../components/SocialShare'
import PostNavigation from '../components/PostNavigation'
import CodeBlock from '../components/mdx/CodeBlock'

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
  frontmatter: PostData['frontmatter']
  slug: string
  imagePath: string
  prevPost: NavPost | null
  nextPost: NavPost | null
}

// MDX content image component using next/image for optimization
const MdxImage = (props: any) => {
  const { src, alt, ...rest } = props
  if (!src) return null

  // External images — use regular img
  if (src.startsWith('http')) {
    return <img src={src} alt={alt || ''} loading="lazy" style={{ maxWidth: '100%', height: 'auto' }} />
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

// Define which components are available in MDX
const components = {
  // Override native elements
  pre: (props: any) => <CodeBlock {...props} />,
  code: (props: any) => {
    // If code has a className (language), it's likely inside a pre block — return as-is
    if (props.className && props.className.startsWith('language-')) {
      return <code {...props} />
    }
    // Inline code
    return (
      <code style={{
        background: '#f1f5f9',
        color: '#1e293b',
        padding: '0.2rem 0.4rem',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '0.875em'
      }} {...props} />
    )
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

export default function PostPage({ source, frontmatter, slug, imagePath, prevPost, nextPost }: PostPageProps) {
  const getImagePath = (imageName: string) => {
    if (!imageName) return ''
    if (imageName.startsWith('/')) return imageName
    return `/images/posts/${imagePath}/${imageName}`
  }

  const ogImage = frontmatter.featureImage
    ? `/images/posts/${imagePath}/${frontmatter.featureImage}`
    : undefined

  return (
    <div className={styles.container}>
      <SEO
        title={frontmatter.title}
        description={frontmatter.subTitle}
        image={ogImage}
        path={frontmatter.path}
        type="article"
        publishedDate={frontmatter.date}
        author={frontmatter.author}
      />

      {/* Post Header */}
      <div className={styles.postHeader}>
        <h2 className={styles.dateHeader}>
           {formatDate(frontmatter.date)}
         </h2>
      </div>

      {/* Feature Image */}
      {frontmatter.featureImage && (
        <div className={styles.featureImageContainer}>
          <Image
            src={getImagePath(frontmatter.featureImage || '')}
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 84vw"
            style={{ objectFit: 'cover', objectPosition: 'top' }}
          />
        </div>
      )}

      {/* Sidebar - Social Share */}
      <div className={styles.sidebar}>
        <SocialShare path={frontmatter.path || `/posts/${slug}`} />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Post */}
        <div className={styles.post}>
          <h1 className={styles.postTitle}>
            {frontmatter.title}
          </h1>

          <div className={styles.postSubtitle}>
            <span className={styles.quoteStart}>❝</span>
            {frontmatter.subTitle}
            <span className={styles.quoteEnd}>❞</span>
          </div>

          <div className={`mdx-content ${styles.mdxContent}`}>
            <MDXRemote {...source} components={components} />
          </div>
        </div>

        {/* Post Footer */}
        <PostFooter
          path={frontmatter.path || `/posts/${slug}`}
          author={frontmatter.author}
        />

        <p className={styles.postTags}>
          Tags: {frontmatter.hashtags}
        </p>

        <PostNavigation prev={prevPost} next={nextPost} />

        <MailChimpForm />
      </div>
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = getAllPostsForPaths()
  const paths = posts.map(post => ({
    params: { slug: post.slug.split('/') }
  }))

  return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = (params?.slug as string[])?.join('/')

  // Single call to get all posts — used for both the current post and prev/next nav
  const allPosts = getAllPosts()
  const currentIndex = allPosts.findIndex(p => p.slug === slug)
  const post = allPosts[currentIndex] ?? null

  if (!post) {
    return { notFound: true }
  }

  const toNavPost = (p: PostData | undefined) => p ? {
    frontmatter: { title: p.frontmatter.title, path: p.frontmatter.path, cardImage: p.frontmatter.cardImage },
    imagePath: p.imagePath
  } : null

  const prevPost = toNavPost(allPosts[currentIndex + 1]) // older
  const nextPost = toNavPost(allPosts[currentIndex - 1]) // newer

  const mdxSource = await serialize(post.content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        [rehypeShiki, {
          theme: 'github-dark',
        }],
      ],
    },
    parseFrontmatter: false,
    scope: {}
  })

  return {
    props: {
      source: mdxSource,
      frontmatter: post.frontmatter,
      slug: slug,
      imagePath: post.imagePath,
      prevPost,
      nextPost,
    },
    revalidate: 3600
  }
}
