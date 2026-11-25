# Apartment 3D — web source kit

Everything needed to rebuild the /apartment walkthrough from a fresh cloud session.
Lives in the blog repo at `new_blog/apartment-src/` (ignored by ESLint; not part of the Next app).
`build.py` (the Blender scene), `geom.json` and `cameras.json` live here too (moved from `~/Documents/Apartment 3D/` on 2026-11-18).
The rest of that folder moved here as well: `drawings/` (plan + elevations PDF/PNG), `contact_sheet.jpg`, and `renders/`
(full-size Blender PNGs + .blend). `renders/`, `web/`, .blend files and render_log.txt are git-ignored: they are rebuilt by
`render_and_publish.sh` / `run_web.py`, and the web-sized JPGs are committed in `public/walkthrough/media/`.

| File | What |
|---|---|
| walk.src.html | Shell of the viewer (three.js 0.170 via CDN): head, HTML, import map; `__PLAN__` is inlined, the JS/CSS come from `src/` |
| src/style.css, src/js/NN-*.js | The viewer itself, one ES-module scope, concatenated in order by assemble.py |
| plan.json | 2D plan data for the viewer (rooms, walls, doors, outlets, shots, spawns, sliders). Static. |
| build.py | The Blender scene (bpy): walls, kitchen, bath, outside, cameras; `blender -b --python build.py -- geom.json <out> <samples> <pct> <views>` |
| geom.json, cameras.json | Plan geometry from prep.py · Blender camera viewpoints |
| render_and_publish.sh | Mac: renders every viewpoint with Blender.app and writes web-sized JPGs to public/walkthrough/media |
| run_web.py | bpy: runs build.py (views=none) then export_web.py → web/apartment.blend + web/apartment.glb |
| export_web.py | Merges the Blender scene per material into collide__/nocollide__/above__/ceiling__ meshes, box UVs, GLB |
| assemble.py | `python3 assemble.py web [blog_out.html]` → web/index.html, web/test.html, web/apartment.glb.gz (+ blog copy with apartment.glb and apartment.glb.gz next to it) |
| smoke.mjs | Smoke test: every piece builds, every panel opens, no page errors (serve web/ on :8765, `node smoke.mjs`) |
| prep.py | Original plan.png → geom.json wall/opening extraction (only needed if the plan changes) |
| drawings.py | Plan/elevation PDF drawings from plan.json |
| shot_template.mjs, walktest.mjs, perf.mjs | Older Playwright scripts (they still click #go; the page now opens by itself from above) |

## The model file (since 2026-11-18)

The GLB is no longer base64 inside the HTML. assemble.py writes `apartment.glb` and a gzip copy `apartment.glb.gz`
(1.3 MB → 0.23 MB) next to the page; the viewer fetches the .gz and unpacks it with `DecompressionStream`
(falling back to the plain .glb). The deployed copy in `public/walkthrough/apartment.glb` is the current model:
for JS-only work, copy it into `web/` instead of re-running Blender.

Rebuild:
```
pip install bpy==5.3.0 --break-system-packages   # Python 3.13; or reuse public/walkthrough/apartment.glb
cd <workdir> && cp apartment-src/{build.py,geom.json,cameras.json,run_web.py,export_web.py} . ; mkdir -p web; cp -r walk.src.html src plan.json web/
python3 run_web.py   # or: cp <blog>/public/walkthrough/apartment.glb web/
python3 assemble.py web /mnt/user-data/outputs/blog-bundle/public/walkthrough/index.html
cd web && npm i three@0.186 three-mesh-bvh@0.8.3   # only for test.html
```

## Source layout (since 2026-10-18)

`walk.src.html` is a thin shell. Its `/*@include src/...*/` lines pull in `src/style.css` and the JS modules
`src/js/01-core.js` … in order (16-coffee-rug, 17-study and 18-ux are included before 15-loop-hud, because the
loop's MOVERS list uses their objects). Add new features as a new numbered module or in the module of the room
they belong to; later modules may use anything defined earlier.

## High-quality stills (Cycles, since 2026-11-24)

The furniture only exists in the viewer, so stills go through an export:
1. `node render_export.mjs renders/export 10.5 21` (serve web/ on :8765 first): Playwright loads test.html and exports the furnished
   scene with three's GLTFExporter, once by day (lights off) and once at night (every Hue light on): `scene_day.glb`, `scene_night.glb`,
   plus `lights.json` (sun/moon direction, every lit light and Hue fixture in Blender coordinates).
2. `Blender -b --python render_shots.py -- renders/export renders/shots all all 2400 1024` (on the Mac: Metal GPU). Imports the GLB,
   turns window glass into real glass (light passes through it), Nishita sky + sun by day, dark sky + moon + the Hue lights by night,
   then renders the framed shots in `SHOTS` (dining, living, bedroom, værelse, entrance, bathroom) as `<shot>_<day|night>.jpg`.
   Arguments: export dir, out dir, day|night|all, shot list|all, width, samples. Windowless rooms get their ceiling lights by day too.
`renders/` is git-ignored.
