import React from 'react'
import styles from './ProfitBox.module.css'

interface ProfitBoxProps {
  subject: string
  percentage: number
}

/** One number, shown off: whose return it is and how big */
const ProfitBox: React.FC<ProfitBoxProps> = ({ subject, percentage }) => (
  <div className={styles.wrapper}>
    <div className={styles.box}>
      <div className={styles.subject}>{subject}</div>
      <div className={styles.profit}>
        {percentage >= 0 ? '+' : '−'}{Math.abs(percentage)}<span className={styles.unit}>%</span>
      </div>
    </div>
  </div>
)

export default ProfitBox
