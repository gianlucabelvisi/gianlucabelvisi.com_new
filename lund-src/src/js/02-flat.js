// ============================================================ the flat: Rådmansgatan 1A, ground floor, 67.3 m², 2 rooms (broker's plan, Bülow & Lind)
// Everything below is in plan pixels of the broker's drawing (149.4 px per metre). Plan up = Rådmansgatan (west), plan right = Trollebergsvägen (north).
const pw = (px) => px / PXM;                     // plan px -> metres
const ROOMS = [
  { id: 'living', sv: 'Vardagsrum', en: 'Living room', poly: [[456, 31], [785, 31], [1173, 420], [1173, 834], [456, 834]] },
  { id: 'dining', sv: 'Matplats', en: 'Dining area', poly: [[32, 31], [456, 31], [456, 357], [32, 357]] },
  { id: 'kitchen', sv: 'Kök', en: 'Kitchen', poly: [[32, 357], [440, 357], [440, 834], [32, 834]] },
  { id: 'hall', sv: 'Hall', en: 'Hall', poly: [[456, 834], [636, 834], [636, 1257], [456, 1257]] },
  { id: 'entry', sv: 'Entré', en: 'Entrance', poly: [[247, 1257], [636, 1257], [636, 1523], [247, 1523]] },
  { id: 'bath', sv: 'WC/Dusch', en: 'Bathroom', poly: [[185, 855], [440, 855], [440, 1241], [185, 1241]] },
  { id: 'bedroom', sv: 'Sovrum', en: 'Bedroom', poly: [[652, 849], [1173, 849], [1173, 1523], [652, 1523]] },
  { id: 'stair', sv: 'Trapphus', en: 'Stairwell', poly: [[-800, 1262], [-310, 1262], [-310, 820], [0, 820], [0, 1262], [247, 1262], [247, 1665], [-800, 1665]] },
];
const PLANPT = (p) => P(p[0], p[1]);
const roomArea = (r) => { let a = 0; const q = r.poly; for (let i = 0; i < q.length; i++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % q.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2 / PXM / PXM; };

// ---- a plan rectangle (x0, y0)-(x1, y1) as a world box from z0 to z1
function planBox(x0, y0, x1, y1, z0, z1, mat, flags = {}) {
  const c = P((x0 + x1) / 2, (y0 + y1) / 2);
  return sbox(pw(Math.abs(x1 - x0)), pw(Math.abs(y1 - y0)), z1 - z0, c[0], c[1], z0, PANG, mat, flags);
}
// a box in plan coordinates by centre + size in metres (w along plan x, d along plan y), turned by rot (radians, plan)
function planBoxM(cx, cy, w, d, z0, h, mat, flags = {}, rot = 0) {
  const c = P(cx, cy);
  return sbox(w, d, h, c[0], c[1], z0, PANG + rot, mat, flags);
}

// ---- floors and ceilings
const WALLF = { collide: true };
const FLOORF = { floor: true, noShadow: true };
const ABOVE = { layer: 'above', noShadow: false };
function planPoly(poly, z, mat, flags, down = false) {
  const g = polyGeo(poly.map(PLANPT), z);
  if (down) {   // a ceiling: same outline, facing down
    const idx = g.index; if (idx) { const a = idx.array; for (let i = 0; i < a.length; i += 3) { const t = a[i]; a[i] = a[i + 2]; a[i + 2] = t; } }
    const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, -1, 0);
  }
  return addStatic(g, mat, flags);
}
// oak everywhere except the kitchen (grey clinker) and the bathroom (black tiles)
planPoly([[32, 31], [456, 31], [456, 357], [32, 357]], FZ, MATS.floor, FLOORF);
planPoly([[456, 31], [785, 31], [1173, 420], [1173, 834], [456, 834]], FZ, MATS.floor, FLOORF);           // living
planPoly([[440, 573], [456, 573], [456, 696], [440, 696]], FZ, MATS.ktile, FLOORF);                          // kitchen opening
planPoly([[456, 834], [636, 834], [636, 1257], [456, 1257]], FZ, MATS.floor, FLOORF);                        // hall
planPoly([[269, 1257], [636, 1257], [636, 1523], [269, 1523]], FZ, MATS.floor, FLOORF);                      // entrance
planPoly([[652, 849], [1173, 849], [1173, 1523], [652, 1523]], FZ, MATS.floor, FLOORF);                      // bedroom
planPoly([[32, 357], [440, 357], [440, 834], [32, 834]], FZ, MATS.ktile, FLOORF);
planPoly([[185, 855], [440, 855], [440, 1241], [185, 1241]], FZ + 0.005, MATS.btile, FLOORF);
planPoly([[440, 992], [456, 992], [456, 1111], [440, 1111]], FZ + 0.004, MATS.btile, FLOORF);    // threshold
planPoly([[636, 1284], [652, 1284], [652, 1402], [636, 1402]], FZ, MATS.floor, FLOORF);
planPoly([[247, 1291], [269, 1291], [269, 1428], [247, 1428]], FZ, MATS.oakdoor, FLOORF);
// ceilings (hidden in the view from above)
for (const r of ROOMS) if (!['stair', 'passage'].includes(r.id)) planPoly(r.poly, FZ + H, MATS.ceiling, { layer: 'above' }, true);
planPoly([[440, 357], [456, 357], [456, 834], [440, 834]], FZ + H, MATS.ceiling, { layer: 'above' }, true);
planPoly([[456, 834], [636, 834], [636, 849], [456, 849]], FZ + H, MATS.ceiling, { layer: 'above' }, true);
// slab between us and the flat above (seen from outside the windows at an angle)
planPoly([[11, 10], [808, 10], [1195, 399], [1195, 1544], [247, 1544], [247, 1262], [163, 1262], [163, 855], [11, 855]], FZ + STOREY - 0.02, MATS.concrete, { layer: 'above' });

// ---- interior walls (plan rectangles), 2.5 m
const IW = [
  [11, 10, 32, 855],                               // kitchen | street-door passage
  [11, 834, 456, 855],                             // kitchen | bathroom + stairwell
  [440, 357, 456, 573], [440, 696, 456, 834],      // kitchen | living (fridge wall, TV pillar)
  [163, 855, 185, 1262],                           // bathroom | stairwell
  [440, 855, 456, 992], [440, 1111, 456, 1257],    // bathroom | hall (door 992-1111)
  [163, 1241, 456, 1257],                          // bathroom | entrance
  [247, 1241, 269, 1291], [247, 1428, 269, 1544],  // entrance | stairwell (front door 1291-1428)
  [247, 1523, 1195, 1544],                         // back wall to the neighbours
  [636, 834, 652, 1284], [636, 1402, 652, 1523],   // bedroom | hall, entrance (door 1284-1402)
  [636, 834, 1173, 849],                           // bedroom | living
];
for (const [x0, y0, x1, y1] of IW) planBox(x0, y0, x1, y1, FZ, FZ + H, MATS.wall, WALLF);
// above the doors
planBox(440, 992, 456, 1111, FZ + 2.06, FZ + H, MATS.wall, WALLF);
planBox(636, 1284, 652, 1402, FZ + 2.06, FZ + H, MATS.wall, WALLF);
planBox(247, 1291, 269, 1428, FZ + 2.1, FZ + H, MATS.wall, WALLF);
// the kitchen-living opening has a dropped beam (the cabinets run to a 2.3 m soffit)
planBox(440, 573, 456, 696, FZ + 2.3, FZ + H, MATS.wall, WALLF);
// bathroom: large white tiles on every wall, a mosaic stripe beside the shower, black tiles on the floor
{
  const tz0 = FZ, tz1 = FZ + 2.3, k = 0.008 * PXM;
  planBox(185, 855, 440, 855 + k, tz0, tz1, MATS.bwall);          // shower wall
  planBox(185, 1241 - k, 440, 1241, tz0, tz1, MATS.bwall);
  planBox(185, 855, 185 + k, 1241, tz0, tz1, MATS.bwall);
  planBox(440 - k, 855, 440, 992, tz0, tz1, MATS.bwall); planBox(440 - k, 1111, 440, 1241, tz0, tz1, MATS.bwall);
  planBox(316, 855 + k, 336, 855 + 2 * k, tz0, tz1, MATS.mosaic);   // mosaic stripe right of the shower cabin
}

// ---- exterior walls with real window openings: brick outside, plaster inside, white casement windows
const WIN = { sill: 0.85, head: 2.22 };
const windows = [];        // filled below; 06-interact makes the sashes openable
function extWall(A, B, outwardSign, openings, endExt = [0, 0]) {
  const a = P(...A), b = P(...B), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n0 = [u[1], -u[0]];
  const n = [n0[0] * outwardSign, n0[1] * outwardSign], ang = Math.atan2(u[1], u[0]);
  const piece = (s0, s1, o0, o1, z0, z1, mat, flags) => {
    if (s1 - s0 < 1e-3 || z1 - z0 < 1e-3) return;
    const sc = (s0 + s1) / 2, oc = (o0 + o1) / 2;
    sbox(s1 - s0, o1 - o0, z1 - z0, a[0] + u[0] * sc + n[0] * oc, a[1] + u[1] * sc + n[1] * oc, z0, ang, mat, flags);
  };
  const ops = openings.map((o) => ({ ...o })).sort((p, q) => p.s0 - q.s0);
  // layers: plaster inside, brick outside, concrete plinth under the raised floor (down to the pavement)
  for (const [o0, o1, zb, zt, mat] of [[0, 0.17, FZ, FZ + H, MATS.wall], [0.17, T, FZ, FZ + STOREY, MATS.brick], [0.12, 0.17, FZ + H, FZ + STOREY, MATS.concrete], [-0.02, T + 0.02, 0, FZ, MATS.plinth]]) {
    const e0 = endExt[0] * o1, e1 = endExt[1] * o1;
    let s = -e0;
    for (const op of ops) {
      piece(s, op.s0, o0, o1, zb, zt, mat, WALLF);
      if (op.z0 > zb) piece(op.s0, op.s1, o0, o1, zb, Math.min(op.z0, zt), mat, WALLF);
      if (op.z1 < zt) piece(op.s0, op.s1, o0, o1, Math.max(op.z1, zb), zt, mat, WALLF);
      s = op.s1;
    }
    piece(s, L + e1, o0, o1, zb, zt, mat, WALLF);
  }
  const frame = { a, u, n, ang, L };
  for (const op of ops) if (op.kind === 'window') windows.push({ ...op, ...frame, id: op.id });
  return frame;
}
const TAN225 = Math.tan(22.5 * D2R);
// Rådmansgatan wall: our dining window
const WALL_W = extWall([11, 31], [785, 31], -1, [
  { kind: 'window', id: 'win_dining', room: 'dining', s0: pw(86 - 11), s1: pw(338 - 11), z0: FZ + WIN.sill, z1: FZ + WIN.head },
], [0, TAN225]);
// the cut corner with the desk window
const CH = { A: [785, 31], B: [1173, 420] };
const CHL = Math.hypot(1173 - 785, 420 - 31) / PXM;
extWall(CH.A, CH.B, -1, [{ kind: 'window', id: 'win_corner', room: 'living', s0: CHL * 0.26, s1: CHL * 0.71, z0: FZ + WIN.sill, z1: FZ + WIN.head }], [TAN225, TAN225]);
// Trollebergsvägen wall: living room window, bedroom window
extWall([1173, 420], [1173, 1544], -1, [
  { kind: 'window', id: 'win_living', room: 'living', s0: pw(512 - 420), s1: pw(756 - 420), z0: FZ + WIN.sill, z1: FZ + WIN.head },
  { kind: 'window', id: 'win_bed', room: 'bedroom', s0: pw(957 - 420), s1: pw(1205 - 420), z0: FZ + WIN.sill, z1: FZ + WIN.head },
], [TAN225, 0]);

// ---- window joinery: outer frame, two inward-opening sashes (frosted film on the lower part, as in the photos),
// a stone window board inside, a radiator under it, a zinc sill outside
const winParts = {};
MATS.sill = std({ color: 0xe9e7e2, roughness: 0.3 });
MATS.zinc = std({ color: 0x8e9496, roughness: 0.45, metalness: 0.7 });
MATS.radiator = std({ color: 0xf5f5f3, roughness: 0.35 });
for (const w of windows) {
  const { a, u, n, ang } = w, W = w.s1 - w.s0, Hh = w.z1 - w.z0, oF = 0.2;   // frame plane: 20 cm out from the plaster
  const at = (s, o) => [a[0] + u[0] * s + n[0] * o, a[1] + u[1] * s + n[1] * o];
  const fb = (s0, s1, o0, o1, z0, z1, mat, fl = WALLF) => { const c = at((s0 + s1) / 2, (o0 + o1) / 2); sbox(s1 - s0, o1 - o0, z1 - z0, c[0], c[1], z0, ang, mat, fl); };
  const fw = 0.055;
  fb(w.s0, w.s0 + fw, oF - 0.05, oF + 0.05, w.z0, w.z1, MATS.frame); fb(w.s1 - fw, w.s1, oF - 0.05, oF + 0.05, w.z0, w.z1, MATS.frame);
  fb(w.s0, w.s1, oF - 0.05, oF + 0.05, w.z0, w.z0 + fw, MATS.frame); fb(w.s0, w.s1, oF - 0.05, oF + 0.05, w.z1 - fw, w.z1, MATS.frame);
  fb(w.s0 - 0.02, w.s1 + 0.02, -0.06, oF - 0.05, w.z0 - 0.03, w.z0, MATS.sill, {});                 // window board (inside)
  fb(w.s0, w.s1, oF + 0.05, T + 0.05, w.z0 - 0.04, w.z0 - 0.01, MATS.zinc, {});                     // sill (outside)
  // radiator below
  const rl = Math.min(W * 0.9, 1.6), rc = (w.s0 + w.s1) / 2;
  for (let k = 0; k < Math.floor(rl / 0.05); k++) fb(rc - rl / 2 + k * 0.05, rc - rl / 2 + k * 0.05 + 0.035, -0.11, -0.04, FZ + 0.16, FZ + 0.66, MATS.radiator, {});
  fb(rc - rl / 2, rc + rl / 2, -0.11, -0.04, FZ + 0.66, FZ + 0.68, MATS.radiator, {});
  // sashes (openable, built as groups in 06-interact)
  w.frameW = fw; w.oF = oF; w.at = at;
}

// ---- door frames (casings) for the interior doors and the front door
MATS.casing = std({ color: 0xf6f5f2, roughness: 0.4 });
function doorCasing(x, y0, y1, thick, z1 = FZ + 2.06, alongY = true) {
  // a door in a wall that runs along plan y (x = wall centre), spanning y0..y1
  const c = 0.06 * PXM;
  if (alongY) {
    planBox(x - thick / 2 - 2, y0 - c, x + thick / 2 + 2, y0, FZ, z1 + 0.06, MATS.casing, WALLF);
    planBox(x - thick / 2 - 2, y1, x + thick / 2 + 2, y1 + c, FZ, z1 + 0.06, MATS.casing, WALLF);
    planBox(x - thick / 2 - 2, y0 - c, x + thick / 2 + 2, y1 + c, z1, z1 + 0.06, MATS.casing, WALLF);
  }
}
doorCasing(448, 992, 1111, 16);
doorCasing(644, 1284, 1402, 16);
doorCasing(258, 1291, 1428, 22, FZ + 2.1);

// ============================================================ the stairwell we share with the flats above (entered from the courtyard)
// Not on the broker's plan: built to fit between our front door and the red courtyard door at the inner corner of the block.
// A straight flight up along the back wall, rising away from our door; mailboxes by the courtyard door.
MATS.terrazzo = std({ map: canvasTex(512, 512, (g, W) => { const r = rng(61); g.fillStyle = '#9a968f'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 2600; i++) { const v = 90 + r() * 110; g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; const s = 1 + r() * 3.5; g.fillRect(r() * W, r() * W, s, s); } }, [1, 1]), roughness: 0.35 });
MATS.stairwall = std({ color: 0xe2ddd2, roughness: 0.85 });
MATS.stairdado = std({ color: 0x7d8e7f, roughness: 0.5 });
MATS.riser = std({ color: 0x5f5c58, roughness: 0.6 });
MATS.handrail = std({ color: 0x8a6a46, roughness: 0.5 });
// Rebuilt from Gianluca's photo of the hall: a corridor of light-blue tiles (floor with navy border stripes, a subway-tile
// dado, cream plaster above, an acoustic-tile ceiling with round lamps). Our oak door at the end; on the left the lift and
// the opening to the stairs (one flight down to the cellar, one up); a neighbour's oak door on the left at the near end;
// the courtyard door, mailboxes and a radiator on the right. The up stair is a dog-leg in a core behind the left wall and
// arrives on a first-floor landing above our end of the corridor, with the upstairs door. Nothing further up is built.
const STAIR = { x0: -800, x1: 247, y0: 1262, y1: 1665 };
const S2 = FZ + 2 * STOREY, CEIL = FZ + 2.55;
MATS.stairwall = std({ color: 0xeee6d6, roughness: 0.85 });
MATS.hallFloor = std({ map: canvasTex(512, 512, (g, W) => { const r = rng(71), tw = W / 4, th = W / 8; g.fillStyle = '#7d8a99'; g.fillRect(0, 0, W, W);
  for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) { const v = 0.94 + r() * 0.1, x = i * tw + (j % 2) * tw / 2; g.fillStyle = `rgb(${[156, 190, 226].map((c) => Math.round(c * v))})`; g.fillRect(x + 2, j * th + 2, tw - 4, th - 4); } }, [0.96, 0.96]), roughness: 0.35 });
MATS.hallTile = std({ map: canvasTex(512, 512, (g, W) => { const r = rng(73), tw = W / 4, th = W / 9; g.fillStyle = '#dfe6ee'; g.fillRect(0, 0, W, W);
  for (let j = 0; j < 9; j++) for (let i = -1; i < 5; i++) { const v = 0.93 + r() * 0.12, x = i * tw + (j % 2) * tw / 2; g.fillStyle = `rgb(${[138, 172, 212].map((c) => Math.round(c * v))})`; g.fillRect(x + 3, j * th + 3, tw - 6, th - 6); } }, [0.96, 0.96]), roughness: 0.18 });
MATS.navyStripe = std({ color: 0x1d2a4a, roughness: 0.3 });
MATS.acoustic = std({ map: canvasTex(512, 512, (g, W) => { const r = rng(79); g.fillStyle = '#efece6'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 9000; i++) { const v = 150 + r() * 90; g.fillStyle = `rgba(${v},${v - 4},${v - 8},.45)`; g.fillRect(r() * W, r() * W, 1.6, 1.6); }
  g.fillStyle = '#c9c5bd'; g.fillRect(0, 0, W, 4); g.fillRect(0, 0, 4, W); }, [0.6, 0.6]), roughness: 0.95 });
// floors: corridor and the courtyard threshold
planPoly([[STAIR.x0, STAIR.y0], [STAIR.x1, STAIR.y0], [STAIR.x1, STAIR.y1], [STAIR.x0, STAIR.y1]], FZ, MATS.hallFloor, FLOORF);
planPoly([[-600, 1660], [-470, 1660], [-470, 1690], [-600, 1690]], FZ + 0.003, MATS.hallFloor, FLOORF);
// The stair opening is in the left wall at x -300..0; the flights run straight away from the corridor (you step onto them
// from the hall): the up flight on the right of the opening, the cellar flight on the left, under the second up flight.
const OPEN = { x0: -300, x1: 0 };
// navy border stripes in the floor, ~20 cm in from the walls, jogging round the stair opening
for (const [x0, y0, x1, y1] of [[-770, 1292, -315, 1307], [15, 1292, 225, 1307], [-330, 1262, -315, 1307], [15, 1262, 30, 1307], [-770, 1620, 225, 1635], [-785, 1292, -770, 1635], [210, 1307, 225, 1620]])
  planBox(x0, y0, x1, y1, FZ, FZ + 0.004, MATS.navyStripe, { noShadow: true });
// walls of the corridor
planBox(-815, 1247, OPEN.x0, 1262, FZ, S2, MATS.stairwall, WALLF);             // left wall up to the stair opening
planBox(OPEN.x0, 1247, OPEN.x1, 1262, CEIL, FZ + STOREY - 0.2, MATS.stairwall, WALLF);   // lintel over the opening
planBox(OPEN.x1, 1247, 163, 1262, FZ, S2, MATS.stairwall, WALLF);              // left wall from the opening to our end
planBox(-815, 1247, -800, 1685, FZ, S2, MATS.stairwall, WALLF);                 // near end wall
planBox(-800, 1665, -635, 1678, FZ, S2, MATS.stairwall, WALLF);                 // courtyard side, inside the facade
for (const [y0, y1, m] of [[1665, 1680, MATS.stairwall], [1680, 1685, MATS.brick]]) {
  planBox(-635, y0, -600, y1, FZ, S2, m, WALLF);
  planBox(-470, y0, -459, y1, FZ, S2, m, WALLF);
  planBox(-600, y0, -470, y1, FZ + 2.15, S2, m, WALLF);
}
planBox(-459, 1665, 247, 1680, FZ, S2, MATS.stairwall, WALLF);
planBox(-635, 1670, -459, 1687, 0, FZ, MATS.plinth, WALLF);
planBox(247, 1544, 269, 1665, FZ, FZ + STOREY, MATS.stairwall, WALLF);
planBox(163, 1257, 247, 1262, FZ, FZ + STOREY - 0.2, MATS.stairwall, WALLF);
planBox(245, 1262, 262, 1665, FZ + 2.3, FZ + STOREY, MATS.stairwall, {});      // closes the strip over our door wall
// tiled dado (1.25 m), skipping the doors and openings
const DADO = FZ + 1.25;
for (const [x0, x1] of [[-800, -780], [-650, -560], [-420, OPEN.x0], [OPEN.x1, 245]]) planBox(x0, 1262, x1, 1264, FZ, DADO, MATS.hallTile, {});
for (const [x0, x1] of [[-800, -600], [-470, -205], [-60, 247]]) planBox(x0, 1663, x1, 1665, FZ, DADO, MATS.hallTile, {});
planBox(-800, 1262, -798, 1665, FZ, DADO, MATS.hallTile, {});
for (const [y0, y1] of [[1262, 1291], [1428, 1665]]) planBox(245, y0, 247, y1, FZ, DADO, MATS.hallTile, {});
for (const x of [OPEN.x0, OPEN.x1]) planBox(x - 3, 1250, x + 3, 1264, FZ, CEIL, MATS.hallTile, {});
// acoustic ceiling over the corridor (the first-floor landing's underside covers the part by the stairs)
planPoly([[STAIR.x0, 1262], [-310, 1262], [-310, 1665], [STAIR.x0, 1665]], CEIL, MATS.acoustic, { layer: 'above' }, true);
planPoly([[10, 1262], [247, 1262], [247, 1665], [10, 1665]], CEIL, MATS.acoustic, { layer: 'above' }, true);
// the lift: navy door with a slim window, chrome pull handle, call button; and the neighbour's oak door at the near end
MATS.liftNavy = std({ color: 0x1c2440, roughness: 0.18, metalness: 0.3 });
planBox(-560, 1258, -420, 1263, FZ, FZ + 2.12, MATS.liftNavy, WALLF);
planBox(-470, 1263, -455, 1264, FZ + 1.2, FZ + 1.9, MATS.darkglass || MATS.glass); planBox(-474, 1263, -451, 1265, FZ + 1.18, FZ + 1.2, MATS.white); planBox(-474, 1263, -451, 1265, FZ + 1.9, FZ + 1.92, MATS.white);
planBox(-474, 1263, -472, 1265, FZ + 1.18, FZ + 1.92, MATS.white); planBox(-453, 1263, -451, 1265, FZ + 1.18, FZ + 1.92, MATS.white);
planBox(-498, 1263, -494, 1272, FZ + 0.9, FZ + 1.25, MATS.steel); planBox(-406, 1262, -398, 1264, FZ + 1.0, FZ + 1.14, MATS.steel);
planBox(-566, 1262, -414, 1265, FZ + 2.12, FZ + 2.17, MATS.liftNavy);
const oakDoor = std({ color: 0xc08a50, roughness: 0.45 });
// an oak flat door: in the left wall (side +1: faces +y) or the right wall (side -1: faces -y), x0..x1, at floor level z
function flatDoor(x0, x1, side, z = FZ) {
  const yw = side > 0 ? 1262 : 1665, d = side > 0 ? 1 : -1, yi = (o) => yw + d * o;
  const box = (a, b, o0, o1, z0, z1, m, f = {}) => planBox(a, Math.min(yi(o0), yi(o1)), b, Math.max(yi(o0), yi(o1)), z0, z1, m, f);
  box(x0, x1, -4, 0, z, z + 2.05, oakDoor, WALLF);
  box(x0 - 10, x0, 0, 4, z, z + 2.11, MATS.casing); box(x1, x1 + 10, 0, 4, z, z + 2.11, MATS.casing); box(x0 - 10, x1 + 10, 0, 4, z + 2.05, z + 2.11, MATS.casing);
  box(x1 - 18, x1 - 13, 0, 10, z + 0.98, z + 1.0, MATS.steel); box(x0 + 45, x1 - 45, 0, 1, z + 1.45, z + 1.5, MATS.white);
}
flatDoor(-780, -650, 1);          // near end, left (not in the photo)
flatDoor(-195, -70, -1);          // right wall, opposite the stairs
// the post boxes, on the right wall by our end of the corridor (two grey name panels over white mail boxes) and a radiator
MATS.mailbox = std({ color: 0x8c9196, roughness: 0.4, metalness: 0.5 });
for (const [x0, x1] of [[-40, 80], [95, 205]]) {
  planBox(x0, 1652, x1, 1663, FZ + 1.42, FZ + 1.84, MATS.mailbox, WALLF);
  for (let k = 0; k < 4; k++) planBox(x0 + 6, 1650, x1 - 6, 1652, FZ + 1.47 + k * 0.09, FZ + 1.49 + k * 0.09, std({ color: 0xe8e8e4, roughness: 0.5 }));
  planBox(x0 - 4, 1638, x1 + 4, 1663, FZ + 0.98, FZ + 1.36, MATS.white, WALLF);
  planBox((x0 + x1) / 2 - 25, 1637, (x0 + x1) / 2 + 25, 1638, FZ + 1.12, FZ + 1.3, std({ color: 0xd9dcdf, roughness: 0.4 }));
}
for (let k = 0; k < 20; k++) planBox(-420 + k * 9, 1650, -414 + k * 9, 1662, FZ + 0.18, FZ + 0.75, MATS.radiator || MATS.white, {});
planBox(150, 1305, 240, 1415, FZ, FZ + 0.012, std({ color: 0x3a3836, roughness: 1 }), {});   // doormat at our door
// ---- the stair core behind the left wall: 16 risers of 17.5 cm in two flights of 8 with a half landing, 26 cm treads
const CORE = { x0: -310, x1: 0, y0: 820, y1: 1262 };
const FLIGHT = { run: 0.26 * PXM, rise: STOREY / 16 };
{
  const { run, rise } = FLIGHT, STEP = { floor: true }, YH = 1262 - 7 * run, XM = -150;   // YH: where the half landing starts; XM: between the flights
  for (const [x0, y0, x1, y1] of [[CORE.x0 - 15, CORE.y0 - 15, CORE.x0, 1262], [CORE.x1, CORE.y0 - 15, CORE.x1 + 11, 1262], [CORE.x0 - 15, CORE.y0 - 15, CORE.x1 + 11, CORE.y0]])
    planBox(x0, y0, x1, y1, FZ - 1.6, S2, MATS.stairwall, WALLF);
  // up flight 1 (right of the opening): straight in from the corridor, away from it
  for (let i = 0; i < 7; i++) {
    const y1 = 1262 - i * run, y0 = 1262 - (i + 1) * run, zt = FZ + (i + 1) * rise;
    planBox(XM, y0, CORE.x1, y1, FZ - 0.02, zt - 0.04, MATS.stairwall, STEP);
    planBox(XM, y0, CORE.x1, y1 + 3, zt - 0.04, zt, MATS.terrazzo, STEP);
  }
  // half landing at the back of the core
  planBox(CORE.x0, CORE.y0, CORE.x1, YH, FZ - 1.6, FZ + 8 * rise - 0.04, MATS.stairwall, STEP);
  planBox(CORE.x0, CORE.y0, CORE.x1, YH, FZ + 8 * rise - 0.04, FZ + 8 * rise, MATS.terrazzo, STEP);
  // up flight 2 (left), back towards the corridor, over the cellar flight
  for (let j = 0; j < 7; j++) {
    const y0 = YH + j * run, y1 = YH + (j + 1) * run, zt = FZ + 8 * rise + (j + 1) * rise;
    planBox(CORE.x0, y0, XM, y1, zt - rise - 0.08, zt - 0.04, MATS.stairwall, STEP);
    planBox(CORE.x0, y0 - 3, XM, y1, zt - 0.04, zt, MATS.terrazzo, STEP);
  }
  // down to the cellar (left of the opening): six steps, then it turns out of sight behind a wall
  for (let k = 0; k < 6; k++) {
    const y1 = 1262 - k * run, y0 = 1262 - (k + 1) * run, zt = FZ - (k + 1) * rise;
    planBox(CORE.x0, y0, XM, y1, FZ - 1.6, zt - 0.04, MATS.stairwall, STEP);
    planBox(CORE.x0, y0, XM, y1 + 3, zt - 0.04, zt, MATS.terrazzo, STEP);
  }
  planBox(CORE.x0, 1262 - 6 * run - 18, XM, 1262 - 6 * run, FZ - 1.6, FZ + 8 * rise - 0.3, MATS.stairwall, WALLF);
  // black steel mesh balustrade between the up flight and the cellar flight, its top following flight 1 (as in the photo)
  MATS.mesh = std({ map: canvasTex(128, 128, (g, S) => { g.clearRect(0, 0, S, S); g.strokeStyle = '#141414'; g.lineWidth = 5; for (let k = -S; k < 2 * S; k += S / 4) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke(); g.beginPath(); g.moveTo(k + S, 0); g.lineTo(k, S); g.stroke(); } }, [0.12, 0.12]), alphaTest: 0.5, roughness: 0.6, side: THREE.DoubleSide });
  { const a = P(XM, 1262), b = P(XM, YH), za0 = FZ - 1.1, za1 = FZ + 0.95, zb0 = FZ - 1.1, zb1 = FZ + 7 * rise + 0.95;
    const pos = [a[0], za0, -a[1], b[0], zb0, -b[1], b[0], zb1, -b[1], a[0], za0, -a[1], b[0], zb1, -b[1], a[0], za1, -a[1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), uv = [0, 0, L, 0, L, zb1 - zb0, 0, 0, L, zb1 - zb0, 0, za1 - za0];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    addStatic(g, MATS.mesh, WALLF);
    for (const [y, k] of [[1262, 0], [(YH + 1262) / 2, 3.5], [YH, 7]]) planBox(XM - 2, y - 2, XM + 2, y + 2, FZ - 1.1, FZ + k * rise + 0.97, MATS.matblack, {}); }
  const slopeRail = (ya, yb, za, zb, x, mat = MATS.matblack) => {
    const r0 = P(x, ya), r1 = P(x, yb), L = Math.hypot(r1[0] - r0[0], r1[1] - r0[1], zb - za);
    const g = new THREE.CylinderGeometry(0.016, 0.016, L, 10);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(r1[0] - r0[0], zb - za, -(r1[1] - r0[1])).normalize()));
    g.translate((r0[0] + r1[0]) / 2, (za + zb) / 2, -(r0[1] + r1[1]) / 2); addStatic(g, mat, {});
  };
  slopeRail(1262, YH, FZ + 0.97, FZ + 7 * rise + 0.97, XM);
  slopeRail(YH, 1262, FZ + 8 * rise + 0.95, FZ + STOREY + 0.95, XM - 3);
  slopeRail(1262, YH, FZ + 0.95, FZ + 7 * rise + 0.95, CORE.x1 - 6);
  slopeRail(1262, 1262 - 6 * run, FZ + 0.95, FZ - 6 * rise + 0.95, CORE.x0 + 6);
  // first-floor landing over the corridor in front of the stairs, the upstairs flat door, a railing over flight 1
  const LX = [-310, 10];
  planBox(LX[0], 1262, LX[1], 1665, CEIL, FZ + STOREY - 0.04, MATS.concrete, {});
  planBox(LX[0], 1262, LX[1], 1665, FZ + STOREY - 0.04, FZ + STOREY, MATS.hallFloor, { floor: true, noShadow: true });
  planPoly([[LX[0], 1262], [LX[1], 1262], [LX[1], 1665], [LX[0], 1665]], CEIL - 0.002, MATS.acoustic, {}, true);
  for (const x of LX) planBox(x - (x < 0 ? 14 : 0), 1262, x + (x < 0 ? 0 : 14), 1665, CEIL, S2, MATS.stairwall, { ...WALLF, layer: 'above' });
  for (let x = XM + 6; x <= CORE.x1 - 4; x += 22) planBox(x - 2, 1260, x + 2, 1264, FZ + STOREY, FZ + STOREY + 0.92, MATS.matblack, {});
  planBox(XM, 1258, CORE.x1, 1266, FZ + STOREY + 0.92, FZ + STOREY + 0.96, MATS.matblack, WALLF);
  planBox(XM, 1258, CORE.x1, 1266, FZ + STOREY, FZ + STOREY + 0.9, std({ visible: false }), WALLF);
  flatDoor(-200, -70, -1, FZ + STOREY);
  planBox(-200, 1590, -70, 1655, FZ + STOREY, FZ + STOREY + 0.012, std({ color: 0x45403a, roughness: 1 }), {});
  // ceilings over the core and the landing
  planPoly([[CORE.x0, CORE.y0], [CORE.x1, CORE.y0], [CORE.x1, 1262], [CORE.x0, 1262]], S2 - 0.05, MATS.acoustic, { layer: 'above' }, true);
  planPoly([[LX[0], 1262], [LX[1], 1262], [LX[1], 1665], [LX[0], 1665]], S2 - 0.05, MATS.acoustic, { layer: 'above' }, true);
  planBox(-290, CORE.y0, -170, CORE.y0 + 2, FZ + 1.9, FZ + 3.6, std({ color: 0xf4f6f6, emissive: 0xdfe8ee, emissiveIntensity: 0.25, roughness: 0.3 }));
}
