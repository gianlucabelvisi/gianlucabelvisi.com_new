import React from 'react'
import styles from './Song.module.css'

interface SongProps {
  children: React.ReactNode
}

/**
 * One line of a song. Lines that follow each other form a verse (the first gets the note);
 * a <Break/> between them starts the next verse.
 */
const Song: React.FC<SongProps> = ({ children }) => <div className={styles.song}>{children}</div>

export default Song
