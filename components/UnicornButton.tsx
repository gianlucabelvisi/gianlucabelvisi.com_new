import React, { useEffect, useState } from 'react';
import { getDatabase, ref, runTransaction } from 'firebase/database';
import app from '../lib/firebase';
import styles from './UnicornButton.module.css';

interface UnicornButtonProps {
  page: string;
  id: string;
  tooltip: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  symbol: string;
  color: string;
}

const UnicornButton: React.FC<UnicornButtonProps> = ({ page, id, tooltip }) => {
  const [count, setCount] = useState(0);
  const [clicked, setClicked] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const magicalSymbols = ['✨', '🌟', '⭐', '💫', '🎉', '🎊', '🌈', '💖', '🦄', '🔮', '🌸', '💎', '🎀', '🌺', '🦋', '🌙', '☄️', '💝'];
  const colors = ['#ff69b4', '#ffd700', '#ff1493', '#00bfff', '#9370db', '#ff6347', '#00ff7f', '#ff69b4', '#87ceeb', '#dda0dd'];

  const createParticles = () => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 25; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1,
        symbol: magicalSymbols[Math.floor(Math.random() * magicalSymbols.length)],
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    setParticles(newParticles);

    // Animate particles
    const animateParticles = () => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        life: particle.life - 0.015,
        vy: particle.vy + 0.15 // gravity
      })).filter(particle => particle.life > 0));
    };

    const intervalId = setInterval(animateParticles, 16);
    setTimeout(() => {
      clearInterval(intervalId);
      setParticles([]);
    }, 3000);
  };

  const handleClick = () => {
    const database = getDatabase(app);
    const reactionRef = ref(database, `unicorn/${page}/${id}`);

    setCount(prevCount => prevCount + 1);
    setClicked(true);
    createParticles();
    
    setTimeout(() => setClicked(false), 1000);

    runTransaction(reactionRef, (stored) => {
      if (stored === undefined) {
        stored = 0;
      }
      return stored + 1;
    });
  };

  useEffect(() => {
    async function fetchData() {
      const database = getDatabase(app);
      const reactionRef = ref(database, `unicorn/${page}/${id}`);

      await runTransaction(reactionRef, (stored) => {
        setCount(stored || 0);
        return stored;
      });
    }
    fetchData();
  }, [id, page]);

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.button} ${clicked ? styles.clicked : ''} ${isHovered ? styles.hovered : ''}`}
        onClick={handleClick}
        onMouseEnter={() => {
          setShowTooltip(true);
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setShowTooltip(false);
          setIsHovered(false);
        }}
        title={tooltip}
      >
        <div className={styles.unicornContainer}>
          <span className={styles.unicorn}>🦄</span>
          <div className={styles.magicAura}></div>
          <div className={styles.sparkleRing}>
            <span className={styles.floatingSparkle} style={{ '--delay': '0s' } as React.CSSProperties}>✨</span>
            <span className={styles.floatingSparkle} style={{ '--delay': '0.5s' } as React.CSSProperties}>🌟</span>
            <span className={styles.floatingSparkle} style={{ '--delay': '1s' } as React.CSSProperties}>⭐</span>
            <span className={styles.floatingSparkle} style={{ '--delay': '1.5s' } as React.CSSProperties}>💫</span>
            <span className={styles.floatingSparkle} style={{ '--delay': '2s' } as React.CSSProperties}>✨</span>
            <span className={styles.floatingSparkle} style={{ '--delay': '2.5s' } as React.CSSProperties}>🌟</span>
          </div>
        </div>
        
        <div className={styles.countContainer}>
          <span className={styles.count}>{count}</span>
        </div>
      </button>

      {/* Particle System */}
      <div className={styles.particleContainer}>
        {particles.map(particle => (
          <div
            key={particle.id}
            className={styles.particle}
            style={{
              left: `calc(50% + ${particle.x}px)`,
              top: `calc(50% + ${particle.y}px)`,
              opacity: particle.life,
              color: particle.color,
              transform: `scale(${particle.life}) rotate(${(1 - particle.life) * 720}deg)`
            }}
          >
            {particle.symbol}
          </div>
        ))}
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipContent}>
            {tooltip}
          </div>
          <div className={styles.tooltipSparkle}>✨</div>
          <div className={styles.tooltipSparkle2}>🌟</div>
          <div className={styles.tooltipSparkle3}>⭐</div>
        </div>
      )}
    </div>
  );
};

export default UnicornButton; 