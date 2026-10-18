"""Pantelleria island model (Blender).  python3 build.py [out_dir]
Reads prep/grid.npz + prep/features.json (made by prep.py), builds:
  terrain_<i>_<j>_L<k>   terrain chunks (1 km) at 4 LODs (10/20/40/80 m) with skirts
  roadA                  main roads (secondary/tertiary/unclassified), one mesh
  roadB_<ti>_<tj>        residential/service/pedestrian roads per 2 km tile
  roadC_<ti>_<tj>        tracks/paths/steps per 2 km tile
  bld_<ti>_<tj>          buildings per 2 km tile (walls + roofs + dammuso domes, flat shaded)
  water, piers, runway
Saves out/pantelleria.blend and exports out/pantelleria.glb (Draco).
Local frame: metres, x east, y north, z up (glTF export turns it into three's y-up).
"""
import bpy, bmesh, json, math, os, sys
import numpy as np

OUT = (sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else (sys.argv[1] if len(sys.argv) > 1 else 'out'))
os.makedirs(OUT, exist_ok=True)
G = np.load('prep/grid.npz'); Z = G['z'].astype(np.float64); LAND = G['land']
X0, Y0, CELL = float(G['x0']), float(G['y0']), float(G['cell'])
NY, NX = Z.shape
X1 = X0 + (NX - 1) * CELL; Y1 = Y0 + (NY - 1) * CELL
F = json.load(open('prep/features.json'))
TILE = 2000.0

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- materials (names are what the web viewer keys on) ----------
def mat(name, rgb, rough=0.9):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    if b:
        b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough
    m.diffuse_color = (*rgb, 1)
    return m
def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
M = {
    'Terrain': mat('Terrain', srgb('#8a7a5a')),
    'RoadMain': mat('RoadMain', srgb('#5d5b58')),
    'RoadMinor': mat('RoadMinor', srgb('#77726b')),
    'Track': mat('Track', srgb('#a48b6a')),
    'Path': mat('Path', srgb('#b9a17c')),
    'Runway': mat('Runway', srgb('#55575a')),
    'Lava': mat('Lava', srgb('#4b4541')),
    'Plaster': mat('Plaster', srgb('#efe9dd')),
    'Roof': mat('Roof', srgb('#f6f3ec')),
    'Glasshouse': mat('Glasshouse', srgb('#d8e2dc')),
    'Ruin': mat('Ruin', srgb('#5b534b')),
    'Lake': mat('Lake', srgb('#5fc0b5'), 0.1),
    'Concrete': mat('Concrete', srgb('#b9b4aa')),
    'Church': mat('Church', srgb('#f1e7d2')),
}

def new_mesh(name, verts, faces, material, uvs=None, smooth=True):
    me = bpy.data.meshes.new(name)
    verts = np.asarray(verts, dtype=np.float32).reshape(-1, 3)
    me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.ravel())
    faces = np.asarray(faces, dtype=np.int32)
    if faces.ndim == 2:
        k = faces.shape[1]
        me.loops.add(faces.size); me.loops.foreach_set('vertex_index', faces.ravel())
        me.polygons.add(len(faces)); me.polygons.foreach_set('loop_start', np.arange(0, faces.size, k, dtype=np.int32))
    else:   # ragged list of polygons
        flat = [i for f in faces for i in f]; starts = np.cumsum([0] + [len(f) for f in faces[:-1]]).astype(np.int32)
        me.loops.add(len(flat)); me.loops.foreach_set('vertex_index', np.array(flat, dtype=np.int32))
        me.polygons.add(len(faces)); me.polygons.foreach_set('loop_start', starts)
    me.update(calc_edges=True)
    if uvs is not None:
        uv = me.uv_layers.new(name='UVMap')
        vi = np.zeros(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', vi)
        uv.data.foreach_set('uv', np.asarray(uvs, dtype=np.float32)[vi].ravel())
    me.polygons.foreach_set('use_smooth', np.full(len(me.polygons), smooth))
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return ob

def zat(x, y):
    fx = np.clip((np.asarray(x) - X0) / CELL, 0, NX - 1.001); fy = np.clip((np.asarray(y) - Y0) / CELL, 0, NY - 1.001)
    j = fx.astype(int); i = fy.astype(int); tx = fx - j; ty = fy - i
    return (Z[i, j] * (1 - tx) + Z[i, j + 1] * tx) * (1 - ty) + (Z[i + 1, j] * (1 - tx) + Z[i + 1, j + 1] * tx) * ty

# ---------- terrain ----------
from scipy import ndimage
near_land = ndimage.binary_dilation(LAND, iterations=25)      # keep 250 m of sea floor around the coast
CH = 100   # cells per chunk (1 km)
SKIRT = 25.0
nterr = 0
for ci in range(0, NY - 1, CH):
    for cj in range(0, NX - 1, CH):
        i1 = min(ci + CH, NY - 1); j1 = min(cj + CH, NX - 1)
        if not near_land[ci:i1 + 1, cj:j1 + 1].any():
            continue
        for L, st in enumerate((1, 2, 4, 8)):
            ii = np.arange(ci, i1 + 1, st); jj = np.arange(cj, j1 + 1, st)
            if ii[-1] != i1: ii = np.append(ii, i1)
            if jj[-1] != j1: jj = np.append(jj, j1)
            sub = Z[np.ix_(ii, jj)]
            if st > 1:   # area-average the coarse levels so silhouettes don't alias
                sm = ndimage.uniform_filter(Z, size=st, mode='nearest'); sub = sm[np.ix_(ii, jj)]
                sub[[0, -1], :] = Z[np.ix_(ii[[0, -1]], jj)]; sub[:, [0, -1]] = Z[np.ix_(ii, jj[[0, -1]])]
            keep = near_land[np.ix_(ii, jj)]
            h, w = sub.shape
            XX, YY = np.meshgrid(X0 + jj * CELL, Y0 + ii * CELL)
            V = np.stack([XX, YY, sub], -1).reshape(-1, 3)
            idx = np.arange(h * w).reshape(h, w)
            a = idx[:-1, :-1]; b = idx[:-1, 1:]; c = idx[1:, 1:]; d = idx[1:, :-1]
            qk = keep[:-1, :-1] | keep[:-1, 1:] | keep[1:, 1:] | keep[1:, :-1]
            quads = np.stack([a, b, c, d], -1)[qk]
            if len(quads) == 0: continue
            # split along the shorter diagonal-ish: alternate for fewer artefacts
            tris = np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]])
            # skirts along the chunk border
            ring = list(idx[0, :]) + list(idx[1:, -1]) + list(idx[-1, -2::-1]) + list(idx[-2:0:-1, 0])
            base = len(V)
            sk = V[ring].copy(); sk[:, 2] -= SKIRT
            V = np.concatenate([V, sk])
            st_t = []
            n = len(ring)
            for k in range(n):
                p, q = ring[k], ring[(k + 1) % n]
                st_t += [[q, p, base + k], [q, base + k, base + (k + 1) % n]]
            tris = np.concatenate([tris, np.array(st_t)])
            UV = np.stack([(V[:, 0] - X0) / (X1 - X0), (V[:, 1] - Y0) / (Y1 - Y0)], -1)
            new_mesh(f'terrain_{ci // CH}_{cj // CH}_L{L}', V, tris, M['Terrain'], UV, smooth=True)
            nterr += 1
print('terrain meshes', nterr)

# ---------- ribbons (roads, runway, piers) ----------
def ribbon(pts, w, lift):
    """pts: [[x,y,z],...] -> verts, quads; miter joins, clamped."""
    P = np.asarray(pts, dtype=np.float64)
    if len(P) < 2: return None, None
    d = np.diff(P[:, :2], axis=0); L = np.linalg.norm(d, axis=1); ok = L > 1e-3
    if not ok.all():
        P = np.concatenate([P[:1], P[1:][ok]]); d = np.diff(P[:, :2], axis=0); L = np.linalg.norm(d, axis=1)
        if len(P) < 2: return None, None
    t = d / L[:, None]; nrm = np.stack([-t[:, 1], t[:, 0]], -1)
    vn = np.zeros((len(P), 2)); vn[:-1] += nrm; vn[1:] += nrm
    vn /= np.maximum(np.linalg.norm(vn, axis=1), 1e-6)[:, None]
    cosang = np.ones(len(P)); cosang[1:-1] = np.clip((vn[1:-1] * nrm[:-1]).sum(1), 0.5, 1)
    off = vn * (w / 2 / cosang)[:, None]
    z = P[:, 2] + lift
    Lft = np.column_stack([P[:, :2] + off, z]); Rgt = np.column_stack([P[:, :2] - off, z])
    V = np.empty((len(P) * 2, 3)); V[0::2] = Lft; V[1::2] = Rgt
    k = np.arange(len(P) - 1)
    Q = np.stack([2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2], -1)
    return V, Q

def tile_of(x, y): return int((x - X0) // TILE), int((y - Y0) // TILE)
TIER = {'secondary': 'A', 'tertiary': 'A', 'unclassified': 'A', 'trunk': 'A', 'primary': 'A',
        'residential': 'B', 'service': 'B', 'pedestrian': 'B', 'living_street': 'B',
        'track': 'C', 'path': 'C', 'footway': 'C', 'steps': 'C', 'cycleway': 'C'}
TMAT = {'A': 'RoadMain', 'B': 'RoadMinor'}
groups = {}
for rd in F['roads']:
    tier = TIER.get(rd['cls'], 'C')
    mname = TMAT.get(tier) or ('Track' if rd['cls'] == 'track' else 'Path')
    V, Q = ribbon(rd['pts'], rd['w'], 0.35 if tier == 'A' else 0.3)
    if V is None: continue
    p = rd['pts'][len(rd['pts']) // 2]
    key = 'roadA' if tier == 'A' else f'road{tier}_{mname}_%d_%d' % tile_of(p[0], p[1])
    g = groups.setdefault((key, mname), [[], [], 0])
    g[0].append(V); g[1].append(Q + g[2]); g[2] += len(V)
for (key, mname), (Vs, Qs, _) in groups.items():
    V = np.concatenate(Vs); Q = np.concatenate(Qs)
    UV = np.stack([(V[:, 0] - X0) / (X1 - X0), (V[:, 1] - Y0) / (Y1 - Y0)], -1)
    new_mesh(key if mname in ('RoadMain',) else key, V, Q, M[mname], UV, smooth=True)
print('road meshes', len(groups))

Vs, Qs, n = [], [], 0
for rw in F['runway'] + F['aprons']:
    pts = np.array(rw['pts'], dtype=np.float64)
    zz = ndimage.gaussian_filter1d(zat(pts[:, 0], pts[:, 1]), 1.5, mode='nearest') if len(pts) > 3 else zat(pts[:, 0], pts[:, 1])
    if rw['kind'] == 'apron' and pts.shape[0] > 3:
        continue  # aprons are painted in the texture
    V, Q = ribbon(np.column_stack([pts, zz]), rw['w'], 0.4)
    if V is None: continue
    Vs.append(V); Qs.append(Q + n); n += len(V)
if Vs:
    V = np.concatenate(Vs); new_mesh('runway', V, np.concatenate(Qs), M['Runway'],
                                    np.stack([(V[:, 0] - X0) / (X1 - X0), (V[:, 1] - Y0) / (Y1 - Y0)], -1))

# ---------- extruded polygons (buildings, piers, water) ----------
def poly_prism(bm, pts, zb, zt, cap=True):
    """Add a vertical prism to bm; returns top face."""
    bot = [bm.verts.new((x, y, zb)) for x, y in pts]
    top = [bm.verts.new((x, y, zt)) for x, y in pts]
    n = len(pts)
    for k in range(n):
        a, b = k, (k + 1) % n
        try: bm.faces.new((bot[a], bot[b], top[b], top[a]))
        except ValueError: pass
    f = None
    if cap:
        try: f = bm.faces.new(top)
        except ValueError: f = None
    return f

def dome(bm, cx, cy, zb, r, hgt, seg=10, rings=3):
    rows = []
    for k in range(rings):
        a = (k / rings) * math.pi / 2
        rr = r * math.cos(a); zz = zb + hgt * math.sin(a)
        rows.append([bm.verts.new((cx + rr * math.cos(2 * math.pi * s / seg), cy + rr * math.sin(2 * math.pi * s / seg), zz)) for s in range(seg)])
    apex = bm.verts.new((cx, cy, zb + hgt))
    for k in range(rings - 1):
        for s in range(seg):
            t = (s + 1) % seg
            bm.faces.new((rows[k][s], rows[k][t], rows[k + 1][t], rows[k + 1][s]))
    for s in range(seg):
        bm.faces.new((rows[-1][s], rows[-1][(s + 1) % seg], apex))

def finish(bm, name, material, smooth=False):
    if not len(bm.faces):
        bm.free(); return None
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4], quad_method='BEAUTY', ngon_method='EAR_CLIP')
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.polygons.foreach_set('use_smooth', np.full(len(me.polygons), smooth))
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return ob

from shapely.geometry import Polygon as SPoly
DOMES = []
tiles = {}
for b in F['buildings']:
    pts = b['pts']; poly = SPoly(pts)
    c = poly.centroid
    t = tile_of(c.x, c.y)
    kind = b['kind']
    wall = {'dammuso': 'Lava', 'town': 'Plaster', 'ruins': 'Ruin', 'greenhouse': 'Glasshouse', 'church': 'Church', 'chapel': 'Church'}.get(kind, 'Plaster')
    roof = {'dammuso': 'Roof', 'town': 'Roof', 'ruins': None, 'greenhouse': 'Glasshouse', 'church': 'Roof', 'chapel': 'Roof'}.get(kind, 'Roof')
    zb = b['zmin'] - 1.2
    zt = b['zmin'] + 0.5 * (b['zmax'] - b['zmin']) + b['h']
    T = tiles.setdefault(t, {})
    bw = T.setdefault(wall, bmesh.new())
    top = poly_prism(bw, pts, zb, zt, cap=(roof == wall or roof is None))
    if roof and roof != wall:
        br = T.setdefault(roof, bmesh.new())
        try: br.faces.new([br.verts.new((x, y, zt)) for x, y in pts])
        except ValueError: pass
        if kind == 'dammuso' and poly.area < 400:
            # the white cupola: one per ~45 m2 room, along the long axis
            mrr = poly.minimum_rotated_rectangle
            cs = list(mrr.exterior.coords)[:4]
            e1 = np.subtract(cs[1], cs[0]); e2 = np.subtract(cs[2], cs[1])
            la, lb = np.linalg.norm(e1), np.linalg.norm(e2)
            ax, short = (e1 / la, lb) if la >= lb else (e2 / lb, la)
            long_ = max(la, lb)
            nd = max(1, min(4, int(round(long_ / max(short, 4.5)))))
            r = min(short * 0.36, long_ / nd * 0.36, 3.6)
            if r > 1.1:
                for k in range(nd):
                    off = (k + 0.5) / nd - 0.5
                    cx, cy = c.x + ax[0] * off * long_, c.y + ax[1] * off * long_
                    DOMES.append((cx, cy, zt, r, r * 0.42))
nb = 0
for t, mats in tiles.items():
    for mname, bm in mats.items():
        if finish(bm, f'bld_{mname}_{t[0]}_{t[1]}', M[mname], smooth=False): nb += 1
print('building meshes', nb, 'domes', len(DOMES))
bm = bmesh.new()
for d_ in DOMES: dome(bm, *d_, seg=10, rings=3)
finish(bm, 'domes', M['Roof'], smooth=True)
# instances for the web viewer: domes (x,y,z,r,h) and trees (x,y,z,kind,scale) as int16/uint8
dm = np.array(DOMES, dtype=np.float64)
tr = np.array([t[:3] + [t[4]] for t in F['trees']], dtype=np.float64); tk = np.array([t[3] for t in F['trees']], dtype=np.uint8)
with open(os.path.join(OUT, 'instances.bin'), 'wb') as fh:
    hdr = np.array([len(dm), len(tr)], dtype=np.uint32); fh.write(hdr.tobytes())
    fh.write(np.round(dm[:, :3] * [2, 2, 10]).astype(np.int16).tobytes())          # x*2, y*2, z*10
    fh.write(np.round(dm[:, 3:5] * 20).astype(np.uint8).tobytes())                 # r*20, h*20
    fh.write(np.round(tr[:, :3] * [2, 2, 10]).astype(np.int16).tobytes())
    fh.write(np.stack([tk, np.round(tr[:, 3] * 100).astype(np.uint8)], -1).tobytes())

bm = bmesh.new()
for p in F['piers']:
    pts = p['pts']
    if p['closed']:
        q = pts[:-1] if pts[0] == pts[-1] else pts
        if SPoly(q).exterior.is_ccw is False: q = q[::-1]
        poly_prism(bm, q, -3, 1.6)
    else:
        P3 = [[x, y, 1.6] for x, y in pts]
        V, Q = ribbon(P3, 7 if p['kind'] == 'breakwater' else 5, 0)
        if V is None: continue
        vs = [bm.verts.new(v) for v in V]; vb = [bm.verts.new((v[0], v[1], -3)) for v in V]
        for q in Q:
            bm.faces.new([vs[i] for i in q])
        n = len(V)
        for k in range(0, n - 2, 2):
            for a_, b_ in ((k, k + 2), (k + 3, k + 1)):
                bm.faces.new((vb[a_], vb[b_], vs[b_], vs[a_]))
finish(bm, 'piers', M['Concrete'])

bm = bmesh.new()
for wv in F['water']:
    q = wv['pts'][:-1] if wv['pts'][0] == wv['pts'][-1] else wv['pts']
    if len(q) < 3: continue
    if SPoly(q).exterior.is_ccw is False: q = q[::-1]
    try: bm.faces.new([bm.verts.new((x, y, max(wv['z'], 0.2) + 0.25)) for x, y in q])
    except ValueError: pass
finish(bm, 'water', M['Lake'])

bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(os.path.join(OUT, 'pantelleria.blend')), compress=True)
# web export: terrain comes from the heightmap, domes/trees are instanced in three
bpy.ops.object.select_all(action='DESELECT')
for ob in scene.objects:
    ob.select_set(not ob.name.startswith(('terrain_', 'domes')))
bpy.ops.export_scene.gltf(use_selection=True, filepath=os.path.abspath(os.path.join(OUT, 'pantelleria.glb')), export_format='GLB',
                          export_materials='PLACEHOLDER', export_normals=True, export_texcoords=False, export_yup=True,
                          export_cameras=False, export_lights=False, export_apply=False,
)
print('exported', os.path.getsize(os.path.join(OUT, 'pantelleria.glb')) / 1e6, 'MB')
