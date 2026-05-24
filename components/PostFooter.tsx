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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // Old browsers — just mount immediately.
      setVisible(true);
      return;
    }

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
  }, []);

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
