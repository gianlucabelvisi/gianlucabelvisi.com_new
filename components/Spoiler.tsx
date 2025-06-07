import React, { useState } from 'react';
import styles from './Spoiler.module.css';

interface SpoilerProps {
  children: React.ReactNode;
}

const Spoiler: React.FC<SpoilerProps> = ({ children }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleReveal = () => {
    setIsRevealed(true);
  };

  return (
    <div className={styles.spoilerContainer}>
      <div 
        className={`${styles.spoilerContent} ${isRevealed ? styles.revealed : ''}`}
        onClick={!isRevealed ? handleReveal : undefined}
      >
        {!isRevealed && (
          <div className={styles.spoilerOverlay}>
            <span className={styles.spoilerText}>
              🔍 Click to reveal spoiler
            </span>
          </div>
        )}
        <div className={`${styles.content} ${isRevealed ? styles.contentRevealed : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Spoiler; 