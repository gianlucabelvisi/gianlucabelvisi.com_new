import React from 'react'
import styles from './Song.module.css'

interface SongProps {
  children: React.ReactNode
}

const Song: React.FC<SongProps> = ({ children }) => {
  return (
    <div className={styles.song}>
      {children}
    </div>
  )
}

export default Song 