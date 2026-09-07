import { useId, useState } from 'react'
import styles from './TextBox.module.css'

interface TextBoxProps {
  children: React.ReactNode
  title?: string
  closeable?: boolean
  defaultOpen?: boolean
}

/**
 * Callout box with optional collapse. The open/close animation is a CSS grid
 * `1fr` ↔ `0fr` transition, so the content is never clipped to a measured height —
 * lazy-loaded images that grow the box after mount used to get cut off.
 */
const TextBox = ({ children, title, closeable = false, defaultOpen = true }: TextBoxProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <div className={styles.textbox}>
      <div className={styles.header}>
        {title && (
          <div className={styles.title}>
            {title}
          </div>
        )}
        {closeable && (
          <button
            type="button"
            onClick={() => setIsOpen(o => !o)}
            className={`${styles.toggleButton} ${isOpen ? styles.open : styles.closed}`}
            aria-expanded={isOpen}
            aria-controls={contentId}
          >
            {isOpen ? '▲ Hide' : '▼ Show'}
          </button>
        )}
      </div>

      <div id={contentId} className={`${styles.content} ${isOpen ? '' : styles.collapsed}`}>
        <div className={styles.contentInner}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default TextBox
