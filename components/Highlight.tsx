interface HighlightProps {
  children: React.ReactNode;
  color?: 'yellow' | 'blue' | 'green' | 'red';
}

export default function Highlight({ children, color = 'yellow' }: HighlightProps) {
  const colors = {
    yellow: 'bg-yellow-200 text-yellow-900',
    blue: 'bg-blue-200 text-blue-900', 
    green: 'bg-green-200 text-green-900',
    red: 'bg-red-200 text-red-900'
  };

  return (
    <span 
      className={`px-2 py-1 rounded ${colors[color]}`}
      style={{
        backgroundColor: color === 'yellow' ? '#fef3c7' : 
                        color === 'blue' ? '#dbeafe' :
                        color === 'green' ? '#d1fae5' : '#fecaca',
        color: color === 'yellow' ? '#92400e' :
               color === 'blue' ? '#1e3a8a' :
               color === 'green' ? '#065f46' : '#991b1b',
        padding: '4px 8px',
        borderRadius: '4px'
      }}
    >
      {children}
    </span>
  );
} 