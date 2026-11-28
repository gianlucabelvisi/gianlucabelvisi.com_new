import React from 'react'
import styles from './Question.module.css'

interface QuestionProps {
  children: React.ReactNode
}

/** The reader interrupting with a question, which the next paragraph then answers */
const Question: React.FC<QuestionProps> = ({ children }) => (
  <div className={styles.question}>
    <span className={styles.mark}>Question</span>
    <span className={styles.text}>{children}</span>
  </div>
)

export default Question
