# Apartment 3D — web source kit

Everything needed to rebuild the /apartment walkthrough from a fresh cloud session.
Lives in the blog repo at `new_blog/apartment-src/` (ignored by ESLint; not part of the Next app).
`build.py`, `geom.json`, `cameras.json`, renders and drawings stay in `~/Documents/Apartment 3D/`.

| File | What |
|---|---|
| walk.src.html | The whole viewer (three.js 0.170 via CDN): UI, furniture, lights, outside, lift. `__PLAN__` and `__GLB__` placeholders get inlined. |
| plan.json | 2D plan data for the viewer (rooms, walls, doors, outlets, shots, spawns, sliders). Static. |
| run_web.py | bpy: runs build.py (views=none) then export_web.py → web/apartment.blend + web/apartment.glb |
| export_web.py | Merges the Blender scene per material into collide__/nocollide__/above__/ceiling__ meshes, box UVs, GLB |
| assemble.py | `python3 assemble.py web [blog_out.html]` → web/index.html, web/test.html (+ blog copy) |
| prep.py | Original plan.png → geom.json wall/opening extraction (only needed if the plan changes) |
| drawings.py | Plan/elevation PDF drawings from plan.json |
| shot_template.mjs, walktest.mjs, perf.mjs | Playwright test scripts (serve web/ on :8765, load test.html?lite) |

Rebuild:
```
pip install bpy==5.0.1 --break-system-packages   # if missing
cd <workdir> && cp build.py geom.json cameras.json run_web.py export_web.py . ; mkdir -p web; cp walk.src.html plan.json web/
python3 run_web.py && python3 assemble.py web /mnt/user-data/outputs/blog-bundle/public/walkthrough/index.html
cd web && npm i three@0.186 three-mesh-bvh@0.8.3   # only for test.html
```
