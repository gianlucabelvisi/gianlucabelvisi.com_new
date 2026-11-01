"""Sea-side coast distance for the water shader: python3 coast_sea.py   (after coast_atlas.py, before web_assets.py)
The old coast.png (prep.py) was a distance to a 5 m land mask blurred over ~20 m, so the foam and shallow bands sat
inland or swallowed whole low capes (the Elephant went white). Here the shoreline is where the viewer's own terrain meets
the sea (height > 0 on the final grid, upsampled 4x), and the texture is 4096 px (~3.5 m/px) with two channels:
R = distance / 600 m (colour bands far out), G = distance / 64 m (0.25 m steps near the rocks: foam and the shallow
fringe). Harbour basins (prep/harbour.json from town.py) read as deep water. Writes prep/coast.png (RGB).
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage
from shapely.geometry import shape
from rasterio.features import rasterize
from affine import Affine

G = np.load('prep/grid.npz'); Z = G['z'].astype(np.float64)
X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell']); NY, NX = Z.shape
X1 = X0 + (NX - 1) * CELL; Y1 = Y0 + (NY - 1) * CELL
U = 4
Zq = np.round((Z + 50.0) * 50.0) / 50.0 - 50.0          # what the viewer gets from height.bin
Hf = Zq.ravel()
def cr(p0, p1, p2, p3, t):
    return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)))
def hcubic(x, y):   # the viewer's heightCubic (as in ground_fix.py)
    fx = np.clip((x - X0) / CELL, 1, NX - 3.0001); fy = np.clip((y - Y0) / CELL, 1, NY - 3.0001)
    j = np.floor(fx).astype(int); i = np.floor(fy).astype(int); tx = fx - j; ty = fy - i
    row = lambda r: cr(Hf[r * NX + j - 1], Hf[r * NX + j], Hf[r * NX + j + 1], Hf[r * NX + j + 2], tx)
    h = cr(row(i - 1), row(i), row(i + 1), row(i + 2), ty)
    c = np.stack([Hf[i * NX + j], Hf[i * NX + j + 1], Hf[(i + 1) * NX + j], Hf[(i + 1) * NX + j + 1]])
    return np.minimum(np.maximum(h, c.min(0) - 1.5), c.max(0) + 1.5)
NYu, NXu = (NY - 1) * U + 1, (NX - 1) * U + 1
gx = X0 + np.arange(NXu) * (CELL / U)
landu = np.zeros((NYu, NXu), bool)
for r0 in range(0, NYu, 256):                    # 2.5 m, in strips
    yy = Y0 + np.arange(r0, min(NYu, r0 + 256)) * (CELL / U)
    XX, YY = np.meshgrid(gx, yy)
    landu[r0:r0 + len(yy)] = hcubic(XX, YY) > 0.0
# hand-detailed sites: their own 0.5 m rock decides the waterline
import glob, gzip, struct
for f in glob.glob('web/assets/site_*.bin'):
    raw = gzip.decompress(open(f, 'rb').read()); sx0, sy0, sres = struct.unpack('<3f', raw[:12]); snx, sny = struct.unpack('<2H', raw[12:16])
    SZ = np.frombuffer(raw[16:16 + snx * sny * 2], '<i2').reshape(sny, snx).astype(np.float64)
    j0, j1 = int(np.ceil((sx0 - X0) / (CELL / U))), int(np.floor((sx0 + snx * sres - X0) / (CELL / U)))
    i0, i1 = int(np.ceil((sy0 - Y0) / (CELL / U))), int(np.floor((sy0 + sny * sres - Y0) / (CELL / U)))
    for i in range(max(i0, 0), min(i1, NYu - 1) + 1):
        y = Y0 + i * (CELL / U); pi = int((y - sy0) / sres)
        if not 0 <= pi < sny: continue
        for j in range(max(j0, 0), min(j1, NXu - 1) + 1):
            x = X0 + j * (CELL / U); pj = int((x - sx0) / sres)
            if 0 <= pj < snx and SZ[pi, pj] != -32768: landu[i, j] = SZ[pi, pj] > 0
    print('site waterline', f)
d = ndimage.distance_transform_edt(~landu) * (CELL / U)     # metres from the waterline, 0 on land
N = 4096
# sample at texel centres (texture row 0 = north, like the old one)
xs = X0 + (np.arange(N) + 0.5) / N * (X1 - X0); ys = Y1 - (np.arange(N) + 0.5) / N * (Y1 - Y0)
jj = (xs - X0) / (CELL / U); ii = (ys - Y0) / (CELL / U)
II, JJ = np.meshgrid(ii, jj, indexing='ij')
dd = ndimage.map_coordinates(d, [II, JJ], order=1, mode='nearest')
tr = Affine((X1 - X0) / N, 0, X0, 0, -(Y1 - Y0) / N, Y1)
try:
    hb = shape(json.load(open('prep/harbour.json'))).buffer(-3)
    m = rasterize([(hb, 1)], out_shape=(N, N), transform=tr, fill=0, dtype='uint8').astype(bool)
    dd[m] = np.maximum(dd[m], 150.0); print('harbour px', int(m.sum()))
except FileNotFoundError:
    pass
R = np.clip(ndimage.gaussian_filter(dd, 1.0) / 600.0, 0, 1) * 255
Gc = np.clip(dd / 64.0, 0, 1) * 255
img = np.stack([R, Gc, np.zeros_like(R)], -1).round().astype(np.uint8)
Image.fromarray(img, 'RGB').save('prep/coast.png', optimize=True)
print('coast.png', N, 'px, shore px', int(((dd > 0) & (dd < 8)).sum()))
