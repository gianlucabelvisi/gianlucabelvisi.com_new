"""Build Gianluca's Sluseholmen apartment from the floor plan and render views.
Run: blender -b --python build.py -- <geom.json> <outdir> <samples> <res%> [views]
"""
import bpy, bmesh, json, math, sys, os
from mathutils import Vector, geometry

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GEOM = argv[0] if len(argv) > 0 else 'geom.json'
OUT = argv[1] if len(argv) > 1 else 'out'
SAMPLES = int(argv[2]) if len(argv) > 2 else 64
RES = int(argv[3]) if len(argv) > 3 else 50
VIEWS = argv[4].split(',') if len(argv) > 4 and argv[4] != 'all' else None  # None = every camera
os.makedirs(OUT, exist_ok=True)

S = 119.7          # px per metre
OX, OY = 313, 1383  # plan origin (px)
H = 2.60           # ceiling height
G = json.load(open(GEOM))


def P(p):
    return ((p[0] - OX) / S, (OY - p[1]) / S)


# ---------------------------------------------------------------- reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
coll_ceiling = bpy.data.collections.new('Ceiling')
scene.collection.children.link(coll_ceiling)


# ---------------------------------------------------------------- materials
def mat_basic(name, color, rough=0.5, metal=0.0, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m


def mat_oak(name, planks, base=(0.58, 0.36, 0.19), rough=0.45, grain_axis='Y', wscale=3.0, contrast=(0.72, 1.12)):
    """Procedural oak. planks=True -> floorboards, else vertical-grain veneer."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord')
    mp = N.new('ShaderNodeMapping')
    L.new(tc.outputs['Object'], mp.inputs['Vector'])
    # grain: stretch coords along the grain axis
    if grain_axis == 'Y':
        mp.inputs['Scale'].default_value = (1.0, 0.04, 1.0)
    else:  # Z (vertical veneer)
        mp.inputs['Scale'].default_value = (1.0, 1.0, 0.04)
    noise = N.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 6
    noise.inputs['Detail'].default_value = 6
    L.new(mp.outputs['Vector'], noise.inputs['Vector'])
    wave = N.new('ShaderNodeTexWave')
    wave.wave_type = 'RINGS'
    wave.inputs['Scale'].default_value = wscale
    wave.inputs['Distortion'].default_value = 9.0
    wave.inputs['Detail'].default_value = 4
    L.new(mp.outputs['Vector'], wave.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB')
    lo, hi = contrast
    ramp.color_ramp.elements[0].color = (base[0] * lo, base[1] * lo * 0.94, base[2] * lo * 0.86, 1)
    ramp.color_ramp.elements[1].color = (base[0] * hi, base[1] * hi, base[2] * hi, 1)
    mix = N.new('ShaderNodeMix')
    mix.data_type = 'FLOAT'
    mix.inputs['Factor'].default_value = 0.35
    L.new(wave.outputs['Fac'], mix.inputs['A'])
    L.new(noise.outputs['Fac'], mix.inputs['B'])
    L.new(mix.outputs['Result'], ramp.inputs['Fac'])
    col = ramp.outputs['Color']
    if planks:
        mp2 = N.new('ShaderNodeMapping')
        mp2.inputs['Rotation'].default_value = (0, 0, math.radians(90))
        L.new(tc.outputs['Object'], mp2.inputs['Vector'])
        br = N.new('ShaderNodeTexBrick')
        br.offset = 0.37
        br.inputs['Scale'].default_value = 1.0
        br.inputs['Mortar Size'].default_value = 0.0015
        br.inputs['Brick Width'].default_value = 2.1
        br.inputs['Row Height'].default_value = 0.24
        br.inputs['Color1'].default_value = (1.0, 1.0, 1.0, 1)
        br.inputs['Color2'].default_value = (0.78, 0.74, 0.70, 1)
        br.inputs['Mortar'].default_value = (0.25, 0.16, 0.09, 1)
        L.new(mp2.outputs['Vector'], br.inputs['Vector'])
        mul = N.new('ShaderNodeMix')
        mul.data_type = 'RGBA'
        mul.blend_type = 'MULTIPLY'
        mul.inputs['Factor'].default_value = 1.0
        L.new(col, mul.inputs['A'])
        L.new(br.outputs['Color'], mul.inputs['B'])
        col = mul.outputs['Result']
        bump = N.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.25
        L.new(br.outputs['Fac'], bump.inputs['Height'])
        L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    L.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    return m


def mat_tiles(name, color, size=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    bsdf = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord')
    br = N.new('ShaderNodeTexBrick')
    br.offset = 0.0
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Brick Width'].default_value = size
    br.inputs['Row Height'].default_value = size
    br.inputs['Mortar Size'].default_value = 0.003
    br.inputs['Color1'].default_value = (*color, 1)
    br.inputs['Color2'].default_value = (color[0] * 0.95, color[1] * 0.95, color[2] * 0.95, 1)
    br.inputs['Mortar'].default_value = (color[0] * 0.8, color[1] * 0.8, color[2] * 0.8, 1)
    L.new(tc.outputs['Object'], br.inputs['Vector'])
    L.new(br.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.4
    return m


def mat_glass():
    m = bpy.data.materials.new('Glass')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.remove(N['Principled BSDF'])
    out = N['Material Output']
    g = N.new('ShaderNodeBsdfGlass'); g.inputs['Roughness'].default_value = 0.0; g.inputs['IOR'].default_value = 1.45
    t = N.new('ShaderNodeBsdfTransparent')
    lp = N.new('ShaderNodeLightPath')
    mx = N.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'
    L.new(lp.outputs['Is Shadow Ray'], mx.inputs[0]); L.new(lp.outputs['Is Diffuse Ray'], mx.inputs[1])
    mix = N.new('ShaderNodeMixShader')
    L.new(mx.outputs[0], mix.inputs['Fac']); L.new(g.outputs[0], mix.inputs[1]); L.new(t.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs['Surface'])
    return m


M = dict(
    glass=mat_glass(),
    wall=mat_basic('Wall white', (0.86, 0.855, 0.84), 0.85),
    ceiling=mat_basic('Ceiling', (0.88, 0.88, 0.87), 0.9),
    ext=mat_basic('Facade', (0.55, 0.52, 0.48), 0.9),
    floor=mat_oak('Oak floor', True, base=(0.52, 0.32, 0.16), wscale=5.0, contrast=(0.62, 1.15)),
    oak=mat_oak('Oak veneer', False, base=(0.60, 0.39, 0.21), rough=0.5, grain_axis='Z', wscale=9.0, contrast=(0.86, 1.06)),
    worktop=mat_basic('Worktop', (0.90, 0.89, 0.87), 0.25),
    frame=mat_basic('Window frame', (0.90, 0.90, 0.88), 0.4),
    steel=mat_basic('Steel', (0.8, 0.8, 0.8), 0.25, 1.0),
    black=mat_basic('Black glass', (0.02, 0.02, 0.02), 0.08),
    galv=mat_basic('Galvanised', (0.62, 0.63, 0.64), 0.4, 0.9),
    concrete=mat_basic('Concrete', (0.62, 0.60, 0.57), 0.85),
    tile_floor=mat_tiles('Bath floor', (0.52, 0.47, 0.41)),
    bathwall=mat_basic('Bath wall', (0.62, 0.64, 0.64), 0.6),
    brick_red=mat_basic('Brick red', (0.36, 0.12, 0.07), 0.9),
    brick_yel=mat_basic('Brick yellow', (0.62, 0.52, 0.38), 0.9),
    brick_dark=mat_basic('Brick dark', (0.14, 0.13, 0.13), 0.9),
    brick_light=mat_basic('Brick light', (0.70, 0.66, 0.58), 0.9),
    deck=mat_basic('Deck wood', (0.45, 0.33, 0.22), 0.8),
    water=mat_basic('Water', (0.05, 0.09, 0.07), 0.05),
    ground=mat_basic('Quay', (0.45, 0.42, 0.38), 0.9),
    door=mat_basic('Door white', (0.9, 0.9, 0.89), 0.35),
)


# ---------------------------------------------------------------- mesh helpers
def link(obj, coll=None):
    (coll or scene.collection).objects.link(obj)
    return obj


def prism(name, rings, z0, z1, mat, coll=None, smooth=False):
    """Extrude polygon rings (first outer, rest holes; metres) from z0 to z1."""
    bm = bmesh.new()
    rings = [[Vector((x, y, 0)) for x, y in r] for r in rings]
    # caps
    tris = geometry.tessellate_polygon([[v for v in r] for r in rings])
    flat = [v for r in rings for v in r]
    vb = [bm.verts.new((v.x, v.y, z0)) for v in flat]
    vt = [bm.verts.new((v.x, v.y, z1)) for v in flat]
    for a, b, c in tris:
        try:
            bm.faces.new((vt[a], vt[b], vt[c]))
            bm.faces.new((vb[c], vb[b], vb[a]))
        except ValueError:
            pass
    i = 0
    for r in rings:
        n = len(r)
        for k in range(n):
            a, b = i + k, i + (k + 1) % n
            try:
                bm.faces.new((vb[a], vb[b], vt[b], vt[a]))
            except ValueError:
                pass
        i += n
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    me.materials.append(mat)
    return link(ob, coll)


def box(name, x0, y0, z0, x1, y1, z1, mat, coll=None):
    r = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    return prism(name, [r], z0, z1, mat, coll)


def quad_box(name, pts, z0, z1, mat, coll=None):
    return prism(name, [pts], z0, z1, mat, coll)


def rounded_rect(x0, y0, x1, y1, corners, r, seg=10):
    """corners: dict of corner-name->radius flag among 'll','lr','ur','ul'."""
    out = []
    spec = [('ll', x0, y0, 180), ('lr', x1, y0, 270), ('ur', x1, y1, 0), ('ul', x0, y1, 90)]
    for key, cx, cy, a0 in spec:
        if key in corners:
            sx = 1 if key in ('ll', 'ul') else -1
            sy = 1 if key in ('ll', 'lr') else -1
            ccx, ccy = cx + sx * r, cy + sy * r
            for s in range(seg + 1):
                a = math.radians(a0 + 90 * s / seg)
                out.append((ccx + r * math.cos(a), ccy + r * math.sin(a)))
        else:
            out.append((cx, cy))
    return out


# things the web walkthrough makes interactive (doors, fridge, sliding balcony pane)
EXTRAS = {'hinged': [], 'sliders': []}
vl = lambda v: [round(float(v[0]), 4), round(float(v[1]), 4)]

# ---------------------------------------------------------------- walls
for i, rings in enumerate(G['walls']):
    prism(f'Wall_{i}', [[P(p) for p in r] for r in rings], 0, H, M['wall'])

# openings: sills, lintels, frames, glass
cx_ap, cy_ap = P((900, 850))
for o in G['openings']:
    q = [P(p) for p in o['q']]
    if o['sill'] > 0:
        quad_box(o['name'] + '_sill', q, 0, o['sill'], M['wall'])
    quad_box(o['name'] + '_lintel', q, o['head'], H, M['wall'])
    v = [Vector(p) for p in q]
    e01, e03 = (v[1] - v[0]), (v[3] - v[0])
    if e01.length >= e03.length:   # 0-1 along wall
        a0, a1 = (v[0] + v[3]) / 2, (v[1] + v[2]) / 2
        thick_dir, thick = e03.normalized(), e03.length
        side0 = v[0]
    else:
        a0, a1 = (v[0] + v[1]) / 2, (v[3] + v[2]) / 2
        thick_dir, thick = e01.normalized(), e01.length
        side0 = v[0]
    along = (a1 - a0)
    L_ = along.length
    ad = along.normalized()
    # outer side: the face farther from the apartment centre
    mid = (a0 + a1) / 2
    centre = Vector((cx_ap, cy_ap))
    if o['kind'] in ('window', 'balcony'):
        if (mid + thick_dir * thick / 2 - centre).length > (mid - thick_dir * thick / 2 - centre).length:
            out_dir = thick_dir
        else:
            out_dir = -thick_dir
        plane = mid + out_dir * (thick / 2 - 0.08)  # glass line 8cm in from outer face
        z0, z1 = o['sill'], o['head']
        n = o['panes']
        fw, fd = 0.06, 0.07

        def seg_box(name, s0, s1, za, zb, w, mat):
            p0 = plane - ad * (L_ / 2) + ad * s0
            p1 = plane - ad * (L_ / 2) + ad * s1
            nrm = Vector((-ad.y, ad.x)) * (w / 2)
            quad_box(name, [tuple(p0 - nrm), tuple(p1 - nrm), tuple(p1 + nrm), tuple(p0 + nrm)], za, zb, mat)

        if o['kind'] == 'balcony':
            pw = L_ / n
            # as built (Gianluca's plan): fixed glass on the left up to S1 = 1.63 m, a mullion, then two outward-opening
            # leaves (narrow + wide) that the web viewer builds and animates; the slider entry below only carries the geometry
            S1 = 1.63
            seg_box(o['name'] + '_glass', fw, S1 - 0.03, z0 + fw, z1 - fw, 0.012, M['glass'])
            seg_box(o['name'] + '_mS1', S1 - 0.035, S1 + 0.035, z0, z1, 0.07, M['frame'])
            # pane 0 slides (inside the fixed pane next to it); the web viewer animates it
            nin = -out_dir
            sp0 = plane - ad * (L_ / 2) + ad * fw * 0.5
            EXTRAS['sliders'].append(dict(id='balcony_slide', label='Balcony door', a=vl(sp0), dir=vl(ad), n=vl(nin),
                                          w=round(pw - fw * 0.5, 3), z0=z0, z1=z1, inset=0.06, travel=round(pw - fw, 3)))
            # (the old sliding pane's own meshes are gone: the leaves are built in the viewer)
        else:
            nin = -out_dir
            lw, lf = L_ / 2 - fw, 0.05
            for k, (s0_, sgn) in enumerate(((fw, 1), (L_ - fw, -1))):
                hinge_p = plane - ad * (L_ / 2) + ad * s0_
                cd = ad * sgn
                EXTRAS['hinged'].append(dict(id=f"{o['name']}_sash{k}", label='Window', hinge=vl(hinge_p), closed=vl(cd),
                                             open=vl(nin), len=round(lw, 3), h=round(z1 - z0 - 2 * fw, 3), z0=round(z0 + fw, 3),
                                             thick=0.05, mat='frame', shape='sash'))
                def sash_box(nm, a_, b_, za, zb, w_, mt):
                    p0_ = hinge_p + cd * a_
                    p1_ = hinge_p + cd * b_
                    nr_ = Vector((-cd.y, cd.x)) * (w_ / 2)
                    quad_box(f"{o['name']}_sash{k}_{nm}", [tuple(p0_ - nr_), tuple(p1_ - nr_), tuple(p1_ + nr_), tuple(p0_ + nr_)], za, zb, mt)
                sash_box('s0', 0, lf, z0 + fw, z1 - fw, lf, M['frame'])
                sash_box('s1', lw - lf, lw, z0 + fw, z1 - fw, lf, M['frame'])
                sash_box('rb', 0, lw, z0 + fw, z0 + fw + lf, lf, M['frame'])
                sash_box('rt', 0, lw, z1 - fw - lf, z1 - fw, lf, M['frame'])
                sash_box('glass', lf, lw - lf, z0 + fw + lf, z1 - fw - lf, 0.012, M['glass'])
        seg_box(o['name'] + '_fL', 0, fw, z0, z1, fd, M['frame'])
        seg_box(o['name'] + '_fR', L_ - fw, L_, z0, z1, fd, M['frame'])
        seg_box(o['name'] + '_fB', 0, L_, z0, z0 + fw, fd, M['frame'])
        seg_box(o['name'] + '_fT', 0, L_, z1 - fw, z1, fd, M['frame'])
        for k in range(1, 1):   # balcony: no 3-pane mullions any more (see the fixed pane above); windows: none
            s = L_ * k / n
            seg_box(o['name'] + f'_m{k}', s - fw * 0.6, s + fw * 0.6, z0, z1, fd, M['frame'])
        if o['kind'] == 'window':
            # French-balcony railing outside
            rp = mid + out_dir * (thick / 2 + 0.05)
            for k in range(int(L_ / 0.11) + 1):
                s = min(k * 0.11, L_)
                c = rp - ad * (L_ / 2) + ad * s
                box(o['name'] + f'_rb{k}', c.x - 0.008, c.y - 0.008, z0, c.x + 0.008, c.y + 0.008, z0 + 1.0, M['galv'])
            c0, c1 = rp - ad * (L_ / 2), rp + ad * (L_ / 2)
            nrm = Vector((-ad.y, ad.x)) * 0.02
            quad_box(o['name'] + '_rtop', [tuple(c0 - nrm), tuple(c1 - nrm), tuple(c1 + nrm), tuple(c0 + nrm)],
                     z0 + 1.0, z0 + 1.04, M['galv'])
            quad_box(o['name'] + '_rbot', [tuple(c0 - nrm * 0.6), tuple(c1 - nrm * 0.6), tuple(c1 + nrm * 0.6), tuple(c0 + nrm * 0.6)],
                     z0 + 0.06, z0 + 0.09, M['galv'])
    elif o['kind'] == 'door':
        # white casing on both faces
        cw, cd = 0.07, 0.015
        for sgn in (-1, 1):
            face = mid + thick_dir * sgn * (thick / 2 + cd / 2)
            for s0, s1, za, zb in [(-cw, 0, 0, o['head'] + cw), (L_, L_ + cw, 0, o['head'] + cw),
                                   (-cw, L_ + cw, o['head'], o['head'] + cw)]:
                p0 = face - ad * (L_ / 2) + ad * s0
                p1 = face - ad * (L_ / 2) + ad * s1
                nrm = thick_dir * (cd / 2)
                quad_box(o['name'] + '_cas', [tuple(p0 - nrm), tuple(p1 - nrm), tuple(p1 + nrm), tuple(p0 + nrm)],
                         za, zb, M['frame'])
        # (swing side, hinge end, open in the renders, label); Teknik pair hinges at the outer ends
        HINGED = {'door_vaer': (1, 'a1', True, 'Værelse door'), 'door_bed': (-1, 'a1', True, 'Bedroom door'),
                  'door_bath': (-1, 'a1', True, 'Bathroom door'), 'door_tek1': (-1, 'a0', False, 'Teknik cupboard'),
                  'door_tek2': (-1, 'a1', False, 'Teknik cupboard'), 'door_entry': (1, 'a0', False, 'Front door')}
        if o['name'] in HINGED:
            into, hs, open_in_render, label = HINGED[o['name']]
            hinge, other = (a1, a0) if hs == 'a1' else (a0, a1)
            leaf_dir = thick_dir * (-into)
            closed_dir = (other - hinge).normalized()
            EXTRAS['hinged'].append(dict(id=o['name'], label=label, hinge=vl(hinge), closed=vl(closed_dir), open=vl(leaf_dir),
                                         len=round(L_ - 0.02, 3), h=round(o['head'] - 0.01, 3), z0=0.0, thick=0.04,
                                         mat='door', handle=True))
            dd = leaf_dir if open_in_render else closed_dir
            tip = hinge + dd * (L_ - 0.02)
            nrm = Vector((-dd.y, dd.x)) * 0.02
            quad_box(o['name'] + '_leaf', [tuple(hinge - nrm), tuple(tip - nrm), tuple(tip + nrm), tuple(hinge + nrm)],
                     0, o['head'] - 0.01, M['door'])
        else:
            nrm = thick_dir * 0.02
            quad_box(o['name'] + '_leaf', [tuple(a0 - nrm), tuple(a1 - nrm), tuple(a1 + nrm), tuple(a0 + nrm)],
                     0, o['head'], M['door'])

# ---------------------------------------------------------------- floor / ceiling
floor_ring = [P(p) for p in G['floor']]
prism('Floor', [floor_ring], -0.25, 0.0, M['floor'])
prism('Ceiling', [floor_ring], H, H + 0.25, M['ceiling'], coll_ceiling)
bath = [P(p) for p in [(1170, 1000), (1498, 1022), (1482, 1272), (1152, 1248)]]
prism('Bath floor', [bath], 0.0, 0.004, M['tile_floor'])
# bathroom wall paint: thin skin inside bath walls
# (kept simple: tint the bath box interior via a slightly inset greige volume)

# ---------------------------------------------------------------- balcony
bal = []
cxb, cyb, rb = P((312, 210))[0], P((312, 210))[1], 88 / S
# rotate balcony slightly to match plan tilt
ang = math.atan2(-(340 - 312), 800 - 412)
ca, sa = math.cos(ang), math.sin(ang)


def rot(x, y):
    return (cxb + x * ca - y * sa, cyb + x * sa + y * ca)


length = (840 - 312) / S
for s in range(0, 181, 10):
    a = math.radians(90 + s)
    bal.append(rot(rb * math.cos(a), rb * math.sin(a)))
bal += [rot(length, -rb), rot(length, rb)]
prism('Balcony slab', [bal], -0.22, -0.02, M['concrete'])
# railing: bars along curved + long outer edges
rail_pts = []
for s in range(0, 181, 4):
    a = math.radians(90 + s)
    rail_pts.append(rot((rb - 0.04) * math.cos(a), (rb - 0.04) * math.sin(a)))
k = 0
for (x, y) in rail_pts:
    box(f'Bal_bar{k}', x - 0.01, y - 0.01, 0, x + 0.01, y + 0.01, 1.1, M['galv']); k += 1
for sgn in (1,):
    n = int(length / 0.11)
    for i in range(n + 1):
        x, y = rot(i * length / n, sgn * (rb - 0.04))
        box(f'Bal_bar{k}', x - 0.01, y - 0.01, 0, x + 0.01, y + 0.01, 1.1, M['galv']); k += 1
    n = int(2 * rb / 0.11)
    for i in range(n + 1):
        x, y = rot(length - 0.04, -rb + i * 2 * rb / n)
        box(f'Bal_bar{k}', x - 0.01, y - 0.01, 0, x + 0.01, y + 0.01, 1.1, M['galv']); k += 1

def rail_path(name, pts, z0, z1, w):
    for i in range(len(pts) - 1):
        a, b = Vector(pts[i]), Vector(pts[i + 1])
        if (b - a).length < 1e-4:
            continue
        d = (b - a).normalized()
        n = Vector((-d.y, d.x)) * (w / 2)
        a2, b2 = a - d * 0.01, b + d * 0.01
        quad_box(f'{name}{i}', [tuple(a2 - n), tuple(b2 - n), tuple(b2 + n), tuple(a2 + n)], z0, z1, M['galv'])


path = list(reversed(rail_pts))
path += [rot(i * length / 20, rb - 0.04) for i in range(1, 21)]
path += [rot(length - 0.04, rb - i * 2 * rb / 10) for i in range(1, 11)]
rail_path('Bal_handrail', path, 1.08, 1.13, 0.06)
rail_path('Bal_bottomrail', path, 0.07, 0.10, 0.03)

# ---------------------------------------------------------------- kitchen (from photo)
KX0, KY0 = P((370, 1326))            # inner SW corner (west wall / south wall)
TEK_X = P((851, 0))[0]               # west face of Teknik box
ARM_END_Y = P((0, 1040))[1]          # end of short arm
D, DU = 0.60, 0.36                   # base / upper depth
TK = 0.10                            # plinth
BT, WT = 0.88, 0.02                  # base carcass top, worktop thickness
UZ0, UZ1 = 1.46, H - 0.06            # uppers
TALL_W = 0.62
GAP = 0.004
ko = M['oak']


def fronts_x(prefix, x0, x1, y_face, z0, z1, n_cols, rows, facing=1):
    """Fronts on a face parallel to X at y=y_face (facing +Y if facing=1)."""
    w = (x1 - x0) / n_cols
    zs = [z0 + (z1 - z0) * r for r in rows]
    for i in range(n_cols):
        for j in range(len(zs) - 1):
            fx0, fx1 = x0 + i * w + GAP, x0 + (i + 1) * w - GAP
            fz0, fz1 = zs[j] + GAP, zs[j + 1] - GAP
            ya, yb = (y_face, y_face + 0.018) if facing == 1 else (y_face - 0.018, y_face)
            box(f'{prefix}_{i}_{j}', fx0, ya, fz0, fx1, yb, fz1, ko)


def fronts_y(prefix, y0, y1, x_face, z0, z1, n_cols, rows, facing=-1):
    w = (y1 - y0) / n_cols
    zs = [z0 + (z1 - z0) * r for r in rows]
    for i in range(n_cols):
        for j in range(len(zs) - 1):
            fy0, fy1 = y0 + i * w + GAP, y0 + (i + 1) * w - GAP
            fz0, fz1 = zs[j] + GAP, zs[j + 1] - GAP
            xa, xb = (x_face - 0.018, x_face) if facing == -1 else (x_face, x_face + 0.018)
            box(f'{prefix}_{i}_{j}', xa, fy0, fz0, xb, fy1, fz1, ko)


# tall fridge/pantry column at west end
TOP_T = H - 0.06
FZ0 = TK + (TOP_T - TK) * 0.36          # fridge compartment (middle front in the photo)
FZ1 = TK + (TOP_T - TK) * 0.84
box('K_tall_low', KX0, KY0, TK, KX0 + TALL_W, KY0 + D, FZ0, ko)
box('K_tall_top', KX0, KY0, FZ1, KX0 + TALL_W, KY0 + D, TOP_T, ko)
box('K_tall_plinth', KX0 + 0.02, KY0, 0, KX0 + TALL_W - 0.02, KY0 + D - 0.05, TK, ko)
M['fridge_in'] = mat_basic('Fridge liner', (0.94, 0.95, 0.96), 0.3)
M['fridge_light'] = mat_basic('Fridge light', (1, 1, 1), 0.5, **{'Emission Color': (1.0, 0.97, 0.9, 1), 'Emission Strength': 3.0})
M['shelf_glass'] = mat_basic('Shelf glass', (0.8, 0.9, 0.9), 0.05, **{'Alpha': 0.35})
fx0, fx1, fy0, fy1 = KX0, KX0 + TALL_W, KY0, KY0 + D
box('K_fridge_side_l', fx0, fy0, FZ0, fx0 + 0.04, fy1, FZ1, M['fridge_in'])
box('K_fridge_side_r', fx1 - 0.04, fy0, FZ0, fx1, fy1, FZ1, M['fridge_in'])
# the column's exposed side towards the worktop: kitchen oak, not the white liner (covers the door edge too)
box('K_fridge_side_skin', fx1, fy0, FZ0, fx1 + 0.005, fy1 + 0.018, FZ1, ko)
box('K_fridge_back', fx0, fy0, FZ0, fx1, fy0 + 0.05, FZ1, M['fridge_in'])
box('K_fridge_bottom', fx0, fy0, FZ0, fx1, fy1, FZ0 + 0.04, M['fridge_in'])
box('K_fridge_top', fx0, fy0, FZ1 - 0.04, fx1, fy1, FZ1, M['fridge_in'])
box('K_fridge_light', fx0 + 0.15, fy0 + 0.15, FZ1 - 0.045, fx1 - 0.15, fy0 + 0.35, FZ1 - 0.04, M['fridge_light'])
for i in range(1, 4):
    zsh = FZ0 + (FZ1 - FZ0) * i / 4
    box(f'K_fridge_shelf{i}', fx0 + 0.04, fy0 + 0.05, zsh, fx1 - 0.04, fy1 - 0.05, zsh + 0.008, M['shelf_glass'])
fronts_x('K_tallF', KX0, KX0 + TALL_W, KY0 + D, TK, FZ0 + GAP, 1, [0, 1.0])
fronts_x('K_tallT', KX0, KX0 + TALL_W, KY0 + D, FZ1 - GAP, TOP_T, 1, [0, 1.0])
box('K_fridge_door', KX0 + GAP, KY0 + D, FZ0 + GAP, KX0 + TALL_W - GAP, KY0 + D + 0.018, FZ1 - GAP, ko)
EXTRAS['hinged'].append(dict(id='fridge', label='Fridge', hinge=[round(KX0 + GAP, 4), round(KY0 + D + 0.009, 4)],
                             closed=[1.0, 0.0], open=[0.0, 1.0], len=round(TALL_W - 2 * GAP, 3),
                             h=round(FZ1 - FZ0 - 2 * GAP, 3), z0=round(FZ0 + GAP, 3), thick=0.018, mat='oak', handle=False))

# long arm along south wall
LX0, LX1 = KX0 + TALL_W, TEK_X
box('K_long', LX0, KY0, TK, LX1, KY0 + D, BT, ko)
box('K_long_plinth', LX0, KY0, 0, LX1, KY0 + D - 0.05, TK, ko)
box('K_long_top', LX0, KY0, BT, LX1, KY0 + D + 0.01, BT + WT, M['worktop'])
fronts_x('K_longF', LX0, LX1 - D, KY0 + D, TK, BT, 5, [0, 0.45, 1.0])

# short arm along Teknik wall, rounded front end corner (from photo)
SX0 = TEK_X - D
arm = rounded_rect(SX0, KY0 + D, TEK_X, ARM_END_Y, {'ul'}, 0.16)
prism('K_short', [arm], TK, BT, ko)
arm_p = rounded_rect(SX0 + 0.05, KY0 + D, TEK_X, ARM_END_Y - 0.03, {'ul'}, 0.14)
prism('K_short_plinth', [arm_p], 0, TK, ko)
top = rounded_rect(SX0 - 0.01, KY0, TEK_X, ARM_END_Y + 0.01, {'ul'}, 0.17)
prism('K_short_top', [top], BT, BT + WT, M['worktop'])
# short-arm fronts: drawers | oven | drawers
sy0, sy1 = KY0 + D, ARM_END_Y - 0.16
oven_y0 = sy0 + 0.30
oven_y1 = oven_y0 + 0.60
fronts_y('K_shortF_a', sy0, oven_y0, SX0, TK, BT, 1, [0, 0.45, 1.0])
fronts_y('K_shortF_b', oven_y1, sy1, SX0, TK, BT, 2, [0, 0.45, 1.0])
box('K_oven', SX0 - 0.02, oven_y0 + GAP, TK + 0.12, SX0 + 0.01, oven_y1 - GAP, TK + 0.72, M['black'])
box('K_oven_drawer', SX0 - 0.018, oven_y0 + GAP, TK, SX0, oven_y1 - GAP, TK + 0.115, ko)
box('K_hob', SX0 + 0.06, oven_y0 + 0.05, BT + WT, SX0 + 0.58, oven_y0 + 0.83, BT + WT + 0.006, M['black'])

# sink + tap on long arm
sxc = P((632, 0))[0]
box('K_sink', sxc - 0.25, KY0 + 0.12, BT + WT - 0.001, sxc + 0.25, KY0 + 0.52, BT + WT + 0.001, M['steel'])
box('K_tap', sxc + 0.02, KY0 + 0.06, BT + WT, sxc + 0.06, KY0 + 0.10, BT + WT + 0.30, M['steel'])
box('K_tapspout', sxc + 0.02, KY0 + 0.06, BT + WT + 0.28, sxc + 0.06, KY0 + 0.26, BT + WT + 0.31, M['steel'])

# white back-splash wall is just the wall; uppers
box('K_up_long', LX0, KY0, UZ0, TEK_X - DU, KY0 + DU, UZ1, ko)
fronts_x('K_up_longF', LX0, TEK_X - DU - 0.25, KY0 + DU, UZ0, UZ1, 5, [0, 1.0])
# open corner shelf niche (dark inside hint)
box('K_niche_back', TEK_X - DU - 0.25, KY0 + 0.01, UZ0 + 0.02, TEK_X - DU - 0.02, KY0 + 0.02, UZ1 - 0.02,
    M['oak'])
for i in range(5):
    z = UZ0 + 0.02 + i * (UZ1 - UZ0 - 0.04) / 4
    box(f'K_shelf{i}', TEK_X - DU - 0.25, KY0, z, TEK_X - DU - 0.02, KY0 + DU, z + 0.018, ko)
up_s = rounded_rect(TEK_X - DU, KY0, TEK_X, ARM_END_Y, {'ul'}, 0.14)
prism('K_up_short', [up_s], UZ0, UZ1, ko)
fronts_y('K_up_shortF', KY0 + DU, ARM_END_Y - 0.14, TEK_X - DU, UZ0, UZ1, 4, [0, 1.0])

# ---------------------------------------------------------------- bathroom fixtures (from the photo)
M['porcelain'] = mat_basic('Porcelain', (0.93, 0.93, 0.92), 0.15)
M['mirror'] = mat_basic('Mirror', (0.9, 0.9, 0.9), 0.02, 1.0)
M['shower_tile'] = mat_tiles('Shower tile', (0.28, 0.22, 0.18), 0.6)
M['vanity'] = mat_oak('Vanity oak', False, base=(0.50, 0.30, 0.16), rough=0.5, grain_axis='Z', wscale=9.0, contrast=(0.86, 1.06))
BATH_Y = P((0, 1008))[1]                       # inner face of the wall towards the bedroom
# wall-hung oak vanity (two drawers), white top with an integrated basin, big mirror above (as in the photo)
M['bath_mirror'] = mat_basic('Bath mirror', (0.70, 0.76, 0.79), 0.12, 0.35)
M['basin'] = mat_basic('Basin', (0.84, 0.85, 0.85), 0.2)
M['towel'] = mat_basic('Towel', (0.62, 0.66, 0.58), 0.95)
M['bottle_a'] = mat_basic('Bottle white', (0.92, 0.92, 0.90), 0.3)
M['bottle_b'] = mat_basic('Bottle amber', (0.55, 0.32, 0.14), 0.25)
vx0, vx1 = P((1176, 0))[0], P((1268, 0))[0]
VD = 0.47                                      # vanity depth
box('Bath_vanity', vx0, BATH_Y - VD, 0.40, vx1, BATH_Y, 0.82, M['vanity'])
box('Bath_vanity_split', vx0 + 0.01, BATH_Y - VD - 0.002, 0.605, vx1 - 0.01, BATH_Y - VD + 0.004, 0.615, M['black'])
box('Bath_vanity_grip', vx0 + 0.01, BATH_Y - VD - 0.004, 0.795, vx1 - 0.01, BATH_Y - VD + 0.02, 0.82, M['black'])
box('Bath_vanity_top', vx0 - 0.01, BATH_Y - VD - 0.02, 0.82, vx1 + 0.01, BATH_Y, 0.87, M['porcelain'])
bcx, bcy = (vx0 + vx1) / 2, BATH_Y - 0.25
basin = [(bcx + 0.22 * math.cos(a), bcy + 0.14 * math.sin(a)) for a in [i * math.pi / 16 for i in range(32)]]
prism('Bath_basin', [basin], 0.87, 0.8715, M['basin'])
drain = [(bcx + 0.022 * math.cos(a), bcy + 0.022 * math.sin(a)) for a in [i * math.pi / 8 for i in range(16)]]
prism('Bath_basin_drain', [drain], 0.8715, 0.873, M['steel'])
tap = [(bcx + 0.022 * math.cos(a), BATH_Y - 0.06 + 0.022 * math.sin(a)) for a in [i * math.pi / 8 for i in range(16)]]
prism('Bath_tap', [tap], 0.87, 1.06, M['steel'])
box('Bath_tap_spout', bcx - 0.012, BATH_Y - 0.19, 1.035, bcx + 0.012, BATH_Y - 0.06, 1.06, M['steel'])
box('Bath_tap_lever', bcx - 0.008, BATH_Y - 0.08, 1.06, bcx + 0.008, BATH_Y - 0.02, 1.075, M['steel'])
box('Bath_mirror_back', vx0, BATH_Y - 0.025, 1.0, vx1, BATH_Y, 2.05, M['steel'])
box('Bath_mirror', vx0 + 0.005, BATH_Y - 0.03, 1.005, vx1 - 0.005, BATH_Y - 0.02, 2.045, M['bath_mirror'])
box('Bath_mirror_light', vx0 + 0.05, BATH_Y - 0.04, 2.06, vx1 - 0.05, BATH_Y - 0.01, 2.08, M['fridge_light'] if 'fridge_light' in M else M['porcelain'])
tc = Vector(P((1318, 1085)))
wc = [(tc.x + 0.18 * math.cos(a), tc.y - 0.05 + 0.27 * math.sin(a)) for a in [i * math.pi / 12 for i in range(24)]]
prism('Bath_wc', [wc], 0.22, 0.42, M['porcelain'])
water = [(tc.x + 0.11 * math.cos(a), tc.y - 0.07 + 0.17 * math.sin(a)) for a in [i * math.pi / 12 for i in range(24)]]
prism('Bath_wc_water', [water], 0.42, 0.4215, M['black'])
lid = [(tc.x + 0.175 * math.cos(a), tc.y - 0.08 + 0.23 * math.sin(a)) for a in [i * math.pi / 12 for i in range(24)]]
prism('Bath_wc_lid', [lid], 0.422, 0.447, M['porcelain'])
EXTRAS['hinged'].append(dict(id='wc_lid', label='Toilet lid', shape='lid', hinge=[round(tc.x, 4), round(tc.y + 0.15, 4)],
                             closed=[0.0, -1.0], open=[0.0, -1.0], len=0.46, w=0.35, open_angle=1.6, h=0.025, z0=0.422, thick=0.025, mat='porcelain'))
box('Bath_wc_tank', tc.x - 0.2, tc.y + 0.2, 0.0, tc.x + 0.2, tc.y + 0.27, 1.15, M['bathwall'])
# shower: dark tiles on the three shower walls + a fixed glass screen
sx0, sx1 = P((1400, 0))[0], P((1490, 0))[0]
sy0, sy1 = P((0, 1180))[1], P((0, 1025))[1]
box('Bath_shower_floor', sx0, sy0, 0.0, sx1, sy1, 0.008, M['shower_tile'])
box('Bath_shower_back', sx1 - 0.02, sy0, 0.0, sx1, sy1, 2.2, M['shower_tile'])
box('Bath_shower_side', sx0, sy1 - 0.02, 0.0, sx1, sy1, 2.2, M['shower_tile'])
box('Bath_shower_glass', sx0 - 0.01, P((0, 1100))[1], 0.0, sx0 + 0.01, P((0, 1058))[1], 2.0, M['glass'])   # walk-in: no door
# shower fittings: rain head on an arm, riser rail with hand shower, thermostat mixer, soap shelf with bottles, linear drain
hy = (sy0 + sy1) / 2
bw = sx1 - 0.02                                   # face of the tiled back wall
box('Bath_sh_rail', bw - 0.03, hy - 0.012, 0.95, bw, hy + 0.012, 2.05, M['steel'])
box('Bath_sh_arm', bw - 0.34, hy - 0.012, 2.12, bw, hy + 0.012, 2.145, M['steel'])
rain = [(bw - 0.34 + 0.13 * math.cos(a), hy + 0.13 * math.sin(a)) for a in [i * math.pi / 16 for i in range(32)]]
prism('Bath_sh_rainhead', [rain], 2.09, 2.115, M['steel'])
prism('Bath_sh_rainface', [[(x - 0.0, y) for x, y in rain]], 2.087, 2.09, M['black'])
box('Bath_sh_hand', bw - 0.09, hy - 0.03, 1.55, bw - 0.03, hy + 0.03, 1.8, M['steel'])
box('Bath_sh_mixer', bw - 0.06, hy - 0.16, 1.0, bw, hy + 0.16, 1.07, M['steel'])
for k_, dy_ in enumerate((-0.12, 0.12)):
    knob = [(bw - 0.06 - 0.03 * (1 + math.cos(a)) * 0.5 * 0, hy + dy_ + 0.03 * math.sin(a)) for a in [i * math.pi / 8 for i in range(16)]]
    box(f'Bath_sh_knob{k_}', bw - 0.1, hy + dy_ - 0.028, 1.007, bw - 0.06, hy + dy_ + 0.028, 1.063, M['steel'])
box('Bath_sh_shelf', sx1 - 0.34, sy1 - 0.15, 1.18, sx1 - 0.02, sy1 - 0.02, 1.195, M['steel'])
for k_, (bx_, r_, h_, mt_) in enumerate(((sx1 - 0.28, 0.03, 0.2, 'bottle_a'), (sx1 - 0.18, 0.028, 0.17, 'bottle_b'), (sx1 - 0.09, 0.026, 0.14, 'bottle_a'))):
    bt = [(bx_ + r_ * math.cos(a), sy1 - 0.085 + r_ * math.sin(a)) for a in [i * math.pi / 8 for i in range(16)]]
    prism(f'Bath_sh_bottle{k_}', [bt], 1.195, 1.195 + h_, M[mt_])
    cap = [(bx_ + r_ * 0.55 * math.cos(a), sy1 - 0.085 + r_ * 0.55 * math.sin(a)) for a in [i * math.pi / 8 for i in range(16)]]
    prism(f'Bath_sh_cap{k_}', [cap], 1.195 + h_, 1.195 + h_ + 0.03, M['black'])
box('Bath_sh_drain', sx1 - 0.12, sy0 + 0.1, 0.008, sx1 - 0.06, sy1 - 0.1, 0.011, M['steel'])

# electric towel warmer on the wall to the right as you come in, with a towel over it
TW_Y = P((0, 1259))[1]                           # inner face of that wall
twx0, twx1 = 8.32, 8.82
box('Bath_tw_rail_l', twx0, TW_Y + 0.03, 0.35, twx0 + 0.03, TW_Y + 0.06, 1.55, M['steel'])
box('Bath_tw_rail_r', twx1 - 0.03, TW_Y + 0.03, 0.35, twx1, TW_Y + 0.06, 1.55, M['steel'])
for k_ in range(11):
    z_ = 0.42 + k_ * 0.11
    box(f'Bath_tw_bar{k_}', twx0, TW_Y + 0.035, z_, twx1, TW_Y + 0.055, z_ + 0.02, M['steel'])
for zz_ in (0.5, 1.4):
    box(f'Bath_tw_bracket{zz_}', twx0 + 0.005, TW_Y, zz_, twx0 + 0.025, TW_Y + 0.035, zz_ + 0.02, M['steel'])
    box(f'Bath_tw_bracket_r{zz_}', twx1 - 0.025, TW_Y, zz_, twx1 - 0.005, TW_Y + 0.035, zz_ + 0.02, M['steel'])
box('Bath_tw_plug', twx1 + 0.05, TW_Y, 0.3, twx1 + 0.13, TW_Y + 0.02, 0.38, M['porcelain'])
# towel folded over the bar at 1.30 m: front drop, back drop, rounded top
box('Bath_towel_front', twx0 + 0.06, TW_Y + 0.062, 0.78, twx1 - 0.06, TW_Y + 0.085, 1.33, M['towel'])
box('Bath_towel_back', twx0 + 0.06, TW_Y + 0.015, 0.95, twx1 - 0.06, TW_Y + 0.032, 1.33, M['towel'])
box('Bath_towel_top', twx0 + 0.06, TW_Y + 0.015, 1.33, twx1 - 0.06, TW_Y + 0.085, 1.355, M['towel'])
# washer + dryer stack
wx0, wx1 = P((1415, 0))[0], P((1482, 0))[0]
wy0, wy1 = P((0, 1266))[1], P((0, 1192))[1]
M['appl_panel'] = mat_basic('Appliance panel', (0.80, 0.81, 0.82), 0.3)
M['chrome'] = mat_basic('Chrome', (0.85, 0.86, 0.88), 0.12, 1.0)
M['door_glass'] = mat_basic('Porthole glass', (0.05, 0.06, 0.07), 0.05)


def cyl_x(name, x0, x1, cy, cz, r, mat, seg=36, r_in=None):
    # cylinder (or ring when r_in is given) along the x axis
    verts, faces = [], []
    for x in (x0, x1):
        for j in range(seg):
            a = 2 * math.pi * j / seg
            verts.append((x, cy + r * math.cos(a), cz + r * math.sin(a)))
    if r_in:
        for x in (x0, x1):
            for j in range(seg):
                a = 2 * math.pi * j / seg
                verts.append((x, cy + r_in * math.cos(a), cz + r_in * math.sin(a)))
    for j in range(seg):
        k = (j + 1) % seg
        faces.append((j, k, seg + k, seg + j))                      # outer side
        if r_in:
            o0, o1 = 2 * seg, 3 * seg
            faces.append((o0 + k, o0 + j, o1 + j, o1 + k))          # inner side
            faces.append((j, o0 + j, o0 + k, k))                    # front ring
            faces.append((seg + k, o1 + k, o1 + j, seg + j))        # back ring
    if not r_in:
        faces.append(tuple(range(seg))[::-1])
        faces.append(tuple(range(seg, 2 * seg)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    link(ob)
    return ob


# front faces the room (-x). Washer at the bottom, dryer stacked on top, as in the photo.
cyc = (wy0 + wy1) / 2
for nm, z0_, z1_ in (('washer', 0.02, 0.85), ('dryer', 0.87, 1.70)):
    box(f'Bath_{nm}_body', wx0 + 0.01, wy0 + 0.005, z0_, wx1, wy1 - 0.005, z1_, M['porcelain'])
    box(f'Bath_{nm}_panel', wx0, wy0 + 0.005, z1_ - 0.11, wx0 + 0.012, wy1 - 0.005, z1_ - 0.01, M['appl_panel'])
    box(f'Bath_{nm}_display', wx0 - 0.002, cyc - 0.06, z1_ - 0.085, wx0, cyc + 0.06, z1_ - 0.045, M['black'])
    box(f'Bath_{nm}_knob', wx0 - 0.02, cyc + 0.14, z1_ - 0.085, wx0, cyc + 0.19, z1_ - 0.035, M['chrome'])
    if nm == 'washer':
        box('Bath_washer_drawer', wx0 - 0.004, wy1 - 0.2, z1_ - 0.1, wx0 + 0.005, wy1 - 0.02, z1_ - 0.02, M['porcelain'])
        box('Bath_washer_kick', wx0 + 0.005, wy0 + 0.02, z0_ - 0.02, wx0 + 0.02, wy1 - 0.02, z0_ + 0.06, M['appl_panel'])
    zc = (z0_ + z1_ - 0.11) / 2
    cyl_x(f'Bath_{nm}_door_ring', wx0 - 0.035, wx0 + 0.01, cyc, zc, 0.175, M['chrome'], r_in=0.14)
    cyl_x(f'Bath_{nm}_door_glass', wx0 - 0.03, wx0 + 0.005, cyc, zc, 0.141, M['door_glass'])
    cyl_x(f'Bath_{nm}_door_handle', wx0 - 0.05, wx0 - 0.03, cyc - 0.19, zc, 0.03, M['chrome'], seg=16)
    cyl_x(f'Bath_{nm}_drum', wx0 + 0.008, wx0 + 0.012, cyc, zc, 0.15, M['black'])   # dark drum opening behind the door
    EXTRAS['hinged'].append(dict(id=f'{nm}_door', label='Washing machine' if nm == 'washer' else 'Dryer', shape='round',
                                 hinge=[round(wx0 - 0.012, 4), round(cyc + 0.175, 4)], closed=[0.0, -1.0], open=[-1.0, 0.0],
                                 len=0.35, h=0.35, z0=round(zc - 0.175, 3), thick=0.045, mat='chrome'))

# ---------------------------------------------------------------- sockets & switches (read from the photos)
# (label, px, py on the wall face, height m, wall normal in Blender xy, kind)
OUTLETS = [
    ('Socket, west wall', 371, 935, 0.30, (1, 0), 'socket'),
    ('Socket, by balcony door', 393, 369, 0.30, (0, -1), 'socket'),
    ('Socket, living east wall', 849, 420, 0.30, (-1, 0), 'socket'),
    ('Double socket, kitchen', 742, 1325, 1.05, (0, 1), 'socket2'),
    ('Socket, kitchen by tall unit', 502, 1325, 1.05, (0, 1), 'socket'),
    # 2026-11-18: no switch on the kitchen end wall (Gianluca, on site): the living switch is on the TV wall by the hall end
    ('Switch, hallway by Værelse door', 1030, 851, 1.05, (0, -1), 'switch'),
]
M['socket'] = mat_basic('Socket plate', (0.93, 0.93, 0.92), 0.35)
M['socket_hole'] = mat_basic('Socket hole', (0.05, 0.05, 0.05), 0.5)
for i, (lab, px_, py_, z, nrm, kind) in enumerate(OUTLETS):
    c = Vector(P((px_, py_)))
    n = Vector(nrm)
    t = Vector((-n.y, n.x))
    w = 0.16 if kind == 'socket2' else 0.085
    hgt = 0.085
    p0 = c - t * w / 2
    p1 = c + t * w / 2
    quad_box(f'Outlet_{i}', [tuple(p0), tuple(p1), tuple(p1 + n * 0.012), tuple(p0 + n * 0.012)],
             z - hgt / 2, z + hgt / 2, M['socket'])
    if kind.startswith('socket'):
        for j in range(2 if kind == 'socket2' else 1):
            cc = c + t * ((j - 0.5) * 0.08 if kind == 'socket2' else 0)
            q0, q1 = cc - t * 0.022, cc + t * 0.022
            quad_box(f'Outlet_{i}_h{j}', [tuple(q0 + n * 0.012), tuple(q1 + n * 0.012), tuple(q1 + n * 0.014),
                                          tuple(q0 + n * 0.014)], z - 0.022, z + 0.022, M['socket_hole'])

# ---------------------------------------------------------------- context (neighbours + canal)
ZG = -9.6   # 3rd floor (3. sal): three storeys of ~3 m above a taller ground floor
# canal runs along the north side (outside the two living-room windows), not the balcony side
# Layout from the aerial photo Gianluca sent (2026-09-30), ~10 px/m: the canal runs along our canal facade (x = 0),
# NW (Blender -y) into the harbour and SE (+y) past the road bridge between the blocks on the far side of the main road.
# Our side has an ~11 m quay (Grethe Ingmanns Vej: paving, a quay road with parking, timber deck at the water).
# The main road crosses the canal ~40 m past our balcony facade; in between is the empty lot for the care home.
CW0, CW1 = -25.0, -11.0          # canal edges (Blender x): ~14 m of water
QN = -25.3                       # facade of the block across the canal: it stands at the water's edge (3D map view of the SATS building)
CY0 = -75.0                      # the canal opens into the harbour here (Blender y)
CYS, CYN = -95.0, -60.0          # harbour edge on our side / on the far side (the steel footbridge crosses the mouth, drawn by the web viewer)
RS0, RS1 = 48.0, 61.0            # main road incl. sidewalks (Blender y); carriageway RY0..RY1
RY0, RY1 = 50.0, 59.0
HB = CY0                         # kept for older references
M['asphalt'] = mat_basic('Asphalt', (0.20, 0.20, 0.21), 0.9)
M['road_paint'] = mat_basic('Road paint', (0.85, 0.85, 0.82), 0.6)
box('Ground_far', -400, -400, ZG - 2.0, 400, 400, ZG - 1.3, M['ground'])   # below the water line
PX0, PY0, PY1 = -35.0, 40.0, 48.0            # stepped pier down to the water between the SATS building and the bridge (web viewer builds it)
box('Quay_north', -300, CYN, ZG - 1.8, PX0, 300, ZG, M['ground'])
box('Quay_north_a', PX0, CYN, ZG - 1.8, CW0, PY0, ZG, M['ground'])
box('Quay_north_b', PX0, PY1, ZG - 1.8, CW0, 300, ZG, M['ground'])
box('Quay_south', CW1, CYS, ZG - 1.8, 300, 300, ZG, M['ground'])
box('Canal', CW0, CYS - 1, ZG - 1.8, CW1, 300, ZG - 1.1, M['water'])
box('Harbour', -300, -240, ZG - 1.8, 300, CYN, ZG - 1.1, M['water'])
box('Harbour_s', CW0, -240, ZG - 1.8, 300, CYS, ZG - 1.1, M['water'])
box('Harbour_far_quay', -300, -310, ZG - 1.8, 300, -240, ZG, M['ground'])
box('Deck_south', CW1, CYS, ZG, CW1 + 2.4, 300, ZG + 0.06, M['deck'])
box('Deck_north', CW0 - 0.3, CYN, ZG, CW0, PY0, ZG + 0.06, M['deck'])
box('Deck_north_b', CW0 - 0.3, PY1, ZG, CW0, 300, ZG + 0.06, M['deck'])
box('Deck_harbour_s', CW1, CYS, ZG, 300, CYS + 2.4, ZG + 0.06, M['deck'])
box('Deck_harbour_n', -300, CYN, ZG, CW0, CYN + 2.4, ZG + 0.06, M['deck'])
# timber sheet-pile quay walls (photo from across the canal)
box('Quay_timber_s', CW1 - 0.04, CYS, ZG - 1.1, CW1, 300, ZG + 0.06, M['deck'])
box('Quay_timber_n', CW0, CYN, ZG - 1.1, CW0 + 0.04, PY0, ZG + 0.06, M['deck'])
box('Quay_timber_n_b', CW0, PY1, ZG - 1.1, CW0 + 0.04, 300, ZG + 0.06, M['deck'])
box('Quay_timber_hs', CW1, CYS - 0.04, ZG - 1.1, 300, CYS, ZG + 0.06, M['deck'])
box('Quay_timber_hn', -300, CYN - 0.04, ZG - 1.1, CW0, CYN, ZG + 0.06, M['deck'])
# Grethe Ingmanns Vej: quay road along our side of the canal, ending at the main road
box('Road_quay', CW1 + 2.4, CYS + 2.4, ZG, -2.6, RS0, ZG + 0.03, M['asphalt'])
# main road (runs along x) with sidewalks; the bridge carries it over the canal
box('Road_sidewalk_s', -300, RS0, ZG, 300, RY0, ZG + 0.12, M['concrete'])
box('Road_sidewalk_n', -300, RY1, ZG, 300, RS1, ZG + 0.12, M['concrete'])
box('Road_west', -300, RY0, ZG, CW0 - 2.4, RY1, ZG + 0.03, M['asphalt'])
box('Road_east', CW1 + 2.4, RY0, ZG, 300, RY1, ZG + 0.03, M['asphalt'])
for i in range(0, 300):
    x = -298 + i * 2.0
    if CW0 - 2.4 < x < CW1 + 2.4:
        continue
    box(f'Road_dash{i}', x, (RY0 + RY1) / 2 - 0.06, ZG + 0.03, x + 1.0, (RY0 + RY1) / 2 + 0.06, ZG + 0.035, M['road_paint'])
# road bridge over the canal (Gianluca: it carries cars, not a footbridge): concrete deck + curbs, asphalt carrying the
# centre line, solid concrete parapets with a steel rail, a deep girder under the deck, street lamps at the ends
BY0, BY1 = RS0, RS1
bx0, bx1 = CW0 - 2.4, CW1 + 2.4
box('Bridge_deck', bx0, BY0, ZG - 0.55, bx1, BY1, ZG, M['concrete'])
box('Bridge_asphalt', bx0, RY0, ZG, bx1, RY1, ZG + 0.03, M['asphalt'])
box('Bridge_girder', CW0, RY0 + 0.8, ZG - 1.05, CW1, RY1 - 0.8, ZG - 0.55, M['concrete'])
for i in range(int((bx1 - bx0) / 2.0)):
    x = bx0 + 0.6 + i * 2.0
    box(f'Bridge_dash{i}', x, (RY0 + RY1) / 2 - 0.06, ZG + 0.03, x + 1.0, (RY0 + RY1) / 2 + 0.06, ZG + 0.035, M['road_paint'])
for y0_, y1_ in ((BY0, RY0), (RY1, BY1)):
    box(f'Bridge_walk_{y0_:.0f}', bx0, y0_, ZG, bx1, y1_, ZG + 0.15, M['concrete'])
for y0_, y1_ in ((BY0, BY0 + 0.3), (BY1 - 0.3, BY1)):
    box(f'Bridge_parapet_{y0_:.0f}', bx0, y0_, ZG + 0.15, bx1, y1_, ZG + 0.85, M['concrete'])
    box(f'Bridge_rail_{y0_:.0f}', bx0, y0_ + 0.1, ZG + 1.0, bx1, y1_ - 0.1, ZG + 1.06, M['galv'])
    nposts = int((bx1 - bx0) / 2.0)
    for i in range(nposts + 1):
        x = bx0 + 0.1 + i * (bx1 - bx0 - 0.2) / nposts
        box(f'Bridge_post_{y0_:.0f}_{i}', x - 0.03, y0_ + 0.12, ZG + 0.85, x + 0.03, y1_ - 0.12, ZG + 1.0, M['galv'])
lamps = [(bx0 + 0.3, BY0 + 0.15), (bx1 - 0.3, BY1 - 0.15), (bx0 + 0.3, BY1 - 0.15), (bx1 - 0.3, BY0 + 0.15)]
lamps += [(x_, RS0 + 0.4) for x_ in (8.0, 32.0, -50.0, -75.0)] + [(x_, RS1 - 0.4) for x_ in (12.0, 36.0, -55.0)]
lamps += [(CW1 + 2.9, y_) for y_ in (-60.0, -35.0, -10.0, 15.0, 38.0)]
for (lx, ly) in lamps:
    z0_ = ZG + (0.85 if bx0 <= lx <= bx1 else 0.0)
    box(f'Street_lamp_pole_{lx:.0f}_{ly:.0f}', lx - 0.06, ly - 0.06, z0_, lx + 0.06, ly + 0.06, ZG + 7.0, M['galv'])
    box(f'Street_lamp_head_{lx:.0f}_{ly:.0f}', lx - 0.22, ly - 0.22, ZG + 6.85, lx + 0.22, ly + 0.22, ZG + 7.05, M['galv'])
for i, (x0, y0, x1, y1, h, m) in enumerate([
        # the courtyard block across the canal (SATS gym on its corner by the road and the bridge)
        # (the red SATS corner building, x -60…-25.3 / y 8…40 with its stepped pier to the bridge, is built by the web viewer)
        # (the canal-side row NW of SATS, y -56…8, with balconies and moored boats, is built by the web viewer)
        (-120, 26, -60, 40, 22, 'brick_red'), (-120, -56, -106, 26, 21, 'brick_dark'), (-106, -56, -39, -42, 21, 'brick_yel'),
        # beyond the main road: blocks on both sides of the canal as it carries on
        (-120, 64, QN, 150, 21, 'brick_dark'), (CW1 + 3.0, 64, 70, 150, 21, 'brick_yel'),
        # low pavilion (bank) at the far corner of the empty lot, by the main road
        (34, 36, 46, 46, 4.2, 'brick_light'),
        # further along the main road on our side
        (72, -40, 110, 46, 20, 'brick_light')]):
    box(f'Neighbour{i}', x0, y0, ZG, x1, y1, ZG + h, M[m])
# ---- street entrance (no. 9) on the canal side, under our flat (Gianluca's photo):
# two-tone ribbed tiles (orange + beige) framed in concrete, red-brown door with glazed sidelight
M['entry_beige'] = mat_basic('Entry beige', (0.74, 0.70, 0.62), 0.8)
M['entry_orange'] = mat_basic('Entry orange', (0.86, 0.55, 0.36), 0.8)
M['entry_concrete'] = mat_basic('Entry concrete', (0.62, 0.60, 0.56), 0.9)
M['entry_frame'] = mat_basic('Entry frame', (0.45, 0.17, 0.08), 0.5)
EX0, EX1 = -0.06, -0.01                 # skin just outside the north face (x = 0)
G0 = ZG
def ent(nm, y0, y1, z0, z1, mat, dx=0.0):
    box('Own_entr_' + nm, EX0 - dx, y0, G0 + z0, EX1, y1, G0 + z1, mat)
# Gianluca's photos: the dark-tile block (our flat + the stairwell) has a light stone base; no. 9 is in the first
# salmon bay west of it, where the facade turns pink. Everything is laid out in y relative to DY (west end of the dark block).
DY = -3.05
ent('plinth', DY - 5.2, -5.65, 0.0, 0.35, M['entry_concrete'])
ent('plinth2', -4.6, 9.0, 0.0, 0.35, M['entry_concrete'])
ent('orange_low', DY - 5.2, -5.65, 0.35, 1.9, M['entry_orange'])
ent('orange_low2', -4.6, DY, 0.35, 1.9, M['entry_orange'])
ent('orange_hi', DY - 5.2, -5.65, 1.9, 3.4, M['entry_orange'])
ent('orange_hi2', -4.6, DY, 1.9, 3.4, M['entry_orange'])
ent('orange_hi3', -5.65, -4.6, 2.42, 3.4, M['entry_orange'])   # the door opening (y -5.65..-4.6, up to 2.42) is left clear: the leaf is in the web viewer
ent('beige_low', DY, 9.0, 0.35, 3.4, M['entry_beige'])
ent('band', DY - 5.2, 9.0, 3.4, 3.65, M['entry_concrete'], 0.04)
def ring(nm, y0, y1, z0, z1, t, mat, dx):
    ent(nm + 'L', y0, y0 + t, z0, z1, mat, dx); ent(nm + 'R', y1 - t, y1, z0, z1, mat, dx)
    ent(nm + 'B', y0, y1, z0, z0 + t, mat, dx); ent(nm + 'T', y0, y1, z1 - t, z1, mat, dx)
PY = DY - 4.4          # portal west edge; door leaf to the east (towards the stairwell), sidelight to the west
def py(v): return PY + (v - 0.8)
ring('portal_surround', py(0.8), py(3.9), 0.0, 2.85, 0.15, M['entry_concrete'], 0.02)
ring('portal_frame', py(0.95), py(3.75), 0.0, 2.7, 0.1, M['entry_frame'], 0.04)
ent('portal_mullion', py(2.5), py(2.6), 0.0, 2.6, M['entry_frame'], 0.045)
ent('portal_transom', py(1.05), py(3.65), 2.42, 2.52, M['entry_frame'], 0.045)
ent('portal_sill', py(1.05), py(2.5), 0.8, 0.9, M['entry_frame'], 0.045)
ent('portal_panel', py(1.05), py(2.5), 0.0, 0.8, M['entry_frame'], 0.03)
ent('portal_glass', py(1.05), py(2.5), 0.9, 2.42, M['glass'], 0.02)
ent('portal_glass_t', py(1.05), py(3.65), 2.52, 2.6, M['glass'], 0.02)
ent('portal_dark', py(1.05), py(2.5), 0.9, 2.42, M['black'], 0.005)
ent('portal_dark_t', py(1.05), py(3.65), 2.52, 2.6, M['black'], 0.005)
ent('intercom', py(0.3), py(0.55), 1.3, 1.55, M['steel'], 0.07)
# house number on the surround
ent('number_plate', py(3.3), py(3.62), 2.95, 3.25, M['steel'], 0.05)
# stone base of the dark block: windows under the stairwell and under our flat
for k, (a, b) in enumerate(((DY + 0.5, DY + 2.5), (2.2, 4.2), (5.6, 7.6))):
    ring(f'win{k}_surround', a, b, 0.8, 2.6, 0.12, M['entry_concrete'], 0.02)
    ring(f'win{k}_frame', a + 0.12, b - 0.12, 0.92, 2.48, 0.08, M['entry_frame'], 0.04)
    ent(f'win{k}_mullion', (a + b) / 2 - 0.03, (a + b) / 2 + 0.03, 0.92, 2.48, M['entry_frame'], 0.045)
    ent(f'win{k}_glass', a + 0.2, b - 0.2, 1.0, 2.4, M['glass'], 0.02)
    if k: ent(f'win{k}_dark', a + 0.2, b - 0.2, 1.0, 2.4, M['black'], 0.005)
# paved strip in front of the entrance
box('Own_entr_paving', -3.2, DY - 6.0, ZG, -0.01, 9.0, ZG + 0.05, M['entry_concrete'])

# gym on the red block's corner by the road and the bridge: glazed double-height ground floor with a lit sign band
M['shop_glass'] = mat_basic('Shop glass', (0.06, 0.07, 0.08), 0.05, **{'Emission Color': (1.0, 0.86, 0.66, 1), 'Emission Strength': 0.25})
M['gym_sign'] = mat_basic('Gym sign', (0.95, 0.95, 0.95), 0.4, **{'Emission Color': (1.0, 1.0, 1.0, 1), 'Emission Strength': 1.5})
# SATS gym on the ground floor of the corner by the road and the bridge: glazing on the canal and road faces, sign bands above
# (the lettering itself is drawn by the web viewer on top of these bands)
# (SATS glazing, signs and the building itself: see buildSats() in walk.src.html)

# skyline across the harbour, behind us to the north-west ("water with buildings in the background")
rs = __import__('random').Random(5)
x = -200.0
k = 0
while x < 200:
    w = rs.uniform(18, 42)
    hh = rs.uniform(14, 34)
    box(f'Neighbour_far{k}', x, -300, ZG, x + w, -300 + rs.uniform(14, 24), ZG + hh, M[rs.choice(['brick_yel', 'brick_red', 'brick_dark', 'brick_light'])])
    x += w + rs.uniform(4, 14)
    k += 1
# ---- our own building (photo from across the canal): the flat is the north-east corner of the 3rd floor
M['own_tile'] = mat_basic('Own dark tile', (0.16, 0.18, 0.22), 0.35)
M['own_terra'] = mat_basic('Own terracotta', (0.70, 0.40, 0.31), 0.8)
# long lot-side facade (Gianluca's 3D map view): alternating salmon ribbed bays and light grey panel bays with concrete bands
M['own_bays'] = mat_basic('Own bays', (0.78, 0.60, 0.52), 0.8)
M['own_cream'] = mat_basic('Own cream', (0.84, 0.81, 0.73), 0.8)
M['skin_tile'] = mat_basic('Skin tile', (0.16, 0.18, 0.22), 0.35)
M['rail_glass'] = mat_basic('Rail glass', (0.55, 0.6, 0.62), 0.1, **{'Alpha': 0.45})
# the rest of our own courtyard block (the flat is its north-east corner): wing along the empty lot, far wing, harbour wing, canal wing
for i, (x0, y0, x1, y1, m) in enumerate([
        (34.0, -6.0, 70.0, P((0, 206))[1], 'own_bays'), (54.0, -66.0, 70.0, -6.0, 'own_cream'),
        (0.0, -66.0, 54.0, -50.0, 'own_terra'), (0.0, -50.0, 14.0, -14.0, 'own_terra')]):
    box(f'Neighbour_ourblock{i}', x0, y0, ZG, x1, y1, H + 0.25 + 9.0, M[m])
    box(f'Neighbour_ourblock_top{i}', x0 + 1.2, y0 + 1.2, H + 0.25 + 9.0, x1 - 1.2, y1 - 1.2, H + 0.25 + 12.0, M['own_cream'])
STOREY = 3.0
TOP = H + 0.25 + 3 * STOREY          # three full storeys above us (ground + 6 floors + a recessed top floor; 3D map view)
fin_x0, fin_x1 = P((1512, 0))[0], P((1587, 0))[0]
prism('Own_below', [floor_ring], ZG, -0.25, M['own_tile'])
prism('Above_block', [floor_ring], H + 0.25, TOP, M['own_tile'])
box('Above_setback', 0.9, 0.6, TOP, fin_x0 - 0.4, P((0, 380))[1] - 1.2, TOP + STOREY, M['own_cream'])
xs, ys = fin_x1, P((0, 1383))[1]
# neighbouring parts of our building: split at our ceiling so the part above can be hidden in the overview
CUT = H + 0.25
wing_s = [P((1587, 206)), (34.0, P((0, 206))[1]), (34.0, -14.0), (P((1512, 0))[0], -14.0), P((1512, 1383)), P((1512, 1302))]
for tag, z0_, z1_ in (('Own', ZG, CUT), ('Above', CUT, TOP)):
    prism(f'{tag}_wing_s', [wing_s], z0_, z1_, M['own_bays'])
    if tag == 'Own':        # leave room for the stairwell outside our front door
        box('Own_wing_w_west', 0.0, -14.0, -0.25, P((1512, 0))[0], -3.05, z1_, M['own_terra'])
    else:
        box(f'{tag}_wing_w', 0.0, -14.0, z0_, P((1512, 0))[0], -0.01, z1_, M['own_terra'])
    box(f'{tag}_notch', P((1170, 0))[0], -0.01, z0_, P((1512, 0))[0], P((0, 1302))[1], z1_, M['own_terra'])
    box(f'{tag}_fin', fin_x0 - 0.01, P((0, 390))[1], z0_, fin_x1 + 0.01, P((0, 206))[1] + 0.01, z1_, M['own_tile'])
# ---- stairwell (opgang): dog-leg stair from the street lobby (stuen) up to our landing (3. sal), with a lift.
# Floors: stuen (street lobby) + 1., 2., 3. sal (us). Each storey = flight A down the west strip towards the canal, a half
# landing under the tall narrow canal window, flight B back down the east strip; a solid spine wall between the flights.
# The well is open above flight A / flight B on our floor (glass railing where you could drop).
M['terrazzo'] = mat_basic('Stair terrazzo', (0.55, 0.55, 0.53), 0.5)
M['stair_wall'] = mat_basic('Stair wall', (0.80, 0.79, 0.76), 0.85)
SX0, SX1, SY0, SY1 = 0.25, 7.2, -2.8, -0.01     # inside faces (N facade, S lift wall, W wall, our flat's wall)
SYE = -0.20                                     # east inner wall face below our floor
LV = [ZG + 0.05, -5.9, -2.95, 0.0]              # stuen, 1., 2., 3. sal (floor tops)
XE = 3.9                                        # landing edge: floors at x > XE, flights + half landing at x < XE
RUN = 0.28
AY0, AY1, BY0, BY1 = SY0, -1.55, -1.45, SYE     # flight strips (west A, east B); spine y -1.55..-1.45
WY0, WY1 = -1.95, -1.35                         # tall narrow canal window (one per storey)
LY0, LY1 = -1.95, -0.85                         # lift door opening in the south wall
LCX0, LCX1, LCY0, LCY1 = 7.45, 9.0, -2.3, -0.5  # lift shaft
LOBY0, LOBY1, LOBZ1 = -7.6, -3.05, -6.15        # street lobby (west of the shaft), ceiling height
DOORY0, DOORY1, DOORZ = -5.65, -4.6, 2.42       # entrance door leaf (no. 9)


def wall_holes(name, axis, a0, a1, t0, t1, z0, z1, holes, mat):
    """Wall spanning a0..a1 along axis ('x' or 'y'), thickness t0..t1, with rectangular holes (ha0, ha1, hz0, hz1)."""
    def mk(nm, p0, p1, q0, q1):
        if p1 - p0 < 1e-4 or q1 - q0 < 1e-4:
            return
        if axis == 'y':
            box(nm, t0, p0, q0, t1, p1, q1, mat)
        else:
            box(nm, p0, t0, q0, p1, t1, q1, mat)
    z = z0
    for i, (ha0, ha1, hz0, hz1) in enumerate(sorted(holes, key=lambda h: h[2])):
        mk(f'{name}_b{i}', a0, a1, z, hz0)
        mk(f'{name}_l{i}', a0, ha0, hz0, hz1)
        mk(f'{name}_r{i}', ha1, a1, hz0, hz1)
        z = hz1
    mk(f'{name}_t', a0, a1, z, z1)


# floors: ours (3. sal) round the front door, the two landings below, the street lobby
box('Stair_floor_1', XE, SY0, -0.25, SX1, SY1, 0.0, M['terrazzo'])
for k in (1, 2):
    box(f'Stair_floor_L{k}', XE, SY0, LV[k] - 0.25, SX1, SYE, LV[k], M['terrazzo'])
box('Stair_floor_lobby', -0.02, LOBY0, LV[0] - 0.1, SX1, SYE, LV[0], M['terrazzo'])
box('Ceiling_stair', SX0, SY0, H, SX1, SY1, H + 0.25, M['ceiling'], coll_ceiling)
# flights, half landings, spine
for k in (3, 2, 1):
    R = LV[k] - LV[k - 1]
    n = 10 if R > 3.3 else 8
    r = R / 2 / n
    xl = XE - (n - 1) * RUN
    lh = LV[k] - n * r
    for i in range(1, n):
        top = LV[k] - i * r
        box(f'Stair_step{k}A{i}', XE - i * RUN, AY0, top - r - 0.14, XE - (i - 1) * RUN, AY1, top, M['terrazzo'])
        top = lh - i * r
        box(f'Stair_step{k}B{i}', xl + (i - 1) * RUN, BY0, top - r - 0.14, xl + i * RUN, BY1, top, M['terrazzo'])
    box(f'Stair_landing{k}', SX0, SY0, lh - 0.2, xl, SYE, lh, M['terrazzo'])
    box(f'Stair_spine{k}', xl, AY1, LV[k - 1] - 0.3, XE, BY0, LV[k] + 1.0, M['stair_wall'])
# glass railing on our floor where the east strip drops away (flight B of the storey below starts one floor down)
box('Stair_rail_glass', XE - 0.01, BY0, 0.05, XE + 0.01, SY1, 0.95, M['glass'])
box('Stair_rail_top', XE - 0.025, BY0 - 0.02, 0.95, XE + 0.025, SY1, 1.0, M['galv'])
# handrail along the spine, both sides, following each flight
for k in (3, 2, 1):
    R = LV[k] - LV[k - 1]; n = 10 if R > 3.3 else 8; r = R / 2 / n; xl = XE - (n - 1) * RUN; lh = LV[k] - n * r
    for side, (y0_, y1_), (za, zb) in (('A', (AY1 - 0.06, AY1 - 0.02), (LV[k], lh)), ('B', (BY0 + 0.02, BY0 + 0.06), (lh, LV[k - 1]))):
        segs = 12
        for s_ in range(segs):
            xa = XE - (n - 1) * RUN * s_ / segs if side == 'A' else xl + (n - 1) * RUN * s_ / segs
            xb = XE - (n - 1) * RUN * (s_ + 1) / segs if side == 'A' else xl + (n - 1) * RUN * (s_ + 1) / segs
            zc = za + (zb - za) * (s_ + 0.5) / segs + 0.9
            box(f'Stair_hand{k}{side}{s_}', min(xa, xb), y0_, zc - 0.02, max(xa, xb), y1_, zc + 0.02, M['galv'])
# walls: north (canal facade) with the tall narrow window on every floor and the lobby window, west, south (lift), east
win_holes = [(WY0, WY1, LV[k] + 0.3, LV[k] + 2.7) for k in (1, 2, 3)] + [(-2.35, -0.75, ZG + 1.0, ZG + 2.4)]
wall_holes('Stair_wall_n', 'y', -3.05, SY1, 0.0, SX0, ZG, CUT, win_holes, M['stair_wall'])
for i, (a, b, z0_, z1_) in enumerate(win_holes):
    box(f'Stair_win_glass{i}', 0.12, a, z0_, 0.13, b, z1_, M['glass'])
    for nm_, a_ in (('l', (a, a + 0.05, z0_, z1_)), ('r', (b - 0.05, b, z0_, z1_)), ('b', (a, b, z0_, z0_ + 0.05)), ('t', (a, b, z1_ - 0.05, z1_))):
        box(f'Stair_win_frame{i}{nm_}', 0.08, a_[0], a_[2], 0.16, a_[1], a_[3], M['frame'])
    box(f'Stair_win_sill{i}', 0.16, a - 0.03, z0_ - 0.03, 0.28, b + 0.03, z0_, M['stair_wall'])
wall_holes('Stair_wall_w', 'x', SX0, 7.45, -3.05, SY0, ZG, CUT, [(4.1, 7.0, LV[0], LV[0] + 2.4)], M['stair_wall'])
wall_holes('Stair_wall_s', 'y', -3.05, SY1, SX1, 7.45, ZG, CUT, [(LY0, LY1, LV[k], LV[k] + 2.15) for k in range(4)], M['stair_wall'])
box('Stair_wall_e', SX0, SYE, ZG, SX1, SY1, -0.25, M['stair_wall'])
box('Stair_corner', 7.1, -0.06, -0.25, 7.45, 0.5, CUT, M['stair_wall'])   # close the slit where the stairwell meets our facade
# lift: steel frame + floor display at every floor (the sliding doors, the car and the call buttons are in the web viewer)
for k in range(4):
    z = LV[k]
    box(f'Stair_lift_frame_l{k}', SX1 - 0.03, LY0 - 0.06, z, SX1, LY0, z + 2.21, M['steel'])
    box(f'Stair_lift_frame_r{k}', SX1 - 0.03, LY1, z, SX1, LY1 + 0.06, z + 2.21, M['steel'])
    box(f'Stair_lift_frame_t{k}', SX1 - 0.03, LY0 - 0.06, z + 2.15, SX1, LY1 + 0.06, z + 2.21, M['steel'])
    box(f'Stair_lift_display{k}', SX1 - 0.02, LY0 + 0.3, z + 2.3, SX1, LY1 - 0.3, z + 2.42, M['black'])
# street lobby: walls, ceiling, mailboxes; the entrance door opening in the facade
box('Stair_lobby_w', SX0, LOBY0 - 0.25, ZG, SX1, LOBY0, LOBZ1, M['stair_wall'])
box('Stair_lobby_s', SX1, LOBY0 - 0.25, ZG, 7.45, LOBY1, LOBZ1, M['stair_wall'])
wall_holes('Stair_lobby_n', 'y', LOBY0 - 0.25, LOBY1, 0.0, SX0, ZG, LOBZ1, [(DOORY0, DOORY1, ZG, ZG + DOORZ)], M['stair_wall'])
box('Stair_lobby_ceil', SX0, LOBY0, LOBZ1 - 0.02, SX1, LOBY1, LOBZ1, M['stair_wall'])
box('Stair_mailboxes', 2.2, LOBY0, LV[0] + 0.9, 4.6, LOBY0 + 0.32, LV[0] + 1.95, M['steel'])
for i in range(8):
    for j in range(4):
        box(f'Stair_mailslot{i}_{j}', 2.3 + i * 0.29, LOBY0 + 0.32, LV[0] + 1.0 + j * 0.25 + 0.14, 2.3 + i * 0.29 + 0.2, LOBY0 + 0.325, LV[0] + 1.0 + j * 0.25 + 0.16, M['black'])
# the building fabric round the stairwell, lobby and lift shaft (terracotta canal wing): solid blocks, shaft carved out
fx_ = P((1512, 0))[0]
for nm_, b_ in (('a', (0.0, -14.0, ZG, fx_, LOBY0 - 0.25, -0.25)), ('b', (LCX1, LOBY0 - 0.25, ZG, fx_, -0.01, -0.25)),
                ('c', (7.45, LOBY0 - 0.25, ZG, LCX1, LCY0, -0.25)), ('d', (7.45, LCY1, ZG, LCX1, -0.01, -0.25)),
                ('e', (0.0, LOBY0 - 0.25, LOBZ1, 7.45, -3.05, -0.25)),
                ('s1', (LCX1, -3.05, -0.25, fx_, -0.01, CUT)), ('s2', (7.45, -3.05, -0.25, LCX1, LCY0, CUT)), ('s3', (7.45, LCY1, -0.25, LCX1, -0.01, CUT))):
    box(f'Own_wing_w_low_{nm_}', *b_, M['own_terra'])
ld = bpy.data.lights.new('Light_stair', 'AREA'); ld.shape = 'RECTANGLE'; ld.size = 0.8; ld.size_y = 0.8
ld.energy = 25; ld.color = (1.0, 0.92, 0.82)
lo = bpy.data.objects.new('Light_stair', ld); lo.location = (4.8, -1.4, H - 0.03); link(lo)

# the stairwell is part of the dark-tile block on the canal face (photo): tile skin from the stone base to the roof,
# one tall narrow window per storey (ours and the two below are real windows into the stairwell)
sk_holes = [(WY0 - 0.05, WY1 + 0.05, LV[k] + 0.25, LV[k] + 2.75) for k in (1, 2, 3)]
wall_holes('Own_stair_skin', 'y', DY, -0.01, -0.03, -0.005, ZG + 3.65, CUT, sk_holes, M['skin_tile'])
up_holes = [(WY0 - 0.05, WY1 + 0.05, 2.95 * j + 0.25, 2.95 * j + 2.75) for j in (1, 2, 3)]
wall_holes('Above_stair_skin', 'y', DY, -0.01, -0.03, -0.005, CUT, TOP, up_holes, M['skin_tile'])
for j in (1, 2, 3):
    box(f'Above_stair_win{j}', -0.02, WY0, 2.95 * j + 0.3, -0.01, WY1, 2.95 * j + 2.7, M['black'])
box('Above_wing_setback', fin_x1, -12.0, TOP, 32.0, P((0, 206))[1] - 1.2, TOP + STOREY, M['own_cream'])


def facade_skin(prefix, A_, B_, names, mat):
    # thin cladding 1 cm outside our exterior wall, with holes where the windows are
    A_, B_ = Vector(P(A_)), Vector(P(B_))
    u_ = (B_ - A_).normalized()
    L2 = (B_ - A_).length
    n_ = Vector((u_.y, -u_.x))
    if (A_ + n_ - Vector((cx_ap, cy_ap))).length < (A_ - Vector((cx_ap, cy_ap))).length:
        n_ = -n_
    spans = []
    for nm in names:
        o = next(x for x in G['openings'] if x['name'] == nm)
        ts = sorted((Vector(P(p)) - A_).dot(u_) for p in o['q'])
        spans.append((ts[0], ts[-1], o['sill'], o['head']))
    spans.sort()

    def piece(t0, t1, za, zb, k):
        if t1 - t0 < 0.01 or zb - za < 0.01:
            return
        p0, p1 = A_ + u_ * t0 + n_ * 0.002, A_ + u_ * t1 + n_ * 0.002
        quad_box(f'{prefix}{k}', [tuple(p0), tuple(p1), tuple(p1 + n_ * 0.012), tuple(p0 + n_ * 0.012)], za, zb, mat)
    t, k = 0.0, 0
    for (t0, t1, zs_, zh_) in spans:
        piece(t, t0, -0.25, H + 0.25, k); k += 1
        piece(t0, t1, -0.25, zs_, k); k += 1
        piece(t0, t1, zh_, H + 0.25, k); k += 1
        t = t1
    piece(t, L2, -0.25, H + 0.25, k)


facade_skin('Skin_north_', (313, 305), (313, 1383), ['win_w1', 'win_w2'], M['skin_tile'])
facade_skin('Skin_east_', (313, 305), (1512, 387), ['balcony', 'win_vaer', 'win_bed'], M['skin_tile'])
# balconies of the flats above and below ours, stacked like in the photo
inner = []
for s_ in range(0, 181, 15):
    a = math.radians(90 + s_)
    inner.append(rot((rb - 0.06) * math.cos(a), (rb - 0.06) * math.sin(a)))
inner += [rot(length - 0.06, -rb + 0.06), rot(length - 0.06, rb - 0.06)]
for k_ in (-2, -1, 1, 2, 3):
    dz = k_ * STOREY
    tag = 'Above_bal' if k_ > 0 else 'Own_bal_below'
    prism(f'{tag}{k_}_slab', [bal], dz - 0.22, dz - 0.02, M['concrete'])
    prism(f'{tag}{k_}_rail', [bal, list(reversed(inner))], dz, dz + 1.1, M['rail_glass'])

# ---------------------------------------------------------------- lighting
world = bpy.data.worlds.new('Sky')
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
sky = wn.new('ShaderNodeTexSky')
for t in ('MULTIPLE_SCATTERING', 'NISHITA', 'HOSEK_WILKIE'):
    try:
        sky.sky_type = t
        break
    except TypeError:
        continue
SUN_ELEV, SUN_ROT = math.radians(32), math.radians(160)
try:
    sky.sun_elevation = SUN_ELEV
    sky.sun_rotation = SUN_ROT
    sky.sun_disc = False
except Exception:
    pass
world.node_tree.links.new(sky.outputs['Color'], wn['Background'].inputs['Color'])
wn['Background'].inputs['Strength'].default_value = 0.8

sun_data = bpy.data.lights.new('Sun', 'SUN')
sun_data.energy = 5.0
sun_data.angle = math.radians(0.8)
sun_data.color = (1.0, 0.95, 0.88)
sun = bpy.data.objects.new('Sun', sun_data)
link(sun)
# direction: coming from plan-north-west, above
sun.rotation_euler = Vector((-0.25, -0.80, -0.55)).to_track_quat('-Z', 'Y').to_euler()

# ceiling downlights where there is no daylight (bathroom and hallway have recessed spots in the photos)
def ceiling_light(name, px_, py_, size, watts):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = 'RECTANGLE'; ld.size = size[0]; ld.size_y = size[1]
    ld.energy = watts; ld.color = (1.0, 0.9, 0.78)
    ob = bpy.data.objects.new(name, ld)
    x, y = P((px_, py_))
    ob.location = (x, y, H - 0.03)
    link(ob)


ceiling_light('Light_bath', 1310, 1140, (1.2, 0.9), 30)
ceiling_light('Light_hall_1', 1010, 1180, (0.6, 0.6), 18)
ceiling_light('Light_hall_2', 1030, 930, (0.6, 0.6), 18)

# ---------------------------------------------------------------- render settings
scene.render.engine = 'CYCLES'
cy = scene.cycles
cy.samples = SAMPLES
cy.use_denoising = True
cy.max_bounces = 8
cy.diffuse_bounces = 5
cy.glossy_bounces = 4
cy.transmission_bounces = 8
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for dt in ('METAL', 'OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = dt
            prefs.get_devices()
            if any(d.type == dt for d in prefs.devices):
                for d in prefs.devices:
                    d.use = True
                cy.device = 'GPU'
                print('Using GPU', dt)
                break
        except TypeError:
            continue
except Exception as e:
    print('GPU setup skipped', e)
scene.render.resolution_x = 1920
scene.render.resolution_y = 1280
scene.render.resolution_percentage = RES
try:
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
except TypeError:
    pass


def camera(name, loc, target, lens, sensor=36, ortho=0):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    cd.sensor_width = sensor
    cd.clip_start = 0.05
    ob = bpy.data.objects.new(name, cd)
    link(ob)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob


def px3(px, py, z):
    x, y = P((px, py))
    return (x, y, z)


cams = {
    'doll': (camera('Cam_dollhouse', (P((900, 0))[0] + 1.5, P((0, 860))[1] + 6.5, 15.0), px3(900, 880, 0), 32),
             2.4, True),
    'doll2': (camera('Cam_dollhouse_south', (P((900, 0))[0] + 1.2, P((0, 860))[1] - 5.5, 16.0), px3(880, 820, 0), 32),
              2.4, True),
    'axo': (camera('Cam_axonometric', (P((930, 0))[0] - 14, P((0, 850))[1] + 14, 16.5), px3(930, 850, 0.5), 50, ortho=17.5),
            -0.3, True),
}
# eye-level viewpoints shared with the web walkthrough (pins open these renders)
CAMS = json.load(open(os.path.join(os.path.dirname(GEOM) or '.', 'cameras.json')))
for key, c in CAMS.items():
    cams[key] = (camera('Cam_' + key, px3(c['p'][0], c['p'][1], c['z']), px3(c['t'][0], c['t'][1], c['z'] - 0.2), c['lens']),
                 c['expo'], False)

json.dump(EXTRAS, open(os.path.join(OUT, 'extras.json'), 'w'), indent=1, ensure_ascii=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'apartment.blend'))
for v in (VIEWS or list(cams)):
    if v not in cams:
        continue
    cam, expo, hide_ceiling = cams[v]
    hidden = CAMS.get(v, {}).get('hide', [])
    for ob in bpy.data.objects:
        ob.hide_render = ob.name in hidden or (hide_ceiling and ob.name.startswith('Above_'))
    scene.camera = cam
    scene.view_settings.exposure = expo if not v.startswith('doll') else 0.0
    coll_ceiling.hide_render = hide_ceiling
    scene.render.filepath = os.path.join(OUT, f'render_{v}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', v)
coll_ceiling.hide_render = False
scene.camera = cams['living'][0]
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'apartment.blend'))
