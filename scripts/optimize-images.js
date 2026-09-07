#!/usr/bin/env node

// Re-encode oversized images in posts/<year>/<slug>/ in place so they don't
// blow up the bundle / CDN bandwidth. MDX references images by filename, so
// extensions are preserved.
//
// Rules:
//   - JPEG: resize to MAX_WIDTH if wider, re-encode at QUALITY with mozjpeg.
//   - PNG with transparency: resize, recompress (lossless).
//   - PNG without transparency: convert to JPEG bytes saved under the same
//     .png filename (browsers sniff the magic bytes, so this is safe and
//     keeps MDX refs intact).
//   - GIF / WebP / SVG: skipped.
//   - Files already ≤ SIZE_THRESHOLD and ≤ MAX_WIDTH are skipped.
//
// Pass --dry-run to see what would change without writing.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const MAX_WIDTH = 1600;
const SIZE_THRESHOLD = 500 * 1024; // 500 KB
const JPG_QUALITY = 82;
// Don't re-encode (and lose quality) for a marginal win.
const MIN_GAIN = 0.10; // 10%
const DRY_RUN = process.argv.includes('--dry-run');

const PROCESS_EXTS = new Set(['.jpg', '.jpeg', '.png']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function human(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

async function optimize(file) {
  const ext = path.extname(file).toLowerCase();
  if (!PROCESS_EXTS.has(ext)) return { file, status: 'skip-ext' };

  const stat = fs.statSync(file);
  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch (err) {
    return { file, status: 'unreadable', err: err.message };
  }

  const oversized = (meta.width || 0) > MAX_WIDTH;
  const heavy = stat.size > SIZE_THRESHOLD;
  if (!oversized && !heavy) return { file, status: 'skip-ok', oldSize: stat.size };

  const resizeOpts = oversized
    ? { width: MAX_WIDTH, withoutEnlargement: true }
    : undefined;

  let buffer;
  let mode;
  if (ext === '.png' && meta.hasAlpha) {
    mode = 'png-alpha';
    let p = sharp(file);
    if (resizeOpts) p = p.resize(resizeOpts);
    buffer = await p.png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
  } else {
    // JPEG, or PNG-without-alpha — encode as JPEG (smallest with no quality loss).
    mode = ext === '.png' ? 'png→jpeg-bytes' : 'jpeg';
    let p = sharp(file).flatten({ background: '#ffffff' });
    if (resizeOpts) p = p.resize(resizeOpts);
    buffer = await p.jpeg({ quality: JPG_QUALITY, mozjpeg: true }).toBuffer();
  }

  // Never write a larger file. For same-dimension re-encodes also require a
  // meaningful gain, otherwise we just lose quality for nothing.
  const minAcceptable = oversized ? stat.size : stat.size * (1 - MIN_GAIN);
  if (buffer.length >= minAcceptable) {
    return { file, status: 'skip-no-gain', oldSize: stat.size, newSize: buffer.length };
  }

  if (!DRY_RUN) fs.writeFileSync(file, buffer);

  return {
    file,
    status: 'optimized',
    mode,
    oldSize: stat.size,
    newSize: buffer.length,
    oldWidth: meta.width,
    newWidth: oversized ? MAX_WIDTH : meta.width,
  };
}

(async () => {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('posts/ directory not found at', POSTS_DIR);
    process.exit(1);
  }

  const files = walk(POSTS_DIR);
  const targets = files.filter((f) => PROCESS_EXTS.has(path.extname(f).toLowerCase()));
  console.log(`Scanning ${targets.length} candidate images${DRY_RUN ? ' (dry run)' : ''}…\n`);

  let totalOld = 0;
  let totalNew = 0;
  let optimizedCount = 0;
  const failures = [];

  // Process serially to avoid spawning N libvips workers on huge images.
  for (const file of targets) {
    try {
      const r = await optimize(file);
      if (r.status === 'optimized') {
        optimizedCount++;
        totalOld += r.oldSize;
        totalNew += r.newSize;
        const rel = path.relative(POSTS_DIR, file);
        const pct = ((1 - r.newSize / r.oldSize) * 100).toFixed(0);
        console.log(
          `  ${rel}: ${human(r.oldSize)} → ${human(r.newSize)} (-${pct}%, ${r.mode}, ${r.oldWidth}→${r.newWidth}px)`
        );
      }
    } catch (err) {
      failures.push({ file, err: err.message });
    }
  }

  console.log('');
  console.log(`Optimized ${optimizedCount} of ${targets.length} files`);
  if (optimizedCount > 0) {
    const saved = totalOld - totalNew;
    const pct = ((1 - totalNew / totalOld) * 100).toFixed(1);
    console.log(`Saved: ${human(saved)} (${pct}%, ${human(totalOld)} → ${human(totalNew)})`);
  }
  if (failures.length) {
    console.log(`\nFailures (${failures.length}):`);
    failures.forEach((f) => console.log(`  ${f.file}: ${f.err}`));
  }
  if (DRY_RUN) console.log('\n(dry run — no files written)');
})();
