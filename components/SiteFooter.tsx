import Link from 'next/link'
import { FiRss } from 'react-icons/fi'
import { AUTHOR_NAME } from '../lib/routes'
import styles from './SiteFooter.module.css'

const START_YEAR = 2019

export default function SiteFooter() {
  const year = new Date().getFullYear()
  const range = year > START_YEAR ? `${START_YEAR}–${year}` : `${year}`

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>
          © {range} {AUTHOR_NAME}. Written by a human, occasionally proofread by a pony.
        </p>
        <nav className={styles.links} aria-label="Footer">
          <Link href="/archive">Archive</Link>
          <Link href="/tags">Tags</Link>
          <Link href="/search">Search</Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- XML document, not a page */}
          <a href="/feed.xml" className={styles.rss}>
            <FiRss aria-hidden="true" /> RSS
          </a>
        </nav>
      </div>
    </footer>
  )
}
