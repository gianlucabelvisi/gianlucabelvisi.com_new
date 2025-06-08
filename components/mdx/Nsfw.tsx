import React, { useState } from 'react';
import styles from './Nsfw.module.css';

interface NsfwProps {
  children: React.ReactNode;
}

const Nsfw: React.FC<NsfwProps> = ({ children }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleReveal = () => {
    setIsRevealed(true);
  };

  return (
    <div className={styles.nsfwContainer}>
      <div 
        className={`${styles.nsfwContent} ${isRevealed ? styles.revealed : ''}`}
        onClick={!isRevealed ? handleReveal : undefined}
      >
        {!isRevealed && (
          <div className={styles.nsfwOverlay}>
            <div className={styles.nsfwWarning}>
              <h3 className={styles.nsfwTitle}>NSFW!</h3>
              <p className={styles.nsfwSubtitle}>Click at your own peril</p>
            </div>
          </div>
        )}
        <div className={`${styles.content} ${isRevealed ? styles.contentRevealed : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Nsfw; 