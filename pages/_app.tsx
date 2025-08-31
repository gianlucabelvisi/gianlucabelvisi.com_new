import "@/styles/globals.css";
import "@/styles/utils.css";
import "@/styles/blog.css";
import type { AppProps } from "next/app";
import React from "react";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useRouter } from "next/router";

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
    }
  }, [isHomepage]);

  return (
    <ThemeProvider forceTheme={forceTheme} defaultTheme={defaultTheme}>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
