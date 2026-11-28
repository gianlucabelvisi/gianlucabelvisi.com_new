import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { convex } from '../lib/convex';
import styles from './UnicornButton.module.css';

interface UnicornButtonProps {
  page: string;
  id: string;
  tooltip: string;
}

interface UnicornViewProps {
  tooltip: string;
  count: number;
  onClick: () => void;
}

interface Particle {
  id: number;
  symbol: string;
  /** Where it flies to, in px from the button's centre */
  dx: number;
  dy: number;
  spin: number;
  delay: number;
}

const SYMBOLS = ['✨', '🌈', '💖', '🦄', '⭐', '💫', '🎉'];
const BURST_MS = 1200;

/**
 * The unicorn button: a counter the reader can mash to register disapproval (or delight) at a punchline.
 * Calm at rest, a burst of confetti on every click. Counts live in Convex (convex/unicorns.ts) and are
 * shared: someone else mashing the same button moves this number too.
 */
const LiveUnicornButton: React.FC<UnicornButtonProps> = ({ page, id, tooltip }) => {
  const count = useQuery(api.unicorns.get, { page, id });
  // Count the click on screen straight away; the server's number replaces it when it arrives
  const click = useMutation(api.unicorns.click).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.unicorns.get, args);
    if (current !== undefined) store.setQuery(api.unicorns.get, args, current + 1);
  });

  return (
    <UnicornView
      tooltip={tooltip}
      count={count ?? 0}
      onClick={() => { click({ page, id }).catch(err => console.error('Could not save the click:', err)); }}
    />
  );
};

/** Without a backend the button still works as a toy: it counts this visit's clicks and forgets them */
const LocalUnicornButton: React.FC<UnicornButtonProps> = ({ tooltip }) => {
  const [count, setCount] = useState(0);
  return <UnicornView tooltip={tooltip} count={count} onClick={() => setCount(n => n + 1)} />;
};

const UnicornView: React.FC<UnicornViewProps> = ({ tooltip, count, onClick }) => {
  const [bump, setBump] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [tooltipShift, setTooltipShift] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  // Once shown, nudge the tooltip sideways if it would poke out of the viewport
  useEffect(() => {
    if (!showTooltip) return;
    const frame = requestAnimationFrame(() => {
      const el = tooltipRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 16;
      let shift = 0;
      if (rect.left < margin) shift = margin - rect.left;
      else if (rect.right > window.innerWidth - margin) shift = (window.innerWidth - margin) - rect.right;
      setTooltipShift(shift);
    });
    return () => cancelAnimationFrame(frame);
  }, [showTooltip, tooltip]);

  const burst = () => {
    const fresh: Particle[] = Array.from({ length: 14 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 90;
      return {
        id: nextId.current++,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - 30, // biased upwards
        spin: (Math.random() - 0.5) * 540,
        delay: Math.random() * 80,
      };
    });
    setParticles(prev => [...prev, ...fresh]);
    const ids = new Set(fresh.map(p => p.id));
    window.setTimeout(() => setParticles(prev => prev.filter(p => !ids.has(p.id))), BURST_MS);
  };

  const handleClick = () => {
    setBump(n => n + 1);
    burst();
    onClick();
  };

  const hide = () => { setShowTooltip(false); setTooltipShift(0); };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={hide}
        onFocus={() => setShowTooltip(true)}
        onBlur={hide}
        aria-label={`${tooltip} (${count})`}
      >
        {/* key: remounting replays the bump animation on every click */}
        <span key={bump} className={`${styles.unicorn} ${bump > 0 ? styles.bump : ''}`} aria-hidden="true">🦄</span>
        <span className={styles.count}>{count.toLocaleString('en-US')}</span>
      </button>

      <span className={styles.particles} aria-hidden="true">
        {particles.map(p => (
          <span
            key={p.id}
            className={styles.particle}
            style={{
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--spin': `${p.spin}deg`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties}
          >
            {p.symbol}
          </span>
        ))}
      </span>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${tooltipShift}px))` }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};

const UnicornButton: React.FC<UnicornButtonProps> = props =>
  convex ? <LiveUnicornButton {...props} /> : <LocalUnicornButton {...props} />;

export default UnicornButton;
