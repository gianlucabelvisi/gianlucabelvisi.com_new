"""Roads to double-check (2026-11-11): python3 suspicious_roads.py -> prep/suspicious_roads.json + .md
  steep      steeper than 22 % over 20 m on the island's own heights (often a road OSM draws straight up a slope)
  invisible  no trace of it on the Esri photo: the centre line looks like the ground 5 m either side (same brightness
             and greenness), so it may not exist as a drivable road
Nothing is deleted: the list is for review (in the map: debug mode, O = satellite photo, K = Street View)."""
import json, math, os, sys, functools
import numpy as np
from PIL import Image
sys.path.insert(0, 'sites')
from common import toLL, N18, make_hcubic
F = json.load(open('prep/features.json'))
G = dict(np.load('prep/grid_prep.npz')); h = make_hcubic(G)
@functools.lru_cache(maxsize=400)
def tile(a, b):
    f = f'data/esri/18_{a}_{b}.jpg'
    return np.asarray(Image.open(f).convert('RGB'), np.float32) / 255 if os.path.exists(f) else None
def rgb(X, Y):
    lon, lat = toLL.transform(X, Y); tx = (lon + 180) / 360 * N18; la = np.radians(lat); ty = (1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * N18
    out = np.full((len(X), 3), np.nan, np.float32)
    for k in range(len(X)):
        t = tile(int(tx[k]), int(ty[k]))
        if t is not None: out[k] = t[min(255, int((ty[k] % 1) * 256)), min(255, int((tx[k] % 1) * 256))]
    return out
from shapely.geometry import Polygon, Point
TZ = None
if os.path.exists('prep/town.json'): TZ = Polygon(json.load(open('prep/town.json'))['zone']).buffer(80)
rows = []
for r in F['roads']:
    if r['cls'] in ('footway', 'path', 'steps', 'cycleway', 'pedestrian') or len(r['pts']) < 2: continue
    P = np.array(r['pts'], float)[:, :2]; seg = np.hypot(*np.diff(P, axis=0).T); L = seg.sum()
    if L < 60: continue
    s = np.concatenate([[0], np.cumsum(seg)]); t = np.arange(0, L, 4.0)
    x, y = np.interp(t, s, P[:, 0]), np.interp(t, s, P[:, 1]); z = h(x, y)
    zs = np.convolve(z, np.ones(3) / 3, 'same') if len(z) > 3 else z
    grad = np.abs(zs[5:] - zs[:-5]) / 20 if len(zs) > 6 else np.array([0.0]); gi = int(np.argmax(grad)) if len(grad) else 0
    if len(grad) > 4: grad[:2] = 0; grad[-2:] = 0
    steep = float(grad.max()) if len(grad) else 0.0
    dx, dy = np.gradient(x), np.gradient(y); n_ = np.hypot(dx, dy) + 1e-9; nx_, ny_ = -dy / n_, dx / n_
    c = rgb(x, y); a = rgb(x + nx_ * 6, y + ny_ * 6); b = rgb(x - nx_ * 6, y - ny_ * 6)
    ok = ~np.isnan(c[:, 0]) & ~np.isnan(a[:, 0]) & ~np.isnan(b[:, 0])
    vis = None
    if ok.sum() > 8:
        lum = lambda q: q @ np.array([0.3, 0.59, 0.11]); grn = lambda q: q[:, 1] - (q[:, 0] + q[:, 2]) / 2
        side_l = (lum(a) + lum(b)) / 2; side_g = (grn(a) + grn(b)) / 2
        vis = float(np.median((np.abs(lum(c) - side_l) + np.maximum(side_g - grn(c), 0) * 2)[ok]))   # contrast of the centre line against its sides
    in_town = TZ is not None and TZ.contains(Point(float(x[len(x) // 2]), float(y[len(y) // 2])))
    why = []
    if steep > 0.22 and r['cls'] != 'track': why.append('steep %d %%' % round(steep * 100))
    if vis is not None and vis < 0.035 and not in_town: why.append('not visible on the photo (contrast %.3f)' % vis)
    if why:
        k = gi + 2 if 'steep' in why[0] else len(x) // 2; k = min(k, len(x) - 1)
        lon, lat = toLL.transform(float(x[k]), float(y[k]))
        rows.append({'id': r.get('id'), 'name': r.get('name') or '', 'cls': r['cls'], 'len': round(L), 'why': why, 'x': round(float(x[k])), 'y': round(float(y[k])), 'lat': round(lat, 6), 'lon': round(lon, 6), 'steep': round(steep, 3), 'vis': None if vis is None else round(vis, 3)})
rows.sort(key=lambda q: (-len(q['why']), -q['steep']))
json.dump(rows, open('prep/suspicious_roads.json', 'w'), indent=0)
with open('prep/suspicious_roads.md', 'w') as f:
    f.write('# Roads to double-check\n\n%d roads. Open the map link, turn on debug (G) and press O for the satellite photo.\n\n| Road | Kind | Length | Why | Map | Street View |\n|---|---|---|---|---|---|\n' % len(rows))
    for q in rows:
        f.write('| %s | %s | %d m | %s | [map](/pantelleria#%.5f,%.5f,250,0,55) | [view](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=%.6f,%.6f) |\n' % (q['name'] or 'unnamed (OSM %s)' % q['id'], q['cls'], q['len'], '; '.join(q['why']), q['lat'], q['lon'], q['lat'], q['lon']))
print('suspicious roads:', len(rows), '· steep', sum('steep' in ' '.join(q['why']) for q in rows), '· invisible', sum('visible' in ' '.join(q['why']) for q in rows))
