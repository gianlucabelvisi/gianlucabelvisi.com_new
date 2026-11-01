"""Shared helpers for the hand-detailed coast sites (sites/*.py)."""
import math, os
import numpy as np
from PIL import Image
from pyproj import Transformer
from scipy import ndimage

TM = '+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1 +x_0=0 +y_0=0 +ellps=WGS84'
toLL = Transformer.from_crs(TM, 'EPSG:4326', always_xy=True)
N18 = 2 ** 18

def imagery(x0, y0, x1, y1, res, root='data/esri'):
    """Esri z18 RGB (0..1) resampled onto a local grid, row 0 = south (y0), col 0 = west (x0)."""
    xs = x0 + (np.arange(int(round((x1 - x0) / res))) + 0.5) * res
    ys = y0 + (np.arange(int(round((y1 - y0) / res))) + 0.5) * res
    X, Y = np.meshgrid(xs, ys)
    lon, lat = toLL.transform(X, Y)
    tx = (lon + 180) / 360 * N18; la = np.radians(lat); ty = (1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * N18
    a0, b0, a1, b1 = int(tx.min()), int(ty.min()), int(tx.max()), int(ty.max())
    M = np.zeros(((b1 - b0 + 1) * 256, (a1 - a0 + 1) * 256, 3), np.float32); have = np.zeros(M.shape[:2], np.float32)
    for a in range(a0, a1 + 1):
        for b in range(b0, b1 + 1):
            f = f'{root}/18_{a}_{b}.jpg'
            if os.path.exists(f):
                M[(b - b0) * 256:(b - b0 + 1) * 256, (a - a0) * 256:(a - a0 + 1) * 256] = np.asarray(Image.open(f).convert('RGB'), np.float32) / 255
                have[(b - b0) * 256:(b - b0 + 1) * 256, (a - a0) * 256:(a - a0 + 1) * 256] = 1
    py, px = (ty - b0) * 256 - 0.5, (tx - a0) * 256 - 0.5
    img = np.stack([ndimage.map_coordinates(M[..., c], [py, px], order=1, mode='nearest') for c in range(3)], -1)
    ok = ndimage.map_coordinates(have, [py, px], order=0, mode='nearest') > 0.5
    img[~ok] = (0.25, 0.33, 0.42)            # no tile there: open sea (only sea tiles are missing)
    return img, xs, ys

def grid():
    G = np.load('prep/grid.npz'); return dict(G)

def make_hcubic(G):
    Z = G['z'].astype(np.float64); X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell']); NY, NX = Z.shape
    Hf = (np.round((Z + 50.0) * 50.0) / 50.0 - 50.0).ravel()
    def cr(p0, p1, p2, p3, t): return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)))
    def h(x, y):
        fx = np.clip((np.asarray(x) - X0) / CELL, 1, NX - 3.0001); fy = np.clip((np.asarray(y) - Y0) / CELL, 1, NY - 3.0001)
        j = np.floor(fx).astype(int); i = np.floor(fy).astype(int); tx = fx - j; ty = fy - i
        row = lambda r: cr(Hf[r * NX + j - 1], Hf[r * NX + j], Hf[r * NX + j + 1], Hf[r * NX + j + 2], tx)
        v = cr(row(i - 1), row(i), row(i + 1), row(i + 2), ty)
        c = np.stack([Hf[i * NX + j], Hf[i * NX + j + 1], Hf[(i + 1) * NX + j], Hf[(i + 1) * NX + j + 1]])
        return np.minimum(np.maximum(v, c.min(0) - 1.5), c.max(0) + 1.5)
    return h
