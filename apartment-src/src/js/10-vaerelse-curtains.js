// ------------------------------------------------------------ Værelse: IKEA PAX / FLISBERGET on the wall opposite the sofa bed, nearer the door
// widths 50 (1 door) / 100 (2) / 150 (3) / 200 (4) cm, heights 201.2 / 236.4 cm, 60 cm deep with the doors; frame and door colours
const VPAX = {
  widths: [0.5, 1.0, 1.5, 2.0],
  heights: [{ name: '236.4 cm (doors 229.4)', H: 2.364, door: 2.294 }, { name: '201.2 cm (doors 194.6)', H: 2.012, door: 1.946 }],
  frames: [{ name: 'Hvid', c: 0xf1f0ec }, { name: 'Mørkegrå', c: 0x55575a }, { name: 'Gråbeige', c: 0xb7ab9a }, { name: 'Sortbrun', c: 0x3a302b }],
  doors: [{ name: 'FLISBERGET lys beige', c: 0xd9cdb6 }, { name: 'FLISBERGET antracit', c: 0x4b4d50 }],
  links: { '1.0|0': 's79480308', '1.0|1': 's69480304', '2.0|0': 's39304128', '2.0|1': 's49304340', '1.5|0': 's59500680', '1.5|1': 's99500678' },
};
// Option 2 (Gianluca, 2026-10-04): a bare IKEA PAX frame (garderobsstomme) on the same wall, starting by the window.
// ikea.com/se, Oct 2026: widths 50 / 100 (49.8 / 99.8), depths 35 / 58 (35.5 / 58.0), heights 236.4 / 201.2;
// Vit, Gråbeige (58 deep only), Mörkgrå, Vitlaserad ekeffekt. A 100 frame is one open box (no middle side). Doors optional (FLISBERGET 50).
const WASH = canvasTex(512, 512, (g, W) => { const r = rng(23); g.fillStyle = '#ddd1bd'; g.fillRect(0, 0, W, W);
  grain(g, 0, -20, W, W + 40, r, '150,120,85', 90, 0.10); grain(g, 0, -20, W, W + 40, r, '250,244,232', 40, 0.12); }, [1, 1]);
const PAXF = {
  widths: [{ w: 0.498, cm: 50 }, { w: 0.998, cm: 100 }],
  depths: [{ d: 0.355, cm: 35 }, { d: 0.58, cm: 58 }],
  heights: [{ name: '236.4 cm', H: 2.364, door: 2.294, cm: 236 }, { name: '201.2 cm', H: 2.012, door: 1.946, cm: 201 }],
  colours: [
    { name: 'Vit', slug: 'vit', c: 0xf1f0ec, deep: null },
    { name: 'Gråbeige', slug: 'grabeige', c: 0xb7ab9a, deep: 1 },          // only made 58 deep
    { name: 'Mörkgrå', slug: 'moerkgra', c: 0x55575a, deep: null },
    { name: 'Vitlaserad ekeffekt', slug: 'vitlaserad-ekeffekt', c: 0xffffff, map: true, deep: null },
  ],
  doors: [{ name: 'None · open frame' }, { name: 'FLISBERGET lys beige', c: 0xd9cdb6 }, { name: 'FLISBERGET antracit', c: 0x4b4d50 }],
  // `${colour}|${W}x${D}x${H}` → [article slug id, SEK]
  items: {
    'vit|50x35x201': ['60214569', 600], 'vit|50x35x236': ['40214565', 800], 'vit|50x58x201': ['70214559', 700], 'vit|50x58x236': ['80214568', 900],
    'vit|100x35x201': ['90214563', 800], 'vit|100x35x236': ['00214572', 1000], 'vit|100x58x201': ['20214566', 895], 'vit|100x58x236': ['50214560', 1100],
    'moerkgra|50x35x201': ['90509230', 800], 'moerkgra|50x35x236': ['10509234', 1000], 'moerkgra|50x58x201': ['50509128', 900], 'moerkgra|50x58x236': ['70509132', 1100],
    'moerkgra|100x35x201': ['20509224', 1000], 'moerkgra|100x35x236': ['50509227', 1200], 'moerkgra|100x58x201': ['80509122', 1100], 'moerkgra|100x58x236': ['10509125', 1300],
    'vitlaserad-ekeffekt|50x35x201': ['50273413', 800], 'vitlaserad-ekeffekt|50x35x236': ['00273415', 1000], 'vitlaserad-ekeffekt|50x58x201': ['20201724', 900], 'vitlaserad-ekeffekt|50x58x236': ['90183991', 1100],
    'vitlaserad-ekeffekt|100x35x201': ['30273409', 1000], 'vitlaserad-ekeffekt|100x35x236': ['90273411', 1200], 'vitlaserad-ekeffekt|100x58x201': ['40201723', 1100], 'vitlaserad-ekeffekt|100x58x236': ['30183989', 1300],
    'grabeige|50x58x201': ['90458216', 900], 'grabeige|50x58x236': ['10458220', 1100], 'grabeige|100x58x201': ['90458202', 1100], 'grabeige|100x58x236': ['00458206', 1300],
  },
};
const vpax = { model: 1, w: 1, h: 0, f: 0, d: 0, fw: 1, fd: 0, fh: 0, fc: 0, fdoor: 0, off: 0, atWin: true, run: null, wall: null, swap: null };
const paxfItem = () => { const C = PAXF.colours[vpax.fc]; return PAXF.items[`${C.slug}|${PAXF.widths[vpax.fw].cm}x${PAXF.depths[vpax.fd].cm}x${PAXF.heights[vpax.fh].cm}`]; };
const vpaxW = () => (vpax.model ? PAXF.widths[vpax.fw].w : VPAX.widths[vpax.w]);
const vpaxDepth = () => (vpax.model ? PAXF.depths[vpax.fd].d + (vpax.fdoor ? 0.024 : 0) : 0.60);
const vpaxH = () => (vpax.model ? PAXF.heights[vpax.fh].H : VPAX.heights[vpax.h].H);
const vpaxDims = new THREE.Group(); dimsGroup.add(vpaxDims);
function vpaxUrl() {
  if (vpax.model) { const C = PAXF.colours[vpax.fc], it = paxfItem(), W = PAXF.widths[vpax.fw].cm, D = PAXF.depths[vpax.fd].cm, H = PAXF.heights[vpax.fh].cm;
    const L = { href: `https://www.ikea.com/se/sv/p/pax-garderobsstomme-${C.slug}-${it[0]}/`, text: `IKEA · PAX frame ${W}×${D}×${H} ${C.name} · ${it[1].toLocaleString('en')} kr ↗` };
    if (vpax.fdoor) { L.href2 = vpax.fh ? 'https://www.ikea.com/dk/da/p/flisberget-lage-med-haengsler-lys-beige-s39181066/' : 'https://www.ikea.com/dk/da/p/flisberget-lage-med-haengsler-lys-beige-s99181068/'; L.text2 = `IKEA · FLISBERGET door 50 cm × ${W / 50} ↗`; }
    return L; }
  const W = VPAX.widths[vpax.w], key = `${W.toFixed(1)}|${vpax.h}`, id = VPAX.links[key];
  if (id) return { href: `https://www.ikea.com/dk/da/p/pax-flisberget-garderobe${W === 1.5 ? 'kombination' : 'skab'}-hvid-lys-beige-${id}/`, text: `IKEA · PAX/FLISBERGET ${Math.round(W * 100)}×60×${vpax.h ? 201 : 236} ↗` };
  return { href: vpax.h ? 'https://www.ikea.com/dk/da/p/flisberget-lage-med-haengsler-lys-beige-s39181066/' : 'https://www.ikea.com/dk/da/p/flisberget-lage-med-haengsler-lys-beige-s99181068/', text: 'IKEA · FLISBERGET door 50 cm (+ PAX 50 frame) ↗' };
}
function buildVaerCloset() {
  if (!vpax.wall) {
    const Wl = wallLine([6.2, 5.9], [6.2, 7.7], [1, 0]); if (!Wl) return;
    const n = Wl.n, a = new THREE.Vector3().crossVectors(UP, n).normalize();          // a runs towards the door end (−y)
    const S = (by) => b2t(7.3, by, 0).sub(Wl.p).dot(a);
    vpax.wall = { n, a, p: Wl.p.clone().setY(0), sDoor: S(5.40), sWin: S(8.0) };       // door end: past the Værelse door's open leaf (it lies along this wall to y ≈ 5.35)
  }
  if (vpax.run) { scene.remove(vpax.run.g); dropParts(vpax.run.parts); for (const d of vpax.run.doors) removeHingedDoor(d); const i = doors.indexOf(vpax.swap); if (i >= 0) doors.splice(i, 1); }
  const { n, a, p, sDoor, sWin } = vpax.wall, W = vpaxW(), HH = vpax.model ? PAXF.heights[vpax.fh] : VPAX.heights[vpax.h];
  const maxOff = Math.max(0, sDoor - sWin - W - 0.02);
  if (vpax.atWin) vpax.off = maxOff;                                                   // default: against the window wall (Gianluca)
  vpax.off = Math.max(-0.5, Math.min(maxOff, vpax.off)); vpax.atWin = vpax.off >= maxOff - 1e-4;                               // 0 = right after the door; + = towards the window
  const sEnd = sDoor - vpax.off, O = p.clone().addScaledVector(a, sEnd - W).addScaledVector(n, 0.005);
  // temporarily point the shared PAX builder at this closet's height and colours
  const keep = { H: H_CL, D: DOOR_H, fr: MATS.paxFrame, dr: MATS.paxDoor, dc: D_CL, zc, pin: MATS.paxIn };
  H_CL = HH.H; DOOR_H = HH.door;
  if (vpax.model) {
    const C = PAXF.colours[vpax.fc], m = std(C.map ? { map: WASH, roughness: 0.62 } : { color: C.c, roughness: 0.6 });
    MATS.paxFrame = m; MATS.paxIn = m; D_CL = PAXF.depths[vpax.fd].d; zc = D_CL / 2;
    MATS.paxDoor = std({ color: (PAXF.doors[vpax.fdoor].c ?? 0xd9cdb6), roughness: 0.65 });
  } else { MATS.paxFrame = std({ color: VPAX.frames[vpax.f].c, roughness: 0.6 }); MATS.paxDoor = std({ color: VPAX.doors[vpax.d].c, roughness: 0.65 }); }
  // open-frame contents (interior fittings are sold separately; shown for scale): 58 deep = rail + hat shelf, 35 deep = shelves with folded piles
  const deep = D_CL > 0.5, fr = (c) => {
    if (deep) { rail(c, HH.H - 0.34); hang(c, HH.H - 0.34, SHIRTS.slice(0, c.w > 0.6 ? 7 : 4).map((col) => [0.035, 0.8, 0.42, col])); shelf(c, HH.H - 0.22); stacks(c, HH.H - 0.22, c.w > 0.6 ? [TEES[0], TEES[1]] : [TEES[0]], 3); shelf(c, 0.75); stacks(c, 0.75, c.w > 0.6 ? [TEES[1], TEES[0]] : [TEES[1]], 4); }
    else { for (const y of [0.42, 0.8, 1.18, 1.56, 1.94].filter((y) => y < HH.H - 0.25)) { shelf(c, y); stacks(c, y, c.w > 0.6 ? [TEES[0], TEES[1]] : [TEES[Math.round(y * 10) % 2]], 4); } }
  };
  const fillA = (c) => { rail(c, HH.H - 0.34); hang(c, HH.H - 0.34, [0.035, 0.035, 0.03, 0.035, 0.04].map((t, i) => [t, 0.8, 0.42, SHIRTS[i]])); shelf(c, HH.H - 0.22); boxes(c, HH.H - 0.22, [0x6b6557]); };
  const fillB = (c) => { drawers(c, PL + T + 0.01, 3, 0.19); for (const y of [0.85, 1.25, 1.65]) { shelf(c, y); stacks(c, y, [TEES[0].slice(0, 4), TEES[1].slice(0, 4)], 4); } };
  const pair = (f1, f2) => [{ w: 0.5, doors: 1, hingeLeft: true, fill: f1 }, { w: 0.5, doors: 1, hingeLeft: false, fill: f2 }];
  const secs = vpax.model ? [{ w: W, doors: vpax.fdoor ? Math.round(W / 0.5) : 1, hingeLeft: false, open: !vpax.fdoor, fill: fr }] : W === 0.5 ? [{ w: 0.5, doors: 1, hingeLeft: false, fill: fillA }] : W === 1.0 ? pair(fillA, fillB)
    : W === 1.5 ? [...pair(fillA, fillA), { w: 0.5, doors: 1, hingeLeft: false, fill: fillB }] : [...pair(fillA, fillA), ...pair(fillB, fillB)];
  const r = makeRun(O, n, W, 'Værelse closet', secs);
  H_CL = keep.H; DOOR_H = keep.D; MATS.paxFrame = keep.fr; MATS.paxDoor = keep.dr; D_CL = keep.dc; zc = keep.zc; MATS.paxIn = keep.pin;
  vpax.run = r;
  const door = { kind: 'swap', label: 'Closet', parts: r.parts, center: O.clone().addScaledVector(a, W / 2).addScaledVector(n, Math.min(0.3, vpaxDepth() / 2)).setY(1.2),
    swap: () => selectFurniture(selected === vpaxMover ? null : vpaxMover), prompt: () => (selected === vpaxMover ? 'Done with the closet' : 'Closet options') };
  for (const q of r.parts) q.userData.door = door;
  vpax.swap = door; doors.push(door);
  vpaxDimsUpdate();
  if (window.__deskReady) window.__buildDesk();          // the desk shares this wall
}
function vpaxGaps() {
  const { n, a } = vpax.wall, r = vpax.run, W = r.width;
  const front = r.O.clone().addScaledVector(n, vpaxDepth());
  const toSofa = guest.group ? front.x - (guest.wall.base.x + guestFront()) : null;
  const zq = Math.min(0.3, vpaxDepth() / 2), doorEnd = r.O.clone().addScaledVector(a, W + 0.01).addScaledVector(n, zq).setY(1.0), winEnd = r.O.clone().addScaledVector(a, -0.01).addScaledVector(n, zq).setY(1.0);
  return { toSofa, toDoor: gapTo(doorEnd, a.clone(), 3.6), toWin: gapTo(winEnd, a.clone().negate(), 4) };
}
function vpaxDimsUpdate() {
  vpaxDims.clear(); if (!vpax.run) return;
  const r = vpax.run, { n, a } = vpax.wall, G = vpaxGaps(), H = vpaxH(), D = vpaxDepth(), zq = Math.min(0.3, D / 2);
  const P = (s, t) => toBl(r.O.clone().addScaledVector(a, s).addScaledVector(n, t));
  vpaxDims.add(dimLine(P(0, D + 0.1), P(r.width, D + 0.1), `${(r.width * 100).toFixed(vpax.model ? 1 : 0)} cm · ${(D * 100).toFixed(1).replace('.0', '')} deep · ${(H * 100).toFixed(1)} high`, H + 0.06));
  if (G.toDoor !== null) vpaxDims.add(dimLine(P(r.width, zq), P(r.width + G.toDoor, zq), `${G.toDoor.toFixed(2)} m`, 0.9));
  if (G.toWin !== null) vpaxDims.add(dimLine(P(0, zq), P(-G.toWin, zq), `${G.toWin.toFixed(2)} m`, 0.9));
  if (G.toSofa !== null) vpaxDims.add(dimLine(P(r.width / 2, D), P(r.width / 2, D + G.toSofa), `${G.toSofa.toFixed(2)} m to the sofa${guest.open ? ' bed' : ''}${G.toSofa < 0.5 ? ' (doors can’t fully open)' : ''}`, 0.5));
}
const VPAX_MODEL = { id: 'vm', label: 'Model', options: () => [{ label: 'PAX + FLISBERGET doors' }, { label: 'PAX frame (garderobsstomme)' }], get: () => vpax.model,
  set: (i) => { vpax.model = i; vpax.atWin = true; buildVaerCloset(); selectFurniture(vpaxMover); } };
const VPAX_SELECTS = [VPAX_MODEL,
  { id: 'vw', label: 'Width', options: () => VPAX.widths.map((w) => ({ label: `${Math.round(w * 100)} cm · ${Math.round(w * 2)} door${w > 0.5 ? 's' : ''}` })), get: () => vpax.w, set: (i) => { vpax.w = i; buildVaerCloset(); } },
  { id: 'vh', label: 'Height', options: () => VPAX.heights.map((h) => ({ label: h.name })), get: () => vpax.h, set: (i) => { vpax.h = i; buildVaerCloset(); } },
  { id: 'vf', label: 'PAX frame', options: () => VPAX.frames.map((f) => ({ label: f.name })), get: () => vpax.f, set: (i) => { vpax.f = i; buildVaerCloset(); buildNookCloset(); } },
  { id: 'vd', label: 'Doors', options: () => VPAX.doors.map((d) => ({ label: d.name })), get: () => vpax.d, set: (i) => { vpax.d = i; buildVaerCloset(); buildNookCloset(); } },
];
const PAXF_SELECTS = [VPAX_MODEL,
  { id: 'fw', label: 'Width', options: () => PAXF.widths.map((w) => ({ label: `${w.cm} cm${w.cm === 100 ? ' · one open box' : ' · single column'}` })), get: () => vpax.fw, set: (i) => { vpax.fw = i; buildVaerCloset(); } },
  { id: 'fd', label: 'Depth', options: () => PAXF.depths.map((d) => ({ label: `${d.cm} cm${d.cm === 35 ? ' (35.5)' : ''}` })), get: () => vpax.fd,
    set: (i) => { if (i === 0 && PAXF.colours[vpax.fc].deep === 1) { vpax.fc = 0; showToast('Gråbeige only comes 58 deep · switched to Vit'); } vpax.fd = i; buildVaerCloset(); } },
  { id: 'fh', label: 'Height', options: () => PAXF.heights.map((h) => ({ label: h.name })), get: () => vpax.fh, set: (i) => { vpax.fh = i; buildVaerCloset(); } },
  { id: 'fc', label: 'Colour', options: () => PAXF.colours.map((c) => ({ label: c.name + (c.deep === 1 ? ' (58 deep only)' : '') })), get: () => vpax.fc,
    set: (i) => { vpax.fc = i; if (PAXF.colours[i].deep === 1 && vpax.fd === 0) { vpax.fd = 1; showToast('Gråbeige only comes 58 deep · depth set to 58'); } buildVaerCloset(); } },
  { id: 'fdoor', label: 'Doors', options: () => PAXF.doors.map((d) => ({ label: d.name })), get: () => vpax.fdoor, set: (i) => { vpax.fdoor = i; buildVaerCloset(); } },
];
const vpaxMover = {
  name: 'Værelse closet',
  title: () => (vpax.model ? `PAX frame · ${PAXF.widths[vpax.fw].cm} × ${PAXF.depths[vpax.fd].cm} × ${PAXF.heights[vpax.fh].cm}` : `PAX / FLISBERGET · ${Math.round(VPAX.widths[vpax.w] * 100)} cm`),
  anchor: () => (vpax.run ? vpax.run.O.clone().addScaledVector(vpax.wall.a, vpax.run.width / 2).addScaledVector(vpax.wall.n, vpaxDepth() + 0.3).setY(1.3) : null),
  axis: () => vpax.wall.a,
  shift: (dir) => { const b = vpax.off; vpax.atWin = false; vpax.off -= dir * 0.05; buildVaerCloset(); if (Math.abs(vpax.off - b) < 1e-6) showToast(dir > 0 ? 'Any closer and the room door hits it' : 'Can’t go further: window wall'); },
  get variant() { return vpax.model ? { label: () => (vpax.fw === 1 && vpax.fd === 0 ? 'Try 50 × 58' : 'Try 100 × 35'),
    run: () => { const to100 = !(vpax.fw === 1 && vpax.fd === 0); vpax.fw = to100 ? 1 : 0; vpax.fd = to100 ? 0 : 1; if (to100 && PAXF.colours[vpax.fc].deep === 1) vpax.fc = 0; buildVaerCloset(); buildMoverSelects(vpaxMover); showToast(to100 ? 'PAX frame 100 × 35' : 'PAX frame 50 × 58'); } } : undefined; },
  get selects() { return vpax.model ? PAXF_SELECTS : VPAX_SELECTS; },
  link: () => vpaxUrl(),
  info: () => { const G = vpaxGaps(); const t = (x) => (x === null ? '—' : `${x.toFixed(2)} m`);
    if (vpax.model) { const it = paxfItem(), Wc = PAXF.widths[vpax.fw], Dc = PAXF.depths[vpax.fd];
      return `${(Wc.w * 100).toFixed(1)} × ${(Dc.d * 100).toFixed(1)} × ${(PAXF.heights[vpax.fh].H * 100).toFixed(1)} cm · ${it[1].toLocaleString('en')} kr (IKEA SE) · ${t(G.toWin)} to the window wall · ${t(G.toDoor)} to the door end · ${t(G.toSofa)} to the sofa${guest.open ? ' bed' : ''} · ${vpax.fdoor ? 'doors + hinges extra (FLISBERGET 50 per door)' : 'frame only: doors'}, shelves and rail sold separately${Wc.cm === 100 ? ' · the 100 frame has no middle side' : ''}`; }
    return `${t(G.toDoor)} to the door end · ${t(G.toWin)} to the window wall · ${t(G.toSofa)} to the sofa${guest.open ? ' bed' : ''}${G.toSofa !== null && G.toSofa < 0.5 ? ' — doors can’t open fully' : ''} · white/lys beige is the standard combo; other frame colours: check IKEA` },
};
// ------------------------------------------------------------ Værelse: PAX 50 × 60 × 236 + one FLISBERGET door in the nook just left of the door as you come in
// (the jog between the door jamb x≈6.2 and the short wall x≈5.63, 70 cm deep) — IKEA planner price 1,300 kr; frame/door colours follow the big closet
const nook = { h: 0, run: null, swap: null };
function buildNookCloset() {
  if (nook.run) { scene.remove(nook.run.g); dropParts(nook.run.parts); for (const d of nook.run.doors) removeHingedDoor(d); const i = doors.indexOf(nook.swap); if (i >= 0) doors.splice(i, 1); }
  const Wl = wallLine([5.8, 5.0], [6.05, 5.0], [0, -1]); if (!Wl) return;       // the south wall face inside the nook
  const n = Wl.n, a = new THREE.Vector3().crossVectors(UP, n).normalize();
  const eastX = 5.64 + 0.498;                                                     // 1 cm off the jog wall, 49.8 wide
  const start = a.x < 0 ? b2t(eastX, 4.5, 0) : b2t(5.64, 4.5, 0);                 // local x = 0 end
  const O2 = Wl.p.clone().addScaledVector(a, start.clone().sub(Wl.p).dot(a)).setY(0).addScaledVector(n, 0.005);
  const HH = VPAX.heights[nook.h], keep = { H: H_CL, D: DOOR_H, fr: MATS.paxFrame, dr: MATS.paxDoor };
  H_CL = HH.H; DOOR_H = HH.door;
  MATS.paxFrame = std({ color: VPAX.frames[vpax.f].c, roughness: 0.6 }); MATS.paxDoor = std({ color: VPAX.doors[vpax.d].c, roughness: 0.65 });
  const westIsLeft = a.x < 0 ? false : true;                                      // hinge on the jog-wall (west) side so the door swings clear of the entrance
  const r = makeRun(O2, n, 0.498, 'nook cabinet', [{ w: 0.498, doors: 1, hingeLeft: westIsLeft, fill: (c) => { for (const y of [0.45, 0.85, 1.25, 1.65, 2.05].filter((y) => y < HH.H - 0.2)) { shelf(c, y); boxes(c, y, [[0xcfc4b0, 0x7a8a96, 0x9c8a74][Math.round(y * 10) % 3]]); } } }]);
  H_CL = keep.H; DOOR_H = keep.D; MATS.paxFrame = keep.fr; MATS.paxDoor = keep.dr;
  nook.run = r;
  const door = { kind: 'swap', label: 'Closet', parts: r.parts, center: O2.clone().addScaledVector(a, 0.25).addScaledVector(n, 0.3).setY(1.2),
    swap: () => selectFurniture(selected === nookMover ? null : nookMover), prompt: () => (selected === nookMover ? 'Done with the cabinet' : 'Cabinet options') };
  for (const q of r.parts) q.userData.door = door;
  nook.swap = door; doors.push(door);
}
const nookMover = {
  name: 'Corner cabinet', title: () => 'PAX 50 / FLISBERGET · corner by the door',
  anchor: () => (nook.run ? nook.run.O.clone().addScaledVector(nook.run.a, 0.25).addScaledVector(nook.run.n, 0.9).setY(1.3) : null),
  selects: [{ id: 'nh', label: 'Height', options: () => VPAX.heights.map((h) => ({ label: h.name })), get: () => nook.h, set: (i) => { nook.h = i; buildNookCloset(); } }],
  link: () => ({ href: 'https://www.ikea.com/dk/da/p/flisberget-lage-med-haengsler-lys-beige-s99181068/', text: 'IKEA · FLISBERGET door 50×229 (+ PAX frame 50×58×236) ↗' }),
  info: () => '49.8 × 60.4 × 236.4 cm · 1,300 kr in the IKEA planner · fills the 57 cm nook between the jog and the door jamb · colours follow the big closet',
};
// the tall fridge column's exposed side (towards the worktop) was the white fridge liner seen from outside: skin it in kitchen oak
// (build.py: column x 0.476–1.096, y 0.476–1.076; fridge compartment z 0.978–2.150)
function fridgeSideSkin() {
  const z0 = 0.978, z1 = 2.150, y0 = 0.476, y1 = 1.076 + 0.018, x = 1.0962 + 0.0025;
  const m = new THREE.Mesh(boxUV(0.005, z1 - z0, y1 - y0), MATS.oak);
  m.position.copy(b2t(x, (y0 + y1) / 2, z0)); m.castShadow = m.receiveShadow = true; scene.add(m);
}
// ------------------------------------------------------------ curtains: a whitish sheer across the balcony glazing, blackout curtains in the bedroom
// Each curtain is a pleated sheet on a ceiling track; open = gathered into a stack at its end. They open and close smoothly through
// their interaction point (E / click toggles), and the mouse wheel / trackpad scroll moves them gradually while their point is focused
// (on touch: drag the point up or down). With the bedroom pair closed the bedroom goes properly dark (sky light is shut out).
MATS.sheer = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false,
  alphaMap: canvasTex(128, 128, (g, W) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, W, W); const r = rng(91);
    for (let x = 0; x < W; x += 2) { const v = 120 + r() * 80 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, W); }
    for (let y = 0; y < W; y += 3) { g.fillStyle = 'rgba(200,200,200,0.25)'; g.fillRect(0, y, W, 1); } }, [0.04, 0.04], false) });
MATS.blackout = new THREE.MeshStandardMaterial({ color: 0x7a746b, roughness: 1.0, envMapIntensity: 0.4, side: THREE.DoubleSide, map: weaveTex('flat') });
MATS.curtainTrack = std({ color: 0xf2f2ef, roughness: 0.4, metalness: 0.2 });
const curtains = [];
function curtainProbe(bx, by, z, dir) {          // inner wall face straight ahead (ignores glass), in three coords
  const from = b2t(bx, by, z), d = b2t(dir[0], dir[1]).normalize(), r = new THREE.Raycaster(from, d, 0, 3);
  const h = r.intersectObjects(collidables.filter((o) => o.material !== MATS.glass && /^collide/i.test(o.name || '')), false)[0];   // building walls only
  return h ? from.clone().addScaledVector(d, h.distance) : null;
}
function makeCurtainPanel(anchor, lead, n, top, Wmin, mat, folds) {
  const axis = lead.clone().sub(anchor).setY(0), W = axis.length(); axis.normalize();
  const nu = Math.max(40, Math.round(folds * 8)), nv = 8, geo = new THREE.PlaneGeometry(1, 1, nu, nv);
  const m = new THREE.Mesh(geo, mat); m.castShadow = mat === MATS.blackout; m.receiveShadow = true; m.renderOrder = mat === MATS.sheer ? 3 : 0;
  m.frustumCulled = false; scene.add(m);
  return { anchor: anchor.clone().setY(0), axis, n: n.clone(), W, Wmin, top, folds, mesh: m, nu, nv };
}
function shapeCurtainPanel(p, e) {
  const Wv = p.W * (1 - e) + p.Wmin * e, A = 0.012 + 0.032 * e, P = p.mesh.geometry.attributes.position, UV = p.mesh.geometry.attributes.uv;
  for (let j = 0; j <= p.nv; j++) for (let i = 0; i <= p.nu; i++) {
    const k = j * (p.nu + 1) + i, u = i / p.nu, v = 1 - j / p.nv, z = 0.012 + v * (p.top - 0.012);
    const wave = Math.sin(u * p.folds * Math.PI * 2), sway = (1 - v) * 0.006 * Math.sin(u * 7.0);
    const off = 0.06 + A * (1 + wave) * (0.85 + 0.15 * v) + sway;
    const x = p.anchor.x + p.axis.x * u * Wv + p.n.x * off, zz = p.anchor.z + p.axis.z * u * Wv + p.n.z * off;
    P.setXYZ(k, x, z, zz); UV.setXY(k, u * p.W, z);
  }
  P.needsUpdate = UV.needsUpdate = true; p.mesh.geometry.computeVertexNormals(); p.mesh.geometry.computeBoundingSphere();
}
function shapeCurtain(c) { for (const p of c.panels) shapeCurtainPanel(p, c.t); }
function addCurtain(def) {
  const A = def.A || curtainProbe(def.a[0], def.a[1], def.top, def.dir), B = def.B || curtainProbe(def.b[0], def.b[1], def.top, def.dir); if (!A || !B) return null;
  const n = b2t(-def.dir[0], -def.dir[1]).normalize(), panels = [];
  const mid = A.clone().lerp(B, 0.5);
  if (def.split) { panels.push(makeCurtainPanel(A, mid.clone().addScaledVector(B.clone().sub(A).normalize(), 0.03), n, def.top, def.Wmin, def.mat, def.folds / 2));
    panels.push(makeCurtainPanel(B, mid.clone().addScaledVector(A.clone().sub(B).normalize(), 0.03), n, def.top, def.Wmin, def.mat, def.folds / 2)); }
  else panels.push(makeCurtainPanel(def.anchorB ? B : A, def.anchorB ? A : B, n, def.top, def.Wmin, def.mat, def.folds));
  // ceiling track
  const L = A.distanceTo(B) + 0.06, track = new THREE.Mesh(new THREE.BoxGeometry(L, 0.018, 0.03), MATS.curtainTrack);
  track.position.copy(mid).addScaledVector(n, 0.07).setY(def.top + 0.012); track.rotation.y = Math.atan2(-(B.z - A.z), B.x - A.x); track.castShadow = true; scene.add(track);
  const c = { kind: 'curtain', id: def.id, label: 'Curtain', name: def.name, room: def.room, panels, track, t: def.open ?? 1, target: def.open ?? 1, parts: [], center: mid.clone().addScaledVector(n, 0.15).setY(1.2) };
  shapeCurtain(c); doors.push(c); curtains.push(c); return c;
}
function buildCurtains() {
  if (curtains.length) return;
  // balcony: one sheer across the whole glazing, gathering towards the TV end (keeps the door side clear)
  addCurtain({ id: 'cur_bal', name: 'the sheer curtain', room: 'living', a: [0.62, 8.05], b: [4.38, 8.05], dir: [0, 1], top: 2.52, Wmin: 0.42, mat: MATS.sheer, folds: 26, anchorB: true, open: 1 });
  // bedroom: two blackout panels meeting in the middle of the window, each stacking at its side
  addCurtain({ id: 'cur_bed', name: 'the blackout curtains', room: 'bed', a: [7.58, 7.4], b: [9.33, 7.32], dir: [0, 1], top: 2.48, Wmin: 0.26, mat: MATS.blackout, folds: 14, split: true, open: 1 });
}
function curtainLead(c, out) { const p = c.panels[0], Wv = p.W * (1 - c.t) + p.Wmin * c.t; return out.copy(p.anchor).addScaledVector(p.axis, Wv).addScaledVector(p.n, 0.16).setY(1.25); }
function updateCurtain(d, dt) {
  const dl = d.target - d.t; if (Math.abs(dl) < 1e-4) { if (d.t !== d.target) { d.t = d.target; shapeCurtain(d); } return; }
  d.t += Math.sign(dl) * Math.min(Math.abs(dl), Math.max(0.12 * dt, Math.abs(dl) * dt * 3.2));   // eases in to its target, like a motor
  shapeCurtain(d); shadowDirty = true;
}
// bedroom darkness: with the blackout pair closed, the sky light (hemi + environment) is shut out of the bedroom while you're in it
let roomDarkK = 0;
function roomDarkTick() {
  const c = curtains.find((x) => x.id === 'cur_bed'); if (!c) return;
  const [bx, by] = toBl(player.pos), inBed = mode === 'walk' && ROOM_BY_ID.bed && inPoly(bx, by, ROOM_BY_ID.bed.poly);
  const lamp = ['bedA', 'bedB'].reduce((m, id) => Math.max(m, LIGHTS[id] && LIGHTS[id].on ? Math.pow(LIGHTS[id].bri, 1.6) : 0), 0);   // the bedside lamps bounce light around
  const k = inBed ? Math.pow(1 - c.t, 1.5) * 0.97 * (1 - 0.6 * Math.min(1, lamp * 2)) : 0;
  if (Math.abs(k - roomDarkK) < 0.004 && !hemi.userData.dirty) return; roomDarkK = k; hemi.userData.dirty = false;
  hemi.intensity = (hemi.userData.base ?? hemi.intensity) * (1 - k);
  scene.environmentIntensity = (scene.userData.envBase ?? scene.environmentIntensity) * (1 - k);
}
addEventListener('wheel', (e) => {
  const d = doorNear; if (!d || d.kind !== 'curtain' || mode !== 'walk') return;
  e.preventDefault(); d.target = THREE.MathUtils.clamp(d.target - e.deltaY * 0.0011, 0, 1);
}, { passive: false });
