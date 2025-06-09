interface TvCardProps {
  seenOn: string
  seasons: string
  ongoing: string
  emoji: string
}

export default function TvCard({ seenOn, seasons, ongoing, emoji }: TvCardProps) {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '1rem',
      marginTop: '1rem',
      marginBottom: '2rem',
      fontSize: '0.9rem',
      color: '#666'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
        <strong style={{ color: '#333' }}>TV Show Info</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
        <strong>Seen on:</strong>
        <span>{seenOn}</span>
        <strong>Seasons:</strong>
        <span>{seasons}</span>
        <strong>Ongoing:</strong>
        <span style={{ color: ongoing === 'yes' ? '#28a745' : '#dc3545' }}>
          {ongoing === 'yes' ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  )
} 