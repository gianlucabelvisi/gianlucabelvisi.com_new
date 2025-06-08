import React, { useState } from 'react';
import ReactPlayer from 'react-player/lazy';
import { FaPlay, FaPause } from 'react-icons/fa';
import styles from './Listen.module.css';

interface ListenProps {
  url: string;
}

const Listen: React.FC<ListenProps> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlaying = () => {
    setIsPlaying(!isPlaying);
  };

  const onEnded = () => {
    setIsPlaying(false);
  };

  return (
    <span className={styles.listenWrapper}>
      <ReactPlayer
        url={url}
        playing={isPlaying}
        onEnded={onEnded}
        style={{ display: 'none' }}
        width="0"
        height="0"
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