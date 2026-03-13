import styles from './Email.module.css'

interface EmailProps {
  from: string
  to: string
  subject?: string
  children: React.ReactNode
}

const Email = ({ from, to, subject, children }: EmailProps) => {
  return (
    <div className={styles.container}>
      {/* Email header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <span className={styles.headerLabel}>From:</span>
          <span className={styles.headerValue}>{from}</span>
        </div>
        <div className={styles.headerRow}>
          <span className={styles.headerLabel}>To:</span>
          <span className={styles.headerValue}>{to}</span>
        </div>
        {subject && (
          <div className={styles.headerRow}>
            <span className={styles.headerLabel}>Subject:</span>
            <span className={styles.headerValue}>{subject}</span>
          </div>
        )}
      </div>
      
      {/* Email body */}
      <div className={styles.body}>
        {children}
      </div>
    </div>
  )
}

export default Email 