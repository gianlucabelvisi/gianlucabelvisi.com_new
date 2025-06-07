import React from 'react';
import Image from 'next/image';
import styles from './BookCover.module.css';

const Pride: React.FC = () => {
  return (
    <div className={styles.bookCover}>
      <Image 
        src="/images/posts/2022/books/pride.jpg"
        alt="Pride and Prejudice book cover"
        width={150}
        height={220}
        style={{ borderRadius: '8px' }}
      />
    </div>
  );
};

export default Pride; 