"""Seat every building on the final ground: python3 ground_fix.py   (after town.py / coast_overlay.py, before build.py)
prep.py measured building ground heights (zmin/zmax) on the raw DEM, at the corners only. roads_smooth.py then grades
the terrain along the main roads and town.py lowers the harbour floor, so houses beside the roads floated (or sank).
Here zmin/zmax are re-measured on the final grid with the viewer's own bicubic (heightCubic in map.src.html, with its
overshoot clamp), sampled along every edge (1.5 m) and inside the footprint (2.5 m grid). Updates prep/features.json and
prep/town.json (z = zmin - 0.4, zt = zmax). Idempotent.
"""
import json
import numpy as np
from shapely.geometry import Polygon, Point
from shapely.prepared import prep as sprep

G = np.load('prep/grid.npz'); Z = G['z'].astype(np.float64)
X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell']); NY, NX = Z.shape
Zq = np.round((Z + 50.0) * 50.0) / 50.0 - 50.0          # what the viewer actually gets from height.bin (2 cm steps)
Hf = Zq.ravel()

def cr(p0, p1, p2, p3, t):
    return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)))

def hcubic(x, y):   # vectorised copy of heightCubic()
    x = np.asarray(x, float); y = np.asarray(y, float)
    fx = (x - X0) / CELL; fy = (y - Y0) / CELL
    fx = np.clip(fx, 1, NX - 3.0001); fy = np.clip(fy, 1, NY - 3.0001)
    j = np.floor(fx).astype(int); i = np.floor(fy).astype(int); tx = fx - j; ty = fy - i
    def row(r):
        k = r * NX + j
        return cr(Hf[k - 1], Hf[k], Hf[k + 1], Hf[k + 2], tx)
    h = cr(row(i - 1), row(i), row(i + 1), row(i + 2), ty)
    c = np.stack([Hf[i * NX + j], Hf[i * NX + j + 1], Hf[(i + 1) * NX + j], Hf[(i + 1) * NX + j + 1]])
    return np.minimum(np.maximum(h, c.min(0) - 1.5), c.max(0) + 1.5)

# hand-detailed sites (web/assets/site_*.bin) replace the ground where they are defined, as in the viewer
import glob, gzip, struct
SITES = []
for f in glob.glob('web/assets/site_*.bin'):
    raw = gzip.decompress(open(f, 'rb').read()); sx0, sy0, sres = struct.unpack('<3f', raw[:12]); snx, sny = struct.unpack('<2H', raw[12:16])
    SITES.append((sx0, sy0, sres, snx, sny, np.frombuffer(raw[16:16 + snx * sny * 2], '<i2').reshape(sny, snx)))
_hc_grid = hcubic
def hcubic(x, y):
    x = np.asarray(x, float); y = np.asarray(y, float); h = _hc_grid(x, y)
    for sx0, sy0, sres, snx, sny, SZ in SITES:
        fx = (x - sx0) / sres - 0.5; fy = (y - sy0) / sres - 0.5
        ok = (fx >= 0) & (fy >= 0) & (fx < snx - 1) & (fy < sny - 1)
        if not ok.any(): continue
        j = np.clip(fx.astype(int), 0, snx - 2); i = np.clip(fy.astype(int), 0, sny - 2); tx = fx - j; ty = fy - i
        a, b, c, d = SZ[i, j], SZ[i, j + 1], SZ[i + 1, j], SZ[i + 1, j + 1]
        ok &= (a != -32768) & (b != -32768) & (c != -32768) & (d != -32768)
        v = ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) / 100.0
        h = np.where(ok, v, h)
    return h

def samples(pts):
    P = np.array(pts, float)
    if np.allclose(P[0], P[-1]): P = P[:-1]
    out = [P]
    for a, b in zip(P, np.roll(P, -1, axis=0)):
        L = np.hypot(*(b - a)); n = int(L // 1.5)
        if n > 0: out.append(a + (b - a) * (np.arange(1, n + 1) / (n + 1))[:, None])
    poly = Polygon(P)
    if poly.is_valid and poly.area > 12:
        x0, y0, x1, y1 = poly.bounds; pp = sprep(poly)
        gx, gy = np.meshgrid(np.arange(x0 + 1.25, x1, 2.5), np.arange(y0 + 1.25, y1, 2.5))
        inside = [(x, y) for x, y in zip(gx.ravel(), gy.ravel()) if pp.contains(Point(x, y))]
        if inside: out.append(np.array(inside))
    return np.concatenate(out)

F = json.load(open('prep/features.json'))
moved = []
for b in F['buildings']:
    S = samples(b['pts']); h = hcubic(S[:, 0], S[:, 1])
    zmin, zmax = float(h.min()), float(h.max())
    moved.append(b['zmin'] - zmin)
    b['zmin'] = round(zmin, 2); b['zmax'] = round(zmax, 2)
# trees too (they were placed on the raw DEM: the ones beside graded roads floated)
if F.get('trees'):
    tr = np.array([t[:2] for t in F['trees']], float); hz = hcubic(tr[:, 0], tr[:, 1])
    dz = np.array([t[2] for t in F['trees']]) - hz
    for t, h in zip(F['trees'], hz): t[2] = round(float(h) - 0.1, 2)
    print('trees re-seated', len(dz), 'floating >0.5 m:', int((dz > 0.5).sum()))
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
m = np.array(moved)
print('buildings', len(m), 'were floating >0.3 m:', int((m > 0.3).sum()), '>1 m:', int((m > 1).sum()), 'max', round(float(m.max()), 2),
      '| sunk >0.5 m:', int((m < -0.5).sum()))

TZ = json.load(open('prep/town.json'))
for b in TZ['blds']:
    S = samples(b['pts']); h = hcubic(S[:, 0], S[:, 1])
    if b['kind'] in ('veranda', 'kiosk'): continue          # these sit on the paving (their own ground)
    b['z'] = round(float(h.min()) - 0.4, 2); b['zt'] = round(float(h.max()), 2)
json.dump(TZ, open('prep/town.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print('town buildings re-seated', len(TZ['blds']))
