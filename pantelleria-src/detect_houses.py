"""Find houses that OpenStreetMap misses, from Esri World Imagery z18 tiles (approved for OSM tracing).
python3 detect_houses.py   (needs data/esri/18_x_y.jpg from fetch_esri.sh and prep/features.json)
Writes data/extra_buildings.json: [{"pts": [[x,y],...], "area": m2, "score": ...}] in the local frame.

Pantelleria roofs are white (dammusi domes, flat terraces), so: bright, unsaturated, compact blobs of
house size that don't touch an OSM building, road or pool. Footprint = minimum rotated rectangle of the blob.
"""
import glob, json, math, os, re
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from pyproj import Transformer
from shapely.geometry import Polygon, MultiPoint, LineString
from shapely.strtree import STRtree

LOCAL = '+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m'
to_local = Transformer.from_crs('EPSG:4326', LOCAL, always_xy=True)
Z = 18; N = 2 ** Z
tiles = {}
for f in glob.glob('data/esri/18_*_*.jpg'):
    m = re.search(r'18_(\d+)_(\d+)\.jpg', f)
    if os.path.getsize(f) > 2000: tiles[(int(m[1]), int(m[2]))] = f
xs = [k[0] for k in tiles]; ys = [k[1] for k in tiles]
TX0, TX1, TY0, TY1 = min(xs), max(xs), min(ys), max(ys)

F = json.load(open('prep/features.json'))
obst = [Polygon(b['pts']).buffer(3.5) for b in F['buildings']]   # roof parts of mapped houses are not new houses
for r in F['roads']:
    if len(r['pts']) > 1: obst.append(LineString([p[:2] for p in r['pts']]).buffer(r['w'] / 2 + 2.5))
for p in F['pools']:
    if len(p) > 3: obst.append(Polygon(p).buffer(1.5))
for rw in F['runway'] + F['aprons']:
    obst.append(LineString(rw['pts']).buffer(rw['w'] / 2 + 5))
tree = STRtree(obst)
_G = np.load('prep/grid.npz'); GX0, GY0, GC = float(_G['x0']), float(_G['y0']), float(_G['cell'])
LAND = ndimage.binary_erosion(_G['land'], iterations=2)

def px2local(gx, gy):   # global pixel coords at z18 -> local metres
    lon = gx / (N * 256) * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * gy / (N * 256)))))
    return to_local.transform(lon, lat)

found = []
B = 8   # tiles per block (+1 overlap)
for bx in range(TX0, TX1 + 1, B):
    for by in range(TY0, TY1 + 1, B):
        W = (B + 1) * 256
        im = np.zeros((W, W, 3), np.uint8); have = False
        for dx in range(B + 1):
            for dy in range(B + 1):
                f = tiles.get((bx + dx, by + dy))
                if f:
                    try: im[dy * 256:(dy + 1) * 256, dx * 256:(dx + 1) * 256] = np.asarray(Image.open(f).convert('RGB')); have = True
                    except Exception: pass
        if not have: continue
        a = im.astype(np.float32) / 255
        mx = a.max(2); mn = a.min(2); sat = (mx - mn) / np.maximum(mx, 1e-3)
        white = (mn > 0.66) & (sat < 0.17) & (a[..., 2] - a[..., 0] < 0.06)
        white = ndimage.binary_opening(white, iterations=1)
        white = ndimage.binary_closing(white, iterations=2)
        lab, nl = ndimage.label(white)
        lat_c = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (by + B / 2) / N))))
        mpp = 156543.03392 * math.cos(math.radians(lat_c)) / N
        for i, sl in enumerate(ndimage.find_objects(lab), 1):
            if sl is None: continue
            m = lab[sl] == i; npx = int(m.sum()); area = npx * mpp * mpp
            if area < 25 or area > 350: continue
            yy, xx = np.nonzero(m)
            gxs = (bx * 256 + sl[1].start + xx).astype(float); gys = (by * 256 + sl[0].start + yy).astype(float)
            cx, cy = gxs.mean(), gys.mean()
            # centre must lie in this block's own (non-overlap) area -> no duplicates
            if not (bx * 256 <= cx < (bx + B) * 256 and by * 256 <= cy < (by + B) * 256): continue
            # rectangle fit
            step = max(1, npx // 400)
            pts = [px2local(gx, gy) for gx, gy in zip(gxs[::step], gys[::step])]
            mrr = MultiPoint(pts).minimum_rotated_rectangle
            if mrr.geom_type != 'Polygon' or mrr.area <= 0: continue
            fill = area / mrr.area
            cs = list(mrr.exterior.coords)[:4]
            e1 = math.dist(cs[0], cs[1]); e2 = math.dist(cs[1], cs[2])
            aspect = max(e1, e2) / max(min(e1, e2), 0.1)
            if fill < 0.64 or aspect > 2.8 or min(e1, e2) < 3.5: continue
            # local contrast: roofs stand out from their surroundings
            pad = 6
            y0 = max(sl[0].start - pad, 0); y1 = min(sl[0].stop + pad, W); x0 = max(sl[1].start - pad, 0); x1 = min(sl[1].stop + pad, W)
            ring = np.ones((y1 - y0, x1 - x0), bool); ring[sl[0].start - y0:sl[0].stop - y0, sl[1].start - x0:sl[1].stop - x0] &= ~m
            if ring.sum() < 10: continue
            contrast = float(mn[sl][m].mean() - mx[y0:y1, x0:x1][ring].mean())
            if contrast < 0.16: continue
            ccx, ccy = mrr.centroid.x, mrr.centroid.y
            gi = int(round((ccy - GY0) / GC)); gj = int(round((ccx - GX0) / GC))
            if not (0 <= gi < LAND.shape[0] and 0 <= gj < LAND.shape[1]) or not LAND[gi, gj]: continue   # boats, harbour
            if any(o.intersects(mrr) for o in tree.geometries.take(tree.query(mrr))): continue
            found.append({'pts': [[round(x, 2), round(y, 2)] for x, y in cs], 'area': round(area, 1),
                          'score': round(contrast * fill, 3)})
print('extra houses', len(found))
json.dump(found, open('data/extra_buildings.json', 'w'))

# review sheets for the sample areas
areas = {'scauri': (36.7690, 11.9700), 'khamma': (36.8105, 12.0300), 'bukkuram': (36.7930, 11.9730), 'town': (36.8320, 11.9440), 'tracino': (36.7935, 12.0480)}
to_ll = Transformer.from_crs(LOCAL, 'EPSG:4326', always_xy=True)
def gpx(x, y):
    lon, lat = to_ll.transform(x, y)
    return (lon + 180) / 360 * N * 256, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * N * 256
for k, (la, lo) in areas.items():
    cx = int((lo + 180) / 360 * N); cy = int((1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * N)
    x0, y0 = cx - 2, cy - 2
    im = Image.new('RGB', (1280, 1280))
    for dx in range(5):
        for dy in range(5):
            f = tiles.get((x0 + dx, y0 + dy))
            if f: im.paste(Image.open(f), (dx * 256, dy * 256))
    d = ImageDraw.Draw(im)
    for b in F['buildings']:
        q = [gpx(*p) for p in b['pts']]; q = [(a - x0 * 256, c - y0 * 256) for a, c in q]
        if all(-20 < a < 1300 and -20 < c < 1300 for a, c in q): d.polygon(q, outline=(255, 60, 60))
    for b in found:
        q = [gpx(*p) for p in b['pts']]; q = [(a - x0 * 256, c - y0 * 256) for a, c in q]
        if all(-20 < a < 1300 and -20 < c < 1300 for a, c in q): d.polygon(q, outline=(0, 255, 255), width=3)
    im.resize((900, 900)).save(f'/tmp/extra_{k}.jpg', quality=85)
