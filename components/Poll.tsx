import React, { useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { convex } from '../lib/convex';
import { getVote, rememberVote } from '../lib/voter';
import styles from './Poll.module.css';

interface PollProps {
  id: string;
  question: string;
  answers: string[];
  /** A short verdict per answer ("Brave", "Romantic"), shown next to it once the results are out */
  labels?: string[];
}

type PollResults = Record<string, number>;

interface PollViewProps extends PollProps {
  /** Votes per answer index; undefined while they load */
  results: PollResults | undefined;
  /** The answer this reader picked, or null */
  selected: number | null;
  /** Absent when there is no backend to vote against */
  onVote?: (index: number) => void;
  failed?: boolean;
}

/**
 * A one-question poll. Before voting: the answers as a list of buttons. After: the same list turns into the
 * results, each row filling up to its share of the vote, with the reader's own choice marked.
 * Votes live in Convex (convex/polls.ts) and the results are live: other readers' votes move the bars.
 * The reader's choice is remembered in this browser, so a reload shows the results again.
 */
const LivePoll: React.FC<PollProps> = props => {
  const { id } = props;
  const results = useQuery(api.polls.results, { poll: id });
  const [selected, setSelected] = useState<number | null>(() => getVote(`poll:${id}`));
  const [failed, setFailed] = useState(false);

  // Count the vote on screen straight away; the server's number replaces it when it arrives
  const castVote = useMutation(api.polls.vote).withOptimisticUpdate((store, { poll, option }) => {
    const current = store.getQuery(api.polls.results, { poll });
    if (!current) return;
    store.setQuery(api.polls.results, { poll }, { ...current, [option]: (current[option] ?? 0) + 1 });
  });

  const vote = async (index: number) => {
    if (selected !== null) return;
    setFailed(false);
    setSelected(index);
    try {
      await castVote({ poll: id, option: index });
      rememberVote(`poll:${id}`, index);
    } catch (error) {
      console.error('Error voting:', error);
      // The vote didn't land: put the question back rather than show a result that isn't real
      setSelected(null);
      setFailed(true);
    }
  };

  return <PollView {...props} results={results} selected={selected} onVote={vote} failed={failed} />;
};

const PollView: React.FC<PollViewProps> = ({ question, answers, labels, results = {}, selected, onVote, failed }) => {
  const answered = selected !== null;

  const total = answers.reduce((sum, _answer, index) => sum + (results[index] || 0), 0);
  const share = (index: number) => (total > 0 ? Math.round(((results[index] || 0) / total) * 100) : 0);
  const top = Math.max(0, ...answers.map((_answer, index) => results[index] || 0));

  return (
    <section className={styles.poll} aria-label={`Poll: ${question}`}>
      <p className={styles.kicker}>Poll</p>
      <h3 className={styles.question}>{question}</h3>

      <ol className={styles.answers}>
        {answers.map((answer, index) => {
          const mine = selected === index;
          const pct = share(index);
          const leading = answered && top > 0 && (results[index] || 0) === top;

          if (!answered) {
            return (
              <li key={index}>
                <button type="button" className={styles.option} onClick={() => onVote?.(index)} disabled={!onVote}>
                  <span className={styles.letter} aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  <span className={styles.text}>{answer}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={index}>
              <div
                className={`${styles.result} ${mine ? styles.mine : ''} ${leading ? styles.leading : ''}`}
                style={{ '--share': `${pct}%` } as React.CSSProperties}
              >
                <span className={styles.bar} aria-hidden="true" />
                <span className={styles.letter} aria-hidden="true">
                  {mine ? <FiCheck /> : String.fromCharCode(65 + index)}
                </span>
                <span className={styles.text}>
                  {labels?.[index] && <span className={styles.label}>{labels[index]}</span>}
                  {answer}
                  {mine && <span className="sr-only"> (your vote)</span>}
                </span>
                <span className={styles.share}>{pct}%</span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className={styles.footnote} role="status">
        {failed
          ? 'That vote didn\'t go through. Try again in a moment.'
          : !onVote
            ? 'Voting is switched off on this copy of the site.'
            : !answered
              ? 'Pick one to see what everyone else said.'
              : `${total.toLocaleString('en-US')} ${total === 1 ? 'vote' : 'votes'} so far`}
      </p>
    </section>
  );
};

/** Without a backend the poll still shows its question and answers, just not as buttons */
const Poll: React.FC<PollProps> = props =>
  convex ? <LivePoll {...props} /> : <PollView {...props} results={undefined} selected={null} />;

export default Poll;
