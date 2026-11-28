import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './PostFooter.module.css';

// The live counters only mount when the footer scrolls into view, so a reader who never
// gets this far never opens their subscriptions.
const Reactions = dynamic(() => import('./Reactions'), { ssr: false });
const ViewCounter = dynamic(() => import('./ViewCounter'), { ssr: false });

interface PostFooterProps {
  path: string;
  author: string;
}

const PostFooter = ({ path, author }: PostFooterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Browsers without IntersectionObserver (none in practice since 2019) mount immediately.
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={containerRef} className={styles.container}>
      <p className={styles.prompt}>How was it?</p>
      {/* Mounted (and subscribed) only once this is in view */}
      <div className={styles.reactions}>
        {visible && <Reactions id={path} />}
      </div>
      <p className={styles.meta}>
        <span>by <strong>{author}</strong></span>
        {visible && <ViewCounter id={path} />}
      </p>
    </div>
  );
};

export default PostFooter;
