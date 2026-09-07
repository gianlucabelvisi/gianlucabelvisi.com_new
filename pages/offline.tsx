import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/StatusPage.module.css'

export default function Offline() {
  return (
    <div className={styles.page}>
      <Head>
        <title>Offline — Gianluca Belvisi</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className={styles.emoji} aria-hidden="true">📡</div>
      <h1 className={styles.title}>You&apos;re offline</h1>
      <p className={styles.text}>
        This page isn&apos;t cached yet. Reconnect, or open a post you&apos;ve already visited.
      </p>
      <div className={styles.actions}>
        <Link href="/" className={styles.primary}>Go to homepage</Link>
      </div>
    </div>
  )
}
