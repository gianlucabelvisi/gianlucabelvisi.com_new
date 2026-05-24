import React, { useEffect, useState } from 'react';
import { PieChart } from 'react-minimal-pie-chart';
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
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const colors = ['#ff9664', '#667afa', '#edc67e', '#f57684', '#ffb5f5'];

  const handleVote = async (answerIndex: number) => {
    if (answered) return;
    
    setSelectedOption(answerIndex);
    
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

  const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);
  
  const getPercentage = (optionIndex: number) => {
    if (totalVotes === 0) return 0;
    return Math.round(((results[optionIndex] || 0) / totalVotes) * 100);
  };

  const pieData = answers.map((answer, index) => ({
    title: labels?.[index] || answer, // Use labels for pie chart if provided
    key: index,
    value: results[index] || 0,
    color: colors[index] || '#ccc'
  })).filter(item => item.value > 0); // Only show non-zero slices

  return (
    <div style={{
      margin: '2rem 0',
      padding: '2rem',
      background: 'linear-gradient(135deg, rgba(255, 150, 100, 0.05) 0%, rgba(255, 255, 255, 0.8) 100%)',
      border: '2px solid rgba(255, 150, 100, 0.2)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(255, 150, 100, 0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.03,
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(255, 150, 100, 0.1) 10px,
          rgba(255, 150, 100, 0.1) 20px
        )`,
        pointerEvents: 'none'
      }} />

      <h3 style={{
        marginBottom: '1.5rem',
        color: '#333',
        fontSize: '1.3rem',
        fontWeight: '600',
        textAlign: 'center'
      }}>
        {question}
      </h3>
      
      {!loading && !answered && (
        <div className={`pollOptions cols-${answers.length <= 2 ? 2 : answers.length === 3 ? 3 : 2}`}>
          {answers.map((answer, index) => {
            const color = colors[index] || '#ccc';

            return (
              <div
                key={index}
                onClick={() => handleVote(index)}
                style={{
                  padding: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.6)',
                  border: `2px solid ${color}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 4px 16px ${color}40`;
                  e.currentTarget.style.backgroundColor = `${color}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                }}
              >
                <div style={{
                  fontWeight: '500',
                  color: '#333',
                  fontSize: '1rem',
                  textAlign: 'center'
                }}>
                  {answer}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results with Pie Chart */}
      <div className={`pollResultsWrap ${!loading && answered && totalVotes > 0 ? 'open' : ''}`}>
       <div className="pollResultsInner">
        {!loading && answered && totalVotes > 0 && (
        <div className="pollResults">
          {/* Pie Chart */}
          <div className="pollPie" style={{
            opacity: 0,
            animation: 'slideInLeft 0.8s ease-out 0.3s forwards'
          }}>
            <PieChart
              data={pieData}
              animate={true}
              animationDuration={1000}
              radius={45}
              lineWidth={90}
              segmentsShift={(index) => (index === selectedOption ? 2 : 0)}
              label={({ dataEntry }) => `${Math.round((dataEntry.value / totalVotes) * 100)}%`}
              labelStyle={{
                fontSize: '6px',
                fontFamily: 'sans-serif',
                fontWeight: 'bold',
                fill: 'white'
              }}
              labelPosition={75}
            />
          </div>

          {/* Legend */}
          <div style={{
            flex: 1,
            opacity: 0,
            animation: 'slideInRight 0.8s ease-out 0.6s forwards'
          }}>
            {pieData.map((item, index) => (
              <div 
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: selectedOption === item.key 
                    ? `linear-gradient(135deg, ${item.color}20 0%, ${item.color}10 100%)`
                    : 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  border: selectedOption === item.key 
                    ? `2px solid ${item.color}60`
                    : '1px solid rgba(0, 0, 0, 0.1)',
                  transform: selectedOption === item.key ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: item.color,
                  borderRadius: '50%',
                  marginRight: '1rem',
                  flexShrink: 0
                }} />
                <div style={{
                  fontWeight: selectedOption === item.key ? 'bold' : '500',
                  color: '#333',
                  fontSize: '1rem'
                }}>
                  {item.title}
                </div>
                <div style={{
                  marginLeft: 'auto',
                  fontWeight: 'bold',
                  color: item.color,
                  fontSize: '1.1rem'
                }}>
                  {Math.round((item.value / totalVotes) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
       </div>
      </div>

      {loading && (
        <div style={{
          textAlign: 'center',
          color: '#999',
          fontStyle: 'italic',
          padding: '2rem'
        }}>
          Loading poll...
        </div>
      )}

      {!loading && totalVotes === 0 && !answered && (
        <div style={{
          textAlign: 'center',
          color: '#999',
          fontStyle: 'italic',
          marginTop: '1rem',
          fontSize: '0.9rem'
        }}>
          Be the first to vote!
        </div>
      )}

      <style jsx>{`
        .pollOptions {
          display: grid;
          gap: 1rem;
        }
        .pollOptions.cols-2 { grid-template-columns: repeat(2, 1fr); }
        .pollOptions.cols-3 { grid-template-columns: repeat(3, 1fr); }

        /* Smooth height transition from options grid to results */
        .pollResultsWrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pollResultsWrap.open {
          grid-template-rows: 1fr;
        }
        .pollResultsInner {
          overflow: hidden;
          min-height: 0;
        }

        .pollResults {
          display: flex;
          align-items: center;
          gap: 3rem;
          margin-top: 1rem;
        }
        .pollPie {
          flex: 0 0 300px;
          height: 300px;
        }

        @media (max-width: 640px) {
          .pollOptions.cols-2,
          .pollOptions.cols-3 {
            grid-template-columns: 1fr;
          }
          .pollResults {
            flex-direction: column;
            gap: 1.5rem;
          }
          .pollPie {
            flex: 0 0 auto;
            width: 100%;
            max-width: 320px;
            height: auto;
            aspect-ratio: 1 / 1;
          }
          /* Larger legend cards on mobile */
          .pollResults > div:last-child > div {
            padding: 1.1rem 1.25rem !important;
            margin-bottom: 0.85rem !important;
            font-size: 1.05rem !important;
          }
          .pollResults > div:last-child > div > div:first-child {
            width: 20px !important;
            height: 20px !important;
            margin-right: 1.1rem !important;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Poll; 