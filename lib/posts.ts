import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'posts')

export interface PostData {
  slug: string
  frontmatter: {
    path: string
    date: string
    title: string
    subTitle: string
    author: string
    hashtags: string
    hidden: boolean
    [key: string]: any
  }
  content: string
}

export function getAllPosts(): PostData[] {
  const fileNames = getAllMdxFiles(postsDirectory)
  
  const allPostsData = fileNames.map((fileName) => {
    const fullPath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    // Create slug from file path (remove .mdx extension)
    const slug = fileName.replace(/\.mdx$/, '')
    
    // Ensure date is a string for JSON serialization
    const frontmatter = {
      ...data,
      date: typeof data.date === 'string' ? data.date : data.date?.toISOString?.() || data.date
    }
    
    return {
      slug,
      frontmatter: frontmatter as PostData['frontmatter'],
      content,
    }
  })

  // Filter out hidden posts and sort by date (newest first)
  return allPostsData
    .filter(post => !post.frontmatter.hidden)
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1))
}

export function getPostBySlug(slug: string): PostData | null {
  const posts = getAllPosts()
  return posts.find(post => post.slug === slug) || null
}

function getAllMdxFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return fileList
  }
  
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      getAllMdxFiles(filePath, fileList)
    } else if (file.endsWith('.mdx')) {
      fileList.push(path.relative(postsDirectory, filePath))
    }
  })
  
  return fileList
} 