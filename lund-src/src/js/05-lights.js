// ============================================================ lamps, light switches and the TV
// LIGHTS[id] = { name, room, on, bri, apply(level) }. Each room has a switch by its door: a click opens that room's lamps.
// Lamps themselves are clickable too. "Auto" switches the evening set on at dusk and everything off at half past midnight.
const LIGHTS = {};
const lightObjs = [];          // three.js lights we created (hidden by day when off)
// a lamp's light: a source in the pool (see 01-core); .intensity works like a three.js light's
function mkPoint(px, py, z, color, dist) { const c = P(px, py), s = lightSrc(c[0], c[1], z, color, dist); return { visible: true, get intensity() { return s.level; }, set intensity(v) { s.level = v; poolDirty = true; } }; }
function mkPointW(x, y, z, color, dist) { const s = lightSrc(x, y, z, color, dist); return { get intensity() { return s.level; }, set intensity(v) { s.level = v; poolDirty = true; } }; }
function mkSpot(px, py, z, tx, ty, tz, color, dist, angle, pen = 0.6, shadow = false) {
  const L = new THREE.SpotLight(color, 0, dist, angle, pen, 1.6); const c = P(px, py), t = P(tx, ty);
  L.position.set(c[0], z, -c[1]); L.target.position.set(t[0], tz, -t[1]); L.visible = true;   // spots stay in the scene (intensity 0 when off)
  if (shadow) { L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.002; }
  scene.add(L, L.target); lightObjs.push(L); return L;
}
const warm = new THREE.Color(0xffd3a4), warm2 = new THREE.Color(0xffe0bc);
function addLight(id, o) { LIGHTS[id] = { on: false, bri: 1, ...o }; }
function glowMat(color = 0xfff1dc) { return std({ color: 0xf6f4ef, emissive: color, emissiveIntensity: 0, roughness: 0.4 }); }
const LUM = {};   // emissive materials by light id

// ---- living room: the arc floor lamp (black dome, gold inside) curving over the sofa
{
  const base = [1088, 404], tip = [995, 600];
  const g = pg(...base);
  lcyl(g, 0.17, 0.18, 0.04, 0, 0, 0, std({ color: 0x1d1d1d, roughness: 0.4, metalness: 0.5 }), 24);
  bake(g, STATIC_C);
  const b = P(...base), t = P(...tip);
  const curve = new THREE.CubicBezierCurve3(w2t(b[0], b[1], FZ + 0.04), w2t(b[0], b[1], FZ + 1.9), w2t(b[0] + (t[0] - b[0]) * 0.55, b[1] + (t[1] - b[1]) * 0.55, FZ + 2.45), w2t(t[0], t[1], FZ + 2.25));
  addStatic(new THREE.TubeGeometry(curve, 40, 0.012, 8), MATS.matblack, {});
  LUM.arc = std({ color: 0xc9a14e, emissive: 0xffc070, emissiveIntensity: 0, roughness: 0.3, metalness: 0.8, side: THREE.BackSide });
  const dome = new THREE.SphereGeometry(0.26, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const outer = dome.clone().translate(t[0], FZ + 1.95, -t[1]); addStatic(outer, MATS.matblack, {});
  const inner = new THREE.SphereGeometry(0.255, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(t[0], FZ + 1.95, -t[1]); addStatic(inner, LUM.arc, { noShadow: true });
  const bulb = new THREE.SphereGeometry(0.05, 12, 8).translate(t[0], FZ + 2.02, -t[1]); LUM.arcBulb = glowMat(0xffd49a); addStatic(bulb, LUM.arcBulb, { noShadow: true });
  const sp = mkSpot(tip[0], tip[1], FZ + 2.0, tip[0], tip[1], FZ, warm, 7, 1.1, 0.7);
  const fill = mkPoint(tip[0], tip[1], FZ + 1.8, warm, 6);
  addLight('arc', { name: 'Arc floor lamp', room: 'living', evening: true, bri: 0.9, pick: () => w2t(t[0], t[1], FZ + 2.0), apply: (lv) => { sp.intensity = 18 * lv; fill.intensity = 2.2 * lv; LUM.arc.emissiveIntensity = 1.4 * lv; LUM.arcBulb.emissiveIntensity = 3 * lv; } });
}// ---- LED strip along the head of the corner window in the living room (Gianluca)
{
  const w = windows.find((x) => x.id === 'win_corner');
  if (w) {
    LUM.cstrip = std({ color: 0xf3f1ec, emissive: 0xffd6a0, emissiveIntensity: 0, roughness: 0.4 });
    const mid = (w.s0 + w.s1) / 2, c = w.at(mid, -0.05), L = w.s1 - w.s0 - 0.06;
    sbox(L, 0.018, 0.012, c[0], c[1], w.z1 - 0.03, w.ang, LUM.cstrip, { noShadow: true });
    const q = w.at(mid, -0.35), pl = mkPointW(q[0], q[1], w.z1 - 0.25, 0xffc98a, 4);
    addLight('cstrip', { name: 'Window LED strip', room: 'living', evening: true, bri: 0.7, pick: () => w2t(c[0], c[1], w.z1 - 0.05), apply: (lv) => { pl.intensity = 1.2 * lv; LUM.cstrip.emissiveIntensity = 3 * lv; } });
  }
}

// ---- dining: the PH 5 style pendant over the table (white shades, grey-lilac undersides)
{
  const c = [215, 205], z0 = FZ + 1.5;
  const lathe = (pts, mat, y) => { const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 40); const p = P(...c); g.translate(p[0], y, -p[1]); addStatic(g, mat, { noShadow: true }); };
  MATS.phWhite = std({ color: 0xf4f3ef, roughness: 0.35, side: THREE.DoubleSide });
  LUM.ph = std({ color: 0xd9d4de, emissive: 0xffe2c0, emissiveIntensity: 0, roughness: 0.4, side: THREE.DoubleSide });
  lathe([[0.25, 0], [0.2, 0.06], [0.12, 0.11], [0.06, 0.13]], MATS.phWhite, z0 + 0.12);
  lathe([[0.17, 0], [0.13, 0.05], [0.07, 0.09]], MATS.phWhite, z0 + 0.04);
  lathe([[0.06, 0], [0.09, -0.03], [0.1, -0.05]], LUM.ph, z0 + 0.03);
  lathe([[0.245, -0.003], [0.2, 0.055], [0.12, 0.105]], LUM.ph, z0 + 0.118);
  const p = P(...c); addStatic(new THREE.CylinderGeometry(0.004, 0.004, FZ + H - z0 - 0.25, 6).translate(p[0], z0 + 0.25 + (FZ + H - z0 - 0.25) / 2, -p[1]), MATS.white, {});
  addStatic(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16).translate(p[0], FZ + H - 0.01, -p[1]), MATS.white, {});
  const sp = mkSpot(c[0], c[1], z0 + 0.05, c[0], c[1], FZ, warm, 6, 1.0, 0.8);
  const fill = mkPoint(c[0], c[1], z0 + 0.2, warm, 5);
  addLight('ph', { name: 'Pendant over the table', room: 'dining', evening: true, pick: () => w2t(p[0], p[1], z0 + 0.1), apply: (lv) => { sp.intensity = 14 * lv; fill.intensity = 1.6 * lv; LUM.ph.emissiveIntensity = 1.2 * lv; } });
}
// ---- kitchen: round ceiling light, LED spots under the wall cabinets
{
  LUM.kceil = glowMat(0xfff4e4);
  const c = P(236, 600);
  addStatic(new THREE.SphereGeometry(0.26, 32, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.35, 1).translate(c[0], FZ + H, -c[1]), LUM.kceil, { noShadow: true, layer: 'above' });
  const L1 = mkPoint(236, 600, FZ + 2.2, 0xfff1e0, 7, 1.4);
  addLight('kceil', { name: 'Kitchen ceiling light', room: 'kitchen', pick: () => w2t(c[0], c[1], FZ + H - 0.05), apply: (lv) => { L1.intensity = 5 * lv; LUM.kceil.emissiveIntensity = 1.6 * lv; } });
  LUM.kspot = std({ color: 0xf4f1ea, emissive: 0xfff0d8, emissiveIntensity: 0, roughness: 0.3 });
  const spots = [[32 + 25, 420], [32 + 25, 560], [32 + 25, 690], [160, 834 - 25], [380, 834 - 25]];
  for (const [x, y] of spots) { const q = P(x, y); addStatic(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 14).translate(q[0], FZ + 1.445, -q[1]), LUM.kspot, { noShadow: true }); }
  const S1 = mkPoint(90, 560, FZ + 1.3, warm2, 2.6), S2 = mkPoint(260, 790, FZ + 1.3, warm2, 2.6), S3 = { intensity: 0 };
  addLight('kspot', { name: 'Spots under the cabinets', room: 'kitchen', evening: true, bri: 0.85, apply: (lv) => { for (const s of [S1, S2]) s.intensity = 2.2 * lv; LUM.kspot.emissiveIntensity = 2.5 * lv; } });
}
// ---- hall: a three-spot track; entrance: round ceiling light
{
  LUM.hall = std({ color: 0xf2f1ee, emissive: 0xfff0dc, emissiveIntensity: 0, roughness: 0.3 });
  const g = pg(546, 1080); lb(g, 0.04, 0.03, 0.9, 0, H - 0.03, 0, MATS.white);
  for (const z of [-0.35, 0, 0.35]) { lcyl(g, 0.035, 0.035, 0.12, 0, H - 0.17, z, MATS.white, 14, { rx: 0.4 }); lcyl(g, 0.03, 0.03, 0.005, 0, H - 0.175, z + 0.03, LUM.hall, 14, { rx: 0.4 }); }
  bake(g, { layer: 'above' });
  const L1 = mkPoint(546, 1000, FZ + 2.2, warm2, 5), L2 = mkPoint(546, 1160, FZ + 2.2, warm2, 5);
  addLight('hall', { name: 'Hall spots', room: 'hall', bri: 0.9, apply: (lv) => { L1.intensity = L2.intensity = 2.6 * lv; LUM.hall.emissiveIntensity = 3 * lv; } });
  LUM.entry = glowMat(0xfff4e4);
  const c = P(440, 1390);
  addStatic(new THREE.SphereGeometry(0.17, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.4, 1).translate(c[0], FZ + H, -c[1]), LUM.entry, { noShadow: true, layer: 'above' });
  const L3 = mkPoint(440, 1390, FZ + 2.2, 0xfff1e0, 5);
  addLight('entry', { name: 'Entrance ceiling light', room: 'entry', apply: (lv) => { L3.intensity = 3 * lv; LUM.entry.emissiveIntensity = 1.6 * lv; } });
}
// ---- bathroom: glass ceiling dome and the light over the mirror
{
  LUM.bath = glowMat(0xffffff);
  const c = P(312, 1050);
  addStatic(new THREE.SphereGeometry(0.15, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.5, 1).translate(c[0], FZ + H, -c[1]), LUM.bath, { noShadow: true, layer: 'above' });
  const g = pg(371, 1241); lb(g, 0.4, 0.04, 0.08, 0, 1.84, -0.1, LUM.bath); bake(g);
  const L1 = mkPoint(312, 1050, FZ + 2.2, 0xfff6ec, 5, 1.4);
  addLight('bath', { name: 'Bathroom lights', room: 'bath', apply: (lv) => { L1.intensity = 4.5 * lv; LUM.bath.emissiveIntensity = 1.8 * lv; } });
}
// ---- bedroom: paper pendant, and the little LED twig lamp on the window sill
{
  LUM.bed = std({ color: 0xf6f4ee, emissive: 0xffe2b8, emissiveIntensity: 0, roughness: 0.9, side: THREE.DoubleSide });
  const c = P(912, 1180);
  addStatic(new THREE.SphereGeometry(0.2, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.4, 1).translate(c[0], FZ + H, -c[1]), LUM.bed, { noShadow: true, layer: 'above' });
  const L1 = mkPoint(912, 1180, FZ + 2.2, warm, 7);
  addLight('bedceil', { name: 'Bedroom ceiling light', room: 'bedroom', pick: () => w2t(c[0], c[1], FZ + H - 0.06), apply: (lv) => { L1.intensity = 3.5 * lv; LUM.bed.emissiveIntensity = 1.3 * lv; } });
  // the LED twig lamp on the sill (as in the bedroom photo): weighted chrome disc, seven thin stems fanning out, a tiny LED at each tip
  LUM.twig = std({ color: 0xffffff, emissive: 0xfff1d8, emissiveIntensity: 0, roughness: 0.3 });
  { const base = P(1150, 1030), z0 = FZ + WIN.sill;
    addStatic(new THREE.CylinderGeometry(0.065, 0.075, 0.025, 28).translate(base[0], z0 + 0.012, -base[1]), MATS.chrome, {});
    const r = rng(5), tw = [];
    for (let k = 0; k < 7; k++) {
      const a = -1.2 + k * 0.4 + (r() - 0.5) * 0.15, along = [-DIRI[0], -DIRI[1]], side = [DIRN[0], DIRN[1]];      // fan across the window, leaning a little into the room
      const reach = 0.12 + r() * 0.12, h = 0.28 + r() * 0.2;
      const end = [base[0] + side[0] * Math.sin(a) * reach + along[0] * 0.04, base[1] + side[1] * Math.sin(a) * reach + along[1] * 0.04];
      const c = new THREE.QuadraticBezierCurve3(w2t(base[0], base[1], z0 + 0.02), w2t(base[0], base[1], z0 + h * 0.7), w2t(end[0], end[1], z0 + h));
      addStatic(new THREE.TubeGeometry(c, 14, 0.0028, 5), MATS.chrome, { noShadow: true });
      const tip = w2t(end[0], end[1], z0 + h);
      addStatic(new THREE.CylinderGeometry(0.012, 0.008, 0.035, 10).translate(tip.x, tip.y - 0.005, tip.z), MATS.chrome, { noShadow: true });
      addStatic(new THREE.SphereGeometry(0.009, 10, 8).translate(tip.x, tip.y - 0.024, tip.z), LUM.twig, { noShadow: true });
    } }
  const L2 = mkPoint(1135, 1030, FZ + WIN.sill + 0.35, warm2, 3);
  addLight('twig', { name: 'Twig lamp on the sill', room: 'bedroom', evening: true, bri: 0.7, pick: () => { const q = P(1150, 1030); return w2t(q[0], q[1], FZ + WIN.sill + 0.25); }, apply: (lv) => { L2.intensity = 0.8 * lv; LUM.twig.emissiveIntensity = 4 * lv; } });
  // bedside lamp on the left nightstand: an opal glass bowl that glows (as in the bedroom photo)
  LUM.bedlamp = std({ color: 0xf6f4ef, emissive: 0xffdcb0, emissiveIntensity: 0, roughness: 0.25, side: THREE.DoubleSide });
  { const g = pg(735, 890, 0, FZ + 0.575);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), LUM.bedlamp);
    bowl.scale.y = 0.55; bowl.position.set(-0.1, 0.056, -0.06); g.add(bowl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.099, 0.004, 6, 40), LUM.bedlamp); rim.rotation.x = Math.PI / 2; rim.position.set(-0.1, 0.056, -0.06); g.add(rim);
    lcyl(g, 0.045, 0.05, 0.006, -0.1, 0, -0.06, MATS.white, 20);
    bake(g, { noShadow: true }); }
  const L3 = mkPoint(728, 884, FZ + 0.8, warm, 3.5);
  addLight('bedlamp', { name: 'Bedside lamp', room: 'bedroom', evening: true, bri: 0.75, pick: () => { const q = P(722, 882); return w2t(q[0], q[1], FZ + 0.63); }, apply: (lv) => { L3.intensity = 1.4 * lv; LUM.bedlamp.emissiveIntensity = 1.4 * lv; } });
  // LED strip along the top of the headboard, washing the wall behind the bed
  LUM.strip = std({ color: 0xffffff, emissive: 0xffe3c0, emissiveIntensity: 0, roughness: 0.4 });
  { const g = pg(900, 849); lb(g, 1.56, 0.012, 0.012, 0, 1.0, 0.065, LUM.strip, { shadow: false }); bake(g, { noShadow: true }); }
  const L4 = mkPoint(840, 862, FZ + 1.05, 0xffe3c0, 2.6), L5 = mkPoint(960, 862, FZ + 1.05, 0xffe3c0, 2.6);
  addLight('strip', { name: 'Headboard LED strip', room: 'bedroom', evening: true, bri: 0.6, apply: (lv) => { L4.intensity = L5.intensity = 0.55 * lv; LUM.strip.emissiveIntensity = 3 * lv; } });
}
// ---- stairwell and gateway: motion-sensor lights (come on when you are there, after dark)
{
  LUM.stair = glowMat(0xffffff);
  for (const [x, y, z] of [[-560, 1460, FZ + 2.52], [130, 1460, FZ + 2.52], [-150, 1000, FZ + 2 * STOREY - 0.08], [-150, 1460, FZ + 2 * STOREY - 0.08]]) { const c = P(x, y); addStatic(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24).translate(c[0], z, -c[1]), LUM.stair, { noShadow: true, layer: 'above' }); }
  const L1 = mkPoint(-560, 1460, FZ + 2.4, 0xfff3e2, 8), L2 = mkPoint(130, 1460, FZ + 2.4, 0xfff3e2, 7), L4 = mkPoint(-150, 1050, FZ + 2 * STOREY - 0.4, 0xfff3e2, 9);
  let L3 = { intensity: 0 };
  if (GATEWAY.at) { const sc = (GATEWAY.s0 + GATEWAY.s1) / 2, c = GATEWAY.at(sc, -GATEWAY.L / 2); addStatic(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24).translate(c[0], 2.95, -c[1]), LUM.stair, { noShadow: true }); const sL = lightSrc(c[0], c[1], 2.7, 0xf3f6ff, 8); L3 = { set intensity(v) { sL.level = v; poolDirty = true; } }; }
  addLight('stair', { name: 'Stairwell (motion sensor)', room: 'stair', auto: true, apply: (lv) => { L1.intensity = L2.intensity = 5 * lv; L4.intensity = 6 * lv; L3.intensity = 5 * lv; LUM.stair.emissiveIntensity = 1.6 * lv; } });
}
// ---- the TV: a click turns it on (a slow picture of Lund's cathedral towers at dusk) and lights the room in blue
{
  const g = pg(456, 446); scene.add(g);
  const tvTex = canvasTex(1024, 576, (c, W, Hh) => {
    const sky = c.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, '#1b2b56'); sky.addColorStop(0.55, '#e4805a'); sky.addColorStop(0.75, '#f7c27a'); sky.addColorStop(1, '#2a2430');
    c.fillStyle = sky; c.fillRect(0, 0, W, Hh);
    c.fillStyle = '#fff3d6'; c.beginPath(); c.arc(W * 0.7, Hh * 0.62, 40, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#20182a';
    // rooftops and two Romanesque towers (a nod to Lund cathedral)
    c.fillRect(0, Hh * 0.74, W, Hh); for (let x = 0; x < W; x += 70) { c.beginPath(); c.moveTo(x, Hh * 0.74); c.lineTo(x + 35, Hh * (0.66 + (x % 3) * 0.02)); c.lineTo(x + 70, Hh * 0.74); c.fill(); }
    for (const x of [W * 0.38, W * 0.47]) { c.fillRect(x, Hh * 0.3, 52, Hh * 0.45); c.beginPath(); c.moveTo(x - 4, Hh * 0.3); c.lineTo(x + 26, Hh * 0.16); c.lineTo(x + 56, Hh * 0.3); c.fill(); }
    c.fillRect(W * 0.38, Hh * 0.52, W * 0.15, Hh * 0.25);
  }, [1, 1]);
  tvTex.repeat.set(1, 1);
  const tvMat = std({ color: 0x050607, emissive: 0xffffff, emissiveMap: tvTex, emissiveIntensity: 0, roughness: 0.15, metalness: 0.3 });
  const frame = lb(g, 0.05, 0.72, 1.24, 0.38, 0.62, 0, MATS.blackgloss);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.68), tvMat); scr.position.set(0.408, 0.62 + 0.36, 0); scr.rotation.y = Math.PI / 2; g.add(scr);
  lb(g, 0.04, 0.16, 0.1, 0.36, 0.46, 0, MATS.matblack);
  const glow = mkPoint(560, 446, FZ + 1.1, 0x8fb4ff, 5);
  collidables.push(frame);
  const tv = { on: false };
  inter({ name: 'TV', parts: [frame, scr], label: () => (tv.on ? 'Turn off TV' : 'Turn on TV'), act: () => { tv.on = !tv.on; tvMat.emissiveIntensity = tv.on ? 1.0 : 0; glow.intensity = tv.on ? 1.2 : 0; shadowDirty = true; } });
}

// ---- switches by the doors (white rocker plates); a click opens that room's lamps
MATS.switchPlate = std({ color: 0xf7f7f5, roughness: 0.35 });
const SWITCHES = [
  { room: 'living', name: 'Living room', px: 662, py: 834, face: [0, -1], ids: ['arc', 'cstrip'] },
  { room: 'dining', name: 'Kitchen and dining', px: 440, py: 600, face: [-1, 0], ids: ['ph', 'kceil', 'kspot'] },
  { room: 'hall', name: 'Hall and entrance', px: 269, py: 1450, face: [1, 0], ids: ['entry', 'hall'] },
  { room: 'bath', name: 'Bathroom', px: 456, py: 975, face: [1, 0], ids: ['bath'] },
  { room: 'bedroom', name: 'Bedroom', px: 652, py: 1262, face: [1, 0], ids: ['bedceil', 'bedlamp', 'strip', 'twig'] },
];
for (const s of SWITCHES) {
  const g = pg(s.px + s.face[0] * 1.5, s.py + s.face[1] * 1.5); scene.add(g);
  const plate = lb(g, s.face[0] ? 0.012 : 0.085, 0.085, s.face[1] ? 0.012 : 0.085, 0, 1.0, 0, MATS.switchPlate, { shadow: false });
  const rock = lb(g, s.face[0] ? 0.016 : 0.05, 0.05, s.face[1] ? 0.016 : 0.05, 0, 1.017, 0, MATS.white, { shadow: false });
  inter({ name: s.name, parts: [plate, rock], handle: rock, label: () => `${s.name} lights`, act: () => openLightPanel(s) });
}
// clicking a lamp toggles it
for (const [id, L] of Object.entries(LIGHTS)) {
  if (!L.pick) continue;
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.copy(L.pick()); scene.add(proxy);
  inter({ name: L.name, parts: [proxy], noNear: true, label: () => (L.on ? 'Turn off ' : 'Turn on ') + L.name.toLowerCase(), act: () => { L.on = !L.on; L.manual = true; applyLights(); syncPanel(); } });
}

// ---- state → lights
let lightsReady = false;
function applyLights() {
  const night = 1 - dayLevel;
  for (const [id, L] of Object.entries(LIGHTS)) {
    let on = L.on;
    if (L.auto) on = night > 0.2 && (currentRoom === 'stair' || currentRoom === 'gate' || currentRoom === 'entry');
    const lv = on ? Math.pow(L.bri, 1.6) : 0;
    L.apply(lv);
  }
  poolDirty = true;
  $('qLights').setAttribute('aria-pressed', Object.values(LIGHTS).some((L) => L.on && !L.auto));
  shadowDirty = true;
}
// Auto: evening lamps on at dusk, everything off at 00:30 (unless you switched something yourself)
let autoLights = true;
onSunHooks.push((h, dusk) => {
  if (!autoLights) { applyLights(); return; }
  const eve = dusk < 0.55 && (h >= 12 || h < 0.5);
  for (const L of Object.values(LIGHTS)) if (!L.auto && !L.manual) L.on = eve && !!L.evening;
  applyLights();
});
function onRoomChange() { if (lightsReady) applyLights(); }
$('qLights').addEventListener('click', () => {
  const anyOn = Object.values(LIGHTS).some((L) => L.on && !L.auto);
  for (const L of Object.values(LIGHTS)) if (!L.auto) { L.on = !anyOn; L.manual = true; }
  applyLights(); syncPanel(); showToast(anyOn ? 'All lights off' : 'All lights on', 900);
});

// ---- the switch panel, Apple Home style like the Copenhagen walkthrough: a summary with "Turn all on/off", Auto, scenes,
// a tile per lamp (the round icon switches it, the name opens its controls: a big brightness pill with a power button)
const BULB_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const STRIP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="10" width="18" height="4" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 7l1 1.5M12 6v2M18 7l-1 1.5M6 17l1-1.5M12 18v-2M18 17l-1-1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const POWER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8M6.3 6.6a8 8 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const LUND_SCENES = [
  { name: 'Bright', sw: 'linear-gradient(135deg,#fff7e8,#dfe9ff)', set: (ids) => Object.fromEntries(ids.map((id) => [id, 1])) },
  { name: 'Relax', sw: 'linear-gradient(135deg,#ffb35c,#ffd9a6)', set: (ids) => Object.fromEntries(ids.map((id) => [id, LIGHTS[id].evening ? 0.5 : 0])) },
  { name: 'Night light', sw: 'linear-gradient(135deg,#c2410c,#7c2d12)', set: (ids) => { const k = ids.find((id) => /strip|twig|bedlamp|arc/.test(id)) || ids[0]; return { [k]: 0.12 }; } },
];
let panelFor = null, panelSync = null;
function openLightPanel(s) {
  panelFor = s;
  if (document.pointerLockElement) document.exitPointerLock();
  $('mvName').textContent = `${s.name}`;
  const body = $('mvBody'); body.innerHTML = '';
  const ids = s.ids, mark = (L) => { L.manual = true; };
  const root = document.createElement('div'); root.className = 'hk';
  root.innerHTML = `<div class="hk-head"><span class="hk-sum"></span><button type="button" class="hk-all"></button></div>
    <button type="button" class="hk-auto" aria-pressed="false"><i></i><span>Auto: on at dusk, off at 00:30</span></button>
    <div class="hk-scenes">${LUND_SCENES.map((x, i) => `<button type="button" data-s="${i}"><i style="background:${x.sw}"></i>${x.name}</button>`).join('')}</div>
    <div class="hk-grid"></div><div class="hk-det" hidden></div>`;
  const grid = root.querySelector('.hk-grid'), det = root.querySelector('.hk-det'), sum = root.querySelector('.hk-sum'), all = root.querySelector('.hk-all'), auto = root.querySelector('.hk-auto');
  let open = ids.length === 1 ? ids[0] : null;
  const tiles = {};
  for (const id of ids) {
    const L = LIGHTS[id], t = document.createElement('div'); t.className = 'hk-tile';
    t.innerHTML = `<button type="button" class="hk-ic" aria-label="Turn ${L.name} on or off">${/strip|twig/.test(id) ? STRIP_SVG : BULB_SVG}</button>
      <button type="button" class="hk-tx" aria-label="${L.name} settings"><b>${L.name}</b><span></span></button>`;
    t.querySelector('.hk-ic').addEventListener('click', () => { L.on = !L.on; mark(L); if (L.on && L.bri < 0.05) L.bri = 0.6; applyLights(); sync(); });
    t.querySelector('.hk-tx').addEventListener('click', () => { open = open === id ? null : id; renderDetail(); sync(); });
    grid.appendChild(t); tiles[id] = t;
  }
  let dSync = null;
  function renderDetail() {
    det.innerHTML = ''; det.hidden = !open; dSync = null; if (!open) return;
    const L = LIGHTS[open];
    det.innerHTML = `<div class="hk-dh"><span><b>${L.name}</b><small>Dimmable · warm white</small></span><button type="button" class="hk-x" aria-label="Close">✕</button></div>
      <div class="hk-body">
        <div class="hk-bri" role="slider" tabindex="0" aria-label="Brightness" aria-valuemin="1" aria-valuemax="100"><div class="hk-fill"></div><span class="hk-pct"></span><button type="button" class="hk-pow" aria-label="On or off">${POWER_SVG}</button></div>
        <div class="hk-side"><div class="hk-seg">${[10, 25, 50, 75, 100].map((v) => `<button type="button" data-v="${v}">${v}</button>`).join('')}</div>
          <div class="hk-glow" aria-hidden="true"></div></div>
      </div>`;
    det.querySelector('.hk-x').addEventListener('click', () => { open = null; renderDetail(); sync(); });
    const bri = det.querySelector('.hk-bri'), fill = det.querySelector('.hk-fill'), pct = det.querySelector('.hk-pct'), pow = det.querySelector('.hk-pow'), glowEl = det.querySelector('.hk-glow');
    pow.addEventListener('click', (e) => { e.stopPropagation(); L.on = !L.on; mark(L); if (L.on && L.bri < 0.05) L.bri = 0.6; applyLights(); sync(); });
    pow.addEventListener('pointerdown', (e) => e.stopPropagation());
    const setBri = (e) => { const r = bri.getBoundingClientRect(); L.bri = THREE.MathUtils.clamp((r.bottom - e.clientY) / r.height, 0.01, 1); L.on = true; mark(L); applyLights(); sync(); };
    bri.addEventListener('pointerdown', (e) => { bri.setPointerCapture(e.pointerId); bri.classList.add('drag'); setBri(e); });
    bri.addEventListener('pointermove', (e) => { if (bri.hasPointerCapture(e.pointerId)) setBri(e); });
    const endB = () => bri.classList.remove('drag'); bri.addEventListener('pointerup', endB); bri.addEventListener('pointercancel', endB);
    bri.addEventListener('keydown', (e) => { const d = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 }[e.key]; if (d === undefined) return;
      e.preventDefault(); e.stopPropagation(); L.bri = THREE.MathUtils.clamp(L.bri + d, 0.01, 1); L.on = true; mark(L); applyLights(); sync(); });
    det.querySelectorAll('.hk-seg button').forEach((b) => b.addEventListener('click', () => { L.bri = +b.dataset.v / 100; L.on = true; mark(L); applyLights(); sync(); }));
    dSync = () => {
      bri.classList.toggle('off', !L.on); fill.style.height = `${(L.on ? L.bri : 0) * 100}%`;
      pct.textContent = L.on ? `${Math.round(L.bri * 100)}%` : 'Off'; bri.setAttribute('aria-valuenow', String(Math.round(L.bri * 100)));
      det.querySelectorAll('.hk-seg button').forEach((b) => b.classList.toggle('on', L.on && Math.abs(+b.dataset.v / 100 - L.bri) < 0.03));
      glowEl.style.opacity = L.on ? String(0.25 + 0.75 * L.bri) : '0.08';
    };
  }
  function sync() {
    for (const id of ids) { const L = LIGHTS[id], t = tiles[id]; t.classList.toggle('on', L.on); t.classList.toggle('open', open === id); t.querySelector('.hk-tx span').textContent = L.on ? `${Math.round(L.bri * 100)}%` : 'Off'; }
    const n = ids.filter((id) => LIGHTS[id].on).length;
    sum.textContent = n ? `${n} of ${ids.length} on` : 'All off';
    all.textContent = n ? 'Turn all off' : 'Turn all on'; all.classList.toggle('on', !!n);
    auto.classList.toggle('on', autoLights); auto.setAttribute('aria-pressed', String(autoLights));
    if (dSync) dSync();
  }
  all.addEventListener('click', () => { const n = ids.some((id) => LIGHTS[id].on); for (const id of ids) { const L = LIGHTS[id]; L.on = !n; mark(L); if (L.on && L.bri < 0.05) L.bri = 0.6; } applyLights(); sync(); });
  auto.addEventListener('click', () => { autoLights = !autoLights; if (autoLights) for (const L of Object.values(LIGHTS)) L.manual = false; updateSun(clockHour, false); sync(); });
  root.querySelectorAll('.hk-scenes button').forEach((b) => b.addEventListener('click', () => {
    const S = LUND_SCENES[+b.dataset.s], m = S.set(ids);
    for (const id of ids) { const L = LIGHTS[id], v = m[id]; L.on = !!v; if (v) L.bri = v; mark(L); }
    applyLights(); sync(); showToast(`Scene: ${S.name}`, 900);
  }));
  for (const inp of root.querySelectorAll('button,[tabindex]')) inp.addEventListener('keydown', (e) => { if (e.key !== 'Tab' && e.key !== 'Escape') e.stopPropagation(); });
  body.appendChild(root); renderDetail(); sync(); panelSync = sync;
  $('mover').hidden = false;
}
function syncPanel() { if (!$('mover').hidden && panelSync) panelSync(); }
function closePanel() { $('mover').hidden = true; panelFor = null; panelSync = null; }
$('mvDone').addEventListener('click', closePanel);
function stepLights() {}
lightsReady = true;
