// Mirrors the images that live next to each post (posts/<year>/<slug>/*.jpg …)
// into public/images/posts/<year>/<slug>/ so Next can serve them.
//
// Incremental: only copies files whose size or mtime changed, and removes files
// in public/ that no longer exist in posts/. Runs before `dev` and `build`.
//
// Prints a warning for any image larger than SIZE_WARN so heavy assets get
// noticed before deploy — run `npm run optimize-images` to shrink them.

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'images', 'posts');
const IMAGE_RE = /\.(jpg|jpeg|png|gif|svg|webp|avif)$/i;
const SIZE_WARN = 500 * 1024; // 500 KB
const VERBOSE = process.argv.includes('--verbose');

function human(bytes) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(2) + ' MB'
    : (bytes / 1024).toFixed(0) + ' KB';
}

// Walk posts/ and collect { relPath, absPath, stat } for every image
function collectSourceImages(dir, rel = '', out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const relPath = path.join(rel, entry.name);
    if (entry.isDirectory()) {
      collectSourceImages(abs, relPath, out);
    } else if (entry.isFile() && IMAGE_RE.test(entry.name)) {
      out.push({ relPath, absPath: abs, stat: fs.statSync(abs) });
    }
  }
  return out;
}

// Walk public/images/posts and collect every file (to prune orphans)
function collectDestFiles(dir, rel = '', out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const relPath = path.join(rel, entry.name);
    if (entry.isDirectory()) collectDestFiles(abs, relPath, out);
    else out.push(relPath);
  }
  return out;
}

function isUpToDate(src, destPath) {
  if (!fs.existsSync(destPath)) return false;
  const d = fs.statSync(destPath);
  return d.size === src.stat.size && d.mtimeMs >= src.stat.mtimeMs;
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(path.join(dir, entry.name));
  }
  if (dir !== PUBLIC_DIR && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log('❌ Posts directory not found');
    process.exit(1);
  }

  const sources = collectSourceImages(POSTS_DIR);
  const sourceSet = new Set(sources.map(s => s.relPath));

  let copied = 0;
  let totalBytes = 0;
  const heavy = [];

  for (const src of sources) {
    totalBytes += src.stat.size;
    if (src.stat.size > SIZE_WARN) heavy.push(src);

    const destPath = path.join(PUBLIC_DIR, src.relPath);
    if (isUpToDate(src, destPath)) continue;

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(src.absPath, destPath);
    copied++;
    if (VERBOSE) console.log(`Copied: ${src.relPath}`);
  }

  // Prune files that no longer exist in posts/
  let removed = 0;
  for (const rel of collectDestFiles(PUBLIC_DIR)) {
    if (!sourceSet.has(rel)) {
      fs.unlinkSync(path.join(PUBLIC_DIR, rel));
      removed++;
      if (VERBOSE) console.log(`Removed: ${rel}`);
    }
  }
  removeEmptyDirs(PUBLIC_DIR);

  console.log(
    `✅ Post images: ${sources.length} total (${human(totalBytes)}), ${copied} copied, ${removed} removed`
  );

  if (heavy.length) {
    heavy.sort((a, b) => b.stat.size - a.stat.size);
    console.log(`⚠️  ${heavy.length} image(s) over ${human(SIZE_WARN)} — consider \`npm run optimize-images\`:`);
    for (const h of heavy.slice(0, 10)) {
      console.log(`   ${human(h.stat.size).padStart(8)}  ${h.relPath}`);
    }
    if (heavy.length > 10) console.log(`   …and ${heavy.length - 10} more`);
  }
}

main();
