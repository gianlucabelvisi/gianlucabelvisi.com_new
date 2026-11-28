import React from 'react'
import styles from './SpecCard.module.css'

interface FilmCardProps {
  country?: string
  director?: string
  seenOn?: string
  starring?: string
  emoji?: string
}

/** The facts about a film, as a strip under its trailer */
const FilmCard: React.FC<FilmCardProps> = ({ country, director, seenOn, starring, emoji }) => {
  const cells: { label: string; value?: string; emoji?: boolean; long?: boolean }[] = [
    { label: 'Country', value: country },
    { label: 'Director', value: director },
    { label: 'Starring', value: starring, long: true },
    { label: 'Seen on', value: seenOn },
    { label: 'Emoji', value: emoji, emoji: true },
  ]

  return (
    <div className={styles.card}>
      <dl className={styles.grid}>
        {cells.filter(c => c.value).map(c => (
          <div key={c.label} className={`${styles.cell} ${c.emoji ? styles.emoji : ''} ${c.long ? styles.long : ''}`}>
            <dt className={styles.label}>{c.label}</dt>
            <dd className={styles.value}>{c.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default FilmCard
