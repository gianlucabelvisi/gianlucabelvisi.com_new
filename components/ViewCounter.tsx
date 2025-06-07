import React, { useEffect, useState } from 'react';
import { ref, runTransaction } from 'firebase/database';
import { database } from '../lib/firebase';

interface ViewCounterProps {
  id: string;
}

const ViewCounter = ({ id }: ViewCounterProps) => {
  const [viewCount, setViewCount] = useState<number | string>('');

  useEffect(() => {
    const viewRef = ref(database, 'views/' + id);

    runTransaction(viewRef, (view) => {
      if (view) {
        view.count++;
      } else {
        view = {
          count: 1
        };
      }
      setViewCount(view.count);
      return view;
    });
  }, [id]);

  return (
    <small style={{
      display: 'inline-block',
      textAlign: 'center'
    }}>
      Viewed {viewCount ? viewCount : '1'} times
    </small>
  );
};

export default ViewCounter; 