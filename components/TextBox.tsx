import { useState } from 'react'

interface TextBoxProps {
  children: React.ReactNode
  title?: string
  closeable?: boolean
}

const TextBox = ({ children, title, closeable = false }: TextBoxProps) => {
  const [isOpen, setIsOpen] = useState(true)

  if (closeable && !isOpen) {
    return (
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderLeft: '3px solid #ff9664',
        padding: '1rem',
        marginTop: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {title && (
            <div style={{
              textTransform: 'uppercase' as const,
              fontWeight: 'bold'
            }}>
              {title}
            </div>
          )}
          <button
            onClick={() => setIsOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff9664',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '0.5rem'
            }}
          >
            ▼ Show
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderLeft: '3px solid #ff9664', // Orange accent color
      padding: '1rem',
      marginTop: '2rem',
      marginBottom: '2rem'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: title ? '1rem' : '0'
      }}>
        {title && (
          <div style={{
            textTransform: 'uppercase' as const,
            fontWeight: 'bold'
          }}>
            {title}
          </div>
        )}
        {closeable && (
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff9664',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '0.5rem'
            }}
          >
            ▲ Hide
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

export default TextBox 