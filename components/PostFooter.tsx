import React from 'react';
import Reactions from './Reactions';
import ViewCounter from './ViewCounter';

interface PostFooterProps {
  path: string;
  author: string;
}

const PostFooter = ({ path, author }: PostFooterProps) => {
  return (
    <div>
      {/* First Line: Reactions and View Counter */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        '@media (max-width: 550px)': {
          display: 'block',
          flexDirection: 'column',
          justifyItems: 'start',
          gap: '0.7rem'
        }
      }}>
        <Reactions id={path} />
        <ViewCounter id={path} />
      </div>

      {/* Second Line: Author */}
      <div style={{
        marginTop: '2rem',
        display: 'flex',
        '@media (max-width: 550px)': {
          flexDirection: 'column',
          gap: '2rem'
        }
      }}>
        <div style={{
          flexBasis: '40%',
          flexGrow: 1
        }}>
          by <strong>{author}</strong>
        </div>
      </div>
    </div>
  );
};

export default PostFooter; 