import React from 'react';
import Image from 'next/image';
import styles from './BlogImage.module.css';

interface BlogImageProps {
  imageName: string;
  alt?: string;
}

const BlogImage: React.FC<BlogImageProps> = ({ imageName, alt = "" }) => {
  // For now, we'll use a simple path resolution
  // This assumes images are in the same directory as the post
  const imagePath = `/${imageName}`;
  
  return (
    <div className={styles.wrapper}>
      <img 
        src={imagePath}
        alt={alt}
        className={styles.image}
      />
    </div>
  );
};

export default BlogImage; 