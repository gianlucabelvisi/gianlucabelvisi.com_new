"""Level pads under houses on steep plots: python3 house_pads.py   (after coast_overlay.py, before ground_fix.py)
Rule (Gianluca, 2026-11-13): houses are one or two floors, never towers, never floating, and not buried in the hillside.
The viewer seats each house on the low side of its plot; where the ground climbs more than a storey across the footprint
the house would be buried uphill. Here the terrain is changed 'a tiny bit': the 10 m grid nodes around such a house
are pulled towards the plot's mean level (never by more than 4 m), full under the footprint and fading out over 14 m.
Roads are never touched: nodes within (half width + 16 m) of any drivable road keep their height (the bicubic surface of
a node reaches two cells), and so do nodes in the sea or inside the 0.5 m site patches. Prints what it could not fix.
Works from the grid as it is after the sites; run once per build (ground_fix.py follows)."""
import json, math, os, glob
import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree
F = json.load(open('prep/features.json'))
G = dict(np.load('prep/grid.npz')); Z = G['z'].astype(np.float64); X0, Y0, C = float(G['x0']), float(G['y0']), float(G['cell']); NY, NX = Z.shape
# protected nodes: near roads, sea, site patches
RP, RW = [], []
for r in F['roads']:
    if r['cls'] in ('footway', 'path', 'steps') or len(r['pts']) < 2: continue
    P = np.array(r['pts'])[:, :2]; seg = np.hypot(*np.diff(P, axis=0).T); cum = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(0, cum[-1] + 3, 3.0); RP.append(np.column_stack([np.interp(t, cum, P[:, 0]), np.interp(t, cum, P[:, 1])])); RW.append(np.full(len(t), r['w'] / 2))
RP = np.concatenate(RP); RW = np.concatenate(RW); RT = cKDTree(RP)
jj, ii = np.meshgrid(np.arange(NX), np.arange(NY)); XS, YS = X0 + jj * C, Y0 + ii * C
d, k = RT.query(np.column_stack([XS.ravel(), YS.ravel()]), distance_upper_bound=40)
prot = (d < RW[np.minimum(k, len(RW) - 1)] + 16).reshape(Z.shape) | (Z < 0.5)
SITES = [(-640.0, 3070.0, 60.0, 3990.0)]                       # sites/lago.py
if os.path.exists('web/assets/site_bue.json'): J = json.load(open('web/assets/site_bue.json')); SITES.append((J['x0'], J['y0'], J['x1'], J['y1']))
for bb in SITES: prot |= (XS > bb[0] - 20) & (XS < bb[2] + 20) & (YS > bb[1] - 20) & (YS < bb[3] + 20)
ZC = ndimage.spline_filter(Z, order=3, mode='nearest')     # filter once (per-call prefiltering took minutes)
def gz(x, y): return ndimage.map_coordinates(ZC, [(np.asarray(y) - Y0) / C, (np.asarray(x) - X0) / C], order=3, mode='nearest', prefilter=False)
accw = np.zeros(Z.shape); accz = np.zeros(Z.shape); n_steep = n_pad = 0; left = []
for b in F['buildings']:
    P = np.array(b['pts'], float)
    if len(P) < 3 or b.get('kind') in ('greenhouse', 'ruins'): continue
    Q = np.concatenate([P, (P + np.roll(P, -1, 0)) / 2]); z = gz(Q[:, 0], Q[:, 1]); lo, hi = float(z.min()), float(z.max())
    if hi - lo < 2.6: continue
    n_steep += 1
    cx, cy = P.mean(0); rad = float(np.hypot(P[:, 0] - cx, P[:, 1] - cy).max()); R = rad + 14
    j0, j1 = max(0, int((cx - R - X0) / C)), min(NX - 1, int((cx + R - X0) / C) + 1); i0, i1 = max(0, int((cy - R - Y0) / C)), min(NY - 1, int((cy + R - Y0) / C) + 1)
    dd = np.hypot(XS[i0:i1 + 1, j0:j1 + 1] - cx, YS[i0:i1 + 1, j0:j1 + 1] - cy)
    w = np.clip(1 - (dd - rad) / 14.0, 0, 1); w = w * w * (3 - 2 * w); w[prot[i0:i1 + 1, j0:j1 + 1]] = 0
    if w.max() < 0.5: left.append([b['id'], round(hi - lo, 1), round(cx), round(cy)]); continue
    accw[i0:i1 + 1, j0:j1 + 1] += w; accz[i0:i1 + 1, j0:j1 + 1] += w * float(z.mean()); n_pad += 1      # the plot's mean level: as much cut as fill
m = accw > 0; tgt = np.where(m, accz / np.maximum(accw, 1e-9), Z); wf = np.clip(accw, 0, 1)
Z2 = Z + np.clip((tgt - Z) * wf, -4.0, 4.0)                 # 'a tiny bit': no node moves more than 4 m
assert np.abs((Z2 - Z)[prot]).max() == 0
G['z'] = Z2.astype(G['z'].dtype); np.savez('prep/grid.npz', **G)
json.dump(left, open('prep/house_pads_left.json', 'w'))
print('house pads: houses on plots steeper than a storey', n_steep, '· padded', n_pad, '· too close to a road or a site to pad', len(left), '· grid nodes moved', int((np.abs(Z2 - Z) > 0.05).sum()), '· largest move %.1f m' % np.abs(Z2 - Z).max())

# how much it helped: spans under the footprints before and after
ZA = ndimage.spline_filter(Z2, order=3, mode='nearest'); before = after = 0
for b in F['buildings']:
    P = np.array(b['pts'], float)
    if len(P) < 3: continue
    Q = np.concatenate([P, (P + np.roll(P, -1, 0)) / 2]); c = [(Q[:, 1] - Y0) / C, (Q[:, 0] - X0) / C]
    z0 = ndimage.map_coordinates(ZC, c, order=3, mode='nearest', prefilter=False); z1 = ndimage.map_coordinates(ZA, c, order=3, mode='nearest', prefilter=False)
    before += (z0.max() - z0.min()) > 3.6; after += (z1.max() - z1.min()) > 3.6
print('houses whose plot rises more than 3.6 m (buried to the roof uphill):', int(before), '->', int(after))
