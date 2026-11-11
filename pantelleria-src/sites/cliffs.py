"""Sharper, higher cliffs where the 10 m DEM smooths them into ramps: python3 sites/cliffs.py  (after town.py, before
coast_atlas.py). East of Il Porticello to Cala della Pozzolana the north coast is a cliff (Gianluca 2026-11-04): within
45 m of the sea the ground is lifted to the plateau behind it (+15 %), so it drops to the water in one 10 m cell.
"""
import numpy as np
from scipy import ndimage
G = dict(np.load('prep/grid.npz')); Z = G['z'].astype(np.float64); LAND = G['land'].astype(bool)
X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell']); NY, NX = Z.shape
Xg = X0 + np.arange(NX)[None, :] * CELL; Yg = Y0 + np.arange(NY)[:, None] * CELL
BOX = (Xg > -960) & (Xg < -560) & (Yg > 4380) & (Yg < 4720)
d = ndimage.distance_transform_edt(LAND) * CELL
ring = LAND & (d >= 35) & (d <= 55)
num = ndimage.gaussian_filter(np.where(ring, Z, 0), 4); den = ndimage.gaussian_filter(ring.astype(float), 4)
plateau = num / np.maximum(den, 1e-6)
w = np.clip((45 - d) / 15, 0, 1) * BOX * LAND * (den > 0.02)
target = plateau * 1.15
Znew = np.where(w > 0, np.maximum(Z, Z + (target - Z) * np.clip(w * 1.6, 0, 1)), Z)
print('cliffs: cells raised', int((Znew > Z + 0.5).sum()), 'max lift', round(float((Znew - Z).max()), 1))
G['z'] = Znew.astype(G['z'].dtype); np.savez('prep/grid.npz', **G)
