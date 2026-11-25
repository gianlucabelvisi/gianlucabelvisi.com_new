"""High-quality stills of the furnished flat (2026-11-24), rendered with Cycles from the walkthrough's own scene.

The furniture lives in the three.js viewer, so render_export.mjs first exports the furnished scene (day + night GLB and
lights.json). This script imports one of them, swaps the web materials for proper Cycles ones (glass, emission, sky),
rebuilds the lights in physical-ish units and renders the framed shots.

  blender -b --python render_shots.py -- <export_dir> <out_dir> [day|night|all] [shot,shot|all] [width] [samples]
  e.g. Blender.app/Contents/MacOS/Blender -b --python render_shots.py -- renders/export renders/shots all all 2400 1024
"""
import bpy, json, math, os, sys, time
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
EXP = argv[0] if len(argv) > 0 else 'renders/export'
OUT = argv[1] if len(argv) > 1 else 'renders/shots'
WHEN = argv[2] if len(argv) > 2 else 'all'
ONLY = argv[3] if len(argv) > 3 else 'all'
WIDTH = int(argv[4]) if len(argv) > 4 else 2400
SAMPLES = int(argv[5]) if len(argv) > 5 else 1024
os.makedirs(OUT, exist_ok=True)
L = json.load(open(os.path.join(EXP, 'lights.json')))

# ---------------------------------------------------------------- shots (Blender coords = plan metres, z up; floor 0, ceiling 2.6)
# cam: eye position, aim: point looked at; the camera stays level (vertical walls stay vertical) and lens shift frames up/down.
SHOTS = {
    # kitchen–living (2026-11-25: more viewpoints that convey the space, Gianluca's list)
    'living_sofa':      dict(cam=(0.80, 7.15, 1.55), aim=(3.9, 3.2, 1.10), lens=16, shift_y=-0.13, ev_day=2.9, ev_night=1.4, title='Behind the sofa', rid='living'),
    'living_painting':  dict(cam=(0.75, 4.35, 1.40), aim=(3.9, 8.4, 1.25), lens=16, shift_y=-0.08, ev_day=2.9, ev_night=1.4, title='From the painting, towards the balcony', rid='living'),
    'kitchen_painting': dict(cam=(0.75, 4.75, 1.40), aim=(3.4, 0.7, 1.20), lens=16, shift_y=-0.08, ev_day=2.9, ev_night=1.4, title='From the painting, towards the kitchen', rid='living'),
    'kitchen_table':    dict(cam=(1.95, 4.45, 1.50), aim=(2.9, 0.5, 1.15), lens=16, shift_y=-0.10, ev_day=2.9, ev_night=1.4, title='From the table, the kitchen', rid='living'),
    'dining':           dict(cam=(4.25, 4.3, 1.32), aim=(0.9, 1.5, 1.32), lens=20, shift_y=-0.07, ev_day=2.8, ev_night=1.4, title='Kitchen and dining table', rid='living'),
    'living':           dict(cam=(4.15, 5.35, 1.28), aim=(0.6, 8.3, 1.28), lens=16, shift_y=-0.08, ev_day=2.9, ev_night=1.4, title='Living room', rid='living'),
    'living_balcony':   dict(cam=(4.05, 8.15, 1.45), aim=(1.0, 2.2, 1.20), lens=16, shift_y=-0.08, ev_day=2.9, ev_night=1.4, title='From the balcony door, back to the kitchen', rid='living'),
    # værelse
    'vaerelse':         dict(cam=(4.85, 5.5, 1.40), aim=(7.4, 8.1, 1.40), lens=17, shift_y=-0.08, ev_day=3.3, ev_night=1.6, title='Desk by the window', rid='vaer'),
    'vaerelse_door':    dict(cam=(6.55, 4.85, 1.45), aim=(4.9, 8.0, 1.25), lens=16, shift_y=-0.08, ev_day=3.3, ev_night=1.6, title='From the door', rid='vaer'),
    'vaerelse_window':  dict(cam=(4.95, 8.05, 1.45), aim=(7.1, 5.0, 1.25), lens=16, shift_y=-0.08, ev_day=3.3, ev_night=1.6, title='From the window, the closet and door', rid='vaer'),
    # bedroom
    'bedroom':          dict(cam=(9.9, 3.95, 1.42), aim=(7.4, 7.1, 1.42), lens=17, shift_y=-0.09, ev_day=3.3, ev_night=1.6, title='Bedroom', rid='bed'),
    'bedroom_bed':      dict(cam=(10.0, 5.25, 1.62), aim=(7.3, 6.0, 1.05), lens=14, shift_y=-0.15, ev_day=3.3, ev_night=1.6, title='The bed from its foot', rid='bed'),
    # hall + bathroom
    'entrance':         dict(cam=(6.35, 4.15, 1.45), aim=(5.55, 0.25, 1.45), lens=17, shift_y=-0.06, day_lights=['hall'], ev_day=1.0, ev_night=1.5, title='Entrance hall', rid='hall'),
    'bathroom':         dict(cam=(7.18, 1.25, 1.50), aim=(9.7, 2.75, 1.50), lens=15, shift_y=-0.10, day_lights=['bath'], ev_day=1.0, ev_night=1.5, title='Bathroom', rid='bath'),
}


def kelvin_rgb(k):                                     # Tanner Helland approximation, 0..1 sRGB-ish → good enough for light colour
    t = k / 100.0
    r = 1.0 if t <= 66 else min(1, max(0, 329.698727446 * (t - 60) ** -0.1332047592 / 255))
    g = min(1, max(0, (99.4708025861 * math.log(t) - 161.1195681661) / 255)) if t <= 66 else min(1, max(0, 288.1221695283 * (t - 60) ** -0.0755148492 / 255))
    b = 1.0 if t >= 66 else (0.0 if t <= 19 else min(1, max(0, (138.5177312231 * math.log(t - 10) - 305.0447927307) / 255)))
    return (r, g, b)


def hex_rgb(h, soften=0.35):
    if isinstance(h, str): h = int(h.lstrip('#'), 16)
    s = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s]
    m = max(lin) or 1; lin = [c / m for c in lin]
    return tuple(c * (1 - soften) + soften for c in lin)


def principled(mat):
    if not mat or not mat.use_nodes: return None
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED': return n
    return None


def setin(node, names, val):
    for nm in names if isinstance(names, (list, tuple)) else [names]:
        if nm in node.inputs:
            try: node.inputs[nm].default_value = val
            except Exception: pass
            return True
    return False


def fix_materials(night):
    for m in bpy.data.materials:
        p = principled(m)
        if not p: continue
        nm = (m.name or '').lower()
        if 'glass' in nm and 'black' not in nm:            # window / shelf / rail glass → real glass
            setin(p, 'Transmission Weight', 1.0); setin(p, 'Roughness', 0.0); setin(p, 'IOR', 1.45)
            setin(p, 'Base Color', (0.95, 0.97, 0.97, 1)); setin(p, 'Alpha', 1.0)
            try: m.surface_render_method = 'DITHERED'
            except Exception: pass
            for l in list(m.node_tree.links):
                if l.to_node == p and l.to_socket.name == 'Alpha': m.node_tree.links.remove(l)
            # architectural trick: light (shadow + diffuse bounce rays) passes the panes as if they were open, the camera still sees glass
            nt = m.node_tree; outn = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            lp = nt.nodes.new('ShaderNodeLightPath'); tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
            mxm = nt.nodes.new('ShaderNodeMath'); mxm.operation = 'MAXIMUM'
            nt.links.new(lp.outputs['Is Shadow Ray'], mxm.inputs[0]); nt.links.new(lp.outputs['Is Diffuse Ray'], mxm.inputs[1])
            nt.links.new(mxm.outputs[0], mx.inputs[0]); nt.links.new(p.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
            nt.links.new(mx.outputs[0], outn.inputs['Surface'])
        if 'mirror' in nm:                                   # bathroom mirror: a real mirror in Cycles
            setin(p, 'Metallic', 1.0); setin(p, 'Roughness', 0.015); setin(p, 'Base Color', (0.92, 0.93, 0.93, 1))
        if 'sheer' in nm:                                    # the balcony sheer: thin, translucent
            setin(p, 'Alpha', 0.55)
        # emission: glowing shades, lit neighbour windows, screens. Web emissive values were tuned for a tone-mapped
        # realtime view; in Cycles they read dim, so lift them (only at night, by day nothing should glow)
        es = p.inputs.get('Emission Strength')
        if es is not None and es.default_value > 0:
            es.default_value = es.default_value * (6.0 if night else 0.0)


def world_day():
    w = bpy.data.worlds.new('day'); bpy.context.scene.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); sky = nt.nodes.new('ShaderNodeTexSky')
    d = Vector(L['sunDay'][0]['dir']).normalized()
    el = math.asin(max(-1, min(1, d.z)))
    for t in ('MULTIPLE_SCATTERING', 'NISHITA', 'SINGLE_SCATTERING'):
        try: sky.sky_type = t; break
        except Exception: pass
    try:
        sky.sun_disc = False; sky.sun_elevation = max(el, math.radians(8)); sky.sun_rotation = math.atan2(d.x, d.y)
        sky.altitude = 30; sky.air_density = 1.0; sky.dust_density = 0.6
    except Exception: pass
    nt.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.6
    nt.links.new(bg.outputs[0], out.inputs[0])
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.0; sun.angle = math.radians(0.6); sun.color = (1.0, 0.95, 0.87)
    o = bpy.data.objects.new('sun', sun); bpy.context.collection.objects.link(o)
    o.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()


def world_night():
    w = bpy.data.worlds.new('night'); bpy.context.scene.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs[0].default_value = (0.015, 0.025, 0.06, 1); bg.inputs[1].default_value = 0.6
    nt.links.new(bg.outputs[0], out.inputs[0])
    d = Vector(L['sunNight'][0]['dir']).normalized()
    moon = bpy.data.lights.new('moon', 'SUN'); moon.energy = 0.04; moon.color = (0.75, 0.82, 1.0); moon.angle = math.radians(1)
    o = bpy.data.objects.new('moon', moon); bpy.context.collection.objects.link(o)
    o.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    add_lights()


def add_lights(rooms=None):
    # interior lights: web intensities (candela, tuned by eye for the realtime view) → Cycles watts, by type
    K = dict(point=30.0, spot=2.4, area=26.0, fx=55.0)
    for i, l in enumerate(L['lights']):
        if rooms is not None and not (l['type'] == 'fx' and l['id'] in rooms): continue
        t = l['type']
        if t == 'fx':
            col = tuple(c * 0.75 + 0.25 for c in kelvin_rgb(l['ct'])) if l.get('ct') else hex_rgb(l['hex'])
            power = l['power'] * (l['bri'] ** 1.6) * K['fx']
            if l['id'] in ('hall', 'bath'):                      # recessed ceiling spots: shine down
                ld = bpy.data.lights.new(f'fx{i}', 'SPOT'); ld.spot_size = math.radians(110); ld.spot_blend = 0.6; ld.shadow_soft_size = 0.03
                pos = Vector(l['pos']); pos.z = 2.585; rot = Vector((0, 0, -1))
            elif l['id'] == 'vaer':                               # cove strip high on the wall washing the ceiling
                ld = bpy.data.lights.new(f'fx{i}', 'AREA'); ld.shape = 'RECTANGLE'; ld.size = 2.2; ld.size_y = 0.03
                pos = Vector(l['pos']); rot = Vector((0, 0, 1)); power *= 1.2
            else:                                                 # opal globe pendants
                ld = bpy.data.lights.new(f'fx{i}', 'POINT'); ld.shadow_soft_size = 0.1
                pos = Vector(l['pos']); rot = None
            ld.energy = power; ld.color = col
        else:
            col = hex_rgb(l['color'])
            if t == 'point':
                ld = bpy.data.lights.new(f'l{i}', 'POINT'); ld.shadow_soft_size = 0.03; ld.energy = l['intensity'] * K['point']; rot = None
            elif t == 'spot':
                ld = bpy.data.lights.new(f'l{i}', 'SPOT'); ld.spot_size = min(math.pi, 2 * l['angle']); ld.spot_blend = l.get('penumbra', 0.5)
                ld.shadow_soft_size = 0.05; ld.energy = l['intensity'] * K['spot']; rot = Vector(l['dir']).normalized()
            else:
                ld = bpy.data.lights.new(f'l{i}', 'AREA'); ld.shape = 'RECTANGLE'; ld.size = max(0.01, l['w']); ld.size_y = max(0.01, l['h'])
                ld.energy = l['intensity'] * l['w'] * l['h'] * K['area']; rot = Vector(l['dir']).normalized()
            ld.color = col; pos = Vector(l['pos'])
        o = bpy.data.objects.new(ld.name, ld); bpy.context.collection.objects.link(o); o.location = pos
        if rot is not None: o.rotation_euler = rot.to_track_quat('-Z', 'Y').to_euler()


def setup_render():
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'
    try:
        pr = bpy.context.preferences.addons['cycles'].preferences
        for dt in ('METAL', 'OPTIX', 'CUDA'):
            try:
                pr.compute_device_type = dt; pr.refresh_devices()
                if any(d.type == dt for d in pr.devices):
                    for d in pr.devices: d.use = d.type == dt          # GPU only: CPU+GPU hybrid is slower on Apple silicon
                    sc.cycles.device = 'GPU'; print('device', dt, [d.name for d in pr.devices if d.use], flush=True); break
            except Exception: pass
    except Exception as e: print('gpu setup', e)
    c = sc.cycles
    c.samples = SAMPLES; c.use_adaptive_sampling = True; c.adaptive_threshold = 0.008
    c.use_denoising = True
    try: c.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    c.max_bounces = 10; c.diffuse_bounces = 5; c.glossy_bounces = 4; c.transmission_bounces = 8; c.transparent_max_bounces = 16
    c.sample_clamp_indirect = 8.0; c.caustics_reflective = False; c.caustics_refractive = False
    sc.render.resolution_x = WIDTH; sc.render.resolution_y = int(WIDTH * 2 / 3); sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 92
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass


def add_camera(name, s):
    cam = bpy.data.cameras.new(name); cam.lens = s['lens']; cam.sensor_width = 36; cam.shift_y = s.get('shift_y', 0); cam.clip_start = 0.05
    o = bpy.data.objects.new(name, cam); bpy.context.collection.objects.link(o)
    o.location = Vector(s['cam']); d = Vector(s['aim']) - Vector(s['cam']); d.z = 0   # level camera: verticals stay vertical, lens shift frames up/down
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o


def run(when):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(EXP, f'scene_{when}.glb'))
    for o in list(bpy.data.objects):                            # the exporter leaves the web's camera in; we bring our own
        if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
    fix_materials(when == 'night')
    (world_night if when == 'night' else world_day)()
    setup_render()
    for name, s in SHOTS.items():
        if ONLY != 'all' and name not in ONLY.split(','): continue
        cam = add_camera(f'cam_{name}', s); bpy.context.scene.camera = cam
        bpy.context.scene.view_settings.exposure = s['ev_night' if when == 'night' else 'ev_day']
        extra = []
        if when == 'day' and s.get('day_lights'):
            before = set(bpy.data.objects); add_lights(s['day_lights']); extra = [o for o in bpy.data.objects if o not in before]
        bpy.context.scene.render.filepath = os.path.join(OUT, f'{name}_{when}.jpg')
        t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'rendered {name}_{when} in {time.time() - t0:.0f} s', flush=True)
        sys.stdout.flush()
        for o in extra: bpy.data.objects.remove(o)


for when in (['day', 'night'] if WHEN == 'all' else [WHEN]):
    run(when)
print('done')
