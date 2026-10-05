"""Inline plan.json + apartment.glb into walk.src.html.
Usage: python3 assemble.py <web_dir> [blog_index_html_out]
Writes <web_dir>/index.html (CDN three), <web_dir>/test.html (local node_modules three, for Playwright),
and optionally the blog copy (full HTML doc, media path /walkthrough/media/)."""
import base64, re, sys, os
W = sys.argv[1] if len(sys.argv) > 1 else 'web'
s = open(os.path.join(W, 'walk.src.html')).read()
glb = base64.b64encode(open(os.path.join(W, 'apartment.glb'), 'rb').read()).decode()
plan = open(os.path.join(W, 'plan.json')).read()
full = s.replace('__PLAN__', plan).replace('__GLB__', glb)
open(os.path.join(W, 'index.html'), 'w').write(full)
t = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[^/]+/build/three\.module\.js', '/node_modules/three/build/three.module.js', full)
t = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[^/]+/examples/jsm/', '/node_modules/three/examples/jsm/', t)
t = t.replace('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.8.3/build/index.module.js', '/node_modules/three-mesh-bvh/build/index.module.js')
open(os.path.join(W, 'test.html'), 'w').write(t)
if len(sys.argv) > 2:
    b = full.replace('data-media="media/"', 'data-media="/walkthrough/media/"')
    b = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">\n' + b + '\n</body></html>\n'
    os.makedirs(os.path.dirname(sys.argv[2]), exist_ok=True)
    open(sys.argv[2], 'w').write(b)
