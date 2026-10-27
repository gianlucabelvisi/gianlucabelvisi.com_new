# Pantelleria 3D — source kit

Rebuilds the /pantelleria map (three.js, served from `public/pantelleria-3d/`).
Lives in the blog repo at `new_blog/pantelleria-src/` (not part of the Next app).
Everything lives here: scripts, fetch scripts, raw downloads in `data/` and `pantelleria.blend`. `data/` and `*.blend` are git-ignored (≈120 MB); they rebuild from the fetch scripts + `build.py`.

## Data (all real, all open)
| What | Source | Licence |
|---|---|---|
| Terrain, 10 m | TINITALY/1.1 tile `w40575_s10` (INGV) | CC BY 4.0 |
| Roads, 14.8k buildings, coastline, landuse, names | OpenStreetMap via Overpass (`fetch_osm.sh`) | ODbL |
| Colours | Sentinel-2 cloudless 2024, EOX, z15 tiles (`fetch_s2.sh`) | CC BY-NC-SA 4.0 |

The fetch scripts (`fetch_tin.sh`, `fetch_osm.sh`, `fetch_poi.sh`, `fetch_s2.sh`, writing into `data/`) must run natively on the Mac (osascript `do shell script`); the Cowork VM and the cloud container have no egress to these hosts.

## Pipeline
| Step | Command | Output |
|---|---|---|
| Prep | `python3 prep.py` (needs data/: dem10.tif, s2_mosaic.png, osm_*.json) | prep/grid.npz, terrain.png (cel), terrain_photo.png, coast.png, height.png, features.json |
| Town | `python3 town.py` (after prep; needs data/osm_town.json from fetch_town.sh, data/osm_land.json) | prep/town.json (zone 1 = town centre: buildings with storeys/colour, castle, church, POIs, boats, ferry, palms, lamps, cafés, piazzas); patches coast.png, terrain.png (quays/moles), grid.npz (harbour floor), classes.npy |
| Blender | `python3 build.py out` (bpy 5.x as a module) | out/pantelleria.blend (terrain chunks ×4 LOD, roads, buildings, domes, piers, lake), out/pantelleria.glb, out/instances.bin |
| Web assets | `python3 web_assets.py web/assets` (needs `npm i -g @gltf-transform/cli`) | island.glb (meshopt), terrain*.webp, coast.png, height.bin (gzip u16), instances.bin, meta.json |
| Viewer | `python3 assemble.py web <blog>/public/pantelleria-3d` | web/index.html, web/test.html, blog copy + assets |

`dem10.tif` is a copy of `data/tinitaly/w40575_s10/w40575_s10.tif`; `s2_mosaic.png` is made by stitching data/s2/*.jpg (z15, x 17467–17483, y 12770–12787).

## Frame
Local transverse Mercator centred at 36.785 N, 11.99 E (`+proj=tmerc +lat_0=36.785 +lon_0=11.99 +k=1`), metres, x east, y north, z up.
three.js: `b2t(x, y, z) = (x, z, -y)`. Height grid: 1521 × 1341 cells of 10 m from (−7600, −6400); `heightAt(x, y)` in the viewer.
Coast = OSM coastline (signed distance at 2.5 m); sea cells continue the coastal slope so the waterline follows it smoothly.

## Viewer (map.src.html)
- Terrain is built in JS from height.bin: 1 km chunks, LOD 10/20/40/80 m by distance, skirts, analytic normals, a 10 m object-space normal map, steep faces tinted lava rock.
- Roads/buildings/piers/lake come from island.glb; mesh names carry the material (`bld_Lava_3_2`, `roadB_RoadMinor_…`). Roads are pulled toward the camera in the vertex shader instead of polygon offset.
- Domes (white dammuso cupolas) and trees (pines in OSM woods, shrubs in scrub/heath) are InstancedMesh per 2 km tile.
- Cel style: MeshToonMaterial with a 4-step ramp + post pass (depth Laplacian + normal edges). C toggles to a natural photo-texture style.
- Keys: C cel, L names, T trees, B buildings, G 2D/3D, H time, N north, +/−. URL hash `#lat,lon,dist,heading,tilt`.
- Test hooks: `window.__pan` (setView, getView, updateSun, setStyle, heightAt, perf()).

## Tests
`cd web && python3 -m http.server 8765 &` then `node batch.mjs '[{"out":"/tmp/a.png","ll":[36.79,12.05],"dist":900,"heading":250,"tilt":65}]'` (SwiftShader: slow, wait ≥5 s per view).

## Later
Walking/driving: height.bin + `heightAt` give the ground; roads with z profiles are in prep/features.json. Inserts like the apartment's: pins at lat/lon.

## Houses missing from OSM (2026-10-22)
`fetch_esri.sh` downloads Esri World Imagery z18 tiles over the island (data/esri, ~85 MB, git-ignored; Esri imagery is approved for OSM tracing).
`python3 detect_houses.py` finds white roofs of house size that touch no OSM building, road or pool, fits a rotated rectangle and writes
`data/extra_buildings.json` (271 houses at the last run, ~85% precision on a 48-sample check). `prep.py` adds them as buildings (`src: esri`).

## Near detail (experiment)
`prep.py` also writes a 10 m class raster (vineyard, orchard, field, macchia, wood, rock, garden, mixed terraces; OSM landuse first, the
satellite palette as fallback), a 2.5 m road/house mask and wall polylines (OSM field edges, OSM walls, giardini panteschi).
`web_assets.py` packs them into `detail.bin` (~0.6 MB). The viewer builds 250 m tiles around the view when zoomed in under 1 km:
dry-stone walls, terrace walls traced along the contours of farmed slopes (every 3 m of height), alberello vines, olive trees,
macchia shrubs and tufts, a citrus tree per pantesco garden. Terrain near the camera is a 5 m bicubic level with ground blotches in the shader.

## Zone 1: town centre (town.py)
Town buildings are skipped by build.py and drawn by the viewer (town.json): one merged mesh with a facade shader (windows, shutters,
balconies, parapets, roof tanks), Castello Barbacane (battered lava walls, merlons, round tower with clock), Chiesa Madre (lava cladding,
gilded dome, bell tower), boats along the quays and pontoons, the ferry at Molo Karol Wojtyla, palms/lamps on the seafront, café tables,
paved piazzas, and ~96 labelled places (bars, restaurants, shops, quays) shown when zoomed in. Rural lava walls/terraces are suppressed
inside the zone. town.py is idempotent (it paints from prep/terrain_base.png).

## Navigation modes (Map 1 · Car 2 · Plane 3)
In the viewer (vehicle module in map.src.html). C cycles the camera: Follow (behind, drag to look around), Free orbit (camera
detached from the vehicle's heading), First person (cockpit, drag = head look). Wheel / +/- zoom, double-click resets the look, Esc = map.
- Car: arcade Fiat Panda 4x4, free drive, spawns wherever the map is centred (button: nearest road). W accelerator and S brake are
  pedals that ease in (gamepad triggers are analog); S at a standstill reverses; Space handbrake. ~50 kW engine, 5 gears, ~145 km/h
  top on asphalt; rolling resistance by surface (asphalt, cement, dirt, off road) and slope decide the speed. Houses, the sea, steep
  rock and the near layer's lava-stone walls are solid (glancing hits scrape along the wall).
- Plane: arcade Cessna 172. S/↓ pull up, W/↑ push, A/D roll, Q/E rudder, Shift/R throttle up, Ctrl/F down, Space brake, T = start on
  runway 26 (meta.runway from OSM); [ / ] speed x1, 1.5, 2, 3, 4 (thrust scales with the square, so top speed scales x; turns widen less than physics would). Coordinated turns, soft stall below ~47 kt, lands on the runway (sink < 4.5 m/s, wings level);
  hitting terrain or the sea respawns 300 m up. No collisions with buildings yet.
- Physics runs in fixed ~20 ms substeps. Test hook: window.__pan.vSim(seconds, keys).
- Gamepad (standard mapping): RT/LT gas/brake (plane: throttle), left stick steer / roll+pitch, LB/RB rudder, right stick look,
  A handbrake, Y camera, X respawn/runway, Start = map.
- Near roads are draped on the 5 m bicubic terrain (3 vertices across, +6 cm); far GLB roads are discarded inside near tiles; the
  constant part of the depth pull fades in with distance (min(c, 0.025 d)), so nothing floats in close-ups.
- In car/plane modes the near-detail tiles follow the camera frustum (car 1.1 km, plane 1.6 km ahead, 330 m all around); plane mode
  draws far trees/buildings 1.6x further.
- Models: lofted bodies (loftGeo: superellipse sections resampled by arc length, smooth normals, one colour per quad from its
  centre). Panda 4x4 with dark cladding, arches, glass with pillars, rails, mirrors, round tyres; Cessna 172 with tapered
  fuselage and outer wing panels, cheat line, swept extruded fin, wheel pants, struts, two-blade prop.
- Mobile / touch: map = one finger pan, pinch zoom, two-finger twist rotates, two-finger drag tilts. Car and plane show an
  on-screen stick (steer; plane roll + pitch, drag down = pull up), Gas / Brake / Handbrake pedals, plane throttle slider and
  Speed +/-; one finger on the scene looks around, pinch zooms the camera. Page zoom is disabled (viewport user-scalable=no).
- Car mode: only the 5 nearest place labels (< 450 m) and 4 street names (< 220 m); plane: labels by height above ground,
  main road names only. Depth outlines use a higher threshold in the car; the depth pull near the camera is 0.4% of the distance.

## Close-up buildings and walls (2026-10-24)
- Walls: only real ones (OSM barrier=wall/retaining_wall, giardini panteschi); the procedural roadside walls, contour terraces and
  landuse field edges are gone. Everything the car can hit is visible: building footprints (bld.bin), these walls, the sea.
- bld.bin (web_assets.py): every footprint with kind, zmin/zmax/h and a seed. Near-detail tiles redraw the buildings they own
  (by centroid): dammusi with lava-rubble or plastered walls (white / ochre / pink / red / grey, ~55% bare stone), lime coping,
  whitewashed rounded-square cupolas (one per room along the long axis), cannolo chimneys, arched door on the south-most long
  wall with lime frame, small windows, dukkena benches, reed pergolas; white houses as in town; ruins; greenhouses.
- build.py writes each building's centroid into the GLB UVs (export_texcoords=True; glTF flips V) and dome owners at the end of
  instances.bin; the viewer discards the far copy of any building whose owner tile is drawn up close.
- data/ref/dammuso: reference thumbnails; data/osm_campo.json: Campobello OSM extract (no house numbers on Via Posta Vecchia).
- Via Posta Vecchia, Campobello (HOME in map.src.html): hand-placed from Gianluca's photos and the aerial view — brown flat-roofed
  dammuso at the fork, lava shed with terracotta roof by the lane, pink dammuso with a dark timber veranda (white curtains, raised
  terrace) on its north front and a garden, a two-storey ruined dammuso beside it and low ruins behind, a tall date palm, lava walls
  round the property (two gates) and the walled citrus garden across Via Campobello Alto. Buildings are matched by OSM centroid.
- The outline (normal) pass applies the same far-copy masks (aOwn for buildings/domes, aFar for far roads/trees), so hidden far
  copies leave no ink lines inside close-up tiles.
- 2026-10-24 (2): roadside walls, contour terraces and field walls are back (they reflect reality), drawn as continuous dry-stone
  walls with the rubble shader (no more loose dark blocks) and solid for the car; the coast side of the Perimetrale is open where
  the sea is within ~260 m. roads_smooth.py (run after prep.py, before town.py) grades the main roads: smoothed elevation profile
  (Gaussian ~34 m + 9% grade limit) written into the road points, terrain graded to it in a 6 m + 18 m corridor; detail.bin road z
  now in 2 cm steps; the car drives on the road profile. Vegetation near the sea is sparser, with more dry grass.
  Home: pink dammuso turned 90 degrees right and three rooms long, ruin tower turned with it; brown and pink have two cupolas each.
- 2026-10-24 (3): wall sides were wound inward (one face culled) - fixed. Roadside walls are continuous: offsets from vertex
  normals so the pieces meet, gaps only at side roads/drives, houses, town, woods; the sea side is open only on the town-end
  stretch (west of Bue Marino), per Street View. coast_overlay.py (after town.py): 1 m/px overlay (web/assets/coast_detail.webp,
  meta.coastDetail bounds) for the strip seaward of the Perimetrale from town to Campobello, from Esri imagery: lava rock on a
  posterised dark ramp (real shelf/inlet outlines), green made summer-dry, dark wet rock at the waterline, the Bue Marino gravel
  car park (Cicci's Bistrot); those cells become class 7 (no macchia). Sea: shallow band narrowed, foam thinner.
- 2026-10-25 town centre: carZ no longer lifts the car near main roads (the max() made it fly); sea collisions only where the
  terrain is under water and not on the banchina; no rural walls within ~150 m of town or on the promenade (the invisible-ish
  walls near the castle). town.py adds the banchina (paved promenade between the seafront roads and the quay edge, quay walls,
  bollards every 7 m, benches, planters round the palms) and the lava-stone Gelateria/Pasticceria Katia (single storey, arches);
  the castle is near-black lava ashlar (authored shader palettes are now converted sRGB->linear); piazzas draped on the ground;
  boats re-modelled as lofted hulls with flare, sheer, antifouling and a coloured band (gozzi, fishing, sail, motor).

## Town centre pass 3 (2026-10-27, Street View + imagery)

- `town_extra.py` (new): 23 buildings OSM misses, traced by hand on Esri z18 with a 10 m grid (Conad City / Via Cavallotti, Emporio del Gusto / Via Napoli, around Katia, behind the castle) → `data/extra_town.json`. `prep.py` adds them as town buildings and drops any OSM part whose centroid falls inside one. An automatic roof detector was tried first and dropped: in the dense town it returned slivers of mapped roofs, paving and cars.
- The "empty field" behind Conad is real on both Esri and Google imagery. It is walled plots of dry earth and weeds. `town.py` now makes it class 4 (it was scrub, hence the dense shrubs) and draws 13 traced dry-stone plot walls. These are solid, and only drawn up close.
- `town.py` OVR table:
  - Hospital (dark-red facade, lunettes, glazed ground floor).
  - La Risacca (lava vaulted warehouse, gable, glass terrace room on top, no tables).
  - Blue Moon block (5 storeys, blue pilasters, stone base, blue awning).
  - Yacht Marina (6 storeys, arched windows, striped base) and Khamma (6 storeys, balconies, arcade).
  - Da Zaza (2 storeys, ochre); the green 5-storey by the castle.
  - Tiffany → building site (hoarding, concrete frame, tower crane).
  - Via Borgo Italia: 4–5 storeys.
  - Verandas replace the "buildings" on the banchina: Tikirriki and Alchimia (white canopy, green trim, tables); Policardo (empty, on the pier).
  - The kiosk by the castle roundabout (brown timber box), with sailboats moored in front.
- No café tables at Katia, La Risacca, Policardo, or where the verandas are.
- Church: beige board-formed concrete, no dome, fins and a big cross on the parvis side. The parvis is a raised platform (z 6.6) with a low wall and wide stairs at the NW corner.
- All 20 OSM `highway=steps` near town are real flights: treads, risers, lime-washed cheeks. This includes those behind the castle.
- Via Giovanni Falcone: a ramp on an embankment (about 7.5 % grade), meeting Via Napoli 1.6 m above the DEM. Via Napoli eases back down within 40 m (`roads_smooth.py`). These roads carry `lift` (bit 7 of the tier byte in detail.bin), so the viewer and carZ use their profile. Rubble retaining walls with parapets come from town.py.
- All drivable town roads are asphalt; Via Cagliari is 3.2 m wide. There are glazed shop fronts with striped awnings on Via Cagliari and at the Via Errera corner, and fruit crates at Zaza and Da Zaza.
- Castle: corbel row and string course under the merlons, two rows of small square windows, tricolore on the keep.
- Town walls (stairs, parapets, retaining walls, plot walls) are solid for the car via `TOWN.solid` in `wallHit`.

## Fixes + car types (2026-10-27, later)

- Hand-traced buildings are now trimmed off the carriageways (road buffer w/2 + 0.8 m) in `prep.py`. Any that would lose more than 45 % of their area are dropped. Two doubtful traces by the Via Napoli / Via Trieste steps were removed. This fixes a building on the Lungomare by the castle, and one at Emporio.
- OSM steps are clipped where they run on into a street (`town.py`), so no flight of steps crosses a road.
- Pasticceria da Giovanni: its tables are under a patio roof on Piazza Cavour, across the road (traced on the imagery). There are no longer umbrellas outside the shop.
- Car types: press **V**, or use the HUD button, to switch between the Panda 4x4 and a blue Rally car. The choice is remembered in localStorage (`pan.car`).
  - The Rally car (`rallyModel`) is low, with wide arches, a bonnet scoop, a big wing, gold wheels and spot lamps. It has no logos or livery text.
  - Arcade drift physics: heading `h` and travel direction `phi` are separate, and grip pulls phi towards h. The handbrake, or a big steering input above ~47 km/h, raises `drift`: grip drops, yaw rises, and the slide holds while you steer into it. Slip is capped at ~50°. Loose surfaces slide more. The handbrake barely slows the car, and the body leans out of the slide. The HUD shows `DRIFT n°`.
  - The Rally car has about 200 km/h top speed and six gears.
