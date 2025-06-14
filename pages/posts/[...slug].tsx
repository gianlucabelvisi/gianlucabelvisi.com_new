import { GetStaticPaths, GetStaticProps } from 'next'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import { getAllPosts, getAllPostsForPaths, getPostBySlug, PostData } from '../../lib/posts'
import '../../styles/blog.css'
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
import ProfitBox from '../../components/ProfitBox'
import SocialShare from '../../components/SocialShare'
import PostFooter from '../../components/PostFooter'
import MailChimpForm from '../../components/MailChimpForm'
import CodeBlock from '../../components/mdx/CodeBlock'
// import InlineCode from '../../components/mdx/InlineCode'
import TvCard from '../../components/mdx/TvCard'
import SpicyTake from '../../components/mdx/SpicyTake'

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
  ProfitBox,
  TvCard,
  SpicyTake,
}

export default function PostPage({ source, frontmatter, slug }: PostPageProps) {
  // Helper function to get image path
  const getImagePath = (imageName: string) => {
    if (!imageName) return ''
    
    // If the imageName is already an absolute path, return it as-is
    if (imageName.startsWith('/')) {
      return imageName
    }
    
    // For co-located images, we need to find the correct directory
    // The images are copied to the post directory structure
    // If the slug has a filename part (not index), remove it to get the directory
    let imageDir = slug
    const parts = slug.split('/')
    
    // If the slug looks like "2021/sforza-1/sforza1", we want "2021/sforza-1"
    // This happens when the MDX file is not named "index.mdx"
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]
      const secondLastPart = parts[parts.length - 2]
      
      // If the last part looks like a filename (not just a directory name)
      // and it's different from the directory name, remove it
      if (lastPart !== secondLastPart && lastPart !== 'index') {
        imageDir = parts.slice(0, -1).join('/')
      }
    }
    
    return `/images/posts/${imageDir}/${imageName}`
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
    <div style={{
      height: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr repeat(12, minmax(auto, 4.2rem)) 1fr',
      gridTemplateRows: '7.8rem 20rem 4rem auto',
      gap: '0 2rem',
      '@media (max-width: 768px)': {
        gridTemplateColumns: '2rem repeat(6, 1fr) 2rem',
        gridGap: '0 1rem'
      }
    } as React.CSSProperties}>
      
      {/* Post Header */}
      <div style={{
        gridColumn: '3 / span 10',
        gridRow: '1 / 2',
        position: 'relative'
      }}>
        <h2 style={{
          position: 'absolute',
          bottom: 0,
          margin: 0,
          color: '#666'
                 }}>
           {formatDate(frontmatter.date)}
         </h2>
      </div>

      {/* Feature Image */}
      {frontmatter.featureImage && (
        <div style={{
          gridColumn: '3 / span 10',
          gridRow: '2 / 4',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <img 
            src={getImagePath(frontmatter.featureImage || '')}
            alt="Feature Image"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top'
            }}
          />
        </div>
      )}

      {/* Content Area */}
      <div style={{
        position: 'relative',
        gridColumn: '4 / span 8',
        gridRow: '3 / span 5',
        backgroundColor: '#ffffff',
        padding: '2rem',
        zIndex: 1,
        marginBottom: '1rem'
      }}>
        
        {/* Sidebar */}
        <div style={{
          position: 'sticky',
          top: 0
        }}>
          <SocialShare path={frontmatter.path || `/posts/${slug}`} />
        </div>

        {/* Post Content */}
        <div>
          <h1 style={{
            marginBottom: '2rem',
            fontSize: '2.5rem',
            fontWeight: 'bold'
          }}>
            {frontmatter.title}
          </h1>
          
          <div style={{
            marginBottom: '2rem',
            textAlign: 'left',
            fontSize: 'larger',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ color: '#ff9664', marginRight: '.5rem' }}>❝</span>
            {frontmatter.subTitle}
            <span style={{ color: '#ff9664', marginLeft: '.5rem' }}>❞</span>
          </div>
          
          <div className="mdx-content" style={{ lineHeight: 1.6 }}>
            <MDXRemote {...source} components={components} />
          </div>
        </div>

        {/* Post Footer */}
        <div style={{ 
          marginTop: '3rem',
          padding: '2rem 0'
        }}>
          <PostFooter 
            path={frontmatter.path || `/posts/${slug}`} 
            author={frontmatter.author} 
          />
          <p style={{ color: '#888', marginTop: '1rem' }}>
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