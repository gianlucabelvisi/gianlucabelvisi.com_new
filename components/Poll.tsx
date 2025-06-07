import React, { useEffect, useState } from 'react';
import { PieChart } from 'react-minimal-pie-chart';
import { GoDotFill } from 'react-icons/go';
import { database } from '../lib/firebase';
import { ref, runTransaction, get } from 'firebase/database';

interface PollProps {
  id: string;
  question: string;
  answers: string[];
  labels?: string[];
}

const Poll: React.FC<PollProps> = ({ id, question, answers, labels }) => {
  const [results, setResults] = useState<{ [key: string]: number }>({});
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);

  const colors = ['#ff9664', '#667afa', '#edc67e', '#f57684', '#ffb5f5'];
  const defaultLabelStyle = {
    fontSize: '.45rem',
    fontFamily: 'sans-serif',
    color: 'white'
  };
  const shiftSize = 3;

  const handleVote = async (answerIndex: number) => {
    try {
      const pollRef = ref(database, `polls/${id}/${answerIndex}`);
      await runTransaction(pollRef, (current) => {
        return (current || 0) + 1;
      });
      setAnswered(true);
      // Refresh results after voting
      fetchResults();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const pollRef = ref(database, `polls/${id}`);
      const snapshot = await get(pollRef);
      const data = snapshot.val() || {};
      setResults(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching poll results:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [id]);

  const pieData = answers.map((answer, index) => ({
    title: labels?.[index] || answer,
    key: index,
    value: results[index] || 0,
    color: colors[index] || '#ccc'
  }));

  const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      marginTop: '2rem',
      marginBottom: '2rem',
      borderLeft: '3px solid #ff9664',
      paddingLeft: '2rem',
      paddingBottom: '2rem',
      minHeight: '200px'
    }}>
      <h3 style={{
        marginBottom: '1rem',
        color: '#333'
      }}>
        Poll: {question}
      </h3>
      
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        transition: 'all 300ms ease-in-out 0.4s',
        transform: answered ? 'translateX(100%)' : '',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '2rem',
        paddingBottom: '4rem',
        marginBottom: '2rem'
      }}>
        {answers.map((answer, index) => (
          <div 
            key={index}
            style={{
              height: '1rem',
              marginBottom: '1.5rem'
            }}
            onClick={() => handleVote(index)}
          >
                         <h4 style={{
               position: 'absolute',
               marginBottom: '0.6rem',
               transition: 'font-size 0.2s ease',
               cursor: 'pointer',
               paddingRight: '5rem',
               color: '#333',
               display: 'flex',
               alignItems: 'center',
               fontSize: '1rem'
             }}
            onMouseEnter={(e) => e.currentTarget.style.fontSize = '1.1rem'}
            onMouseLeave={(e) => e.currentTarget.style.fontSize = '1rem'}
            >
              <GoDotFill style={{
                marginRight: '1rem',
                color: '#ff9664'
              }} />
              {answer}
            </h4>
          </div>
        ))}
      </div>

      <div style={{
        width: '40%',
        height: '40%',
        transition: 'all 1000ms ease-in-out 1s',
        transform: answered ? 'translateX(30%)' : 'translateX(-200%)'
      }}>
        {!loading && totalVotes > 0 && (
          <PieChart
            data={pieData}
            animate={true}
            label={({ dataEntry }) => `${dataEntry.title}: ${dataEntry.value}`}
            radius={42 - shiftSize}
            segmentsShift={(index) => (index === 0 ? shiftSize : 0.5)}
            labelStyle={defaultLabelStyle}
          />
        )}
        {!loading && totalVotes === 0 && (
          <p style={{
            color: '#999',
            fontStyle: 'italic'
          }}>
            No votes yet!
          </p>
        )}
        {!loading && (
          <p style={{
            color: '#999',
            fontSize: '0.9rem',
            marginTop: '1rem'
          }}>
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};



export default Poll; 