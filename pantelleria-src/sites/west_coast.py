"""West coast, town -> Scauri: python3 sites/west_coast.py   (after coast_atlas.py)
Gianluca (2026-11-13): 'the vegetation is a bit different: more bare terrain, rocks more dark brown, less vegetation
by the reef, drier vegetation; hills of tufo with a dark-red tint'. Street View 2011-12 agrees: a low, almost bare
black-brown lava reef seaward of the Perimetrale, straw-dry garrigue inland, and the red tuff of the Kuddie Rosse.
 - reef (seaward of the Perimetrale, within 230 m of the sea): dark-brown lava in terrain.png and in the coast atlas,
   class 7 (bare rock), nine trees in ten removed
 - dry belt (within 450 m of the road): greens pulled towards straw/olive, woods and macchia thinned
 - tufo: dark red patches (TUFO list)
Never touches the height grid or the roads.
"""
import json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import cKDTree
Image.MAX_IMAGE_PIXELS = None

YN, YS = 4750.0, -1450.0                       # from the edge of the town to just before Scauri
TUFO = [(-5487, 3622, 190, 1.0),               # Kuddie Rosse, the red hill behind the Mursia hotel
        (-5610, 3680, 110, 1.0),               # its road cutting on the Perimetrale
        (-5400, 3560, 200, 0.9), (-5300, 3540, 170, 0.8),   # aerial: the red ground runs east over the motocross track
        (-5285, 3035, 120, 0.55),              # the Sesiventi knoll (red-brown outcrop over the road)
        (-5200, 2550, 100, 0.35),              # Sese Grande plateau
        (-3900, 420, 160, 0.5), (-3500, 20, 150, 0.45)]   # red-brown banks above the coast road towards Sataria

G = np.load('prep/grid.npz'); Z = G['z']; LAND = G['land'].astype(bool); X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell'])
NY, NX = Z.shape; X1 = X0 + (NX - 1) * CELL; Y1 = Y0 + (NY - 1) * CELL
gx = X0 + np.arange(NX) * CELL; gy = Y0 + np.arange(NY) * CELL; GX, GY = np.meshgrid(gx, gy)
F = json.load(open('prep/features.json'))
dsea = ndimage.distance_transform_edt(LAND) * CELL
P = []
for r in F['roads']:
    if 'Perimetrale' in (r.get('name') or '') and r['cls'] in ('secondary', 'tertiary'):
        p = np.array([q[:2] for q in r['pts']], float)
        for a, b in zip(p[:-1], p[1:]):
            n = max(1, int(np.hypot(*(b - a)) / 5)); P += [a + (b - a) * t for t in np.linspace(0, 1, n, endpoint=False)]
P = np.array(P); P = P[(P[:, 0] < -2300) & (P[:, 1] < YN + 300) & (P[:, 1] > YS - 300)]
droad, k = cKDTree(P).query(np.stack([GX.ravel(), GY.ravel()], -1)); droad = droad.reshape(GX.shape); k = k.reshape(GX.shape)
dsea_road = ndimage.map_coordinates(dsea, [(P[:, 1] - Y0) / CELL, (P[:, 0] - X0) / CELL], order=1)[k]
wy = np.clip((YN - GY) / 250.0, 0, 1) * np.clip((GY - YS) / 250.0, 0, 1)
reef = (LAND & (dsea <= 230) & (droad <= 650) & (dsea < dsea_road - 6)).astype(np.float32) * wy
dry = (LAND & (droad <= 450)).astype(np.float32) * wy * np.clip((450 - droad) / 150.0, 0, 1)
reef_s = ndimage.gaussian_filter(reef, 1.2); dry_s = ndimage.gaussian_filter(dry, 2.0)
tuf = np.zeros_like(reef)
for x, y, r, s in TUFO:
    tuf = np.maximum(tuf, s * np.exp(-(((GX - x) ** 2 + (GY - y) ** 2) / (r * r)) ** 1.5))
tuf *= LAND
LAVA = [(-5470, 2060, 430, 1.0), (-5560, 2900, 230, 0.7)]      # Punta Fram: a rough black aa flow on both sides of the road; Sese Rosso shelf
lavf = np.zeros_like(reef)
for x, y, r, s in LAVA:
    lavf = np.maximum(lavf, s * np.clip(1.25 - np.hypot(GX - x, GY - y) / r, 0, 1) ** 0.5 * (np.hypot(GX - x, GY - y) < 1.25 * r))
bm = np.zeros_like(reef)                                        # keep gardens round the houses
for b in F['buildings']:
    c = np.mean(np.array(b['pts'], float), 0); i, j = int(round((c[1] - Y0) / CELL)), int(round((c[0] - X0) / CELL))
    if 0 <= i < NY and 0 <= j < NX: bm[i, j] = 1
lavf *= LAND * (1 - np.clip(ndimage.gaussian_filter(bm, 3.0) * 60, 0, 1))
reef = np.maximum(reef, lavf * 0.9); reef_s = ndimage.gaussian_filter(reef, 1.2)

def grid_at(A, wx, wy_):
    return ndimage.map_coordinates(A, [(wy_ - Y0) / CELL, (wx - X0) / CELL], order=1, mode='nearest')

def recolour(rgb, wx, wy_, roadmask=None):
    """rgb float 0..1 (h, w, 3) at world coords wx, wy_ -> west-coast colours"""
    R, Gc, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = np.clip(0.3 * R + 0.59 * Gc + 0.11 * B, 0, 1)
    green = np.clip((Gc - (R + B) / 2 - 0.01) / 0.05, 0, 1)
    a_reef = grid_at(reef_s, wx, wy_); a_dry = grid_at(dry_s, wx, wy_) * (1 - a_reef); a_tuf = grid_at(tuf, wx, wy_)
    ln = np.clip((lum - 0.1) / 0.55, 0, 1)[..., None]
    lava = np.array([0.17, 0.13, 0.105]) + np.array([0.27, 0.205, 0.16]) * ln            # dark brown, lighter on the shelves
    straw = np.array([0.50, 0.45, 0.31]) + np.array([0.20, 0.18, 0.12]) * ln
    reefc = lava * (1 - 0.45 * green[..., None]) + straw * 0.45 * green[..., None]           # the little growth there is dry
    dryc = (np.array([0.44, 0.40, 0.26]) + np.array([0.34, 0.30, 0.20]) * ln)
    out = rgb * (1 - a_reef[..., None]) + reefc * a_reef[..., None]
    wd = (a_dry * (0.25 + 0.4 * green))[..., None]
    out = out * (1 - wd) + dryc * wd
    tufc = np.array([0.30, 0.125, 0.10]) + np.array([0.25, 0.115, 0.085]) * ln      # dark red, not brick
    wt = (a_tuf * (1 - 0.5 * green) * (1 - 0.75 * a_reef))[..., None]
    out = out * (1 - wt) + tufc * wt
    if roadmask is not None: out = np.where(roadmask[..., None], rgb, out)
    return out

# ---- island texture ----
tim = np.asarray(Image.open('prep/terrain.png').convert('RGB')).astype(np.float32) / 255
TH, TW = tim.shape[:2]
bx0, bx1 = -6300.0, -2200.0
c0 = int((bx0 - X0) / (X1 - X0) * (TW - 1)); c1 = int((bx1 - X0) / (X1 - X0) * (TW - 1))
r0 = int((Y1 - (YN + 50)) / (Y1 - Y0) * (TH - 1)); r1 = int((Y1 - (YS - 50)) / (Y1 - Y0) * (TH - 1))
cc, rr = np.meshgrid(np.arange(c0, c1 + 1), np.arange(r0, r1 + 1))
wx = X0 + cc / (TW - 1) * (X1 - X0); wy_ = Y1 - rr / (TH - 1) * (Y1 - Y0)
rm = Image.new('L', (c1 - c0 + 1, r1 - r0 + 1), 0); dr = ImageDraw.Draw(rm); sc = (TW - 1) / (X1 - X0); scy = (TH - 1) / (Y1 - Y0)
for r in F['roads']:
    dr.line([((p[0] - X0) * sc - c0, (Y1 - p[1]) * scy - r0) for p in r['pts']], fill=255, width=max(1, int(round((r['w'] + 1.0) * sc))))
tim[r0:r1 + 1, c0:c1 + 1] = recolour(tim[r0:r1 + 1, c0:c1 + 1], wx, wy_, np.asarray(rm) > 0)
Image.fromarray(np.clip(tim * 255, 0, 255).astype(np.uint8)).save('prep/terrain.png')

# ---- coast atlas (what the camera sees near the shore) ----
ix = json.load(open('prep/coast_atlas.json')); T, S, GUT = ix['tile'], ix['slot'], ix['gutter']
at = np.asarray(Image.open('web/assets/coast_atlas.webp').convert('RGBA')).astype(np.float32) / 255; nt = 0
for ti, tj, sx, sy in ix['tiles']:
    xa, ya = ix['x0'] + ti * T, ix['y0'] + tj * T
    if xa > bx1 or xa + T < bx0 or ya > YN or ya + T < YS: continue
    u, v = np.meshgrid(np.arange(S), np.arange(S))
    wxa = xa + np.clip((u + 0.5 - GUT) / (S - 2 * GUT), 0, 1) * T; wya = ya + (1 - np.clip((v + 0.5 - GUT) / (S - 2 * GUT), 0, 1)) * T
    sl = at[sy * S:(sy + 1) * S, sx * S:(sx + 1) * S]
    sl[..., :3] = recolour(sl[..., :3].copy(), wxa, wya); nt += 1
Image.fromarray((np.clip(at, 0, 1) * 255).astype(np.uint8), 'RGBA').save('web/assets/coast_atlas.webp', quality=86, method=6)

# ---- classes and trees ----
C = np.load('prep/classes.npy')
sel = (reef > 0.5) & (C != 0) & (C != 1) & (C != 8) & (C != 10); C[sel] = 11          # 11: bare west-coast lava (viewer: a rare cushion, dry tufts)
sel2 = (dry > 0.4) & ~sel & np.isin(C, [5, 6, 9]); C[sel2] = 12                        # 12: dry garrigue (a third of the macchia)
np.save('prep/classes.npy', C)
tr = F['trees']; xy = np.array([t[:2] for t in tr], float)
ar = grid_at(reef_s, xy[:, 0], xy[:, 1]); ad = grid_at(dry_s, xy[:, 0], xy[:, 1])
h = (np.abs(np.sin(xy[:, 0] * 12.9898 + xy[:, 1] * 78.233) * 43758.5453) % 1.0)
keep = (h > 0.92 * ar) & (h > 0.55 * ad * (1 - ar) + 0.92 * ar)
F['trees'] = [t for t, kp in zip(tr, keep) if kp]
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
print('west coast: reef cells', int(sel.sum()), '· macchia thinned', int(sel2.sum()), '· trees', len(tr), '->', len(F['trees']), '· atlas tiles', nt)
