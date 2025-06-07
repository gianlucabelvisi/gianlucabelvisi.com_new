import React from 'react';
import styles from './ThreeColumns.module.css';

interface ThreeColumnsProps {
  children: React.ReactNode;
}

const ThreeColumns: React.FC<ThreeColumnsProps> = ({ children }) => {
  return (
    <div className={styles.threeColumns} suppressHydrationWarning>
      {children}
    </div>
  );
};

export default ThreeColumns; 