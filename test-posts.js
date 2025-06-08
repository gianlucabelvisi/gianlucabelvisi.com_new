const { getAllPosts } = require('./lib/posts.ts');

try {
  const posts = getAllPosts();
  console.log('Total posts found:', posts.length);
  
  const filmsPost = posts.find(p => 
    p.frontmatter.title?.toLowerCase().includes('films') ||
    p.frontmatter.path?.includes('films') ||
    p.slug.includes('films')
  );
  
  if (filmsPost) {
    console.log('Films post found:');
    console.log('- Title:', filmsPost.frontmatter.title);
    console.log('- Path:', filmsPost.frontmatter.path);
    console.log('- Slug:', filmsPost.slug);
    console.log('- Hidden:', filmsPost.frontmatter.hidden);
  } else {
    console.log('Films post NOT found');
    console.log('Available posts:');
    posts.slice(0, 5).forEach(p => {
      console.log(`- ${p.frontmatter.title} (${p.slug}) - path: ${p.frontmatter.path}`);
    });
  }
} catch (error) {
  console.error('Error:', error.message);
} 