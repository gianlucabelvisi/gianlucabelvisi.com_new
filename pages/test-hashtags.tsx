import { GetStaticProps } from 'next'
import { getAllPosts, PostData } from '../lib/posts'
import { containsHashtags, filterPostsByHashtags, groupPostsForHomepage, getAllHashtags } from '../lib/hashtags'

interface TestPageProps {
  posts: PostData[]
  allHashtags: string[]
  grouped: ReturnType<typeof groupPostsForHomepage>
}

export default function TestHashtagsPage({ posts, allHashtags, grouped }: TestPageProps) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'monospace' }}>
      <h1>🏷️ Hashtag System Test</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>📊 Stats</h2>
        <p>Total posts: {posts.length}</p>
        <p>Total unique hashtags: {allHashtags.length}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🏰 Caterina Sforza Series ({grouped.caterina.length} posts)</h2>
        {grouped.caterina.map(post => (
          <div key={post.slug} style={{ marginLeft: '1rem' }}>
            • <a href={`/${post.slug}`}>{post.frontmatter.title}</a>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🧘 Mindfulness Posts ({grouped.mindfulness.length} posts)</h2>
        {grouped.mindfulness.slice(0, 5).map(post => (
          <div key={post.slug} style={{ marginLeft: '1rem' }}>
            • <a href={`/${post.slug}`}>{post.frontmatter.title}</a>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🍕 Food Posts ({grouped.food.length} posts)</h2>
        {grouped.food.slice(0, 5).map(post => (
          <div key={post.slug} style={{ marginLeft: '1rem' }}>
            • <a href={`/${post.slug}`}>{post.frontmatter.title}</a>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🎯 Featured Post</h2>
        <div style={{ marginLeft: '1rem' }}>
          • <a href={`/${grouped.featured.slug}`}>{grouped.featured.frontmatter.title}</a>
        </div>
      </div>

      <div>
        <h2>🏷️ All Hashtags</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {allHashtags.map(tag => (
            <span key={tag} style={{ 
              background: '#f0f0f0', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '4px',
              fontSize: '0.8rem'
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const posts = getAllPosts()
  const allHashtags = getAllHashtags(posts)
  const grouped = groupPostsForHomepage(posts)
  
  return {
    props: {
      posts,
      allHashtags,
      grouped
    }
  }
}

