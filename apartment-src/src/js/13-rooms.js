// ------------------------------------------------------------ the rooms nobody had furnished yet: real products (ikea.dk prices, Oct 2026)
// Bedroom nightstands (built by buildBed), the entrance drop zone, bathroom towel rail + wall cabinet, the balcony set.
const IK = (slug) => `https://www.ikea.com/dk/da/p/${slug}/`;
const NIGHT = [
  { brand: 'IKEA', name: 'TONSTAD', W: 0.40, D: 0.40, H: 0.59, kr: 999, style: 'legs', url: IK('tonstad-sengebord-egetraesfiner-80489322'), cols: [{ name: 'Egetræsfiner', c: 0xc79f6e, grain: true }], desc: 'oak veneer, drawer over an open shelf, slim legs' },
  { brand: 'IKEA', name: 'RÅDMANSÖ', W: 0.54, D: 0.38, H: 0.58, kr: 599, style: 'box', url: IK('radmansoe-sengebord-brun-valnoddetraesmonster-80593597'), cols: [{ name: 'Brun valnøddetræsmønster', c: 0x6b4a32, grain: true }], desc: 'walnut look, drawer + open niche' },
  { brand: 'IKEA', name: 'HEMNES', W: 0.46, D: 0.35, H: 0.70, kr: 499, style: 'hemnes', url: IK('hemnes-sengebord-gragron-lysebrun-med-bejdse-50610739'), cols: [{ name: 'Grågrøn / lysebrun bejdse', c: 0x7d8a78, top: 0xb08a5e }], desc: 'solid pine, drawer + shelf' },
  { brand: 'IKEA', name: 'STOMSÖ', W: 0.36, D: 0.29, H: 0.20, kr: 199, style: 'wall', url: IK('stomsoe-vaegmonteret-sengebord-birketraesmonstret-hvid-bla-70567805'), cols: [{ name: 'Birk / hvid / blå', c: 0xd9c19a, grain: true }], desc: 'wall-mounted with a drawer: frees the floor by the door' },
];
const night = { m: 0, col: 0 };
// called by buildBed with its own add(); local frame: +x into the room from the headboard wall, z along the wall (+z = door side)
function buildNightstands(add, w, room) {
  const N = NIGHT[night.m], C = N.cols[night.col] || N.cols[0];
  const body = stdc({ color: C.c, roughness: 0.6 }), top = stdc({ color: C.top ?? C.c, roughness: 0.55 }), dark = stdc({ color: 0x2a2622, roughness: 0.5, metalness: 0.3 });
  const shade = stdc({ color: new THREE.Color(C.c).multiplyScalar(0.82).getHex(), roughness: 0.6 });
  const spots = [];
  [1, -1].forEach((sg, k) => {
    const free = room[k] - 0.03; if (free < Math.min(N.W, 0.3)) return;
    const W = Math.min(N.W, free), D = N.D, zc = sg * (w / 2 + 0.04 + W / 2), xc = 0.02 + D / 2;
    if (N.style === 'legs') {          // TONSTAD: box with a drawer on four slim legs, open shelf under
      const yB = 0.22, boxH = N.H - yB;
      add(new THREE.BoxGeometry(D, 0.02, W), top, xc, N.H - 0.01, zc);
      add(new THREE.BoxGeometry(D, boxH - 0.02, 0.016), body, xc, yB + (boxH - 0.02) / 2, zc - W / 2 + 0.008);
      add(new THREE.BoxGeometry(D, boxH - 0.02, 0.016), body, xc, yB + (boxH - 0.02) / 2, zc + W / 2 - 0.008);
      add(new THREE.BoxGeometry(D - 0.01, 0.016, W - 0.03), body, xc, yB + 0.008, zc);
      add(new THREE.BoxGeometry(0.016, 0.13, W - 0.04), shade, 0.02 + D - 0.006, N.H - 0.09, zc);
      add(new THREE.BoxGeometry(D - 0.06, 0.014, W - 0.06), body, xc, 0.1, zc);
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) add(new THREE.CylinderGeometry(0.012, 0.01, yB, 8), body, xc + dx * (D / 2 - 0.025), yB / 2, zc + dz * (W / 2 - 0.025));
    } else if (N.style === 'box') {    // RÅDMANSÖ: solid box on a recessed plinth, drawer over an open niche
      add(new THREE.BoxGeometry(D - 0.04, 0.06, W - 0.04), dark, xc, 0.03, zc);
      add(new THREE.BoxGeometry(D, N.H - 0.06, W), body, xc, 0.06 + (N.H - 0.06) / 2, zc);
      add(new THREE.BoxGeometry(0.01, 0.17, W - 0.03), shade, 0.02 + D + 0.004, N.H - 0.1, zc);
      add(new THREE.BoxGeometry(0.012, 0.2, W - 0.05), stdc({ color: 0x241a12, roughness: 0.9 }), 0.02 + D - 0.002, 0.25, zc);
      add(new THREE.BoxGeometry(0.012, 0.012, 0.12), dark, 0.02 + D + 0.012, N.H - 0.1, zc);
    } else if (N.style === 'hemnes') { // HEMNES: overhanging top, drawer, open shelf, short legs
      const yB = 0.12;
      add(new THREE.BoxGeometry(D + 0.02, 0.025, W + 0.02), top, xc, N.H - 0.0125, zc);
      for (const e of [-1, 1]) add(new THREE.BoxGeometry(D, N.H - 0.025, 0.04), body, xc, (N.H - 0.025) / 2, zc + e * (W / 2 - 0.02));
      add(new THREE.BoxGeometry(D, 0.02, W - 0.08), body, xc, yB, zc);
      add(new THREE.BoxGeometry(0.018, 0.16, W - 0.08), body, 0.02 + D - 0.009, N.H - 0.11, zc);
      add(new THREE.SphereGeometry(0.014, 10, 8), stdc({ color: 0x9a7b4f, roughness: 0.4, metalness: 0.4 }), 0.02 + D + 0.01, N.H - 0.11, zc);
      add(new THREE.BoxGeometry(D - 0.02, 0.018, W - 0.08), body, xc, 0.32, zc);
      add(new THREE.BoxGeometry(0.012, N.H - 0.2, W - 0.08), body, 0.026, (N.H + 0.1) / 2, zc);
    } else {                           // STOMSÖ: a floating box with a drawer, 48 cm up
      const y0 = 0.48;
      add(new THREE.BoxGeometry(D, N.H, W), body, xc, y0 + N.H / 2, zc);
      add(new THREE.BoxGeometry(0.01, N.H * 0.55, W - 0.03), stdc({ color: 0xf2f1ec, roughness: 0.5 }), 0.02 + D + 0.004, y0 + N.H * 0.3, zc);
      add(new THREE.BoxGeometry(0.012, 0.03, 0.05), stdc({ color: 0x4f6f9a, roughness: 0.5 }), 0.02 + D + 0.012, y0 + N.H * 0.3, zc);
    }
    spots[k] = new THREE.Vector3(xc + 0.02, 0, zc);
  });
  return spots;
}
// ---- entrance, bathroom, balcony
const ROOMF = {
  shoe: [{ name: 'None' },
    { name: 'BISSA skoskab 2 rum, hvid', brand: 'IKEA', W: 0.49, D: 0.28, H: 0.93, kr: 299, c: 0xf3f2ee, flaps: 2, url: IK('bissa-skoskab-med-2-rum-hvid-70530256') },
    { name: 'BISSA skoskab 3 fag, sortbrun', brand: 'IKEA', W: 0.49, D: 0.28, H: 1.35, kr: 349, c: 0x3a302a, flaps: 3, url: IK('bissa-skoskab-3-fag-sortbrun-60530209') },
    { name: 'BRUSALI skoskab 3 fag, hvid', brand: 'IKEA', W: 0.61, D: 0.30, H: 1.30, kr: 549, c: 0xf3f2ee, flaps: 3, legs: true, url: IK('brusali-skoskab-3-fag-hvid-80480393') }],
  above: [{ name: 'Nothing' },
    { name: 'TJUSIG krog til væg 60 cm, hvid', brand: 'IKEA', kind: 'hooks', W: 0.60, kr: 79, c: 0xf2f1ec, url: IK('tjusig-krog-til-dor-vaeg-hvid-70242656') },
    { name: 'LINDBYN spejl 40 × 130, hvid', brand: 'IKEA', kind: 'mirror', W: 0.40, H: 1.30, kr: 299, c: 0xf2f1ec, url: IK('lindbyn-spejl-hvid-30493699') },
    { name: 'STOCKHOLM spejl Ø60, egetræsfiner', brand: 'IKEA', kind: 'round', W: 0.60, H: 0.60, kr: 549, c: 0xc79f6e, url: IK('stockholm-spejl-egetraesfiner-50591585') }],
  rail: [{ name: 'None' },
    { name: 'BROGRUND håndklædestang 67 cm', brand: 'IKEA', W: 0.67, kr: 99, c: 0xc9ccd0, url: IK('brogrund-handklaedestang-rustfrit-stal-30328534') },
    { name: 'BROFJÄRDEN håndklædestang 74 cm', brand: 'IKEA', W: 0.74, kr: 99, c: 0xd6d9dc, url: IK('brofjaerden-handklaedestang-kromeffekt-50582232') },
    { name: 'SKOGSVIKEN håndklædestang 60 cm, sort', brand: 'IKEA', W: 0.60, kr: 49, c: 0x1e1e1e, url: IK('skogsviken-handklaedestang-sort-60423822') }],
  cab: [{ name: 'None' },
    { name: 'ÄNGSJÖN vægskab 40 × 15 × 95, egetræsmønstret', brand: 'IKEA', W: 0.40, D: 0.15, H: 0.95, kr: 695, c: 0xc39a6a, url: IK('aengsjoen-vaegskab-med-lage-egetraesmonstret-20535077') },
    { name: 'HAVBÄCK vægskab 40 × 15 × 95, hvid', brand: 'IKEA', W: 0.40, D: 0.15, H: 0.95, kr: 545, c: 0xf3f2ee, url: IK('havbaeck-vaegskab-med-lage-hvid-40534996') },
    { name: 'HAGAÅN åbent vægskab 40 × 15 × 95, eg', brand: 'IKEA', W: 0.40, D: 0.15, H: 0.95, kr: 700, c: 0xc39a6a, open: true, url: IK('hagaan-abent-vaegskab-egetraesmonstret-70535522') }],
  balc: [{ name: 'None' },
    { name: 'SUNDSÖ bord 65 × 65 + 2 klapstole, gul', brand: 'IKEA', kind: 'bistro', kr: 799, c: 0xe2b23a, url: IK('sundsoe-bord-og-2-klapstole-udendors-gul-gul-s29573022'), desc: 'powder-coated steel, folding' },
    { name: 'VISINGSÖ bord 70 × 70 + 2 stole, mørkegrøn', brand: 'IKEA', kind: 'bistro', kr: 1735, c: 0x2f4a3a, cush: 0xd8ccb4, url: IK('visingsoe-visingsoe-bord-og-2-stole-udendors-morkegron-morkegron-froesoen-duvholmen-beige-s89615533'), desc: 'steel, with beige seat pads' }],
};
const ENTRANCE_EMPTY = true;   // the drop zone by the living-room opening is undecided: nothing built, nothing on the list
const roomsState = { shoe: 1, above: 1, rail: 0, cab: 1, balc: 2 };   // balc 2 = VISINGSÖ (2026-11-17)   // rail off: the bathroom already has a towel ladder
const roomF = { groups: [], parts: [], doorObjs: [] };
function clearRoomFurniture() {
  for (const g of roomF.groups) { scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  for (const p of roomF.parts) { const i = collidables.indexOf(p); if (i >= 0) collidables.splice(i, 1); }
  for (const d of roomF.doorObjs) { const i = doors.indexOf(d); if (i >= 0) doors.splice(i, 1); }
  roomF.groups = []; roomF.parts = []; roomF.doorObjs = [];
}
// a group placed against a wall: origin on the wall face at (bx, by), local +x out of the wall into the room, local z along the wall
function wallGroup(bx, by, nx, ny) { const g = new THREE.Group(); g.position.copy(b2t(bx, by, 0)); g.rotation.y = Math.atan2(-b2t(nx, ny).z, b2t(nx, ny).x); scene.add(g); roomF.groups.push(g); return g; }
function finishArea(g, parts, label, mover, center) {
  { const nested = parts.filter((p) => p.parent !== g), mg = mergeByMaterial(g, new Set(parts)); parts.length = 0; parts.push(...mg.solids, ...nested); }
  const door = { kind: 'swap', label, parts, center, swap: () => selectFurniture(selected === mover ? null : mover), prompt: () => (selected === mover ? 'Done' : `${label}: options`) };
  for (const p of parts) { p.userData.door = door; p.userData.furniture = true; collidables.push(p); roomF.parts.push(p); }
  doors.push(door); roomF.doorObjs.push(door); g.updateMatrixWorld(true);
  mover.anchor = () => center.clone().setY(Math.max(center.y, 1.2) + 0.25);
}
function buildRoomFurniture() {
  clearRoomFurniture();
  const mk = (g, parts) => (geo, mat, x, y, z, solid = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); if (solid) parts.push(m); return m; };
  // entrance: a drop zone on the teknik cupboard's end wall (faces the hall, next to the opening into the living room)
  // 2026-11-16 Gianluca: "remove all options here, we are not set with what to put there yet" → the spot stays empty (ENTRANCE_EMPTY)
  { const S = ROOMF.shoe[roomsState.shoe], A = ROOMF.above[roomsState.above];
    if (!ENTRANCE_EMPTY && (S.W || A.W)) {
      const g = wallGroup(4.92, 2.982, 0, 1), parts = [], add = mk(g, parts);
      if (S.W) { const m = stdc({ color: S.c, roughness: 0.5 }), sh = stdc({ color: new THREE.Color(S.c).multiplyScalar(0.86).getHex(), roughness: 0.5 }), yb = S.legs ? 0.1 : 0;
        add(new THREE.BoxGeometry(S.D, S.H - yb, S.W), m, S.D / 2, yb + (S.H - yb) / 2, 0);
        const fh = (S.H - yb - 0.03) / S.flaps;
        for (let i = 0; i < S.flaps; i++) { add(new THREE.BoxGeometry(0.004, 0.004, S.W - 0.02), sh, S.D + 0.002, yb + 0.015 + fh * (i + 1), 0, false); add(new THREE.BoxGeometry(0.012, 0.02, 0.1), sh, S.D + 0.006, yb + 0.015 + fh * (i + 1) - 0.04, 0, false); }
        if (S.legs) for (const z of [-1, 1]) for (const x of [0.04, S.D - 0.04]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), stdc({ color: 0xd8d4cc, roughness: 0.5 }), x, 0.05, z * (S.W / 2 - 0.04), false);
        add(new THREE.CylinderGeometry(0.07, 0.06, 0.05, 20), stdc({ color: 0xb8936a, roughness: 0.8 }), S.D * 0.5, S.H + 0.025, 0.1, false);   // a little bowl for keys
      }
      if (A.kind === 'hooks') { const m = stdc({ color: A.c, roughness: 0.4, metalness: 0.2 });
        add(new THREE.BoxGeometry(0.012, 0.02, A.W), m, 0.006, 1.78, 0, false);
        for (let i = 0; i < 5; i++) { const z = -A.W / 2 + 0.06 + i * (A.W - 0.12) / 4; add(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), m, 0.04, 1.77, z, false).rotation.z = Math.PI / 2.4; }
      }
      if (A.kind === 'mirror' || A.kind === 'round') { const fr = stdc({ color: A.c, roughness: 0.5 }), gl = stdc({ color: 0xcfd6dc, roughness: 0.05, metalness: 1 });
        const y = A.kind === 'round' ? 1.55 : 1.0 + A.H / 2 + (S.H && S.H > 1.2 ? 0.45 : 0.05);
        if (A.kind === 'round') { const r = A.W / 2; add(new THREE.CylinderGeometry(r, r, 0.03, 48), fr, 0.02, y, 0, false).rotation.z = Math.PI / 2; add(new THREE.CylinderGeometry(r - 0.035, r - 0.035, 0.004, 48), gl, 0.037, y, 0, false).rotation.z = Math.PI / 2; }
        else { add(new THREE.BoxGeometry(0.025, A.H, A.W), fr, 0.0125, y, 0, false); add(new THREE.BoxGeometry(0.004, A.H - 0.04, A.W - 0.04), gl, 0.027, y, 0, false); } }
      if (!parts.length) parts.push(add(new THREE.BoxGeometry(0.03, 0.3, Math.max(0.3, A.W || 0.3)), new THREE.MeshBasicMaterial({ visible: false }), 0.015, 1.5, 0));
      finishArea(g, parts, 'Entrance', entranceMover, b2t(4.92, 3.2, 1.0));
    } }
  // bathroom: towel rail on the south wall (clear of the door's swing), wall cabinet above the toilet
  { const R = ROOMF.rail[roomsState.rail], Cb = ROOMF.cab[roomsState.cab];
    if (R.W || Cb.W) {
      const parts = [];
      if (R.W) { const g = wallGroup(8.66, 1.015, 0, 1), add = mk(g, parts), m = stdc({ color: R.c, roughness: 0.25, metalness: 0.8 });
        add(new THREE.CylinderGeometry(0.01, 0.01, R.W, 12), m, 0.07, 1.2, 0).rotation.x = Math.PI / 2;
        for (const e of [-1, 1]) { add(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 10), m, 0.035, 1.2, e * (R.W / 2 - 0.02)).rotation.z = Math.PI / 2; add(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16), m, 0.006, 1.2, e * (R.W / 2 - 0.02)).rotation.z = Math.PI / 2; }
        const tw = stdc({ color: 0xe9e2d6, roughness: 1 }); add(new THREE.BoxGeometry(0.03, 0.55, 0.42), tw, 0.07, 0.95, -0.1, false); add(new THREE.BoxGeometry(0.03, 0.4, 0.3), stdc({ color: 0xb9a68a, roughness: 1 }), 0.075, 1.02, 0.2, false);
        finishArea(g, parts.splice(0), 'Bathroom', bathMover, b2t(8.66, 1.2, 1.2)); }
      if (Cb.W) { const g = wallGroup(8.4, 2.736, 0, -1), p2 = [], add = mk(g, p2), m = stdc({ color: Cb.c, roughness: 0.55 }), y0 = 1.3;
        if (Cb.open) { for (const e of [-1, 1]) add(new THREE.BoxGeometry(Cb.D, Cb.H, 0.018), m, Cb.D / 2, y0 + Cb.H / 2, e * (Cb.W / 2 - 0.009)); add(new THREE.BoxGeometry(0.012, Cb.H, Cb.W), m, 0.006, y0 + Cb.H / 2, 0);
          for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(Cb.D, 0.018, Cb.W - 0.03), m, Cb.D / 2, y0 + 0.009 + i * (Cb.H - 0.018) / 3, 0);
          for (const [yy, c] of [[y0 + 0.36, 0x9ab0b8], [y0 + 0.68, 0xd9c8b0]]) add(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 14), stdc({ color: c, roughness: 0.4 }), 0.07, yy, -0.08, false); }
        else { add(new THREE.BoxGeometry(Cb.D, Cb.H, Cb.W), m, Cb.D / 2, y0 + Cb.H / 2, 0);
          add(new THREE.BoxGeometry(0.004, Cb.H - 0.01, 0.004), stdc({ color: 0x9a948a, roughness: 0.6 }), Cb.D + 0.002, y0 + Cb.H / 2, Cb.W / 2 - 0.004, false); }
        finishArea(g, p2, 'Bathroom', bathMover, b2t(8.4, 2.6, y0 + 0.5)); }
    } }
  // balcony (2026-11-17 rebuild): a free-standing bistro set west of the double door, on the balcony itself (the facade there is fixed glass),
  // clear of both door leaves; real proportions: table 72 cm high, chairs with 45 cm seats, slatted seats and backs, 84 cm tall.
  { const B = ROOMF.balc[roomsState.balc];
    if (B.kind) {
      const g = wallGroup(1.0, 8.744, 0, 1), parts = [], add = mk(g, parts), Y = -0.02;    // local x = out onto the balcony, z = along the facade (plan x − 1.0)
      const m = stdc({ color: B.c, roughness: 0.5, metalness: 0.45 });
      const rod = (P0, P1, r, mat, grp) => { const v = P1.clone().sub(P0), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), 10), mat); o.position.copy(P0).add(P1).multiplyScalar(0.5);
        o.quaternion.setFromUnitVectors(UP, v.normalize()); o.castShadow = o.receiveShadow = true; grp.add(o); return o; };
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const chair = (x, z, ry) => { const c = new THREE.Group(); c.position.set(x, Y, z); c.rotation.y = ry; g.add(c);   // front = +x
        const SH = 0.45, W = 0.42, D = 0.42, r = 0.011;
        for (let k = 0; k < 5; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.016, W - 0.02), m); sl.position.set(-D / 2 + 0.04 + k * (D - 0.08) / 4, SH, 0); sl.castShadow = sl.receiveShadow = true; c.add(sl); }
        for (const sz of [-1, 1]) {
          const z0 = sz * (W / 2 - 0.01);
          rod(V(-D / 2 + 0.02, 0, z0), V(-D / 2 - 0.05, 0.84, z0), r, m, c);                 // rear leg running up into the back
          rod(V(D / 2 - 0.02, 0, z0), V(D / 2 - 0.05, SH - 0.01, z0), r, m, c);              // front leg
          rod(V(-D / 2, SH - 0.015, z0), V(D / 2 - 0.04, SH - 0.015, z0), r * 0.9, m, c);    // seat rail
          rod(V(-D / 2 + 0.01, 0.16, z0), V(D / 2 - 0.03, 0.16, z0), r * 0.7, m, c);         // low stretcher
        }
        for (const y of [0.6, 0.69, 0.78]) { const t = y / 0.84, bx = -D / 2 + 0.02 - 0.07 * t; const sl = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.055, W - 0.01), m); sl.position.set(bx - 0.008, y, 0); sl.rotation.z = 0.08; sl.castShadow = true; c.add(sl); }
        if (B.cush) { const pad = new THREE.Mesh(softBox(0.38, 0.03, 0.39, 0.012, { top: 0.006 }), stdc({ color: B.cush, roughness: 1 })); pad.position.set(0.005, SH + 0.024, 0); pad.castShadow = true; c.add(pad); }
        const hit = new THREE.Mesh(new THREE.BoxGeometry(D + 0.06, 0.84, W + 0.04), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(-0.02, 0.42, 0); c.add(hit); parts.push(hit);
      };
      // table: square slatted top on a steel frame, 72 cm
      const T = B.name.includes('70') ? 0.7 : 0.65, x0 = 0.86, zc = 0;
      for (let k = 0; k < 7; k++) add(new THREE.BoxGeometry(T / 7 - 0.008, 0.018, T), m, x0 - T / 2 + (k + 0.5) * T / 7, 0.72 - 0.009 + Y, zc, false);
      for (const s2 of [-1, 1]) { add(new THREE.BoxGeometry(T, 0.035, 0.02), m, x0, 0.69 + Y, zc + s2 * (T / 2 - 0.01), false); add(new THREE.BoxGeometry(0.02, 0.035, T), m, x0 + s2 * (T / 2 - 0.01), 0.69 + Y, zc, false); }
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) rod(V(x0 + dx * (T / 2 - 0.025), Y, zc + dz * (T / 2 - 0.025)), V(x0 + dx * (T / 2 - 0.025), 0.7 + Y, zc + dz * (T / 2 - 0.025)), 0.014, m, g);
      { const hit = add(new THREE.BoxGeometry(T, 0.72, T), new THREE.MeshBasicMaterial({ visible: false }), x0, 0.36 + Y, zc); hit.castShadow = false; }
      chair(x0, zc + T / 2 + 0.24, Math.PI / 2); chair(x0, zc - T / 2 - 0.24, -Math.PI / 2);   // seats face the table (front = local +x)
      // a pot of basil on the table
      add(new THREE.CylinderGeometry(0.055, 0.045, 0.1, 18), stdc({ color: 0xb06a43, roughness: 0.9 }), x0 + 0.1, 0.77 + Y, zc + 0.12, false);
      { const hb = new THREE.Group(); hb.position.set(x0 + 0.1, 0.82 + Y, zc + 0.12); hb.add(herbClump('basil', 0.06, 0.16, rng(11))); g.add(hb); }   // nested so the merge keeps its colours
      finishArea(g, parts, 'Balcony', balconyMover, b2t(1.0, 9.6, 0.8));
    }
    buildBalconyHerbs();
  }
  shadowDirty = true;
}
// herbs (2026-11-17, Gianluca): the facade by the balcony is glass, so they hang in planter boxes on the inner side of the railing
const HERB_LOOK = { rosemary: { c: 0x3a5440, h: [0.22, 0.34] }, basil: { c: 0x4f9a3a, h: [0.12, 0.18] }, thyme: { c: 0x6c8456, h: [0.08, 0.12] }, mint: { c: 0x3f8f45, h: [0.12, 0.2] }, parsley: { c: 0x3b8a36, h: [0.14, 0.2] }, chives: { c: 0x4d8f3d, h: [0.2, 0.28] } };
function herbClump(kind, R, H, r) {                       // a small merged bush of the herb's typical shape, base at y = 0
  const L = HERB_LOOK[kind], geos = [], col = new THREE.Color(), cols = [];
  const push = (geo, c) => { const n = geo.attributes.position.count; for (let i = 0; i < n; i++) cols.push(c.r, c.g, c.b); geos.push(geo.toNonIndexed ? geo : geo); };
  const shade = () => col.setHex(L.c).offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.12).clone();
  if (kind === 'rosemary' || kind === 'chives') {          // upright needles / stalks
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = r() * R, h = L.h[0] + r() * (L.h[1] - L.h[0]);
      const g = new THREE.CylinderGeometry(kind === 'chives' ? 0.003 : 0.0045, 0.006, h, 5).translate(0, h / 2, 0); g.rotateZ((r() - 0.5) * 0.35); g.rotateX((r() - 0.5) * 0.35); g.translate(Math.cos(a) * d, 0, Math.sin(a) * d); push(g.toNonIndexed(), shade()); }
  } else {                                               // leafy: flattened leaves on short stems in a mound
    const n = kind === 'thyme' ? 40 : kind === 'parsley' ? 34 : 22, ls = kind === 'thyme' ? 0.012 : kind === 'parsley' ? 0.02 : 0.03;
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * R, h = L.h[0] * 0.3 + r() * (L.h[1] - L.h[0] * 0.3) * (1 - 0.5 * d / R);
      const g = new THREE.SphereGeometry(ls, 6, 4).scale(1, 0.35, 0.7); g.rotateY(r() * 6.28); g.rotateZ((r() - 0.5) * 0.8); g.translate(Math.cos(a) * d, h, Math.sin(a) * d); push(g.toNonIndexed(), shade()); }
  }
  const merged = mergeGeometries(geos.map((g) => { g.deleteAttribute('uv'); return g; }), false); merged.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); mesh.castShadow = true; return mesh;
}
function buildBalconyHerbs() {
  const g = new THREE.Group(); scene.add(g); roomF.groups.push(g);
  const A = [0.045, 10.532], Bp = [4.445, 10.215], at = (x) => [x, A[1] + (Bp[1] - A[1]) * (x - A[0]) / (Bp[0] - A[0])];
  const dir = b2t(Bp[0] - A[0], Bp[1] - A[1]).normalize(), inward = b2t(0, -1).normalize();
  const boxM = stdc({ color: 0x2b2d2c, roughness: 0.6, metalness: 0.3 }), soil = stdc({ color: 0x3a2a1e, roughness: 1 }), r = rng(5);
  const sets = [{ x: 0.55, herbs: ['rosemary', 'thyme', 'chives'] }, { x: 1.35, herbs: ['basil', 'parsley', 'mint'] }];
  for (const S of sets) {
    const [bx, by] = at(S.x + 0.3), c = b2t(bx, by - 0.04, 0).addScaledVector(inward, 0.11), top = 1.08;
    const box = new THREE.Group(); box.position.copy(c); box.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir); g.add(box);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.17), boxM); b.position.y = top - 0.08; b.castShadow = b.receiveShadow = true; box.add(b);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.01, 0.15), soil); s2.position.y = top - 0.012; box.add(s2);
    for (const sx of [-0.2, 0.2]) { const hk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.14), boxM); hk.position.set(sx, top + 0.02, -0.105); box.add(hk); }   // brackets over the handrail
    S.herbs.forEach((k, i) => { const h = herbClump(k, 0.075, 0.2, r); h.position.set(-0.2 + i * 0.2, top - 0.01, 0); box.add(h); });
  }
}
const roomSel = (key, label, after) => ({ id: 'rf_' + key, label, options: () => ROOMF[key].map((o) => ({ label: o.kr ? `${o.name} · ${o.kr} kr` : o.name })), get: () => roomsState[key],
  set: (i) => { roomsState[key] = i; buildRoomFurniture(); if (after) after(); } });
const entranceMover = { name: 'Entrance', title: () => 'Entrance', selects: [roomSel('shoe', 'Shoe cabinet'), roomSel('above', 'On the wall above')],
  link: () => { const S = ROOMF.shoe[roomsState.shoe], A = ROOMF.above[roomsState.above]; return { href: S.url || A.url, text: S.url ? `IKEA · ${S.name.split(' ')[0]} ↗` : A.url ? `IKEA · ${A.name.split(' ')[0]} ↗` : '', ...(S.url && A.url ? { href2: A.url, text2: `IKEA · ${A.name.split(' ')[0]} ↗` } : {}) }; },
  info: () => { const S = ROOMF.shoe[roomsState.shoe]; return `On the teknik cupboard’s end wall, facing the hall (73 cm wide)${S.W ? ` · ${Math.round(S.W * 100)} × ${Math.round(S.D * 100)} × ${Math.round(S.H * 100)} cm` : ''} · the alcove closet still holds coats and shoes`; } };
const bathMover = { name: 'Bathroom', title: () => 'Bathroom', selects: [roomSel('cab', 'Wall cabinet above the toilet')],
  link: () => { const R = ROOMF.rail[roomsState.rail], C = ROOMF.cab[roomsState.cab]; return { href: R.url || C.url, text: R.url ? `IKEA · ${R.name.split(' ')[0]} ↗` : C.url ? `IKEA · ${C.name.split(' ')[0]} ↗` : '', ...(R.url && C.url ? { href2: C.url, text2: `IKEA · ${C.name.split(' ')[0]} ↗` } : {}) }; },
  info: () => { const C = ROOMF.cab[roomsState.cab]; return C.W ? `${Math.round(C.W * 100)} × ${Math.round(C.D * 100)} × ${Math.round(C.H * 100)} cm, 130 cm up over the toilet · the heated towel ladder by the washer stays` : 'Nothing over the toilet'; } };
const balconyMover = { name: 'Balcony', title: () => 'Balcony', selects: [roomSel('balc', 'Table and chairs')],
  link: () => { const B = ROOMF.balc[roomsState.balc]; return B.url ? { href: B.url, text: `IKEA · ${B.name.split(' ')[0]} ↗` } : {}; },
  info: () => { const B = ROOMF.balc[roomsState.balc]; return (B.kind ? `${B.desc} · table 72 cm high, chairs with 45 cm seats · west of the balcony door, clear of both leaves` : 'No table') + ' · herbs in two planter boxes on the railing: rosemary, thyme, chives · basil, parsley, mint'; } };
function roomShopLines(add) {
  const R = roomsState, put = (room, key, o, detail) => { if (o && o.kr) add(room, key, `${o.brand} ${o.name}`, { kr: o.kr, href: o.url, detail: detail || '' }); };
  if (!ENTRANCE_EMPTY) { put('Entrance', 'shoe', ROOMF.shoe[R.shoe]); put('Entrance', 'above', ROOMF.above[R.above]); }
  put('Bathroom', 'rail', ROOMF.rail[R.rail]); put('Bathroom', 'cab', ROOMF.cab[R.cab]);
  put('Balcony', 'balc', ROOMF.balc[R.balc], ROOMF.balc[R.balc].desc);
}
// ------------------------------------------------------------ bathroom finish (2026-11-24, Gianluca: "doesn't look realistic, the sink should have a mirror")
// The room shell and fixtures come from build.py. Here: glazed wall tiles on every wall (the shower keeps its dark tiles in front), a real
// reflecting mirror over the vanity (three's Reflector, only rendered while you're in the bathroom), and the small things on the vanity,
// a bath mat, a toilet-roll holder and a plant on the boxed-in cistern.
const bathFx = { mirror: null, was: false, sensor: false };
function buildBathroomFinish() {
  const g = new THREE.Group(); scene.add(g);
  const Hc = 2.6, z0 = 0.004, hy = 2.45;
  const wl = (A, B, dir) => { const h1 = wallHit(A, dir, hy), h2 = wallHit(B, dir, hy); if (!h1 || !h2) return null;   // probe above the fixtures
    const t = h2.p.clone().sub(h1.p).normalize(), n = new THREE.Vector3(-t.z, 0, t.x); if (n.dot(b2t(dir[0], dir[1])) > 0) n.negate(); return { p: h1.p, n }; };
  const W = { n: wl([7.6, 2.0], [8.9, 2.0], [0, 1]), s: wl([7.6, 2.0], [8.9, 2.0], [0, -1]), w: wl([8.0, 2.6], [8.0, 1.5], [-1, 0]), e: wl([8.5, 1.3], [8.5, 2.6], [1, 0]) };
  for (const k of Object.keys(W)) if (!W[k]) return;
  const tan = (L) => new THREE.Vector3(L.n.z, 0, -L.n.x);
  const C = { nw: lineMeet(W.n.p, tan(W.n), W.w.p, tan(W.w)), ne: lineMeet(W.n.p, tan(W.n), W.e.p, tan(W.e)), sw: lineMeet(W.s.p, tan(W.s), W.w.p, tan(W.w)), se: lineMeet(W.s.p, tan(W.s), W.e.p, tan(W.e)) };
  const skin = (A, B, n, za, zb, s0 = 0, s1 = 1) => {           // a tiled sheet on the wall between corners A and B (fractions s0–s1), 2 mm proud
    const L = A.distanceTo(B), a = A.clone().lerp(B, s0), b = A.clone().lerp(B, s1), len = a.distanceTo(b), u0 = s0 * L;
    const geo = new THREE.PlaneGeometry(len, zb - za); const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * len, za + uv.getY(i) * (zb - za));
    const m = new THREE.Mesh(geo, MATS.bathwall); m.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(n, 0.002).setY((za + zb) / 2);
    m.lookAt(m.position.clone().add(n)); m.receiveShadow = true; g.add(m);
  };
  skin(C.nw, C.ne, W.n.n, z0, Hc); skin(C.se, C.sw, W.s.n, z0, Hc); skin(C.ne, C.se, W.e.n, z0, Hc);
  { // the door wall: around the door opening (door 0.95 m wide from the hinge at y 1.19, 2.09 m high)
    const A = C.sw, B = C.nw, L = A.distanceTo(B), t = B.clone().sub(A).normalize(), at = (bx, by) => b2t(bx, by, 0).sub(A).dot(t) / L;
    const d0 = at(7.08, 1.16), d1 = at(7.12, 2.17);
    if (d0 > 0.01) skin(A, B, W.w.n, z0, Hc, 0, d0); skin(A, B, W.w.n, z0, Hc, d1, 1); skin(A, B, W.w.n, 2.1, Hc, d0, d1);
  }
  // the mirror: a live reflection 2 mm in front of the GLB mirror (77 × 104 cm over the vanity, build.py: x 7.21–7.98, front y 3.103, z 1.005–2.045)
  { const w = 7.9733 - 7.2147, h = 2.045 - 1.005, res = lite ? 320 : 640;
    const R = new Reflector(new THREE.PlaneGeometry(w, h), { textureWidth: res, textureHeight: Math.round(res * h / w), color: 0xc9cfd1, clipBias: 0.003 });
    // perf: the reflection is a second full render of the scene; refresh it every other frame (the mirror is seen from 1–3 m, it doesn't need more)
    { const draw = R.onBeforeRender; let k = 0; R.onBeforeRender = function (...args) { if ((k++ & 1) === 0) draw.apply(this, args); }; }
    R.position.copy(b2t((7.2147 + 7.9733) / 2, 3.1028 - 0.002, (1.005 + 2.045) / 2)); R.visible = false; scene.add(R); bathFx.mirror = R; }
  // on the vanity (top z 0.87; basin centred at x 7.59): soap pump, tumbler with toothbrushes, folded hand towel, a small dish
  const M = (c, r = 0.5, m = 0) => stdc({ color: c, roughness: r, metalness: m });
  const put = (geo, mat, bx, by, bz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.copy(b2t(bx, by, bz)); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const T = 0.87, blackM = M(0x1e1e1e, 0.45);
  put(new THREE.CylinderGeometry(0.034, 0.036, 0.15, 24), M(0x8f8a82, 0.35), 7.9, 3.03, T + 0.075); put(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 10), blackM, 7.9, 3.03, T + 0.168);
  put(new THREE.BoxGeometry(0.045, 0.012, 0.014), blackM, 7.9, 3.012, T + 0.18);                                                        // pump nozzle
  put(new THREE.CylinderGeometry(0.036, 0.03, 0.1, 24), M(0xd8d2c6, 0.6), 7.29, 3.03, T + 0.05);                                       // stone tumbler
  for (const [dx, c] of [[-0.01, 0x3a7ca5], [0.012, 0xd98c5f]]) put(new THREE.CylinderGeometry(0.005, 0.005, 0.19, 8), M(c, 0.4), 7.29 + dx, 3.03, T + 0.13, 0, 0, dx * 8);
  put(softBox(0.2, 0.05, 0.14, 0.015, { top: 0.008 }), M(0xe9e4da, 1), 7.86, 2.76, T + 0.025);                                          // folded hand towel
  put(new THREE.CylinderGeometry(0.05, 0.045, 0.012, 24), M(0x2b2b2b, 0.3), 7.32, 2.8, T + 0.006);                                     // dish
  // bath mat in front of the vanity
  put(softBox(0.8, 0.012, 0.5, 0.005), stdc({ color: 0xcfcac0, roughness: 1, map: weaveTex('boucle') }), 7.6, 2.3, 0.006);
  // toilet-roll holder on the cistern box (front face y 2.69) and a plant + candle on its top (z 1.15)
  put(new THREE.BoxGeometry(0.02, 0.02, 0.06), M(0xdadde0, 0.15, 1), 8.72, 2.66, 0.68); put(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 20), M(0xf4f2ee, 0.9), 8.72, 2.62, 0.63, 0, 0, Math.PI / 2);
  put(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 20), M(0xe2ddd3, 0.5), 8.52, 2.725, 1.195);
  { const pl = new THREE.Group(); pl.position.copy(b2t(8.52, 2.725, 1.24)); g.add(pl); const r = rng(77), leaf = M(0x7c9a86, 0.8);
    for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, hgt = 0.12 + r() * 0.12; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.002, hgt, 5), M(0x6a5a3e, 0.8)); st.position.set(Math.cos(a) * 0.01, hgt / 2, Math.sin(a) * 0.01); st.rotation.set(Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25); pl.add(st);
      for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), leaf); l.scale.set(1, 0.3, 1); l.position.set(Math.cos(a) * (0.01 + k * 0.012), 0.04 + k * hgt / 6, Math.sin(a) * (0.01 + k * 0.012)); l.castShadow = true; pl.add(l); } } }
  put(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 20), M(0xefe9dc, 0.8), 8.3, 2.725, 1.18);                                             // candle
  for (const c of [...g.children]) if (c.isGroup) mergeByMaterial(c);
  mergeByMaterial(g);                                            // perf: ~80 small meshes → one per material
  shadowDirty = true;
}
// ------------------------------------------------------------ windowless rooms (2026-11-25): the hall and the bathroom only get daylight through
// their doors, but the web view has no real bounce light, so they looked as bright as the living room. Every lit material samples a plan mask
// (x, y → how much sky/environment fill reaches that spot): 1 in the rooms with windows, ~0.5 in the hall, ~0.4 in the bathroom, softened at the
// doorways. It depends on where the surface is, not where you stand, so a room looks the same from inside and from next door. Walk mode only
// (from above, with the roof off, the rooms are lit from above anyway).
const AMB = { x0: -1, y0: -1, size: 12, k: { hall: 0.5, bath: 0.4 }, on: { value: 0 }, tex: null, sig: 0 };
AMB.tex = canvasTex(512, 512, (g, W) => {
  const px = (x, y) => [(x - AMB.x0) / AMB.size * W, W - (y - AMB.y0) / AMB.size * W];
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, W); g.filter = 'blur(1px)'; g.lineJoin = 'round';
  for (const [id, k] of Object.entries(AMB.k)) { const r = ROOM_BY_ID[id]; if (!r) continue; const v = Math.round(k * 255);
    g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); r.poly.forEach(([x, y], i) => { const [u, w] = px(x, y); if (i) g.lineTo(u, w); else g.moveTo(u, w); }); g.closePath(); g.fill();
    g.strokeStyle = g.fillStyle; g.lineWidth = 0.14 / AMB.size * W; g.stroke(); }
  { const v = Math.round(AMB.k.hall * 255), [u0, w0] = px(5.4, 0.47), [u1, w1] = px(6.55, -0.05); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(u0, w0, u1 - u0, w1 - w0); }   // the front door in its deep reveal   // the polygons are the inner wall faces: grow them ~7 cm so the walls themselves are inside
}, [1, 1], false);
AMB.tex.wrapS = AMB.tex.wrapT = THREE.ClampToEdgeWrapping; AMB.tex.repeat.set(1, 1);
function ambPatch(m) {
  if (!m || !m.isMeshStandardMaterial || m.userData.amb) return; m.userData.amb = true;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) { if (prev) prev.call(this, sh, r);
    sh.uniforms.ambMask = { value: AMB.tex }; sh.uniforms.ambOn = AMB.on;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAmbW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvAmbW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vAmbW; uniform sampler2D ambMask; uniform float ambOn;')
      .replace('#include <lights_fragment_end>', `{ vec2 auv = vec2((vAmbW.x - (${AMB.x0.toFixed(1)})) / ${AMB.size.toFixed(1)}, (-vAmbW.z - (${AMB.y0.toFixed(1)})) / ${AMB.size.toFixed(1)});
        float af = mix(1.0, texture2D(ambMask, auv).r, ambOn); irradiance *= af; iblIrradiance *= af; radiance *= min(1.0, af + 0.15); }
      #include <lights_fragment_end>`); };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|amb'; };
  m.needsUpdate = true;
}
function ambPatchScene() { scene.traverse((o) => { if (!o.isMesh || !o.material || o === bathFx.mirror) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) ambPatch(m); }); }
function bathMirrorTick() {                                   // the reflection costs a second render: only while you're in (or looking into) the bathroom
  AMB.on.value = mode === 'walk' ? 1 : 0;
  if (++AMB.sig % 90 === 1) ambPatchScene();                  // furniture rebuilt since gets patched too
  // a Hue motion sensor: the bathroom spots come on as you come into the hall or the bathroom (so the room already looks right from the
  // corridor) and go off again when you leave both (if the sensor turned them on)
  const rid = mode === 'walk' ? playerRoomId() : null, inBath = rid === 'bath' || rid === 'hall';
  if (inBath !== bathFx.was) { bathFx.was = inBath; const L = LIGHTS.bath;
    if (L && inBath && !L.on) { L.on = true; bathFx.sensor = true; applyLights(); }
    else if (L && !inBath && bathFx.sensor) { L.on = false; bathFx.sensor = false; applyLights(); } }
  const R = bathFx.mirror; if (!R) return;
  // only from in front of it (the bedroom is right behind that wall) and only from the bathroom, or the hall by its open door
  const dist = camera.position.distanceTo(R.position), front = toBl(camera.position)[1] < 3.08, bd = doors.find((x) => x.id === 'door_bath');
  const on = mode === 'walk' && front && (rid === 'bath' || (rid === 'hall' && dist < 3 && bd && bd.t > 0.2));
  if (R.visible !== on) R.visible = on;
}
