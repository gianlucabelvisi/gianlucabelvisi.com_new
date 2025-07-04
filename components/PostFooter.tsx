import React from 'react';
import Reactions from './Reactions';
import ViewCounter from './ViewCounter';
import styles from './PostFooter.module.css';

interface PostFooterProps {
  path: string;
  author: string;
}

const PostFooter = ({ path, author }: PostFooterProps) => {
  return (
    <div className={styles.container}>
      {/* First Line: Reactions and View Counter */}
      <div className={styles.reactionsRow}>
        <Reactions id={path} />
        <ViewCounter id={path} />
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