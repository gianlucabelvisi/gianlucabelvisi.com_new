import React, { useState } from 'react';
import styles from './Spoiler.module.css';

interface SpoilerProps {
  children: React.ReactNode;
  title?: string;
}

const Spoiler: React.FC<SpoilerProps> = ({ children, title = "Spoiler Alert" }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleReveal = () => {
    if (isRevealed) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setIsRevealed(true);
      setIsAnimating(false);
    }, 400);
  };

  return (
    <div className={styles.spoilerContainer}>
      <div 
        className={`${styles.spoilerContent} ${isRevealed ? styles.revealed : ''} ${isAnimating ? styles.animating : ''}`}
        onClick={!isRevealed ? handleReveal : undefined}
      >
        {/* Decorative background elements */}
        <div className={styles.backgroundPattern}></div>
        <div className={styles.cornerDecoration}></div>
        
        {/* Title - only show before reveal */}
        {!isRevealed && (
          <div className={styles.titleContainer}>
            <span className={styles.title}>
              🔒 {title}
            </span>
            <span className={styles.clickHint}>
              Click to reveal
            </span>
          </div>
        )}

        {!isRevealed && (
          <div className={styles.spoilerOverlay}>
            <div className={styles.spoilerButton}>
              <span className={styles.lockIcon}>🔍</span>
              <div className={styles.buttonTextContainer}>
                <span className={styles.spoilerMainText}>SPOILER ALERT</span>
                <span className={styles.spoilerSubText}>Click to reveal</span>
              </div>
              <div className={styles.buttonGlow}></div>
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

export default Spoiler; 