import styles from './SpecCard.module.css'

interface TvCardProps {
  seenOn?: string
  seasons?: string
  /** "yes" for a running show; anything else is shown as written ("god, no") */
  ongoing?: string
  emoji?: string
  children?: React.ReactNode
}

/** The facts about a TV show, as a strip under its trailer */
export default function TvCard({ seenOn, seasons, ongoing, emoji, children }: TvCardProps) {
  const cells: { label: string; value?: string; emoji?: boolean }[] = [
    { label: 'Seen on', value: seenOn },
    { label: 'Seasons', value: seasons },
    { label: 'Ongoing', value: ongoing },
    { label: 'Emoji', value: emoji, emoji: true },
  ]

  return (
    <div className={styles.card}>
      {children}
      <dl className={styles.grid}>
        {cells.filter(c => c.value).map(c => (
          <div key={c.label} className={`${styles.cell} ${c.emoji ? styles.emoji : ''}`}>
            <dt className={styles.label}>{c.label}</dt>
            <dd className={styles.value}>{c.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
