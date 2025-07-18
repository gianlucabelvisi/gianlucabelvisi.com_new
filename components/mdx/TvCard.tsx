import styles from './TvCard.module.css'

interface TvCardProps {
  seenOn?: string
  seasons?: string
  ongoing?: string
  emoji?: string
  children?: React.ReactNode
}

export default function TvCard({ seenOn, seasons, ongoing, emoji, children }: TvCardProps) {
  return (
    <div className={styles.tvCard}>
      {children}
      <div className={styles.infoGrid}>
        {seenOn && (
          <div className={styles.column}>
            <div className={styles.header}>SEEN ON</div>
            <div className={styles.value}>{seenOn}</div>
          </div>
        )}
        {seasons && (
          <div className={styles.column}>
            <div className={styles.header}>SEASONS</div>
            <div className={styles.value}>{seasons}</div>
          </div>
        )}
        {ongoing && (
          <div className={styles.column}>
            <div className={styles.header}>ONGOING</div>
            <div className={styles.value}>{ongoing === 'yes' ? 'yes' : 'no'}</div>
          </div>
        )}
        {emoji && (
          <div className={styles.column}>
            <div className={styles.header}>EMOJI</div>
            <div className={styles.value}>{emoji}</div>
          </div>
        )}
      </div>
    </div>
  )
}
