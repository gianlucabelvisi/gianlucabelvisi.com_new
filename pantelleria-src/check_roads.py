"""Road guard (2026-11-11). Standing rule: whenever the terrain or anything on it changes, the roads must not be affected.
Runs at the end of run_all.sh and FAILS the build when a problem shows up in a 100 m cell that was clean in the
accepted baseline (data/road_check_baseline.json).  python3 check_roads.py [--accept]
Checks (data side; tests/road_check.mjs does the drawn road surface):
  objects   trees, buildings, town blocks, site shrubs / rocks / parked cars / blocks / walls, Campobello props,
            airport props / cars / fence standing on a drivable carriageway
  hills     site ground more than 3 m above the original terrain over 40 m2 or more (fake hills)
  walls     site ground rising like a wall (> 1.2 m at 1.5 m, > 2.5 m at 4 m) beside a drivable road
  steep     drivable road steeper than 35 % over 10 m inside a site
"""
import sys, os, json, gzip, struct, glob
import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.strtree import STRtree
sys.path.insert(0, 'sites')
from common import make_hcubic
ACCEPT = '--accept' in sys.argv
F = json.load(open('prep/features.json'))
DRIVE = [r for r in F['roads'] if r['cls'] not in ('footway', 'path', 'steps', 'cycleway', 'pedestrian', 'track') and len(r['pts']) > 1]
G = [LineString(np.array(r['pts'])[:, :2]).buffer(max(0.5, r['w'] / 2 - 0.5), cap_style=2) for r in DRIVE]
T = STRtree(G)
def on_road(x, y, pad=0.0):
    p = Point(x, y)
    return any(G[k].distance(p) <= pad for k in T.query(p.buffer(pad + 0.01)))
found = {'objects': [], 'hills': [], 'walls': [], 'steep': []}
for t in F['trees']:
    if on_road(t[0], t[1]): found['objects'].append((t[0], t[1], 'tree'))
def polys(items, tag):
    for b in items:
        try: P = Polygon(np.array(b['pts'])[:, :2]).buffer(0)
        except Exception: continue
        for k in T.query(P):
            if G[k].intersection(P).area > 1.5: found['objects'].append((P.centroid.x, P.centroid.y, tag)); break
polys(F['buildings'], 'building')
if os.path.exists('prep/town.json'): polys(json.load(open('prep/town.json'))['blds'], 'town block')
W = 'web/assets'
for f in glob.glob(W + '/site_*.json'):
    J = json.load(open(f)); nm = os.path.basename(f)[5:-5]
    for key in ('veg', 'boulders', 'cars', 'blocks'):
        for o in J.get(key, []):
            if on_road(o[0], o[1], 0.3 if key != 'veg' else 0.0): found['objects'].append((o[0], o[1], nm + ' ' + key))
    for w in J.get('walls', []):
        if on_road((w[0] + w[2]) / 2, (w[1] + w[3]) / 2) or on_road(w[0], w[1]) or on_road(w[2], w[3]): found['objects'].append(((w[0] + w[2]) / 2, (w[1] + w[3]) / 2, nm + ' wall'))
if os.path.exists(W + '/campo.json'):
    for p in json.load(open(W + '/campo.json')).get('props', []):
        if on_road(p[1], p[2]): found['objects'].append((p[1], p[2], 'campo ' + p[0]))
if os.path.exists(W + '/airport.json'):
    A = json.load(open(W + '/airport.json'))
    for p in A.get('props', []):
        if on_road(p[1], p[2]): found['objects'].append((p[1], p[2], 'airport ' + p[0]))
    for c in A.get('cars', []):
        if on_road(c[0], c[1], 0.3): found['objects'].append((c[0], c[1], 'airport car'))
    for run in A.get('fence', []):
        for q in run[::2]:
            if on_road(q[0], q[1]): found['objects'].append((q[0], q[1], 'airport fence'))
# ---- sites: fake hills, walls beside roads, steep roads ----
G0 = dict(np.load('prep/grid_prep.npz')) if os.path.exists('prep/grid_prep.npz') else None
h0f = make_hcubic(G0) if G0 else None
from scipy import ndimage
for f in glob.glob(W + '/site_*.bin'):
    raw = open(f, 'rb').read(); b = gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw
    x0, y0, res = struct.unpack('<3f', b[:12]); nx, ny = struct.unpack('<2H', b[12:16])
    z = np.frombuffer(b[16:16 + 2 * nx * ny], '<i2').reshape(ny, nx).astype(float); ok = z != -32768; z /= 100
    nm = os.path.basename(f)[5:-4]
    if h0f is not None:
        st = 2; X, Y = np.meshgrid(x0 + np.arange(0, nx, st) * res, y0 + np.arange(0, ny, st) * res)
        d = np.where(ok[::st, ::st], z[::st, ::st] - h0f(X.ravel(), Y.ravel()).reshape(X.shape), 0)
        lab, n = ndimage.label(d > 3.0)
        for i in range(1, n + 1):
            m = lab == i
            if m.sum() * (res * st) ** 2 >= 40: found['hills'].append((float(X[m].mean()), float(Y[m].mean()), '%s +%.1f m' % (nm, d[m].max())))
    for r in DRIVE:
        P = np.array(r['pts'], float)[:, :2]
        if P[:, 0].max() < x0 or P[:, 0].min() > x0 + nx * res or P[:, 1].max() < y0 or P[:, 1].min() > y0 + ny * res: continue
        prof = []
        for a_, b_ in zip(P[:-1], P[1:]):
            L = np.hypot(*(b_ - a_))
            if L < 0.1: continue
            t = (b_ - a_) / L; nrm = np.array([-t[1], t[0]])
            for s in np.arange(0, L, 2.0):
                c = a_ + t * s; i, j = int((c[1] - y0) / res), int((c[0] - x0) / res)
                if not (0 <= i < ny and 0 <= j < nx) or not ok[i, j]: prof.append(None); continue
                zc = z[i, j]; prof.append((c[0], c[1], zc))
                for side in (1, -1):
                    for off, lim in ((r['w'] / 2 + 1.5, 1.2), (r['w'] / 2 + 4, 2.5)):
                        q = c + nrm * off * side; qi, qj = int((q[1] - y0) / res), int((q[0] - x0) / res)
                        if 0 <= qi < ny and 0 <= qj < nx and ok[qi, qj] and z[qi, qj] - zc > lim: found['walls'].append((float(c[0]), float(c[1]), '%s +%.1f m' % (nm, z[qi, qj] - zc)))
        for k in range(len(prof) - 5):
            if prof[k] and prof[k + 5] and abs(prof[k + 5][2] - prof[k][2]) > 3.5: found['steep'].append((prof[k][0], prof[k][1], '%s %.0f %%' % (nm, abs(prof[k + 5][2] - prof[k][2]) * 10)))
cells = {k: sorted({'%d,%d' % (x // 100 * 100, y // 100 * 100) for x, y, _ in v}) for k, v in found.items()}
BF = 'data/road_check_baseline.json'
base = json.load(open(BF)) if os.path.exists(BF) else {}
bad = {}
for k, v in cells.items():
    new = sorted(set(v) - set(base.get(k, [])))
    print('road check · %-8s %5d findings in %3d cells (%d new)' % (k, len(found[k]), len(v), len(new)))
    if new:
        bad[k] = new
        for c in new[:8]:
            cx, cy = map(int, c.split(','))
            ex = [t for x, y, t in found[k] if x // 100 * 100 == cx and y // 100 * 100 == cy]
            print('    new at x %d y %d: %s' % (cx + 50, cy + 50, ', '.join(sorted(set(ex))[:4])))
json.dump({k: [[round(x, 1), round(y, 1), t] for x, y, t in v] for k, v in found.items()}, open('prep/road_check.json', 'w'))
if ACCEPT or not os.path.exists(BF):
    base.update(cells); os.makedirs('data', exist_ok=True); json.dump(base, open(BF, 'w'), separators=(',', ':')); print('road check · baseline saved')
elif bad:
    print('ROAD CHECK FAILED: new problems on or beside roads (see above; details in prep/road_check.json). Fix them, or accept with: python3 check_roads.py --accept'); sys.exit(1)
else:
    print('road check · OK (nothing new)')
