import { useState, useRef, useEffect } from 'react'

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

  const baseStyles = {
    background: 'linear-gradient(135deg, rgba(255, 150, 100, 0.08) 0%, rgba(255, 150, 100, 0.04) 100%)',
    borderLeft: '4px solid #ff9664',
    borderRadius: '0 8px 8px 0',
    padding: '1.5rem',
    marginTop: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    transition: 'all 0.3s ease'
  }

  const titleStyles = {
    fontSize: '0.9rem',
    fontWeight: '600' as const,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: '#ff9664',
    marginBottom: '1rem'
  }

  const buttonStyles = {
    background: 'linear-gradient(135deg, #ff9664 0%, #ff8244 100%)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500' as const,
    padding: '0.4rem 0.8rem',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(255, 150, 100, 0.3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em'
  }

  const handleToggle = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsOpen(!isOpen)
      setTimeout(() => setIsAnimating(false), 300)
    }, 0)
  }

  return (
    <div style={baseStyles}>
      {/* Subtle background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100px',
        height: '100px',
        background: 'radial-gradient(circle, rgba(255, 150, 100, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        transform: 'translate(50%, -50%)',
        pointerEvents: 'none' as const
      }} />
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: title ? '1rem' : '0',
        position: 'relative' as const,
        zIndex: 1
      }}>
        {title && (
          <div style={titleStyles}>
            {title}
          </div>
        )}
        {closeable && (
          <button
            onClick={handleToggle}
            style={{
              ...buttonStyles,
              ...(isOpen ? {} : {
                background: 'transparent',
                color: '#ff9664',
                border: '1px solid #ff9664',
                boxShadow: 'none'
              })
            }}
            onMouseEnter={(e) => {
              if (isOpen) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 150, 100, 0.4)'
              } else {
                e.currentTarget.style.background = '#ff9664'
                e.currentTarget.style.color = 'white'
              }
            }}
            onMouseLeave={(e) => {
              if (isOpen) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(255, 150, 100, 0.3)'
              } else {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#ff9664'
              }
            }}
          >
            {isOpen ? '▲ Hide' : '▼ Show'}
          </button>
        )}
      </div>
      
      <div 
        ref={contentRef}
        style={{
          position: 'relative' as const,
          zIndex: 1,
          lineHeight: '1.6',
          maxHeight: isOpen ? `${contentHeight}px` : '0px',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.3s ease',
        }}
      >
        <div style={{ paddingBottom: isOpen ? '0' : '1rem' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default TextBox 