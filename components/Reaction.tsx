import React, { useState } from 'react';
import { ReactionData } from '../data/ReactionData';
import { hasDone, markDone, unmarkDone } from '../lib/voter';
import styles from './Reaction.module.css';

interface ReactionProps {
  id: string;
  item: ReactionData;
  /** Current total, from the live query in Reactions.tsx */
  count: number;
  /** Called with true when the reader adds this reaction, false when they take it back */
  onToggle: (on: boolean) => void;
}

/** One reaction button. It remembers in this browser whether the reader already pressed it (lib/voter.ts). */
const Reaction = ({ id, item, count, onToggle }: ReactionProps) => {
  const storageKey = `reaction:${id}:${item.name}`;
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulse, setPulse] = useState(false);
  // Client-only (ssr: false via PostFooter), so reading storage up front is safe
  const [reacted, setReacted] = useState(() => hasDone(storageKey));

  const toggle = () => {
    const next = !reacted;
    setReacted(next);
    if (next) markDone(storageKey); else unmarkDone(storageKey);
    onToggle(next);

    setPulse(true);
    window.setTimeout(() => setPulse(false), 400);
  };

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
        aria-label={`${item.tooltip} (${count})`}
      >
        <span className={styles.emojiContainer}>
          <span className={`${styles.emoji} ${pulse ? styles.pulse : ''}`} aria-hidden="true">
            {item.icon}
          </span>
        </span>
        <span className={styles.count}>{count}</span>
      </button>

      {showTooltip && (
        <div className={styles.tooltip} role="tooltip">
          {item.tooltip}
        </div>
      )}
    </div>
  );
};

export default Reaction;
