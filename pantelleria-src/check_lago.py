"""Road safety check for the lake site (run after the pipeline): fake hills (site surface far above the original
ground), walls beside the roads (ground 1-6 m from a road edge far above the road), and terrain poking through roads."""
import sys, gzip, struct, json, numpy as np
sys.path.insert(0, 'sites'); from common import make_hcubic
from scipy import ndimage
raw = open('web/assets/site_lago.bin', 'rb').read(); b = gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw
x0, y0, res = struct.unpack('<3f', b[:12]); nx, ny = struct.unpack('<2H', b[12:16])
z = np.frombuffer(b[16:16 + 2 * nx * ny], '<i2').reshape(ny, nx).astype(float); ok = z != -32768; z /= 100
G0 = dict(np.load('prep/grid_pre_lago.npz')); h0f = make_hcubic(G0)
X, Y = np.meshgrid(x0 + np.arange(nx) * res, y0 + np.arange(ny) * res)
h0 = h0f(X.ravel(), Y.ravel()).reshape(X.shape)
d = np.where(ok, z - h0, 0)
hill = ok & (d > 3.0)
lab, n = ndimage.label(hill); sizes = ndimage.sum(hill, lab, range(1, n + 1)) * res * res
print('fake hills (>3 m above the original ground):', [(round(float(X[lab == i + 1].mean())), round(float(Y[lab == i + 1].mean())), round(float(s)), round(float(d[lab == i + 1].max()), 1)) for i, s in enumerate(sizes) if s > 40])
F = json.load(open('prep/features.json'))
bad = []
for r in F['roads']:
    if r['cls'] in ('footway', 'path', 'steps', 'cycleway') or len(r['pts']) < 2: continue
    P = np.array(r['pts'], float)[:, :2]
    for a_, b_ in zip(P[:-1], P[1:]):
        L = np.hypot(*(b_ - a_)); 
        if L < 0.1: continue
        t = (b_ - a_) / L; nrm = np.array([-t[1], t[0]])
        for s in np.arange(0, L, 2.0):
            c = a_ + t * s; i, j = int((c[1] - y0) / res), int((c[0] - x0) / res)
            if not (0 <= i < ny and 0 <= j < nx) or not ok[i, j]: continue
            zc = z[i, j]
            for side in (1, -1):
                for off in (r['w'] / 2 + 1.5, r['w'] / 2 + 4):
                    q = c + nrm * off * side; qi, qj = int((q[1] - y0) / res), int((q[0] - x0) / res)
                    if 0 <= qi < ny and 0 <= qj < nx and ok[qi, qj] and z[qi, qj] - zc > (1.2 if off < 3 else 2.5) + 0.0:
                        bad.append((r['id'], round(float(c[0])), round(float(c[1])), round(float(z[qi, qj] - zc), 1), round(off, 1)))
print('wall-like rises beside roads:', len(bad))
from collections import Counter
cc = Counter((x // 20 * 20, y // 20 * 20, rid) for rid, x, y, *_ in bad)
for (x, y, rid), n_ in cc.most_common(25): print('  ', rid, x, y, n_, max(v for r_, xx, yy, v, o in bad if xx // 20 * 20 == x and yy // 20 * 20 == y and r_ == rid))
