"""Campobello: Via Campobello and Via Posta Vecchia surveyed (Street View 2026-11-03), python3 sites/campobello.py
(after sites/lago.py, before coast_sea.py / ground_fix.py / build.py)
- Road edits: tracks/drives that the imagery does not show are removed; unnamed drives become narrow lanes (2.6 m, the
  viewer draws no roadside walls along them); Via Campobello is ~4 m, Via Posta Vecchia ~3.2 m.
- Survey: walls on each side of Via Campobello every ~70 m (height and kind: dry-stone, tall retaining, white plaster),
  as seen driving from the Perimetrale; the viewer builds the roadside walls from it.
- Props from Street View: bougainvillea, oleander, date palms, a Norfolk pine, big carob/fig trees, agaves, prickly pear,
  white street lamps, wooden utility poles, a traffic mirror, cane fences, the two white gate pillars where the frontage
  lane of Via Campobello opens onto the Perimetrale.
- Trees from the photo: dark round crowns within 30 m of the two roads (not on roads or houses) become carob/olive trees
  sized by the crown.
Writes web/assets/campo.json.
"""
import json, math, sys
import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree
sys.path.insert(0, 'sites')
from common import imagery

F = json.load(open('prep/features.json')); R = {r['id']: r for r in F['roads']}

# ---------------- roads ----------------
DROP = {1159228838, 389226736, 1159183767, 1159260305, 1159260306, 1159260308, 1159183824, 1159243913, 1159243915}   # not on the photo
n0 = len(F['roads'])
F['roads'] = [r for r in F['roads'] if r['id'] not in DROP]
BB = (-2150, 4450, -1100, 5300)
inbb = lambda p: BB[0] < p[0] < BB[2] and BB[1] < p[1] < BB[3]
narrowed = 0
for r in F['roads']:
    if not all(inbb(p) for p in r['pts']): continue
    nm = r.get('name') or ''
    if 'Campobello' == nm.replace('Via ', '') or nm == 'Via Campobello': r['w'] = 4.0
    elif 'Posta Vecchia' in nm:
        r['w'] = 3.2
        if r['id'] == 389668599: r['surface'] = 'asphalt'   # Street View: asphalt from Via Campobello to the bend
    elif r['cls'] in ('service', 'track') and not nm: r['w'] = 2.6; narrowed += 1
for r in F['roads']:
    if r['id'] == 239886281: r['w'] = 5.4; r['surface'] = 'asphalt'          # Via Kharuscia: two narrow lanes (narrower than the Perimetrale)
# Cantina Minardi (Via Campobello 85): drawn by the viewer (lava-stone blocks with arches, the white barrel-vault cellar,
# the terrace with its pergola); the plain OSM boxes go
MIN_IDS = {1159183883, 1159183884, 1159183886, 1159183887, 1159183863}
minardi_b = {b['id']: b for b in F['buildings'] if b.get('id') in MIN_IDS}
F['buildings'] = [b for b in F['buildings'] if b.get('id') not in MIN_IDS]
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
print('campobello: roads dropped', n0 - len(F['roads']), 'narrowed', narrowed)

def chain(ids, start):
    P = []
    for i in ids:
        pts = [p[:2] for p in R[i]['pts']]; ref = P[-1] if P else start
        if math.dist(ref, pts[-1]) < math.dist(ref, pts[0]): pts = pts[::-1]
        P += pts if not P else pts[1:]
    return np.array(P, float)
def resample(P, step):
    seg = np.hypot(*np.diff(P, axis=0).T); s = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(0, s[-1], step)
    return np.column_stack([np.interp(t, s, P[:, 0]), np.interp(t, s, P[:, 1])]), t, s[-1]
camp = chain([240381368], (-1119, 4602)); campR, campT, campL = resample(camp, 25)
posta = chain([389668599, 209668809], (-1423, 4840)); postaR, postaT, postaL = resample(posta, 25)
def at(P, T, s, side=0.0, w=4.0):   # point s m along, side +1 left / -1 right of travel, at the verge
    i = min(int(np.searchsorted(T, s)), len(P) - 2); a, b = P[i], P[i + 1]
    tx, ty = b - a; L = math.hypot(tx, ty) or 1; nx, ny = -ty / L, tx / L
    o = side * (w / 2 + 1.6)
    return [round(float(a[0] + nx * o), 2), round(float(a[1] + ny * o), 2)], math.atan2(ty, tx)

# ---------------- survey (left / right of travel from the Perimetrale): height m, kind 1 dry / 2 retaining / 3 white
N, D, RT, W = 0, 1, 2, 3
S = [  # s m along Via Campobello, left (h, kind), right (h, kind)
    (0, (0, N), (0.6, D)),      # frontage lane by the Perimetrale: low separator wall on the right, house fronts left
    (70, (1.0, W), (0.6, D)),   # white garden wall with bougainvillea | rubble wall, macchia, cane
    (140, (0.8, D), (1.3, D)),  # dry-stone both sides, date palms behind the right wall
    (210, (1.0, D), (0.5, D)),  # big carob on the right, arched white dammuso
    (280, (1.2, RT), (0, N)),   # vineyard terraces above a retaining wall | open verge, poles
    (350, (0.6, RT), (0.5, D)),
    (420, (2.2, RT), (0.6, W)), # tall lava wall | low white-capped parapet, bougainvillea
    (490, (1.0, RT), (0.6, D)),
    (560, (1.6, RT), (0, N)),   # high retaining wall under the vines | open field
    (630, (0.8, D), (1.2, D)),  # junction with Via Posta Vecchia (west), Norfolk pine, white house
    (700, (0.8, D), (0.8, D)),  # vineyard | big ficus / frangipani, traffic mirror
    (770, (1.2, D), (0.5, D)),  # bougainvillea and a palm over the wall, street lamp
    (840, (0.6, D), (1.0, D)),  # oleander behind a fence | walled corner with palms
    (910, (0.8, D), (0.6, D)),  # cane fence on the right, lamps
    (980, (0.7, D), (0.7, D)),
    (1050, (0.6, D), (0.6, D)), (1120, (0.6, D), (0.6, D)), (1190, (0.7, D), (0.6, D)), (1260, (0.7, D), (0.7, D)), (1320, (0.7, D), (0.7, D)),
]
sv = []
for s, (lh, lk), (rh, rk) in S:
    p, _ = at(campR, campT, min(s, campL - 1)); sv.append([p[0], p[1], lh, lk, rh, rk])
survey = [{'route': [[round(float(x), 1), round(float(y), 1)] for x, y in campR], 'sv': sv}]
# Via Posta Vecchia (no Street View past the junction; photo): a high wall with bougainvillea on the right at the
# junction, then low dry-stone walls both sides
posta_sv = []
for s in np.arange(0, postaL, 50):
    p, _ = at(postaR, postaT, s)
    posta_sv.append([p[0], p[1], 0.0 if s < 25 else 0.8, D, 1.6 if s < 40 else 0.7, D])
survey.append({'route': [[round(float(x), 1), round(float(y), 1)] for x, y in postaR], 'sv': posta_sv})

# ---------------- props from Street View ----------------
props = []   # [kind, x, y, scale, rot]
def put(kind, s, side, sc=1.0, extra=0.0, road=(campR, campT), w=4.0):
    p, a = at(road[0], road[1], s, side, w)
    if extra: p = [p[0] - math.sin(a) * side * extra, p[1] + math.cos(a) * side * extra]
    props.append([kind, round(p[0], 2), round(p[1], 2), sc, round(a, 3)])
put('bougainvillea', 66, 1, 1.4, 1.5); put('palm', 74, 1, 1.0, 4); put('oleander', 80, -1, 1.1, 2)
for s in (130, 138, 150): put('palm', s, -1, 0.9 + 0.1 * (s % 3), 5)
put('carob', 215, -1, 1.4, 8); put('agave', 200, -1, 1.0, 2.5)
for s in (275, 330, 395, 460, 530): put('upole', s, -1, 1.0, 0.6)
put('palm', 345, 1, 1.0, 9); put('palm', 352, 1, 0.9, 12); put('bougainvillea', 425, -1, 1.2, 1.2); put('palm', 440, 1, 1.0, 6); put('palm', 448, 1, 0.85, 9)
put('pine', 500, 1, 1.0, 14); put('araucaria', 640, -1, 1.0, 10)
put('palm', 620, 1, 1.0, 6); put('palm', 610, 1, 0.9, 10)
put('ficus', 705, -1, 1.3, 3); put('ficus', 716, -1, 1.0, 4.5); put('mirror', 694, 1, 1.0, 0.5)
put('bougainvillea', 768, 1, 1.4, 1.6); put('palm', 772, 1, 1.0, 3.5)
for s in (790, 860, 930, 1000, 1070): put('lamp', s, -1, 1.0, 0.4)
put('oleander', 838, 1, 1.5, 2); put('oleander', 846, 1, 1.3, 2.4); put('palm', 846, -1, 1.0, 5); put('palm', 852, -1, 0.9, 7)
for s in range(895, 945, 5): put('cane', s, -1, 1.0, 0.2)
put('palm', 985, -1, 0.9, 4); put('pear', 1010, 1, 1.0, 2); put('agave', 1060, -1, 1.0, 1.5)
put('bougainvillea', 4, -1, 1.2, 0.5, road=(postaR, postaT), w=3.2); put('palm', 14, -1, 1.0, 5, road=(postaR, postaT), w=3.2)
put('oleander', 24, -1, 1.0, 1.8, road=(postaR, postaT), w=3.2)

# ---------------- trees from the photo, near the two roads ----------------
X0, Y0, X1, Y1, RES = -2150.0, 4520.0, -1100.0, 5300.0, 0.5
img, xs, ys = imagery(X0, Y0, X1, Y1, RES)
L = 0.3 * img[..., 0] + 0.59 * img[..., 1] + 0.11 * img[..., 2]
green = img[..., 1] - (img[..., 0] + img[..., 2]) / 2
crown = (ndimage.gaussian_filter(L, 1.5) < 0.17) & (ndimage.gaussian_filter(green, 1.5) > 0.01)
crown = ndimage.binary_opening(crown, iterations=2)
lab, n = ndimage.label(crown)
Xg, Yg = np.meshgrid(xs, ys)
roadsP = np.vstack([camp, posta])
rp, _, _ = resample(roadsP, 1.0) if False else (None, None, None)
rd = cKDTree(np.vstack([resample(camp, 1.0)[0], resample(posta, 1.0)[0]]))
allroads = np.vstack([resample(np.array([p[:2] for p in r['pts']]), 2.0)[0] for r in F['roads'] if len(r['pts']) > 1 and any(inbb(p) for p in r['pts'])])
ar = cKDTree(allroads)
from matplotlib.path import Path
bl = [Path(np.array(b['pts'])[:, :2]) for b in F['buildings'] if all(inbb(p) for p in b['pts'])]
trees = 0
objs = ndimage.find_objects(lab)
for k, sl in enumerate(objs):
    m = lab[sl] == k + 1; area = m.sum() * RES * RES
    if area < 6 or area > 140: continue
    cy, cx = ndimage.center_of_mass(m); x = float(xs[sl[1].start + int(cx)]); y = float(ys[sl[0].start + int(cy)])
    if rd.query([x, y])[0] > 30 or ar.query([x, y])[0] < 3.5: continue
    if any(p.contains_point((x, y)) for p in bl): continue
    r_ = math.sqrt(area / math.pi)
    props.append(['carob' if r_ > 2.6 else 'olive2', round(x, 2), round(y, 2), round(min(1.6, max(0.6, r_ / 2.6)), 2), round((x * 7.3 + y) % 6.28, 2)])
    trees += 1
# ---------------- Via Kharuscia (Perimetrale -> Via Campobello, Street View 2026-11-04) ----------------
kh = chain([239886281], (-2142, 5702)); khR, khT, khL = resample(kh, 25)
KS = [  # s, left (h, kind), right (h, kind); left = NE side driving in from the Perimetrale
    (0, (0.5, D), (1.0, D)), (40, (0.9, D), (1.4, D)), (90, (0.7, D), (1.8, RT)), (140, (1.2, D), (1.9, RT)),
    (190, (0.9, D), (1.2, D)), (250, (1.1, W), (1.0, D)), (300, (1.1, W), (0.9, D)), (350, (0.9, D), (0.8, D)),
    (400, (0.8, D), (0.8, D)), (450, (0.6, D), (0.7, D)), (500, (0.6, D), (0.7, D)), (530, (0.6, D), (0.7, D))]
kh_sv = []
for s_, (lh, lk), (rh, rk) in KS:
    p, _ = at(khR, khT, min(s_, khL - 1)); kh_sv.append([p[0], p[1], lh, lk, rh, rk])
survey.append({'route': [[round(float(x), 1), round(float(y), 1)] for x, y in khR], 'sv': kh_sv})
KR = (khR, khT)
# the two WWII guard huts (garitte di Karuscia) either side of the lane ~25 m in from the Perimetrale
for side in (1, -1):
    p, a_ = at(khR, khT, 25, side, 5.4)
    props.append(['garitta', p[0], p[1], 1.0, round(a_ + (math.pi / 2 if side > 0 else -math.pi / 2), 3)])
for s_ in (35, 48, 60): put('agave', s_, -1, 1.2, 2.0, road=KR, w=5.4)
put('palm', 70, -1, 1.0, 9, road=KR, w=5.4); put('palm', 80, -1, 0.9, 12, road=KR, w=5.4)
for s_ in (60, 160, 260, 380): put('lamp', s_, 1 if s_ < 200 else -1, 1.0, 0.4, road=KR, w=5.4)
for s_ in (110, 210, 330, 480, 515): put('upole', s_, -1, 1.0, 0.6, road=KR, w=5.4)
put('olive2', 245, 1, 1.4, 3, road=KR, w=5.4); put('pine', 262, -1, 1.0, 5, road=KR, w=5.4)
put('pine', 395, 1, 0.9, 3, road=KR, w=5.4); put('pine', 405, 1, 0.8, 7, road=KR, w=5.4); put('pear', 410, -1, 1.2, 1.5, road=KR, w=5.4)
put('pear', 418, -1, 1.0, 2.5, road=KR, w=5.4); put('bougainvillea', 285, 1, 1.0, 1.0, road=KR, w=5.4)

# ---------------- Cantina Minardi ----------------
minardi = {
    'lava': [minardi_b[i]['pts'] for i in (1159183883, 1159183884, 1159183863) if i in minardi_b],
    'vault': minardi_b[1159183886]['pts'] if 1159183886 in minardi_b else None,
    'white': [minardi_b[i]['pts'] for i in (1159183887,) if i in minardi_b],
    'terrace': [[-1940, 5112], [-1926, 5134], [-1904, 5129], [-1912, 5109], [-1924, 5101]],
}
json.dump({'survey': survey, 'props': props, 'bbox': BB, 'minardi': minardi}, open('web/assets/campo.json', 'w'), separators=(',', ':'))
print('campobello: survey points', sum(len(s['sv']) for s in survey), 'props', len(props), 'trees from photo', trees)
