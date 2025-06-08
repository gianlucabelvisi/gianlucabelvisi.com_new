import React from 'react';

interface IndentedProps {
  children: React.ReactNode;
}

const Indented: React.FC<IndentedProps> = ({ children }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 150, 100, 0.08) 0%, rgba(255, 150, 100, 0.04) 100%)',
      borderLeft: '4px solid #ff9664',
      borderRadius: '0 8px 8px 0',
      padding: '1.5rem',
      marginTop: '2rem',
      marginBottom: '2rem',
      marginLeft: '2rem',
      marginRight: '1rem',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      fontStyle: 'italic' as const,
      lineHeight: '1.6'
    }}>
      {/* Subtle background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '80px',
        height: '80px',
        background: 'radial-gradient(circle, rgba(255, 150, 100, 0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        transform: 'translate(50%, -50%)',
        pointerEvents: 'none' as const
      }} />
      
      <div style={{
        position: 'relative' as const,
        zIndex: 1
      }}>
        {children}
      </div>
    </div>
  );
};

export default Indented; 