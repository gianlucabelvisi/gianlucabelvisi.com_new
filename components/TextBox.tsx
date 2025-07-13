import { useState, useRef, useEffect } from 'react'
import styles from './TextBox.module.css'

interface TextBoxProps {
  children: React.ReactNode
  title?: string
  closeable?: boolean
  defaultOpen?: boolean
}

const TextBox = ({ children, title, closeable = false, defaultOpen = true }: TextBoxProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isAnimating, setIsAnimating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number>(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [children, isOpen])

  const handleToggle = () => {
    if (isAnimating) return
    
    setIsAnimating(true)
    setIsOpen(!isOpen)
    
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

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
            onClick={handleToggle}
            className={`${styles.toggleButton} ${isOpen ? styles.open : styles.closed}`}
            disabled={isAnimating}
          >
            {isOpen ? '▲ Hide' : '▼ Show'}
          </button>
        )}
      </div>
      
      <div 
        ref={contentRef}
        className={styles.content}
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className={styles.contentInner}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default TextBox 