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

export default function PostPage({ source, frontmatter }: PostPageProps) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>{frontmatter.title}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        {frontmatter.subTitle} — by {frontmatter.author} on {frontmatter.date}
      </p>
      
      <div style={{ lineHeight: 1.6 }}>
        <MDXRemote {...source} components={components} />
      </div>
      
      <hr style={{ margin: '3rem 0' }} />
      <p style={{ color: '#888' }}>
        Tags: {frontmatter.hashtags}
      </p>
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
      frontmatter: post.frontmatter
    }
  }
} 