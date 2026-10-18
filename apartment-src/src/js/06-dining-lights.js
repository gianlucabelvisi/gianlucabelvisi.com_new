// ------------------------------------------------------------ dining: table + chairs, moved and rotated as one group
// Table and chair candidates are separate lists, so each can be swapped independently (sizes, finishes, colours).
const ILVA = (p) => `https://ilva.dk/${p}/`;
const TABLE_MODELS = [
  { brand: 'ILVA', name: 'Besalu', maker: 'Hammel Furniture', url: ILVA('spisestuen/spiseborde/besalu/top-i-egemelamin/p-1085382-5643266318'),
    configs: [   // round top that pulls apart for leaves; with leaves it becomes a stadium (round ends)
      // prices from ilva.dk (Sept 2026); urls per finish: [egemelamin, hvid melamin]
      { name: 'Ø105 cm · 3.749 kr (før 4.999)', D: 1.05, L: 1.05, H: 0.75, leaves: 0, seats: 4,
        urls: [ILVA('spisestuen/spiseborde/besalu/top-i-egemelamin/p-1085382-5643266318'), ILVA('spisestuen/spiseborde/besalu/hvid-melamin/p-1085382-5643266317')] },
      { name: 'Ø105 + 1 tillægsplade 60 cm (165 × 105) · 3.749 + 899 kr', D: 1.05, L: 1.65, H: 0.75, leaves: 1, seats: 6,
        urls: [ILVA('spisestuen/tillaegsplader/besalu/top-i-egemelamin/p-1085383-5643267829'), ILVA('spisestuen/tillaegsplader/besalu/top-i-egemelamin/p-1085383-5643267829')] },
      { name: 'Ø130 cm · 5.999 kr', D: 1.30, L: 1.30, H: 0.76, leaves: 0, seats: 5,
        urls: [ILVA('spisestuen/spiseborde/besalu/p-b0036722-5637671827'), ILVA('spisestuen/spiseborde/besalu/p-b0036721-5637671826')] },
      { name: 'Ø130 + 1 tillægsplade (179 × 130)', D: 1.30, L: 1.79, H: 0.76, leaves: 1, seats: 7,
        urls: [ILVA('spisestuen/spiseborde/besalu/p-b0090924-5637890076'), ILVA('spisestuen/spiseborde/besalu/p-b0036721-5637671826')] },
      { name: 'Ø130 + 2 tillægsplader (228 × 130) · 7.898 kr', D: 1.30, L: 2.28, H: 0.76, leaves: 2, seats: 9,
        urls: [ILVA('spisestuen/spiseborde/besalu/p-b0090924-5637890076'), ILVA('spisestuen/spiseborde/besalu/p-b0036721-5637671826')] },
    ],
    finishes: [
      { name: 'Top i egemelamin · ben i hvidolieret massiv eg', top: 0xd8c29f, edge: 0xcfb58c, legs: 0xe2d3b8 },
      { name: 'Hvid melamin · kant i hvidpigmenteret eg · hvidolierede ben', top: 0xf1efe9, edge: 0xe6dccb, legs: 0xe2d3b8 },
    ] },
  { brand: 'Homitis', name: 'Viona', maker: 'Homeroom', url: 'https://www.homeroom.dk/homitis/spisebord-med-udtraek-viona/2296144-05', roundLegs: true,
    // homeroom.dk (Oct 2026): Ø100 × 75, pulls out to 131 × 100 with one 31 cm leaf; 18 mm melamine top, wooden legs; 3.079 kr (før 4.399), all colours
    configs: [
      { name: 'Ø100 cm · 3.079 kr (før 4.399)', D: 1.00, L: 1.00, H: 0.75, leaves: 0, seats: 4, urls: [1, 2, 3, 4, 5].map((k) => `https://www.homeroom.dk/homitis/spisebord-med-udtraek-viona/2296144-0${k}`) },
      { name: 'Udtrukket 131 × 100 cm (1 plade, 31 cm)', D: 1.00, L: 1.31, H: 0.75, leaves: 1, seats: 6, urls: [1, 2, 3, 4, 5].map((k) => `https://www.homeroom.dk/homitis/spisebord-med-udtraek-viona/2296144-0${k}`) },
    ],
    finishes: [
      { name: 'Atlantisk fyrretræ', top: 0xb98a5a, edge: 0xa77a4d, legs: 0xb08355, grain: true },
      { name: 'Kafkas eg', top: 0xa07a55, edge: 0x8f6b48, legs: 0x9a7450, grain: true },
      { name: 'Travertin / valnød', top: 0xded5c6, edge: 0xcfc4b3, legs: 0x6a4a34, stone: true },
      { name: 'Barok valnød', top: 0x6e4c36, edge: 0x5f402d, legs: 0x684731, grain: true },
      { name: 'Travertin / eg', top: 0xdccbbb, edge: 0xcdbcab, legs: 0xdcc8ad, stone: true },
    ] },
];
const CHAIR_MODELS = [
  // ilva.dk (checked 2026-10-05): L 48 × D 54.5 × H 80 cm, seat 45 cm, 5 kg, matlakeret massiv eg + papirflet, 2.099 kr (før 3.499)
  { brand: 'ILVA', name: 'Kasami', style: 'kasami', url: ILVA('spisestuen/spisebordsstole/kasami/saede-i-naturfarvet-papirflet/p-1086846-5643326834'), W: 0.48, D: 0.545, H: 0.80, SH: 0.45,
    variants: [   // massiv eg, matlakeret; sæde + ryg i papirflet · 2.099 kr (før 3.499)
      { name: 'Natur eg · natur papirflet · 2.099 kr', seat: 0xc2a06c, rough: 0.95, legs: 0xb98c5c, url: ILVA('spisestuen/spisebordsstole/kasami/saede-i-naturfarvet-papirflet/p-1086846-5643326834') },
      { name: 'Espresso eg · natur papirflet · 2.099 kr', seat: 0xc2a06c, rough: 0.95, legs: 0x3a2e26, url: ILVA('spisestuen/spisebordsstole/kasami/saede-i-naturfarvet-papirflet/p-1086846-5643326835') },
    ] },
];
MATS.tTop = std({ color: 0xd8c29f, roughness: 0.55 }); MATS.tEdge = std({ color: 0xcfb58c, roughness: 0.6 }); MATS.tLegs = std({ color: 0xe2d3b8, roughness: 0.6 });
MATS.cSeat = std({ color: 0x958777, roughness: 1, side: THREE.DoubleSide }); MATS.cLegs = std({ color: 0xc9a473, roughness: 0.5 });
MATS.seam = std({ color: 0x8a7658, roughness: 0.8 });
const dining = { t: 0, tc: 0, tf: 1, c: 0, cv: 0, n: 4, out: false, angle: 0, O: null, group: null, parts: [] };
const diningDims = new THREE.Group(); dimsGroup.add(diningDims);
function dFrame() { const a = dining.angle; return { x: new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), z: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)) }; }
function chairSpots() {
  // chair centres (local x along the table's length) and the direction each chair faces
  const T = TABLE_MODELS[dining.t].configs[dining.tc], C = CHAIR_MODELS[dining.c], r = T.D / 2, s = (T.L - T.D) / 2, n = dining.n;
  // tucked (default): slid under until the back band clears the table edge, or (round table) until neighbouring chairs would touch;
  // in use: the chair back 60 cm from the table edge, the usual space for someone sitting there
  const backFront = (C.D - 0.03) / 2 - 0.011;                 // chair origin → front face of the back band
  const tucked = Math.max(r + 0.015 - backFront, (s < 0.01 ? C.W / 2 + 0.015 : 0.02) + C.D / 2);
  const off = dining.out ? r + 0.6 - C.D / 2 : tucked;
  const spots = [];
  if (s < 0.01) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; spots.push([Math.cos(a) * off, Math.sin(a) * off, a + Math.PI]); } }
  else {
    const ends = n >= 2 ? [[s + off, 0, Math.PI], [-(s + off), 0, 0]] : [];
    const side = Math.max(0, n - 2), perSide = Math.ceil(side / 2);
    const xs = perSide <= 1 ? [0] : Array.from({ length: perSide }, (_, i) => -s + (2 * s) * (i + 0.5) / perSide);
    spots.push(...ends);
    for (let i = 0; i < side; i++) { const sgn = i % 2 ? -1 : 1, x = xs[Math.floor(i / 2)] ?? 0; spots.push([x, sgn * off, sgn > 0 ? -Math.PI / 2 : Math.PI / 2]); }
  }
  return spots;
}
function diningExtent() {
  // half-size of the whole set along local x / z (chairs pulled in)
  const T = TABLE_MODELS[dining.t].configs[dining.tc], C = CHAIR_MODELS[dining.c];
  let hx = T.L / 2, hz = T.D / 2;
  for (const [x, z] of chairSpots()) { hx = Math.max(hx, Math.abs(x) + C.D / 2); hz = Math.max(hz, Math.abs(z) + C.D / 2); }
  return { hx, hz };
}
function diningSupport(ct, st) {
  // how far the set reaches from its centre in local direction (ct, st): the table's stadium outline or a chair box, whichever is further
  const T = TABLE_MODELS[dining.t].configs[dining.tc], C = CHAIR_MODELS[dining.c];
  let need = (T.L - T.D) / 2 * Math.abs(ct) + T.D / 2;
  for (const [cx, cz, face] of chairSpots()) {
    const fx = Math.cos(face), fz = Math.sin(face);
    need = Math.max(need, cx * ct + cz * st + (C.D / 2) * Math.abs(fx * ct + fz * st) + (C.W / 2) * Math.abs(-fz * ct + fx * st));
  }
  return need;
}
function diningClear(O, angle) {
  const a = angle, fx = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), fz = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
  let worst = 9;
  const from = O.clone().setY(0.3);
  for (let k = 0; k < 24; k++) {
    const t = (k / 24) * Math.PI * 2, d = fx.clone().multiplyScalar(Math.cos(t)).addScaledVector(fz, Math.sin(t));
    worst = Math.min(worst, (gapTo(from, d, 6) ?? 6) - diningSupport(Math.cos(t), Math.sin(t)));
  }
  return worst;
}
function applyDiningMats() {
  const F = TABLE_MODELS[dining.t].finishes[dining.tf], V = CHAIR_MODELS[dining.c].variants[dining.cv];
  MATS.tTop.color.setHex(F.top); MATS.tEdge.color.setHex(F.edge); MATS.tLegs.color.setHex(F.legs);
  { const m = F.stone ? stoneTex() : F.grain ? grainTex() : null; if (MATS.tTop.map !== m) { MATS.tTop.map = m; MATS.tTop.needsUpdate = true; } }
  MATS.cSeat.color.setHex(V.seat); MATS.cSeat.roughness = V.rough; MATS.cLegs.color.setHex(V.legs);
  const cord = CHAIR_MODELS[dining.c].style === 'kasami' ? cordTex() : null;
  if (MATS.cSeat.map !== cord) { MATS.cSeat.map = cord; MATS.cSeat.needsUpdate = true; }
}
let _stoneTex = null, _grainTex = null;
function stoneTex() {                                   // travertine: warm beige with soft horizontal bands and small pits
  return (_stoneTex ||= canvasTex(512, 512, (g, W) => { const r = rng(91); g.fillStyle = '#f4f0ea'; g.fillRect(0, 0, W, W);
    for (let k = 0; k < 70; k++) { const y = r() * W, v = 225 + r() * 25 | 0; g.fillStyle = `rgba(${v},${v - 6},${v - 14},0.5)`; g.fillRect(0, y, W, 1 + r() * 6); }
    for (let k = 0; k < 500; k++) { const v = 190 + r() * 30 | 0; g.fillStyle = `rgba(${v},${v - 8},${v - 16},0.7)`; g.beginPath(); g.ellipse(r() * W, r() * W, 1 + r() * 4, 0.6 + r() * 1.5, 0, 0, 7); g.fill(); }
  }, [0.6, 0.6]));
}
function grainTex() {                                   // neutral wood grain that tints with the finish colour
  return (_grainTex ||= canvasTex(512, 512, (g, W) => { const r = rng(92); g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, W, W);
    grain(g, 0, -20, W, W + 40, r, '120,120,120', 120, 0.12); grain(g, 0, -20, W, W + 40, r, '255,255,255', 40, 0.1); }, [0.8, 0.8]));
}
let _cordTex = null;
function cordTex() {
  // woven paper cord: diagonal over-under twists, tinted by the seat colour
  if (_cordTex) return _cordTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#b9b9b9'; x.fillRect(0, 0, 128, 128);
  for (let r = 0; r < 16; r++) for (let q = 0; q < 16; q++) {
    const hz = (r + q) % 2 === 0, px = q * 8, py = r * 8;
    const g = hz ? x.createLinearGradient(px, py, px, py + 8) : x.createLinearGradient(px, py, px + 8, py);
    g.addColorStop(0, '#9a9a9a'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#8e8e8e'); x.fillStyle = g; x.fillRect(px + 0.4, py + 0.4, 7.2, 7.2);
  }
  _cordTex = new THREE.CanvasTexture(c); _cordTex.wrapS = _cordTex.wrapT = THREE.RepeatWrapping; _cordTex.repeat.set(3, 3); _cordTex.colorSpace = THREE.SRGBColorSpace;
  return _cordTex;
}
function kasamiChair(ch, C, add) {
  // Kasami: square-section oak frame, rear legs rising and bending back into the top rail, woven cord seat and back band
  const w = C.W, d = C.D - 0.03, SH = C.SH, L = 0.032, legs = MATS.cLegs;
  for (const sx of [1, -1]) {
    add(new THREE.BoxGeometry(L, SH - 0.01, L), legs, sx * (w / 2 - L / 2), (SH - 0.01) / 2, d / 2 - L / 2, ch);                  // front legs
    const rl = add(new THREE.BoxGeometry(L, C.H, L), legs, sx * (w / 2 - L / 2), C.H / 2, -(d / 2 - L / 2) - 0.012, ch); rl.rotation.x = -0.05;   // rear legs
    add(new THREE.BoxGeometry(0.02, 0.02, d - L), legs, sx * (w / 2 - L / 2), 0.16, 0, ch);                                     // low side stretchers
    add(new THREE.BoxGeometry(L * 0.9, 0.05, d - L), legs, sx * (w / 2 - L / 2), SH - 0.05, 0, ch);                             // seat side rails
  }
  add(new THREE.BoxGeometry(w - L, 0.05, L * 0.9), legs, 0, SH - 0.05, d / 2 - L / 2, ch);                                      // front rail
  add(new THREE.BoxGeometry(w - L, 0.05, L * 0.9), legs, 0, SH - 0.05, -(d / 2 - L / 2), ch);                                   // back rail
  add(new THREE.BoxGeometry(w - 2 * L + 0.004, 0.018, d - 2 * L + 0.004), MATS.cSeat, 0, SH - 0.03, 0, ch);                      // woven seat
  // curved back: oak top rail + cord band, bowed backwards
  const R = 0.55, span = (w - L) / R, back = -(d / 2) - 0.035;
  const arc = (h, y, mat, t) => { return add(new THREE.CylinderGeometry(R, R, h, 24, 1, true, Math.PI - span / 2, span), mat, 0, y, back + R - t, ch); };
  arc(0.13, C.H - 0.16, MATS.cSeat, 0.0);
  add(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.035, 24, 1, true, Math.PI - span / 2, span), legs, 0, C.H - 0.075, back + R, ch);
  add(new THREE.CylinderGeometry(R - 0.012, R - 0.012, 0.035, 24, 1, true, Math.PI - span / 2, span), legs, 0, C.H - 0.075, back + R, ch);
}
function stadiumShape(L, D) {
  const r = D / 2, s = (L - D) / 2, sh = new THREE.Shape();
  if (s < 0.001) { sh.absarc(0, 0, r, 0, Math.PI * 2, false); return sh; }
  sh.moveTo(-s, -r); sh.lineTo(s, -r); sh.absarc(s, 0, r, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(-s, r); sh.absarc(-s, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return sh;
}
function buildDining(tryPlace) {
  if (!dining.O) dining.O = b2t(2.0, 2.95, 0);          // in front of the kitchen, by the dining-room window
  if (dining.group) { scene.remove(dining.group); dropParts(dining.parts); }
  let moved = true;
  if (tryPlace) {
    const c = tryPlace({ O: dining.O.clone(), angle: dining.angle });
    if (diningClear(c.O, c.angle) > 0.02) { dining.O = c.O; dining.angle = c.angle; } else moved = false;
  } else if (diningClear(dining.O, dining.angle) <= 0.02) {
    let best = null;
    for (let k = 1; k <= 40 && !best; k++) for (const [dx, dz] of [[k, 0], [-k, 0], [0, k], [0, -k], [k, k], [-k, -k], [k, -k], [-k, k]]) {
      const c = dining.O.clone().add(new THREE.Vector3(dx * 0.05, 0, dz * 0.05)); if (diningClear(c, dining.angle) > 0.02) { best = c; break; }
    }
    if (best) dining.O = best;
  }
  applyDiningMats();
  const T = TABLE_MODELS[dining.t].configs[dining.tc], C = CHAIR_MODELS[dining.c];
  const g = new THREE.Group(); g.position.copy(dining.O); g.rotation.y = dining.angle;
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // table: 25 mm top with an oak edge band, slim apron, four tapered splayed oak legs
  const TT = 0.025, sh = stadiumShape(T.L, T.D);
  const top = add(new THREE.ExtrudeGeometry(sh, { depth: TT - 0.004, bevelEnabled: false, curveSegments: 48 }), MATS.tTop, 0, T.H - 0.002, 0); top.rotation.x = Math.PI / 2;
  const band = add(new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false, curveSegments: 48 }), MATS.tEdge, 0, T.H - TT + 0.002, 0); band.rotation.x = Math.PI / 2; band.scale.set(1.004, 1.004, 1);
  const s = (T.L - T.D) / 2;
  for (let i = 0; i < T.leaves + (T.leaves ? 1 : 0); i++) {        // seams where the leaves meet
    const x = T.leaves ? -s + (2 * s) * i / T.leaves : 0; add(new THREE.BoxGeometry(0.003, 0.002, T.D * 0.98), MATS.seam, x, T.H + 0.0005, 0);
  }
  const apR = T.D / 2 - 0.12, legH = T.H - TT;
  add(new THREE.BoxGeometry(T.L - T.D + apR * 1.6, 0.07, apR * 1.6), MATS.tLegs, 0, T.H - TT - 0.035, 0).visible = true;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const lx = sx * (s + apR * 0.62), lz = sz * apR * 0.62;
    const leg = add(new THREE.CylinderGeometry(0.022, 0.016, legH, TABLE_MODELS[dining.t].roundLegs ? 14 : 4), MATS.tLegs, lx + sx * 0.04, legH / 2, lz + sz * 0.04);
    leg.rotation.set(sz * 0.07, Math.PI / 4, -sx * 0.07);
  }
  // chairs (Adler-like): upholstered seat, curved upholstered back band, oak legs, rear legs rising into the back
  for (const [cx, cz, face] of chairSpots()) {
    const ch = new THREE.Group(); ch.position.set(cx, 0, cz); ch.rotation.y = -face + Math.PI / 2; g.add(ch);
    if (C.style === 'kasami') { kasamiChair(ch, C, add); continue; }
    const w = C.W - 0.08, d = C.D - 0.08, sh2 = C.SH;
    add(new THREE.BoxGeometry(w, 0.07, d), MATS.cSeat, 0, sh2 - 0.035, 0, ch);
    add(new THREE.BoxGeometry(w - 0.04, 0.025, d - 0.06), MATS.cLegs, 0, sh2 - 0.085, 0, ch);
    for (const [lx, lz] of [[w / 2 - 0.04, d / 2 - 0.04], [-(w / 2 - 0.04), d / 2 - 0.04]]) {       // front legs (toward the table: +z)
      const l = add(new THREE.CylinderGeometry(0.018, 0.014, sh2 - 0.09, 10), MATS.cLegs, lx, (sh2 - 0.09) / 2, lz, ch); l.rotation.x = 0.05;
    }
    for (const lx of [w / 2 - 0.05, -(w / 2 - 0.05)]) {                                              // rear legs up to the back band
      const l = add(new THREE.CylinderGeometry(0.018, 0.014, C.H - 0.06, 10), MATS.cLegs, lx, (C.H - 0.06) / 2, -(d / 2 - 0.05), ch); l.rotation.x = -0.06;
    }
    const band2 = add(new THREE.TorusGeometry(0.27, 0.03, 8, 28, Math.PI * 1.15), MATS.cSeat, 0, C.H - 0.04, 0.02, ch);
    band2.rotation.set(Math.PI / 2, 0, Math.PI + (Math.PI - Math.PI * 1.15) / 2); band2.scale.set(1, 0.9, 1.6);
  }
  // merge each chair and the table into a few meshes, then one invisible block per piece for walking/clicking
  for (const ch of [...g.children].filter((c) => c.isGroup)) mergeByMaterial(ch);
  mergeByMaterial(g);
  const hit = new THREE.MeshBasicMaterial({ visible: false });
  const parts = [];
  const tb = add(new THREE.BoxGeometry(T.L, T.H + 0.3, T.D), hit, 0, (T.H + 0.3) / 2, 0); tb.castShadow = tb.receiveShadow = false; parts.push(tb);
  for (const [cx, cz, face] of chairSpots()) {
    const b = add(new THREE.BoxGeometry(C.D, C.H + 0.25, C.W), hit, cx, (C.H + 0.25) / 2, cz); b.rotation.y = -face; b.castShadow = b.receiveShadow = false; parts.push(b);
  }
  const door = { kind: 'swap', label: 'Dining', parts, center: dining.O.clone().setY(0.8),
    swap: () => selectFurniture(selected === diningMover ? null : diningMover),
    prompt: () => (selected === diningMover ? 'Done with the table' : 'Move or change the table & chairs') };
  for (const p of parts) { p.userData.door = door; p.userData.furniture = true; collidables.push(p); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Dining'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  scene.add(g); g.updateMatrixWorld(true);
  dining.group = g; dining.parts = parts;
  buildDiningLamp();
  diningDimsUpdate();
  return moved;
}
// ------------------------------------------------------------ Louis Poulsen PH 5 (grey, Ø50 × 26.7 cm) over the dining table
// hangs over the table centre and follows the table; its own panel raises/lowers it 5 cm at a time (shade bottom above the table top)
const PH5 = { D: 0.50, H: 0.267, url: 'https://www.lampemesteren.dk/p/ph-5-500-designer-pendellampe-gra-o-50-cm-louis-poulsen-6090133.html', price: '5,517 kr (was 7,595)' };
const lamp = { h: 0.60, group: null, parts: [] };
// "Hues of grey" PH 5 colours, sampled from the shop photo: warm off-white top shade, mauve-grey main shade, stone lower shade,
// cream bottom cup, dark green-grey cap, pink reflector ring, copper rods; all shades white underneath
const phM = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, ...extra });
MATS.phCap = phM(0x121716, { envMapIntensity: 0.2 }); MATS.phTop = phM(0xc9c3b8, { envMapIntensity: 0.25 }); MATS.phMain = phM(0x4f4448, { envMapIntensity: 0.2 }); MATS.phLow = phM(0x5f594f, { envMapIntensity: 0.2 }); MATS.phCup = phM(0xb9b1a3, { envMapIntensity: 0.25 });   // darker than the swatches: the daylit room lifts mid-tones a lot
MATS.phUnder = phM(0xf6f3ec, { emissive: 0xfff1d6, emissiveIntensity: 0.25 }); MATS.phPink = phM(0xc27f93, { emissive: 0x6a3040, emissiveIntensity: 0.3, envMapIntensity: 0.2 });
MATS.phCopper = new THREE.MeshStandardMaterial({ color: 0xb8683a, roughness: 0.35, metalness: 0.85 });
MATS.phGrey = MATS.phMain;
function lampMaxH() { const T = TABLE_MODELS[dining.t].configs[dining.tc]; return +(2.6 - T.H - PH5.H - 0.12).toFixed(2); }
// ---- room lights: each room's wall switch opens a panel with its lights. Every light is a Philips Hue: on/off, brightness (dimmer)
// and colour — either a white colour temperature (2200–6500 K, White Ambiance range) or any colour (White & Color Ambiance).
// New lights go in LIGHTS with apply(L, rgb, level) that drives their three.js lights and glowing materials.
const LIGHTS = {
  table: { name: 'Table', room: 'living', model: 'PH 5 · Philips Hue White & Color Ambiance E27', on: false, bri: 0.8, ct: 2700, mode: 'ct', color: '#ff8a3d',
    apply: (L, rgb, lv) => {
      tableSpot.color.copy(rgb); tableGlow.color.copy(rgb);
      tableSpot.intensity = 55 * lv; tableGlow.intensity = 1.1 * lv; tableSpot.visible = tableGlow.visible = lv > 0;
      if (MATS.phUnder) { MATS.phUnder.emissive.copy(rgb); MATS.phUnder.emissiveIntensity = 1.2 * lv; MATS.phPink.emissiveIntensity = 0.9 * lv; }
      if (MATS.phBulb) { MATS.phBulb.emissive.copy(rgb); MATS.phBulb.emissiveIntensity = 3.5 * lv; }
    } },
  tvstrip: { name: 'TV strip', room: 'living', model: 'Philips Hue Lightstrip Plus under the TV unit', on: false, bri: 0.6, ct: 2700, mode: 'ct', color: '#ff6a2b',
    apply: (L, rgb, lv) => {
      stripLight.color.copy(rgb); stripLight.intensity = 30 * lv; stripLight.visible = lv > 0;
      stripWash.color.copy(rgb); stripWash.intensity = 0.2 * lv; stripWash.visible = lv > 0;
      MATS.stripLed.emissive.copy(rgb); MATS.stripLed.emissiveIntensity = 2.5 * lv;
    } },
  tvback: { name: 'TV backlight', room: 'living', model: 'Philips Hue Lightstrip Plus behind the top of the TV', on: false, bri: 0.55, ct: 2700, mode: 'ct', color: '#6a7bff',
    apply: (L, rgb, lv) => {
      backLight.color.copy(rgb); backLight.intensity = 14 * lv; backLight.visible = lv > 0;
      backWash.color.copy(rgb); backWash.intensity = 0.2 * lv; backWash.visible = lv > 0;
      MATS.backLed.emissive.copy(rgb); MATS.backLed.emissiveIntensity = 2.5 * lv;
    } },
  kitchen: { name: 'Kitchen spots', room: 'living', model: '5 × Philips Hue White & Color Ambiance spots under the wall cabinets', on: false, bri: 0.85, ct: 3000, mode: 'ct', color: '#ffd9a0',
    apply: (L, rgb, lv) => {
      for (const sp of kitchenSpots) { sp.color.copy(rgb); sp.intensity = 5 * lv; sp.visible = lv > 0; }
      MATS.kSpotLed.emissive.copy(rgb); MATS.kSpotLed.emissiveIntensity = 3 * lv;
    } },
};
// kitchen: 5 round LED spots recessed in the underside of the wall cabinets (3 on the long run, 2 on the short arm), shining down on the worktop
MATS.kSpotLed = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, emissive: 0xfff0d8, emissiveIntensity: 0, roughness: 0.3 });
MATS.kSpotRim = new THREE.MeshStandardMaterial({ color: 0xc9c9c6, roughness: 0.35, metalness: 0.6 });
const kitchenSpots = [];
{
  const UZ0 = 1.46, spotBits = [];      // underside of the wall cabinets (build.py)
  for (const [x, y] of [[1.45, 0.68], [2.35, 0.68], [3.25, 0.68], [4.31, 1.30], [4.31, 2.30]]) {
    const P = b2t(x, y, UZ0);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 24), MATS.kSpotRim); rim.position.copy(P).setY(UZ0 - 0.003); scene.add(rim); spotBits.push(rim);
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.024, 24), MATS.kSpotLed); led.rotation.x = Math.PI / 2; led.position.copy(P).setY(UZ0 - 0.0065); scene.add(led); spotBits.push(led);
    const sp = new THREE.SpotLight(0xfff0d8, 0, 3, 0.75, 0.6, 1.6); sp.position.copy(P).setY(UZ0 - 0.01); sp.target.position.copy(P).setY(0); sp.visible = false;
    scene.add(sp, sp.target); kitchenSpots.push(sp);
  }
  bakeLoose(spotBits);
}
// balcony: a solar string of tiny warm bulbs draped along the railing, just under the handrail. It charges in the day and comes on
// by itself when it gets dark, always dim; no switch.
MATS.fairy = new THREE.MeshBasicMaterial({ color: 0x2a2418, toneMapped: false });
MATS.fairyWire = new THREE.MeshStandardMaterial({ color: 0x2f3a2c, roughness: 0.8 });
const fairy = { bulbs: null, glows: [], on: -1 };
{
  const S = 119.7, OX = 313, OY = 1383, cx = (312 - OX) / S, cy = (OY - 210) / S, rb = 88 / S, ang = Math.atan2(-(340 - 312), 800 - 412), ca = Math.cos(ang), sa = Math.sin(ang);
  const rot = (x, y) => [cx + x * ca - y * sa, cy + x * sa + y * ca], len = (840 - 312) / S, r = rb - 0.04;
  const path = [];                                         // same run as the handrail in build.py
  for (let d = 180; d >= 0; d -= 4) { const a = (90 + d) * Math.PI / 180; path.push(rot(r * Math.cos(a), r * Math.sin(a))); }
  for (let i = 1; i <= 20; i++) path.push(rot(i * len / 20, r));
  for (let i = 1; i <= 10; i++) path.push(rot(len - 0.04, rb - i * 2 * rb / 10));
  // hang points every ~0.5 m along the path, string sags ~6 cm between them
  const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = cum[cum.length - 1], at = (d) => { let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t]; };
  const SPAN = 0.5, pts = [];
  for (let d = 0; d <= total; d += 0.02) { const u = (d % SPAN) / SPAN, [x, y] = at(d); pts.push(b2t(x, y, 1.06 - 0.06 * 4 * u * (1 - u))); }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length, 0.0015, 4, false), MATS.fairyWire); scene.add(wire);
  const n = Math.floor(total / 0.1), geo = new THREE.SphereGeometry(0.007, 8, 6);
  fairy.bulbs = new THREE.InstancedMesh(geo, MATS.fairy, n); const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const d = i * 0.1 + 0.05, u = (d % SPAN) / SPAN, [x, y] = at(d); m4.makeTranslation(b2t(x, y, 1.06 - 0.06 * 4 * u * (1 - u) - 0.012)); fairy.bulbs.setMatrixAt(i, m4); }
  scene.add(fairy.bulbs);
  for (const d of [total * 0.15, total * 0.5, total * 0.85]) { const [x, y] = at(d), g = new THREE.PointLight(0xffb84a, 0, 2.2, 2); g.position.copy(b2t(x, y, 0.95)); g.visible = false; scene.add(g); fairy.glows.push(g); }
}
function updateFairy() {
  const k = THREE.MathUtils.clamp((0.55 - dayLevel) / 0.35, 0, 1);      // fades in through dusk
  if (Math.abs(k - fairy.on) < 0.01) return; fairy.on = k;
  MATS.fairy.color.setRGB(0.16 + 1.4 * k, 0.14 + 1.0 * k, 0.09 + 0.25 * k);    // tiny warm-yellow dots, a little over 1 so they bloom
  for (const g of fairy.glows) { g.intensity = 0.12 * k; g.visible = k > 0.01; }
}
// Hue Lightstrip under the wall-hung TV unit: a thin LED line on the unit's underside, a downward area light washing the wall and floor,
// and a soft point light for the glow on the wall behind; follows the unit (placed in buildMedia)
RectAreaLightUniformsLib.init();
const stripLight = new THREE.RectAreaLight(0xffb070, 0, 1.8, 0.04);
const stripWash = new THREE.PointLight(0xffb070, 0, 1.6, 2);
MATS.stripLed = new THREE.MeshStandardMaterial({ color: 0xf6f1e8, emissive: 0xffb070, emissiveIntensity: 0, roughness: 0.4 });
const stripMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.008, 0.012), MATS.stripLed);
scene.add(stripLight, stripWash, stripMesh);
// Hue Lightstrip on the back of the TV along its top edge: an area light aimed up the wall above the TV, plus a soft halo
const backLight = new THREE.RectAreaLight(0xffb070, 0, 1.3, 0.03);
const backWash = new THREE.PointLight(0xffb070, 0, 1.4, 2);
MATS.backLed = new THREE.MeshStandardMaterial({ color: 0xf6f1e8, emissive: 0xffb070, emissiveIntensity: 0, roughness: 0.4 });
const backMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.01, 0.008), MATS.backLed);
scene.add(backLight, backWash, backMesh);
// fridge: a light inside that comes on as the door opens
const fridgeLamp = new THREE.PointLight(0xf2f6ff, 0, 2.6, 1.8); fridgeLamp.position.copy(b2t(0.786, 0.86, 2.02)); scene.add(fridgeLamp);
function updateFridgeLight() { const d = doors.find((x) => x.id === 'fridge'); fridgeLamp.intensity = d ? 2.2 * d.t : 0; }
function kelvinRGB(k) {                                    // Tanner Helland's blackbody approximation → linear-ish THREE.Color
  const t = k / 100; let r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v) => Math.min(255, Math.max(0, v)) / 255;
  return new THREE.Color().setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace);
}
function lightRGB(L) { return L.mode === 'ct' ? kelvinRGB(L.ct) : new THREE.Color(L.color); }
// Responsiveness: changes are coalesced to one apply per frame; the shadow map is redrawn only when a light goes on or off (not while
// dimming); and while a light panel is open its Hue lights stay "visible" at zero intensity, so switching them never recompiles shaders
// (light counts are part of every shader; perfTick hides dark lights again once the panel closes — those shaders are already compiled).
let lightHold = false, lightOnSig = '', lightRaf = 0, lightPanelSync = null, _hueLights = null;
function hueLights() {
  return _hueLights || (_hueLights = [tableSpot, tableGlow, stripLight, stripWash, backLight, backWash, ...kitchenSpots, booksLight, booksWash, plantLight, plantWash]);
}
function setLightHold(on) {
  if (lightHold === on) return; lightHold = on;
  for (const o of hueLights()) o.visible = on || o.intensity > 0.001;
  shadowDirty = true;
}
function applyLights() {
  for (const L of Object.values(LIGHTS)) L.apply(L, lightRGB(L), L.on ? Math.pow(L.bri, 1.6) : 0);   // Hue dimming feels ~perceptual
  if (lightHold) for (const o of hueLights()) o.visible = true;
  const sig = Object.values(LIGHTS).map((L) => (L.on ? 1 : 0)).join('');
  if (sig !== lightOnSig) { lightOnSig = sig; shadowDirty = true; }
  const q = document.getElementById('qLights'); if (q) q.setAttribute('aria-pressed', String(sig.includes('1')));
}
function applyLightsSoon() { if (!lightRaf) lightRaf = requestAnimationFrame(() => { lightRaf = 0; applyLights(); }); }
function setAllLights(on, ids = Object.keys(LIGHTS)) {
  for (const id of ids) { const L = LIGHTS[id]; L.on = on; if (on && L.bri < 0.05) L.bri = 0.6; }
  applyLights(); if (lightPanelSync) lightPanelSync();
}
function toggleAllLights() {
  const any = Object.values(LIGHTS).some((L) => L.on), n = Object.keys(LIGHTS).length;
  setAllLights(!any); showToast(any ? 'All lights off' : `All ${n} lights on`);
}
// Hue-style scenes for a room: [on, bri, mode, ct|colour] per light; missing = off
const LIGHT_SCENES = [
  { name: 'Bright', sw: 'linear-gradient(135deg,#fff7e8,#dfe9ff)', set: () => ({ '*': [1, 1, 'ct', 4000] }) },
  { name: 'Relax', sw: 'linear-gradient(135deg,#ffb35c,#ffd9a6)', set: () => ({ table: [1, 0.55, 'ct', 2400], tvstrip: [1, 0.45, 'ct', 2200], tvback: [1, 0.4, 'ct', 2300], kitchen: [1, 0.3, 'ct', 2500], books: [1, 0.5, 'ct', 2200], plant: [1, 0.5, 'ct', 2400] }) },
  { name: 'Movie', sw: 'linear-gradient(135deg,#3d4bff,#ff6a3d)', set: () => ({ tvstrip: [1, 0.22, 'ct', 2200], tvback: [1, 0.45, 'color', '#4b5bff'], books: [1, 0.3, 'color', '#ff6a3d'], plant: [1, 0.3, 'color', '#3dd68c'] }) },
  { name: 'Nightlight', sw: 'linear-gradient(135deg,#c2410c,#7c2d12)', set: () => ({ tvstrip: [1, 0.06, 'ct', 2200] }) },
];
function hexHSV(hex) { const rr = parseInt(hex.slice(1, 3), 16) / 255, gg = parseInt(hex.slice(3, 5), 16) / 255, bb = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), d = mx - mn; let h = 0;
  if (d) h = mx === rr ? ((gg - bb) / d) % 6 : mx === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: mx ? d / mx : 0, v: mx }; }
function hsvHex(h, s, v = 1) { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
function lightCss(L) { return L.mode === 'ct' ? '#' + kelvinRGB(L.ct).getHexString() : L.color; }
const BULB_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const STRIP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="10" width="18" height="4" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 7l1 1.5M12 6v2M18 7l-1 1.5M6 17l1-1.5M12 18v-2M18 17l-1-1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const POWER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8M6.3 6.6a8 8 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function buildLightControls(box, ids) {
  const root = document.createElement('div'); root.className = 'hk';
  root.innerHTML = `<div class="hk-head"><span class="hk-sum"></span><button type="button" class="hk-all"></button></div>
    <button type="button" class="hk-auto" aria-pressed="false"><i></i><span>Auto: on at dusk, off at 01:00</span></button>
    <div class="hk-scenes">${LIGHT_SCENES.map((s, i) => `<button type="button" data-s="${i}"><i style="background:${s.sw}"></i>${s.name}</button>`).join('')}</div>
    <div class="hk-grid"></div><div class="hk-det" hidden></div>`;
  const grid = root.querySelector('.hk-grid'), det = root.querySelector('.hk-det'), sum = root.querySelector('.hk-sum'), all = root.querySelector('.hk-all');
  const single = ids.length === 1;                       // a piece with its own light (book tower): just that light's controls
  let open = single ? ids[0] : null;
  if (single) { root.querySelector('.hk-head').hidden = root.querySelector('.hk-scenes').hidden = grid.hidden = true; }
  const auto = root.querySelector('.hk-auto'); if (single) auto.hidden = true;
  auto.addEventListener('click', () => { setAutoLights(!autoLightsCfg.on); syncAll(); });
  const tiles = {};
  for (const id of ids) {
    const L = LIGHTS[id], t = document.createElement('div'); t.className = 'hk-tile';
    t.innerHTML = `<button type="button" class="hk-ic" aria-label="Turn ${L.name} on or off">${/strip|backlight|tower/i.test(L.name + L.model) ? STRIP_SVG : BULB_SVG}</button>
      <button type="button" class="hk-tx" aria-label="${L.name} settings"><b>${L.name}</b><span></span></button>`;
    t.querySelector('.hk-ic').addEventListener('click', () => { L.on = !L.on; if (L.on && L.bri < 0.05) L.bri = 0.6; applyLights(); syncAll(); });
    t.querySelector('.hk-tx').addEventListener('click', () => { open = open === id ? null : id; renderDetail(); syncAll(); });
    t.addEventListener('contextmenu', (e) => { e.preventDefault(); open = id; renderDetail(); syncAll(); });
    grid.appendChild(t); tiles[id] = t;
  }
  function syncTile(id) {
    const L = LIGHTS[id], t = tiles[id], c = lightCss(L);
    t.classList.toggle('on', L.on); t.classList.toggle('open', open === id);
    t.style.setProperty('--lc', c);
    t.querySelector('.hk-tx span').textContent = L.on ? `${Math.round(L.bri * 100)}%` : 'Off';
  }
  // ---- detail: big brightness pill + colour/temperature wheel + presets
  let dSync = null;
  function renderDetail() {
    det.innerHTML = ''; det.hidden = !open; dSync = null; if (!open) return;
    const L = LIGHTS[open];
    det.innerHTML = `<div class="hk-dh"><span><b>${L.name}</b><small>${L.model}</small></span><button type="button" class="hk-x" aria-label="Close">✕</button></div>
      <div class="hk-body">
        <div class="hk-bri" role="slider" tabindex="0" aria-label="Brightness" aria-valuemin="1" aria-valuemax="100"><div class="hk-fill"></div><span class="hk-pct"></span><button type="button" class="hk-pow" aria-label="On or off">${POWER_SVG}</button></div>
        <div class="hk-side">
          <div class="hk-seg"><button type="button" data-m="ct">White</button><button type="button" data-m="color">Colour</button></div>
          <div class="hk-wheel"><canvas width="264" height="264"></canvas><i class="hk-knob"></i></div>
          <div class="hk-pre"></div>
        </div>
      </div>`;
    if (single) det.querySelector('.hk-x').hidden = true;
    det.querySelector('.hk-x').addEventListener('click', () => { open = null; renderDetail(); syncAll(); });
    const bri = det.querySelector('.hk-bri'), fill = det.querySelector('.hk-fill'), pct = det.querySelector('.hk-pct'), pow = det.querySelector('.hk-pow');
    const wheel = det.querySelector('.hk-wheel'), cv = wheel.querySelector('canvas'), knob = wheel.querySelector('.hk-knob'), pre = det.querySelector('.hk-pre');
    const drawWheel = () => {
      const g = cv.getContext('2d'), W = cv.width, R = W / 2; g.clearRect(0, 0, W, W);
      if (L.mode === 'color') {
        const id = g.createImageData(W, W);
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const dx = x - R + 0.5, dy = y - R + 0.5, d = Math.hypot(dx, dy); if (d > R) continue;
          const hex = hsvHex((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, Math.min(1, d / R)), i = (y * W + x) * 4;
          id.data[i] = parseInt(hex.slice(1, 3), 16); id.data[i + 1] = parseInt(hex.slice(3, 5), 16); id.data[i + 2] = parseInt(hex.slice(5, 7), 16); id.data[i + 3] = d > R - 1 ? 128 : 255; }
        g.putImageData(id, 0, 0);
      } else {
        const gr = g.createLinearGradient(0, 0, 0, W);
        for (const [o, k] of [[0, 6500], [0.25, 5000], [0.5, 3800], [0.75, 2900], [1, 2200]]) gr.addColorStop(o, '#' + kelvinRGB(k).getHexString());
        g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
      }
    };
    const presets = () => {
      pre.innerHTML = '';
      const list = L.mode === 'ct' ? [2200, 2700, 3000, 4000, 5000, 6500].map((k) => ['ct', k, '#' + kelvinRGB(k).getHexString(), `${k} K`])
        : ['#ff3b30', '#ff8a3d', '#ffcc33', '#34c759', '#30c6d9', '#4b5bff', '#af52de', '#ff2d92'].map((c) => ['color', c, c, c]);
      for (const [m, v, css, lab] of list) { const b = document.createElement('button'); b.type = 'button'; b.title = lab; b.style.background = css;
        b.addEventListener('click', () => { if (m === 'ct') L.ct = v; else L.color = v; L.on = true; applyLightsSoon(); syncAll(); }); pre.appendChild(b); }
    };
    det.querySelectorAll('.hk-seg button').forEach((b) => b.addEventListener('click', () => { if (L.mode === b.dataset.m) return; L.mode = b.dataset.m; L.on = true; drawWheel(); presets(); applyLightsSoon(); syncAll(); }));
    pow.addEventListener('click', (e) => { e.stopPropagation(); L.on = !L.on; if (L.on && L.bri < 0.05) L.bri = 0.6; applyLights(); syncAll(); });
    pow.addEventListener('pointerdown', (e) => e.stopPropagation());
    // brightness: drag anywhere on the pill (absolute, like Control Center); arrows ±5 %
    const setBri = (e) => { const r = bri.getBoundingClientRect(); L.bri = THREE.MathUtils.clamp((r.bottom - e.clientY) / r.height, 0.01, 1); L.on = true; applyLightsSoon(); syncAll(); };
    bri.addEventListener('pointerdown', (e) => { bri.setPointerCapture(e.pointerId); bri.classList.add('drag'); setBri(e); });
    bri.addEventListener('pointermove', (e) => { if (bri.hasPointerCapture(e.pointerId)) setBri(e); });
    const endB = () => bri.classList.remove('drag'); bri.addEventListener('pointerup', endB); bri.addEventListener('pointercancel', endB);
    bri.addEventListener('keydown', (e) => { const d = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 }[e.key]; if (d === undefined) return;
      e.preventDefault(); e.stopPropagation(); L.bri = THREE.MathUtils.clamp(L.bri + d, 0.01, 1); L.on = true; applyLightsSoon(); syncAll(); });
    // wheel: hue around, saturation outwards (colour) · warm at the bottom, cool at the top (white)
    const pick = (e) => { const r = cv.getBoundingClientRect(), R = r.width / 2; let dx = e.clientX - r.left - R, dy = e.clientY - r.top - R; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      if (L.mode === 'color') L.color = hsvHex((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, Math.min(1, Math.hypot(dx, dy) / R));
      else { L.ct = Math.round((6500 - (dy + R) / (2 * R) * 4300) / 50) * 50; L.ctx = dx / R; }
      L.on = true; applyLightsSoon(); syncAll(); };
    wheel.addEventListener('pointerdown', (e) => { wheel.setPointerCapture(e.pointerId); pick(e); });
    wheel.addEventListener('pointermove', (e) => { if (wheel.hasPointerCapture(e.pointerId)) pick(e); });
    dSync = () => {
      const c = lightCss(L);
      det.style.setProperty('--lc', c); bri.classList.toggle('off', !L.on);
      fill.style.height = `${(L.on ? L.bri : 0) * 100}%`; pct.textContent = L.on ? `${Math.round(L.bri * 100)}%` : 'Off'; bri.setAttribute('aria-valuenow', String(Math.round(L.bri * 100)));
      det.querySelectorAll('.hk-seg button').forEach((b) => b.classList.toggle('on', b.dataset.m === L.mode));
      let kx, ky;
      if (L.mode === 'color') { const h = hexHSV(L.color); kx = 50 + Math.cos(h.h * Math.PI / 180) * h.s * 50; ky = 50 + Math.sin(h.h * Math.PI / 180) * h.s * 50; }
      else { ky = (6500 - L.ct) / 4300 * 100; const half = Math.sqrt(Math.max(0, 1 - Math.pow(ky / 50 - 1, 2))) * 50; kx = 50 + THREE.MathUtils.clamp((L.ctx || 0) * 50, -half, half); }
      knob.style.left = `${kx}%`; knob.style.top = `${ky}%`; knob.style.background = c;
    };
    drawWheel(); presets();
  }
  function syncAll() {
    for (const id of ids) syncTile(id);
    const n = ids.filter((id) => LIGHTS[id].on).length;
    sum.textContent = n ? `${n} of ${ids.length} on` : 'All off';
    all.textContent = n ? 'Turn all off' : 'Turn all on'; all.classList.toggle('on', !!n);
    auto.classList.toggle('on', autoLightsCfg.on); auto.setAttribute('aria-pressed', String(autoLightsCfg.on));
    if (dSync) dSync();
  }
  all.addEventListener('click', () => { const n = ids.some((id) => LIGHTS[id].on); setAllLights(!n, ids); });
  root.querySelectorAll('.hk-scenes button').forEach((b) => b.addEventListener('click', () => {
    const S = LIGHT_SCENES[+b.dataset.s], m = S.set();
    for (const id of ids) { const v = m[id] || m['*'], L = LIGHTS[id]; if (!v) { L.on = false; continue; } L.on = !!v[0]; L.bri = v[1]; L.mode = v[2]; if (v[2] === 'ct') L.ct = v[3]; else L.color = v[3]; }
    applyLights(); syncAll(); showToast(`Scene: ${S.name}`);
  }));
  for (const inp of root.querySelectorAll('button,[tabindex]')) inp.addEventListener('keydown', (e) => { if (e.key !== 'Tab' && e.key !== 'Escape') e.stopPropagation(); });
  box.appendChild(root); if (single) renderDetail(); syncAll();
  lightPanelSync = syncAll;
}
// PH 5: glare-free and mostly downward, but a broad cone that lights the whole table area and the floor around it; little goes up
const tableSpot = new THREE.SpotLight(0xffa552, 0, 9, 1.12, 0.75, 1.5);
tableSpot.castShadow = true; tableSpot.shadow.mapSize.set(1024, 1024); tableSpot.shadow.bias = -0.0008; tableSpot.shadow.camera.near = 0.1; tableSpot.shadow.camera.far = 9;
const tableGlow = new THREE.PointLight(0xffb070, 0, 3.5, 1.8);               // the little that escapes sideways between the shades
scene.add(tableSpot, tableSpot.target, tableGlow);
function buildDiningLamp() {
  if (lamp.group) { scene.remove(lamp.group); dropParts(lamp.parts); }
  const T = TABLE_MODELS[dining.t].configs[dining.tc];
  lamp.h = Math.max(0.35, Math.min(lampMaxH(), lamp.h));
  const g = new THREE.Group(); g.position.copy(dining.O).setY(T.H + lamp.h); scene.add(g);
  const lathe = (pts, m, y) => { const o = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 48), m); o.position.y = y; o.castShadow = false; g.add(o); return o; };   // no shadow casting: the bulb's own shades would block its cone
  // profiles (radius, height above the bottom of the lamp, m) measured off the shop photo (main shade Ø50 = 583 px)
  const shell = (pts, outer, under, dy = 0.004) => { lathe(pts, outer, 0); lathe(pts.map(([r, h]) => [r * 0.975, h - dy]), under, 0); };   // white lining just inside/below the coloured skin
  shell([[0.075, 0.150], [0.085, 0.175], [0.105, 0.193], [0.152, 0.204], [0.12, 0.209], [0.07, 0.213], [0.036, 0.216]], MATS.phTop, MATS.phUnder);   // top shade: wide flat rim over a funnel
  shell([[0.10, 0.148], [0.15, 0.131], [0.20, 0.109], [0.235, 0.093], [0.25, 0.086]], MATS.phMain, MATS.phUnder);                                      // main shade Ø50
  lathe([[0.06, 0.092], [0.09, 0.090], [0.115, 0.087]], MATS.phPink, 0);                                                                                 // pink reflector ring under it
  shell([[0.078, 0.082], [0.10, 0.075], [0.112, 0.060], [0.117, 0.040], [0.118, 0.027]], MATS.phLow, MATS.phUnder);                                   // lower dome
  lathe([[0.0, 0.0], [0.05, 0.0], [0.057, 0.004], [0.06, 0.024], [0.07, 0.026]], MATS.phCup, 0);                                                         // cream bottom cup
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + 0.4; const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.12, 6), MATS.phCopper);
    rod.position.set(Math.cos(a) * 0.088, 0.148, Math.sin(a) * 0.088); g.add(rod); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.057, 24), MATS.phCap); cap.position.y = 0.216 + 0.0285; cap.castShadow = true; g.add(cap);
  const cordL = 2.6 - (T.H + lamp.h + 0.273);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, cordL, 6), phM(0xf2f2f0)); cord.position.y = 0.273 + cordL / 2; g.add(cord);   // white cord like the photo
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24), MATS.phCap); rose.position.y = 2.6 - (T.H + lamp.h) - 0.015; g.add(rose);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.32, 16), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.13; g.add(hit);
  const door = { kind: 'swap', label: 'Lamp', parts: [hit], center: g.position.clone().setY(T.H + lamp.h + 0.13),
    swap: () => selectFurniture(selected === lampMover ? null : lampMover),
    prompt: () => (selected === lampMover ? 'Done with the lamp' : 'Raise or lower the lamp') };
  hit.userData.door = door; hit.userData.furniture = true; collidables.push(hit);
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Lamp'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  MATS.phBulb = MATS.phBulb || new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffc27a, emissiveIntensity: 0 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), MATS.phBulb); bulb.position.y = 0.105; g.add(bulb);
  g.updateMatrixWorld(true);
  lamp.group = g; lamp.parts = [hit];
  tableSpot.position.copy(g.position).setY(g.position.y + 0.1); tableSpot.target.position.copy(g.position).setY(0); tableSpot.target.updateMatrixWorld();
  tableGlow.position.copy(g.position).setY(g.position.y + 0.06);
  applyLights();
}
const lampMover = {
  name: 'PH 5 lamp', title: () => `Louis Poulsen PH 5 · ${Math.round(lamp.h * 100)} cm above the table`,
  anchor: () => (lamp.group ? lamp.group.position.clone().setY(lamp.group.position.y - 0.15) : null),
  axis2: () => new THREE.Vector3(0, 1, 0),
  shift2: (dir) => { const b = lamp.h; lamp.h = +(lamp.h + dir * 0.05).toFixed(2); buildDiningLamp(); diningDimsUpdate();
    if (Math.abs(lamp.h - b) < 1e-6) showToast(dir > 0 ? 'That’s as high as the ceiling allows' : 'Lower than 35 cm gets in the way'); },
  link: () => ({ href: PH5.url, text: 'Lampemesteren · PH 5 grey ↗' }),
  info: () => { const T = TABLE_MODELS[dining.t].configs[dining.tc]; return `Ø50 × 26.7 cm, grey · ${PH5.price} · shade bottom ${(T.H + lamp.h).toFixed(2)} m off the floor · top ${(2.6 - T.H - lamp.h - PH5.H).toFixed(2)} m below the ceiling · moves with the table`; },
};
function diningGaps() {
  const { x, z } = dFrame(), out = [];
  for (const [dir, need, nm] of [[x, diningSupport(1, 0), '+x'], [x.clone().negate(), diningSupport(-1, 0), '-x'], [z, diningSupport(0, 1), '+z'], [z.clone().negate(), diningSupport(0, -1), '-z']]) {
    const from = dining.O.clone().addScaledVector(dir, need + 0.005).setY(0.35);
    const d = gapTo(from, dir, 5, true); out.push({ from, dir, d, name: lastGapHit && lastGapHit.material === MATS.glass ? ' to window' : hitName() });
  }
  return out;
}
function diningName() {
  const Tm = TABLE_MODELS[dining.t], T = Tm.configs[dining.tc], Cm = CHAIR_MODELS[dining.c];
  return `${Tm.brand} ${Tm.name} ${T.name} + ${dining.n} × ${Cm.name}`;
}
function diningDimsUpdate() {
  diningDims.clear(); if (!dining.group) return;
  if (lamp.group) { const T = TABLE_MODELS[dining.t].configs[dining.tc], P0 = dining.O.clone().setY(T.H), off = new THREE.Vector3(0.3, 0, 0);
    const v = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([P0.clone().add(off), P0.clone().add(off).setY(T.H + lamp.h)]), lineMat); v.renderOrder = 29; diningDims.add(v);
    const t = labelSprite(`${Math.round(lamp.h * 100)} cm table → lamp`, { h: 0.022 }); t.position.copy(P0).add(off).setY(T.H + lamp.h / 2); diningDims.add(t); }
  for (const G of diningGaps()) if (G.d !== null) diningDims.add(dimLine(toBl(G.from), toBl(G.from.clone().addScaledVector(G.dir, G.d)), `${G.d.toFixed(2)} m${G.name}${G.d < 0.7 ? ' (tight)' : ''}`, 0.04));
  const tag = labelSprite(`${diningName()} · ${Math.round(((dining.angle * 180 / Math.PI) % 360 + 360) % 360)}°`, { h: 0.03 });
  tag.position.copy(dining.O).setY(1.35); diningDims.add(tag);
}
const diningMover = {
  name: 'Table & chairs', title: () => diningName(),
  variant: { label: () => (dining.out ? 'Tuck the chairs in' : 'Pull the chairs out (in use)'),
    run: () => { dining.out = !dining.out; const ok = buildDining((c) => c); if (selected === diningMover) updateMoverInfo();
      showToast(dining.out ? (ok ? 'Chairs pulled out: backs 60 cm from the table, as when sitting' : 'Pulled out they hit a wall or furniture here — see Sizes') : 'Chairs tucked in'); } },
  anchor: () => (dining.group ? dining.O.clone().setY(1.1) : null),
  axis: () => b2t(1, 0).normalize(), axis2: () => b2t(0, 1).normalize(),
  shift: (dir) => { if (!buildDining((c) => ({ O: c.O.addScaledVector(b2t(1, 0).normalize(), dir * 0.05), angle: c.angle }))) showToast('Can’t go further: wall or furniture'); },
  shift2: (dir) => { if (!buildDining((c) => ({ O: c.O.addScaledVector(b2t(0, 1).normalize(), dir * 0.05), angle: c.angle }))) showToast('Can’t go further: wall or furniture'); },
  rotate: (dir) => { if (!buildDining((c) => ({ O: c.O, angle: c.angle + dir * Math.PI / 12 }))) showToast('No room to turn it here'); },
  link: () => { const Tm = TABLE_MODELS[dining.t]; return { href: (Tm.configs[dining.tc].urls || [])[dining.tf] || Tm.configs[dining.tc].url || Tm.url, text: `${Tm.brand} ${Tm.name} ↗`, href2: CHAIR_MODELS[dining.c].variants[dining.cv].url || CHAIR_MODELS[dining.c].url, text2: `${CHAIR_MODELS[dining.c].brand} ${CHAIR_MODELS[dining.c].name} ↗` }; },
  info: () => { const G = diningGaps(); const tight = Math.min(...G.map((g) => g.d ?? 9)); return `${Math.round(((dining.angle * 180 / Math.PI) % 360 + 360) % 360)}° · tightest gap ${tight.toFixed(2)} m · seats ${TABLE_MODELS[dining.t].configs[dining.tc].seats}`; },
  selects: [
    { id: 'tmodel', label: 'Table', options: () => TABLE_MODELS.map((m) => ({ label: `${m.brand} ${m.name}` })), get: () => dining.t,
      set: (i) => { dining.t = i; dining.tc = 0; dining.tf = 0; buildDining(); buildMoverSelects(diningMover); } },
    { id: 'tsize', label: 'Table size', options: () => TABLE_MODELS[dining.t].configs.map((c) => ({ label: c.name })), get: () => dining.tc,
      set: (i) => { dining.tc = i; buildDining(); } },
    { id: 'tfin', label: 'Table finish', options: () => TABLE_MODELS[dining.t].finishes.map((f) => ({ label: f.name })), get: () => dining.tf,
      set: (i) => { dining.tf = i; applyDiningMats(); } },
    { id: 'cvar', label: 'Chair colour', options: () => CHAIR_MODELS[dining.c].variants.map((v) => ({ label: v.name })), get: () => dining.cv,
      set: (i) => { dining.cv = i; applyDiningMats(); } },
  ],
};

