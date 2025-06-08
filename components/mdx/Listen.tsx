import React, { useState, useRef } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import styles from './Listen.module.css';

interface ListenProps {
  url: string;
}

const Listen: React.FC<ListenProps> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlaying = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
  };

  return (
    <span className={styles.listenWrapper}>
      <audio
        ref={audioRef}
        src={url}
        onEnded={onEnded}
        style={{ display: 'none' }}
      />
      
      <button className={styles.playButton} onClick={togglePlaying} title="Play/Pause">
        <span className={styles.playIcon}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </span>
      </button>
    </span>
  );
};

export default Listen; 