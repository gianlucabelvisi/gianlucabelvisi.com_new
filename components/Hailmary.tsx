import React from 'react';
import Image from 'next/image';
import styles from './BookCover.module.css';

const Hailmary: React.FC = () => {
  return (
    <div className={styles.bookCover}>
      <Image 
        src="/images/posts/2022/books/hailmary.jpg"
        alt="Project Hail Mary book cover"
        width={150}
        height={220}
        style={{ borderRadius: '8px' }}
      />
    </div>
  );
};

export default Hailmary; 