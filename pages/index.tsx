import { GetStaticProps } from 'next'
import { getAllPosts, PostData } from '../lib/posts'
import { groupPostsForHomepage } from '../lib/hashtags'
import HeroCarousel from '../components/HeroCarousel'
import NetflixSlider from '../components/NetflixSlider'
import styles from '../styles/Home.module.css'

interface HomePageProps {
  posts: PostData[]
  groupedPosts: {
    latest: PostData[]
    caterina: PostData[]
    food: PostData[]
    mindfulness: PostData[]
    books: PostData[]
    randomized: PostData[]
    chronological: PostData[]
  }
}

export default function HomePage({ posts, groupedPosts }: HomePageProps) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--color-background-main)',
      color: 'var(--color-text-primary)'
    }}>
      {posts.length === 0 ? (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
          <h1 style={{ color: 'var(--color-text-primary)' }}>My Next.js MDX Blog</h1>
          <p>No posts found. Add some .mdx files to the /posts directory!</p>
        </div>
      ) : (
        <>
          {/* Netflix Hero Carousel */}
          <HeroCarousel posts={posts} autoAdvanceInterval={6000} />
          
          {/* Netflix Content Sliders */}
          <div style={{ padding: '2rem 0 2rem 0', position: 'relative', zIndex: 2 }}>
            <NetflixSlider 
              title="Latest Posts" 
              posts={groupedPosts.latest} 
            />
            
            {groupedPosts.caterina.length > 0 && (
              <NetflixSlider 
                title="Caterina Sforza Chronicles" 
                posts={groupedPosts.caterina} 
              />
            )}
            
            {groupedPosts.food.length > 0 && (
              <NetflixSlider 
                title="Food & Coffee Adventures" 
                posts={groupedPosts.food} 
              />
            )}
            
            {groupedPosts.mindfulness.length > 0 && (
              <NetflixSlider 
                title="Mindfulness & Reflection" 
                posts={groupedPosts.mindfulness} 
              />
            )}
            
            {groupedPosts.books.length > 0 && (
              <NetflixSlider 
                title="Books & Reading" 
                posts={groupedPosts.books} 
              />
            )}
            
            <NetflixSlider 
              title="Random Discovery" 
              posts={groupedPosts.randomized} 
            />
            
            <NetflixSlider 
              title="All Posts (Chronological)" 
              posts={groupedPosts.chronological} 
            />
          </div>
        </>
      )}
    </div>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const allPosts = getAllPosts()
  
  // Limit to first 20 posts for homepage performance
  const posts = allPosts.slice(0, 20)
  
  // Group posts for Netflix-style sliders
  const groupedPosts = groupPostsForHomepage(allPosts)
  
  return {
    props: {
      posts,
      groupedPosts
    },
    // Add ISR for homepage too
    revalidate: 3600
  }
}
