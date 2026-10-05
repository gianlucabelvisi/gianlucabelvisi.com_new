"""Merge the built apartment into a few meshes per material, add metre-based box UVs, export GLB.
Run after build.py (views=none): python export_web.py <blend> <out.glb>
"""
import bpy, bmesh, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
BLEND, OUT = argv[0], argv[1]
bpy.ops.wm.open_mainfile(filepath=BLEND)

groups = {}
old_objs = list(bpy.data.objects)
for ob in list(bpy.data.objects):
    if ob.type != 'MESH':
        continue
    mat = ob.data.materials[0].name if ob.data.materials else 'none'
    name = ob.name
    if name in ('door_vaer_leaf', 'door_bed_leaf', 'door_bath_leaf', 'door_tek1_leaf', 'door_tek2_leaf', 'door_entry_leaf', 'K_fridge_door') \
            or name.startswith('balcony_slide') or '_sash' in name or '_door_' in name or name == 'Bath_wc_lid':
        continue  # interactive in the web viewer
    if name.startswith('Above_'):
        groups.setdefault('above|' + mat, []).append(ob)
        continue
    if name.startswith('balcony_'):
        key = 'collide|' + mat
    elif mat == 'Glass':
        key = 'collide|Glass'
    elif name.startswith('Ceiling'):
        key = 'ceiling|Ceiling'
    elif name in ('Floor', 'Bath floor', 'Balcony slab') or name.startswith('Stair_floor') or name.startswith(('Quay', 'Canal', 'Neighbour', 'Own_', 'Skin_', 'Ground', 'Harbour', 'Deck', 'Road', 'Bridge')):
        key = 'nocollide|' + mat
    elif name.startswith('K_') and mat in ('Worktop', 'Black glass', 'Steel') and name not in ('K_oven',):
        key = 'nocollide|' + mat
    else:
        key = 'collide|' + mat
    groups.setdefault(key, []).append(ob)

BUILDING = ('Neighbour', 'Own_wing', 'Own_notch', 'Own_fin')
new_objs = []
roof_bm = bmesh.new()
for key, obs in list(groups.items()):
    keep = []
    for ob in obs:
        if ob.name.startswith(BUILDING):
            me = ob.data.copy(); me.transform(ob.matrix_world)
            tb = bmesh.new(); tb.from_mesh(me); bpy.data.meshes.remove(me)
            tops = [f for f in tb.faces if f.normal.z > 0.9]
            rest = [f for f in tb.faces if f.normal.z <= 0.9]
            t2 = tb.copy()
            bmesh.ops.delete(tb, geom=tops, context='FACES')
            bmesh.ops.delete(t2, geom=[f for f in t2.faces if f.normal.z <= 0.9], context='FACES')
            m1 = bpy.data.meshes.new(ob.name + '_side'); tb.to_mesh(m1); tb.free()
            m2 = bpy.data.meshes.new(ob.name + '_top'); t2.to_mesh(m2); t2.free()
            roof_bm.from_mesh(m2)
            ob.data = m1
            ob.matrix_world.identity()
            m1.materials.append(bpy.data.materials[key.split('|')[-1]])
        keep.append(ob)
    groups[key] = keep
roofme = bpy.data.meshes.new('nocollide__Roof')
roof_bm.to_mesh(roofme); roof_bm.free()
roofob = bpy.data.objects.new('nocollide__Roof', roofme)
roofme.materials.append(bpy.data.materials['Concrete'])
new_objs.append(roofob)
for key, obs in groups.items():
    bm = bmesh.new()
    for ob in obs:
        me = ob.data.copy()
        me.transform(ob.matrix_world)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = l.vert.co
            if ax == 2:      # horizontal face: u=x, v=y (planks run along y)
                l[uv].uv = (co.x, co.y)
            elif ax == 0:    # face normal along x: u=y, v=z
                l[uv].uv = (co.y, co.z)
            else:
                l[uv].uv = (co.x, co.z)
    me = bpy.data.meshes.new(key.replace('|', '__'))
    bm.to_mesh(me)
    bm.free()
    mat_name = key.split('|')[-1] if '|' in key else 'Glass'
    me.materials.append(bpy.data.materials.get(mat_name) or bpy.data.materials['Glass'])
    no = bpy.data.objects.new(key.replace('|', '__'), me)
    new_objs.append(no)

for ob in old_objs:
    bpy.data.objects.remove(ob)
for no in new_objs:
    bpy.context.scene.collection.objects.link(no)

bpy.ops.export_scene.gltf(filepath=OUT, export_format=('GLTF_EMBEDDED' if OUT.endswith(('.gltf','.json')) else 'GLB'), export_materials='PLACEHOLDER',
                          export_normals=True, export_texcoords=True, export_yup=True,
                          export_cameras=False, export_lights=False)
print('exported', OUT, [o.name for o in new_objs])
