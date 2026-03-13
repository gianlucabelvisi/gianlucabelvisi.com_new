import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body>
        {/* Blocking script: reads localStorage and sets data-theme before first paint.
            Prevents flash of wrong theme on post pages. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('blog-theme');
            if (t === 'dark' || t === 'light') {
              document.documentElement.setAttribute('data-theme', t);
            }
          } catch(e) {}
        `}} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
