"""Web assets for the three.js viewer.  python3 web_assets.py <out_dir>
Needs prep/ (prep.py) and out/pantelleria.glb + out/instances.bin (build.py), and gltf-transform on PATH.
Writes: island.glb (meshopt), terrain.webp, coast.png, height.bin (gzip u16, row 0 = south), instances.bin (gzip), meta.json
"""
import gzip, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image

W = sys.argv[1] if len(sys.argv) > 1 else 'web/assets'
os.makedirs(W, exist_ok=True)
G = np.load('prep/grid.npz'); z = G['z']
F = json.load(open('prep/features.json'))
subprocess.run(['gltf-transform', 'meshopt', 'out/pantelleria.glb', os.path.join(W, 'island.glb'), '--level', 'high'], check=True,
               stdout=subprocess.DEVNULL)
Image.open('prep/terrain.png').save(os.path.join(W, 'terrain.webp'), quality=84, method=6)
Image.open('prep/terrain_photo.png').save(os.path.join(W, 'terrain_photo.webp'), quality=82, method=6)
shutil.copy('prep/coast.png', os.path.join(W, 'coast.png'))
if os.path.exists('prep/town.json'):
    TZ = json.load(open('prep/town.json')); json.dump(TZ, open(os.path.join(W, 'town.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
else: TZ = None
hm = np.clip(np.round((z.astype(np.float64) + 50.0) * 50.0), 0, 65535).astype('<u2')
open(os.path.join(W, 'height.bin'), 'wb').write(gzip.compress(hm.tobytes(), 9))
open(os.path.join(W, 'instances.bin'), 'wb').write(gzip.compress(open('out/instances.bin', 'rb').read(), 9))
import math
from shapely.geometry import shape as _shape, LineString
from shapely.geometry import Polygon as _Poly
TZONE = _Poly(TZ['zone']).buffer(60) if TZ else None
def road_labels():
    """Anchors for road names along the roads: [name, x, y, z, angle, tier]. tier 0 main, 1 street, 2 track/path."""
    TIER = {'secondary': 0, 'tertiary': 0, 'primary': 0, 'trunk': 0, 'unclassified': 1, 'residential': 1, 'service': 1,
            'pedestrian': 1, 'living_street': 1, 'track': 2, 'path': 2, 'footway': 2, 'steps': 2, 'cycleway': 2}
    STEP = {0: 420.0, 1: 220.0, 2: 260.0}
    out, seen = [], {}
    for r in sorted(F['roads'], key=lambda r: TIER.get(r['cls'], 2)):
        nm = r['name'] or r['ref']
        if not nm: continue
        t = TIER.get(r['cls'], 2); P = r['pts']
        if len(P) < 2: continue
        cum = [0.0]
        for a, b in zip(P, P[1:]): cum.append(cum[-1] + math.dist(a[:2], b[:2]))
        L = cum[-1]
        if L < 45: continue
        st_ = STEP[t]
        if TZONE is not None and TZONE.intersects(LineString([p[:2] for p in P])): st_ = 85.0
        n = max(1, int(L // st_))
        for k in range(n):
            s_ = L * (k + 0.5) / n
            def at(d):
                d = min(max(d, 0), L)
                for i in range(1, len(cum)):
                    if cum[i] >= d:
                        f = (d - cum[i - 1]) / max(cum[i] - cum[i - 1], 1e-6); a, b = P[i - 1], P[i]
                        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
                return P[-1]
            c = at(s_); p0 = at(s_ - 18); p1 = at(s_ + 18)
            ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
            key = nm
            if any(math.dist(c[:2], q) < st_ * 0.6 for q in seen.get(key, [])): continue
            seen.setdefault(key, []).append(c[:2])
            out.append([nm, round(c[0], 1), round(c[1], 1), round(c[2] + 1.0, 1), round(ang, 3), t])
    print('road labels', len(out))
    return out

# near-detail data: class raster (10 m), road/house mask (2.5 m, bit-packed rows), walls and pantesco gardens
def detail_bin():
    import struct
    C = np.load('prep/classes.npy').astype(np.uint8)
    RMp = np.load('prep/roadmask.npy')
    D = json.load(open('prep/detail.json'))
    out = bytearray()
    out += struct.pack('<4I', C.shape[1], C.shape[0], RMp.shape[1] * 8, RMp.shape[0])
    out += C.tobytes(); out += RMp.tobytes()
    walls = D['walls']
    out += struct.pack('<I', len(walls))
    for ty, pts in walls:
        out += struct.pack('<BH', ty, len(pts))
        out += np.round(np.array(pts) * 4).astype('<i2').tobytes()
    if len(out) % 2: out += b'\0'
    g = np.array(D['gardens'], dtype=np.float64).reshape(-1, 3)
    out += struct.pack('<I', len(g)); out += np.round(g * 4).astype('<i2').tobytes()
    # roads for the near layer: tier (0 main, 1 street, 2 track/path, 3 steps/footway), surface (0 asphalt, 1 unpaved, 2 paved),
    # width*10, n, then n x (x*4, y*4 int16, (z+50)*50 uint16). Resampled to ~6 m (the near layer interpolates).
    TIER = {'secondary': 0, 'tertiary': 0, 'primary': 0, 'trunk': 0, 'unclassified': 1, 'residential': 1, 'service': 1,
            'pedestrian': 1, 'living_street': 1, 'track': 2, 'path': 3, 'footway': 3, 'steps': 3, 'cycleway': 3}
    SC = {'asphalt': 0, 'unpaved': 1, 'paved': 2}
    rs = [r for r in F['roads'] if len(r['pts']) > 1]
    out += struct.pack('<I', len(rs))
    for r in rs:
        P = np.array(r['pts'])
        keep = [0]
        for i in range(1, len(P) - 1):
            if math.dist(P[i, :2], P[keep[-1], :2]) >= 6: keep.append(i)
        keep.append(len(P) - 1)
        P = P[keep]
        out += struct.pack('<BBBH', TIER.get(r['cls'], 2) | (0x80 if r.get('lift') else 0), SC.get(r.get('surface'), 0), min(255, int(round(r['w'] * 10))), len(P))   # bit 7: lifted off the ground (use the profile)
        xy = np.column_stack([np.round(P[:, 0] * 4), np.round(P[:, 1] * 4)]).astype('<i2')
        zq = np.clip(np.round((P[:, 2] + 50) * 50), 0, 65535).astype('<u2')            # 2 cm steps (z*10 made 10 cm stairs on the graded roads)
        out += b''.join(xy[i].tobytes() + zq[i:i + 1].tobytes() for i in range(len(P)))
    open(os.path.join(W, 'detail.bin'), 'wb').write(gzip.compress(bytes(out), 9))
detail_bin()

# building footprints for the close-up layer and the car: kind, flags, n, zmin, zmax, h, seed, then n x (x*4, y*4) int16
def bld_bin():
    import struct, zlib
    TIDS = set(b['id'] for b in TZ['blds']) if TZ else set()
    KC = {'dammuso': 0, 'greenhouse': 2, 'ruins': 3, 'church': 4, 'chapel': 4}
    out = bytearray(); bl = F['buildings']
    out += struct.pack('<I', len(bl))
    for b in bl:
        pts = b['pts'][:-1] if b['pts'][0] == b['pts'][-1] else b['pts']
        seed = zlib.crc32(str(b['id']).encode()) & 0xffffffff
        out += struct.pack('<BBHhhHI', KC.get(b['kind'], 1), 1 if b['id'] in TIDS else 0, len(pts),
                           int(round(b['zmin'] * 10)), int(round(b['zmax'] * 10)), int(round(b['h'] * 10)), seed)
        out += np.round(np.array(pts) * 4).astype('<i2').tobytes()
    open(os.path.join(W, 'bld.bin'), 'wb').write(gzip.compress(bytes(out), 9))
bld_bin()

fr = F['frame']
meta = {'x0': fr['x0'], 'y0': fr['y0'], 'cell': fr['cell'], 'nx': fr['nx'], 'ny': fr['ny'], 'lat0': 36.785, 'lon0': 11.99,
        'labels': F['labels'],
        'roadLabels': road_labels(),
        'coastDetail': json.load(open('prep/coast_detail.json')) if os.path.exists('prep/coast_detail.json') else None,
        'runway': (lambda r: [r['pts'][0][0], r['pts'][0][1], r['pts'][-1][0], r['pts'][-1][1], r['w']])(max([r for r in F['runway'] if r['kind'] == 'runway'], key=lambda r: r['w']))}
json.dump(meta, open(os.path.join(W, 'meta.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
for f in sorted(os.listdir(W)):
    print(f'{f:16s} {os.path.getsize(os.path.join(W, f)) / 1e6:6.2f} MB')
