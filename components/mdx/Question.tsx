import React from 'react'
import styles from './Question.module.css'

interface QuestionProps {
  children: React.ReactNode
}

const Question: React.FC<QuestionProps> = ({ children }) => {
  return (
    <div className={styles.question}>
      <strong className={styles.questionLabel}>
        Question:
      </strong>
      {children}
    </div>
  )
}

export default Question 