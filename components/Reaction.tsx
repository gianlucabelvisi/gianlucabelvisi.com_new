import React, { useEffect, useState } from 'react';
import { ref, runTransaction } from 'firebase/database';
import { database } from '../lib/firebase';
import { ReactionData } from '../data/ReactionData';
import styles from './Reaction.module.css';

interface ReactionProps {
  id: string;
  item: ReactionData;
}

const Reaction = ({ id, item }: ReactionProps) => {
  const [reaction, setReaction] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState(false);

  const increaseCount = () => {
    const reactionRef = ref(database, 'reactions/' + id + '/' + item.name);
    
    setReaction(reaction + 1);
    runTransaction(reactionRef, (stored) => {
      if (stored === undefined) {
        stored = 0;
      }
      stored++;
      return stored;
    });
  };

  useEffect(() => {
    async function fetchData() {
      const reactionRef = ref(database, 'reactions/' + id + '/' + item.name);
      
      await runTransaction(reactionRef, (stored) => {
        setReaction(stored || 0);
        return stored;
      });
    }

    fetchData();
  }, [id, item.name]);

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.reactionButton}
        onClick={increaseCount}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onMouseDown={(e) => {
          const emoji = e.currentTarget.querySelector('.emoji') as HTMLElement;
          if (emoji) {
            emoji.style.animation = '.4s ease-in-out 0s 1 pulse';
            setTimeout(() => {
              emoji.style.animation = '';
            }, 400);
          }
        }}
      >
        <div className={styles.emojiContainer}>
          <div className={`emoji ${styles.emoji}`}>
            {item.icon}
          </div>
        </div>
        <div className={styles.count}>
          {reaction ?? 0}
        </div>
      </div>

      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipContent}>
            {item.tooltip}
          </div>
          <div className={styles.tooltipSparkle}>✨</div>
          <div className={styles.tooltipSparkle2}>🌟</div>
          <div className={styles.tooltipSparkle3}>⭐</div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(4); }
        }
      `}</style>
    </div>
  );
};

export default Reaction; 