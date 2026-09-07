import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FiHome, FiSearch } from 'react-icons/fi'
import ThemeToggle from './ThemeToggle'
import { isDarkOnlyRoute } from '../lib/routes'
import styles from './Header.module.css'

interface NavItem {
  label: string
  href: string
  /** Also highlight for nested routes, e.g. /tags/food */
  match?: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Archive', href: '/archive' },
  { label: 'Tags', href: '/tags', match: p => p.startsWith('/tags') },
]

export default function Header() {
  const [visible, setVisible] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const lastScrollY = useRef(0)
  const router = useRouter()
  const isHomepage = router.pathname === '/'
  const isDarkRoute = isDarkOnlyRoute(router.pathname)

  useEffect(() => {
    lastScrollY.current = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current

      if (currentScrollY < 10) {
        setVisible(true)
      } else if (delta > 5) {
        setVisible(false)
        setMobileOpen(false)
      } else if (delta < -5) {
        setVisible(true)
      }

      setScrolled(currentScrollY > 20)
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close the mobile menu whenever a navigation starts
  useEffect(() => {
    const close = () => setMobileOpen(false)
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Escape closes the mobile menu
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const isActive = (item: NavItem) =>
    item.match ? item.match(router.pathname) : router.pathname === item.href

  const headerClass = [
    styles.header,
    visible ? styles.visible : styles.hidden,
    isDarkRoute ? styles.homepage : styles.page,
    scrolled || !isHomepage ? styles.scrolled : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <header className={headerClass}>
        <div className={styles.inner}>
          {!isHomepage && (
            <Link href="/" className={styles.logo} aria-label="Home">
              <FiHome className={styles.logoIcon} aria-hidden="true" />
            </Link>
          )}

          <div className={styles.controls}>
            <nav className={styles.desktopNav} aria-label="Main navigation">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item) ? styles.active : ''}`}
                  aria-current={isActive(item) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link
              href="/search"
              className={`${styles.iconButton} ${router.pathname === '/search' ? styles.active : ''}`}
              aria-label="Search posts"
              title="Search"
            >
              <FiSearch aria-hidden="true" />
            </Link>

            {!isDarkRoute && <ThemeToggle />}

            {/* Always in the DOM on mobile — CSS shows/hides it */}
            <button
              className={`${styles.hamburger} ${mobileOpen ? styles.open : ''}`}
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu — always in DOM, animated in/out */}
      <nav
        id="mobile-nav"
        className={`${styles.mobileNav} ${mobileOpen ? styles.mobileNavOpen : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        <Link
          href="/"
          className={styles.mobileNavLink}
          onClick={() => setMobileOpen(false)}
          tabIndex={mobileOpen ? 0 : -1}
        >
          Home
        </Link>

        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}
            tabIndex={mobileOpen ? 0 : -1}
          >
            {item.label}
          </Link>
        ))}

        <Link
          href="/search"
          className={styles.mobileNavLink}
          onClick={() => setMobileOpen(false)}
          tabIndex={mobileOpen ? 0 : -1}
        >
          Search
        </Link>
      </nav>
    </>
  )
}
