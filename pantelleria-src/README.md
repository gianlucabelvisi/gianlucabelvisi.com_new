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

- Rally pass 2 (2026-10-27): drift holds on the throttle while steering (up to ~60 deg), less scrub; wall/house hits bounce (keep 86% of the speed along the obstacle, reflect 28% of the part into it) for both cars; more punch (11.5 m/s2); off-road resistance x0.35 / dirt x0.6 for the rally car; jumps off crests (vz follows the ground, airborne when the ground falls away, 0.9 g in the air, landing squat); rollovers on hard sideways hits, side slopes > 27 deg at speed, very fast full-lock slides off road, sideways landings; skid marks (ring buffer of 4000 quads, dark on tarmac, pale ruts on dirt, hidden from the outline pass).

- Rally pass 3 (2026-10-28), weight: body-frame vx/vy + yaw rate with inertia (the world velocity stays while the body turns), Coulomb lateral grip (mu g, constant force) instead of exponential; the tyres pull the nose back in line unless you steer into the slide; aero drag 0.0011 v2 (top ~200 km/h). Sprung body (pitch/roll/heave springs: squat, dive, lean, landing bounce, wall knocks). Wheels: spokes, capped visual spin + blur discs, wheelspin, droop in the air, counter-steer shown. Heavier in the air (1.3 g). Dust/tyre smoke (Points), skid marks fade (half-life ~12 s), marks on wheelspin and landings, blob shadow under the car, chase cam with lag + speed FOV + shake. FX list hidden from the outline pass.

- Rally pass 4 (2026-10-28): turns at speed again. Arcade grip grows with speed (mu x (1 + v/28), capped at 45 m/s), so plain steering asks for a yaw rate just inside the grip (0.92 mu g / v) and the tail only steps out a little; handbrake / a throttle flick still drift (drift x2 yaw). The aligning pull while steering into a slide scales with the drift (0.25 + 0.9 drift), so it no longer fights ordinary cornering. At 135 km/h on tarmac, full lock gives ~0.7 rad/s (radius ~55 m, ~8 deg slip).

- Rally pass 5 (2026-10-28), WRC-style entries: engine braking when you lift (1.9 m/s2); front-axle load c.lt (smoothed -a/g). Lift or brake while turning in = weight on the nose: the front bites (yaw demand x(1 + 0.8 lt)) and the light tail steps out (drift from lt + lift 0.18 + brake 0.35, up to 0.85). A quick left-right flick within 0.9 s swings it (pendulum). In the slide, throttle + steering hold and adjust the angle; past ~30 deg the tyres catch and the angle settles (~40 deg at full lock). Flat-out steady cornering stays grippy. Power cut in a slide 25 %, scrub 0.06.

## Ground pass (2026-10-28): floating buildings, road joins

- Pipeline: prep.py -> roads_smooth.py -> town.py -> coast_overlay.py -> **ground_fix.py** -> build.py -> web_assets.py -> assemble.py.
- ground_fix.py re-measures every building zmin/zmax on the final grid (after road grading + harbour floor), with the viewer heightCubic, along edges every 1.5 m and inside on a 2.5 m grid; updates features.json and town.json. Before: 685 buildings floated > 0.3 m (346 > 1 m, worst 36 m), 230 were sunk.
- Dammusi on slopes stand on a lava-rubble terrace: floor at max(mid, uphill - 1.1 m), rubble below (viewer and far GLB), instead of a tall whitewashed wedge. Big dammusi get a grid of 4-6 m cupolas instead of one giant dome.
- Roads: ribbons drape on max(bicubic, the drawn 5 m terrain triangles) so hollows no longer swallow stretches of road; side roads take the main road surface where they meet it and ease onto the ground over 3 m (roadGround), so junctions join instead of tearing.

## Drive feel + coast pass 1 (2026-11-01)

- Driving (pass 6): steering eases in and recentres; a light road assist (pure pursuit on the road ahead) when you are not steering hard; arcade rally drift (lift-off / brake / flick entries, hold by steering into it, opposite lock catches it); soft walls (keep ~95% of the along-wall speed, small bounce, no wall rollovers); side probes push the nose away from walls. Holding W for 12 s at 130-170 km/h on four test roads: no wall hits.
- Walls: rural wall segments within road half-width + 0.45 m of any road are cut (clipWallsOffRoads).
- Floating: ground_fix.py re-seats every building and tree on the viewer's own bicubic ground (after all grading).
- Coast: coast_atlas.py builds a 1.6 m/px rocky-coast atlas from the Esri imagery for every coastal 512 m tile (lava rock, wet rock at the waterline, no green within ~18 m of the sea, trees within 40 m dropped). coast_sea.py replaces coast.png with a 4096 px two-channel distance to the real waterline (the viewer terrain at z = 0): the foam is now a thin broken surf line on the rocks, not a sand strip, and the turquoise fringe is a few metres wide.
- Landmarks: Arco dell'Elefante (head, back, ear, trunk dipping into the sea with the passage open under it), the Faraglione di Tracino sea stack, the Faro di Punta Spadillo tower (Street View).
- Grass tufts are drawn without ink outlines (from afar they were black specks).
- Pipeline: run_all.sh (town_extra, prep, roads_smooth, town, coast_atlas, coast_sea, coast_overlay, ground_fix, build, web_assets, assemble).

## Drive pass 7 + Bue Marino site (2026-11-01, later)

- Rally drift is deliberate only: Space (handbrake) starts it; hold it with gas + steering into the turn, opposite lock catches it, letting go of the steering ends it in ~0.3 s. Lifting, braking and quick key flicks no longer throw the car sideways (a keyboard bot drifted 27-37 s out of 40 with pass 6, 0 s now).
- Road assist is a hint, not a hand on the wheel: max 0.3 rad/s, same road only (it used to swing the car into side roads at up to 1.6 rad/s), off as soon as you steer. Edge nudge 0.2 rad/s; side guard 0.2 rad/s.
- Hand-detailed coast sites (sites/): sites/bue_marino.py rebuilds Cala del Bue Marino at 0.5 m from the Esri photo: waterline traced from the photo (plus the dark open sea and the cliff shadows on the water), stepped trachyte shelves and ~70-degree cliff faces 4.6-7 m round the cove, a ~1 m swimming ledge on its west side, a low black shore to the west, boulders at the foot. Output web/assets/site_bue.bin/.webp/.json; it lowers the 10 m grid under the rock. In the viewer heightCubic() uses the site heightfield where it exists (the island mesh keeps heightCubicRaw).
- Cicci's Bistrot (from the Google Maps photos): pale-yellow prefab cabin with white shutters, white-framed veranda, one red-brown roof (15 x 10 m as on the photo), two sand shade sails on steel poles over timber picnic tables, flag, red/white rail on stone bollards, palm-leaf parasol with tyre seats and green chairs. Solid for the car; no rural walls through it.
- Sea: thinner turquoise fringe (3.5 m) and surf line.

## Drive pass 8, Perimetrale walls, Cicci's 2 (2026-11-02)

- Rally compromise: on the gas the car grips and follows the road (as pass 7). Lift off (or brake) and hold the wheel into a bend above ~43 km/h and the tail steps out a little (drift ~0.5-0.6, slip ~8-15 deg), built up over ~0.3-0.6 s; a quick key tap does nothing (the wheel must be held ~0.15 s). Steering into it holds it, on or off the gas; straightening ends it. A drift guide pulls the line of travel round the bend along the road ahead (same road, up to 1.2 rad/s) while you steer the way the road goes. Space is still the full handbrake drift.
- Perimetrale town -> Campobello walls from a Street View survey every 200 m (PERIM in map.src.html: route + [x, y, left, right]). Roadside walls there exist only where the survey shows them (town edge included), other walls within 9 m of that road are removed. Elsewhere generated roadside walls now come in runs with long open stretches (~1/3 removed).
- Cicci's: dark gravel car park and the pale terrace painted in the site texture (and the patch extended over them), the OSM footpaths across the gravel no longer drawn as lanes, six more picnic tables under 'fake palms' (poles thatched with dry palm leaves) plus four more round the terrace, the low kerb walls of the enclosure west of the cabin, the way in from the road through a gap in the road wall, drooping palm-leaf parasol.

## Via del Lago site (2026-11-02)

- sites/lago.py rebuilds the descent from the Perimetrale to the Specchio di Venere at 0.5 m (the 10 m DEM had the lakeside road 20-30 m above the water). Street View: upper leg along the plateau (~42-46 m) then down to a first hairpin (~22 m); middle leg back west across the crater wall with an ~8 m grey rock cut uphill and concrete guard blocks on the lake side, down to a second hairpin (~6 m); lower leg east along the shore at ~3.5 m with a low rubble retaining wall uphill, a grass verge and a line of black rocks in the shallows; the west-shore track at the same level. The strip between the middle leg and the water is re-modelled from the road levels and the shoreline; elsewhere the ground is cut and filled to seat the road. The road is asphalt and 4 m wide. No field walls on the crater wall (SITE_CLEAR).

## Lago site pass 2 (2026-11-02, later)

- sites/lago.py rewritten: the whole crater round the Specchio di Venere is one smooth surface (harmonic membrane solved at 1 m) pinned to the roads as flat benches at their design levels (descent legs, the ring road round the east/south/west shore at 2.8-6 m, the first 260 m of Via Bugeber) and to the water at 2.25 m, stitched to the island ground at the rim. No more cut/fill steps or ridges.
- The lake outline is traced from the photo (incl. the pale southern shallows) and replaces the OSM polygon (kept as pts_osm); the ring road no longer dips under the water.
- ground_fix.py samples the site heightfields, so houses and trees in a site sit on it.

## Lago site pass 3 (2026-11-03)

- Bumps: every road leg now ends exactly at the level of the leg it joins (hairpins, the NE corner), and all roads plus the car park share one blended level field (smoothed over 1.5 m where they meet). In a site the road ribbon drapes on the site surface only (groundTop no longer takes the max with the coarse island mesh). Probe: no kinks > 0.12 m/m along any lake road.
- Car park at the end of the asphalt (NE shore, from the photo): a flat dirt lot, ~45 parked cars in the rows seen on the photo, the shore wall opens onto it. Asphalt stops there; the ring road round the lake stays unpaved.
- Less N64: the lake is banded from the photo (navy deep crater, teal, turquoise, milky shallows); the site photo is sharpened and broken up with world-space grain up close; ~5000 macchia bushes where the photo is green.

## Campobello pass 1 (2026-11-03)

- sites/campobello.py (Street View every ~70 m along Via Campobello, plus Via Posta Vecchia and the photo): removes 9 drives/tracks the imagery does not show (one around Via Posta Vecchia), narrows unnamed drives to 2.6 m (no walls of their own), Via Campobello 4 m, Via Posta Vecchia 3.2 m (asphalt to the bend).
- Wall survey per side (height and kind: dry-stone, tall retaining, white plaster) drives the roadside walls on both roads; elsewhere roadside walls now vary in height (0.55-1.35 m). White walls are lime-washed.
- New assets: bougainvillea, oleander, big fig/frangipani, carob, Norfolk pine, agave, wooden utility poles, white street lamps, traffic mirror, cane fence, white gate posts. Placed from Street View; 124 trees from the dark crowns on the photo near the two roads.
- The two white guard posts on the island where Via Campobello splits from the Perimetrale.

## Kharuscia, Minardi, coast landmarks, Streets toggle (2026-11-04)

- Via Kharuscia (Perimetrale -> Via Campobello, Street View): 3.6 m asphalt lane, the two lava-stone WWII guard huts (garitte di Karuscia) either side of it ~25 m in, surveyed walls (dry-stone, tall retaining, white), agaves, palms, lamps, poles, pines, prickly pear.
- Cantina Minardi (Via Campobello 85, photos): lava-stone blocks with arches, the white barrel-vault cellar, a pink terrace with a dark timber pergola, white slats, white/orange curtains, pallet lounges with red cushions, tables with red and orange chairs.
- sites/cliffs.py: the north coast east of Il Porticello is a cliff dropping straight to the sea.
- Arco dell Elefante rebuilt as one continuous mass (back, head, trunk into the sea); Faraglione di Tracino ~38 m with a lower companion; Cala Tramontana timber sun decks and the slipway with timber steps.
- The car sits on the drawn ground (site surface or the 5 m mesh) so it no longer sinks or floats where they differ.
- Streets button (S) in the top-right menu shows or hides street names (on by default, remembered).

## 2026-11-07 airport, lake terrain redo, Kharuscia
- sites/airport.py (runs before cliffs.py): grades runways/taxiways/aprons, clears scrub (class 10 = paved, 4 = field grass), clips dry-stone walls inside the fence, writes web/assets/airport.json (paved, aprons, markings quads, fence, terminal footprints, props, parked cars).
- Viewer buildAirport(): draped runway/taxiway ribbons and clipped apron mesh, white/yellow markings, chain-link fence with barbed wire (solid), two-storey glass terminal with solar roof and pyramid entrance, control tower, floodlight masts, ATR 72 + business jet, windsocks, landside car parks. Airfield paving counts as asphalt for the car (airPavedAt).
- build.py no longer bakes runway ribbons.
- sites/lago.py: no cutting/bank; gentle verges, shore excluded from membrane pins, no grid lowering before the membrane (fixes rim walls, tall houses, vertical road). Brick parapet blocks on the hairpins.
- Via Kharuscia widened to 5.4 m two-lane asphalt. Tarmac drift less eager (lift-off > 15 m/s).

## 2026-11-07 later: lake road from a 20 m Street View survey
- sites/lago.py back to the lago-pass-3 base. Membrane = absolute near the water, displacement from the DEM up the crater wall (blend 35-80 m from the lake): natural slopes, no cliff at the rim. Grid lowered only 28 m inside the area (bicubic never pulls the rim down).
- Only cutting: last ~35 m before hairpin 1 (2.5 m / 1.5 m). Middle leg: uphill rock face (steepens existing rise only), brick parapet sections 1.6 m every 2.6 m for the first ~120 m after hairpin 1. Shore wall only from ~200 m after hairpin 2, 0.6 m.
- Via Kelima = footway (hikers), 3 lava posts at its mouth. Car treats footpaths/steps as off-road.
- ground_fix: plinth capped at 6 m (plinthMax). The long structure on the west crater slope (OSM 1160060288/89) is a low ruin.
- Airport: fence inside the public perimeter roads; landside (terminal, roundabout, car parks) has no field walls (class 1/10). Made-up glass pyramid removed.

## 2026-11-07 lake fixes 2
- Perimetrale junction: lake site starts 32 m in (link lane 389374588 no longer buried); field walls cleared; low lava-stone island in the fork; no shrubs within 6 m of the Perimetrale/link.
- Removed: middle-leg added rock face (ribbed walls), the 3 posts at Via Kelima (they sat on the road), OSM 1160060288/89 (65 m slab on the slope).
- Lane 1160060138 (to the pink houses) pinned at its natural level and trimmed to stop at the top of the crater wall (was a vertical ramp down to hairpin 2).

## 2026-11-08 vehicles
- Helicopter mode (4 / Heli button): heliModel() (R44 type), stepHeli(): stick asks for a speed, eases into it, hovers when released; Shift/R up, Ctrl/F down, W/S fwd/back, A/D turn, Q/E sideways, Space stop, T lands below; rides over terrain at speed; touch slider = collective.
- Vespa 150 (red, with rider) as car type vespa (V cycles Panda > Rally > Vespa): ~100 km/h top, leans atan(v^2/(R g)), no skid marks, small shadow, wheel radius from the model (c.wr).
- Panda/rally: real half-ring arch flares, bumpers, grille, lamps, mud flaps, slim rear wing, door roundels (no more painted stair-steps).
- Lake: macchia kept 4 m off every lane in the site, parked cars kept out of aisles.

## 2026-11-08 placement + lake
- Car placement: first press of Car (2) shows an orange marker (ring, arrow, bobbing pin) on the road nearest the map centre; move the map to change it; Car/2/Enter again drives, Esc/Map cancels (PLACE, carSpawnPoint, startPlacing/stopPlacing/updatePlace).
- lago.py: every other lane in the site (Perimetrale profile, drives/tracks at smoothed natural ground) gets a bench; the 32 m junction exclusion is gone.
- Lake colours: 7 bands, shallows mixed with the photo tones (no flat milky slab up close).

## 2026-11-08 roads clean + debug
- Road surfaces: roadProf(r) = 5 lines across, every 1 m, each the upper envelope of the ground (max over +-3 m then +-3 m mean): never below the terrain, smooth along; road mesh 5 verts across; carZ drives on the same surface. Island audit (web/road_audit.mjs): ground poking through roads 394 -> 19 points.
- road_clear.py (after the sites): drops trees on drivable roads, trims building/town footprints back to road edge + 0.3 m (935 trimmed, 1 dropped).
- build.py: no flat GLB copy of Lago Specchio di Venere (it covered the depth-coloured site lake up close).
- Debug (G / Debug button): off, light = FPS/ms/draws/tris, heavy = every building numbered (#n, stable: data/bld_numbers.json id->number, never reused; bld.bin header +uint32 num; town.json blds num).

## 2026-11-08 junction mounds (root cause)
- The mounds by the Perimetrale were the island bicubic ringing up 1-2 m next to grid nodes the lake site had lowered to -6 m (since the junction exclusion was dropped). lago.py: no grid lowering within 30 m of roads the site does not shape (perim, lanes, svc). Verge cap: ground beside those roads and the plateau leg rises at most 0.3 m/m (grid + site).
- Lake water polygon buffered 2 m under the shore; shore lip ZW+0.3 (no slivers of lake bed at the edge now that the flat GLB lake is gone).

## 2026-11-09 lake: middle leg + fake hills
- RULE: whenever terrain is altered, verify roads are not affected. Run python3 check_lago.py after run_all.sh (fake hills > 3 m above the original ground; walls beside roads) and look at the lake roads from above and from the car.
- Grid kept up only near the Perimetrale, or near lanes/svc > 40 m from a Via del Lago leg (keeping it up by the lane above the middle leg had buried the middle leg under a stepped wall).
- Lowered grid nodes are re-set after the membrane to 1 m under the lowest site ground within 12 m (not -6 m): the -6 m drop made the bicubic ring into 4-7 m ridges that became fake hills.
- Away from roads the site never stands above the original ground (+0.3), except a 1:1.2 fill falling from a road or the beach rising from the water line.

## 2026-11-09 performance pass 1
- Site surfaces in 64 m tiles with 4 levels (every 1/2/4/8 samples by distance: <70, <180, <450 m, x QUALITY); tile rings stay full-res so there are no cracks; off-screen tiles culled (updateSiteLOD).
- Far trees in 500 m tiles; a tile is not drawn when every close-up tile under it is up (they were drawn and then discarded per pixel).
- Close-up plants thin out with distance via InstancedMesh.count on shuffled instances (full within ~170 m, 1/3 at the ring edge) (updateVegLOD).
- Lake surface back in the ink pass (the lake bed steps were drawing ink lines across the water).
- Lake view: 8.5 M -> 1.8 M triangles per frame (all passes).


## 2026-11-11 the five-area pass

Workspace note: the cloud workspace was rebuilt from this folder on 2026-11-11. To rebuild from scratch you need, besides
the files here: `cp data/tinitaly/w40575_s10/w40575_s10.tif data/dem10.tif`, `python3 s2mosaic.py`, then
`python3 town_extra.py && python3 prep.py && python3 road_surface.py` once (road_surface.py needs prep/features.json and
writes data/road_surface.json), then `bash run_all.sh`. Tools: pip bpy shapely scipy rasterio pyproj pillow matplotlib,
npm -g @gltf-transform/cli, three@0.170 + playwright for the tests.

**Standing rule: whenever the terrain or anything on it changes, the roads must not be affected.** `run_all.sh` now ends with
- `python3 check_roads.py` — objects on carriageways (trees, buildings, site props, cars, walls, fence), fake hills
  (> 3 m above the original ground), wall-like rises beside roads, roads steeper than 35 % inside a site;
- `node tests/road_check.mjs` — in the real viewer: ground poking through the tarmac, kinks in the road surface.
Both compare 100 m cells with `data/road_check_baseline.json` and fail the build on anything new. `--accept` saves a new
baseline (only after looking at the place).
- `python3 suspicious_roads.py` → `suspicious_roads.md`: roads steeper than 22 % or with no trace on the Esri photo.

Viewer
- Outlines in one pass: every material writes its view normal to a second render target (ShaderChunk patch at the top,
  `gNrm`, alpha 0 = no ink). `?mrt=0` falls back to the old two passes. No-ink objects use `noInk(o)`.
- Automatic resolution (`DYN`, Settings), benchmark (`G` then `B`): five places, 30 s, copyable result.
- All files are requested at once at boot.
- Debug (`G`): `O` satellite photo over the model (Esri tiles, 60 % / 100 %), `K` Street View here, heavy debug: click
  copies a location line (lat/lon, x/y, building number, road), colliders drawn in magenta.
- Sound (Web Audio, synthesised: engine, tyres, wind, rotor, thumps), `M`.
- Rally stage (`Y` in the car): Perimetrale town → Campobello, ten gates, best time per car (localStorage `pan.rally`).
- Vespa: own steering (short wheelbase, lock limited to ~0.75 g) and brakes.
- Plane: `RUNWAYS` (four ends, `T` cycles), approach line in the HUD, taxiways/aprons count as runway, field landings.
- Helicopter: landing spots (`PADS`, found on clear flat ground near twelve places, `N`), auto-land (`L`), lands on the
  lake surface.
- UI: Places (`/`) and Settings buttons; settings menu (names, streets, time, sound, automatic resolution, detail
  auto/high/low = QUALITY, photo mode `P`, full screen, debug, help `?`); first-visit help; while placing the car a
  click on the map moves the marker; touch: Up / Down / Auto-land buttons for the helicopter, rotate hint.
- Closest ring (`buildClose`, tiles within 250 m): pergola + stone bench, flower pots, agave / prickly pear,
  bougainvillea next to houses; never on a road or in a building. Finer ground grit under 110 m; tar patches and edge
  lines on roads.
- prep.py: villages outside Pantelleria town are low (half the small footprints become dammusi, two storeys are rare).

Not done: side-by-side Street View review sheets (use `K`), cross-fades between detail levels, per-land-type ground
textures, compressing island.glb further.
