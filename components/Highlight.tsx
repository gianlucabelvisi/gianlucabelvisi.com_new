import styles from './Highlight.module.css'

interface HighlightProps {
  children: React.ReactNode
  color?: 'yellow' | 'blue' | 'green' | 'red'
}

export default function Highlight({ children, color = 'yellow' }: HighlightProps) {
  return (
    <span className={`${styles.highlight} ${styles[color]}`}>
      {children}
    </span>
  )
} 