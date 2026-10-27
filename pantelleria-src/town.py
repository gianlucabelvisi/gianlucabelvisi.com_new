"""Pantelleria town centre (zone 1): python3 town.py   (after prep.py, before build.py)
Reads prep/features.json, prep/grid.npz, data/osm_town.json, data/osm_land.json.
Writes prep/town.json for the viewer (and build.py skips the buildings listed in it):
  zone       outline of the town zone
  blds       town buildings: pts, z (base), h, storeys, col (palette index), kind (house | castle | church | townhall | hotel)
  pois       named bars, restaurants, cafés, shops, squares, quays, landmarks (labels)
  boats      [x, y, heading, type, colour]  type 0 gozzo, 1 fishing boat, 2 sailboat, 3 motor yacht
  ferry      [x, y, heading]
  palms, lamps  [x, y]
  cafes      [x, y, heading, colour]  table + umbrella sets in front of bars and restaurants
  piazzas    paved pedestrian areas (polygons)
Also patches prep/coast.png so the harbour basins read as deep water (no shallow band / foam inside the moles).
"""
import os
import json, math, os
import numpy as np
from PIL import Image
from pyproj import Transformer
from shapely.geometry import Polygon, Point, LineString, MultiPolygon
from shapely.ops import unary_union, nearest_points
from shapely.prepared import prep as sprep
from scipy.spatial import cKDTree

LOCAL = '+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m'
T = Transformer.from_crs('EPSG:4326', LOCAL, always_xy=True)
F = json.load(open('prep/features.json'))
G = np.load('prep/grid.npz'); Z = G['z']; X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell'])
NY, NX = Z.shape
def zat(x, y):
    fx = min(max((x - X0) / CELL, 0), NX - 1.001); fy = min(max((y - Y0) / CELL, 0), NY - 1.001)
    j, i = int(fx), int(fy); tx, ty = fx - j, fy - i
    return float((Z[i, j] * (1 - tx) + Z[i, j + 1] * tx) * (1 - ty) + (Z[i + 1, j] * (1 - tx) + Z[i + 1, j + 1] * tx) * ty)
rng = np.random.default_rng(42)
def h01(*a):
    v = 0
    for k in a: v = (v * 1000003 + int(k * 7919)) & 0xFFFFFFFF
    v ^= v >> 13; v = (v * 1274126177) & 0xFFFFFFFF; v ^= v >> 16
    return v / 4294967296

TE = json.load(open('data/osm_town.json'))['elements']
LE = json.load(open('data/osm_land.json'))['elements']
def P(lo, la): x, y = T.transform(lo, la); return (x, y)
def geom(e): return [P(g['lon'], g['lat']) for g in e.get('geometry', []) if g]
def poly(e):
    g = geom(e)
    if len(g) < 4: return None
    p = Polygon(g).buffer(0)
    return None if p.is_empty else p

# ---------- zone ----------
CEN = (-4150.0, 5120.0)
blds = F['buildings']
cents = np.array([Polygon(b['pts']).centroid.coords[0] for b in blds])
kd = cKDTree(cents)
cnt = np.array([len(kd.query_ball_point(c, 60)) for c in cents])
core = [Polygon(b['pts']).buffer(38) for b, c, n in zip(blds, cents, cnt) if n >= 5 and math.dist(c, CEN) < 1000]
zone = unary_union(core).buffer(-22)
if zone.geom_type == 'MultiPolygon': zone = max(zone.geoms, key=lambda p: p.area)
zone = Polygon(zone.exterior).simplify(4)
zp = sprep(zone)
print('town zone km2', round(zone.area / 1e6, 2))

# ---------- landmarks ----------
SPECIAL = {28519982: 'castle', 310343616: 'church', 238924049: 'lava'}
# hand corrections from Street View: Pasticceria/Gelateria Katia on the Lungomare is a single-storey lava-stone building
# with big arched openings (the hotel behind it is a separate building)
STOREYS = {238924049: 1}
# Street View pass, 2026-10-27 (town centre): heights, styles and what a footprint really is
OVR = {
    1847266: dict(kind='hospital', st=3),        # Ospedale Bernardo Nagar: dark-red facade, arched lunettes, glazed ground floor
    810859968: dict(kind='risacca', st=1),       # La Risacca: old lava-stone vaulted warehouse, glass-enclosed terrace on top
    310343615: dict(st=5, col=0, style=1),       # Blue Moon Hotel / Blu Bar / Zaza block: white, blue pilasters, stone ground floor
    238574871: dict(st=6, col=1, style=2),       # Yacht Marina Hotel: cream, arched windows, striped ground floor
    3237373: dict(st=6, col=0, style=3),         # Khamma Hotel: white, balconies on every floor, arcade
    310343618: dict(st=2, col=2),                # Da Zaza / Bazar: ochre, two storeys, striped awning
    309985043: dict(kind='site'),                # Tiffany: demolished, a building site for now
    309985044: dict(st=5, col=8, style=3),       # the green five-storey with balconies (Mini Market)
    718864153: dict(kind='veranda', seats=1),    # Tikirriki: white canopy veranda, green trim, tables
    718864154: dict(kind='veranda', seats=1),    # Alchimia: same
    418369875: dict(kind='veranda', seats=0),    # Policardo (closed): an empty veranda on the pier corner
    239086019: dict(kind='kiosk'),               # tourist info kiosk: a brown timber box on the banchina
    238571920: dict(st=5), 238571915: dict(st=5), 238571914: dict(st=5), 238574869: dict(st=4),   # Via Borgo Italia: tall, narrow
}
townhall_pt = None; pois = []
KIND = {'restaurant': 'food', 'bar': 'bar', 'cafe': 'bar', 'pub': 'bar', 'ice_cream': 'bar', 'fast_food': 'food', 'pharmacy': 'shop',
        'bank': 'shop', 'townhall': 'civic', 'ferry_terminal': 'port', 'post_office': 'shop', 'police': 'civic'}
for e in TE:
    t = e.get('tags', {}); nm = t.get('name')
    if not nm: continue
    if 'lon' in e: x, y = P(e['lon'], e['lat'])
    else:
        g = geom(e)
        if not g: continue
        x, y = float(np.mean([q[0] for q in g])), float(np.mean([q[1] for q in g]))
    if not zp.contains(Point(x, y)) and math.dist((x, y), CEN) > 700: continue
    k = None
    if t.get('amenity') in KIND: k = KIND[t['amenity']]
    elif t.get('tourism') == 'hotel': k = 'hotel'
    elif 'shop' in t: k = 'shop'
    elif t.get('place') == 'square' or (t.get('highway') == 'pedestrian' and t.get('area') == 'yes'): k = 'square'
    elif t.get('highway') == 'pedestrian' and nm.startswith('Banchina'): k = 'quay'
    elif t.get('leisure') == 'marina': k = 'port'
    elif t.get('historic') == 'castle': k = 'landmark'
    if not k: continue
    if t.get('amenity') == 'townhall': townhall_pt = (x, y)
    pois.append({'name': nm, 'x': round(x, 1), 'y': round(y, 1), 'z': round(zat(x, y), 1), 'kind': k})
pois.append({'name': 'Chiesa Madre', 'x': -4076.0, 'y': 5176.0, 'z': round(zat(-4076, 5176), 1), 'kind': 'landmark'})
pois.append({'name': 'Castello Barbacane', 'x': -4146.0, 'y': 5152.0, 'z': round(zat(-4146, 5152), 1), 'kind': 'landmark'})
pois = [p for p in pois if p['name'] != 'Castello de Pantelleria']
print('pois', len(pois))

# ---------- town buildings ----------
PAL_W = [('white', 34), ('cream', 22), ('ochre', 11), ('pink', 8), ('sand', 12), ('grey', 6), ('blue', 4), ('terracotta', 3)]
PAL = [p for p, _ in PAL_W]; PW = np.array([w for _, w in PAL_W], float); PW /= PW.sum()
osm_tags = {e['id']: e.get('tags', {}) for e in TE if e['type'] == 'way'}
out_b = []
for b, c in zip(blds, cents):
    if not zp.contains(Point(c)) and b['id'] not in SPECIAL and b['id'] not in OVR: continue
    pg = Polygon(b['pts']); area = pg.area
    t = osm_tags.get(b['id'], {})
    kind = SPECIAL.get(b['id'], 'house')
    if townhall_pt and pg.buffer(3).contains(Point(townhall_pt)): kind = 'townhall'
    if t.get('building') == 'hotel' or t.get('tourism') == 'hotel': kind = 'hotel'
    if t.get('building') in ('greenhouse', 'ruins', 'roof') and b['id'] not in OVR: continue
    r = h01(c[0], c[1])
    dcen = math.dist(c, CEN)
    if 'st' in b: st = int(b['st'])
    elif 'building:levels' in t and str(t['building:levels']).isdigit(): st = int(t['building:levels'])
    elif 'height' in t:
        try: st = max(1, round(float(str(t['height']).split()[0]) / 3.1))
        except ValueError: st = 2
    elif area < 35: st = 1
    elif area < 80: st = 1 + (r > 0.35)
    else:
        st = 2 + (r > 0.45) + (r > 0.85)
        if dcen < 380 and area > 150: st += 1
        if t.get('building') == 'apartments': st = max(st, 4)
    st = int(min(st, 6))
    st = STOREYS.get(b['id'], st)
    ov = OVR.get(b['id'], {})
    kind = ov.get('kind', kind); st = ov.get('st', st)
    zmin = min(zat(x, y) for x, y in b['pts'])
    zmax = max(zat(x, y) for x, y in b['pts'])
    h = st * 3.1 + 0.6
    if kind == 'castle': h = 15.0
    if kind == 'church': h = 13.0
    col = int(rng.choice(len(PAL), p=PW))
    if kind in ('castle', 'church', 'lava'): col = -1
    if kind == 'lava': h = 4.6
    if 'col' in ov: col = ov['col']
    if kind in ('veranda', 'kiosk', 'site', 'risacca'): col = -1; h = {'veranda': 2.9, 'kiosk': 3.0, 'site': 2.2, 'risacca': 4.8}[kind]
    if kind == 'hospital': col = -1
    ob = {'id': b['id'], 'kind': kind, 'pts': [[round(x, 2), round(y, 2)] for x, y in b['pts']], 'z': round(zmin - 0.4, 2),
          'zt': round(zmax, 2), 'h': round(h, 2), 'st': st, 'col': col}
    if ov.get('style'): ob['style'] = ov['style']
    if 'seats' in ov: ob['seats'] = ov['seats']
    out_b.append(ob)
# Pasticceria da Giovanni: its tables are across the road on Piazza Cavour, under a patio roof (traced on the imagery)
_gv = [[-3984.6, 5189.5], [-3978.9, 5187.3], [-3981.1, 5180.3], [-3986.4, 5182.1]]
out_b.append({'id': -900001, 'kind': 'veranda', 'pts': _gv, 'z': round(min(zat(*p) for p in _gv) - 0.4, 2), 'zt': round(max(zat(*p) for p in _gv), 2),
              'h': 2.9, 'st': 1, 'col': -1, 'seats': 1})
print('town buildings', len(out_b), {k: sum(b['kind'] == k for b in out_b) for k in ('castle', 'church', 'townhall', 'hotel')})

# ---------- harbour: water polygons, boats, ferry ----------
land_parts = []
for e in LE:
    t = e['tags']
    if t.get('man_made') in ('pier', 'breakwater') and e['type'] == 'way':
        g = geom(e)
        if len(g) > 3 and g[0] == g[-1]: land_parts.append(Polygon(g).buffer(0))
        elif len(g) > 1: land_parts.append(LineString(g).buffer(2.5 if t['man_made'] == 'pier' else 3.5))
# island polygon from the grid (land mask, 10 m) is too coarse here: use OSM coastline ways
cl = []
from shapely.ops import linemerge, polygonize
for e in LE:
    if e['tags'].get('natural') == 'coastline' and e['type'] == 'way':
        cl.append(LineString(geom(e)))
island = unary_union([p for p in polygonize(linemerge(cl)) if p.area > 50])
land = unary_union([island] + land_parts)
bays = {}
for e in LE:
    nm = e['tags'].get('name')
    if e['tags'].get('natural') == 'bay' and nm in ('Porto Vecchio', 'Porto Nuovo') and e['type'] == 'way':
        p = poly(e)
        if p is not None: bays[nm] = p
harbour = unary_union(list(bays.values())).difference(land)
print('harbour water m2', round(harbour.area))
pontoons = []
for e in LE:
    t = e['tags']
    if t.get('man_made') == 'pier' and e['type'] == 'way':
        g = geom(e)
        if len(g) == 2: pontoons.append(LineString(g))

quay_roads = [LineString([q[:2] for q in r['pts']]) for r in F['roads'] if len(r['pts']) > 1 and (
    r['name'].startswith(('Banchina', 'Lungomare', 'Via Borgo Italia', 'Ex Banchina')) or r['cls'] in ('pedestrian', 'service', 'residential', 'unclassified', 'secondary'))]
from shapely.strtree import STRtree as _ST
_qt = _ST(quay_roads)
def quay_near(x, y):
    pt = Point(x, y)
    return any(g.distance(pt) < 11 for g in _qt.geometries.take(_qt.query(pt.buffer(11))))
# boat sizes (length, beam)
BT = {0: (6.5, 2.3), 1: (13.0, 4.2), 2: (11.0, 3.6), 3: (12.0, 3.9)}
boats = []; occupied = []
KIOSK = (-4128.0, 5239.0)
def place(x, y, hd, ty, col):
    L, B = BT[ty]
    c, s = math.cos(hd), math.sin(hd)
    fp = Polygon([(x + c * L / 2 - s * B / 2, y + s * L / 2 + c * B / 2), (x + c * L / 2 + s * B / 2, y + s * L / 2 - c * B / 2),
                  (x - c * L / 2 + s * B / 2, y - s * L / 2 - c * B / 2), (x - c * L / 2 - s * B / 2, y - s * L / 2 + c * B / 2)])
    if not harbour.buffer(0.5).contains(fp): return False
    if any(fp.buffer(0.35).intersects(o) for o in occupied[-80:]) or fp.intersects(FERRY_ZONE): return False
    occupied.append(fp); boats.append([round(x, 2), round(y, 2), round(hd, 3), ty, col]); return True

# ferry: along the inner face of the big mole near the ferry terminal
ferry = None
FT = (-4351.0, 5460.0)
coast_lines = [harbour.exterior] if harbour.geom_type == 'Polygon' else [g.exterior for g in harbour.geoms]
mole = None
for e in LE + TE:
    if e.get('id') == 1160437126 and e['type'] == 'way': mole = poly(e)
best = None
if mole is not None:
    mrr = mole.minimum_rotated_rectangle; cs = list(mrr.exterior.coords)[:4]
    e1 = (cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]); e2 = (cs[2][0] - cs[1][0], cs[2][1] - cs[1][1])
    ax = e1 if math.hypot(*e1) > math.hypot(*e2) else e2
    hd = math.atan2(ax[1], ax[0])
    q = nearest_points(mole.exterior, Point(FT))[0]
    for sgn in (1, -1):
        nx, ny = -math.sin(hd) * sgn, math.cos(hd) * sgn
        for off in (10, 12, 15, 18):
            cx, cy = q.x + nx * off, q.y + ny * off
            c_, s_ = math.cos(hd), math.sin(hd)
            hull = LineString([(cx - c_ * 38, cy - s_ * 38), (cx + c_ * 38, cy + s_ * 38)]).buffer(7.5)
            if harbour.contains(hull):
                ferry = [round(cx, 2), round(cy, 2), round(hd, 3)]; occupied.append(hull.buffer(4)); break
        if ferry: break
for ring in ([] if ferry else coast_lines):
    L = ring.length
    for s in np.arange(0, L, 4):
        p = ring.interpolate(s)
        d = math.dist((p.x, p.y), FT)
        if d < 80 and (best is None or d < best[0]): best = (d, ring, s)
if best and not ferry:
    _, ring, s = best
    a, b = ring.interpolate(s - 30), ring.interpolate(s + 30)
    hd = math.atan2(b.y - a.y, b.x - a.x)
    for sgn in (1, -1):
        nx, ny = -math.sin(hd) * sgn, math.cos(hd) * sgn
        cx, cy = (a.x + b.x) / 2 + nx * 9.5, (a.y + b.y) / 2 + ny * 9.5
        if harbour.contains(Point(cx, cy)):
            ferry = [round(cx, 2), round(cy, 2), round(hd, 3)]
            occupied.append(Point(cx, cy).buffer(45)); break
# traced on the imagery: the ferry berth is the inner face of the main mole's long arm (towards the terminal)
_hd = math.atan2(5318 - 5456, -4391 - -4336)
ferry = [-4349.5, 5412.0, round(_hd, 3)]
occupied[:] = [LineString([(ferry[0] - math.cos(_hd) * 40, ferry[1] - math.sin(_hd) * 40), (ferry[0] + math.cos(_hd) * 40, ferry[1] + math.sin(_hd) * 40)]).buffer(11)]
FERRY_ZONE = occupied[0]
print('ferry', ferry)

# boats moored stern-to along the quays (inside the bays), plus both sides of the pontoons
for nm, bay in bays.items():
    water = bay.difference(land)
    rings = [water.exterior] if water.geom_type == 'Polygon' else [g.exterior for g in water.geoms]
    for ring in rings:
        L = ring.length
        for s in np.arange(2, L, 3.2):
            p = ring.interpolate(s); q = ring.interpolate(s + 1.0)
            tx_, ty_ = q.x - p.x, q.y - p.y; n = math.hypot(tx_, ty_) or 1
            nx, ny = -ty_ / n, tx_ / n          # left normal; flip into the water
            if not water.contains(Point(p.x + nx * 3, p.y + ny * 3)): nx, ny = -nx, -ny
            if not land.buffer(1.5).contains(Point(p.x - nx * 1.0, p.y - ny * 1.0)): continue
            if not quay_near(p.x, p.y): continue                                          # quays, not rubble mounds
            r = h01(p.x, p.y, 3)
            if math.dist((p.x, p.y), KIOSK) < 42:                                       # sailing boats in front of the info kiosk
                if r > 0.85: continue
                ty = 2
            elif nm == 'Porto Vecchio':
                if r > 0.62: continue
                ty = 0 if r < 0.42 else (1 if r < 0.54 else 3)
            else:
                if r > 0.45: continue
                ty = 2 if r < 0.22 else (3 if r < 0.34 else 0)
            Lb = BT[ty][0]
            place(p.x + nx * (Lb / 2 + 0.8), p.y + ny * (Lb / 2 + 0.8), math.atan2(ny, nx), ty, int(h01(p.x, p.y, 9) * 6))
for pl in pontoons:
    L = pl.length
    a, b = pl.coords[0], pl.coords[-1]
    hd = math.atan2(b[1] - a[1], b[0] - a[0]); nx, ny = -math.sin(hd), math.cos(hd)
    for s in np.arange(3, L - 2, 4.2):
        p = pl.interpolate(s)
        for sgn in (1, -1):
            r = h01(p.x, p.y, sgn)
            if r > 0.8: continue
            ty = 2 if r < 0.5 else 3
            Lb = BT[ty][0]
            place(p.x + nx * sgn * (Lb / 2 + 1.8), p.y + ny * sgn * (Lb / 2 + 1.8), math.atan2(ny * sgn, nx * sgn), ty, int(r * 60) % 6)
# a few boats at anchor in the outer basin
for k in range(40):
    x, y = rng.uniform(*harbour.bounds[0::2]), rng.uniform(*harbour.bounds[1::2])
    if harbour.buffer(-25).contains(Point(x, y)) and not (ferry and math.dist((x, y), ferry[:2]) < 70):
        place(x, y, rng.uniform(0, 6.283), int(rng.choice([0, 2, 3])), int(rng.integers(6)))
print('boats', len(boats), np.bincount([b[3] for b in boats], minlength=4).tolist())

# ---------- palms, lamps along the seafront; café sets ----------
roads = F['roads']
def road_lines(names):
    return [LineString([p[:2] for p in r['pts']]) for r in roads if r['name'] in names and len(r['pts']) > 1]
SEA = ['Lungomare Paolo Borsellino', 'Via Borgo Italia', 'Banchina Castello', 'Banchina B. Italia', 'Ex Banchina Dogana']
palms, lamps = [], []
bld_union = unary_union([Polygon(b['pts']).buffer(1.0) for b in out_b])
bprep = sprep(bld_union)
water_prep = sprep(unary_union([harbour, island.buffer(0).exterior.buffer(0).envelope.difference(island)]) if False else harbour)
for ln in road_lines(SEA):
    L = ln.length
    for s in np.arange(4, L, 2):
        p = ln.interpolate(s); q = ln.interpolate(min(L, s + 1))
        tx_, ty_ = q.x - p.x, q.y - p.y; n = math.hypot(tx_, ty_) or 1
        nx, ny = -ty_ / n, tx_ / n
        # the sea side: whichever normal gets to harbour water first
        side = None
        for sgn in (1, -1):
            for d in (6, 10, 16, 24):
                if harbour.contains(Point(p.x + nx * sgn * d, p.y + ny * sgn * d)): side = (sgn, d); break
            if side: break
        if not side: continue
        sgn, dw = side
        k = int(s)
        if k % 13 == 0:
            o = 4.8
            x, y = p.x + nx * sgn * o, p.y + ny * sgn * o
            if not harbour.buffer(1).contains(Point(x, y)) and not bprep.contains(Point(x, y)): palms.append([round(x, 2), round(y, 2)])
        if (k + 6) % 13 == 0:
            o = 4.0
            x, y = p.x + nx * sgn * o, p.y + ny * sgn * o
            if not harbour.buffer(0.8).contains(Point(x, y)) and not bprep.contains(Point(x, y)): lamps.append([round(x, 2), round(y, 2)])
# palms around the squares and in front of the church
piazzas = []
for e in TE:
    t = e.get('tags', {})
    if (t.get('highway') == 'pedestrian' and t.get('area') == 'yes') or t.get('place') == 'square':
        p = poly(e)
        if p is not None and p.area > 100:
            piazzas.append([[round(x, 2), round(y, 2)] for x, y in p.exterior.coords[:-1]])
            ring = p.exterior
            for s in np.arange(5, ring.length, 15):
                q = ring.interpolate(s)
                c = p.centroid; dx, dy = c.x - q.x, c.y - q.y; n = math.hypot(dx, dy) or 1
                x, y = q.x + dx / n * 2.5, q.y + dy / n * 2.5
                if not bprep.contains(Point(x, y)): palms.append([round(x, 2), round(y, 2)])
for x, y in ((-4062.0, 5196.0), (-4052.0, 5192.0)):      # the two palms in front of the Chiesa Madre
    palms.append([x, y])
print('palms', len(palms), 'lamps', len(lamps), 'piazzas', len(piazzas))
# ---------- the banchina: paved promenade between the seafront road and the quay edge ----------
# (Street View, Lungomare Borsellino / Banchina Castello: light stone slabs, raised planters round the palms, double lamps,
# benches, bollards on the quay edge)
road_buf = unary_union([LineString([p_[:2] for p_ in r['pts']]).buffer(r['w'] / 2 + 0.2) for r in F['roads']
                        if len(r['pts']) > 1 and r['cls'] not in ('footway', 'path', 'steps', 'pedestrian')])
sea_lines = unary_union(road_lines(SEA)).buffer(40)
prom = land.intersection(harbour.buffer(26)).intersection(sea_lines).difference(road_buf).difference(bld_union.buffer(-0.8))
prom = prom.intersection(zone.buffer(250))
promenade, bollards, benches, planters = [], [], [], []
for g in getattr(prom, 'geoms', [prom]):
    if g.geom_type != 'Polygon' or g.area < 60 or g.distance(harbour) > 2.5: continue
    g = g.simplify(0.4)
    promenade.append([[round(x, 2), round(y, 2)] for x, y in g.exterior.coords[:-1]])
    # quay edge = the part of the outline next to the water: bollards every 7 m, benches facing the sea every ~26 m
    ring = g.exterior
    for d in np.arange(2, ring.length, 7.0):
        q = ring.interpolate(d)
        if harbour.distance(q) < 1.6:
            a_ = ring.interpolate(d - 0.5); b_ = ring.interpolate(d + 0.5)
            ang = math.atan2(b_.y - a_.y, b_.x - a_.x)
            # step 0.6 m inland from the edge
            nx, ny = -math.sin(ang), math.cos(ang)
            if not g.contains(Point(q.x + nx * 0.6, q.y + ny * 0.6)): nx, ny = -nx, -ny
            bollards.append([round(q.x + nx * 0.6, 2), round(q.y + ny * 0.6, 2)])
            if int(d) % 26 < 7 and g.contains(Point(q.x + nx * 3.2, q.y + ny * 3.2)):
                benches.append([round(q.x + nx * 3.2, 2), round(q.y + ny * 3.2, 2), round(math.atan2(-ny, -nx), 3)])
promu = unary_union([Polygon(p_) for p_ in promenade]) if promenade else None
for pp in palms:
    if promu is not None and promu.buffer(0.5).contains(Point(pp)): planters.append(pp)
print('promenade', len(promenade), 'm2', round(sum(Polygon(p_).area for p_ in promenade)), 'bollards', len(bollards), 'benches', len(benches), 'planters', len(planters))

cafes = []
road_lines_all = [LineString([p[:2] for p in r['pts']]) for r in roads if len(r['pts']) > 1 and r['cls'] not in ('track', 'path')]
from shapely.strtree import STRtree
rtree = STRtree(road_lines_all)
for po in pois:
    if po['kind'] not in ('bar', 'food'): continue
    pt = Point(po['x'], po['y'])
    near = rtree.geometries.take(rtree.query(pt.buffer(25)))
    if not len(near): continue
    ln = min(near, key=lambda g: g.distance(pt))
    a = ln.interpolate(ln.project(pt))
    dx, dy = a.x - pt.x, a.y - pt.y; n = math.hypot(dx, dy) or 1
    # tables between the building and the street (or on the seafront side if that's closer to the water)
    base = (pt.x + dx / n * min(n * 0.55, 6), pt.y + dy / n * min(n * 0.55, 6))
    s0 = ln.project(a); ang = 0
    q1, q2 = ln.interpolate(max(0, s0 - 2)), ln.interpolate(min(ln.length, s0 + 2)); ang = math.atan2(q2.y - q1.y, q2.x - q1.x)
    col = int(h01(po['x'], po['y']) * 4)
    for k in range(-2, 3):
        for j in (0, 1):
            x = base[0] + math.cos(ang) * k * 2.6 - math.sin(ang) * j * 2.4 * (1 if dx * -math.sin(ang) + dy * math.cos(ang) < 0 else -1)
            y = base[1] + math.sin(ang) * k * 2.6 + math.cos(ang) * j * 2.4 * (1 if dx * -math.sin(ang) + dy * math.cos(ang) < 0 else -1)
            if bprep.contains(Point(x, y)) or harbour.contains(Point(x, y)): continue
            cafes.append([round(x, 2), round(y, 2), round(ang, 3), col])
NO_TABLES = [(-3969.7, 5178.0, 22), (-4207.4, 5120.0, 24), (-4058.4, 5431.7, 26), (-4282.3, 5073.8, 22), (-4329.0, 5094.0, 22), (-4355.8, 5111.3, 26)]
cafes = [c for c in cafes if not any(math.dist(c[:2], (x, y)) < r for x, y, r in NO_TABLES)]
print('cafe sets', len(cafes))

# ---------- Street View pass 2026-10-27: stairs, the church parvis, retaining walls, the field behind Conad, shop fronts ----------
zone_big = zone.buffer(120)
stairs = []                                   # OSM highway=steps -> real flights (treads + rubble cheeks)
_drv = unary_union([LineString([p[:2] for p in r['pts']]).buffer(r['w'] / 2 + 0.4) for r in F['roads']
                    if len(r['pts']) > 1 and r['cls'] not in ('footway', 'path', 'steps', 'pedestrian', 'track')])
for r in F['roads']:
    if r['cls'] == 'steps' and len(r['pts']) > 1 and zone_big.contains(Point(r['pts'][0][:2])):
        # OSM steps often run on into the street they come down to: only the part off the carriageway is a flight
        g = LineString([p[:2] for p in r['pts']]).difference(_drv)
        for piece in getattr(g, 'geoms', [g]):
            if piece.is_empty or piece.geom_type != 'LineString' or piece.length < 1.5: continue
            stairs.append({'pts': [[round(x, 2), round(y, 2)] for x, y in piece.coords], 'w': max(1.8, r['w'])})
# Chiesa Madre: the parvis is a raised platform behind a low wall, wide stairs at the north-west corner down to the street
terraces = []
for i, pz in enumerate(piazzas):
    if Polygon(pz).contains(Point(-4048, 5170)):
        PP = pz if Polygon(pz).exterior.is_ccw else pz[::-1]
        # stair edges: the west edge and the first stretch of the north edge (the corner towards Via Cagliari)
        def edge_of(a, b):
            for k in range(len(PP)):
                p, q = PP[k], PP[(k + 1) % len(PP)]
                if math.dist(p, a) < 2.5 and math.dist(q, b) < 2.5: return k, 0, 1
                if math.dist(q, a) < 2.5 and math.dist(p, b) < 2.5: return k, 0, 1
            return None
        st_ = [e for e in (edge_of((-4085, 5187), (-4080, 5202)),) if e]
        k0 = edge_of((-4080, 5202), (-4045, 5188))
        if k0:
            k, _, _ = k0; p, q = PP[k], PP[(k + 1) % len(PP)]
            st_.append([k, 0, 0.42] if math.dist(p, (-4080, 5202)) < 2.5 else [k, 0.58, 1])
        terraces.append({'pts': PP, 'z': 6.6, 'stairs': [list(e) for e in st_]})
        piazzas.pop(i); break
# retaining walls along the roads lifted off the ground (Via Giovanni Falcone ramp, the start of Via Napoli)
retaining = []
for r in F['roads']:
    if not r.get('lift'): continue
    ln = LineString([p[:2] for p in r['pts']]); zs = [p[2] for p in r['pts']]
    arc = np.concatenate([[0], np.cumsum([math.dist(ln.coords[i], ln.coords[i + 1]) for i in range(len(zs) - 1)])])
    for sgn in (1, -1):
        run = []
        for d in np.arange(0, ln.length + 0.01, 2.0):
            p = ln.interpolate(d); q = ln.interpolate(min(ln.length, d + 0.5)); o = ln.interpolate(max(0, d - 0.5))
            tx_, ty_ = q.x - o.x, q.y - o.y; n = math.hypot(tx_, ty_) or 1
            nx, ny = -ty_ / n * sgn, tx_ / n * sgn
            off = r['w'] / 2 + 0.3
            x, y = p.x + nx * off, p.y + ny * off
            zr = float(np.interp(d, arc, zs)); zg = zat(x + nx * 1.5, y + ny * 1.5)
            if zr - zg > 0.35 and zr - zat(p.x, p.y) > 0.25 and math.dist((x, y), (-4223.4, 5062.0)) < 90 and not bprep.contains(Point(x, y)):
                run.append([round(x, 2), round(y, 2), round(zg - 0.4, 2), round(zr + 0.85, 2)])     # parapet 0.85 m above the road
            else:
                if len(run) > 1: retaining.append(run)
                run = []
        if len(run) > 1: retaining.append(run)
# the field behind Conad City: walled plots of dry earth and weeds with a few trees, not scrub (Esri + Google imagery)
FIELD = [[-4180, 5058], [-4150, 5062], [-4120, 5055], [-4105, 5040], [-4100, 5005], [-4090, 4990], [-4050, 4975], [-4050, 4920],
         [-4120, 4905], [-4130, 4930], [-4140, 4995], [-4160, 5000], [-4180, 5005]]
field_walls = [   # terrace and plot walls traced on the imagery
    [[-4147.8, 5048.2], [-4149.6, 5040.4], [-4152.0, 5029.6], [-4155.6, 5016.4], [-4158.0, 5008.0]],
    [[-4137.6, 5022.4], [-4141.2, 5012.8], [-4144.8, 4998.4]],
    [[-4180.8, 5009.2], [-4160.4, 5006.8]],
    [[-4132.8, 4996.0], [-4104.0, 4997.2]],
    [[-4135.2, 4985.2], [-4132.8, 4960.0]],
    [[-4106.4, 4984.0], [-4080.0, 4976.8]],
    [[-4130.4, 4957.4], [-4119.6, 4964.6], [-4107.6, 4979.0], [-4102.8, 4982.6]],
    [[-4119.6, 4944.2], [-4098.0, 4943.0], [-4086.0, 4938.2], [-4064.4, 4931.0], [-4057.2, 4925.0]],
    [[-4100.4, 4981.4], [-4070.4, 4967.0]],
    [[-4092.0, 4945.4], [-4070.4, 4959.8], [-4050.0, 4973.0]],
    [[-4118.4, 4911.8], [-4098.0, 4923.8], [-4086.0, 4931.0]],
    [[-4134.0, 4969.4], [-4125.6, 4947.8], [-4128.0, 4931.0]],
    [[-4144.8, 4998.2], [-4134.0, 4994.6], [-4130.4, 4981.4], [-4131.6, 4969.4]],
]
from rasterio.features import rasterize as _rz
from affine import Affine as _Af
_GT = _Af(CELL, 0, X0 - CELL / 2, 0, CELL, Y0 - CELL / 2)
_CL = np.load('prep/classes.npy')
_fm = _rz([(Polygon(FIELD), 1)], out_shape=_CL.shape, transform=_GT, fill=0, dtype='uint8').astype(bool) & (_CL != 0)
_CL[_fm & (_CL != 1)] = 4; np.save('prep/classes.npy', _CL)
# shop fronts with awnings: Via Cagliari (narrow, bakeries and fruit shops) and round its corner with Via Don Alonzo Errera
shops = []; stalls = []
cag = [LineString([p[:2] for p in r['pts']]) for r in F['roads'] if r['name'] == 'Via Cagliari' and len(r['pts']) > 1]
CORNER = Point(-4096.0, 5281.0)
for b in out_b:
    if b['kind'] not in ('house', 'hotel'): continue
    pg = Polygon(b['pts'])
    if not any(pg.distance(g) < 4.5 for g in cag) and pg.distance(CORNER) > 18: continue
    BP = b['pts'] if pg.exterior.is_ccw else b['pts'][::-1]
    for k in range(len(BP)):
        a, c = BP[k], BP[(k + 1) % len(BP)]; L = math.dist(a, c)
        if L < 3.0: continue
        mx, my = (a[0] + c[0]) / 2, (a[1] + c[1]) / 2
        nx, ny = (c[1] - a[1]) / L, -(c[0] - a[0]) / L          # outward (CCW)
        front = Point(mx + nx * 2.5, my + ny * 2.5)
        if not (any(front.distance(g) < 3.0 for g in cag) or front.distance(CORNER) < 14): continue
        if bprep.contains(front): continue
        shops.append([round(a[0], 2), round(a[1], 2), round(c[0], 2), round(c[1], 2), round(b['z'] + 0.4, 2), int(h01(mx, my, 4) * 4)])
for x, y in ((-4110.6, 5264.9), (-4093.0, 5163.7)):     # fruit and veg crates out front: Zaza, Da Zaza
    near = rtree.geometries.take(rtree.query(Point(x, y).buffer(25)))
    ln = min(near, key=lambda g: g.distance(Point(x, y)))
    a = ln.interpolate(ln.project(Point(x, y))); dx, dy = a.x - x, a.y - y; n = math.hypot(dx, dy) or 1
    s0 = ln.project(a); q1, q2 = ln.interpolate(max(0, s0 - 2)), ln.interpolate(min(ln.length, s0 + 2))
    stalls.append([round(x + dx / n * min(2.2, n * 0.6), 2), round(y + dy / n * min(2.2, n * 0.6), 2), round(math.atan2(q2.y - q1.y, q2.x - q1.x), 3)])
# every street of the town centre is asphalted (Street View); Via Cagliari is a tight lane
n_asph = 0
for r in F['roads']:
    if len(r['pts']) > 1 and r['cls'] in ('residential', 'unclassified', 'service', 'tertiary', 'secondary', 'living_street', 'primary') \
            and zone.buffer(60).contains(LineString([p[:2] for p in r['pts']]).centroid):
        if r.get('surface') != 'asphalt': n_asph += 1
        r['surface'] = 'asphalt'
    if r['name'] == 'Via Cagliari' and r['cls'] == 'residential': r['w'] = min(r['w'], 3.2)
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
print('town roads set to asphalt', n_asph)
print('stairs', len(stairs), 'terraces', len(terraces), 'retaining', len(retaining), 'field walls', len(field_walls), 'shop fronts', len(shops), 'stalls', len(stalls))

json.dump({'zone': [[round(x, 1), round(y, 1)] for x, y in zone.exterior.coords[:-1]], 'blds': out_b, 'pois': pois, 'boats': boats,
           'ferry': ferry, 'palms': palms, 'lamps': lamps, 'cafes': cafes, 'piazzas': piazzas,
           'promenade': promenade, 'bollards': bollards, 'benches': benches, 'planters': planters,
           'stairs': stairs, 'terraces': terraces, 'retaining': retaining, 'field': FIELD, 'fieldWalls': field_walls, 'shops': shops, 'stalls': stalls},
          open('prep/town.json', 'w'), separators=(',', ':'), ensure_ascii=False)

# ---------- harbour basins read as deep water ----------
cp = np.asarray(Image.open('prep/coast.png')).astype(np.float32)
H, W = cp.shape
X1 = X0 + (NX - 1) * CELL; Y1 = Y0 + (NY - 1) * CELL
from rasterio.features import rasterize
from affine import Affine
tr = Affine((X1 - X0) / W, 0, X0, 0, -(Y1 - Y0) / H, Y1)
m = rasterize([(harbour.buffer(-3), 1)], out_shape=(H, W), transform=tr, fill=0, dtype='uint8').astype(bool)
cp[m] = np.maximum(cp[m], 150 / 600 * 255)
Image.fromarray(cp.astype(np.uint8)).save('prep/coast.png')
print('coast patched', int(m.sum()))

# ---------- quays and moles in the colour texture: paving stone, rubble on the breakwaters' sea side ----------
# work from the prep.py output, so reruns don't paint over their own paint
if not os.path.exists('prep/terrain_base.png') or os.path.getmtime('prep/terrain_base.png') < os.path.getmtime('prep/features.json'):
    import shutil; shutil.copy('prep/terrain.png', 'prep/terrain_base.png')
tim = np.asarray(Image.open('prep/terrain_base.png')).astype(np.float32)
TH, TW = tim.shape[:2]
ttr = Affine((X1 - X0) / TW, 0, X0, 0, -(Y1 - Y0) / TH, Y1)
bw = [LineString(geom(e)).buffer(5.5) for e in LE if e['tags'].get('man_made') == 'breakwater' and e['type'] == 'way' and len(geom(e)) > 1]
quay = unary_union(land_parts + [land.intersection(harbour.buffer(45))]).intersection(zone.buffer(500))
rock = rasterize([(unary_union(bw), 1)], out_shape=(TH, TW), transform=ttr, fill=0, dtype='uint8').astype(bool) if bw else np.zeros((TH, TW), bool)
qm = rasterize([(quay, 1)], out_shape=(TH, TW), transform=ttr, fill=0, dtype='uint8').astype(bool)
mx, mn = tim.max(2), tim.min(2); sat = (mx - mn) / np.maximum(mx, 1)
natural = sat > 0.12                                   # leave the painted roads (greys) alone
rng_ = np.random.default_rng(3); nz = rng_.normal(0, 5, (TH, TW, 1))
rk = rock & ~qm
tim[rk] = (np.array([84, 80, 76]) + nz[rk] * 2.0)
q2 = qm & natural
tim[q2] = (np.array([196, 190, 178]) + nz[q2])
Image.fromarray(np.clip(tim, 0, 255).astype(np.uint8)).save('prep/terrain.png')
print('quays painted', int(q2.sum()), 'rock', int(rk.sum()))

# ---------- harbour floor below the water (the 5 m bicubic terrain must not poke through), quays/moles = built class ----------
GT = Affine(CELL, 0, X0 - CELL / 2, 0, CELL, Y0 - CELL / 2)          # row 0 = south
Gd = dict(np.load('prep/grid.npz')); zg = Gd['z']
hm_ = rasterize([(harbour.buffer(-4), 1)], out_shape=zg.shape, transform=GT, fill=0, dtype='uint8').astype(bool)
zg[hm_] = np.minimum(zg[hm_], -3.5); Gd['z'] = zg
np.savez('prep/grid.npz', **Gd)
CL = np.load('prep/classes.npy')
qc = rasterize([(quay, 1)], out_shape=CL.shape, transform=GT, fill=0, dtype='uint8').astype(bool) & (CL != 0)
CL[qc] = 1; np.save('prep/classes.npy', CL)
print('harbour floor cells', int(hm_.sum()), 'quay cells', int(qc.sum()))
