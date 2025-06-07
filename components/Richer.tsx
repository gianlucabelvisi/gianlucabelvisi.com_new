import React from 'react';
import Image from 'next/image';
import styles from './BookCover.module.css';

const Richer: React.FC = () => {
  return (
    <div className={styles.bookCover}>
      <Image 
        src="/images/posts/2022/books/richer.png"
        alt="Richer Wiser Happier book cover"
        width={150}
        height={220}
        style={{ borderRadius: '8px' }}
      />
    </div>
  );
};

export default Richer; 