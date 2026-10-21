# Lund apartment 3D — web source kit

The walkthrough of Rådmansgatan 1A (ground floor, 67.3 m², 2 rooms) at `/lund-apartment`.
Built straight in three.js (no Blender model): the flat from the broker's plan, the block and the streets from
OpenStreetMap, furniture from the 20 listing photos. Lives in the blog repo at `new_blog/lund-src/`
(ESLint-ignored, not part of the Next app). Sister of `apartment-src/` (Copenhagen) and `pantelleria-src/`.

| File | What |
|---|---|
| walk.src.html | Thin shell: HTML, import map (three 0.170 + three-mesh-bvh 0.8.3 from jsDelivr). `/*@include …*/` lines pull in `src/`. `__SITE__` is replaced by site.json. |
| src/style.css | The Copenhagen viewer's stylesheet (shared look). `src/lund.css` adds the light-switch panel. |
| src/js/01-core.js | Renderer, sky with the real sun/moon/planets/stars over Lund for today's date, materials and procedural textures, static batching (`sbox`, `addStatic`, `flushStatic`), the interior light pool. |
| src/js/02-flat.js | The flat in plan pixels (149.38 px/m; plan up = Rådmansgatan/west, plan right = Trollebergsvägen/north): rooms, floors, walls, exterior walls with window openings, the stairwell and street-door passage (invented to fit). |
| src/js/03-site.js | Ground, roads, our block (facades with real openings, bays, balconies, hip roof as a height field), neighbours, courtyard, trees, street lamps, lit windows at night. |
| src/js/04-furniture.js | Doors, windows (inward casements), kitchen, dining, living, hall, bedroom, bathroom; everything usable registers with `inter()`. |
| src/js/05-lights.js | Lamps, room switches and their panel (on/off, dimmer, Auto), the TV. |
| src/js/06-interact.js | Picking and animating usable things (E / click / tap). |
| src/js/07-player.js | Walking (ray collisions + floor probe for steps), look, joystick, view from above, room HUD, mini map, quick bar. |
| src/js/08-loop.js | Start-up, frame loop, adaptive pixel ratio, `window.__lund` test hooks. |
| prep.py | osm.xml → site.json (local metres around 55.70276 N, 13.17864 E). |
| fetch_osm.sh | Downloads osm.xml from the OSM API and runs prep.py (run on the Mac). |
| assemble.py | `python3 assemble.py <kit> <web_dir> [blog_out]` → web/index.html, web/test.html (local three) and the blog copy. |
| tests/*.mjs | Playwright scripts (serve web/ on :8765, load test.html?lite): shot, multi (batch of views), walk (route through every room), probe, mobile, cover. |

Rebuild (cloud container):
```
W=/home/claude/lund/kit; mkdir -p $W/web && cd $W/web && npm i three@0.170.0 three-mesh-bvh@0.8.3 playwright@1.56.0
cd $W && python3 assemble.py . web ../blog/public/lund-walkthrough/index.html
cd web && cp ../tests/*.mjs . && (python3 -m http.server 8765 >/dev/null 2>&1 &) && node walk.mjs
```
Not in git: `ref/` (the 20 listing photos, Bülow & Lind), `osm.xml`.
