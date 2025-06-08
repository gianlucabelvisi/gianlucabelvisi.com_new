import React from 'react';
import Image from 'next/image';
import styles from '../BookCover.module.css';

const Batman: React.FC = () => {
  return (
    <div className={styles.bookCover}>
      <Image 
        src="/images/batman.jpg"
        alt="Batman"
        width={200}
        height={150}
        style={{ borderRadius: '8px', objectFit: 'contain' }}
      />
    </div>
  );
};

export default Batman; 