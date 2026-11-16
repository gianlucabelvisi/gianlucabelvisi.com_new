// ------------------------------------------------------------ living: MAX | Zen coffee table and a rug under the sofa group (2026-11-15)
// Zen (max-jessen.dk/max-i-zen-sofabord, Nov 2026): grey travertine top on an oiled oak-veneer base of three radiating panels.
// Ø95 × 40 cm 3.299 kr (før 4.499) = Gianluca's pick ("the larger version"); Ø65 2.599 kr (før 3.499).
const CTAB = { sizes: [{ name: 'Ø95 × 40 cm · 3.299 kr (før 4.499)', D: 0.95, H: 0.40, kr: 3299 }, { name: 'Ø65 cm · 2.599 kr (før 3.499)', D: 0.65, H: 0.40, kr: 2599 }],
  url: 'https://www.max-jessen.dk/max-i-zen-sofabord' };
const ctab = { size: 0, pos: null, angle: 0, group: null, parts: [] };
// Rugs: Gianluca asked to assume one and show colours. Three ILVA rugs (ilva.dk, Nov 2026) in their sizes and colours; colours by eye from the names.
const RUGS = [
  { name: 'Sofus tuftet tæppe', kind: 'boucle', pile: 0.014, url: 'https://ilva.dk/products/sofus-tuftet-taeppe-250-x-350-cm',
    sizes: [{ name: '250 × 350 cm · 4.999 kr', W: 3.5, D: 2.5, kr: 4999 }, { name: '160 × 230 cm · 2.399 kr', W: 2.3, D: 1.6, kr: 2399 }, { name: 'Ø250 cm · 3.499 kr', W: 2.5, D: 2.5, kr: 3499, round: true }],
    cols: [{ name: 'Sand', c: 0xcdbd9f }, { name: 'Taupe', c: 0x8f8273 }, { name: 'Cappuccino (tilbud)', c: 0xa98d72 }, { name: 'Chokolade', c: 0x4f3b2f }, { name: 'Københavnergrøn', c: 0x4d5e4a }, { name: 'Off white', c: 0xebe5d9 }] },
  { name: 'Cana tuftet tæppe', kind: 'velvet', pile: 0.012, url: 'https://ilva.dk/products/cana-tuftet-taeppe-200-x-300-cm',
    sizes: [{ name: '200 × 300 cm · 2.999 kr', W: 3.0, D: 2.0, kr: 2999 }, { name: '160 × 230 cm · 1.799 kr', W: 2.3, D: 1.6, kr: 1799 }],
    cols: [{ name: 'Lysegrå', c: 0xc8c6c1 }, { name: 'Grå', c: 0x7b7b79 }, { name: 'Taupe', c: 0x8b7f72 }, { name: 'Chokolade', c: 0x4b3a30 }, { name: 'Indigo (tilbud)', c: 0x2f3d5a }] },
  { name: 'Runi kelim tæppe (uld)', kind: 'canvas', pile: 0.007, url: 'https://ilva.dk/products/runi-kelim-taeppe-250-x-350-cm',
    sizes: [{ name: '250 × 350 cm · 2.999 kr', W: 3.5, D: 2.5, kr: 2999 }, { name: '190 × 290 cm · 1.999 kr', W: 2.9, D: 1.9, kr: 1999 }, { name: '160 × 230 cm · 1.399 kr', W: 2.3, D: 1.6, kr: 1399 }],
    cols: [{ name: 'Sand', c: 0xd3c4a6 }, { name: 'Lysegrå', c: 0xc5c3bd }, { name: 'Hvid', c: 0xefebe3 }, { name: 'Hvid / sand (stribet)', c: 0xe6dccb, stripe: 0xc9b48f }] },
];
const rug = { m: 0, size: 0, col: 0, pos: null, angle: null, on: true, group: null, parts: [] };
function sofaFrontInfo() {                               // where the open area in front of the sofa is (Blender coords) and which way the sofa faces
  const S = liv.sofa, M = liv.media; if (!S || !M) return null;
  const { f, x } = sofaFrame(), cfg = SOFAS[S.cfg], L = cfg.L, end = sofaEnds(cfg, -1)[0], RW = end.t !== 'arm' ? (end.W || SD) : 0;
  const tvDist = S.O.clone().sub(M.base).dot(M.n);        // sofa back → TV wall
  const zFront = SD, zTV = tvDist - 0.325;
  const cxl = (-L / 2 + RW + L / 2) / 2;                  // middle of the seats that face the TV (the return is on the −x side)
  return { f, x, S, L, RW, zFront, zTV, cxl, P: (lx, lz) => toBl(S.O.clone().addScaledVector(x, lx).addScaledVector(f, lz)), ang: Math.atan2(-f.z, f.x) };
}
function buildCoffeeTable(tryPos) {
  if (ctab.group) { scene.remove(ctab.group); dropParts(ctab.parts); ctab.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); ctab.group = null; }
  const I = sofaFrontInfo(); if (!I) return false;
  if (!ctab.pos) { ctab.pos = I.P(I.cxl, I.zFront + 0.46 + CTAB.sizes[ctab.size].D / 2); ctab.pos[1] = toBl(liv.media.base.clone().addScaledVector(liv.media.a, liv.media.offset))[1]; }   // 46 cm in front of the sofa, centred on the TV (clears the Nilo footstool)
  const p = tryPos || ctab.pos, cx = THREE.MathUtils.clamp(p[0], LIV_BOX.x0 + 0.5, LIV_BOX.x1 - 0.5), cy = THREE.MathUtils.clamp(p[1], LIV_BOX.y0 + 0.5, LIV_BOX.y1 - 0.5);
  const ok = Math.abs(cx - p[0]) < 1e-6 && Math.abs(cy - p[1]) < 1e-6; ctab.pos = [cx, cy];
  const Z = CTAB.sizes[ctab.size], R = Z.D / 2, H = Z.H, TT = 0.03;
  const g = new THREE.Group(); g.position.copy(b2t(cx, cy, 0)); g.rotation.y = ctab.angle;
  const parts = [], add = (geo, m, px, py, pz, solid = true) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; g.add(o); if (solid) parts.push(o); return o; };
  const trav = stdc({ color: 0xb3aba0, roughness: 0.5, map: stoneTex() }), oak = stdc({ color: 0xd2ad7c, roughness: 0.6, map: grainTex() });
  add(new THREE.CylinderGeometry(R, R, TT, 64), trav, 0, H - TT / 2, 0);
  add(new THREE.CylinderGeometry(R - 0.004, R - 0.012, 0.004, 64), stdc({ color: 0xb9b0a3, roughness: 0.6 }), 0, H - TT - 0.002, 0, false);
  const reach = R * 0.62, ph = H - TT;
  for (let k = 0; k < 3; k++) {                            // three oak panels radiating from the centre, each with an arch cut out on its inner side
    const a = k * Math.PI * 2 / 3 + Math.PI / 6, sh = new THREE.Shape(), c0 = 0.03, ar = ph * 0.55;
    sh.moveTo(c0 + ar, 0); sh.lineTo(reach, 0); sh.lineTo(reach, ph); sh.lineTo(c0, ph); sh.lineTo(c0, ar); sh.absarc(c0, 0, ar, Math.PI / 2, 0, true);
    const pan = add(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), oak, 0, 0, 0);
    pan.geometry.translate(0, 0, -0.02); pan.rotation.y = -a;
  }
  add(new THREE.CylinderGeometry(0.05, 0.05, ph, 20), oak, 0, ph / 2, 0);   // the panels meet in a core
  // a few things on top: two books, a bowl
  add(new THREE.BoxGeometry(0.24, 0.035, 0.17), stdc({ color: 0x7a2e2a, roughness: 0.8 }), -0.12, H + 0.0175, 0.05, false);
  add(new THREE.BoxGeometry(0.21, 0.025, 0.15), stdc({ color: 0xe8e2d4, roughness: 0.8 }), -0.12, H + 0.0475, 0.05, false);
  add(new THREE.CylinderGeometry(0.085, 0.05, 0.055, 28), stdc({ color: 0x3b3a36, roughness: 0.5 }), 0.16, H + 0.03, -0.08, false);
  { const mg = mergeByMaterial(g, new Set(parts)); parts.length = 0; parts.push(...mg.solids); }
  scene.add(g); g.updateMatrixWorld(true);
  const door = { kind: 'swap', label: 'Coffee table', name: 'MAX Zen coffee table', parts, center: g.position.clone().setY(0.3),
    swap: () => selectFurniture(selected === ctabMover ? null : ctabMover), prompt: () => (selected === ctabMover ? 'Done with the coffee table' : 'Move the coffee table') };
  door._mover = ctabMover;
  for (const q of parts) { q.userData.door = door; q.userData.furniture = true; collidables.push(q); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Coffee table'); if (di >= 0) doors.splice(di, 1);
  doors.push(door); ctab.group = g; ctab.parts = parts; shadowDirty = true;
  return ok;
}
const ctabMover = {
  name: 'Coffee table', title: () => `MAX | Zen sofabord · ${CTAB.sizes[ctab.size].name.split(' · ')[0]}`,
  anchor: () => (ctab.group ? ctab.group.position.clone().setY(0.9) : null),
  axis: () => b2t(1, 0).normalize(), axis2: () => b2t(0, 1).normalize(),
  shift: (dir) => { if (!buildCoffeeTable([ctab.pos[0] + dir * 0.05, ctab.pos[1]])) showToast('Can’t go further'); },
  shift2: (dir) => { if (!buildCoffeeTable([ctab.pos[0], ctab.pos[1] + dir * 0.05])) showToast('Can’t go further'); },
  selects: [{ id: 'ctsz', label: 'Size', options: () => CTAB.sizes.map((z) => ({ label: z.name })), get: () => ctab.size, set: (i) => { ctab.size = i; buildCoffeeTable(); } }],
  link: () => ({ href: CTAB.url, text: 'Max Jessen · MAX | Zen sofabord ↗' }),
  info: () => { const I = sofaFrontInfo(), Z = CTAB.sizes[ctab.size]; let gaps = '';
    if (I && ctab.group) { const c = ctab.group.position.clone().sub(I.S.O), z = c.dot(I.f); gaps = ` · ${(z - Z.D / 2 - I.zFront).toFixed(2)} m to the sofa · ${(I.zTV - z - Z.D / 2).toFixed(2)} m to the TV units`; }
    return `Grey travertine top, oiled oak-veneer base · Ø${Math.round(Z.D * 100)} × ${Math.round(Z.H * 100)} cm${gaps}`; },
};
function rugTex(R, C) {                                   // a striped kelim gets its stripes; the others the shared fabric texture
  if (!C.stripe) return weaveTex(R.kind);
  const k = new THREE.Color(C.stripe).getStyle();
  return canvasTex(256, 256, (g, W) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, W); g.fillStyle = 'rgba(205,185,150,1)'; for (let y = 0; y < W; y += 64) g.fillRect(0, y, W, 22); }, [0.5, 0.5]);
}
function buildRug(tryPos) {
  if (rug.group) { scene.remove(rug.group); dropParts(rug.parts); rug.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); rug.group = null; }
  if (!rug.on) { const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Rug'); if (di >= 0) doors.splice(di, 1); return true; }
  const I = sofaFrontInfo(); if (!I) return false;
  const R = RUGS[rug.m], Z = R.sizes[Math.min(rug.size, R.sizes.length - 1)], C = R.cols[Math.min(rug.col, R.cols.length - 1)];
  if (!rug.pos) { rug.pos = I.P(I.cxl, I.zFront - 0.25 + Z.D / 2); rug.pos[1] = toBl(liv.media.base.clone().addScaledVector(liv.media.a, liv.media.offset))[1]; rug.angle = I.ang; }   // centred on the TV like the coffee table
  const p = tryPos || rug.pos; rug.pos = [p[0], p[1]];
  const g = new THREE.Group(); g.position.copy(b2t(p[0], p[1], 0)); g.rotation.y = rug.angle - Math.PI / 2;
  const m = new THREE.MeshStandardMaterial({ color: C.c, roughness: 1, map: rugTex(R, C), bumpMap: weaveTex(R.kind), bumpScale: 0.003 });
  const geo = Z.round ? new THREE.CylinderGeometry(Z.W / 2, Z.W / 2, R.pile, 72) : softBox(Z.W, R.pile, Z.D, R.pile / 2 - 0.0005);
  if (Z.round) { const P = geo.attributes.position, UVa = geo.attributes.uv; for (let i = 0; i < P.count; i++) UVa.setXY(i, P.getX(i), P.getZ(i)); }
  const o = new THREE.Mesh(geo, m); o.position.y = R.pile / 2 + 0.001; o.receiveShadow = true; g.add(o);
  // a thin invisible slab for the info button and the panel (low enough that it never blocks walking)
  const hit = new THREE.Mesh(Z.round ? new THREE.CylinderGeometry(Z.W / 2, Z.W / 2, 0.02, 32) : new THREE.BoxGeometry(Z.W, 0.02, Z.D), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.01; g.add(hit);
  scene.add(g); g.updateMatrixWorld(true);
  const door = { kind: 'swap', label: 'Rug', name: R.name, parts: [hit], center: g.position.clone().setY(0.05),
    swap: () => selectFurniture(selected === rugMover ? null : rugMover), prompt: () => (selected === rugMover ? 'Done with the rug' : 'Change the rug') };
  door._mover = rugMover; hit.userData.door = door; hit.userData.furniture = true;
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Rug'); if (di >= 0) doors.splice(di, 1);
  doors.push(door); rug.group = g; rug.parts = []; shadowDirty = true;
  return true;
}
const rugMover = {
  name: 'Rug', title: () => `ILVA ${RUGS[rug.m].name} · ${RUGS[rug.m].cols[rug.col].name}`,
  anchor: () => (rug.group ? rug.group.position.clone().setY(0.6) : null),
  axis: () => b2t(1, 0).normalize(), axis2: () => b2t(0, 1).normalize(),
  shift: (dir) => buildRug([rug.pos[0] + dir * 0.05, rug.pos[1]]), shift2: (dir) => buildRug([rug.pos[0], rug.pos[1] + dir * 0.05]),
  rotate: (dir) => { rug.angle += dir * Math.PI / 12; buildRug(); }, angle: () => rug.angle,
  get selects() { return [
    { id: 'rgm', label: 'Rug', options: () => RUGS.map((r) => ({ label: r.name })), get: () => rug.m, set: (i) => { rug.m = i; rug.size = 0; rug.col = 0; buildRug(); buildMoverSelects(rugMover); } },
    { id: 'rgs', label: 'Size', options: () => RUGS[rug.m].sizes.map((z) => ({ label: z.name })), get: () => rug.size, set: (i) => { rug.size = i; buildRug(); } },
    { id: 'rgc', label: 'Colour', options: () => RUGS[rug.m].cols.map((c) => ({ label: c.name })), get: () => rug.col, set: (i) => { rug.col = i; buildRug(); } },
  ]; },
  variant: { label: () => (rug.on ? 'No rug' : 'Put the rug back'), run: () => { rug.on = !rug.on; buildRug(); if (!rug.on) { selectFurniture(null); showToast('Rug removed (open Plan → Layouts or reload to bring it back)'); } } },
  link: () => ({ href: RUGS[rug.m].url, text: `ILVA · ${RUGS[rug.m].name} ↗` }),
  info: () => { const Z = RUGS[rug.m].sizes[rug.size]; return `${Z.name.split(' · ')[0]} · reaches ~25 cm under the sofa's front legs, coffee table in the middle · ◀▶ ▲▼ move, ⟲ ⟳ turn`; },
};
