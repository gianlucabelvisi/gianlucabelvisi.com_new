import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'posts')

export interface PostData {
  slug: string
  imagePath: string // Original file path for image resolution
  frontmatter: {
    path: string
    date: string
    title: string
    subTitle: string
    author: string
    hashtags: string
    hidden: boolean
    cardImage?: string
    featureImage?: string
    featureImagePhone?: string
    onHover?: string
    [key: string]: any
  }
  content: string
}

// Rewrite relative image paths to absolute paths
function rewriteImagePaths(content: string, fileName: string): string {
  // Get the directory path for this post
  const postDir = path.dirname(fileName)
  
  // Replace markdown image syntax: ![alt](relative-image.jpg) -> ![alt](/images/posts/path/relative-image.jpg)
  return content.replace(
    /!\[([^\]]*)\]\(([^)]+\.(jpg|jpeg|png|gif|webp|svg))\)/gi,
    (match, alt, imagePath) => {
      // Only rewrite if it's a relative path (no protocol or leading /)
      if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
        const absolutePath = `/images/posts/${postDir}/${imagePath}`
        return `![${alt}](${absolutePath})`
      }
      return match
    }
  )
}

// Get all image files in a directory
function getImagesInDirectory(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return []
  }
  
  const files = fs.readdirSync(dir)
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase()
    return imageExtensions.includes(ext)
  })
}

// Get all directories that contain MDX files
function getAllPostDirectories(dir: string, dirList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return dirList
  }
  
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      const relativePath = path.relative(postsDirectory, filePath)
      
      // Check if this directory contains MDX files
      const mdxFiles = fs.readdirSync(filePath).filter(f => f.endsWith('.mdx'))
      if (mdxFiles.length > 0) {
        dirList.push(relativePath)
      }
      
      // Continue recursively
      getAllPostDirectories(filePath, dirList)
    }
  })
  
  return dirList
}

// Copy images from post directories to public/images/posts
function copyPostImages() {
  const publicImagesDir = path.join(process.cwd(), 'public', 'images', 'posts')
  
  // Ensure the public images directory exists
  if (!fs.existsSync(publicImagesDir)) {
    fs.mkdirSync(publicImagesDir, { recursive: true })
  }
  
  // Get all post directories
  const postDirs = getAllPostDirectories(postsDirectory)
  
  postDirs.forEach((postDir: string) => {
    const fullPostPath = path.join(postsDirectory, postDir)
    const images = getImagesInDirectory(fullPostPath)
    
    if (images.length > 0) {
      // Create the corresponding directory in public
      const publicPostDir = path.join(publicImagesDir, postDir)
      if (!fs.existsSync(publicPostDir)) {
        fs.mkdirSync(publicPostDir, { recursive: true })
      }
      
      // Copy each image
      images.forEach((image: string) => {
        const srcPath = path.join(fullPostPath, image)
        const destPath = path.join(publicPostDir, image)
        
        // Only copy if source is newer than destination or destination doesn't exist
        if (!fs.existsSync(destPath) || 
            fs.statSync(srcPath).mtime > fs.statSync(destPath).mtime) {
          fs.copyFileSync(srcPath, destPath)
        }
      })
    }
  })
}

// Get all posts including hidden ones (for internal use)
function getAllPostsIncludingHidden(): PostData[] {
  const fileNames = getAllMdxFiles(postsDirectory)
  
  // Copy co-located images to public directory
  copyPostImages()
  
  const allPostsData = fileNames.map((fileName) => {
    const fullPath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    // Rewrite relative image paths to absolute paths
    const processedContent = rewriteImagePaths(content, fileName)
    
    // Create slug - prefer frontmatter.path, fallback to file-based slug
    let slug: string
    
    if (data.path && typeof data.path === 'string') {
      // Use frontmatter path, removing leading slash to create clean slug
      slug = data.path.startsWith('/') ? data.path.slice(1) : data.path
    } else {
      // Fallback: create slug from file path, but remove year prefix for clean URLs
      slug = fileName.replace(/\.mdx$/, '')
      
      // If the filename matches the folder name (e.g., test-mdx/test-mdx.mdx), 
      // remove the duplicate part to get cleaner URLs (e.g., 2024/test-mdx instead of 2024/test-mdx/test-mdx)
      const parts = slug.split('/')
      if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
        parts.pop() // Remove the duplicate filename part
        slug = parts.join('/')
      }
      
      // If the filename is 'index', remove it to get cleaner URLs (e.g., 2023/loggo instead of 2023/loggo/index)
      if (parts.length >= 1 && parts[parts.length - 1] === 'index') {
        parts.pop() // Remove the 'index' part
        slug = parts.join('/')
      }
      
      // Remove year prefix (e.g., "2024/chess" becomes "chess")
      const slugParts = slug.split('/')
      if (slugParts.length > 1 && /^\d{4}$/.test(slugParts[0])) {
        slug = slugParts.slice(1).join('/')
      }
    }
    
    // Ensure date is a string for JSON serialization
    const frontmatter = {
      ...data,
      date: typeof data.date === 'string' 
        ? data.date 
        : data.date?.toISOString?.() 
        || (data.date ? String(data.date) : '1900-01-01') // Fallback date for posts without dates
    }
    
    // Create image path from original file structure (keep year folder)
    let imagePath = fileName.replace(/\.mdx$/, '')
    
    // Clean up imagePath similar to old slug logic (for consistency with existing image structure)
    const pathParts = imagePath.split('/')
    if (pathParts.length >= 2 && pathParts[pathParts.length - 1] === pathParts[pathParts.length - 2]) {
      pathParts.pop() // Remove duplicate filename part
      imagePath = pathParts.join('/')
    }
    
    if (pathParts.length >= 1 && pathParts[pathParts.length - 1] === 'index') {
      pathParts.pop() // Remove 'index' part
      imagePath = pathParts.join('/')
    }

    return {
      slug,
      imagePath, // Keep year-based path for images
      frontmatter: frontmatter as PostData['frontmatter'],
      content: processedContent,
    }
  })

  // Return all posts including hidden ones, sorted by date (newest first)
  // Filter out posts with invalid dates
  return allPostsData
    .filter(post => post.frontmatter.date && post.frontmatter.date !== '1900-01-01')
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1))
}

export function getAllPosts(): PostData[] {
  // Get all posts including hidden ones, then filter out hidden posts
  return getAllPostsIncludingHidden()
    .filter(post => !post.frontmatter.hidden)
}

// Export this function for generating static paths (includes hidden posts)
export function getAllPostsForPaths(): PostData[] {
  return getAllPostsIncludingHidden()
}

export function getPostBySlug(slug: string): PostData | null {
  // Use the function that includes hidden posts so we can find hidden posts by slug
  const posts = getAllPostsIncludingHidden()
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