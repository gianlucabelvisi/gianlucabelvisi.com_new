interface EmailProps {
  from: string
  to: string
  subject?: string
  children: React.ReactNode
}

const Email = ({ from, to, subject, children }: EmailProps) => {
  return (
    <div style={{ 
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      margin: '1.5rem 0',
      fontFamily: 'monospace',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Email header */}
      <div style={{
        backgroundColor: '#e8e8e8',
        padding: '12px 16px',
        borderBottom: '1px solid #ccc',
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>From:</strong> {from}
        </div>
        <div style={{ marginBottom: subject ? '4px' : '0' }}>
          <strong>To:</strong> {to}
        </div>
        {subject && (
          <div>
            <strong>Subject:</strong> {subject}
          </div>
        )}
      </div>
      
      {/* Email body */}
      <div style={{
        padding: '16px',
        lineHeight: '1.6',
        backgroundColor: '#fff',
        borderRadius: '0 0 8px 8px'
      }}>
        {children}
      </div>
    </div>
  )
}

export default Email 