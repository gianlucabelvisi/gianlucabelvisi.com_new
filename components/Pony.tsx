import '@fontsource/irish-grover/index.css'
import styles from './Pony.module.css'

interface PonyProps {
  children: React.ReactNode
  fontSize?: string
}

/** The pony's voice: blunt convictions in the pony's own lettering */
export default function Pony({ children, fontSize }: PonyProps) {
  return (
    <span className={styles.pony} style={fontSize ? { fontSize } : undefined}>
      {children}
    </span>
  )
}
