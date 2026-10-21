"""Expand src/ includes and inline site.json into walk.src.html.
Usage: python3 assemble.py <kit_dir> <web_dir> [blog_index_html_out]
Writes <web_dir>/index.html (CDN three), <web_dir>/test.html (local node_modules three, for Playwright)
and optionally the blog copy (a full HTML document)."""
import re, sys, os
K = sys.argv[1] if len(sys.argv) > 1 else '.'
W = sys.argv[2] if len(sys.argv) > 2 else 'web'
s = open(os.path.join(K, 'walk.src.html')).read()
# /*@include src/...*/ lines pull in the stylesheets and the JS modules (src/js/NN-*.js, in order; one shared ES-module scope)
s = re.sub(r'^/\*@include (\S+)\*/\n', lambda m: open(os.path.join(K, m.group(1))).read() + '\n', s, flags=re.M)
site = open(os.path.join(K, 'site.json')).read().strip()
full = s.replace('__SITE__', site)
os.makedirs(W, exist_ok=True)
open(os.path.join(W, 'index.html'), 'w').write(full)
t = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[^/]+/build/three\.module\.js', '/node_modules/three/build/three.module.js', full)
t = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[^/]+/examples/jsm/', '/node_modules/three/examples/jsm/', t)
t = t.replace('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.8.3/build/index.module.js', '/node_modules/three-mesh-bvh/build/index.module.js')
t = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">\n' + t + '\n</body></html>\n'
open(os.path.join(W, 'test.html'), 'w').write(t)
if len(sys.argv) > 3:
    b = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">\n' + full + '\n</body></html>\n'
    os.makedirs(os.path.dirname(sys.argv[3]), exist_ok=True)
    open(sys.argv[3], 'w').write(b)
print('ok', len(full))
