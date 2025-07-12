import React from 'react';
import Link from 'next/link';
import styles from './LinkButton.module.css';

interface LinkButtonProps {
  to: string;
  children: React.ReactNode;
  onHover?: string;
}

const LinkButton: React.FC<LinkButtonProps> = ({ to, children, onHover = '' }) => {
  return (
    <Link href={to} className={styles.button} style={{ '--hover-width': `${onHover.length}ch` } as React.CSSProperties}>
      {children}
      <span className={styles.onHover}>{onHover}</span>
    </Link>
  );
};

export default LinkButton; 