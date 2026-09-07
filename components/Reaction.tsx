import React, { useEffect, useState } from 'react';
import { ref, runTransaction, get } from 'firebase/database';
import { database } from '../lib/firebase';
import { ReactionData } from '../data/ReactionData';
import { hasDone, markDone, unmarkDone } from '../lib/voter';
import styles from './Reaction.module.css';

interface ReactionProps {
  id: string;
  item: ReactionData;
}

const Reaction = ({ id, item }: ReactionProps) => {
  const storageKey = `reaction:${id}:${item.name}`;
  const [reaction, setReaction] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulse, setPulse] = useState(false);
  // Reaction is client-only (ssr: false via PostFooter), so reading storage up front is safe
  const [reacted, setReacted] = useState(() => hasDone(storageKey));

  const toggle = () => {
    const reactionRef = ref(database, 'reactions/' + id + '/' + item.name);
    const delta = reacted ? -1 : 1;

    setReaction(prev => Math.max(0, prev + delta));
    setReacted(!reacted);
    if (reacted) unmarkDone(storageKey); else markDone(storageKey);

    setPulse(true);
    window.setTimeout(() => setPulse(false), 400);

    runTransaction(reactionRef, (stored) => Math.max(0, (stored || 0) + delta)).catch(err => {
      console.error('Could not save reaction:', err);
    });
  };

  useEffect(() => {
    const reactionRef = ref(database, 'reactions/' + id + '/' + item.name);
    get(reactionRef)
      .then(snapshot => setReaction(snapshot.val() || 0))
      .catch(err => console.error('Could not load reaction:', err));
  }, [id, item.name]);

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.reactionButton} ${reacted ? styles.reacted : ''}`}
        onClick={toggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-pressed={reacted}
        aria-label={`${item.tooltip} (${reaction})`}
      >
        <span className={styles.emojiContainer}>
          <span className={`${styles.emoji} ${pulse ? styles.pulse : ''}`} aria-hidden="true">
            {item.icon}
          </span>
        </span>
        <span className={styles.count}>
          {reaction ?? 0}
        </span>
      </button>

      {showTooltip && (
        <div className={styles.tooltip} role="tooltip">
          <div className={styles.tooltipContent}>
            {item.tooltip}
          </div>
          <div className={styles.tooltipSparkle}>✨</div>
          <div className={styles.tooltipSparkle2}>🌟</div>
          <div className={styles.tooltipSparkle3}>⭐</div>
        </div>
      )}
    </div>
  );
};

export default Reaction;
