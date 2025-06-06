import { GetStaticPaths, GetStaticProps } from 'next'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import { getAllPosts, getPostBySlug, PostData } from '../../lib/posts'
import Highlight from '../../components/Highlight'
import Dialogue from '../../components/Dialogue'
import GlyphLeft from '../../components/GlyphLeft'
import GlyphRight from '../../components/GlyphRight'
import FigureLabel from '../../components/FigureLabel'
import TextBox from '../../components/TextBox'
import YouTube from '../../components/YouTube'
import ResponsiveEmbed from '../../components/ResponsiveEmbed'

interface PostPageProps {
  source: MDXRemoteSerializeResult
  frontmatter: PostData['frontmatter']
  slug: string
}

// Define which components are available in MDX
const components = {
  Highlight,
  Dialogue,
  GlyphLeft,
  GlyphRight,
  FigureLabel,
  TextBox,
  YouTube,
  ResponsiveEmbed,
}

export default function PostPage({ source, frontmatter, slug }: PostPageProps) {
  // Helper function to get image path
  const getImagePath = (imageName: string) => {
    if (!imageName) return ''
    // For co-located images in the post directory structure
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
              objectFit: 'cover'
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
          {/* Social sharing would go here */}
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
          
          <div style={{ lineHeight: 1.6 }}>
            <MDXRemote {...source} components={components} />
          </div>
        </div>

        {/* Post Footer */}
        <div style={{ 
          marginTop: '3rem',
          padding: '2rem 0',
          borderTop: '1px solid #eee'
        }}>
          <p style={{ color: '#888' }}>
            By {frontmatter.author} • Tags: {frontmatter.hashtags}
          </p>
        </div>
      </div>
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = getAllPosts()
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