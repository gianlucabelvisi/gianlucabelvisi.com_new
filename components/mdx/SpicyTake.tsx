interface SpicyTakeProps {
  children: React.ReactNode
}

export default function SpicyTake({ children }: SpicyTakeProps) {
  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '2px solid #ff6b35',
      borderRadius: '8px',
      padding: '1.5rem',
      marginTop: '2rem',
      marginBottom: '2rem',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: '-12px',
        left: '1rem',
        backgroundColor: '#ff6b35',
        color: 'white',
        padding: '0.3rem 0.8rem',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        🌶️ Spicy Take
      </div>
      <div style={{
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#d63384',
        marginTop: '0.5rem'
      }}>
        {children}
      </div>
    </div>
  )
} 