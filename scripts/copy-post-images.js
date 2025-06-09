const fs = require('fs');
const path = require('path');

function copyImageFiles(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    
    if (stat.isFile() && /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file)) {
      // Copy image files
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  });
}

function copyAllPostImages() {
  const postsDir = path.join(__dirname, '..', 'posts');
  const publicImagesDir = path.join(__dirname, '..', 'public', 'images', 'posts');
  
  // Clean existing images
  if (fs.existsSync(publicImagesDir)) {
    fs.rmSync(publicImagesDir, { recursive: true, force: true });
  }
  
  function processDirectory(currentDir, relativePath = '') {
    const items = fs.readdirSync(currentDir);
    let hasMdxFile = false;
    
    // Check if this directory contains an MDX file
    items.forEach(item => {
      if (item.endsWith('.mdx')) {
        hasMdxFile = true;
      }
    });
    
    if (hasMdxFile) {
      // This is a post directory, copy its images
      const postSlug = relativePath || path.basename(currentDir);
      const destDir = path.join(publicImagesDir, postSlug);
      
      console.log(`Processing post: ${postSlug}`);
      copyImageFiles(currentDir, destDir);
    }
    
    // Continue processing subdirectories
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDirectory(fullPath, path.join(relativePath, item));
      }
    });
  }
  
  if (fs.existsSync(postsDir)) {
    processDirectory(postsDir);
    console.log('✅ Post images copied successfully!');
  } else {
    console.log('❌ Posts directory not found');
  }
}

copyAllPostImages(); 