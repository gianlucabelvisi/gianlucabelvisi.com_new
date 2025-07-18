import React from 'react'
import { ImVolumeHigh } from 'react-icons/im'
import styles from './Listen.module.css'

interface ListenProps {
  url: string
}

const Listen: React.FC<ListenProps> = ({ url }) => {
  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button 
      className={styles.listenButton}
      onClick={handleClick}
      aria-label="Listen to song"
      title="Listen to song"
    >
      <ImVolumeHigh className={styles.icon} />
    </button>
  )
}

export default Listen 