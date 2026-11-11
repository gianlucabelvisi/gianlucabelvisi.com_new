"""Island-wide rocky coast: python3 coast_atlas.py   (after town.py, before coast_overlay.py / ground_fix.py)
On Pantelleria no green reaches the sea: the shore is black-grey lava (scogli, flat platforms, boulders), with only dry,
low scrub behind it. From the Esri z18 imagery (data/esri, the whole island) every 512 m tile that holds coast is
rendered at ~1.6 m/px: rock recoloured on a grey lava ramp keeping the real shapes of the shelves and inlets, wet rock at
the waterline, vegetation turned summer-dry and thinned, all fading out inland (full to ~45 m from the sea, gone by
~130 m). Tiles go into one atlas (12 x 12 slots of 320 px with a 2 px gutter); the viewer looks tiles up by position.
Also: classes within ~30 m of the sea -> bare rock (no shrubs), 30-75 m macchia/wood -> low mixed; trees within 40 m of
the sea are dropped.
Writes web/assets/coast_atlas.webp, prep/coast_atlas.json, updates prep/classes.npy and prep/features.json (trees).
"""
import json, math, os
import numpy as np
from PIL import Image
from pyproj import Transformer
from scipy import ndimage
from shapely.geometry import Polygon
from rasterio.features import rasterize
from affine import Affine

T, S, GUT = 512.0, 320, 2
PX = T / (S - 2 * GUT)                       # metres per pixel
COLS = 12
G = np.load('prep/grid.npz'); Z = G['z'].astype(np.float64); LAND = G['land'].astype(bool)
X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell']); NY, NX = Z.shape
TM = '+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +ellps=WGS84'
toLL = Transformer.from_crs(TM, 'EPSG:4326', always_xy=True)
n18 = 2 ** 18
TZ = json.load(open('prep/town.json'))
town = Polygon(TZ['zone']).buffer(120)
F = json.load(open('prep/features.json'))

# Arco dell'Elefante: open the sea passage under the trunk (the viewer draws the rock); the DEM has a low spit there
Gd = dict(np.load('prep/grid.npz'))
for x, y in [(5670, 910), (5680, 910), (5670, 920), (5680, 920), (5660, 920), (5670, 930), (5680, 930)]:
    i, j = int(round((y - Y0) / CELL)), int(round((x - X0) / CELL)); Gd['z'][i, j] = min(Gd['z'][i, j], -4.0); Gd['land'][i, j] = False
np.savez('prep/grid.npz', **Gd); Z = Gd['z'].astype(np.float64); LAND = Gd['land'].astype(bool)
dsea10 = ndimage.distance_transform_edt(LAND) * CELL
coast10 = LAND & (dsea10 <= 140)
ii, jj = np.nonzero(coast10)
tiles = sorted(set(zip(((jj * CELL) // T).astype(int), ((ii * CELL) // T).astype(int))))
assert len(tiles) <= COLS * COLS, len(tiles)
atlas = np.zeros((COLS * S, COLS * S, 4), np.uint8)
tcache = {}
def esri(a, b):
    k = (a, b)
    if k not in tcache:
        f = f'data/esri/18_{a}_{b}.jpg'
        tcache[k] = np.asarray(Image.open(f).convert('RGB')) if os.path.exists(f) else None
        if len(tcache) > 400: tcache.pop(next(iter(tcache)))
    return tcache[k]

index = []
MARG = 160.0
for k, (ti, tj) in enumerate(tiles):
    # pixel centres of the slot (gutter included), plus a margin for the distance transform
    ox, oy = X0 + ti * T - GUT * PX, Y0 + tj * T - GUT * PX
    nm = int(MARG / PX)
    W = S + 2 * nm
    xs = ox - nm * PX + (np.arange(W) + 0.5) * PX
    ys = oy - nm * PX + (np.arange(W) + 0.5) * PX
    Xg, Yg = np.meshgrid(xs, ys[::-1])                     # row 0 = north
    lon, lat = toLL.transform(Xg, Yg)
    tx = (lon + 180) / 360 * n18; la = np.radians(lat); ty = (1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * n18
    a0, b0, a1, b1 = int(tx.min()), int(ty.min()), int(tx.max()), int(ty.max())
    M = np.zeros(((b1 - b0 + 1) * 256, (a1 - a0 + 1) * 256, 3), np.uint8); have = np.zeros(M.shape[:2], bool)
    for a in range(a0, a1 + 1):
        for b in range(b0, b1 + 1):
            im = esri(a, b)
            if im is not None:
                M[(b - b0) * 256:(b - b0 + 1) * 256, (a - a0) * 256:(a - a0 + 1) * 256] = im
                have[(b - b0) * 256:(b - b0 + 1) * 256, (a - a0) * 256:(a - a0 + 1) * 256] = True
    px_, py_ = (tx - a0) * 256, (ty - b0) * 256
    img = np.stack([ndimage.map_coordinates(M[..., c].astype(np.float32), [py_, px_], order=1) for c in range(3)], -1) / 255.0
    ok = ndimage.map_coordinates(have.astype(np.float32), [py_, px_], order=0) > 0.5
    landf = ndimage.map_coordinates(LAND.astype(np.float32), [(Yg - Y0) / CELL, (Xg - X0) / CELL], order=1, mode='nearest') > 0.5
    zf = ndimage.map_coordinates(Z, [(Yg - Y0) / CELL, (Xg - X0) / CELL], order=1, mode='nearest')
    R, Gc, B = img[..., 0], img[..., 1], img[..., 2]
    L = 0.3 * R + 0.59 * Gc + 0.11 * B
    water = (B > R + 0.03) & (B > Gc - 0.01) & (L < 0.45) & ok
    near_sea = ndimage.binary_dilation(~landf, iterations=int(40 / PX))
    sea = ~landf | (ndimage.binary_opening(water, iterations=2) & near_sea & (zf < 6))
    lab, nl = ndimage.label(sea); big = np.bincount(lab.ravel())
    keep = np.isin(lab, np.nonzero(big > 3000)[0][1:]) if nl else np.zeros_like(sea)
    landm = ~keep | (zf > 0.25)                  # wherever the terrain stands above the sea it is rock, whatever the photo says
    dsea = ndimage.distance_transform_edt(landm) * PX
    # imagery: rock vs vegetation
    green = Gc - (R + B) / 2
    veg = np.clip((green - 0.012) / 0.05, 0, 1)
    lum = np.clip((L - 0.08) / 0.5, 0, 1)
    lq = ndimage.gaussian_filter(lum, 1.0) * 0.85 + 0.12
    lava = np.stack([0.19 + 0.34 * lq, 0.19 + 0.335 * lq, 0.195 + 0.34 * lq], -1)
    dry = np.where(lum[..., None] > 0.35, np.array([0.58, 0.54, 0.43]), np.array([0.45, 0.43, 0.35]))
    # low shores: bare rock right to the sea. Cliff tops (Porticello, Cinque Denti, Spadillo...): green macchia patches
    # right up to the edge, the rock only in the face and the boulders below (Gianluca, photos 2026-11-05)
    high = np.clip((ndimage.gaussian_filter(zf, 2.0) - 6) / 6, 0, 1)
    vegw = veg * (np.clip((dsea - 18) / 40, 0, 1) * (1 - high) + np.clip((dsea - 3) / 8, 0, 1) * high)
    macchia = np.stack([0.26 + 0.18 * lum, 0.36 + 0.2 * lum, 0.18 + 0.1 * lum], -1)
    vcol = dry * (1 - high[..., None]) + macchia * high[..., None]
    out = lava * (1 - vegw[..., None] * 0.85) + vcol * (vegw[..., None] * 0.85)
    noise = ndimage.gaussian_filter(np.random.default_rng(k).random(Xg.shape), 1.0)
    out *= (0.94 + 0.12 * noise)[..., None]
    wet = ~landm & ndimage.binary_dilation(landm, iterations=int(10 / PX)) & ok
    out[wet] = np.array([0.12, 0.12, 0.125])
    alpha = np.where(landm, np.clip(1 - (dsea - 45) / 85, 0, 1), 0.0)
    alpha = np.maximum(alpha, wet * 1.0)
    alpha *= ok
    # not in the town (its quays and promenade are drawn): fade out over ~60 m at its edge
    inT = rasterize([(town, 1)], out_shape=Xg.shape, transform=Affine(PX, 0, xs[0] - PX / 2, 0, -PX, ys[-1] + PX / 2), fill=0, dtype='uint8').astype(bool)
    if inT.any(): alpha *= np.clip(ndimage.distance_transform_edt(~inT) * PX / 60, 0, 1)
    alpha = ndimage.gaussian_filter(alpha, 2.0)
    sl = (slice(nm, nm + S), slice(nm, nm + S))
    rgba = np.concatenate([np.clip(out[sl], 0, 1), alpha[sl][..., None]], -1)
    sx, sy = k % COLS, k // COLS
    atlas[sy * S:(sy + 1) * S, sx * S:(sx + 1) * S] = (rgba * 255).astype(np.uint8)
    index.append([int(ti), int(tj), int(sx), int(sy)])
    if k % 20 == 0: print('tile', k, '/', len(tiles))

Image.fromarray(atlas, 'RGBA').save('web/assets/coast_atlas.webp', quality=86, method=6)
nti = int(math.ceil((NX * CELL) / T)) + 1; ntj = int(math.ceil((NY * CELL) / T)) + 1
json.dump({'x0': X0, 'y0': Y0, 'tile': T, 'slot': S, 'gutter': GUT, 'cols': COLS, 'size': COLS * S, 'nti': nti, 'ntj': ntj, 'tiles': index},
          open('prep/coast_atlas.json', 'w'))
print('coast atlas tiles', len(index))

# vegetation classes and trees by the sea
C = np.load('prep/classes.npy')
near = LAND & (dsea10 <= 30); mid = LAND & (dsea10 > 30) & (dsea10 <= 75)
tm = np.zeros(C.shape, bool)
tz = rasterize([(town, 1)], out_shape=C.shape, transform=Affine(CELL, 0, X0 - CELL / 2, 0, CELL, Y0 - CELL / 2), fill=0, dtype='uint8').astype(bool)
sel = near & ~tz & (C != 0) & (C != 1) & (C != 8) & (Z <= 8)          # cliff tops keep their macchia
C[sel] = 7
sel2 = mid & ~tz & np.isin(C, [5, 6]) & (Z <= 8)
C[sel2] = 9
np.save('prep/classes.npy', C)
tr = F.get('trees', [])
def dsea_at(x, y):
    return ndimage.map_coordinates(dsea10, [[(y - Y0) / CELL], [(x - X0) / CELL]], order=1)[0]
if tr and isinstance(tr[0], (list, tuple)):
    xy = np.array([t[:2] for t in tr], float)
    d = ndimage.map_coordinates(dsea10, [(xy[:, 1] - Y0) / CELL, (xy[:, 0] - X0) / CELL], order=1)
    F['trees'] = [t for t, dd in zip(tr, d) if dd > 40]
    json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
    print('trees by the sea dropped', len(tr) - len(F['trees']))
print('coast classes: rock', int(sel.sum()), 'thinned', int(sel2.sum()))
# boulders below the cliffs: sea cells next to land standing > 8 m within 20 m (10 m grid), a few per cell
rng = np.random.default_rng(17)
cliffy = ndimage.maximum_filter(np.where(LAND, Z, -99), size=5) > 8
foot = (~LAND) & ndimage.binary_dilation(LAND, iterations=1) & cliffy
rocks = []
for i, j in zip(*np.nonzero(foot)):
    for _ in range(int(rng.integers(2, 6))):
        x = X0 + (j + rng.random() - 0.5) * CELL; y = Y0 + (i + rng.random() - 0.5) * CELL
        rocks.append([round(float(x), 1), round(float(y), 1), round(float(0.8 + rng.random() ** 2 * 2.6), 2)])
json.dump(rocks, open('web/assets/coast_rocks.json', 'w'), separators=(',', ':'))
print('coast boulders', len(rocks))

# bake the same coast into the island colour texture (seen from afar, and wherever the atlas has faded out)
tim = np.asarray(Image.open('prep/terrain.png').convert('RGB')).astype(np.float32)
TH, TW = tim.shape[:2]
X1 = X0 + (NX - 1) * CELL; Y1 = Y0 + (NY - 1) * CELL
A = atlas.astype(np.float32)
for ti, tj, sx, sy in index:
    xa, ya = X0 + ti * T, Y0 + tj * T
    c0 = int((xa - X0) / (X1 - X0) * (TW - 1)); c1 = int(math.ceil((xa + T - X0) / (X1 - X0) * (TW - 1)))
    r0 = int((Y1 - (ya + T)) / (Y1 - Y0) * (TH - 1)); r1 = int(math.ceil((Y1 - ya) / (Y1 - Y0) * (TH - 1)))
    c0, r0 = max(c0, 0), max(r0, 0); c1, r1 = min(c1, TW - 1), min(r1, TH - 1)
    if c1 <= c0 or r1 <= r0: continue
    cc, rr = np.meshgrid(np.arange(c0, c1 + 1), np.arange(r0, r1 + 1))
    wx = X0 + cc / (TW - 1) * (X1 - X0); wy = Y1 - rr / (TH - 1) * (Y1 - Y0)
    fx = np.clip((wx - xa) / T, 0, 0.9999); fy = np.clip((wy - ya) / T, 0, 0.9999)
    u = sx * S + GUT + fx * (S - 2 * GUT) - 0.5; v = sy * S + GUT + (1 - fy) * (S - 2 * GUT) - 0.5
    smp = np.stack([ndimage.map_coordinates(A[..., ch], [v, u], order=1) for ch in range(4)], -1) / 255.0
    a_ = smp[..., 3:4]
    tim[r0:r1 + 1, c0:c1 + 1] = tim[r0:r1 + 1, c0:c1 + 1] * (1 - a_) + smp[..., :3] * 255 * a_
Image.fromarray(np.clip(tim, 0, 255).astype(np.uint8)).save('prep/terrain.png')
print('coast baked into terrain.png')
