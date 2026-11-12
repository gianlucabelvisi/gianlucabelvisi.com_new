"""Lago di Venere and Via del Lago, from the Perimetrale down to the lake and round it: python3 sites/lago.py
(after bue_marino.py, before coast_sea.py / ground_fix.py / build.py)
The 10 m DEM smears the crater wall into the water: the descent (Street View 2026-11-02: plateau leg ~42-46 m, hairpin
~22 m, middle leg across the crater wall to a second hairpin ~6 m, lower leg at lake level) was lost, the lakeside road
came out 20-30 m above the water on the north and west, and dipped under it (DEM 1.7 m < water 2.0 m) on the east.
Pass 2 (smooth): the ground round the lake is a single membrane (harmonic interpolation, solved at 1 m) pinned to
  - the roads, each a flat bench at its designed level (descent legs, the ring road round the lake at 2.8-6 m, the
    first stretch of Via Bugeber),
  - the water's edge at 2.25 m (the shoreline traced from the photo, which also replaces the OSM lake polygon),
  - the island's own ground at the rim of the area (stitched to the lowered 10 m grid).
So the crater wall falls smoothly from bench to bench, with no ridges, steps or rock-cut boxes; the rock cuts are only
coloured. Writes web/assets/site_lago.{bin,webp,json}; updates prep/grid.npz (nodes well inside the area are dropped
far below it, so the island mesh never shows through) and the lake polygon in prep/features.json.
"""
import gzip, json, math, struct, sys
import numpy as np
from PIL import Image
from scipy import ndimage, sparse
from scipy.sparse.linalg import spsolve
from scipy.spatial import cKDTree
from matplotlib.path import Path
from skimage import measure
sys.path.insert(0, 'sites')
from common import imagery, grid, make_hcubic

X0, Y0, X1, Y1, RES = -640.0, 3070.0, 60.0, 3990.0, 0.5
img, xs, ys = imagery(X0, Y0, X1, Y1, RES)
NYp, NXp = img.shape[:2]
Xg, Yg = np.meshgrid(xs, ys)
pix = np.column_stack([Xg.ravel(), Yg.ravel()])
Gd = grid(); h_orig = make_hcubic(Gd)
h0 = h_orig(Xg, Yg)
F = json.load(open('prep/features.json')); R = {r['id']: r for r in F['roads']}
LK = [w for w in F['water'] if 'Venere' in (w.get('name') or '')][0]
ZW = float(LK['z'])
LK.setdefault('pts_osm', LK['pts'])
oldLake = Path(np.array(LK['pts_osm'])[:, :2]).contains_points(pix).reshape(Xg.shape)

# ---------------- the lake, traced from the photo ----------------
Rr, Gg, Bb = img[..., 0], img[..., 1], img[..., 2]; L = 0.3 * Rr + 0.59 * Gg + 0.11 * Bb
sat = img.max(-1) - img.min(-1)
water = ((Bb > Rr + 0.05) & (Gg > Rr + 0.02) & (sat > 0.07)) | ((L < 0.3) & (Bb > Rr + 0.04) | ((Gg > Rr + 0.05) & (L > 0.42) & (Bb > Rr - 0.06)))   # + the milky shallows in the south   # turquoise shallows + the dark deep
water = ndimage.binary_opening(ndimage.gaussian_filter(water.astype(float), 2) > 0.5, iterations=2)
lab, n = ndimage.label(water); sz = np.bincount(lab.ravel()); sz[0] = 0
core = lab == np.argmax(sz)
lake = ndimage.binary_fill_holes(ndimage.binary_closing(core, iterations=6))
lake &= ndimage.binary_dilation(oldLake, iterations=int(40 / RES))          # never far from where OSM has it
lake = ndimage.gaussian_filter(lake.astype(float), 3) > 0.5                 # a soft, natural shoreline
cs = max(measure.find_contours(lake.astype(float), 0.5), key=len)
poly = np.column_stack([X0 + (cs[:, 1] + 0.5) * RES, Y0 + (cs[:, 0] + 0.5) * RES])
keepi = [0]
for k in range(1, len(poly)):
    if math.dist(poly[k], poly[keepi[-1]]) >= 3.0: keepi.append(k)
poly = poly[keepi]
in_lake = Path(poly).contains_points(pix).reshape(Xg.shape)
d_lake = ndimage.distance_transform_edt(~in_lake) * RES
print('lake traced', len(poly), 'pts, area m2', round(in_lake.sum() * RES * RES), '(OSM', round(oldLake.sum() * RES * RES), ')')

# ---------------- roads and their levels ----------------
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
def profile(ctrl, t, sig=30):
    c = np.array(ctrl, float); return ndimage.gaussian_filter1d(np.interp(t, c[:, 0], c[:, 1]), sig, mode='nearest')

roads = {}
def fix_ends(z, T, z0=None, z1=None, L=40.0):   # exact levels where the legs meet (hairpins, junctions), eased over L m
    z = z.copy()
    if z0 is not None: z += (z0 - z[0]) * np.clip(1 - T / L, 0, 1) ** 2
    if z1 is not None: z += (z1 - z[-1]) * np.clip(1 - (T[-1] - T) / L, 0, 1) ** 2
    return z
P, T = resample(chain([389428430, 933237014], (-454, 3961)))
hs = ndimage.gaussian_filter1d(h_orig(P[:, 0], P[:, 1]), 40, mode='nearest')
z = profile([(0, hs[0]), (190, hs[380]), (T[-1], 22)], T, 24)
tw = np.clip(T / 30, 0, 1); z = h_orig(P[:, 0], P[:, 1]) * (1 - tw) + z * tw
roads['up'] = (P, T, fix_ends(z, T, None, 22.0), 2.0)
P, T = resample(chain([389428429], (-147, 3819)))
roads['mid'] = (P, T, fix_ends(profile([(0, 22), (120, 18), (260, 12), (T[-1], 6)], T), T, 22.0, 6.0), 2.0)
P, T = resample(chain([389422661, 389422664], (-416, 3706)))
roads['low'] = (P, T, fix_ends(profile([(0, 6), (60, 3.6), (T[-1], 3.0)], T), T, 6.0, 3.0), 2.1)
P, T = resample(chain([702095772], (-416, 3706)))
roads['west'] = (P, T, fix_ends(profile([(0, 6), (60, 3.6), (T[-1], 3.4)], T), T, 6.0, None), 1.8)
P, T = resample(chain([60040924], (-96, 3656)))                             # round the east and south shore
hs = ndimage.gaussian_filter1d(h_orig(P[:, 0], P[:, 1]), 30, mode='nearest')
zr = np.clip(hs, 2.8, 6.0); zr[:40] = np.linspace(3.0, zr[40], 40); zr[-60:] = np.linspace(zr[-60], 3.4, 60)
roads['ring'] = (P, T, fix_ends(ndimage.gaussian_filter1d(zr, 16, mode='nearest'), T, 3.0, 3.4), 1.8)
P, T = resample(chain([239886279], (-96, 3656)))                             # Via Bugéber, the first 260 m up from the lake
m = T < 260; P, T = P[m], T[m]
hs = h_orig(P[:, 0], P[:, 1]); tw = np.clip((T - 40) / 200, 0, 1)
roads['bug'] = (P, T, fix_ends(ndimage.gaussian_filter1d(3.0 * (1 - tw) + np.maximum(hs, 3.0) * tw, 10, mode='nearest'), T, 3.0, None), 2.5)
# the lane above hairpin 2 to the pink houses (OSM 1160060138) is NOT a branch of Via del Lago: it runs along the top
# of the crater wall at its own (natural) level and ends ~20 m above the road. Pin it there, or the site pulled it down
# into a vertical road.
if 1160060138 in R:
    # OSM runs it down onto Via del Lago just before hairpin 2 (a 35 % drop the DEM draws as a wall): Street View shows
    # no branch there, so the lane stops at the top of the crater wall
    _sv = [p for p in R[1160060138]['pts'] if p[0] < -447]
    if len(_sv) >= 2: R[1160060138]['pts'] = _sv
    P, T = resample(np.array([p[:2] for p in R[1160060138]['pts']], float))
    roads['svc'] = (P, T, ndimage.gaussian_filter1d(h_orig(P[:, 0], P[:, 1]), 12, mode='nearest'), 1.8)

near = {}
for k, (P, T, Z, hw) in roads.items():
    d, i = cKDTree(P).query(pix)
    near[k] = (d.reshape(Xg.shape), Z[i].reshape(Xg.shape), hw, i.reshape(Xg.shape))
MAIN = set(near)
# every other lane in the site (the Perimetrale at the junction, the link lane, drives, tracks) gets a bench too, at its
# own level (the Perimetrale's road profile, the others the natural ground smoothed along them): the site surface
# never buries or lifts a road it does not shape (2026-11-08: the junction and the side lanes were glitched)
_used = {389428430, 933237014, 389428429, 389422661, 389422664, 702095772, 60040924, 239886279, 1160060138}
for key, sel in (('perim', lambda r: r['id'] == 933237015), ('lanes', lambda r: r['id'] != 933237015)):
    Ps, Zs = [], []
    for r in F['roads']:
        if r['id'] in _used or r['cls'] in ('footway', 'path', 'steps', 'cycleway') or len(r['pts']) < 2 or not sel(r): continue
        P0 = np.array(r['pts'], float)
        if not ((P0[:, 0] > X0 - 40) & (P0[:, 0] < X1 + 40) & (P0[:, 1] > Y0 - 40) & (P0[:, 1] < Y1 + 40)).any(): continue
        P_, T_ = resample(P0[:, :2])
        if len(P_) < 2: continue
        if key == 'perim':
            s0 = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P0[:, :2], axis=0).T))]); Z_ = np.interp(T_, s0, P0[:, 2])
        else:
            Z_ = ndimage.gaussian_filter1d(h_orig(P_[:, 0], P_[:, 1]), 8, mode='nearest')
        if key == 'lanes':   # a lane joins a Via del Lago leg at that leg's level and leaves it at 18 % at most (2026-11-11:
            # the drive at the car park met the shore road 4 m too high and put a hump on it)
            dm = np.full(len(P_), 1e9); zm = np.zeros(len(P_))
            for k_ in MAIN:
                d_, i_ = cKDTree(roads[k_][0]).query(P_); m_ = d_ < dm; dm[m_] = d_[m_]; zm[m_] = roads[k_][2][i_][m_]
            lim = 0.18 * np.maximum(dm - 2.0, 0); near_ = dm < 60
            Z_ = np.where(near_, np.clip(Z_, zm - lim, zm + lim), Z_)
        Ps.append(P_); Zs.append(Z_)
    if Ps:
        P_, Z_ = np.vstack(Ps), np.concatenate(Zs)
        d, i = cKDTree(P_).query(pix)
        near[key] = (d.reshape(Xg.shape), Z_[i].reshape(Xg.shape), 3.5 if key == 'perim' else 1.8, i.reshape(Xg.shape))
print('lago: benches for', ', '.join(near))

# the car park at the end of the asphalt (NE shore; Esri: dirt, cars in rows along its edges)
PARK = Path([(-160, 3734), (-128, 3737), (-108, 3742), (-98, 3734), (-86, 3718), (-77, 3700), (-75, 3680), (-82, 3664), (-96, 3654),
             (-104, 3660), (-110, 3674), (-120, 3692), (-132, 3708), (-147, 3724)])
park = PARK.contains_points(pix).reshape(Xg.shape)
# one bench field for every road (and the car park): blended where roads meet, so hairpins and junctions are seamless
num = np.zeros(Xg.shape); den = np.zeros(Xg.shape); bench = np.zeros(Xg.shape, bool)
for k, (d, zr, hw, _) in near.items():
    w = 1 / np.maximum(d - 0.5 * hw, 0.25) ** 4 * (d < hw + 4)
    num += w * zr; den += w; bench |= d < hw + 1.0
d_low = near['low'][0]
zp = np.minimum(3.1 + 0.012 * np.maximum(d_low - 2.1, 0), 3.6)
num = np.where(park, num + 50 * zp, num); den = np.where(park, den + 50, den); bench |= park
Zb = num / np.maximum(den, 1e-9)
Zb = np.where(den > 0, Zb, np.nan)
m_ = np.isfinite(Zb) & ndimage.binary_dilation(bench, iterations=4)
sm = lambda a: ndimage.gaussian_filter(a, 3)              # 1.5 m: no step where two benches meet
Zb = sm(np.where(m_, Zb, 0)) / np.maximum(sm(m_.astype(float)), 1e-6)
# ---------------- the area and its rim ----------------
area = (d_lake < 75) & ~in_lake
for k, (d, zr, hw, _) in near.items():
    if k in MAIN: area |= d < 34
area |= ndimage.binary_dilation(park, iterations=int(20 / RES))
# the crater wall between the plateau leg, the middle leg and the water
wall = Path(np.vstack([roads['up'][0], roads['mid'][0], [[-470, 3720], [-480, 3900]]]))
area |= wall.contains_points(pix).reshape(Xg.shape)
area = ndimage.binary_closing(area, iterations=8) & (Xg > X0 + 2) & (Xg < X1 - 2) & (Yg > Y0 + 2) & (Yg < Y1 - 2)
area &= ~in_lake
# the junction with the Perimetrale (a fork round a small lava-stone island, Street View 2026-11-07) stays on the
# island's own ground and road profiles: the site starts 32 m in, so the link lane 389374588 is never buried
JX, JY = -446.0, 3955.0

# verges (2026-11-08: mounds beside / between the roads at the Perimetrale junction): next to the Perimetrale, the side
# lanes and the plateau leg of Via del Lago the ground may rise at most 0.3 m per metre from the road edge (1 m flat
# verge). The middle leg and the hairpin cut keep their rock faces. Applied to the 10 m grid too, so the island mesh
# and the rim follow the same lowered ground.
_Lup = roads['up'][1][-1]
def verge_cap(ii, jj):   # pixel indices -> allowed max height
    cap = np.full(np.shape(ii), np.inf)
    for k in ('perim', 'lanes', 'svc', 'up'):
        if k not in near: continue
        d, zr, hw, iq = near[k]; d_, z_ = d[ii, jj], zr[ii, jj]
        ok_ = (d_ - hw < 14)
        if k == 'up': ok_ &= roads['up'][1][iq[ii, jj]] < _Lup - 50
        cap = np.where(ok_, np.minimum(cap, z_ + 0.3 * np.maximum(0, d_ - hw - 1.0)), cap)
    return cap
_Zg = Gd['z']; _GX0, _GY0, _C = float(Gd['x0']), float(Gd['y0']), float(Gd['cell']); _nv = 0
for gi in range(int(np.ceil((Y0 - _GY0) / _C)), int(np.floor((Y1 - _GY0) / _C)) + 1):
    for gj in range(int(np.ceil((X0 - _GX0) / _C)), int(np.floor((X1 - _GX0) / _C)) + 1):
        pj, pi = int((_GX0 + gj * _C - X0) / RES), int((_GY0 + gi * _C - Y0) / RES)
        if 0 <= pi < NYp and 0 <= pj < NXp:
            c_ = float(verge_cap(np.array(pi), np.array(pj)))
            if c_ < _Zg[gi, gj] - 0.05: _Zg[gi, gj] = c_; _nv += 1
print('lago: grid nodes lowered at the verges', _nv)
# lower the 10 m grid well inside the area (the island mesh must stay under the membrane); keep the rim nodes
Z = Gd['z']; GX0, GY0, CELL = float(Gd['x0']), float(Gd['y0']), float(Gd['cell'])
Z_before = Z.copy(); _lowered = []
deep = ndimage.binary_erosion(area | in_lake, iterations=int(28 / RES))   # > 2 grid cells: the bicubic at the rim never feels a lowered node (it pulled the rim into a chasm and sank houses there)
# never next to a road the site does not shape (the Perimetrale, the lanes): a node lowered to -6 m there makes the
# island's bicubic ring up into a 1-2 m mound beside the road (2026-11-08: the mounds at the Perimetrale junction)
# … but where a Via del Lago leg runs within 40 m the site must own the ground (2026-11-09: keeping the grid up next to
# the lane above the middle leg buried the middle leg under a stepped wall)
_dmain = np.min([near[k][0] for k in MAIN], axis=0)
_keep_up = (near['perim'][0] < 30) if 'perim' in near else np.zeros(deep.shape, bool)
for _k in ('lanes', 'svc'):
    if _k in near: _keep_up |= (near[_k][0] < 30) & (_dmain > 40)
deep &= ~_keep_up
changed = 0
for i in range(int(np.ceil((Y0 - GY0) / CELL)), int(np.floor((Y1 - GY0) / CELL)) + 1):
    for j in range(int(np.ceil((X0 - GX0) / CELL)), int(np.floor((X1 - GX0) / CELL)) + 1):
        pj, pi = int((GX0 + j * CELL - X0) / RES), int((GY0 + i * CELL - Y0) / RES)
        if 0 <= pi < NYp and 0 <= pj < NXp and deep[pi, pj]:
            nz = -6.0 if area[pi, pj] else min(float(Z[i, j]), ZW - 1.5)
            if nz < Z[i, j]: Z[i, j] = nz; changed += 1; _lowered.append((i, j, pi, pj))
            Gd['land'][i, j] = bool(area[pi, pj])
np.savez('prep/grid.npz', **Gd)
h_new = make_hcubic(Gd)(Xg, Yg)
print('grid nodes lowered', changed)

# ---------------- the membrane (1 m) ----------------
S2 = 2
a2 = area[::S2, ::S2]; ny, nx = a2.shape
fixed = np.full(a2.shape, np.nan)
rim = a2 & ~ndimage.binary_erosion(a2, iterations=1)
H0 = h0[::S2, ::S2]
_sh = ndimage.binary_dilation(in_lake[::S2, ::S2], iterations=1) & a2
b = bench[::S2, ::S2] & a2
def membrane(base):   # harmonic fill of (z - base) between the pinned rim, shore and road benches
    fixed = np.full(a2.shape, np.nan)
    fixed[rim] = (h_new[::S2, ::S2] - base)[rim]
    fixed[_sh] = (ZW + 0.25 - base)[_sh]
    fixed[b] = (Zb[::S2, ::S2] - base)[b]
    unk = a2 & np.isnan(fixed)
    idx = -np.ones(a2.shape, int); idx[unk] = np.arange(unk.sum())
    rows, cols, vals = [], [], []; rhs = np.zeros(unk.sum())
    ii, jj = np.nonzero(unk)
    for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ni, nj = np.clip(ii + di, 0, ny - 1), np.clip(jj + dj, 0, nx - 1)
        nb_in = a2[ni, nj]
        rows.append(idx[ii, jj]); cols.append(idx[ii, jj]); vals.append(np.where(nb_in, 1.0, 0.0))
        u = nb_in & unk[ni, nj]
        rows.append(idx[ii, jj][u]); cols.append(idx[ni, nj][u]); vals.append(-np.ones(u.sum()))
        f = nb_in & ~unk[ni, nj]
        np.add.at(rhs, idx[ii, jj][f], fixed[ni, nj][f])
    A = sparse.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(unk.sum(), unk.sum()))
    z = fixed.copy(); z[unk] = spsolve(A.tocsc(), rhs)
    return z + base, unk
# near the water the ground is the flat shore the roads run on (absolute membrane, as before); up the crater wall the
# membrane only bends the natural ground (displacement from the DEM), so the slopes keep their real shape and no cliff
# opens at the rim (Street View 2026-11-07)
zA, unk = membrane(np.zeros_like(H0))
zD, _ = membrane(H0)
wD = np.clip((d_lake[::S2, ::S2] - 35) / 45, 0, 1)
z2 = zA * (1 - wD) + zD * wD
z2 = np.where(a2, z2, np.nan)
print('membrane unknowns', unk.sum())
# back to 0.5 m: bilinear, then the benches exact again, a light grain
zf = np.nan_to_num(z2, nan=0.0); wf = np.isfinite(z2).astype(float)
up = lambda a: ndimage.zoom(a, S2, order=1)[:NYp, :NXp]
zz = up(zf) / np.maximum(up(wf), 1e-3)
grain = ndimage.gaussian_filter(np.random.default_rng(5).random(zz.shape), 3) - 0.5
dmin = np.full(zz.shape, 1e9)
for k, (d, zr, hw, _) in near.items(): dmin = np.minimum(dmin, d - hw)
dmin = np.where(park, -1, dmin)
zz = np.where(bench, Zb, zz)
zz += grain * 0.8 * np.clip((dmin - 2) / 6, 0, 1) * np.clip(d_lake / 6, 0, 1)
zz = np.where(area, np.maximum(zz, np.where(d_lake < 2.5, ZW + 0.3, ZW + 0.3)), zz)
rimb = area & ~ndimage.binary_erosion(area, iterations=3)
zz = np.where(rimb, h_new, zz)
# the island mesh is 5 m triangles of the bicubic: never let it poke through near the rim
# now that the surface is known, lower those grid nodes only as far as needed (1 m under the lowest site ground
# within 12 m) instead of -6 m: the deep drop made the island's bicubic ring up into ridges 4-7 m above the real
# ground along the edge of the lowered zone, and the 'stay above the island' floor turned them into fake hills
# (2026-11-09)
_zmin = ndimage.minimum_filter(np.where(area, zz, np.where(in_lake, ZW - 0.8, zz)), size=int(12 / RES))
for (i, j, pi, pj) in _lowered:
    Z[i, j] = min(float(Z_before[i, j]), float(_zmin[pi, pj]) - 1.0) if area[pi, pj] else min(float(Z_before[i, j]), ZW - 1.5)
Gd['z'] = Z; np.savez('prep/grid.npz', **Gd); h_new = make_hcubic(Gd)(Xg, Yg)
lin5 = ndimage.zoom(h_new[::10, ::10], 10, order=1)[:NYp, :NXp]
_II, _JJ = np.indices(zz.shape); _cap = verge_cap(_II, _JJ)
zz = np.where(area & ~bench, np.minimum(zz, _cap), zz)
zz = np.where(area & ~rimb & (dmin > 1.5), np.maximum(zz, np.maximum(h_new, lin5) + 0.05), zz)
# no fake hills (2026-11-09): away from the roads the site never stands above the original ground, except as an
# embankment falling from a road at 1:2 at most
_allow = np.maximum(h0 + 0.3, np.where(d_lake < 60, ZW + 0.3 + 0.08 * d_lake, -1e9))   # the beach: never under the water line
for _k, (_d, _zr, _hw, _) in near.items():
    _allow = np.maximum(_allow, np.where(_d < 40, _zr + 0.05 - 1.2 * np.maximum(0, _d - _hw - 0.8), -1e9))
_fh = area & ~bench & (zz > _allow)
zz = np.where(_fh, np.maximum(_allow, np.maximum(h_new, lin5) + np.where(h_new > h0 - 1, 0.45, 0.05)), zz)   # where the island grid was not lowered stay clearly above it (no island terrain showing through)
print('lago: fake-hill cells clipped', int(_fh.sum()))
# Street View 2026-11-07 (every 20 m): the only cutting on Via del Lago is the last ~35 m before hairpin 1, a shallow
# cut through layered trachyte (~2.5 m on the left/north, ~1.5 m on the right); it hides the lake until the hairpin,
# where the road opens onto a wide turning area and the lake appears below. Everywhere else the verges are as before.
P_, T_, Z_, hw_ = roads['up']; d_up, z_up, _, i_up = near['up']; Lup = T_[-1]; s_up = T_[i_up]
sm = lambda a_, b_, x: np.clip((x - a_) / (b_ - a_), 0, 1) ** 2 * (3 - 2 * np.clip((x - a_) / (b_ - a_), 0, 1))
i1_ = np.minimum(i_up + 3, len(P_) - 1); i0_ = np.maximum(i_up - 3, 0)
sideL = ((P_[i1_, 0] - P_[i0_, 0]) * (Yg - P_[i_up, 1]) - (P_[i1_, 1] - P_[i0_, 1]) * (Xg - P_[i_up, 0])) > 0
cutH = np.where(sideL, 2.5, 1.5) * sm(Lup - 45, Lup - 35, s_up) * (1 - sm(Lup - 14, Lup - 6, s_up))
face = sm(hw_ + 0.3, hw_ + 1.3, d_up) * (1 - sm(hw_ + 5, hw_ + 9, d_up))
cut = area & ~bench & (cutH > 0.1) & (d_up < hw_ + 9) & (near['mid'][0] > d_up + 8) & (near['mid'][0] > 14)
zz = np.where(cut, np.maximum(zz, z_up + cutH * face), zz)
print('lago: cutting cells', int(cut.sum()))
# (2026-11-07: no added rock face on the middle leg: the crater wall's own slope is what the road is cut into)
zlake = np.where(d_lake == 0, np.minimum(h_new, ZW - 0.8), np.nan)
keep = area | (in_lake & (ndimage.distance_transform_edt(in_lake) * RES < 8))
zout = np.where(area, zz, np.where(in_lake, ZW - 0.8, zz))
zi = np.where(keep, np.round(zout * 100), -32768).astype('<i2')
open('web/assets/site_lago.bin', 'wb').write(gzip.compress(struct.pack('<3f2H', X0, Y0, RES, NXp, NYp) + zi.tobytes(), 9))

# ---------------- colour ----------------
gy, gx = np.gradient(np.where(area, zz, ZW), RES); slope = np.hypot(gx, gy)
blur = ndimage.gaussian_filter(img, (1.5, 1.5, 0))
col = np.clip((img + 0.9 * (img - blur)) * 1.1, 0, 1)                     # sharpened: the photo is ~0.6 m/px
rock = np.clip((slope - 1.1) / 0.5, 0, 1)[..., None] * 0.7
col = col * (1 - rock) + (np.array([0.55, 0.53, 0.50]) * (0.8 + 0.4 * np.clip(L, 0, 1))[..., None]) * rock
shore = (d_lake < 5)[..., None] & area[..., None]
col = np.where(shore, col * 0.5 + np.array([0.80, 0.76, 0.66]) * 0.5, col)
# the lake itself, banded like the photo: navy in the deep crater, teal, turquoise, the milky shallows
Ls = ndimage.gaussian_filter(L, 4)
# more steps in the bright shallows (the whole south of the lake is milky: one flat band read as a single colour up
# close), and the photo's own tones mixed in there, so the shallows keep their mottling and drift lines
band = np.digitize(Ls, [0.13, 0.26, 0.42, 0.5, 0.57, 0.64])
LKC = np.array([[0.08, 0.30, 0.39], [0.12, 0.50, 0.53], [0.27, 0.70, 0.65], [0.50, 0.80, 0.74], [0.60, 0.84, 0.77], [0.68, 0.87, 0.80], [0.76, 0.89, 0.82]])
photo = np.clip(ndimage.gaussian_filter(np.stack([Rr, Gg, Bb], -1), (1.5, 1.5, 0)), 0, 1)
mixw = np.clip((band - 2) / 2, 0, 1)[..., None] * 0.45
lk = LKC[band] * (1 - mixw) + (photo * 1.08 + np.array([-0.02, 0.03, 0.03])).clip(0, 1) * mixw
col = np.where(in_lake[..., None], lk, col)
Image.fromarray((col[::-1] * 255).astype(np.uint8)).save('web/assets/site_lago.webp', quality=86, method=6)

# ---------------- walls, guard blocks, rocks in the shallows ----------------
def downhill_normal(P, i):
    a, b = P[max(i - 3, 0)], P[min(i + 3, len(P) - 1)]
    tx, ty = b - a; L_ = math.hypot(tx, ty) or 1; nx_, ny_ = -ty / L_, tx / L_
    px, py = P[i]
    jx, jy = int((px + nx_ * 6 - X0) / RES), int((py + ny_ * 6 - Y0) / RES)
    kx, ky = int((px - nx_ * 6 - X0) / RES), int((py - ny_ * 6 - Y0) / RES)
    if zz[min(max(jy, 0), NYp - 1), min(max(jx, 0), NXp - 1)] > zz[min(max(ky, 0), NYp - 1), min(max(kx, 0), NXp - 1)]: nx_, ny_ = -nx_, -ny_
    return nx_, ny_, math.atan2(ty, tx)
walls, blocks, bould = [], [], []
park8 = ndimage.binary_dilation(park, iterations=int(8 / RES))
P, T, Zr, hw = roads['low']
sel = np.nonzero((T > 190) & (T < T[-1] - 50))[0][::4]   # Street View: the rubble wall at the slope foot starts ~200 m after hairpin 2
for a, b in zip(sel, sel[1:]):
    nx_, ny_, _ = downhill_normal(P, a); o = -(hw + 0.6)
    w_ = [P[a, 0] + nx_ * o, P[a, 1] + ny_ * o, P[b, 0] + nx_ * o, P[b, 1] + ny_ * o, 0.6, 0.55]
    if not any(park8[min(max(int((yy - Y0) / RES), 0), NYp - 1), min(max(int((xx - X0) / RES), 0), NXp - 1)] for xx, yy in ((w_[0], w_[1]), (w_[2], w_[3]))): walls.append(w_)   # open onto the car park
P, T, Zr, hw = roads['mid']
for s in np.arange(8, 125, 2.6):   # Street View: brick/stone parapet sections from hairpin 1 for ~110 m, then open slope
    i = int(np.searchsorted(T, s)); nx_, ny_, ang = downhill_normal(P, i)
    blocks.append([round(P[i, 0] + nx_ * 2.6, 2), round(P[i, 1] + ny_ * 2.6, 2), round(float(Zr[i]), 2), round(ang, 3)])
rng = np.random.default_rng(3)
P, T, Zr, hw = roads['low']
for s in np.arange(20, T[-1] - 40, 2.6):
    i = int(np.searchsorted(T, s)); nx_, ny_, _ = downhill_normal(P, i)
    for off in np.arange(3, 40, 0.5):
        x, y = P[i, 0] + nx_ * off, P[i, 1] + ny_ * off
        if in_lake[min(int((y - Y0) / RES), NYp - 1), min(int((x - X0) / RES), NXp - 1)]: break
    x += nx_ * (3.5 + rng.random()); y += ny_ * (3.5 + rng.random())
    bould.append([round(x, 2), round(y, 2), ZW + 0.15, round(0.7 + rng.random() * 0.6, 2), round(rng.random() * 6.28, 2)])
# macchia where the photo is green (the crater wall is covered in it), off the roads and the shore
gi = ndimage.gaussian_filter(Gg - (Rr + Bb) / 2, 2)
rng2 = np.random.default_rng(11); veg = []
_other = [np.array(r_['pts'])[:, :2] for r_ in F['roads'] if r_['cls'] not in ('footway', 'path', 'steps') and len(r_['pts']) > 1
          and any(X0 - 20 < p_[0] < X1 + 20 and Y0 - 20 < p_[1] < Y1 + 20 for p_ in r_['pts'])]   # every drivable lane, not just the lake legs
_allp = np.vstack([np.vstack([np.linspace(P_[k], P_[k + 1], max(2, int(np.hypot(*(P_[k + 1] - P_[k])) / 1.0))) for k in range(len(P_) - 1)]) for P_ in _other]) if _other else np.zeros((1, 2)) + 1e6
_dother = cKDTree(_allp).query(pix)[0].reshape(Xg.shape)
ok = area & ~bench & (dmin > 2.5) & (d_lake > 4) & (_dother > 4)
for i in range(0, NYp, 5):
    for j in range(0, NXp, 5):
        ii_, jj_ = min(i + rng2.integers(5), NYp - 1), min(j + rng2.integers(5), NXp - 1)
        if not ok[ii_, jj_]: continue
        p = np.clip((gi[ii_, jj_] - 0.015) / 0.05, 0, 1) * 0.35
        if rng2.random() < p: veg.append([round(float(xs[jj_]), 1), round(float(ys[ii_]), 1), round(0.45 + 1.2 * p + 0.25 * rng2.random(), 2)])
# parked cars: rows along the edges of the car park (Esri)
ROWS = [[(-148, 3728), (-131, 3723), (-123, 3719), (-116, 3711), (-110, 3701), (-103, 3692), (-99, 3684), (-96, 3677)],
        [(-106, 3731), (-100, 3724), (-93, 3718), (-87, 3710), (-82, 3702), (-77, 3694), (-75, 3688)],
        [(-80, 3677), (-86, 3668), (-93, 3659)]]
cars = []; _ktree = cKDTree(_allp)
for row in ROWS:
    Pr = np.array(row, float); Pr2, Tr = resample(Pr, 2.6)
    for k in range(len(Pr2)):
        if rng2.random() < 0.2: continue
        if near['low'][0][min(int((Pr2[k, 1] - Y0) / RES), NYp - 1), min(int((Pr2[k, 0] - X0) / RES), NXp - 1)] < 4.5: continue   # not on the carriageway
        a_ = Pr2[min(k + 1, len(Pr2) - 1)] - Pr2[max(k - 1, 0)]; ang = math.atan2(a_[1], a_[0]) + math.pi / 2
        if _ktree.query([Pr2[k, 0], Pr2[k, 1]])[0] < 2.0: continue   # not in an aisle / lane
        cars.append([round(float(Pr2[k, 0]), 2), round(float(Pr2[k, 1]), 2), round(ang + (rng2.random() - 0.5) * 0.15, 3), int(rng2.integers(8))])
from shapely.geometry import Polygon as _SP
_lp = _SP(poly).buffer(2.0, join_style=2).simplify(0.3)   # the water reaches 2 m under the shore ground (ZW+0.15 > ZW+0.05): no slivers of lake bed at the edge
if _lp.geom_type != 'Polygon': _lp = max(_lp.geoms, key=lambda g: g.area)
lakeOut = [[round(float(x), 2), round(float(y), 2)] for x, y in list(_lp.exterior.coords)[:-1]]
# the lava-stone island in the fork (Street View s = 0): a low round rubble kerb, as big as the fork allows
_lines = [np.array(R[i]['pts'])[:, :2] for i in (933237015, 389374588, 389428430) if i in R]
_dl = lambda x, y: min(np.min(np.hypot(L_[:, 0] - x, L_[:, 1] - y)) for L_ in _lines)
_tri = Path([(-454.0, 3961.3), (-433.8, 3956.8), (-441.1, 3943.7)])   # the fork: Perimetrale, the link lane, Via del Lago
_cand = [(x_, y_) for x_ in np.arange(-456, -432, 0.25) for y_ in np.arange(3942, 3963, 0.25) if _tri.contains_point((x_, y_))]
_best = max(_cand, key=lambda q: _dl(*q))
_rI = min(2.2, _dl(*_best) - 2.6)
if _rI > 0.6:
    _ang = np.linspace(0, 2 * np.pi, 11)
    for a_, b_ in zip(_ang, _ang[1:]):
        walls.append([round(_best[0] + _rI * np.cos(a_), 2), round(_best[1] + _rI * np.sin(a_), 2), round(_best[0] + _rI * np.cos(b_), 2), round(_best[1] + _rI * np.sin(b_), 2), 0.55, 0.45])
print('lago: junction island at', _best, 'r', round(_rI, 2))
_kel = np.array(R[239886280]['pts'])[:, :2] if 239886280 in R else None
if _kel is not None:
    _h1 = roads['mid'][0][0]
    if np.hypot(*(_kel[-1] - _h1)) < np.hypot(*(_kel[0] - _h1)): _kel = _kel[::-1]
    _k = int(np.searchsorted(np.r_[0, np.cumsum(np.hypot(*np.diff(_kel, axis=0).T))], 3.0)); _k = min(max(_k, 1), len(_kel) - 1)
    _u = (_kel[_k] - _kel[_k - 1]) / (np.hypot(*(_kel[_k] - _kel[_k - 1])) or 1); _c = _kel[_k - 1] + _u * 0.0
    pass   # no posts: they sat on the carriageway; the path reads as a path by its paving and width
json.dump({'lake': lakeOut, 'lakeZ': ZW + 0.05, 'veg': veg, 'cars': cars, 'boulders': bould, 'walls': [[round(v, 2) for v in w] for w in walls], 'blocks': blocks}, open('web/assets/site_lago.json', 'w'), separators=(',', ':'), default=float)

# ---------------- features: the traced lake, the roads asphalt where they are ----------------
LK['pts'] = [[round(float(x), 2), round(float(y), 2)] for x, y in poly]
for r in F['roads']:
    if r['id'] in (389428430, 933237014, 389428429, 389422661, 389422664, 389374588): r['surface'] = 'asphalt'; r['w'] = min(r['w'], 4.0)
# Street View 2026-11-07: Via Kelima (from hairpin 1 up the crater wall) is a hikers' path paved with flat pale stones,
# not a road for cars: a narrow footway, with a lava bollard at its mouth on Via del Lago
# Esri: the long pale structure on the west crater slope (OSM 1160060288/89, 65 x 10 m) is a low terrace on the slope,
# not a block of flats: a 1.2 m slab with at most 2.5 m of base on the downhill side
F['buildings'] = [b for b in F['buildings'] if b.get('id') not in (1160060288, 1160060289)]   # drawn as a 65 m wall hanging over the slope: dropped
for r in F['roads']:
    if r.get('id') == 239886280: r['cls'] = 'footway'; r['w'] = 1.8; r['surface'] = 'paved'
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
print('lago: veg', len(veg), 'cars', len(cars), 'walls', len(walls), 'blocks', len(blocks), 'boulders', len(bould))
vis = (img * 255).astype(np.uint8).copy()
vis[area & (np.arange(NXp)[None, :] % 10 == 0)] = (255, 255, 0)
for k, (d, zr, hw, _) in near.items(): vis[d < hw] = (255, 0, 0)
e = in_lake & ~ndimage.binary_erosion(in_lake, iterations=2); vis[e] = (0, 255, 255)
Image.fromarray(vis[::-1]).save('prep/site_lago_check.png')
