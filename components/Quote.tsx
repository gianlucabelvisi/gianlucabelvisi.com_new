interface QuoteProps {
  children: React.ReactNode
  from?: string
  title?: string
  bouncy?: boolean
}

const Quote = ({ children, from, title, bouncy = false }: QuoteProps) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 150, 100, 0.08) 0%, rgba(255, 150, 100, 0.04) 100%)',
      border: '2px solid rgba(255, 150, 100, 0.2)',
      borderRadius: '16px',
      padding: '3rem 2rem',
      margin: '3rem 0',
      marginTop: '4rem',
      fontStyle: 'italic',
      position: 'relative',
      animation: bouncy ? 'bounce 2s infinite' : 'none',
      boxShadow: '0 4px 20px rgba(255, 150, 100, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)',
      overflow: 'visible'
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '120px',
        height: '120px',
        background: 'radial-gradient(circle, rgba(255, 150, 100, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        transform: 'translate(50%, -50%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '80px',
        height: '80px',
        background: 'linear-gradient(45deg, rgba(255, 150, 100, 0.08) 0%, transparent 50%)',
        borderRadius: '0 50px 0 0',
        pointerEvents: 'none'
      }} />

      {/* Quote marks */}
      <div style={{
        fontSize: '4.5rem',
        color: '#ff9664',
        position: 'absolute',
        top: '-25px',
        left: '15px',
        lineHeight: '1',
        opacity: '0.6',
        fontFamily: 'serif',
        zIndex: 1
      }}>
        ❝
      </div>
      
      {/* Quote content */}
      <div style={{
        paddingLeft: '3rem',
        paddingRight: '1rem',
        fontSize: '1.2rem',
        lineHeight: '1.7',
        color: '#333',
        fontWeight: '400',
        letterSpacing: '0.01em',
        marginBottom: from ? '1rem' : '0'
      }}>
        {children}
      </div>
      
      {/* Attribution */}
      <div style={{
        textAlign: 'right',
        marginTop: '1.5rem',
        paddingRight: '1rem',
        fontSize: '1rem',
        color: '#ff9664',
        fontWeight: '600',
        fontStyle: 'normal',
        letterSpacing: '0.05em'
      }}>
        — {from || 'Unknown'}
      </div>
      
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
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          div {
            background: linear-gradient(135deg, rgba(255, 150, 100, 0.06) 0%, rgba(255, 150, 100, 0.03) 100%) !important;
            border-color: rgba(255, 150, 100, 0.25) !important;
            color: #e0e0e0 !important;
          }
        }
        
        /* Mobile adjustments */
        @media (max-width: 768px) {
          div {
            padding: 2.5rem 1.5rem !important;
            margin: 2rem 0 !important;
            margin-top: 3rem !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Quote 