interface QuoteProps {
  children: React.ReactNode
  from?: string
  title?: string
  bouncy?: boolean
}

const Quote = ({ children, from, title, bouncy = false }: QuoteProps) => {
  return (
    <div style={{
      backgroundColor: '#f8f8f8',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1.5rem',
      margin: '2rem 0',
      fontStyle: 'italic',
      position: 'relative',
      animation: bouncy ? 'bounce 2s infinite' : 'none'
    }}>
      {/* Quote marks */}
      <div style={{
        fontSize: '3rem',
        color: '#ff9664',
        position: 'absolute',
        top: '-10px',
        left: '10px',
        lineHeight: '1'
      }}>
        ❝
      </div>
      
      {/* Quote content */}
      <div style={{
        paddingLeft: '2rem',
        fontSize: '1.1rem',
        lineHeight: '1.6'
      }}>
        {children}
      </div>
      
      {/* Attribution */}
      {from && (
        <div style={{
          textAlign: 'right',
          marginTop: '1rem',
          fontSize: '0.9rem',
          color: '#666',
          fontWeight: 'bold'
        }}>
          — {from}
        </div>
      )}
      
      {/* Inline CSS for bounce animation */}
      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  )
}

export default Quote 