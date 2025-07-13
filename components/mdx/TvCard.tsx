import styles from './TvCard.module.css'

interface TvCardProps {
  children: React.ReactNode
}

export default function TvCard({ children }: TvCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <strong>TV Show Info</strong>
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
} 