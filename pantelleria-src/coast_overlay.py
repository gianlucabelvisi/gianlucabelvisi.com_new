"""Coastal rock overlay, town -> Campobello: python3 coast_overlay.py   (after prep.py/roads_smooth.py/town.py)
The coast between the Perimetrale and the sea is lava rock (scogli) with a little dry, low growth, not green macchia.
From Esri World Imagery (z18, data/esri) we build a 1 m/px overlay for the strip seaward of the road: rock pixels are
recoloured on a dark lava ramp (posterised for the cel look, keeping the real outlines of the rock shelves and inlets),
green pixels become summer-dry straw/olive. Alpha = land, nearer to the sea than to the Perimetrale, feathered.
Writes web/assets/coast_detail.webp + prep/coast_detail.json (bounds), and sets those 10 m cells to class 7 (bare rock).
"""
import json, math, os
import numpy as np
from PIL import Image
from pyproj import Transformer
from scipy import ndimage
from scipy.spatial import cKDTree
from shapely.geometry import LineString
from shapely.ops import linemerge

BX0, BX1, BY0, BY1, RES = -4000.0, -1150.0, 4950.0, 6050.0, 1.0
W, H = int((BX1 - BX0) / RES), int((BY1 - BY0) / RES)
xs = BX0 + (np.arange(W) + 0.5) * RES; ys = BY1 - (np.arange(H) + 0.5) * RES      # row 0 = north
X, Y = np.meshgrid(xs, ys)
T = Transformer.from_crs('+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +ellps=WGS84', 'EPSG:4326', always_xy=True)
lon, lat = T.transform(X, Y)
n = 2 ** 18; tx = (lon + 180) / 360 * n; la = np.radians(lat); ty = (1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * n
tx0, ty0, tx1, ty1 = int(tx.min()), int(ty.min()), int(tx.max()), int(ty.max())
M = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256, 3), np.uint8); have = np.zeros(M.shape[:2], bool)
for a in range(tx0, tx1 + 1):
    for b in range(ty0, ty1 + 1):
        f = f'data/esri/18_{a}_{b}.jpg'
        if os.path.exists(f):
            M[(b - ty0) * 256:(b - ty0 + 1) * 256, (a - tx0) * 256:(a - tx0 + 1) * 256] = np.asarray(Image.open(f).convert('RGB')); have[(b - ty0) * 256:(b - ty0 + 1) * 256, (a - tx0) * 256:(a - tx0 + 1) * 256] = True
px, py = (tx - tx0) * 256, (ty - ty0) * 256
img = np.stack([ndimage.map_coordinates(M[..., c].astype(np.float32), [py, px], order=1) for c in range(3)], -1) / 255.0
ok = ndimage.map_coordinates(have.astype(np.float32), [py, px], order=0) > 0.5
img = ndimage.uniform_filter(img, (2, 2, 1))

# land / sea and distances
G = np.load('prep/grid.npz'); land10 = G['land'].astype(bool); X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell'])
landf = ndimage.map_coordinates(land10.astype(np.float32), [(Y - Y0) / CELL, (X - X0) / CELL], order=1) > 0.5
# refine with the imagery: water is dark and bluish
R, Gc, B = img[..., 0], img[..., 1], img[..., 2]
L = 0.3 * R + 0.59 * Gc + 0.11 * B
water = (B > R + 0.03) & (B > Gc - 0.01) & (L < 0.45)
near_sea = ndimage.binary_dilation(~landf, iterations=40)       # imagery water only where the sea really is
sea = ~landf | (ndimage.binary_opening(water, iterations=2) & near_sea)
lab, nl = ndimage.label(sea); big = np.bincount(lab.ravel()); keep = np.isin(lab, np.nonzero(big > 20000)[0][1:] if len(big) > 1 else [])
landm = ~keep
dsea, (si, sj) = ndimage.distance_transform_edt(landm, return_indices=True); dsea = dsea * RES
F = json.load(open('prep/features.json'))
roads = [r for r in F['roads'] if r['cls'] in ('secondary', 'tertiary')]
mg = linemerge([LineString([p[:2] for p in r['pts']]) for r in roads])
lines = list(mg.geoms) if mg.geom_type == 'MultiLineString' else [mg]
pts = np.concatenate([np.array([L_.interpolate(d).coords[0] for d in np.arange(0, L_.length, 1.0)]) for L_ in lines])
pts = pts[(pts[:, 0] > BX0 - 50) & (pts[:, 0] < BX1 + 50) & (pts[:, 1] > BY0 - 50) & (pts[:, 1] < BY1 + 50)]
# for every road sample: the direction to the nearest sea pixel (which side of the road the coast is on)
rj = np.clip(((pts[:, 0] - BX0) / RES).astype(int), 0, W - 1); ri = np.clip(((BY1 - pts[:, 1]) / RES).astype(int), 0, H - 1)
sx = BX0 + (sj[ri, rj] + 0.5) * RES; sy = BY1 - (si[ri, rj] + 0.5) * RES
sd = np.stack([sx - pts[:, 0], sy - pts[:, 1]], -1); sd /= np.maximum(np.linalg.norm(sd, axis=1, keepdims=True), 1e-6)
droad, k = cKDTree(pts).query(np.stack([X.ravel(), Y.ravel()], -1)); droad = droad.reshape(X.shape); k = k.reshape(X.shape)
side = (X - pts[k, 0]) * sd[k, 0] + (Y - pts[k, 1]) * sd[k, 1]
sea_side = (side > 5.5) & (dsea < 260) & landm & ok
# the waterline: wherever the terrain mesh pokes out between the imagery coast and the 10 m land mask (surf, wet rock),
# paint dark wet lava instead of the white surf the satellite saw
wet = ~landm & ndimage.binary_dilation(sea_side, iterations=12) & ok
sea_side = sea_side | wet
# soft edges: a wide feather towards the road and the inland side, so the rock fades into the fields instead of a cut
core = ndimage.binary_erosion(sea_side, iterations=3)
din = ndimage.distance_transform_edt(~core) * RES                 # metres outside the rock area
alpha = np.where(core, 1.0, np.clip(1 - din / 22.0, 0, 1)) * sea_side.astype(np.float32)
alpha = np.maximum(alpha, np.clip(1 - din / 22.0, 0, 1) * (dsea < 230) * landm * 0.0)
alpha *= np.clip((side + 1.0) / 7.0, 0, 1) * landm   # never bleed across the road onto the inland side
alpha = ndimage.gaussian_filter(alpha, 6.0)
# inside: a little less than full strength away from the shore, so the base colours still show through
alpha *= np.clip(0.72 + 0.28 * (1 - dsea / 120.0), 0.72, 1.0)
alpha[(BX0 + 0 * X) < -1e9] = 0
alpha *= np.clip((X + 3880) / 220.0, 0, 1)    # fade in east of the town (quays / harbour are town.py's)

# recolour: rock -> lava ramp; vegetation -> dry straw / olive; posterise
mx, mn = img.max(-1), img.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-3)
green = Gc - (R + B) / 2
veg = np.clip((green - 0.015) / 0.05, 0, 1)
lum = np.clip((L - 0.08) / 0.5, 0, 1)
lq = np.floor(lum * 5) / 5 + 0.1
lq = ndimage.gaussian_filter(lum, 1.5) * 0.85 + 0.12                                        # gradual ramp, not hard bands
lava = np.stack([0.20 + 0.33 * lq, 0.20 + 0.33 * lq, 0.205 + 0.34 * lq], -1)   # grey lava (reefs read grey, not brown)       # dark grey-brown, lighter on the shelves
dry = np.where(lum[..., None] > 0.35, np.array([0.60, 0.56, 0.45]), np.array([0.47, 0.45, 0.37]))
out = lava * (1 - veg[..., None] * 0.85) + dry * (veg[..., None] * 0.85)
noise = ndimage.gaussian_filter(np.random.default_rng(5).random(X.shape), 1.2)
out *= (0.94 + 0.12 * noise)[..., None]
# Bue Marino: the gravel car park by Cicci's Bistrot (OSM parking node, 20 places) - a flat, pale gravel area
from pyproj import Transformer as _T
_f = _T.from_crs('EPSG:4326', '+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +ellps=WGS84', always_xy=True)
for lo, la_, rx, ry in [(11.9537039, 36.8387379, 22, 13)]:
    px_, py_ = _f.transform(lo, la_)
    m = (((X - px_) / rx) ** 2 + ((Y - py_) / ry) ** 2) < 1
    out[m] = np.array([0.66, 0.62, 0.55]) * (0.95 + 0.1 * noise[m])[:, None]
    alpha[m] = 1
out[wet] = np.array([0.13, 0.13, 0.135]) * (0.9 + 0.2 * noise[wet])[:, None]
rgba = np.concatenate([np.clip(out, 0, 1), alpha[..., None]], -1)
Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA').save('web/assets/coast_detail.webp', quality=88, method=6)
json.dump({'x0': BX0, 'x1': BX1, 'y0': BY0, 'y1': BY1}, open('prep/coast_detail.json', 'w'))
# classes: rock where the overlay is strong
C = np.load('prep/classes.npy')
ii = np.clip(((Y - Y0) / CELL).round().astype(int), 0, C.shape[0] - 1); jj = np.clip(((X - X0) / CELL).round().astype(int), 0, C.shape[1] - 1)
sel = (alpha > 0.6) & (C[ii, jj] != 0) & (C[ii, jj] != 1)
C[ii[sel], jj[sel]] = 7
np.save('prep/classes.npy', C)
print('overlay', W, 'x', H, 'coverage', round(float(alpha.mean()), 3), 'rock cells', int(len(set(zip(ii[sel].tolist(), jj[sel].tolist())))))
