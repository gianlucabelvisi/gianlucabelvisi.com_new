import "@/styles/globals.css";
import "@/styles/utils.css";
import "@/styles/blog.css";
import type { AppProps } from "next/app";
import Script from "next/script";
import React from "react";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useRouter } from "next/router";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";
import RouteProgress from "../components/RouteProgress";
import { isDarkOnlyRoute } from "../lib/routes";

// Privacy-friendly, cookie-less analytics. Off unless the domain is configured (see .env.example).
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Browse pages (home, archive, tags, search) are always dark; posts respect the toggle
  const forceTheme = isDarkOnlyRoute(router.pathname) ? 'dark' : undefined;

  // Register PWA service worker (production only — avoids stale SW in dev)
  React.useEffect(() => {
    if (
      process.env.NODE_ENV === 'production' &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* swallow — SW registration is best-effort */
      });
    }
  }, []);

  return (
    <ThemeProvider forceTheme={forceTheme} defaultTheme="light">
      {PLAUSIBLE_DOMAIN && process.env.NODE_ENV === 'production' && (
        <Script
          defer
          data-domain={PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.outbound-links.js"
          strategy="afterInteractive"
        />
      )}
      <a href="#main-content" className="skip-link">Skip to content</a>
      <RouteProgress />
      <Header />
      <main id="main-content">
        <Component {...pageProps} />
      </main>
      <SiteFooter />
    </ThemeProvider>
  );
}
