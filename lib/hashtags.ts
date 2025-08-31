import { PostData } from './posts'

/**
 * Check if a post contains any of the specified hashtags
 * Matches the functionality from the old Gatsby blog
 */
export function containsHashtags(post: PostData, ...tags: string[]): boolean {
  if (!post.frontmatter.hashtags) return false
  
  const postHashtags = post.frontmatter.hashtags
    .toLowerCase()
    .split(',')
    .map(tag => tag.trim())
  
  return tags.some(tag => 
    postHashtags.some(postTag => 
      postTag.includes(tag.toLowerCase())
    )
  )
}

/**
 * Filter posts by hashtags
 */
export function filterPostsByHashtags(posts: PostData[], ...tags: string[]): PostData[] {
  return posts.filter(post => containsHashtags(post, ...tags))
}

/**
 * Get all unique hashtags from posts
 */
export function getAllHashtags(posts: PostData[]): string[] {
  const allTags = new Set<string>()
  
  posts.forEach(post => {
    if (post.frontmatter.hashtags) {
      post.frontmatter.hashtags
        .split(',')
        .map(tag => tag.trim())
        .forEach(tag => allTags.add(tag))
    }
  })
  
  return Array.from(allTags).sort()
}

/**
 * Group posts by content categories for Netflix-style sliders
 */
export function groupPostsForHomepage(posts: PostData[]) {
  const latest = posts.slice(1, 14) // Skip featured post, get next 13
  const featured = posts[0] // Latest post as hero
  
  // Caterina Sforza series (your pride and joy!)
  const caterina = filterPostsByHashtags(posts, 'caterina sforza').reverse()
  
  // Food & lifestyle content
  const food = filterPostsByHashtags(posts, 'food', 'coffee', 'diet', '9barista', 'pizza', 'meat').reverse()
  
  // Mindfulness & self-improvement
  const mindfulness = filterPostsByHashtags(posts, 'mindfulness')
    .sort(() => Math.random() - 0.5)
    .slice(0, 15)
  
  // Books content
  const books = filterPostsByHashtags(posts, 'books', 'bucket list')
    .sort(() => Math.random() - 0.5)
    .slice(0, 15)
  
  // Random chaos mode
  const randomized = [...posts]
    .sort(() => Math.random() - 0.5)
    .slice(0, 15)
  
  // Chronological for stalkers
  const chronological = [...posts].reverse()
  
  return {
    featured,
    latest,
    caterina,
    food,
    mindfulness,
    books,
    randomized,
    chronological
  }
}

