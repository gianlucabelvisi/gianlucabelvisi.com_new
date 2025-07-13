import { ImQuotesLeft, ImQuotesRight } from 'react-icons/im'
import styles from './Dialogue.module.css'

interface DialogueProps {
  children: React.ReactNode
}

export default function Dialogue({ children }: DialogueProps) {
  return (
    <div className={styles.dialogue}>
      <ImQuotesLeft className={styles.quote} />
      <span className={styles.text}>{children}</span>
      <ImQuotesRight className={styles.quote} />
    </div>
  )
}
