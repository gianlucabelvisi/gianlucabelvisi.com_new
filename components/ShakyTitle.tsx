import React from 'react';
import styles from './ShakyTitle.module.css';

interface ShakyTitleProps {
  emoji: string;
  title: string;
  children?: React.ReactNode;
}

export const ShakyTitle: React.FC<ShakyTitleProps> = ({ emoji, title, children }) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.shakyIcon}>{emoji}</div>
      <div className={styles.qualifier}>{title}</div>
      {children && <h2 className={styles.title}>{children}</h2>}
    </div>
  );
}; 