import React, { useEffect, useState } from 'react';
import { ref, runTransaction, get } from 'firebase/database';
import { database } from '../lib/firebase';
import { shouldCountView } from '../lib/voter';

interface ViewCounterProps {
  id: string;
}

interface ViewRecord {
  count: number;
}

const ViewCounter = ({ id }: ViewCounterProps) => {
  const [viewCount, setViewCount] = useState<number | null>(null);

  useEffect(() => {
    const viewRef = ref(database, 'views/' + id);

    // Count at most one view per browser per 12h so refreshes don't inflate the number
    if (shouldCountView(id)) {
      runTransaction(viewRef, (view: ViewRecord | null) => {
        if (view) {
          view.count++;
          return view;
        }
        return { count: 1 };
      })
        .then(result => setViewCount((result.snapshot.val() as ViewRecord | null)?.count ?? 1))
        .catch(err => console.error('Could not count view:', err));
    } else {
      get(viewRef)
        .then(snapshot => setViewCount((snapshot.val() as ViewRecord | null)?.count ?? 1))
        .catch(err => console.error('Could not load views:', err));
    }
  }, [id]);

  return (
    <small style={{
      display: 'inline-block',
      textAlign: 'center'
    }}>
      {viewCount === null ? 'Counting views…' : `Viewed ${viewCount.toLocaleString('en-US')} ${viewCount === 1 ? 'time' : 'times'}`}
    </small>
  );
};

export default ViewCounter;
