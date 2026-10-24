"""Smooth the main roads (Perimetrale = secondary, plus tertiary): python3 roads_smooth.py   (after prep.py, before town.py)
The 10 m DEM makes them bumpy; real main roads are graded. Along each merged road line the elevation is smoothed
(Gaussian, sigma ~35 m, then a grade limit), the road points get the smoothed z, and the terrain is graded to the
road in a corridor (flat under the carriageway, blending out over ~18 m). Idempotent: works from prep/grid_prep.npz.
"""
import json, math, os, shutil
import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree
from shapely.geometry import LineString, Point
from shapely.ops import linemerge

F = json.load(open('prep/features.json'))
if not F.get('roads_smoothed') or not os.path.exists('prep/grid_prep.npz'):
    shutil.copy('prep/grid.npz', 'prep/grid_prep.npz')
G = dict(np.load('prep/grid_prep.npz')); Z = G['z'].astype(np.float64)
X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell']); NY, NX = Z.shape

def zbil(x, y):
    return ndimage.map_coordinates(Z, [(np.asarray(y) - Y0) / CELL, (np.asarray(x) - X0) / CELL], order=1, mode='nearest')

MAIN = ('secondary', 'tertiary', 'primary', 'trunk')
roads = [r for r in F['roads'] if r['cls'] in MAIN and len(r['pts']) > 1]
merged = linemerge([LineString([p[:2] for p in r['pts']]) for r in roads])
lines = list(merged.geoms) if merged.geom_type == 'MultiLineString' else [merged]
S, ZS, W = [], [], []
for L in lines:
    n = max(2, int(L.length / 2) + 1)
    pts = np.array([L.interpolate(L.length * k / (n - 1)).coords[0] for k in range(n)])
    z = zbil(pts[:, 0], pts[:, 1])
    zs = ndimage.gaussian_filter1d(z, 17.0, mode='nearest')          # sigma 17 samples = 34 m
    # grade limit 9%: clamp forward and backward
    for _ in range(2):
        for i in range(1, n): zs[i] = np.clip(zs[i], zs[i - 1] - 0.18, zs[i - 1] + 0.18)
        for i in range(n - 2, -1, -1): zs[i] = np.clip(zs[i], zs[i + 1] - 0.18, zs[i + 1] + 0.18)
    zs = ndimage.gaussian_filter1d(zs, 4.0, mode='nearest')
    S.append(pts); ZS.append(zs)
P = np.concatenate(S); PZ = np.concatenate(ZS)
tree = cKDTree(P)
# road points get the profile
for r in roads:
    for p in r['pts']:
        d, i = tree.query(p[:2]); p[2] = round(float(PZ[i]), 2)
# terrain corridor
HW, BL = 6.0, 18.0
jj, ii = np.meshgrid(np.arange(NX), np.arange(NY))
xs, ys = X0 + jj * CELL, Y0 + ii * CELL
cand = np.zeros(Z.shape, bool)
for pts in S:
    j = np.clip(((pts[:, 0] - X0) / CELL).round().astype(int), 0, NX - 1); i = np.clip(((pts[:, 1] - Y0) / CELL).round().astype(int), 0, NY - 1)
    cand[i, j] = True
cand = ndimage.binary_dilation(cand, iterations=3)
ci, cj = np.nonzero(cand)
d, k = tree.query(np.stack([xs[ci, cj], ys[ci, cj]], -1), distance_upper_bound=HW + BL)
ok = np.isfinite(d)
ci, cj, d, k = ci[ok], cj[ok], d[ok], k[ok]
w = np.clip(1 - (d - HW) / BL, 0, 1); w = w * w * (3 - 2 * w)
land = G['land'][ci, cj] if 'land' in G else np.ones(len(ci), bool)
w = np.where(land, w, 0)
Z[ci, cj] = Z[ci, cj] * (1 - w) + (PZ[k] - 0.12) * w
G['z'] = Z.astype(G['z'].dtype) if 'z' in G else Z
np.savez('prep/grid.npz', **G)
F['roads_smoothed'] = True
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
print('main road lines', len(lines), 'samples', len(P), 'cells graded', int((w > 0).sum()))
