import React from 'react'

type RedditProps = {
  source: string
  label?: string
  title?: string
  subreddit?: string
  author?: string
}

function Reddit({ source, label = "", title = "Reddit Post", subreddit = "", author = "" }: RedditProps) {
  const getSubredditName = (url: string) => {
    const match = url.match(/reddit\.com\/r\/([^\/]+)/)
    return subreddit || (match ? match[1] : 'reddit')
  }

  const subredditName = getSubredditName(source)

  return (
    <div style={{ marginBottom: '2rem' }}>
      <a 
        href={source}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
      >
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(255, 69, 0, 0.08) 0%, rgba(255, 69, 0, 0.04) 100%)',
            border: '2px solid #ff4500',
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: '2rem',
            marginBottom: '1rem',
            boxShadow: '0 4px 12px rgba(255, 69, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer'
          }}
        >
          <div 
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, rgba(255, 69, 0, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(50%, -50%)',
              pointerEvents: 'none'
            }} 
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div 
                style={{
                  backgroundColor: '#ff4500',
                  color: 'white',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  marginRight: '0.8rem'
                }}
              >
                r/{subredditName}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                Reddit Post
              </div>
            </div>

            <h3 
              style={{
                margin: '0 0 0.5rem 0',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#333'
              }}
            >
              {title}
            </h3>

            {author && (
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
                by u/{author}
              </div>
            )}

            <div 
              style={{
                fontSize: '0.9rem',
                color: '#ff4500',
                fontWeight: '500',
                marginTop: '1rem'
              }}
            >
              View on Reddit →
            </div>
          </div>
        </div>
      </a>

      {label && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <em style={{ color: '#666' }}>{label}</em>
        </div>
      )}
    </div>
  )
}

export default Reddit 