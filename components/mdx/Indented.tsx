import React from 'react'
import styles from './Indented.module.css'

interface IndentedProps {
  children: React.ReactNode
}

/** A note set in from the margin behind a thin rule: warnings, disclaimers, "before we start" */
const Indented: React.FC<IndentedProps> = ({ children }) => (
  <div className={styles.indented}>{children}</div>
)

export default Indented
