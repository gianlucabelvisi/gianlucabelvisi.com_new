import React from 'react';
import styles from './Indented.module.css';

interface IndentedProps {
  children: React.ReactNode;
}

const Indented: React.FC<IndentedProps> = ({ children }) => {
  return (
    <div className={styles.indented}>
      {children}
    </div>
  );
};

export default Indented; 