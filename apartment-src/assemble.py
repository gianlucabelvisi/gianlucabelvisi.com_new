"""Expand src/ includes and inline plan.json into walk.src.html; the model ships next to the page as apartment.glb(.gz).
Usage: python3 assemble.py <web_dir> [blog_index_html_out]
Writes <web_dir>/index.html (CDN three), <web_dir>/test.html (local node_modules three, for Playwright),
and optionally the blog copy (full HTML doc, media path /walkthrough/media/)."""
import base64, re, sys, os
W = sys.argv[1] if len(sys.argv) > 1 else 'web'
s = open(os.path.join(W, 'walk.src.html')).read()
# walk.src.html is a thin shell: /*@include src/...*/ lines pull in the stylesheet and the JS modules (src/js/NN-*.js, in order;
# they share one ES-module scope, so they're plain concatenation)
s = re.sub(r'^/\*@include (\S+)\*/\n', lambda m: open(os.path.join(W, m.group(1))).read(), s, flags=re.M)
import gzip
glb_raw = open(os.path.join(W, 'apartment.glb'), 'rb').read()
glb_gz = gzip.compress(glb_raw, 9, mtime=0)                     # deterministic bytes, so an unchanged model doesn't show up as a change
open(os.path.join(W, 'apartment.glb.gz'), 'wb').write(glb_gz)
plan = open(os.path.join(W, 'plan.json')).read()
full = s.replace('__PLAN__', plan)
open(os.path.join(W, 'index.html'), 'w').write(full)
t = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[^/]+/build/three\.module\.js', '/node_modules/three/build/three.module.js', full)
t = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[^/]+/examples/jsm/', '/node_modules/three/examples/jsm/', t)
t = t.replace('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.8.3/build/index.module.js', '/node_modules/three-mesh-bvh/build/index.module.js')
open(os.path.join(W, 'test.html'), 'w').write(t)
if len(sys.argv) > 2:
    b = full.replace('data-media="media/"', 'data-media="/walkthrough/media/"').replace('data-model="apartment.glb"', 'data-model="/walkthrough/apartment.glb"')
    i = b.index('<div id="hud3d"')                      # title, stylesheet and font link go in <head>, so the page is styled from the first paint
    b = ('<!doctype html>\n<html lang="en" style="background:#0f0e0c"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
         + b[:i] + '</head><body style="margin:0;background:#0f0e0c">\n' + b[i:] + '\n</body></html>\n')
    os.makedirs(os.path.dirname(sys.argv[2]), exist_ok=True)
    open(sys.argv[2], 'w').write(b)
    d = os.path.dirname(sys.argv[2])
    open(os.path.join(d, 'apartment.glb'), 'wb').write(glb_raw); open(os.path.join(d, 'apartment.glb.gz'), 'wb').write(glb_gz)
