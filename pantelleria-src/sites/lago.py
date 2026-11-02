"""Via del Lago, from the Perimetrale down to the Specchio di Venere: python3 sites/lago.py   (after bue_marino.py)
The 10 m DEM smears the lake's crater wall into the water: the lakeside road came out 20-30 m above the lake and the
three legs of the descent (Street View 2026-11-02) were lost. Rebuilt here at 0.5 m:
  - upper leg: narrow lane along the plateau (~42-46 m) past the houses, then down to the first hairpin (~22 m) above
    the north-east shore;
  - middle leg: back west across the crater wall, a grey trachyte rock cut on the uphill side, open (low guard blocks)
    to the lake, down to the second hairpin (~6 m);
  - lower leg: east along the shore at lake level (~3.5 m), a low rubble retaining wall on the uphill side, a grass
    verge, and a line of black boulders in the shallows; the west-shore track at the same level down to the beach.
Ground: the strip between the middle leg and the water is re-modelled from the road levels and the shore (2.2 m);
elsewhere the original ground is cut (rock faces ~58 deg) and filled (~50 deg) to seat the roads.
Writes web/assets/site_lago.{bin,webp,json}; lowers the 10 m grid under it (prep/grid.npz).
"""
import gzip, json, math, struct, sys
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree
from matplotlib.path import Path
sys.path.insert(0, 'sites')
from common import imagery, grid, make_hcubic

X0, Y0, X1, Y1, RES = -580.0, 3230.0, -70.0, 3990.0, 0.5
img, xs, ys = imagery(X0, Y0, X1, Y1, RES)
NYp, NXp = img.shape[:2]
Xg, Yg = np.meshgrid(xs, ys)
Gd = grid(); h_orig = make_hcubic(Gd)
h0 = h_orig(Xg, Yg)
F = json.load(open('prep/features.json')); R = {r['id']: r for r in F['roads']}
lake = [w for w in F['water'] if 'Venere' in (w.get('name') or '')][0]
lakeP = Path(np.array(lake['pts'])[:, :2])
in_lake = lakeP.contains_points(np.column_stack([Xg.ravel(), Yg.ravel()])).reshape(Xg.shape)
d_lake = ndimage.distance_transform_edt(~in_lake) * RES             # distance from the water, on land

def chain(ids, start):
    P = []
    for i in ids:
        pts = [p[:2] for p in R[i]['pts']]
        ref = P[-1] if P else start
        if math.dist(ref, pts[-1]) < math.dist(ref, pts[0]): pts = pts[::-1]
        P += pts if not P else pts[1:]
    return np.array(P, float)

def resample(P, step=0.5):
    seg = np.hypot(*np.diff(P, axis=0).T); s = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(0, s[-1], step)
    return np.column_stack([np.interp(t, s, P[:, 0]), np.interp(t, s, P[:, 1])]), t

def profile(ctrl, t):
    c = np.array(ctrl, float); z = np.interp(t, c[:, 0], c[:, 1])
    return ndimage.gaussian_filter1d(z, 30)                          # 15 m: no kinks at the control points

roads = {}
up = chain([389428430, 933237014], (-454, 3961)); upP, upT = resample(up)
h_up = ndimage.gaussian_filter1d(h_orig(upP[:, 0], upP[:, 1]), 40)
z_up = np.where(upT < 190, h_up, h_up[np.searchsorted(upT, 190)] + (22 - h_up[np.searchsorted(upT, 190)]) * np.clip((upT - 190) / (upT[-1] - 190), 0, 1) ** 1.3)
z_up = ndimage.gaussian_filter1d(z_up, 12)
h_raw = h_orig(upP[:, 0], upP[:, 1]); tw = np.clip(upT / 30, 0, 1)
z_up = h_raw * (1 - tw) + z_up * tw                                    # meets the Perimetrale on the original ground
roads['up'] = (upP, upT, z_up, 2.0)
mid = chain([389428429], (-147, 3819)); P, T = resample(mid)
roads['mid'] = (P, T, profile([(0, 22), (120, 18), (260, 12), (T[-1], 6)], T), 2.0)
low = chain([389422661, 389422664], (-416, 3706)); P, T = resample(low)
zl = profile([(0, 6), (60, 3.6), (300, 3.3), (T[-1], 2.6)], T); tw = np.clip((T[-1] - T) / 30, 0, 1)
roads['low'] = (P, T, zl * tw + h_orig(P[:, 0], P[:, 1]) * (1 - tw), 2.1)
west = chain([702095772], (-416, 3706)); P, T = resample(west)
h_end = float(h_orig(P[-1, 0], P[-1, 1]))
roads['west'] = (P, T, profile([(0, 6), (60, 3.6), (T[-1] - 70, 3.8), (T[-1], h_end)], T), 1.7)

# nearest point of each road for every pixel: distance, height there, side (+ = left of travel)
pix = np.column_stack([Xg.ravel(), Yg.ravel()])
near = {}
for k, (P, T, Z, hw) in roads.items():
    d, i = cKDTree(P).query(pix)
    i1 = np.minimum(i + 1, len(P) - 1); i0 = np.maximum(i - 1, 0)
    tx, ty = P[i1, 0] - P[i0, 0], P[i1, 1] - P[i0, 1]
    side = np.sign(tx * (pix[:, 1] - P[i, 1]) - ty * (pix[:, 0] - P[i, 0]))
    near[k] = (d.reshape(Xg.shape), Z[i].reshape(Xg.shape), side.reshape(Xg.shape), hw)

# which side of each road is downhill: the lake's side
def lake_side(k):
    P = roads[k][0]; m = len(P) // 2
    a, b = P[max(m - 4, 0)], P[min(m + 4, len(P) - 1)]
    c = np.array([-280.0, 3560.0])
    return np.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
LS = {k: lake_side(k) for k in roads}

# 1) away from the lake strip: cut / fill the original ground to seat each road
z = h0.copy()
for k in ['up', 'mid', 'west', 'low']:
    d, zr, side, hw = near[k]
    dd = np.maximum(d - hw - 0.4, 0)
    down = side == LS[k]
    cap = np.where(down, zr + np.where(dd < 2.5, 0.0, (dd - 2.5) * 1.0), zr + 2.8 * np.minimum(dd, 3) + 1.0 * np.maximum(dd - 3, 0))      # uphill: an ~8 m rock cut, then the natural slope
    flo = np.where(down, zr - 1.2 * dd, zr - 0.15 * dd)
    zc = np.minimum(np.maximum(z, flo), cap)
    w = np.clip((26 - d) / 8, 0, 1)
    z = z + w * (zc - z)

# 2) the lakeside strip (between the middle leg / west track and the water): rebuilt from the road levels + the shore
strip = Path(np.vstack([roads['mid'][0], roads['west'][0], [[-420, 3240], [-150, 3240], [-60, 3600], [-80, 3700], [-150, 3800]]]))
S = strip.contains_points(pix).reshape(Xg.shape) & ~in_lake
lines = [(near['mid'][0], near['mid'][1], 2.0), (near['low'][0], near['low'][1], 2.1), (near['west'][0], near['west'][1], 1.7)]
num = np.zeros_like(z); den = np.zeros_like(z)
for d, zr, hw in lines:
    wgt = 1 / np.maximum(d - hw - 0.3, 0.05) ** 3; num += wgt * zr; den += wgt
ws = 1 / np.maximum(d_lake - 0.5, 0.05) ** 3; num += ws * 2.25; den += ws
zs = num / den
Sw = ndimage.gaussian_filter(S.astype(float), 6)                     # soft edge (3 m)
Sw = np.where(S, np.maximum(Sw, (d_lake < 60) * 1.0), Sw)
z = z * (1 - Sw) + zs * Sw
# road benches exact, the shore never below the water level, the lake floor under it
for k, (dmap, zr, side, hw) in near.items():
    z = np.where(dmap < hw + 0.3, zr, z)
z = np.where(in_lake, np.minimum(h0, 1.2), np.where(S, np.maximum(z, 2.15), z))

# ---------------- grid underneath ----------------
ENDS = [tuple(roads['up'][0][0]), tuple(roads['low'][0][-1]), tuple(roads['west'][0][-1])]
corr = np.zeros(z.shape, bool)
for k, (d, zr, side, hw) in near.items(): corr |= d < 30
corr |= (Sw > 0.02) | (in_lake & (d_lake == 0) & (ndimage.distance_transform_edt(in_lake) * RES < 5))
Z = Gd['z']; GX0, GY0, CELL = float(Gd['x0']), float(Gd['y0']), float(Gd['cell'])
zmin = ndimage.minimum_filter(z, size=int(16 / RES))
inner = ndimage.binary_erosion(corr, iterations=int(10 / RES))
changed = 0
for i in range(int(np.ceil((Y0 - GY0) / CELL)), int(np.floor((Y1 - GY0) / CELL)) + 1):
    for j in range(int(np.ceil((X0 - GX0) / CELL)), int(np.floor((X1 - GX0) / CELL)) + 1):
        pj, pi = int((GX0 + j * CELL - X0) / RES), int((GY0 + i * CELL - Y0) / RES)
        gx_, gy_ = GX0 + j * CELL, GY0 + i * CELL
        if min(math.dist((gx_, gy_), e) for e in ENDS) < 35: continue          # the roads' ends stay on the island ground
        if 0 <= pi < NYp and 0 <= pj < NXp and inner[pi, pj] and not in_lake[pi, pj]:
            nz = min(float(Z[i, j]), float(zmin[pi, pj]) - 0.6)
            if nz < Z[i, j]: Z[i, j] = nz; changed += 1
np.savez('prep/grid.npz', **Gd)
h_new = make_hcubic(Gd)(Xg, Yg)
edge = corr & ~ndimage.binary_erosion(corr, iterations=int(4 / RES))
z = np.where(edge, h_new, z)                                         # stitched to the island mesh at the rim
print('grid nodes lowered', changed)
keep = ndimage.binary_dilation(corr, iterations=1)
zi = np.where(keep, np.round(z * 100), -32768).astype('<i2')
open('web/assets/site_lago.bin', 'wb').write(gzip.compress(struct.pack('<3f2H', X0, Y0, RES, NXp, NYp) + zi.tobytes(), 9))

# ---------------- colour ----------------
R_, G_, B_ = img[..., 0], img[..., 1], img[..., 2]; L = 0.3 * R_ + 0.59 * G_ + 0.11 * B_
gy, gx = np.gradient(z, RES); slope = np.hypot(gx, gy)
col = np.clip(img * 1.12, 0, 1)
rock = np.clip((slope - 1.6) / 0.6, 0, 1)[..., None]                  # the cuts: grey trachyte (the crater wall keeps its macchia)
trach = np.array([0.55, 0.53, 0.50]) * (0.8 + 0.4 * np.clip(L, 0, 1))[..., None]
col = col * (1 - rock) + trach * rock
shore = (S & (d_lake < 6))[..., None]                                 # pale sand / mud at the water's edge
col = np.where(shore, col * 0.4 + np.array([0.78, 0.74, 0.64]) * 0.6, col)
col[in_lake] = (0.55, 0.75, 0.70)
Image.fromarray((col[::-1] * 255).astype(np.uint8)).save('web/assets/site_lago.webp', quality=86, method=6)

# ---------------- walls, guard blocks, boulders ----------------
def offset_line(k, off, s0, s1, every=0.0):
    P, T, Zr, hw = roads[k]; out = []
    sel = np.nonzero((T >= s0) & (T <= s1))[0][::4]
    for a, b in zip(sel, sel[1:]):
        tx, ty = P[b] - P[a]; L_ = math.hypot(tx, ty) or 1; nx, ny = -ty / L_, tx / L_
        sgn = -LS[k]                                                  # uphill
        out.append([P[a, 0] + nx * off * sgn, P[a, 1] + ny * off * sgn, P[b, 0] + nx * off * sgn, P[b, 1] + ny * off * sgn])
    return out
walls = [w + [0.9, 0.55] for w in offset_line('low', 2.1 + 0.6, 40, roads['low'][1][-1] - 50)]       # rubble retaining wall
blocks = []
P, T, Zr, hw = roads['mid']
for s in np.arange(15, T[-1] - 25, 4.5):                              # concrete guard blocks on the lake side
    i = int(np.searchsorted(T, s)); a, b = P[max(i - 3, 0)], P[min(i + 3, len(P) - 1)]
    tx, ty = b - a; L_ = math.hypot(tx, ty) or 1; nx, ny = -ty / L_ * LS['mid'], tx / L_ * LS['mid']
    blocks.append([round(P[i, 0] + nx * 2.6, 2), round(P[i, 1] + ny * 2.6, 2), round(float(Zr[i]), 2), round(math.atan2(ty, tx), 3)])
bould = []; rng = np.random.default_rng(3)
P, T, Zr, hw = roads['low']
for s in np.arange(20, T[-1] - 40, 2.6):                              # the line of black rocks in the shallows
    i = int(np.searchsorted(T, s)); a, b = P[max(i - 3, 0)], P[min(i + 3, len(P) - 1)]
    tx, ty = b - a; L_ = math.hypot(tx, ty) or 1; nx, ny = -ty / L_ * LS['low'], tx / L_ * LS['low']
    for off in np.arange(4, 30, 0.5):
        x, y = P[i, 0] + nx * off, P[i, 1] + ny * off
        if lakeP.contains_point((x, y)): break
    x += nx * (3.5 + rng.random()); y += ny * (3.5 + rng.random())
    bould.append([round(x, 2), round(y, 2), 2.15, round(0.7 + rng.random() * 0.6, 2), round(rng.random() * 6.28, 2)])
json.dump({'boulders': bould, 'walls': [[round(v, 2) for v in w] for w in walls], 'blocks': blocks}, open('web/assets/site_lago.json', 'w'), separators=(',', ':'))
# the descent is asphalt and narrow (Street View)
F2 = json.load(open('prep/features.json'))
for r in F2['roads']:
    if r['id'] in (389428430, 933237014, 389428429, 389422661, 389422664, 389374588): r['surface'] = 'asphalt'; r['w'] = min(r['w'], 4.0)
json.dump(F2, open('prep/features.json', 'w'), separators=(',', ':'))
print('lago: walls', len(walls), 'blocks', len(blocks), 'boulders', len(bould))
vis = (img * 255).astype(np.uint8).copy()
for k, (dmap, zr, side, hw) in near.items(): vis[(dmap < hw)] = (255, 0, 0)
vis[S & (Sw > 0.5) & (np.arange(NXp)[None, :] % 8 == 0)] = (255, 255, 0)
Image.fromarray(vis[::-1]).save('prep/site_lago_check.png')
for k in roads: print(k, 'len', round(roads[k][1][-1]), 'z', [round(float(v), 1) for v in roads[k][2][::max(1, len(roads[k][2]) // 8)]])
