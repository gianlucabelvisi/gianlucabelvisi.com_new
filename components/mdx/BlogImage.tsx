import React from 'react';
import Image from 'next/image';
import styles from './BlogImage.module.css';

interface BlogImageProps {
  imageName: string;
  alt?: string;
}

const BlogImage: React.FC<BlogImageProps> = ({ imageName, alt = "" }) => {
  const imagePath = `/${imageName}`;

  return (
    <div className={styles.wrapper}>
      <Image
        src={imagePath}
        alt={alt}
        width={0}
        height={0}
        sizes="100vw"
        style={{ width: '100%', height: 'auto' }}
        className={styles.image}
      />
    </div>
  );
};

export default BlogImage; 