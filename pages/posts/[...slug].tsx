import { GetStaticPaths, GetStaticProps } from 'next'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import { getAllPosts, getAllPostsForPaths, getPostBySlug, PostData } from '../../lib/posts'
import '../../styles/blog.css'
import styles from './PostPage.module.css'
import Highlight from '../../components/Highlight'
import BlogSubTitle from '../../components/BlogSubTitle'
import Dialogue from '../../components/Dialogue'
import Email from '../../components/Email'
import GlyphLeft from '../../components/GlyphLeft'
import GlyphRight from '../../components/GlyphRight'
import FigureLabel from '../../components/FigureLabel'
import MarginBottom from '../../components/MarginBottom'
import Quote from '../../components/Quote'
import TextBox from '../../components/TextBox'
import YouTube from '../../components/YouTube'
import ResponsiveEmbed from '../../components/ResponsiveEmbed'
import Pony from '../../components/Pony'
import Poll from '../../components/Poll'
import { ShakyTitle } from '../../components/ShakyTitle'
import UnicornButton from '../../components/UnicornButton'
import ThreeColumns from '../../components/ThreeColumns'
import Col23 from '../../components/Col23'
import YouTubeAudio from '../../components/YouTubeAudio'
import Richer from '../../components/Richer'
import Greenlights from '../../components/Greenlights'
import Hailmary from '../../components/Hailmary'
import Pride from '../../components/Pride'
import Crime from '../../components/Crime'
import Truth from '../../components/Truth'
import Books2022 from '../../components/Books2022'
import Spoiler from '../../components/Spoiler'
import FilmCard from '../../components/mdx/FilmCard'
import Formula from '../../components/mdx/Formula'
import Indented from '../../components/mdx/Indented'
import Listen from '../../components/mdx/Listen'
import Nsfw from '../../components/mdx/Nsfw'
import Batman from '../../components/mdx/Batman'
import Reddit from '../../components/mdx/Reddit'
import Break from '../../components/mdx/Break'
import Song from '../../components/mdx/Song'
import Question from '../../components/mdx/Question'
import ProfitBox from '../../components/ProfitBox'
import SocialShare from '../../components/SocialShare'
import PostFooter from '../../components/PostFooter'
import MailChimpForm from '../../components/MailChimpForm'
import CodeBlock from '../../components/mdx/CodeBlock'
// import InlineCode from '../../components/mdx/InlineCode'
import TvCard from '../../components/mdx/TvCard'
import SpicyTake from '../../components/mdx/SpicyTake'
import LinkButton from '../../components/mdx/LinkButton'

interface PostPageProps {
  source: MDXRemoteSerializeResult
  frontmatter: PostData['frontmatter']
  slug: string
}

// Define which components are available in MDX
const components = {
  // Code components
  pre: (props: any) => {
    return <CodeBlock {...props} />;
  },
  code: (props: any) => {
    // If code has a className (language), it's likely inside a pre block, return as is
    if (props.className && props.className.startsWith('language-')) {
      return <code {...props} />;
    }
    // Otherwise it's inline code - temporarily using regular code element
    return <code style={{
      background: '#f1f5f9',
      color: '#1e293b',
      padding: '0.2rem 0.4rem',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '0.875em'
    }} {...props} />;
  },
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

export default function PostPage({ source, frontmatter, slug }: PostPageProps) {
  // Helper function to get image path
  const getImagePath = (imageName: string) => {
    if (!imageName) return ''
    
    // If the imageName is already an absolute path, return it as-is
    if (imageName.startsWith('/')) {
      return imageName
    }
    
    // For co-located images, the slug already represents the correct directory structure
    // The posts.ts file handles slug processing (removing index.mdx, etc.)
    // So we can use the slug directly as the image directory
    return `/images/posts/${slug}/${imageName}`
  }
  
  // Format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
  return (
    <div className={styles.container}>
      
      {/* Post Header */}
      <div className={styles.postHeader}>
        <h2 className={styles.dateHeader}>
           {formatDate(frontmatter.date)}
         </h2>
      </div>

      {/* Feature Image */}
      {frontmatter.featureImage && (
        <div className={styles.featureImageContainer}>
          <img 
            src={getImagePath(frontmatter.featureImage || '')}
            alt="Feature Image"
            className={styles.featureImage}
          />
        </div>
      )}

      {/* Content Area */}
      <div className={styles.contentArea}>
        
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <SocialShare path={frontmatter.path || `/posts/${slug}`} />
        </div>

        {/* Post Content */}
        <div className={styles.postContent}>
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
        <div className={styles.postFooterArea}>
          <PostFooter 
            path={frontmatter.path || `/posts/${slug}`} 
            author={frontmatter.author} 
          />
          <p className={styles.postTags}>
            Tags: {frontmatter.hashtags}
          </p>
          
          <MailChimpForm />
        </div>
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
  const post = getPostBySlug(slug)
  
  if (!post) {
    return { notFound: true }
  }
  
  const mdxSource = await serialize(post.content)
  
  return {
    props: {
      source: mdxSource,
      frontmatter: post.frontmatter,
      slug: slug
    }
  }
} 