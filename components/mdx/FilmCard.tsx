import React from 'react';
import styles from './FilmCard.module.css';

interface FilmCardProps {
  country?: string;
  director?: string;
  seenOn?: string;
  starring?: string;
  emoji?: string;
}

const FilmCard: React.FC<FilmCardProps> = ({ 
  country, 
  director, 
  seenOn, 
  starring, 
  emoji 
}) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <div className={styles.field}>
          <div className={styles.header}>Country</div>
          <div className={styles.footer}>{country}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.header}>Director</div>
          <div className={styles.footer}>{director}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.header}>Starring</div>
          <div className={styles.footer}>{starring}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.header}>Seen on</div>
          <div className={styles.footer}>{seenOn}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.header}>Emoji</div>
          <div className={styles.footer}>{emoji}</div>
        </div>
      </div>
    </div>
  );
};

export default FilmCard; 