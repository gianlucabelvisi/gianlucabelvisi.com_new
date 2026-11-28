import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { convex } from '../lib/convex';
import { reactionData } from '../data/ReactionData';
import Reaction from './Reaction';

interface ReactionsProps {
  id: string;
}

/**
 * The row of reactions under a post. One live query feeds all of them, so a reaction from another reader
 * shows up here without a reload. A click updates the number at once and the server catches up.
 */
const LiveReactions = ({ id }: ReactionsProps) => {
  const counts = useQuery(api.reactions.forPost, { post: id });
  const toggle = useMutation(api.reactions.toggle).withOptimisticUpdate((store, { post, name, on }) => {
    const current = store.getQuery(api.reactions.forPost, { post });
    if (!current) return;
    store.setQuery(api.reactions.forPost, { post }, {
      ...current,
      [name]: Math.max(0, (current[name] ?? 0) + (on ? 1 : -1)),
    });
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }} role="group" aria-label="React to this post">
      {reactionData.map(item => (
        <Reaction
          key={item.name}
          id={id}
          item={item}
          count={counts?.[item.name] ?? 0}
          onToggle={on => toggle({ post: id, name: item.name, on }).catch(err => console.error('Could not save reaction:', err))}
        />
      ))}
    </div>
  );
};

const Reactions = (props: ReactionsProps) => (convex ? <LiveReactions {...props} /> : null);

export default Reactions;
