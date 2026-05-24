import Head from 'next/head'
import Link from 'next/link'

export default function Offline() {
  return (
    <>
      <Head>
        <title>Offline — Gianluca Belvisi</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }} aria-hidden="true">
          📡
        </div>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>
          You&apos;re offline
        </h1>
        <p style={{ maxWidth: '32ch', color: 'var(--color-text-secondary, #6b7280)' }}>
          This page isn&apos;t cached yet. Reconnect, or open a post you&apos;ve already visited.
        </p>
        <Link
          href="/"
          style={{
            marginTop: '1.5rem',
            padding: '0.55rem 1.25rem',
            background: 'var(--color-primary, #e87c48)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Go to homepage
        </Link>
      </main>
    </>
  )
}
