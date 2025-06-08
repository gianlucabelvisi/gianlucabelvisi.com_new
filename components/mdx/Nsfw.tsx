import React, { useState } from 'react';
import styles from './Nsfw.module.css';

interface NsfwProps {
  children: React.ReactNode;
}

const Nsfw: React.FC<NsfwProps> = ({ children }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleReveal = () => {
    setIsAnimating(true);
    // Delay the reveal to let the curtain animation play
    setTimeout(() => {
      setIsRevealed(true);
      setIsAnimating(false);
    }, 800); // Match the curtain animation duration
  };

  return (
    <div className={styles.nsfwContainer}>
      <div 
        className={`${styles.nsfwContent} ${isRevealed ? styles.revealed : ''}`}
        onClick={!isRevealed ? handleReveal : undefined}
      >
        {!isRevealed && (
          <>
            <div className={`${styles.nsfwOverlay} ${isAnimating ? styles.overlayAnimating : ''}`}>
              <div className={styles.nsfwWarning}>
                <h3 className={styles.nsfwTitle}>NSFW!</h3>
                <p className={styles.nsfwSubtitle}>Click at your own peril</p>
              </div>
            </div>
            
            {/* Curtain effect */}
            <div className={`${styles.curtainContainer} ${isAnimating ? styles.curtainAnimating : ''}`}>
              <div className={`${styles.curtainLeft} ${isAnimating ? styles.curtainLeftOpen : ''}`}></div>
              <div className={`${styles.curtainRight} ${isAnimating ? styles.curtainRightOpen : ''}`}></div>
            </div>
          </>
        )}
        <div className={`${styles.content} ${isRevealed ? styles.contentRevealed : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Nsfw; 