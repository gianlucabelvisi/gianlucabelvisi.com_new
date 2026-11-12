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
KEEP = (-4700.0, 3500.0, 100.0, 6300.0); CUT = []
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
    # 2026-11-12: where that 9 % profile would cut or fill more than 3 m (Tracino's Via Marina: a 35 m trench through
    # the escarpment), the real road is simply steep: stay within 3 m of the ground, allow up to 20 %. Not in the
    # reviewed north-west (town, Campobello, lake: box below), where sites are pinned to the old levels.
    zn = ndimage.gaussian_filter1d(z, 5.0, mode='nearest')
    dbox = np.hypot(np.maximum.reduce([KEEP[0] - pts[:, 0], pts[:, 0] - KEEP[2], np.zeros(n)]), np.maximum.reduce([KEEP[1] - pts[:, 1], pts[:, 1] - KEEP[3], np.zeros(n)]))
    wk = np.clip(dbox / 200.0, 0, 1)
    zc = zs * (1 - wk) + np.clip(zs, zn - 3.0, zn + 3.0) * wk
    for _ in range(2):
        for i in range(1, n): zc[i] = np.clip(zc[i], zc[i - 1] - 0.40, zc[i - 1] + 0.40)
        for i in range(n - 2, -1, -1): zc[i] = np.clip(zc[i], zc[i + 1] - 0.40, zc[i + 1] + 0.40)
    zc = ndimage.gaussian_filter1d(zc, 3.0, mode='nearest')
    zs = zs * (1 - wk) + zc * wk
    CUT.append((float(np.abs(zs - zn).max()), float(np.abs(np.diff(zs)).max() / 2)))
    S.append(pts); ZS.append(zs)
# 2026-11-12: main roads must agree where they meet. Each merged line had its own profile, so at a T junction the
# joining road could sit up to a couple of metres off the road it joins (a slab or a step in the viewer). The end of a
# line takes the level of the line it meets (the longer one, or the one passing through), eased in over 60 m.
_lid = np.concatenate([np.full(len(p_), k_) for k_, p_ in enumerate(S)]); _off = np.concatenate([[0], np.cumsum([len(p_) for p_ in S])])
_tr = cKDTree(np.concatenate(S)); n_pin = 0; worst_pin = 0.0
for _pass in range(2):
    for a_ in np.argsort([-len(p_) for p_ in S]):
        pts, zs = S[a_], ZS[a_]; n = len(pts)
        for end in (0, n - 1):
            dd, ii = _tr.query(pts[end], k=24, distance_upper_bound=4.0)
            for d_, i_ in zip(dd, ii):
                if not np.isfinite(d_) or _lid[i_] == a_: continue
                o_ = _lid[i_]; io = i_ - _off[o_]
                if len(S[o_]) > n or (2 < io < len(S[o_]) - 3):
                    dz = ZS[o_][io] - zs[end]; ramp = min(30, n - 1)          # samples (2 m each)
                    kk = np.abs(np.arange(n) - end); w_ = np.where(kk < ramp, 0.5 * (1 + np.cos(np.pi * kk / max(ramp, 1))), 0)
                    zs += dz * w_; n_pin += 1 if _pass == 0 else 0; worst_pin = max(worst_pin, abs(dz) if _pass == 0 else 0)
                    break
print('main road ends pinned to the road they meet:', n_pin, '· worst mismatch was %.1f m' % worst_pin)
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
# Via Giovanni Falcone (Street View): a ramp on an embankment from the Lungomare up to Via Napoli, stone parapet on the
# harbour side, rubble bank on the other. The 10 m DEM has it at ~4%; the road climbs ~7.5% and meets Via Napoli ~1.6 m
# higher than the DEM, so the road is lifted off the ground there (retaining walls: town.py) and Via Napoli eases back down.
JF, ZJ = (-4223.4, 5062.0), 7.0
Z0 = G0 = np.load('prep/grid_prep.npz')['z'].astype(np.float64)
def znat(x, y): return float(ndimage.map_coordinates(Z0, [[(y - Y0) / CELL], [(x - X0) / CELL]], order=1, mode='nearest')[0])
zj_nat = znat(*JF)
nlift = 0
for r in F['roads']:
    if r['name'] == 'Via Giovanni Falcone':
        P_ = r['pts']; dj = [math.dist(p[:2], JF) for p in P_]
        if min(dj) > 3: continue
        if dj[0] > dj[-1]: P_ = P_[::-1]                       # walk from the junction
        arc = np.concatenate([[0], np.cumsum([math.dist(P_[i][:2], P_[i + 1][:2]) for i in range(len(P_) - 1)])])
        z_end = znat(*P_[-1][:2])
        for p, a in zip(P_, arc): p[2] = round(ZJ + (z_end - ZJ) * a / arc[-1], 2)
        r['lift'] = True; nlift += 1
    elif r['name'] == 'Via Napoli':
        hit = False
        for p in r['pts']:
            d = math.dist(p[:2], JF)
            if d < 40:
                p[2] = round(max(znat(*p[:2]), znat(*p[:2]) + (ZJ - zj_nat) * (1 - d / 40) ** 1.5), 2); hit = True
        if hit: r['lift'] = True; nlift += 1
print('lifted roads', nlift)
# ---- stage 2 (2026-11-11): every other drivable road ----
# Rule: a road cannot be unnaturally steep, and roads meet at one level. Where the 10 m heights make a street climb a
# wall or step at a junction, the heights are wrong there, so they are corrected: each street gets a smooth profile
# (pinned to the roads it meets that were graded before it, at most GRADE steep), and the ground is graded to it in a
# narrow corridor. Order: by class, longer first, so the more important road sets the level at a junction.
ORDER = {'unclassified': 0, 'residential': 1, 'living_street': 1, 'service': 2, 'pedestrian': 2}
GRADE = {0: 0.16, 1: 0.18, 2: 0.22}
minor = [r for r in F['roads'] if r['cls'] in ORDER and len(r['pts']) > 1 and not r.get('bridge') and not r.get('tunnel') and not r.get('lift')]
def _len(r): P_ = np.array(r['pts'])[:, :2]; return float(np.hypot(*np.diff(P_, axis=0).T).sum())
minor.sort(key=lambda r: (ORDER[r['cls']], -_len(r)))
done_xy = [P.copy()]; done_z = [PZ.copy()]; n_done = len(P)
dtree = cKDTree(P); pending_xy, pending_z = [], []
acc_w = np.zeros(Z.shape); acc_z = np.zeros(Z.shape); best_d = np.full(Z.shape, 1e9)
Zm = Z.copy()                                    # heights after the main-road corridors
def zbil2(x, y): return ndimage.map_coordinates(Zm, [(np.asarray(y) - Y0) / CELL, (np.asarray(x) - X0) / CELL], order=1, mode='nearest')
STEP = 2.0; n_steep0 = n_steep1 = n_steps = 0; still = []
for q_, r in enumerate(minor):
    P_ = np.array(r['pts'], float)[:, :2]; seg = np.hypot(*np.diff(P_, axis=0).T); L_ = seg.sum()
    if L_ < 1: continue
    cum = np.concatenate([[0], np.cumsum(seg)]); n = max(2, int(L_ / STEP) + 1); t = np.linspace(0, L_, n)
    x, y = np.interp(t, cum, P_[:, 0]), np.interp(t, cum, P_[:, 1]); st = L_ / (n - 1)
    z0 = zbil2(x, y); g = GRADE[ORDER[r['cls']]] * st
    n_steep0 += int((np.abs(np.diff(z0)) > 0.3 * st).sum())
    if len(pending_xy) > 4000 or q_ % 200 == 0:        # refresh the tree of graded roads
        if pending_xy: done_xy.append(np.concatenate(pending_xy)); done_z.append(np.concatenate(pending_z)); pending_xy, pending_z = [], []
        dtree = cKDTree(np.concatenate(done_xy)); dzz = np.concatenate(done_z)
    else: dzz = np.concatenate(done_z)
    d, k = dtree.query(np.stack([x, y], -1), distance_upper_bound=3.5)
    pin = np.isfinite(d); zp = np.where(pin, dzz[np.minimum(k, len(dzz) - 1)], 0)
    # a road running alongside a graded one for long is not "meeting" it: only pin short contacts (junctions) and ends
    lab, nl = ndimage.label(pin)
    for i_ in range(1, nl + 1):
        m_ = lab == i_
        if m_.sum() * st > 25 and not (m_[0] or m_[-1]): pin[m_] = False
    zs = ndimage.gaussian_filter1d(z0, max(1.0, 8.0 / st), mode='nearest')
    for it in range(8):
        zs[pin] = zp[pin]
        for i in range(1, n): zs[i] = min(max(zs[i], zs[i - 1] - g), zs[i - 1] + g)
        for i in range(n - 2, -1, -1): zs[i] = min(max(zs[i], zs[i + 1] - g), zs[i + 1] + g)
    zs = ndimage.gaussian_filter1d(zs, max(0.8, 3.0 / st), mode='nearest')
    if pin.any():                                   # ease exactly onto the pinned level over 12 m
        dp = ndimage.distance_transform_edt(~pin) * st; near_i = ndimage.distance_transform_edt(~pin, return_distances=False, return_indices=True)[0]
        w_ = np.clip(1 - dp / 12.0, 0, 1) ** 2; zs = zs * (1 - w_) + zp[near_i] * w_
    bad_ = int((np.abs(np.diff(zs)) > 0.3 * st).sum())
    if bad_ and L_ < 90:      # a short link that cannot join its two ends at less than 30 %: not a road for cars — steps
        r['drop'] = True; n_steps += 1; continue      # (2026-11-12: removed altogether, Gianluca's call)
    if bad_: still.append([r.get('id'), r.get('name') or '', round(L_), bad_ * 2])
    n_steep1 += bad_
    for p_ in r['pts']:
        i_ = int(np.argmin((x - p_[0]) ** 2 + (y - p_[1]) ** 2)); p_[2] = round(float(zs[i_]), 2)
    pending_xy.append(np.stack([x, y], -1)); pending_z.append(zs)
    # corridor: flat under the carriageway (+1.5 m), blending out over 9 m; a node goes to the nearest road
    hw = r['w'] / 2 + 1.5; BL2 = 9.0
    j0, j1 = int((x.min() - hw - BL2 - X0) / CELL), int((x.max() + hw + BL2 - X0) / CELL) + 1; i0, i1 = int((y.min() - hw - BL2 - Y0) / CELL), int((y.max() + hw + BL2 - Y0) / CELL) + 1
    j0, i0 = max(j0, 0), max(i0, 0); j1, i1 = min(j1, NX - 1), min(i1, NY - 1)
    if j1 < j0 or i1 < i0: continue
    gx, gy = np.meshgrid(X0 + np.arange(j0, j1 + 1) * CELL, Y0 + np.arange(i0, i1 + 1) * CELL)
    dd, kk = cKDTree(np.stack([x, y], -1)).query(np.stack([gx.ravel(), gy.ravel()], -1), distance_upper_bound=hw + BL2)
    ok_ = np.isfinite(dd)
    if not ok_.any(): continue
    ii_ = (i0 + np.nonzero(ok_)[0] // gx.shape[1]); jj_ = (j0 + np.nonzero(ok_)[0] % gx.shape[1]); dd, kk = dd[ok_], kk[ok_]
    closer = dd < best_d[ii_, jj_]
    ii_, jj_, dd, kk = ii_[closer], jj_[closer], dd[closer], kk[closer]
    w_ = np.clip(1 - (dd - hw) / BL2, 0, 1); w_ = w_ * w_ * (3 - 2 * w_)
    best_d[ii_, jj_] = dd; acc_w[ii_, jj_] = w_; acc_z[ii_, jj_] = zs[kk] - 0.08
landm = G['land'].astype(bool) if 'land' in G else np.ones(Z.shape, bool)
main_w = np.zeros(Z.shape); main_w[ci, cj] = w                      # the main roads' own corridors win
wf = acc_w * (1 - main_w) * landm * (Z > 0.3)
Z = Z * (1 - wf) + acc_z * wf
json.dump(still, open('prep/steep_after_grading.json', 'w'))
print('main roads: worst cut/fill %.1f m, steepest %.0f %%' % (max(c[0] for c in CUT), 100 * max(c[1] for c in CUT)))
print('short links too steep for cars, removed:', n_steps, '· longer roads still with steep bits:', len(still))
print('minor roads graded', len(minor), '· cells changed', int((wf > 0.02).sum()), '· 2 m steps steeper than 30 %:', n_steep0, '->', n_steep1)
G['z'] = Z.astype(G['z'].dtype) if 'z' in G else Z
np.savez('prep/grid.npz', **G)
F['roads'] = [r for r in F['roads'] if not r.get('drop')]
F['roads_smoothed'] = True
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
print('main road lines', len(lines), 'samples', len(P), 'cells graded', int((w > 0).sum()))
