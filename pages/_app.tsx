import "@/styles/globals.css";
import "@/styles/utils.css";
import "@/styles/blog.css";
import type { AppProps } from "next/app";
import React from "react";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useRouter } from "next/router";
import Header from "../components/Header";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Homepage should always be dark, posts should default to light
  const isHomepage = router.pathname === '/';
  const forceTheme = isHomepage ? 'dark' : undefined;
  const defaultTheme = isHomepage ? 'dark' : 'light';

  // Set initial theme immediately to prevent flash
  React.useEffect(() => {
    if (isHomepage) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      // For posts, check localStorage or default to light
      const savedTheme = localStorage.getItem('blog-theme');
      const initialTheme = savedTheme || 'light';
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, [isHomepage]);

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
    <ThemeProvider forceTheme={forceTheme} defaultTheme={defaultTheme}>
      <Header />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
