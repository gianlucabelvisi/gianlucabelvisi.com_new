import { GetStaticProps } from 'next'
import Link from 'next/link'
import { getAllPosts, PostData } from '../lib/posts'
import styles from '../styles/Home.module.css'

interface HomePageProps {
  posts: PostData[]
}

export default function HomePage({ posts }: HomePageProps) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>My Next.js MDX Blog</h1>
      <p style={{ color: '#666', marginBottom: '3rem' }}>
        Testing automatic MDX post discovery! 🚀
      </p>
      
      {posts.length === 0 ? (
        <p>No posts found. Add some .mdx files to the /posts directory!</p>
      ) : (
        <div>
          <h2>Posts ({posts.length})</h2>
          <div style={{ display: 'grid', gap: '1.5rem', marginTop: '2rem' }}>
            {posts.map((post) => (
              <div 
                key={post.slug}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  transition: 'box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0' }}>
                  <Link 
                    href={`/${post.slug}`}
                    className={styles.postTitleLink}
                  >
                    {post.frontmatter.title}
                  </Link>
                </h3>
                <p style={{ color: '#666', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                  {post.frontmatter.date} • by {post.frontmatter.author}
                </p>
                <p style={{ margin: '0 0 1rem 0', color: '#555' }}>
                  {post.frontmatter.subTitle}
                </p>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                  Tags: {post.frontmatter.hashtags}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '4rem', padding: '2rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h3>🎯 Test the automatic discovery!</h3>
        <p>Try this:</p>
        <ol>
          <li>Create a new .mdx file in the <code>/posts</code> directory</li>
          <li>Add some frontmatter and content</li>
          <li>Restart the dev server</li>
          <li>The post should automatically appear here!</li>
        </ol>
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const posts = getAllPosts()
  
  return {
    props: {
      posts
    }
  }
}
