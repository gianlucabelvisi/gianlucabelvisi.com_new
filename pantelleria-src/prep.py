"""Pantelleria: raw data -> model inputs (plain python, no Blender).

Inputs (data/):  dem10.tif (TINITALY 1.1, UTM32 10 m), s2_mosaic.png (EOX s2cloudless 2024, z15 3857 mosaic),
                 osm_roads.json, osm_buildings.json, osm_land.json, osm_poi.json (Overpass 'out geom')
Outputs (prep/): grid.npz (height grid in local metres), terrain.png (colour texture), coast.png (sea depth/foam),
                 features.json (roads, buildings, water, piers, runway, trees, labels) all in local metres.

Local frame: transverse Mercator centred on the island, x = east, y = north, z = up (metres). Blender uses it as is.
"""
import json, math, os, sys
import numpy as np
import rasterio
from pyproj import Transformer
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

D = 'data'; O = 'prep'; os.makedirs(O, exist_ok=True)
LAT0, LON0 = 36.785, 11.99
LOCAL = f'+proj=tmerc +lat_0={LAT0} +lon_0={LON0} +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m'
to_local = Transformer.from_crs('EPSG:4326', LOCAL, always_xy=True)
to_ll = Transformer.from_crs(LOCAL, 'EPSG:4326', always_xy=True)
ll_to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32632', always_xy=True)

# ---------- grid ----------
CELL = 10.0
X0, X1, Y0, Y1 = -7600.0, 7600.0, -6400.0, 7000.0     # local bounds (island + ~0.8 km sea)
NX = int((X1 - X0) / CELL) + 1; NY = int((Y1 - Y0) / CELL) + 1
gx = X0 + np.arange(NX) * CELL; gy = Y0 + np.arange(NY) * CELL
GX, GY = np.meshgrid(gx, gy)                             # [row=y, col=x]
lon, lat = to_ll.transform(GX, GY)

def bilinear(img, fx, fy, nodata=None):
    h, w = img.shape[:2]
    x0 = np.clip(np.floor(fx).astype(int), 0, w - 2); y0 = np.clip(np.floor(fy).astype(int), 0, h - 2)
    tx = np.clip(fx - x0, 0, 1); ty = np.clip(fy - y0, 0, 1)
    if img.ndim == 3: tx = tx[..., None]; ty = ty[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty

# DEM
r = rasterio.open(os.path.join(D, 'dem10.tif'))
dem = r.read(1).astype(np.float64); sea_src = (dem == r.nodata) | (dem < -50)
ux, uy = ll_to_utm.transform(lon, lat)
fx = (ux - r.bounds.left) / 10.0 - 0.5; fy = (r.bounds.top - uy) / 10.0 - 0.5
landf = bilinear((~sea_src).astype(np.float64), fx, fy)
demf = dem.copy(); demf[sea_src] = 0
z = bilinear(demf, fx, fy)
land = landf > 0.5
# smooth TIN facets (sigma ~1 cell) without dragging cliffs into the sea
w = ndimage.gaussian_filter(land.astype(float), 1.0)
zs = ndimage.gaussian_filter(np.where(land, z, 0), 1.0) / np.maximum(w, 1e-6)
z = np.where(land, zs, 0.0)
# ---- coastline from OSM (precise), signed distance at 2.5 m ----
from shapely.geometry import LineString as _LS
from shapely.ops import linemerge as _lm, polygonize as _pz, unary_union as _uu
from rasterio.features import rasterize as _rz
from affine import Affine as _Af
_land_el = json.load(open(os.path.join(D, 'osm_land.json')))['elements']
_cl = []
for e in _land_el:
    if e['tags'].get('natural') == 'coastline' and e['type'] == 'way':
        xy = np.array(to_local.transform([g['lon'] for g in e['geometry']], [g['lat'] for g in e['geometry']])).T
        _cl.append(_LS(xy))
ISLAND = _uu([p for p in _pz(_lm(_cl)) if p.area > 50])
F4 = 4; RES = CELL / F4
HI = _rz([(ISLAND, 1)], out_shape=(NY * F4, NX * F4), transform=_Af(RES, 0, X0 - CELL / 2, 0, RES, Y0 - CELL / 2), fill=0, dtype='uint8').astype(bool)
SD_HI = (ndimage.distance_transform_edt(HI) - ndimage.distance_transform_edt(~HI)) * RES      # + inland, metres
sd = SD_HI[F4 // 2::F4, F4 // 2::F4][:NY, :NX]
land_dem = land
land = sd > 0
# land heights: smoothed DEM; where the DEM thinks it's sea but OSM says land, a low shelf
z = np.where(land, np.maximum(np.where(land_dem, z, 0.4), 0.4), 0.0)
# sea cells: continue the coastal slope so the z=0 contour (the waterline) follows the OSM coast smoothly
_, (ni, nj) = ndimage.distance_transform_edt(~land, return_indices=True)
k = np.clip(z[ni, nj] / np.maximum(sd[ni, nj], 2.0), 0.12, 3.0)
dist_sea = np.maximum(-sd, 0)
z_sea = np.minimum(np.clip(sd * k, -30, -0.15), -1.0 - np.minimum(dist_sea, 400) * 0.12 + 1.0)
z = np.where(land, z, z_sea)
print('grid', NX, NY, 'land km2', land.sum() * CELL * CELL / 1e6, 'max', z.max())

# ---------- features from OSM ----------
def P(lo, la):
    x, y = to_local.transform(lo, la); return [round(x, 2), round(y, 2)]
def geom(e):
    return [P(g['lon'], g['lat']) for g in e.get('geometry', []) if g]
def zat(x, y):
    fx = (np.asarray(x) - X0) / CELL; fy = (np.asarray(y) - Y0) / CELL
    return bilinear(z, fx, fy)

feat = {'frame': {'proj': LOCAL, 'x0': X0, 'y0': Y0, 'cell': CELL, 'nx': NX, 'ny': NY}}

# roads
ROADW = {'trunk': 8, 'primary': 7.5, 'secondary': 7, 'tertiary': 6, 'unclassified': 5, 'residential': 4.5,
         'living_street': 4, 'pedestrian': 4, 'service': 3.5, 'track': 3, 'footway': 1.6, 'path': 1.4,
         'steps': 1.6, 'cycleway': 2}
roads = []
for e in json.load(open(os.path.join(D, 'osm_roads.json')))['elements']:
    t = e['tags']; hw = t.get('highway')
    if hw not in ROADW or e['type'] != 'way': continue
    pts = geom(e)
    if len(pts) < 2: continue
    # resample every 4 m
    res = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        L = math.dist(a, b); n = max(1, int(L / 4))
        for k in range(1, n + 1):
            res.append([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n])
    res = np.array(res)
    zz = zat(res[:, 0], res[:, 1])
    if len(zz) > 5:   # roads are graded: smooth along the line
        zz = ndimage.gaussian_filter1d(zz, 2.0, mode='nearest')
    roads.append({'id': e['id'], 'cls': hw, 'w': float(t.get('width', ROADW[hw])) if str(t.get('width', '')).replace('.', '').isdigit() else ROADW[hw],
                  'name': t.get('name', ''), 'ref': t.get('ref', ''), 'bridge': t.get('bridge') == 'yes', 'tunnel': t.get('tunnel') == 'yes',
                  'pts': [[round(p[0], 2), round(p[1], 2), round(float(h), 2)] for p, h in zip(res, zz)]})
feat['roads'] = roads
print('roads', len(roads))

# carve the road bed into the terrain so ribbons sit on it
road_z = np.full(z.shape, np.nan); road_wt = np.zeros(z.shape)
for rd in roads:
    hw = rd['w'] / 2 + 6
    for x, y, h in rd['pts']:
        i0 = int((y - Y0) / CELL); j0 = int((x - X0) / CELL)
        for i in range(i0 - 1, i0 + 3):
            for j in range(j0 - 1, j0 + 3):
                if not (0 <= i < NY and 0 <= j < NX): continue
                d = math.hypot(gx[j] - x, gy[i] - y)
                wgt = max(0.0, 1 - max(0, d - rd['w'] / 2) / 6)
                if wgt > road_wt[i, j]:
                    road_wt[i, j] = wgt; road_z[i, j] = h
m = road_wt > 0
z[m] = z[m] * (1 - road_wt[m]) + road_z[m] * road_wt[m]

# buildings
LEVEL_H = 3.2
town_polys = []
land_el = json.load(open(os.path.join(D, 'osm_land.json')))['elements']
def polys_of(e):
    if e['type'] == 'way': return [geom(e)]
    if e['type'] == 'relation':
        return [[P(g['lon'], g['lat']) for g in m_['geometry']] for m_ in e.get('members', []) if m_.get('role') == 'outer' and m_.get('geometry')]
    return []
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from shapely.prepared import prep as sprep
for e in land_el:
    if e['tags'].get('landuse') == 'residential':
        for p in polys_of(e):
            if len(p) > 3: town_polys.append(Polygon(p).buffer(0))
town = sprep(unary_union(town_polys)) if town_polys else None
from scipy.spatial import cKDTree
_bc = []
for e in json.load(open(os.path.join(D, 'osm_buildings.json')))['elements']:
    g = e.get('geometry') or []
    if g: _bc.append(P(sum(q['lon'] for q in g if q) / len(g), sum(q['lat'] for q in g if q) / len(g)))
_kd = cKDTree(np.array(_bc))
def dens(x, y): return len(_kd.query_ball_point([x, y], 70))
blds = []
for e in json.load(open(os.path.join(D, 'osm_buildings.json')))['elements']:
    t = e['tags']
    for p in polys_of(e):
        if len(p) < 4: continue
        if p[0] == p[-1]: p = p[:-1]
        poly = Polygon(p)
        if not poly.is_valid: poly = poly.buffer(0)
        if poly.area < 6 or poly.geom_type != 'Polygon': continue
        p = [[round(a, 2), round(b, 2)] for a, b in poly.exterior.coords[:-1]]
        if Polygon(p).exterior.is_ccw is False: p = p[::-1]
        arr = np.array(p); zz = zat(arr[:, 0], arr[:, 1]); c = poly.centroid
        if zat([c.x], [c.y])[0] < 0.3 and zz.max() < 0.5: continue    # in the sea (bad match)
        kind = t.get('building', 'yes')
        if kind in ('greenhouse',): h = 3.0
        elif kind in ('church', 'chapel', 'cathedral'): h = 9.0
        elif kind == 'ruins': h = 2.2
        elif kind == 'roof': h = 3.0
        elif 'height' in t:
            try: h = float(str(t['height']).split()[0])
            except ValueError: h = 4
        elif 'building:levels' in t:
            try: h = float(t['building:levels']) * LEVEL_H + 0.6
            except ValueError: h = 4
        else:
            in_town = (town is not None and town.contains(c)) or dens(c.x, c.y) >= 14
            h = (6.6 if poly.area > 60 else 3.8) if in_town else 3.6
            kind = 'town' if in_town else 'dammuso'
        blds.append({'id': e['id'], 'kind': kind, 'h': round(h, 2), 'zmin': round(float(zz.min()), 2), 'zmax': round(float(zz.max()), 2),
                     'name': t.get('name', ''), 'pts': p})
feat['buildings'] = blds
print('buildings', len(blds), 'town', sum(b['kind'] == 'town' for b in blds))

# water, piers, runway, pools, woods (-> trees)
water, piers, runway, pools, aprons = [], [], [], [], []
tree_polys = []; scrub_polys = []; vine_polys = []
for e in land_el:
    t = e['tags']
    if t.get('natural') == 'water' or 'water' in t:
        for p in polys_of(e):
            if len(p) > 3:
                arr = np.array(p); water.append({'name': t.get('name', ''), 'kind': t.get('water', 'water'), 'z': round(float(np.percentile(zat(arr[:, 0], arr[:, 1]), 20)), 2), 'pts': p})
    if t.get('man_made') in ('pier', 'breakwater'):
        g = geom(e)
        if len(g) > 1: piers.append({'kind': t['man_made'], 'closed': g[0] == g[-1] and len(g) > 3, 'pts': g})
    if t.get('aeroway') in ('runway', 'taxiway', 'apron'):
        g = geom(e)
        if len(g) > 1:
            (runway if t['aeroway'] != 'apron' else aprons).append({'kind': t['aeroway'], 'w': float(t.get('width', 45 if t['aeroway'] == 'runway' else 15)) if str(t.get('width', '')).replace('.', '').isdigit() else (45 if t['aeroway'] == 'runway' else 15), 'pts': g})
    if t.get('leisure') == 'swimming_pool':
        for p in polys_of(e):
            if len(p) > 3: pools.append(p)
    if t.get('natural') == 'wood' or t.get('landuse') == 'forest':
        tree_polys += [p for p in polys_of(e) if len(p) > 3]
    if t.get('natural') in ('scrub', 'heath'):
        scrub_polys += [p for p in polys_of(e) if len(p) > 3]
    if t.get('landuse') == 'vineyard':
        vine_polys += [p for p in polys_of(e) if len(p) > 3]
feat.update(water=water, piers=piers, runway=runway, aprons=aprons, pools=pools)

# ---------- colour texture from Sentinel-2 ----------
TEX = 4096
tx = np.linspace(X0, X1, TEX); ty = np.linspace(Y1, Y0, TEX)    # image row 0 = north
TX, TY = np.meshgrid(tx, ty)
tlon, tlat = to_ll.transform(TX, TY)
Z = 15; MX0, MY0 = 17467, 12770
n = 2 ** Z
px = ((tlon + 180) / 360 * n - MX0) * 256 - 0.5
py = ((1 - np.arcsinh(np.tan(np.radians(tlat))) / math.pi) / 2 * n - MY0) * 256 - 0.5
s2 = np.asarray(Image.open(os.path.join(D, 's2_mosaic.png')).convert('RGB')).astype(np.float32) / 255
col = bilinear(s2, px, py)
tland = bilinear(land.astype(np.float32), (TX - X0) / CELL, (TY - Y0) / CELL) > 0.5

# fill the sea (and dark sea-coloured fringe the DEM calls land) with the nearest land colour,
# so coastal triangles never pick up black water from the satellite image
col = np.clip(col, 0, 1)
lumr = col @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
near_coast = ndimage.distance_transform_edt(tland) < 12          # ~45 m inside the DEM coastline
seaish = (~tland) | (near_coast & (col[..., 2] > col[..., 0]) & (lumr < 0.13))
_, (ri, rj) = ndimage.distance_transform_edt(seaish, return_indices=True)
col = col[ri, rj]

# grade: S2 cloudless is dark and hazy; lift it into Mediterranean afternoon light
lum = col @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
lo, hi = np.percentile(lum[tland], [1, 99.5])
g = np.clip((col - lo) / (hi - lo), 0, 1) ** 0.78
gl = g @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
g = np.clip(gl[..., None] + (g - gl[..., None]) * 1.2, 0, 1)
photo = Image.fromarray((g * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))

# toon: k-means palette of the island's own colours, painted in flat patches
arr = np.asarray(photo.filter(ImageFilter.MedianFilter(5))).astype(np.float32)
samp = arr[tland][::61]
from scipy.cluster.vq import kmeans2
cent, _ = kmeans2(samp, 11, minit='++', seed=5)
flat = arr.reshape(-1, 3)
lab = np.empty(flat.shape[0], dtype=np.int32)
for s_ in range(0, flat.shape[0], 1 << 20):
    d = ((flat[s_:s_ + (1 << 20), None, :] - cent[None]) ** 2).sum(-1); lab[s_:s_ + (1 << 20)] = d.argmin(1)
lab = ndimage.median_filter(lab.reshape(TEX, TEX), 13)
# palette tune (HSV): lift the darks, cap saturation so the macchia stays olive, not neon
import colorsys
pal = []
for c in cent:
    h_, s_, v_ = colorsys.rgb_to_hsv(*(np.clip(c, 0, 255) / 255))
    v2 = 0.20 + 0.85 * v_ ** 0.9
    s2_ = min(0.52, s_ * 1.05) * (0.75 + 0.25 * v_)
    pal.append(np.array(colorsys.hsv_to_rgb(h_, s2_, min(v2, 0.97))) * 255)
pal = np.array(pal)
cl = cent @ np.array([0.2126, 0.7152, 0.0722])
toon = Image.fromarray(pal[lab].astype(np.uint8))

sc = (TEX - 1) / (X1 - X0); scy = (TEX - 1) / (Y1 - Y0)
def T(p): return ((p[0] - X0) * sc, (Y1 - p[1]) * scy)
ROADC = {'secondary': (92, 90, 88), 'tertiary': (100, 98, 95), 'unclassified': (108, 104, 100), 'residential': (118, 114, 108),
         'service': (150, 140, 125), 'track': (165, 145, 118), 'path': (178, 160, 132), 'footway': (178, 166, 150)}
def paint(im):
    dr = ImageDraw.Draw(im)
    for rw in runway + aprons:
        dr.line([T(p) for p in rw['pts']], fill=(120, 120, 118), width=max(1, int(rw['w'] * sc)), joint='curve')
    for rd in sorted(roads, key=lambda r: r['w']):
        c = ROADC.get(rd['cls'], (140, 132, 120))
        dr.line([T(p) for p in rd['pts']], fill=c, width=max(1, int(round((rd['w'] + 1.0) * sc))), joint='curve')
    for p in pools:
        dr.polygon([T(q) for q in p], fill=(70, 190, 215))
    return im
paint(photo).save(os.path.join(O, 'terrain_photo.png'))
paint(toon).save(os.path.join(O, 'terrain.png'))
toon.resize((1024, 1024)).save(os.path.join(O, 'terrain_small.jpg'))

# sea texture: distance to coast in metres /600 (R), 2048 px from a 5 m land mask
dl = np.maximum(-SD_HI[::2, ::2], 0)
cimg = np.clip(ndimage.gaussian_filter(dl, 2.0) / 600.0, 0, 1)
Image.fromarray((cimg[::-1] * 255).astype(np.uint8)).resize((2048, 2048), Image.BILINEAR).save(os.path.join(O, 'coast.png'))

# ---------- trees: scatter in woods (dense) and scrub (sparse), skip buildings/roads ----------
rng = np.random.default_rng(7)
def scatter(polys, spacing, kind):
    out = []
    for p in polys:
        poly = Polygon(p).buffer(0)
        if poly.is_empty: continue
        a, b, c, d = poly.bounds
        nn = int(poly.area / (spacing * spacing))
        if nn == 0: continue
        xs = rng.uniform(a, c, nn * 2); ys = rng.uniform(b, d, nn * 2)
        pp = sprep(poly)
        for x, y in zip(xs, ys):
            if len(out) and False: pass
            if pp.contains(Point(x, y)):
                i = int((y - Y0) / CELL); j = int((x - X0) / CELL)
                if road_wt[i, j] > 0.3: continue
                out.append([round(x, 1), round(y, 1), round(float(zat([x], [y])[0]), 1), kind, round(float(rng.uniform(0.75, 1.3)), 2)])
    return out
trees = scatter(tree_polys, 11, 0) + scatter(scrub_polys, 30, 1)
bpoly = sprep(unary_union([Polygon(b['pts']).buffer(1.5) for b in blds]))
trees = [t for t in trees if not bpoly.contains(Point(t[0], t[1]))]
feat['trees'] = trees
print('trees', len(trees))

# ---------- labels ----------
labels = []
def addl(name, x, y, kind, ele=None, prio=5):
    labels.append({'name': name, 'x': round(x, 1), 'y': round(y, 1), 'z': round(float(zat([x], [y])[0]), 1), 'kind': kind, 'ele': ele, 'prio': prio})
for e in land_el:
    t = e['tags']; nm = t.get('name')
    if not nm or e['type'] != 'node': continue
    x, y = P(e['lon'], e['lat'])
    if t.get('natural') in ('peak', 'volcano'):
        ele = t.get('ele'); addl(nm, x, y, 'peak', ele, 1 if nm == 'Montagna Grande' else (2 if ele and float(ele) > 500 else 4))
    elif t.get('natural') in ('cape',): addl(nm, x, y, 'cape', prio=6)
    elif t.get('natural') in ('bay', 'beach'): addl(nm, x, y, 'bay', prio=5)
    elif t.get('man_made') == 'lighthouse': addl(nm, x, y, 'poi', prio=5)
for wv in water:
    if wv['name']:
        a = np.array(wv['pts']); addl(wv['name'], a[:, 0].mean(), a[:, 1].mean(), 'water', prio=2)
poi_path = os.path.join(D, 'osm_poi.json')
if os.path.exists(poi_path):
    try:
        RANK = {'town': 0, 'village': 1, 'suburb': 2, 'hamlet': 3, 'neighbourhood': 3, 'locality': 5, 'isolated_dwelling': 7}
        for e in json.load(open(poi_path))['elements']:
            t = e['tags']; nm = t.get('name')
            c = e.get('center') or e
            if not nm or 'lon' not in c: continue
            x, y = P(c['lon'], c['lat'])
            if t.get('place') in RANK:
                pr = 0 if nm == 'Pantelleria' else RANK[t['place']]
                if nm in ('Tráçino', 'Khamma', 'Scauri', 'Rekhále'): pr = min(pr, 1)
                addl(nm, x, y, 'place' if pr < 5 else 'locality', prio=pr)
            elif t.get('place') == 'islet':
                addl(nm, x, y, 'cape', prio=5)
            elif t.get('tourism') in ('attraction', 'viewpoint') or t.get('historic') in ('archaeological_site', 'castle') or t.get('natural') == 'hot_spring':
                pr = 2 if nm in ("Arco dell'Elefante",) else 4
                addl(nm, x, y, 'poi', prio=pr)
    except Exception as ex:
        print('poi skipped', ex)
feat['labels'] = labels
print('labels', len(labels))

np.savez_compressed(os.path.join(O, 'grid.npz'), z=z.astype(np.float32), land=land, x0=X0, y0=Y0, cell=CELL)
json.dump(feat, open(os.path.join(O, 'features.json'), 'w'), separators=(',', ':'))
print('done')

# 16-bit heightmap for the web viewer (terrain mesh + ground queries): v = (z + 50) * 50, row 0 = north
hm = np.clip(np.round((z + 50.0) * 50.0), 0, 65535).astype(np.uint16)[::-1]
Image.fromarray(hm).save(os.path.join(O, 'height.png'))
print('heightmap', hm.shape)
