import React, { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { convex } from '../lib/convex';
import { shouldCountView } from '../lib/voter';

interface ViewCounterProps {
  id: string;
}

/** "Read 1,204 times", live. Counts this visit too, at most once per browser per 12 hours. */
const LiveViewCounter = ({ id }: ViewCounterProps) => {
  const count = useQuery(api.views.get, { post: id });
  const record = useMutation(api.views.record);

  useEffect(() => {
    if (shouldCountView(id)) {
      record({ post: id }).catch(err => console.error('Could not count view:', err));
    }
  }, [id, record]);

  if (count === undefined) return <span>Counting reads…</span>;
  // The query can answer before this visit's own count has landed: never show "0 times" to someone reading it
  const shown = Math.max(1, count);
  return <span>Read {shown.toLocaleString('en-US')} {shown === 1 ? 'time' : 'times'}</span>;
};

const ViewCounter = (props: ViewCounterProps) => (convex ? <LiveViewCounter {...props} /> : null);

export default ViewCounter;
