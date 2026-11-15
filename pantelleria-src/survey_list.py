import json, math, sys
import numpy as np
from shapely.geometry import LineString, Polygon, Point
from shapely.ops import unary_union, nearest_points
from pyproj import Transformer
names = sys.argv[1].split('|')
T = json.load(open('prep/town.json')); F = json.load(open('prep/features.json'))
tr = Transformer.from_crs('+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +ellps=WGS84', 'EPSG:4326', always_xy=True)
roads = [LineString([p[:2] for p in r['pts']]) for r in F['roads'] if r.get('name') in names]
print('ways', len(roads), 'length', round(sum(r.length for r in roads)), file=sys.stderr)
RU = unary_union(roads)
B = [(b, Polygon(b['pts'])) for b in T['blds']]
out = []
for b, poly in B:
    if poly.distance(RU) > 30: continue
    pts = b['pts']; best = None
    if Polygon(pts).exterior.is_ccw is False: pts = pts[::-1]
    for i in range(len(pts)):
        a, c = pts[i], pts[(i + 1) % len(pts)]; L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 3: continue
        m = ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2); n = ((c[1] - a[1]) / L, -(c[0] - a[0]) / L)
        ray = LineString([(m[0] + n[0] * 0.5, m[1] + n[1] * 0.5), (m[0] + n[0] * 32, m[1] + n[1] * 32)])
        hit = ray.intersection(RU)
        if hit.is_empty: continue
        d = Point(m).distance(hit)
        if any(p2.intersects(LineString([ray.coords[0], (m[0] + n[0] * d, m[1] + n[1] * d)])) for b2, p2 in B if b2 is not b): continue
        if best is None or L > best[0]: best = (L, m, n, d)
    if best:
        L, m, n, d = best; vp = (m[0] + n[0] * d, m[1] + n[1] * d)
        lon, lat = tr.transform(*vp); hd = (math.degrees(math.atan2(-n[0], -n[1])) + 360) % 360
        out.append(dict(id=b['id'], kind=b['kind'], st=b['st'], col=b['col'], h=b['h'], L=round(L, 1), d=round(d, 1), lat=round(lat, 6), lon=round(lon, 6), heading=round(hd), x=round(m[0]), y=round(m[1]), pois=[p['name'] for p in T['pois'] if poly.distance(Point(p['x'], p['y'])) < 6]))
out.sort(key=lambda o: (o['x'], o['y']))
json.dump(out, open('snip/survey_' + sys.argv[2] + '.json', 'w'), indent=0)
for o in out: print(o['id'], o['kind'], 'st', o['st'], 'col', o['col'], 'L', o['L'], 'd', o['d'], o['lat'], o['lon'], o['heading'], o['pois'])
