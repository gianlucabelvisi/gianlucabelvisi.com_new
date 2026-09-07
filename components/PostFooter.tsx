import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './PostFooter.module.css';

// Lazy-load Firebase-using components only when the footer scrolls into view.
// Saves ~80KB JS + a network round-trip on initial post-page load for
// visitors who never reach the footer.
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
      {/* First Line: Reactions and View Counter — Firebase only loads when this is in view */}
      <div className={styles.reactionsRow}>
        {visible && <Reactions id={path} />}
        {visible && <ViewCounter id={path} />}
      </div>

      {/* Second Line: Author */}
      <div className={styles.authorRow}>
        <div className={styles.authorInfo}>
          by <strong>{author}</strong>
        </div>
      </div>
    </div>
  );
};

export default PostFooter;
