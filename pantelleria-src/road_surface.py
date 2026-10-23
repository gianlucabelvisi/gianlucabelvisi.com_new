"""Road surfaces: OSM `surface` where tagged, otherwise read from Esri z18 imagery along the centreline.
python3 road_surface.py   (needs data/esri/*.jpg, data/osm_roads.json, prep/features.json)
Writes data/road_surface.json {osm_id: "asphalt" | "unpaved" | "paved"}.

Asphalt on Pantelleria is dark grey and unsaturated; dirt tracks are tan/ochre (warm, brighter);
concrete/paved lanes are light grey. Sample a few pixels across the road every ~3 m and take medians.
"""
import glob, json, math, os, re
import numpy as np
from PIL import Image
from pyproj import Transformer

ESRI = os.environ.get('ESRI', 'data/esri')
LOCAL = '+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m'
to_ll = Transformer.from_crs(LOCAL, 'EPSG:4326', always_xy=True)
N = 2 ** 18
cache = {}
def tile(x, y):
    k = (x, y)
    if k not in cache:
        f = f'{ESRI}/18_{x}_{y}.jpg'
        try: cache[k] = np.asarray(Image.open(f).convert('RGB')).astype(np.float32) / 255 if os.path.getsize(f) > 2000 else None
        except Exception: cache[k] = None
        v = cache[k]
        if len(cache) > 3000: cache.clear()
        return v
    return cache[k]
def sample(xs, ys):
    lon, lat = to_ll.transform(xs, ys)
    gx = (np.asarray(lon) + 180) / 360 * N * 256
    gy = (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * N * 256
    out = []
    for a, b in zip(gx, gy):
        t = tile(int(a // 256), int(b // 256))
        if t is None: continue
        # OSM centrelines are often a metre or two off the imagery: take the least saturated pixel within ~2 m
        yy, xx = int(b % 256), int(a % 256)
        win = t[max(yy - 4, 0):yy + 5, max(xx - 4, 0):xx + 5].reshape(-1, 3)
        mx = win.max(1); mn = win.min(1); sat = (mx - mn) / np.maximum(mx, 1e-3)
        out.append(win[np.argmin(sat + (win.mean(1) < 0.12) * 1.0)])
    return np.array(out)

TAG = {'asphalt': 'asphalt', 'paved': 'asphalt', 'concrete': 'paved', 'paving_stones': 'paved', 'sett': 'paved',
       'unpaved': 'unpaved', 'dirt': 'unpaved', 'ground': 'unpaved', 'gravel': 'unpaved', 'compacted': 'unpaved', 'rock': 'unpaved', 'earth': 'unpaved'}
osm = {e['id']: e['tags'] for e in json.load(open('data/osm_roads.json'))['elements']}
F = json.load(open('prep/features.json'))
res, stats = {}, {}
for r in F['roads']:
    t = osm.get(r['id'], {})
    s = TAG.get(t.get('surface', ''))
    if s is None and r['cls'] in ('secondary', 'tertiary'): s = 'asphalt'
    if s is None and r['cls'] in ('footway', 'path', 'steps'): s = 'paved' if r['cls'] == 'steps' else 'unpaved'
    if s is None:
        P = np.array([p[:2] for p in r['pts']])
        if len(P) < 2: continue
        P = P[::max(1, len(P) // 60)]
        px = sample(P[:, 0], P[:, 1])
        if len(px) < 3: s = 'asphalt' if r['cls'] in ('unclassified', 'residential') else 'unpaved'
        else:
            mx = px.max(1); mn = px.min(1); lum = px @ np.array([0.299, 0.587, 0.114])
            sat = np.median((mx - mn) / np.maximum(mx, 1e-3)); L = np.median(lum); warm = np.median(px[:, 0] - px[:, 2])
            if sat < 0.13 and L < 0.55: s = 'asphalt'
            elif sat < 0.10 and L >= 0.55: s = 'paved'
            else: s = 'unpaved'
            if r['cls'] == 'track' and s == 'asphalt' and sat > 0.09: s = 'unpaved'
    res[r['id']] = s
    stats[(r['cls'], s)] = stats.get((r['cls'], s), 0) + 1
json.dump({str(k): v for k, v in res.items()}, open('data/road_surface.json', 'w'))
for k in sorted(stats): print(k, stats[k])
