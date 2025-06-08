import React from 'react';

interface RedditProps {
  source: string;
  label?: string;
  title?: string;
}

const Reddit: React.FC<RedditProps> = ({ source, label = "", title = "" }) => {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        paddingBottom: '75%',
        position: 'relative',
        marginTop: '2rem',
        marginBottom: '1rem'
      }}>
        <iframe 
          src={source}
          title={title}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%"
          }}
          allowFullScreen
        />
      </div>
      {label.length > 0 && (
        <div style={{ textAlign: 'center' }}>
          <em>{label}</em>
        </div>
      )}
    </div>
  );
};

export default Reddit; 