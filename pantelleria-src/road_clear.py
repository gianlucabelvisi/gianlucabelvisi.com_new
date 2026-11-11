"""Nothing stands on a carriageway (2026-11-08): trees on a drivable road are dropped; building footprints that reach
onto one are trimmed back to the road edge (+0.3 m) — a sliver left under 6 m² is dropped. Applies to
prep/features.json (buildings, trees) and prep/town.json (town blocks). Runs after the sites, before ground_fix.py."""
import json, numpy as np
from shapely.geometry import LineString, Point, Polygon, MultiPolygon
from shapely.strtree import STRtree
from shapely.ops import unary_union
F = json.load(open('prep/features.json'))
DRIVE = lambda r: r['cls'] not in ('footway', 'path', 'steps', 'cycleway', 'pedestrian', 'track') and len(r['pts']) > 1
G = [LineString(np.array(r['pts'])[:, :2]).buffer(r['w'] / 2 + 0.3, cap_style=2) for r in F['roads'] if DRIVE(r)]
T = STRtree(G)
n0 = len(F['trees'])
F['trees'] = [t for t in F['trees'] if not any(G[k].buffer(-0.5).contains(Point(t[0], t[1])) for k in T.query(Point(t[0], t[1])))]
def trim(pts):
    try: P = Polygon(np.array(pts)[:, :2]).buffer(0)
    except Exception: return pts, False
    hit = [G[k] for k in T.query(P) if G[k].intersection(P).area > 0.5]
    if not hit: return pts, False
    Q = P.difference(unary_union(hit))
    if isinstance(Q, MultiPolygon): Q = max(Q.geoms, key=lambda g: g.area)
    if Q.is_empty or Q.area < 6: return None, True
    Q = Q.simplify(0.15)
    z = [p[2] for p in pts if len(p) > 2]
    c = [[round(x, 2), round(y, 2)] + ([round(float(np.mean(z)), 2)] if z else []) for x, y in list(Q.exterior.coords)[:-1]]
    return c, True
nt = nd = 0; out = []
for b in F['buildings']:
    p, ch = trim(b['pts'])
    if p is None: nd += 1; continue
    if ch: nt += 1; b['pts'] = p
    out.append(b)
F['buildings'] = out
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
TJ = json.load(open('prep/town.json')); tt = td = 0; ob = []
for b in TJ['blds']:
    p, ch = trim(b['pts'])
    if p is None: td += 1; continue
    if ch: tt += 1; b['pts'] = [q[:2] for q in p]
    ob.append(b)
TJ['blds'] = ob
json.dump(TJ, open('prep/town.json', 'w'), separators=(',', ':'))
print('road_clear: trees dropped', n0 - len(F['trees']), '· buildings trimmed', nt, 'dropped', nd, '· town blocks trimmed', tt, 'dropped', td)
