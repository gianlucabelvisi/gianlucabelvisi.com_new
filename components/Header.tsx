import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ThemeToggle from './ThemeToggle'
import styles from './Header.module.css'

interface NavItem {
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  // Add navigation items as pages are created:
  // { label: 'About', href: '/about' },
  // { label: 'Books', href: '/books' },
]

export default function Header() {
  const [visible, setVisible] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const lastScrollY = useRef(0)
  const router = useRouter()
  const isHomepage = router.pathname === '/'

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

  useEffect(() => {
    setMobileOpen(false)
  }, [router.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const headerClass = [
    styles.header,
    visible ? styles.visible : styles.hidden,
    isHomepage ? styles.homepage : styles.page,
    scrolled || !isHomepage ? styles.scrolled : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <header className={headerClass}>
        <div className={styles.inner}>
          {!isHomepage && (
            <Link href="/" className={styles.logo} aria-label="Home">
              <span className={styles.logoText}>Home</span>
            </Link>
          )}

          <div className={styles.controls}>
            {NAV_ITEMS.length > 0 && (
              <nav className={styles.desktopNav} aria-label="Main navigation">
                {NAV_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navLink} ${router.pathname === item.href ? styles.active : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Wrapped in a div so CSS can reliably hide it on mobile */}
            {!isHomepage && (
              <div className={styles.themeToggleDesktop}>
                <ThemeToggle />
              </div>
            )}

            {/* Always in the DOM on mobile — CSS shows/hides it */}
            <button
              className={`${styles.hamburger} ${mobileOpen ? styles.open : ''}`}
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
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
        className={`${styles.mobileNav} ${mobileOpen ? styles.mobileNavOpen : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
      >
        {!isHomepage && (
          <div className={styles.mobileThemeToggle}>
            <ThemeToggle />
          </div>
        )}

        {!isHomepage && (
          <Link href="/" className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
            Home
          </Link>
        )}

        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
