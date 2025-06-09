import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function OvercomingImpostorSyndromeRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new URL structure
    router.replace('/posts/2021/impostor/overcoming-impostor-syndrome')
  }, [router])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1>Redirecting...</h1>
      <p>Taking you to the hidden impostor syndrome sequel...</p>
      <p>
        If you're not redirected automatically, 
        <a href="/posts/2021/impostor/overcoming-impostor-syndrome" style={{ color: '#ff9664', marginLeft: '0.5rem' }}>
          click here
        </a>
      </p>
    </div>
  )
} 