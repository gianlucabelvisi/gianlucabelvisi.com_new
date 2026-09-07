import { GetStaticProps } from 'next'
import { getAllPostsSummary, PostSummary } from '../lib/posts'
import { groupPostsForHomepage } from '../lib/hashtags'
import HeroCarousel from '../components/HeroCarousel'
import NetflixSlider from '../components/NetflixSlider'
import LazySection from '../components/LazySection'
import SEO from '../components/SEO'
import styles from '../styles/Home.module.css'

interface HomePageProps {
  groupedPosts: {
    featured: PostSummary
    latest: PostSummary[]
    caterina: PostSummary[]
    food: PostSummary[]
    mindfulness: PostSummary[]
    books: PostSummary[]
    randomized: PostSummary[]
    chronological: PostSummary[]
  }
}

export default function HomePage({ groupedPosts }: HomePageProps) {
  // Derive carousel posts from grouped data (featured + latest) — no duplicate prop needed
  const carouselPosts = groupedPosts.featured
    ? [groupedPosts.featured, ...groupedPosts.latest]
    : groupedPosts.latest

  const hasPosts = carouselPosts.length > 0

  return (
    <div className={styles.homePage}>
      <SEO />
      {!hasPosts ? (
        <div className={styles.emptyState}>
          <h1>My Next.js MDX Blog</h1>
          <p>No posts found. Add some .mdx files to the /posts directory!</p>
        </div>
      ) : (
        <>
          {/* Netflix Hero Carousel */}
          <HeroCarousel posts={carouselPosts} autoAdvanceInterval={6000} />

          {/* Netflix Content Sliders — first row renders immediately, the rest as they approach the viewport */}
          <div className={styles.slidersContainer}>
            <NetflixSlider
              title="Latest Posts"
              posts={groupedPosts.latest}
              moreHref="/archive"
            />

            {groupedPosts.caterina.length > 0 && (
              <LazySection>
                <NetflixSlider
                  title="Caterina Sforza Chronicles"
                  posts={groupedPosts.caterina}
                  moreHref="/tags/caterina-sforza"
                />
              </LazySection>
            )}

            {groupedPosts.food.length > 0 && (
              <LazySection>
                <NetflixSlider
                  title="Food & Coffee Adventures"
                  posts={groupedPosts.food}
                  moreHref="/tags/food"
                />
              </LazySection>
            )}

            {groupedPosts.mindfulness.length > 0 && (
              <LazySection>
                <NetflixSlider
                  title="Mindfulness & Reflection"
                  posts={groupedPosts.mindfulness}
                  moreHref="/tags/mindfulness"
                />
              </LazySection>
            )}

            {groupedPosts.books.length > 0 && (
              <LazySection>
                <NetflixSlider
                  title="Books & Reading"
                  posts={groupedPosts.books}
                  moreHref="/tags/books"
                />
              </LazySection>
            )}

            <LazySection>
              <NetflixSlider
                title="Random Discovery"
                posts={groupedPosts.randomized}
                moreHref="/tags"
                moreLabel="Browse by tag"
              />
            </LazySection>

            <LazySection>
              <NetflixSlider
                title="From the Archive"
                posts={groupedPosts.chronological}
                moreHref="/archive"
                moreLabel="All posts"
              />
            </LazySection>
          </div>
        </>
      )}
    </div>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const allPosts = getAllPostsSummary()

  // Single grouping call — no separate posts array needed
  const groupedPosts = groupPostsForHomepage(allPosts)

  return {
    props: {
      groupedPosts
    },
    revalidate: 3600
  }
}
