import React from 'react'
import { FiVolume2 } from 'react-icons/fi'
import styles from './Listen.module.css'

interface ListenProps {
  url: string
}

/** A small inline "hear it" button that opens the song in a new tab */
const Listen: React.FC<ListenProps> = ({ url }) => (
  <a
    className={styles.listen}
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Listen to the song (opens in a new tab)"
    title="Listen"
  >
    <FiVolume2 aria-hidden="true" />
  </a>
)

export default Listen
