"""Web assets for the three.js viewer.  python3 web_assets.py <out_dir>
Needs prep/ (prep.py) and out/pantelleria.glb + out/instances.bin (build.py), and gltf-transform on PATH.
Writes: island.glb (meshopt), terrain.webp, coast.png, height.bin (gzip u16, row 0 = south), instances.bin (gzip), meta.json
"""
import gzip, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image

W = sys.argv[1] if len(sys.argv) > 1 else 'web/assets'
os.makedirs(W, exist_ok=True)
G = np.load('prep/grid.npz'); z = G['z']
F = json.load(open('prep/features.json'))
subprocess.run(['gltf-transform', 'meshopt', 'out/pantelleria.glb', os.path.join(W, 'island.glb'), '--level', 'high'], check=True,
               stdout=subprocess.DEVNULL)
Image.open('prep/terrain.png').save(os.path.join(W, 'terrain.webp'), quality=84, method=6)
Image.open('prep/terrain_photo.png').save(os.path.join(W, 'terrain_photo.webp'), quality=82, method=6)
shutil.copy('prep/coast.png', os.path.join(W, 'coast.png'))
hm = np.clip(np.round((z.astype(np.float64) + 50.0) * 50.0), 0, 65535).astype('<u2')
open(os.path.join(W, 'height.bin'), 'wb').write(gzip.compress(hm.tobytes(), 9))
open(os.path.join(W, 'instances.bin'), 'wb').write(gzip.compress(open('out/instances.bin', 'rb').read(), 9))
import math
def road_labels():
    """Anchors for road names along the roads: [name, x, y, z, angle, tier]. tier 0 main, 1 street, 2 track/path."""
    TIER = {'secondary': 0, 'tertiary': 0, 'primary': 0, 'trunk': 0, 'unclassified': 1, 'residential': 1, 'service': 1,
            'pedestrian': 1, 'living_street': 1, 'track': 2, 'path': 2, 'footway': 2, 'steps': 2, 'cycleway': 2}
    STEP = {0: 420.0, 1: 220.0, 2: 260.0}
    out, seen = [], {}
    for r in sorted(F['roads'], key=lambda r: TIER.get(r['cls'], 2)):
        nm = r['name'] or r['ref']
        if not nm: continue
        t = TIER.get(r['cls'], 2); P = r['pts']
        if len(P) < 2: continue
        cum = [0.0]
        for a, b in zip(P, P[1:]): cum.append(cum[-1] + math.dist(a[:2], b[:2]))
        L = cum[-1]
        if L < 45: continue
        n = max(1, int(L // STEP[t]))
        for k in range(n):
            s_ = L * (k + 0.5) / n
            def at(d):
                d = min(max(d, 0), L)
                for i in range(1, len(cum)):
                    if cum[i] >= d:
                        f = (d - cum[i - 1]) / max(cum[i] - cum[i - 1], 1e-6); a, b = P[i - 1], P[i]
                        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
                return P[-1]
            c = at(s_); p0 = at(s_ - 18); p1 = at(s_ + 18)
            ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
            key = nm
            if any(math.dist(c[:2], q) < STEP[t] * 0.6 for q in seen.get(key, [])): continue
            seen.setdefault(key, []).append(c[:2])
            out.append([nm, round(c[0], 1), round(c[1], 1), round(c[2] + 1.0, 1), round(ang, 3), t])
    print('road labels', len(out))
    return out

fr = F['frame']
meta = {'x0': fr['x0'], 'y0': fr['y0'], 'cell': fr['cell'], 'nx': fr['nx'], 'ny': fr['ny'], 'lat0': 36.785, 'lon0': 11.99,
        'labels': F['labels'],
        'roadLabels': road_labels()}
json.dump(meta, open(os.path.join(W, 'meta.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
for f in sorted(os.listdir(W)):
    print(f'{f:16s} {os.path.getsize(os.path.join(W, f)) / 1e6:6.2f} MB')
