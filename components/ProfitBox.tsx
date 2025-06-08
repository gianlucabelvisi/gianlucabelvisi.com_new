import React from 'react'
import styles from './ProfitBox.module.css'

interface ProfitBoxProps {
  subject: string
  percentage: number
}

const ProfitBox: React.FC<ProfitBoxProps> = ({ subject, percentage }) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h2 className={styles.subject}>
          {subject}
        </h2>
        <div className={styles.profit}>
          +{percentage}%
        </div>
      </div>
    </div>
  )
}

export default ProfitBox 