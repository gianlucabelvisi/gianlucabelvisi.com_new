import React, { useEffect, useState } from 'react';
import { ref, runTransaction } from 'firebase/database';
import { database } from '../lib/firebase';
import { ReactionData } from '../data/ReactionData';

interface ReactionProps {
  id: string;
  item: ReactionData;
}

const Reaction = ({ id, item }: ReactionProps) => {
  const [reaction, setReaction] = useState<number>(0);

  const increaseCount = () => {
    const reactionRef = ref(database, 'reactions/' + id + '/' + item.name);
    
    setReaction(reaction + 1);
    runTransaction(reactionRef, (stored) => {
      if (stored === undefined) {
        stored = 0;
      }
      stored++;
      return stored;
    });
  };

  useEffect(() => {
    async function fetchData() {
      const reactionRef = ref(database, 'reactions/' + id + '/' + item.name);
      
      await runTransaction(reactionRef, (stored) => {
        setReaction(stored || 0);
        return stored;
      });
    }

    fetchData();
  }, [id, item.name]);

  return (
    <div
      title={item.tooltip}
      onClick={increaseCount}
      style={{
        cursor: 'pointer',
        position: 'relative',
        fontSize: '1.2rem',
        marginRight: '.4rem',
        display: 'flex',
        background: 'rgba(0, 0, 0, 0.02)',
        padding: '.4rem',
        borderRadius: '12px',
        transition: 'all .2s ease-in-out',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.paddingLeft = '1rem';
        e.currentTarget.style.paddingRight = '1rem';
        const emoji = e.currentTarget.querySelector('.emoji') as HTMLElement;
        if (emoji) emoji.style.transform = 'scale(1.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.paddingLeft = '.4rem';
        e.currentTarget.style.paddingRight = '.4rem';
        const emoji = e.currentTarget.querySelector('.emoji') as HTMLElement;
        if (emoji) emoji.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        const emoji = e.currentTarget.querySelector('.emoji') as HTMLElement;
        if (emoji) {
          emoji.style.animation = '.4s ease-in-out 0s 1 pulse';
          setTimeout(() => {
            emoji.style.animation = '';
          }, 400);
        }
      }}
    >
      <div style={{ position: 'relative', marginRight: '.4rem', width: '1.4rem' }}>
        <div 
          className="emoji"
          style={{
            opacity: 1,
            position: 'absolute',
            top: 0,
            transition: 'all .2s ease-in-out',
            zIndex: 10,
          }}
        >
          {item.icon}
        </div>
      </div>
      <div style={{ color: '#757070' }}>
        {reaction ?? 0}
      </div>
      <style jsx>{`
        @keyframes pulse {
          from { transform: scale(1.4); }
          to { transform: scale(4); }
        }
      `}</style>
    </div>
  );
};

export default Reaction; 