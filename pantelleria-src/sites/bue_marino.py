"""Bue Marino, hand-detailed: python3 sites/bue_marino.py   (after coast_atlas.py, before coast_sea.py)
The 10 m DEM turns the bay into a smooth bowl. Here the shore is rebuilt at 0.5 m from the Esri z18 imagery:
  - the waterline traced from the photo (wave texture + blue; the dark sea in the north-west and the cliff shadows on
    the water are added by rule, see SEA_* below);
  - the bay: vertical trachyte cliffs ~5-7 m with a ledge at ~1 m on its west side (the swimming ledges below Cicci's),
    the headland west of it (Bue Marino Alto) a low black lava shore 1-3 m with the surf on it;
  - sea floor dropping from -1.5 m at the foot of the rock; boulders at the foot and on the ledges;
  - colour from the photo recoloured to the island's lava greys, dry grass, the dark gravel car park, the pale terrace.
Writes web/assets/site_bue.bin (gzip: float32 x0, y0, res; uint16 nx, ny; int16 z*100 per node, -32768 = not in the
patch), web/assets/site_bue.webp (colour, row 0 = north) and web/assets/site_bue.json (boulders, Cicci's); lowers the
10 m grid under the patch (prep/grid.npz) so the island mesh stays below the rock; drops trees in it.
"""
import gzip, json, struct, sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, 'sites')
from common import imagery, grid, make_hcubic

X0, Y0, X1, Y1, RES = -3330.0, 5850.0, -2870.0, 6080.0, 0.5
img, xs, ys = imagery(X0, Y0, X1, Y1, RES)                       # row 0 = south
NYp, NXp = img.shape[:2]
R, G, B = img[..., 0], img[..., 1], img[..., 2]; L = 0.3 * R + 0.59 * G + 0.11 * B
Xg, Yg = np.meshgrid(xs, ys)

# ---------------- waterline ----------------
blue = ndimage.uniform_filter(B - (R + G) / 2, 7)
tex = np.sqrt(np.maximum(ndimage.uniform_filter(L * L, 5) - ndimage.uniform_filter(L, 5) ** 2, 0))
sea = (blue > 0.035) | ((blue > 0.015) & (tex > 0.05))
sea = ndimage.binary_closing(ndimage.binary_opening(sea, iterations=2), iterations=3)
lab, n = ndimage.label(sea); sz = np.bincount(lab.ravel()); sz[0] = 0
sea = np.isin(lab, np.nonzero(sz > 20000)[0])
# SEA_NW: west of the bay the open sea is near-black in the photo (same colour as the lava): everything north of the
# surf line is sea. The surf is the bright band; per column, the sea starts at its southern edge.
surf = ndimage.binary_dilation((L > 0.45) & (Yg > 5990) & (Xg < -3165), iterations=2)
for j in range(NXp):
    if xs[j] > -3165: break
    rows = np.nonzero(surf[:, j] | sea[:, j] & (ys > 5995))[0]
    if len(rows): sea[rows.min():, j] = True
# SEA_SHADOW: the cliffs round the bay throw their shadow on the water (black in the photo): dark pixels hugging the
# bay's south and east sides are water.
near = ndimage.distance_transform_edt(~sea) * RES
shadow = (L < 0.1) & (near < 17) & (Xg > -3095) & (Xg < -2935) & (Yg < 6030)
sea |= shadow
sea = ndimage.binary_closing(sea, iterations=2)
sea = ndimage.binary_fill_holes(sea | (Yg > 6075)) & ~(Yg < 5868)        # no sea inland of the road
land0 = ndimage.binary_opening(~sea, iterations=3)                          # no 1-2 px slivers (tile seams in the photo)
lab, n = ndimage.label(land0); sz = np.bincount(lab.ravel()); sz[0] = 0
land = np.isin(lab, np.nonzero(sz > 400)[0])                              # skerries under ~100 m2 go (boulders instead)
sea = ~land
# only the real sea counts (2026-11-11): a 6-pixel speck of 'sea' in the SW corner made the cliff profile dig a 14 m pit
# across Via Santa Chiara. Water areas under 500 m2 are land.
lab, n = ndimage.label(sea); sz = np.bincount(lab.ravel()); sz[0] = 0
sea = np.isin(lab, np.nonzero(sz > 2000)[0]); land = ~sea
d_land = ndimage.distance_transform_edt(land) * RES                      # inland distance from the waterline
d_sea = ndimage.distance_transform_edt(sea) * RES                        # seaward distance

# ---------------- heights ----------------
Gd = grid(); h_orig = make_hcubic(Gd)
h0 = h_orig(Xg, Yg)
rng = np.random.default_rng(7)
def smooth_noise(scale, seed):
    r = np.random.default_rng(seed).random((NYp // scale + 3, NXp // scale + 3))
    return ndimage.zoom(r, scale, order=3)[:NYp, :NXp]
n1 = smooth_noise(24, 1); n2 = smooth_noise(6, 2); n3 = smooth_noise(60, 3)
bay = Xg > -3170                                                           # the cove with the cliffs, and the headland east of it
west = Xg <= -3170
# cliff top round the bay ~5-7 m; the low black shore of Bue Marino Alto 1.2-3 m
top_bay = np.maximum(h0, 4.6 + 2.2 * n3 + 0.6 * n1)
top_west = np.maximum(np.minimum(h0, 1.2 + 1.8 * n1 + 1.0 * np.clip((d_land - 6) / 20, 0, 1) * 2), 0.9 + 0.5 * n2)
wb = np.clip((Xg + 3185) / 30, 0, 1)                                       # the low west shore eases into the cliffs
top = top_bay * wb + top_west * (1 - wb)
# flat shelves with vertical steps: quantise near the water, fade to the natural ground inland
q = 1.3
shelf = np.floor(top / q) * q + 0.15 * n2
w_q = np.clip(1 - (d_land - 8) / 10, 0, 1)
z = top * (1 - w_q) + shelf * w_q
# the swimming ledge below Cicci's: a ~1 m shelf 2-6 m wide along the west side of the bay
ledge = bay & (Xg < -3080) & (d_land < 2.5 + 4.0 * n1) & (n1 > 0.35)
z = np.where(ledge, 0.9 + 0.25 * n2, z)
# east and south faces: sheer, no ledge; the very edge drops a touch (rounded lip)
z -= np.where(bay & ~ledge, 0.6 * np.clip(1 - d_land / 1.2, 0, 1), 0)
# the rock face: steep (about 70 deg) rather than a 0.5 m pixel wall, so thin fingers of rock stay low instead of
# standing up as spikes
z = np.minimum(z, 0.4 + 3.0 * d_land)
# blend to the island ground inland (d 18-28 m)
w_in = np.clip((d_land - 18) / 10, 0, 1)
z = z * (1 - w_in) + h0 * w_in
# sea floor
zs = -1.5 - np.minimum(d_sea, 24) * 0.32 - 1.2 * n2
z = np.where(land, z, zs)

# ---------------- the 10 m grid underneath: below the rock, sea where the photo says sea ----------------
Z = Gd['z']; GX0, GY0, CELL = float(Gd['x0']), float(Gd['y0']), float(Gd['cell'])
zmin = ndimage.minimum_filter(z, size=int(16 / RES))
ii0, ii1 = int(np.ceil((Y0 - GY0) / CELL)), int(np.floor((Y1 - GY0) / CELL))
jj0, jj1 = int(np.ceil((X0 - GX0) / CELL)), int(np.floor((X1 - GX0) / CELL))
changed = 0
for i in range(ii0, ii1 + 1):
    for j in range(jj0, jj1 + 1):
        gx, gy = GX0 + j * CELL, GY0 + i * CELL
        pj, pi = int((gx - X0) / RES), int((gy - Y0) / RES)
        if not (0 <= pi < NYp and 0 <= pj < NXp): continue
        if d_land[pi, pj] < 16 or not land[pi, pj]:
            nz = min(float(Z[i, j]), float(zmin[pi, pj]) - 0.6)
            if not land[pi, pj]: nz = min(nz, -3.0)
            if nz != Z[i, j]: Z[i, j] = nz; changed += 1
            if not land[pi, pj]: Gd['land'][i, j] = False
np.savez('prep/grid.npz', **Gd)
h_new = make_hcubic(Gd)(Xg, Yg)
# keep the patch on top of the island mesh where they overlap (the mesh is the 10 m grid, linear between nodes:
# bicubic + a margin covers it)
z = np.where(land & (d_land > 14), np.maximum(z, h_new + 0.05), z)
z = np.where(land & (d_land > 26), h_new, z)                               # exact match at the inland edge
print('grid nodes lowered', changed)

# Cicci's: the dark gravel car park from the road to the sea terrace, and the pale terrace (Esri + Google satellite)
from matplotlib.path import Path as _P
def poly_mask(pts): return _P(pts).contains_points(np.column_stack([Xg.ravel(), Yg.ravel()])).reshape(Xg.shape)
gravel = poly_mask([(-3292, 5926), (-3214, 5927), (-3197, 5944), (-3190, 5957), (-3224, 5957), (-3229, 5968), (-3240, 5976), (-3288, 5973)])
terrace = poly_mask([(-3227, 5978), (-3214, 5985), (-3200, 5984), (-3191, 5975), (-3188, 5962), (-3197, 5955), (-3214, 5956), (-3226, 5964)]) | \
          poly_mask([(-3284, 5969), (-3262, 5976), (-3240, 5979), (-3240, 5983), (-3262, 5981), (-3286, 5975)])
# ---------------- which nodes belong to the patch ----------------
keep = (land & (d_land < 28)) | (~land & (d_sea < 14)) | ndimage.binary_dilation(gravel | terrace, iterations=6)
keep = ndimage.binary_dilation(keep, iterations=1)
zi = np.where(keep, np.round(z * 100), -32768).astype('<i2')
out = struct.pack('<3f2H', X0, Y0, RES, NXp, NYp) + zi.tobytes()
open('web/assets/site_bue.bin', 'wb').write(gzip.compress(out, 9))

# ---------------- colour ----------------
green = G - (R + B) / 2
lum = np.clip((L - 0.03) / 0.55, 0, 1)
lum = ndimage.gaussian_filter(lum, 1.2)
lava = np.stack([0.33 + 0.36 * lum, 0.32 + 0.35 * lum, 0.31 + 0.34 * lum], -1)      # weathered grey trachyte, paler on top
dry = np.array([0.62, 0.56, 0.40]) * (0.75 + 0.35 * lum[..., None])
veg = np.clip((green - 0.01) / 0.05, 0, 1) * np.clip((d_land - 14) / 10, 0, 1)
col = lava * (1 - veg[..., None]) + dry * veg[..., None]
# keep a little of the photo's own hue on land away from the sea (gravel, paths, the pale terrace)
col = np.where((land & (d_land > 10))[..., None], col * 0.6 + img * 0.4 * 1.15, col)
wet = land & (d_land < 1.5) & (z < 2.5)
col[wet] *= 0.6
gn = (0.9 + 0.2 * n2)[..., None]
col = np.where((gravel & ~terrace)[..., None], np.array([0.29, 0.28, 0.27]) * gn, col)
col = np.where(terrace[..., None], np.array([0.80, 0.76, 0.68]) * gn, col)
col[~land] = np.array([0.20, 0.32, 0.33])                                  # seabed (under the sea plane)
col = np.clip(col * (0.94 + 0.12 * n2[..., None]), 0, 1)
Image.fromarray((col[::-1] * 255).astype(np.uint8)).save('web/assets/site_bue.webp', quality=88, method=6)

# ---------------- boulders ----------------
bould = []
cand = np.argwhere(((~land) & (d_sea < 4)) | (land & (d_land < 3) & (z < 2.2)))
rng.shuffle(cand)
for pi, pj in cand[:900]:
    if rng.random() > 0.22: continue
    x, y = float(xs[pj]), float(ys[pi]); s = 0.5 + rng.random() ** 2 * 2.2
    if any((x - b[0]) ** 2 + (y - b[1]) ** 2 < (s + b[3]) ** 2 * 0.5 for b in bould): continue
    bould.append([round(x, 2), round(y, 2), round(float(z[pi, pj]) if land[pi, pj] else max(float(z[pi, pj]), -1.6), 2), round(s, 2), round(rng.random() * 6.28, 2)])
json.dump({'x0': X0, 'y0': Y0, 'x1': X1, 'y1': Y1, 'res': RES, 'boulders': bould}, open('web/assets/site_bue.json', 'w'), separators=(',', ':'))
print('boulders', len(bould))

# the OSM footpaths across Cicci's gravel are just the open ground: don't draw them as lanes
F0 = json.load(open('prep/features.json'))
def on_gravel(p): return -3292 < p[0] < -3185 and 5928 < p[1] < 5990
nr = len(F0['roads'])
out_r = []
for r in F0['roads']:
    if r['cls'] not in ('path', 'footway', 'track', 'service') or not any(on_gravel(p) for p in r['pts']): out_r.append(r); continue
    run = []
    for p in r['pts'] + [None]:
        if p is not None and not on_gravel(p): run.append(p); continue
        if len(run) > 1: q = dict(r); q['pts'] = run; out_r.append(q)
        run = []
F0['roads'] = out_r
json.dump(F0, open('prep/features.json', 'w'), separators=(',', ':'))
print('paths dropped at Cicci\'s', nr - len(F0['roads']))
# trees: none in the patch's coastal band
F = json.load(open('prep/features.json'))
def inpatch_coast(x, y):
    if not (X0 < x < X1 and Y0 < y < Y1): return False
    return d_land[int((y - Y0) / RES), int((x - X0) / RES)] < 30
n0 = len(F.get('trees', []))
F['trees'] = [t for t in F.get('trees', []) if not inpatch_coast(t[0], t[1])]
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
print('trees dropped', n0 - len(F['trees']))
# a preview for checking
vis = (img * 255).astype(np.uint8).copy(); e = land & ~ndimage.binary_erosion(land)
vis[e] = (255, 0, 0)
Image.fromarray(vis[::-1]).save('prep/site_bue_check.png')
