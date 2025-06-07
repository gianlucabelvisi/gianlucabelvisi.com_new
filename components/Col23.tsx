import React from 'react';
import styles from './Col23.module.css';

interface Col23Props {
  children: React.ReactNode;
}

const Col23: React.FC<Col23Props> = ({ children }) => {
  return (
    <div className={styles.col23} suppressHydrationWarning>
      {children}
    </div>
  );
};

export default Col23; 