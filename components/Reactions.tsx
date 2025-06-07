import React from 'react';
import { reactionData } from '../data/ReactionData';
import Reaction from './Reaction';

interface ReactionsProps {
  id: string;
}

const Reactions = ({ id }: ReactionsProps) => {
  return (
    <div style={{ 
      display: 'flex', 
      marginBottom: '.5rem' 
    }}>
      {reactionData.map((item, index) => (
        <Reaction id={id} item={item} key={index} />
      ))}
    </div>
  );
};

export default Reactions; 