import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA (viewport meta is injected by Next automatically) */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#131313" />
        <meta name="application-name" content="Gianluca Belvisi's Blog" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Gianluca Belvisi" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
      </Head>
      <body>
        {/* Blocking script: sets data-theme before first paint to prevent a flash.
            Browse pages (/, /archive, /tags, /search) are always dark; everything else
            uses the saved choice, then the OS preference. Mirrors lib/routes.ts. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var p = location.pathname.replace(/\\/+$/, '') || '/';
            var forced = p === '/' || p === '/archive' || p === '/search' || p === '/tags' || p.indexOf('/tags/') === 0;
            var t = forced ? 'dark' : localStorage.getItem('blog-theme');
            if (t !== 'dark' && t !== 'light') {
              t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
