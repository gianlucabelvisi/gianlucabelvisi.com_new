import React from 'react';
import Link from 'next/link';
import styles from './LinkButton.module.css';

interface LinkButtonProps {
  to: string;
  children: React.ReactNode;
  onHover?: string;
}

const LinkButton: React.FC<LinkButtonProps> = ({ to, children, onHover = '' }) => {
  const style = { '--hover-width': `${onHover.length}ch` } as React.CSSProperties;

  // No destination: render a real <button> that does nothing when pressed,
  // so we don't hand an empty href to next/link (which throws).
  if (!to) {
    return (
      <button
        type="button"
        className={styles.button}
        style={style}
        onClick={(e) => e.preventDefault()}
      >
        {children}
        <span className={styles.onHover}>{onHover}</span>
      </button>
    );
  }

  return (
    <Link href={to} className={styles.button} style={style}>
      {children}
      <span className={styles.onHover}>{onHover}</span>
    </Link>
  );
};

export default LinkButton;
