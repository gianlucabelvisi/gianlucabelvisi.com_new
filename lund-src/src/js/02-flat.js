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
  { id: 'stair', sv: 'Trapphus', en: 'Stairwell', poly: [[-620, 1262], [247, 1262], [247, 1665], [-620, 1665]] },
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
const STAIR = { x0: -620, x1: 247, y0: 1262, y1: 1665 };
planPoly([[STAIR.x0, STAIR.y0], [STAIR.x1, STAIR.y0], [STAIR.x1, STAIR.y1], [STAIR.x0, STAIR.y1]], FZ, MATS.terrazzo, FLOORF);
planBox(-635, 1247, 163, 1262, FZ, FZ + 2 * STOREY, MATS.stairwall, WALLF);        // back wall (neighbour flat)
planBox(-635, 1247, -620, 1685, FZ, FZ + 2 * STOREY, MATS.stairwall, WALLF);       // end wall
// courtyard wall with the red door (x -600..-470): plaster inside, brick outside, on the courtyard facade line (plan y 1685)
for (const [y0, y1, m] of [[1665, 1670, MATS.stairwall], [1670, 1685, MATS.brick]]) {
  planBox(-635, y0, -600, y1, FZ, FZ + 2 * STOREY, m, WALLF);
  planBox(-470, y0, -459, y1, FZ, FZ + 2 * STOREY, m, WALLF);
  planBox(-600, y0, -470, y1, FZ + 2.15, FZ + 2 * STOREY, m, WALLF);
}
planBox(-459, 1665, 247, 1680, FZ, FZ + 2 * STOREY, MATS.stairwall, WALLF);
planBox(-635, 1670, -459, 1687, 0, FZ, MATS.plinth, WALLF);
planPoly([[-600, 1660], [-470, 1660], [-470, 1690], [-600, 1690]], FZ + 0.003, MATS.terrazzo, FLOORF);   // threshold, level with the courtyard
planBox(247, 1544, 269, 1665, FZ, FZ + STOREY, MATS.stairwall, WALLF);
planBox(163, 1257, 247, 1262, FZ, FZ + 2 * STOREY, MATS.stairwall, WALLF);
// dado band
for (const [x0, y0, x1, y1] of [[-620, 1262, 163, 1266], [-620, 1661, 247, 1665]]) planBox(x0, y0, x1, y1, FZ, FZ + 1.1, MATS.stairdado);
// the flight: 16 risers of 17.5 cm, 26 cm treads, from beside our door (bottom) up towards the end wall
const FLIGHT = { n: 16, run: 0.26 * PXM, xb: 140, y0: 1262, y1: 1412 };
{
  const { n, run, xb, y0, y1 } = FLIGHT, rise = STOREY / n;
  for (let i = 0; i < n; i++) {
    const xa = xb - (i + 1) * run, xc = xb - i * run, zt = FZ + (i + 1) * rise;
    planBox(xa, y0, xc, y1, zt - 0.045, zt, MATS.terrazzo, { floor: false, collide: false });                    // tread
    planBox(xc - 3, y0, xc, y1, zt - rise, zt - 0.045, MATS.riser, {});                                           // riser
  }
  // closed underneath (a cupboard under the stairs), painted like the walls
  for (let i = 0; i < n; i++) { const xa = xb - (i + 1) * run, xc = xb - i * run; planBox(xa, y0, xc, y1 - 2, FZ, FZ + (i + 1) * rise - 0.045, MATS.stairwall, WALLF); }
  // a smooth painted side panel under the flight on the corridor side (floor to the tread line)
  { const a = P(xb, y1 + 0.5), b2 = P(xb - n * run, y1 + 0.5), za = FZ + rise - 0.05, zb = FZ + STOREY - 0.05;
    const pos = [a[0], FZ, -a[1], b2[0], FZ, -b2[1], b2[0], zb, -b2[1], a[0], FZ, -a[1], b2[0], zb, -b2[1], a[0], za, -a[1]];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); worldUV(g);
    addStatic(g, std({ color: 0xe2ddd2, roughness: 0.85, side: THREE.DoubleSide }), {}); }
  planBox(233, 1262, 247, 1665, FZ + STOREY - 0.2, FZ + 2 * STOREY, MATS.stairwall, { layer: 'above' });   // end of the stair void on our side
  // the floor-1 wall above the flight's open side (closes the stair void)
  planBox(xb - n * run, y1, 247, y1 + 3, FZ + STOREY - 0.2, FZ + 2 * STOREY, MATS.stairwall, { layer: 'above' });
  // balustrade: square steel posts + oak handrail along the open side
  for (let i = 0; i <= n; i += 2) { const x = xb - i * run - run / 2; planBox(x - 2, y1 - 3, x + 2, y1 + 1, FZ + (i + 1) * rise, FZ + (i + 1) * rise + 0.9, MATS.steel); }
  const r0 = P(xb, y1 - 1), r1 = P(xb - n * run, y1 - 1);
  const rail = new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(r1[0] - r0[0], r1[1] - r0[1], STOREY), 10);
  const dir = new THREE.Vector3(r1[0] - r0[0], STOREY, -(r1[1] - r0[1])).normalize();
  rail.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  rail.translate((r0[0] + r1[0]) / 2, FZ + rise + 0.9 + STOREY / 2, -(r0[1] + r1[1]) / 2);
  addStatic(rail, MATS.handrail, {});
  // landing on the first floor at the top (x -620..-276), seen through the stair void; ceiling over the rest
  planBox(-620, 1262, xb - n * run, 1665, FZ + STOREY - 0.2, FZ + STOREY, MATS.concrete, { layer: 'above' });
  planPoly([[-620, 1262], [xb - n * run, 1262], [xb - n * run, 1665], [-620, 1665]], FZ + STOREY - 0.2, MATS.ceiling, { layer: 'above' }, true);
  planPoly([[xb - n * run, y1], [247, y1], [247, 1665], [xb - n * run, 1665]], FZ + STOREY - 0.05, MATS.ceiling, { layer: 'above' }, true);
  planPoly([[xb, y0], [247, y0], [247, y1], [xb, y1]], FZ + STOREY - 0.05, MATS.ceiling, { layer: 'above' }, true);
  // the next flight up (floor 1 → 2) above, rising back towards our end
  for (let i = 0; i < n; i++) { const xa = xb - n * run + i * run; planBox(xa, y0, xa + run, y1, FZ + STOREY + (i + 1) * rise - 0.2, FZ + STOREY + (i + 1) * rise, MATS.terrazzo, { layer: 'above' }); }
  planPoly([[xb - n * run, y0], [247, y0], [247, 1665], [xb - n * run, 1665]], FZ + 2 * STOREY - 0.05, MATS.ceiling, { layer: 'above' }, true);
}
// mailboxes beside the courtyard door, a doormat and a name plate at our door
MATS.mailbox = std({ color: 0x5e6b62, roughness: 0.5, metalness: 0.4 });
planBox(-430, 1650, -250, 1665, FZ + 0.95, FZ + 1.55, MATS.mailbox, WALLF);
planBox(150, 1305, 240, 1415, FZ, FZ + 0.012, std({ color: 0x3a3836, roughness: 1 }), {});
