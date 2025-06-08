import React from 'react';
import styles from './Formula.module.css';

interface FormulaProps {
  children: React.ReactNode;
}

const Formula: React.FC<FormulaProps> = ({ children }) => {
  return (
    <div className={styles.formula}>
      {children}
    </div>
  );
};

export default Formula; 