import React, { useState, useEffect } from 'react';
import styles from './Books2022.module.css';
import books2022Data from '../data/Books2022.json';

interface Books2022Props {
  background?: string;
}

const Books2022: React.FC<Books2022Props> = ({ background = "desk4" }) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Extract book covers from JSON data
  const bookCovers = books2022Data.map((book, index) => {
    // Extract filename from the path "../assets/images/books2022/filename.jpg"
    const filename = book.img.split('/').pop() || '';
    return {
      src: filename,
      alt: `Book Cover ${index + 1}`
    };
  });

  // Book covers are in the public/images/books2022/ directory
  const imagePath = '/images/books2022';

  // Random positioning function
  const random = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  useEffect(() => {
    console.log('Books2022 PhotoStack component mounted');
    console.log('Image path:', imagePath);
    console.log('Book covers count:', bookCovers.length);
    console.log('First few covers:', bookCovers.slice(0, 5));
  }, []);

  const handleImageLoad = (src: string) => {
    console.log(`Image loaded successfully: ${src}`);
    setLoadedImages(prev => new Set([...prev, src]));
  };

  const handleImageError = (src: string) => {
    console.error(`Failed to load image: ${src}`);
  };

  return (
    <div className={styles.wrapper}>
      {/* Background image */}
      <div className={styles.background} />
      
      {/* Sequential animated photos */}
      {bookCovers.map((book, index) => {
        const fullImagePath = `${imagePath}/${book.src}`;
        
        // Generate random placement values like the original
        const placement = {
          zIndex: 1000 - index,
          delay: 4 * index + 1, // 4 second delays: 1s, 5s, 9s, 13s, etc.
          rotation: random(-45, 45),
          xDelta: random(-10, 10),
          yDelta: random(-10, 10)
        };
        
        return (
          <div
            key={book.src}
            className={styles.photoWrapper}
            style={{
              '--z-index': placement.zIndex,
              '--delay': `${placement.delay}s`,
              '--rotation': `${placement.rotation}deg`,
              '--x-delta': `${placement.xDelta}px`,
              '--y-delta': `${placement.yDelta}px`
            } as React.CSSProperties}
          >
            <img
              src={fullImagePath}
              alt={book.alt}
              className={styles.photo}
              loading="lazy"
              onLoad={() => handleImageLoad(fullImagePath)}
              onError={() => handleImageError(fullImagePath)}
            />
          </div>
        );
      })}
      
      {/* Debug info */}
      <div className={styles.debugInfo}>
        Loaded: {loadedImages.size}/{bookCovers.length}
      </div>
    </div>
  );
};

export default Books2022; 