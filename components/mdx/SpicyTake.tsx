import styles from './SpicyTake.module.css'

interface SpicyTakeProps {
  children: React.ReactNode
}

/** An opinion that is going to cost some friends: set loud, on ink */
export default function SpicyTake({ children }: SpicyTakeProps) {
  return (
    <div className={styles.take}>
      <span className={styles.kicker}><span aria-hidden="true">🌶️</span> Spicy take</span>
      <div className={styles.text}>{children}</div>
    </div>
  )
}
