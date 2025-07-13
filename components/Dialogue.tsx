import styles from './Dialogue.module.css'

interface DialogueProps {
  children: React.ReactNode
}

export default function Dialogue({ children }: DialogueProps) {
  return (
    <div className={styles.dialogue}>
      <span className={styles.quote}>‹</span>
      <span className={styles.text}>{children}</span>
      <span className={styles.quote}>›</span>
    </div>
  )
} 