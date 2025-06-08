import React from 'react';

interface InlineCodeProps {
  children: React.ReactNode;
}

const InlineCode: React.FC<InlineCodeProps> = ({ children }) => {
  return (
    <code 
      style={{
        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
        color: '#1e293b',
        padding: '0.2rem 0.4rem',
        borderRadius: '4px',
        fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace",
        fontSize: '0.875em',
        fontWeight: 500,
        border: '1px solid #cbd5e1',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </code>
  );
};

export default InlineCode; 