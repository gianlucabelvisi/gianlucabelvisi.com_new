"""python3 assemble.py <web_dir> [blog_public_dir]
web/map.src.html -> web/index.html (CDN three, media/ = assets) and web/test.html (local node_modules three, for Playwright).
With blog_public_dir: writes <dir>/index.html as a full HTML document with media path /pantelleria-3d/ and copies the assets."""
import os, re, shutil, sys
W = sys.argv[1]
s = open(os.path.join(W, 'map.src.html')).read()
open(os.path.join(W, 'index.html'), 'w').write(s.replace('data-media="media/"', 'data-media="assets/"'))
t = s.replace('data-media="media/"', 'data-media="assets/"')
t = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[^/]+/build/three\.module\.js', '/node_modules/three/build/three.module.js', t)
t = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[^/]+/examples/jsm/', '/node_modules/three/examples/jsm/', t)
open(os.path.join(W, 'test.html'), 'w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>' + t + '</body></html>')
if len(sys.argv) > 2:
    D = sys.argv[2]; os.makedirs(D, exist_ok=True)
    b = s.replace('data-media="media/"', 'data-media="/pantelleria-3d/"')
    b = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"></head><body style="margin:0">\n' + b + '\n</body></html>\n'
    open(os.path.join(D, 'index.html'), 'w').write(b)
    for f in os.listdir(os.path.join(W, 'assets')):
        shutil.copy(os.path.join(W, 'assets', f), os.path.join(D, f))
