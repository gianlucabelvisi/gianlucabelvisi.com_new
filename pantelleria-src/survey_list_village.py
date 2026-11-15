"""List village houses with a Street View viewpoint each: python3 survey_list_village.py X Y RADIUS tag
(buildings from prep/features.json within RADIUS of X, Y whose longest front faces a drivable road within 12 m)."""
import json, math, sys
from shapely.geometry import LineString, Polygon, Point
from shapely.ops import unary_union
from shapely.strtree import STRtree
from pyproj import Transformer
X, Y, R, tag = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
F = json.load(open('prep/features.json'))
tr = Transformer.from_crs('+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +ellps=WGS84', 'EPSG:4326', always_xy=True)
C = Point(X, Y)
roads = [LineString([p[:2] for p in r['pts']]) for r in F['roads'] if r['cls'] not in ('footway', 'path', 'steps', 'track') and r['w'] >= 2.4 and len(r['pts']) > 1]
RU = unary_union([l for l in roads if l.distance(C) < R + 60])
B = [(b, Polygon(b['pts'])) for b in F['buildings'] if len(b['pts']) >= 3 and math.hypot(b['pts'][0][0] - X, b['pts'][0][1] - Y) < R + 40]
tree = STRtree([p for _, p in B])
out = []
for bi, (b, poly) in enumerate(B):
    if poly.distance(C) > R or poly.distance(RU) > 12: continue
    pts = b['pts'] if poly.exterior.is_ccw else b['pts'][::-1]; best = None
    for i in range(len(pts)):
        a, c = pts[i], pts[(i + 1) % len(pts)]; L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 6: continue
        m = ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2); n = ((c[1] - a[1]) / L, -(c[0] - a[0]) / L)
        ray = LineString([(m[0] + n[0] * 0.5, m[1] + n[1] * 0.5), (m[0] + n[0] * 14, m[1] + n[1] * 14)]); hit = ray.intersection(RU)
        if hit.is_empty: continue
        d = Point(m).distance(hit); seg = LineString([ray.coords[0], (m[0] + n[0] * d, m[1] + n[1] * d)])
        if any(j != bi and B[j][1].intersects(seg) for j in tree.query(seg)): continue
        if best is None or L > best[0]: best = (L, m, n, d)
    if best:
        L, m, n, d = best; lon, lat = tr.transform(m[0] + n[0] * d, m[1] + n[1] * d)
        out.append(dict(id=b['id'], kind=b['kind'], h=b['h'], L=round(L, 1), d=round(d, 1), lat=round(lat, 6), lon=round(lon, 6), heading=round((math.degrees(math.atan2(-n[0], -n[1])) + 360) % 360), x=round(m[0]), y=round(m[1])))
out.sort(key=lambda o: -o['L'])
json.dump(out, open('snip/survey_' + tag + '.json', 'w'))
print(len(out), 'houses')
for o in out[:int(sys.argv[5]) if len(sys.argv) > 5 else 30]: print(o['id'], o['kind'], 'h', o['h'], 'L', o['L'], 'd', o['d'], o['lat'], o['lon'], o['heading'])
