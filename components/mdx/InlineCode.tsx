import styles from './InlineCode.module.css'

interface InlineCodeProps {
  children: React.ReactNode
}

export default function InlineCode({ children }: InlineCodeProps) {
  return (
    <code className={styles.code}>
      {children}
    </code>
  )
} 