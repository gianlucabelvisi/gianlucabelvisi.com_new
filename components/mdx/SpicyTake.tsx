import styles from './SpicyTake.module.css'

interface SpicyTakeProps {
  children: React.ReactNode
}

export default function SpicyTake({ children }: SpicyTakeProps) {
  return (
    <div className={styles.container}>
      <div className={styles.badge}>
        🌶️ Spicy Take
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
} 