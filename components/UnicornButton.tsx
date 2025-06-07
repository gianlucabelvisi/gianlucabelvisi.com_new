import React, { useEffect, useState } from 'react';
import { getDatabase, ref, runTransaction } from 'firebase/database';
import app from '../lib/firebase';
import styles from './UnicornButton.module.css';

interface UnicornButtonProps {
  page: string;
  id: string;
  tooltip: string;
}

const UnicornButton: React.FC<UnicornButtonProps> = ({ page, id, tooltip }) => {
  const [count, setCount] = useState(0);
  const [clicked, setClicked] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    const database = getDatabase(app);
    const reactionRef = ref(database, `unicorn/${page}/${id}`);

    setCount(prevCount => prevCount + 1);
    setClicked(true);
    setTimeout(() => setClicked(false), 500); // reset after animation duration

    runTransaction(reactionRef, (stored) => {
      if (stored === undefined) {
        stored = 0;
      }
      return stored + 1;
    });
  };

  useEffect(() => {
    async function fetchData() {
      const database = getDatabase(app);
      const reactionRef = ref(database, `unicorn/${page}/${id}`);

      await runTransaction(reactionRef, (stored) => {
        setCount(stored || 0);
        return stored;
      });
    }
    fetchData();
  }, [id, page]);

  return (
    <span className={styles.wrapper}>
      <button
        className={`${styles.button} ${clicked ? styles.clicked : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={tooltip}
      >
        🦄 <span className={styles.count}>{count}</span>
      </button>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          {tooltip}
        </div>
      )}
    </span>
  );
};

export default UnicornButton; 