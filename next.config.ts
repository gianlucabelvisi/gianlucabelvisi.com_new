import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // `lib/posts.ts` walks the posts/ tree at build time. Without this,
  // Next.js's file tracer pulls every co-located image into the
  // serverless function bundle (~300+ MB), which blows past Netlify's
  // upload limit. Images are served separately from public/images/posts/
  // (populated by scripts/copy-post-images.js), so the function only
  // needs the .mdx files themselves.
  outputFileTracingExcludes: {
    '*': [
      'posts/**/*.{jpg,jpeg,png,gif,webp,avif,svg,mp4,mov,m4v,webm,pdf,zip,mp3,wav}',
      'public/images/**',
      'old_blog/**',
    ],
  },
};

export default nextConfig;
