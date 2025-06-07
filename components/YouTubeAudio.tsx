import React, { useState } from 'react';
import ReactPlayer from 'react-player/lazy';
import { FaPlay, FaPause } from 'react-icons/fa';
import styles from './YouTubeAudio.module.css';

interface YouTubeAudioProps {
  url: string;
}

const YouTubeAudio: React.FC<YouTubeAudioProps> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlaying = () => {
    setIsPlaying(!isPlaying);
  };

  const onEnded = () => {
    setIsPlaying(false);
  };

  return (
    <span className={styles.wrapper}>
      <ReactPlayer
        url={url}
        playing={isPlaying}
        onEnded={onEnded}
        style={{ display: 'none' }}
        width="0"
        height="0"
      />
      
      <button className={styles.playButton} onClick={togglePlaying}>
        <span className={styles.playIcon}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </span>
      </button>
    </span>
  );
};

export default YouTubeAudio; 