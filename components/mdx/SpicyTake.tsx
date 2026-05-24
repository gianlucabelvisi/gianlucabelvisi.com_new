import styles from './SpicyTake.module.css'

interface SpicyTakeProps {
  children: React.ReactNode
}

export default function SpicyTake({ children }: SpicyTakeProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.badge}>
        <span className={styles.pepper1} aria-hidden="true">🌶️</span>
        <span className={styles.pepper2} aria-hidden="true">🌶️</span>
        <span className={styles.pepper3} aria-hidden="true">🌶️</span>
        <span className={styles.badgeText}>Spicy Take</span>
      </div>
      <div className={styles.container}>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}
