"""Pantelleria airport (LICG / PNL), after Esri imagery + Google Maps photos + Street View (2026-11-07):
python3 sites/airport.py   (after town.py, before coast_atlas.py / ground_fix.py / build.py)
- Grades the 10 m grid flat along the runways and taxiways (a smooth longitudinal profile) and over the aprons (a plane),
  so the paved surfaces lie on the terrain the viewer draws; the viewer drapes them (build.py no longer bakes the runway).
- Removes the trees that the land-cover scattered over the runways and aprons.
- Markings: runway 07/25 (1675 x 45 m) and 03/21 (30 m): edge lines, centre-line dashes, threshold bars, aiming points,
  touchdown-zone bars; yellow taxiway centre lines.
- The perimeter fence (chain-link + barbed wire on concrete posts) round the airfield, open where the terminal stands.
- The civil terminal (long two-storey glass and concrete block, solar panels on the roof, a red canopy, the glass
  pyramid entrance on the landside), the control tower, red-and-white floodlight masts on the apron, an ATR 72 and a
  business jet on stand, the windsock, the landside car parks with cars.
Writes web/assets/airport.json.
"""
import json, math, sys
import numpy as np
from scipy import ndimage
from shapely.geometry import LineString, Polygon, Point
from shapely.ops import unary_union
from matplotlib.path import Path
sys.path.insert(0, 'sites')
from common import grid, make_hcubic

F = json.load(open('prep/features.json'))
G = grid(); Z = G['z'].astype(np.float64); X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell']); NY, NX = Z.shape
Xg = X0 + np.arange(NX)[None, :] * CELL + 0 * np.arange(NY)[:, None]; Yg = Y0 + np.arange(NY)[:, None] * CELL + 0 * np.arange(NX)[None, :]
BB = (-3100, 2450, -1050, 3800)
rws = [r for r in F['runway'] if all(BB[0] < p[0] < BB[2] and BB[1] < p[1] < BB[3] for p in r['pts'])]
aprons = [a for a in F['aprons'] if len(a['pts']) > 3]

# ---------------- grading ----------------
Zn = Z.copy(); wsum = np.zeros_like(Z); zacc = np.zeros_like(Z)
pix = np.column_stack([Xg.ravel(), Yg.ravel()])
for r in sorted(rws, key=lambda r: r['w']):
    P = np.array(r['pts'], float); seg = np.hypot(*np.diff(P, axis=0).T); s = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(0, s[-1] + 0.1, 5.0); xs = np.interp(t, s, P[:, 0]); ys = np.interp(t, s, P[:, 1])
    hc = make_hcubic(G); zl = ndimage.gaussian_filter1d(hc(xs, ys), 12 if r['w'] >= 30 else 5, mode='nearest')
    L = LineString(np.column_stack([xs, ys])); half = r['w'] / 2
    near = (Xg > L.bounds[0] - 60) & (Xg < L.bounds[2] + 60) & (Yg > L.bounds[1] - 60) & (Yg < L.bounds[3] + 60)
    for i, j in zip(*np.nonzero(near)):
        p = Point(Xg[i, j], Yg[i, j]); d = L.distance(p)
        if d > half + 40: continue
        k = int(round(L.project(p) / 5.0)); k = min(max(k, 0), len(zl) - 1)
        w = 1.0 if d < half + 12 else max(0.0, 1 - (d - half - 12) / 28)
        if w > wsum[i, j]: wsum[i, j] = w; zacc[i, j] = zl[k]
for a in aprons:
    poly = Polygon(np.array(a['pts'])[:, :2]); pp = Path(np.array(a['pts'])[:, :2])
    inside = pp.contains_points(pix).reshape(Z.shape)
    if inside.sum() < 3: continue
    A = np.column_stack([Xg[inside], Yg[inside], np.ones(inside.sum())]); c, *_ = np.linalg.lstsq(A, Z[inside], rcond=None)
    plane = c[0] * Xg + c[1] * Yg + c[2]
    d = ndimage.distance_transform_edt(~inside) * CELL
    w = np.where(inside, 1.0, np.clip(1 - (d - 5) / 20, 0, 1))
    upd = w > wsum; wsum = np.where(upd, w, wsum); zacc = np.where(upd, plane, zacc)
Zn = Z * (1 - wsum) + zacc * wsum
print('airport: graded cells', int((wsum > 0).sum()), 'max change', round(float(np.abs(Zn - Z).max()), 1))
G['z'] = Zn.astype(G['z'].dtype); np.savez('prep/grid.npz', **G)

# ---------------- the airfield ----------------
field = unary_union([LineString(np.array(r['pts'])[:, :2]).buffer(r['w'] / 2 + (70 if r['kind'] == 'runway' else 30)) for r in rws] +
                    [Polygon(np.array(a['pts'])[:, :2]).buffer(18) for a in aprons])
field = field.buffer(25).buffer(-25)
if field.geom_type == 'MultiPolygon': field = max(field.geoms, key=lambda g: g.area)
# the fence runs inside the public roads round the airport (Via Circonvallazione Aeroporto, Via Madonna della Margana, ...):
# cut the field back to 6 m inside every non-service road that skirts it and keep the piece holding the runways
_pub = [LineString(np.array(r['pts'])[:, :2]).buffer(r['w'] / 2 + 6) for r in F['roads']
        if r['cls'] not in ('service', 'footway', 'steps', 'path', 'track', 'cycleway', 'pedestrian') and len(r['pts']) > 1
        and LineString(np.array(r['pts'])[:, :2]).intersects(field.buffer(30))]
if _pub:
    _cut = field.difference(unary_union(_pub))
    _mid = Point(np.mean(np.array(rws[0]['pts'])[:, :2], axis=0))
    _g = list(_cut.geoms) if hasattr(_cut, 'geoms') else [_cut]
    field = min(_g, key=lambda g: g.distance(_mid)) if not any(g.contains(_mid) for g in _g) else next(g for g in _g if g.contains(_mid))
    field = field.buffer(-1).buffer(1)
    if field.geom_type == 'MultiPolygon': field = max(field.geoms, key=lambda g: g.area)
    print('airport: field kept inside', len(_pub), 'public roads, area', round(field.area))
paved = unary_union([LineString(np.array(r['pts'])[:, :2]).buffer(r['w'] / 2 + 3) for r in rws] + [Polygon(np.array(a['pts'])[:, :2]).buffer(3) for a in aprons])
n0 = len(F['trees'])
from shapely.prepared import prep as _prep
_pv, _fi = _prep(paved), _prep(field.buffer(-8))
F['trees'] = [t for t in F['trees'] if not (BB[0] - 200 < t[0] < BB[2] + 200 and BB[1] - 200 < t[1] < BB[3] + 300) or (not _pv.contains(Point(t[0], t[1])) and not _fi.contains(Point(t[0], t[1])))]
print('airport: trees removed', n0 - len(F['trees']))
# land cover: paved surfaces carry no scrub (class 1 = built), the fenced field is mown dry grass (4 = field)
C = np.load('prep/classes.npy')
if C.shape == Z.shape:
    from matplotlib.path import Path as _P
    def _mask(geom):
        out = np.zeros(C.shape, bool)
        for g in (geom.geoms if hasattr(geom, 'geoms') else [geom]):
            m = _P(np.array(g.exterior.coords)).contains_points(pix).reshape(C.shape)
            for h in g.interiors: m &= ~_P(np.array(h.coords)).contains_points(pix).reshape(C.shape)
            out |= m
        return out
    fm, pm = _mask(field), _mask(paved.buffer(4))
    C[fm & (C != 0)] = 4; C[pm & (C != 0)] = 10   # 10: paved airfield, nothing grows
    np.save('prep/classes.npy', C); print('airport: land cover cells field', int(fm.sum()), 'paved', int(pm.sum()))

# no field walls inside the airport fence: clip the dry-stone walls to the outside of the airfield
from shapely.geometry import MultiPoint
_term0 = [Polygon(np.array(bb['pts'])[:, :2]) for bb in F['buildings'] if bb.get('id') in {302863378, 60044060}]
# landside: terminal forecourt, the roundabout in front of it and the two car parks — kerbs and planting, no field walls
landside = MultiPoint([(-2122, 3846), (-2118, 3812), (-2068, 3800), (-2056, 3836), (-2116, 3878), (-2092, 3922), (-2054, 3910), (-2050, 3862),
                       (-2104, 3744), (-2135, 3744), (-2104, 3775), (-2073, 3744), (-2185, 3640), (-1985, 3640), (-1985, 3945), (-2185, 3945)] + [c for g in _term0 for c in g.exterior.coords]).convex_hull.buffer(15)
D = json.load(open('prep/detail.json')); inner = field.buffer(-2).union(landside);
_C = np.load('prep/classes.npy')
if _C.shape == Z.shape:
    _lm = Path(np.array(landside.exterior.coords)).contains_points(pix).reshape(_C.shape)
    _C[_lm & (_C != 0) & (_C != 10)] = 1; np.save('prep/classes.npy', _C)   # landside forecourt: built-up (no field walls, no scrub)
nw0 = len(D['walls']); W2 = []
for ty, pts in D['walls']:
    L = LineString(pts)
    if not L.intersects(inner): W2.append([ty, pts]); continue
    rest = L.difference(inner)
    for g in (rest.geoms if hasattr(rest, 'geoms') else [rest]):
        if g.geom_type == 'LineString' and g.length > 4: W2.append([ty, [[round(x, 1), round(y, 1)] for x, y in g.coords]])
D['walls'] = W2; json.dump(D, open('prep/detail.json', 'w'), separators=(',', ':')); print('airport: walls', nw0, '->', len(W2))

# terminal: OSM blocks replaced by the viewer's terminal
TERM_IDS = {302863378, 60044060}
term = [b['pts'] for b in F['buildings'] if b.get('id') in TERM_IDS]
F['buildings'] = [b for b in F['buildings'] if b.get('id') not in TERM_IDS]
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))

# ---------------- fence ----------------
bl = [Polygon(np.array(b['pts'])[:, :2]).buffer(4) for b in F['buildings'] if len(b['pts']) > 2 and Polygon(np.array(b['pts'])[:, :2]).is_valid
      and field.buffer(40).contains(Point(b['pts'][0][:2]))]
blk = unary_union(bl + [Polygon(np.array(p)[:, :2]).buffer(6) for p in term])
ring = np.array(field.exterior.simplify(4).coords)
fence, run = [], []
_gates = [(LineString(np.array(r_['pts'])[:, :2]), r_['w']) for r_ in F['roads'] if r_['cls'] not in ('footway', 'path', 'steps', 'track') and len(r_['pts']) > 1 and LineString(np.array(r_['pts'])[:, :2]).intersects(field.exterior)]
L = LineString(ring); n = int(L.length // 3)
for k in range(n + 1):
    p = L.interpolate(k * 3.0)
    if blk.contains(p) or any(L_.distance(p) < w_ / 2 + 0.8 for L_, w_ in _gates):   # buildings, and a gate where a road goes through
        if len(run) > 1: fence.append(run)
        run = []
    else: run.append([round(p.x, 1), round(p.y, 1)])
if len(run) > 1: fence.append(run)
print('airport: fence', round(L.length), 'm in', len(fence), 'runs')

# ---------------- markings ----------------
quads = []   # [colour 0 white 1 yellow, x1,y1,...,x4,y4]
def rect(cx, cy, ux, uy, l, w, col):
    nx, ny = -uy, ux
    pts = [(cx - ux * l / 2 - nx * w / 2, cy - uy * l / 2 - ny * w / 2), (cx + ux * l / 2 - nx * w / 2, cy + uy * l / 2 - ny * w / 2),
           (cx + ux * l / 2 + nx * w / 2, cy + uy * l / 2 + ny * w / 2), (cx - ux * l / 2 + nx * w / 2, cy - uy * l / 2 + ny * w / 2)]
    quads.append([col] + [round(v, 2) for q in pts for v in q])
for r in rws:
    P = np.array(r['pts'])[:, :2]
    if r['kind'] == 'runway' and r['w'] >= 30 and math.dist(P[0], P[-1]) > 500:
        a, b = P[0], P[-1]; Lr = math.dist(a, b); ux, uy = (b - a) / Lr; nx, ny = -uy, ux; W = r['w']
        mid = (a + b) / 2
        for e in (-1, 1): rect(*(mid + np.array([nx, ny]) * e * (W / 2 - 1)), ux, uy, Lr - 4, 0.9, 0)          # edge lines
        for s in np.arange(60, Lr - 60, 50): rect(*(a + np.array([ux, uy]) * s), ux, uy, 30, 0.9, 0)          # centre line
        nb = 6 if W >= 40 else 4
        for end, sg in ((a, 1), (b, -1)):
            c0 = end + np.array([ux, uy]) * sg * 21
            for k in range(nb):
                off = (W / 2 - 4) * (k + 0.5) / nb + 1.5
                for e in (-1, 1): rect(*(c0 + np.array([nx, ny]) * e * off), ux, uy, 30, 1.8, 0)              # threshold
            for d_, l_ in ((300, 45),):
                for e in (-1, 1): rect(*(end + np.array([ux, uy]) * sg * d_ + np.array([nx, ny]) * e * (W / 2 - 9)), ux, uy, l_, 6 if W >= 40 else 4, 0)   # aiming points
            for d_ in (150, 450):
                for e in (-1, 1):
                    for k2 in range(2): rect(*(end + np.array([ux, uy]) * sg * d_ + np.array([nx, ny]) * e * (W / 2 - 5 - k2 * 2.5)), ux, uy, 22, 1.2, 0)
    elif r['kind'] == 'taxiway':
        Ls = LineString(P)
        for s in np.arange(1, Ls.length, 3.0):
            p0, p1 = Ls.interpolate(s), Ls.interpolate(min(s + 3, Ls.length))
            d = math.dist((p0.x, p0.y), (p1.x, p1.y))
            if d < 0.5: continue
            rect((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p1.x - p0.x) / d, (p1.y - p0.y) / d, d + 0.05, 0.25, 1)
# civil apron stands (yellow lead-in lines and stop bars), along the apron in front of the terminal
ang = math.radians(63.5); ux, uy = math.cos(ang), math.sin(ang)          # long axis of the civil apron
stands = []
for k in range(4):
    cx, cy = -1990 + ux * (-45 + k * 32), 3700 + uy * (-45 + k * 32)
    stands.append([round(cx, 1), round(cy, 1)])
    for s in np.arange(-14, 26, 3): rect(cx + uy * s, cy - ux * s, uy, -ux, 3, 0.2, 1)
    rect(cx + uy * 26, cy - ux * 26, ux, uy, 6, 0.4, 1)

# ---------------- props ----------------
props = []
for k in range(5): props.append(['mast', round(-1990 + ux * (-61 + k * 32) - uy * 22, 1), round(3700 + uy * (-61 + k * 32) + ux * 22, 1), 1, 0])
props.append(['atr', stands[1][0] + uy * 6, stands[1][1] - ux * 6, 1, round(math.atan2(-ux, uy), 3)])
props.append(['jet', stands[3][0] + uy * 6, stands[3][1] - ux * 6, 1, round(math.atan2(-ux, uy) + 0.4, 3)])
props.append(['tower', -1968.0, 3826.0, 1, round(ang, 3)])
props.append(['windsock', -2050.0, 3560.0, 1, 0])
props.append(['windsock', -1560.0, 3590.0, 1, 0])
cars = []
_lanes = [(LineString(np.array(r_['pts'])[:, :2]), r_['w']) for r_ in F['roads'] if r_['cls'] not in ('footway', 'path', 'steps') and len(r_['pts']) > 1 and any(-2250 < q[0] < -1950 and 3700 < q[1] < 3990 for q in r_['pts'])]
rng = np.random.default_rng(4)
ca = math.radians(74); cu = (math.cos(ca), math.sin(ca)); cn = (-cu[1], cu[0])
for lot in ([(-2122, 3846), (-2118, 3812), (-2108, 3801), (-2068, 3800), (-2056, 3836), (-2100, 3852)],
            [(-2116, 3878), (-2092, 3922), (-2054, 3910), (-2050, 3862), (-2086, 3864), (-2110, 3858)]):
    pp = Path(lot)
    for row in range(-40, 40):
        for side in (0, 1):
            o = row * 12.5 + side * 5.2
            for s in np.arange(-80, 80, 2.6):
                x = -2088 + cn[0] * o + cu[0] * s; y = 3858 + cn[1] * o + cu[1] * s
                if pp.contains_point((x, y)) and pp.contains_point((x + cn[0] * 2.4 * (1 if side == 0 else -1), y + cn[1] * 2.4 * (1 if side == 0 else -1))) and rng.random() < 0.82:
                    if any(L_.distance(Point(x, y)) < w_ / 2 + 1.3 for L_, w_ in _lanes): continue   # not in an aisle or on a lane
                    cars.append([round(x, 2), round(y, 2), round(ca + math.pi / 2 + (rng.random() - 0.5) * 0.1, 3), int(rng.integers(8))])
print('airport: parked cars', len(cars))
json.dump({'paved': [{'kind': r['kind'], 'w': r['w'], 'pts': [[round(p[0], 1), round(p[1], 1)] for p in r['pts']]} for r in rws], 'aprons': [[[round(p[0], 1), round(p[1], 1)] for p in a['pts']] for a in aprons],
           'fence': fence, 'quads': quads, 'terminal': term, 'props': props, 'cars': cars, 'pyramid': [-2092.0, 3726.0]},
          open('web/assets/airport.json', 'w'), separators=(',', ':'))
