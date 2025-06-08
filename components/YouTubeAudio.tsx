import React, { useState, useRef } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import styles from './YouTubeAudio.module.css';

interface YouTubeAudioProps {
  url: string;
}

const YouTubeAudio: React.FC<YouTubeAudioProps> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Convert YouTube URL to audio-only format
  const getAudioUrl = (youtubeUrl: string) => {
    const videoId = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    if (videoId) {
      // Note: This is a simplified approach. In practice, you'd need a service to extract audio
      // For now, we'll use the original URL as placeholder
      return youtubeUrl;
    }
    return youtubeUrl;
  };

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
    <span className={styles.wrapper}>
      <audio
        ref={audioRef}
        src={getAudioUrl(url)}
        onEnded={onEnded}
        style={{ display: 'none' }}
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