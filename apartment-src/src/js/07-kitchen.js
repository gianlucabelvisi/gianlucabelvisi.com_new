// ------------------------------------------------------------ kitchen: coffee corner next to the fridge + Thermomix in the corner
// Fellow Espresso Series 1: 315 W × 438 D × 279 H mm (546 D with portafilter). Niche Zero: 122 × 211 × 311 mm. Thermomix TM7: 253 W × 405 D × 336 H mm.
MATS.espresso = std({ color: 0x141414, roughness: 0.55 });
MATS.chromeK = std({ color: 0xd9dadc, roughness: 0.12, metalness: 1 });
MATS.nicheBlack = std({ color: 0x0e0e0f, roughness: 0.18, metalness: 0.2 });
MATS.nicheOak = std({ color: 0xa4643a, roughness: 0.45 });
MATS.clearLid = new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.05, transparent: true, opacity: 0.35 });
MATS.tmWhite = std({ color: 0xf4f4f2, roughness: 0.35 });
MATS.canister = std({ color: 0x3b3d40, roughness: 0.4, metalness: 0.5 });
const kitDims = new THREE.Group(); dimsGroup.add(kitDims);
function buildCoffee() {
  const top = 0.90;                                      // worktop height
  const wallY = 0.476, tallEnd = 0.476 + 0.62;          // south wall face, end of the tall fridge column (Blender coords)
  const kits = [];
  const kit = (bx, by, rotY) => { const g = new THREE.Group(); g.position.copy(b2t(bx, by, top)); g.rotation.y = rotY; scene.add(g); kits.push(g); return g; };
  const put = (g, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const cyl = (rt, rb, h, seg = 28) => new THREE.CylinderGeometry(rt, rb, h, seg);
  // local frame for things on the long counter: +z = towards the room, +x = towards the fridge
  const E = kit(tallEnd + 0.04 + 0.1575, wallY + 0.03 + 0.219, Math.PI);
  put(E, new THREE.BoxGeometry(0.315, 0.035, 0.438), MATS.espresso, 0, 0.0175, 0);                 // base + drip tray
  put(E, new THREE.BoxGeometry(0.29, 0.006, 0.13), MATS.chromeK, 0, 0.037, 0.14);                   // tray grate
  put(E, new THREE.BoxGeometry(0.315, 0.244, 0.3), MATS.espresso, 0, 0.035 + 0.122, -0.069);       // body
  put(E, new THREE.BoxGeometry(0.3, 0.008, 0.29), MATS.tvFrame, 0, 0.283, -0.069);                 // top / tank lid
  put(E, cyl(0.072, 0.072, 0.07), MATS.chromeK, -0.03, 0.2, 0.1);                                   // group head dome
  put(E, cyl(0.036, 0.034, 0.035), MATS.chromeK, -0.03, 0.148, 0.1);                                // portafilter
  const handle = put(E, new THREE.BoxGeometry(0.025, 0.025, 0.14), MATS.espresso, -0.03, 0.145, 0.2); handle.rotation.x = 0.12;
  put(E, cyl(0.005, 0.005, 0.2, 10), MATS.chromeK, 0.115, 0.17, 0.1);                               // steam wand
  put(E, cyl(0.007, 0.007, 0.03, 10), std({ color: 0xff5a1f, roughness: 0.5 }), 0.115, 0.075, 0.1);
  const scr = put(E, new THREE.CircleGeometry(0.03, 24), new THREE.MeshStandardMaterial({ color: 0x2f6fe0, emissive: 0x2f6fe0, emissiveIntensity: 0.8 }), 0.12, 0.2, 0.0815); scr.rotation.y = 0;
  put(E, cyl(0.02, 0.02, 0.025), MATS.espresso, 0.12, 0.1, 0.09).rotation.x = Math.PI / 2;          // dial
  // on the top: milk jug, distribution tool, dosing funnel, puck-screen tin
  put(E, cyl(0.045, 0.038, 0.1), MATS.chromeK, 0.09, 0.337, -0.17);
  put(E, cyl(0.018, 0.018, 0.12, 16), MATS.espresso, 0.01, 0.347, -0.17);
  put(E, cyl(0.04, 0.042, 0.03), MATS.espresso, 0.09, 0.302, -0.07);
  put(E, cyl(0.035, 0.035, 0.016), MATS.chromeK, -0.07, 0.295, -0.16);
  // Niche Zero on its oak base, then the tamping mat, bean canister, knock box (to the left of the machine)
  const N = kit(tallEnd + 0.04 + 0.315 + 0.05 + 0.07 + 0.22, wallY + 0.03 + 0.105, Math.PI);
  put(N, new THREE.BoxGeometry(0.14, 0.03, 0.21), MATS.nicheOak, 0, 0.015, 0);
  put(N, cyl(0.058, 0.05, 0.2), MATS.nicheBlack, 0, 0.14, -0.02);
  put(N, cyl(0.06, 0.058, 0.03), MATS.nicheBlack, 0, 0.255, -0.02);
  put(N, new THREE.SphereGeometry(0.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MATS.clearLid, 0, 0.27, -0.02).scale.y = 0.6;
  put(N, cyl(0.03, 0.03, 0.05), MATS.chromeK, 0, 0.055, 0.06);                                      // dosing cup
  const K = kit(tallEnd + 0.04 + 0.315 + 0.04 + 0.22, wallY + 0.03 + 0.34, Math.PI);                       // mat + tamper in front
  put(K, new THREE.BoxGeometry(0.28, 0.01, 0.2), MATS.espresso, -0.1, 0.005, 0);
  put(K, cyl(0.029, 0.029, 0.02), MATS.espresso, -0.02, 0.02, 0);
  put(K, cyl(0.012, 0.016, 0.08, 14), MATS.espresso, -0.02, 0.07, 0);
  put(K, new THREE.SphereGeometry(0.02, 14, 10), MATS.espresso, -0.02, 0.115, 0);
  const C = kit(tallEnd + 0.04 + 0.315 + 0.24 + 0.22, wallY + 0.1, Math.PI);
  put(C, cyl(0.06, 0.06, 0.19), MATS.canister, 0, 0.095, 0);
  put(C, cyl(0.062, 0.062, 0.02), MATS.espresso, 0, 0.2, 0);
  put(C, cyl(0.07, 0.07, 0.13), MATS.espresso, -0.06, 0.065, 0.2);                                  // knock box
  put(C, cyl(0.006, 0.006, 0.12, 8), MATS.espresso, -0.06, 0.1, 0.2).rotation.z = Math.PI / 2;
  // Thermomix TM7 in the corner of the L, angled towards the room
  const T = kit(4.49 - 0.33, wallY + 0.33, -3 * Math.PI / 4);
  put(T, new THREE.BoxGeometry(0.253, 0.12, 0.405), MATS.tmWhite, 0, 0.06, 0);
  const pnl = put(T, new THREE.BoxGeometry(0.2, 0.1, 0.02), MATS.nicheBlack, 0, 0.09, 0.2); pnl.rotation.x = -0.35;
  put(T, new THREE.BoxGeometry(0.2, 0.06, 0.18), MATS.tmWhite, 0, 0.15, -0.08);
  put(T, cyl(0.1, 0.085, 0.17), MATS.chromeK, 0, 0.265, -0.07);
  put(T, cyl(0.106, 0.106, 0.035), MATS.nicheBlack, 0, 0.365, -0.07);
  put(T, new THREE.BoxGeometry(0.03, 0.12, 0.05), MATS.nicheBlack, 0.115, 0.27, -0.07);
  // Svetlana's picks, between the sink and the corner (backs 3 cm off the wall), local +z = towards the room
  MATS.kaBlack = MATS.kaBlack || std({ color: 0x121212, roughness: 0.25, metalness: 0.3 });
  MATS.kaMatte = MATS.kaMatte || std({ color: 0x1b1b1b, roughness: 0.7 });
  MATS.jarGlass = MATS.jarGlass || new THREE.MeshStandardMaterial({ color: 0xdfe8ea, roughness: 0.05, transparent: true, opacity: 0.28 });
  // KitchenAid kettle 5KEK1222 (onyx black): 262 H × 178 W × 226 D mm (with handle and spout)
  const KT = kit(tallEnd + 0.04 + 0.315 + 0.03 + 0.089, wallY + 0.03 + 0.113, Math.PI);   // right beside the espresso machine; grinder & co. moved 22 cm along
  put(KT, cyl(0.09, 0.095, 0.018), MATS.kaBlack, 0, 0.009, 0);                                        // 360° base
  const dome = put(KT, new THREE.LatheGeometry([[0, 0], [0.078, 0], [0.084, 0.03], [0.082, 0.1], [0.07, 0.16], [0.045, 0.2], [0.03, 0.215], [0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y)), 36), MATS.kaBlack, 0, 0.018, 0);
  put(KT, cyl(0.018, 0.024, 0.03), MATS.chromeK, 0, 0.245, 0);                                         // lid knob
  const hdl = put(KT, new THREE.TorusGeometry(0.075, 0.012, 8, 24, Math.PI * 1.05), MATS.chromeK, 0, 0.16, -0.06); hdl.rotation.set(0, Math.PI / 2, Math.PI * 0.47);
  const spout = put(KT, cyl(0.012, 0.02, 0.07, 12), MATS.kaBlack, 0, 0.13, 0.085); spout.rotation.x = 0.9;
  // KitchenAid 2-slice toaster 5KMT2109 (matte black): 212 H × 308 W × 175 D mm
  const TS = kit(3.40, wallY + 0.03 + 0.154, Math.PI / 2);   // turned 90°: 17.5 cm along the wall, 30.8 cm deep
  put(TS, new THREE.BoxGeometry(0.29, 0.19, 0.16), MATS.kaMatte, 0, 0.115, 0);
  put(TS, new THREE.CylinderGeometry(0.08, 0.08, 0.29, 24, 1, false, 0, Math.PI), MATS.kaMatte, 0, 0.21, 0).rotation.set(0, 0, Math.PI / 2);
  put(TS, new THREE.BoxGeometry(0.308, 0.02, 0.175), MATS.chromeK, 0, 0.01, 0);                        // chrome foot
  for (const zz of [-0.03, 0.03]) put(TS, new THREE.BoxGeometry(0.24, 0.004, 0.03), MATS.nicheBlack, 0, 0.291, zz);   // slots
  put(TS, new THREE.BoxGeometry(0.03, 0.02, 0.05), MATS.chromeK, 0.16, 0.16, 0);                       // lever
  put(TS, cyl(0.014, 0.014, 0.012, 16), MATS.chromeK, 0.1, 0.08, 0.087).rotation.x = Math.PI / 2;      // dial
  // Wilfa BLPS-1000 blender (silver, 1.5 L glass jar): listed 285 × 350 × 210 mm, read as ~350 tall with the jar
  const BL = kit(3.76, wallY + 0.03 + 0.105, Math.PI);
  put(BL, new THREE.BoxGeometry(0.18, 0.11, 0.18), MATS.chromeK, 0, 0.055, 0);
  put(BL, cyl(0.03, 0.03, 0.01, 20), MATS.nicheBlack, 0, 0.06, 0.092).rotation.x = Math.PI / 2;        // speed dial
  put(BL, cyl(0.075, 0.06, 0.2, 28), MATS.jarGlass, 0, 0.21, 0);                                        // glass jar
  put(BL, cyl(0.078, 0.078, 0.025, 28), MATS.nicheBlack, 0, 0.322, 0);                                 // lid
  put(BL, new THREE.BoxGeometry(0.025, 0.16, 0.03), MATS.nicheBlack, 0.09, 0.21, 0);                   // jar handle
  for (const k of kits) mergeByMaterial(k);
  // labels (with Sizes)
  for (const [txt, bx, by, h] of [['Fellow Espresso Series 1 · 32 × 44 cm', tallEnd + 0.2, 0.75, 1.3], ['Niche Zero · 12 × 21 cm', tallEnd + 0.69, 0.72, 1.22], ['Thermomix TM7 · 25 × 41 cm', 4.16, 0.8, 1.3], ['0.56 m clear under the wall cabinets', tallEnd + 0.35, 0.9, 1.14], ['KitchenAid kettle 5KEK1222 · 1.25 L', tallEnd + 0.47, 0.78, 1.38], ['KitchenAid toaster 5KMT2109', 3.40, 0.72, 1.22], ['Wilfa blender BLPS-1000', 3.76, 0.75, 1.36]]) {
    const t = labelSprite(txt, { h: 0.028 }); t.position.copy(b2t(bx, by, h)); kitDims.add(t);
  }
}
// ------------------------------------------------------------ easter egg: something lives in the Teknik cupboard (only visible with the doors open)
// an original riveted-steel boiler golem: barrel body, pipe limbs, clamp claws, a gauge for a heart and a glowing visor slit
function buildTeknikGolem() {
  const steel = std({ color: 0x6f757b, roughness: 0.45, metalness: 1 }), dark = std({ color: 0x24272b, roughness: 0.5, metalness: 0.9 });
  const rust = std({ color: 0x6a3b22, roughness: 0.9, metalness: 0.3 }), glow = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a10, emissiveIntensity: 2.2 });
  const g = new THREE.Group(); g.position.copy(b2t(4.9, 1.92, 0)); g.rotation.y = Math.PI / 2;   // facing the left door (towards the hall)
  const put = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const cyl = (r1, r2, h, s = 20) => new THREE.CylinderGeometry(r1, r2, h, s);
  // legs: bent pipes with flanged feet
  for (const sx of [-0.11, 0.11]) {
    put(cyl(0.045, 0.05, 0.42), steel, sx, 0.23, -0.02, 0.18);
    put(cyl(0.07, 0.07, 0.04), dark, sx, 0.02, 0.02);
    put(new THREE.SphereGeometry(0.06, 14, 10), dark, sx, 0.44, -0.05);
  }
  // barrel torso, leaning forward, with rivet bands and a rusty seam
  const torso = new THREE.Group(); torso.position.set(0, 0.5, -0.05); torso.rotation.x = 0.28; g.add(torso);
  const tp = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; torso.add(m); return m; };
  tp(cyl(0.2, 0.17, 0.72, 28), steel, 0, 0.36, 0);
  for (const y of [0.06, 0.36, 0.66]) {
    tp(new THREE.TorusGeometry(0.2, 0.012, 6, 32), dark, 0, y, 0, Math.PI / 2);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; tp(new THREE.SphereGeometry(0.011, 6, 5), dark, Math.cos(a) * 0.212, y + 0.025, Math.sin(a) * 0.212); }
  }
  tp(new THREE.BoxGeometry(0.02, 0.6, 0.02), rust, 0.14, 0.36, 0.14);
  tp(cyl(0.07, 0.07, 0.03, 24), dark, 0, 0.45, 0.19, Math.PI / 2);                       // the gauge
  tp(new THREE.CircleGeometry(0.058, 24), std({ color: 0xe8e2d0, roughness: 0.6 }), 0, 0.45, 0.206);
  tp(new THREE.BoxGeometry(0.004, 0.05, 0.004), glow, 0.012, 0.465, 0.21, 0, 0, -0.9);  // needle in the red
  // hunched head: a squat dome with a single glowing slit
  tp(cyl(0.07, 0.09, 0.06), dark, 0, 0.75, 0.02);
  const head = tp(new THREE.SphereGeometry(0.15, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), steel, 0, 0.8, 0.06);
  tp(cyl(0.152, 0.152, 0.03, 24), dark, 0, 0.81, 0.06);
  tp(new THREE.BoxGeometry(0.2, 0.022, 0.04), glow, 0, 0.865, 0.19, 0.25);
  for (const sx of [-0.13, 0.13]) tp(cyl(0.012, 0.004, 0.14, 8), dark, sx, 0.97, 0.03, 0, 0, sx > 0 ? -0.5 : 0.5);   // antenna spikes
  tp(cyl(0.03, 0.03, 0.25, 12), rust, -0.12, 0.85, -0.12, 0.3);                          // exhaust pipe
  // long pipe arms reaching for the door, ending in three-pronged clamps
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.22, 0.6, 0.02); arm.rotation.set(-0.45, 0, sx * 0.35); torso.add(arm);
    const ap = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; arm.add(m); return m; };
    ap(new THREE.SphereGeometry(0.05, 12, 8), dark, 0, 0, 0);
    ap(cyl(0.03, 0.03, 0.34), steel, 0, -0.17, 0);
    ap(new THREE.SphereGeometry(0.04, 12, 8), dark, 0, -0.34, 0);
    ap(cyl(0.026, 0.026, 0.3), steel, 0, -0.49, 0.05, -0.35);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; ap(cyl(0.008, 0.002, 0.14, 6), dark, Math.cos(a) * 0.03, -0.69, 0.1 + Math.sin(a) * 0.03, -0.35 + Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35); }
  }
  for (const c of [torso, ...torso.children.filter((x) => x.isGroup)]) mergeByMaterial(c);
  mergeByMaterial(g);
  scene.add(g); g.updateMatrixWorld(true);
  // keep every bit of it behind the closed doors: cupboard interior runs from x≈4.55 (back wall) to x≈5.24 (inside of the doors)
  const bb = new THREE.Box3().setFromObject(g), over = bb.max.x - 5.2;
  if (over > 0) { g.position.x -= over; g.updateMatrixWorld(true); }
  const bb2 = new THREE.Box3().setFromObject(g);
  if (bb2.min.x < 4.62) { const k = (5.2 - 4.62) / (bb2.max.x - bb2.min.x); g.scale.setScalar(Math.min(1, k)); g.updateMatrixWorld(true); const bb3 = new THREE.Box3().setFromObject(g); g.position.x += 5.2 - bb3.max.x; g.updateMatrixWorld(true); }
  window.__golem = g;
}
// ------------------------------------------------------------ fridge contents: food on the shelves, beers, white wine (door racks move with the door)
function buildFridgeFood() {
  const M = (c, r = 0.5, extra = {}) => std({ color: c, roughness: r, ...extra });
  const glassM = (c, o = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.08, transparent: true, opacity: o });
  const mat = {
    beer: M(0x4a2408, 0.15), beerLabel: M(0xeadcb8, 0.6), beerCap: M(0xc9a54a, 0.3, { metalness: 0.8 }),
    wine: glassM(0xc7d38f, 0.8), wineLabel: M(0xf3efe4, 0.6), foil: M(0xd6c07a, 0.3, { metalness: 0.7 }),
    can: M(0xc8ccd0, 0.25, { metalness: 0.9 }), canBand: M(0x2d6a4f, 0.4), milk: M(0xf7f7f5, 0.5), milkTop: M(0x2d6fb6, 0.5),
    yog: M(0xf4f1ea, 0.5), yogLid: M(0xb7c7d6, 0.3, { metalness: 0.6 }), cheese: M(0xf1c34a, 0.6), butter: M(0xd9b343, 0.4, { metalness: 0.3 }),
    egg: M(0xb9b1a3, 0.9), eggs: M(0xf2ede4, 0.7), tomato: M(0xc9261b, 0.35), pepY: M(0xf2c318, 0.35), pepG: M(0x3f8a2a, 0.4),
    lettuce: M(0x7fbf4a, 0.7), carrot: M(0xe8751a, 0.6), lemon: M(0xf2dc3a, 0.5), drawer: glassM(0xe9f2f5, 0.3),
    box: glassM(0xf0f4f6, 0.45), lidBlue: M(0x3b6ea8, 0.5), food: M(0xd08a3c, 0.8), jam: M(0x7a1427, 0.3), jarLid: M(0xd9d9d9, 0.3, { metalness: 0.8 }),
    ham: M(0xe8a0a0, 0.6), pesto: M(0x5b7d2a, 0.6), ketchup: M(0xb3150f, 0.4), mustard: M(0xe0b31d, 0.4), juice: M(0xf29a1f, 0.5),
  };
  const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
  // interior (Blender coords): x 0.516..1.056, back y 0.526, shelf fronts y 1.026; floor z 1.018; shelf tops 1.279 / 1.571 / 1.864
  const g = new THREE.Group(); scene.add(g);
  const put = (geo, m, bx, by, bz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.copy(b2t(bx, by, bz)); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const bottle = (add, x, y, z, kind) => {                 // standing bottle, z = base
    if (kind === 'beer') {
      add(cyl(0.03, 0.03, 0.15), mat.beer, x, y, z + 0.075); add(cyl(0.031, 0.031, 0.06), mat.beerLabel, x, y, z + 0.07);
      add(cyl(0.013, 0.03, 0.05), mat.beer, x, y, z + 0.175); add(cyl(0.013, 0.013, 0.03), mat.beer, x, y, z + 0.215); add(cyl(0.015, 0.015, 0.008), mat.beerCap, x, y, z + 0.232);
    } else {
      add(cyl(0.037, 0.037, 0.2), mat.wine, x, y, z + 0.1); add(cyl(0.0375, 0.0375, 0.08), mat.wineLabel, x, y, z + 0.08);
      add(cyl(0.014, 0.037, 0.05), mat.wine, x, y, z + 0.225); add(cyl(0.014, 0.014, 0.06), mat.foil, x, y, z + 0.28);
    }
  };
  const addI = (geo, m, bx, by, bz) => put(geo, m, bx, by, bz);
  // bottom: crisper drawer with vegetables
  put(new THREE.BoxGeometry(0.5, 0.17, 0.44), mat.drawer, 0.786, 0.79, 1.105);
  for (const [x, y] of [[0.58, 0.9], [0.64, 0.95], [0.6, 0.83]]) put(new THREE.SphereGeometry(0.032, 14, 10), mat.tomato, x, y, 1.05);
  put(new THREE.SphereGeometry(0.042, 14, 10), mat.pepY, 0.72, 0.9, 1.06); put(new THREE.SphereGeometry(0.04, 14, 10), mat.pepG, 0.75, 0.8, 1.06);
  put(new THREE.SphereGeometry(0.075, 16, 12), mat.lettuce, 0.92, 0.72, 1.09).scale.set(1, 0.8, 1);
  for (let k = 0; k < 4; k++) put(new THREE.ConeGeometry(0.014, 0.17, 10), mat.carrot, 0.86 + k * 0.03, 0.93, 1.045, 0, 0, Math.PI / 2);
  for (const [x, y] of [[0.99, 0.95], [1.0, 0.88]]) put(new THREE.SphereGeometry(0.03, 12, 10), mat.lemon, x, y, 1.05).scale.set(1.25, 1, 1);
  // shelf 1: milk, yoghurts, cheese, butter, eggs
  let z = 1.279;
  put(new THREE.BoxGeometry(0.07, 0.2, 0.07), mat.milk, 0.56, 0.62, z + 0.1); put(new THREE.BoxGeometry(0.07, 0.03, 0.05), mat.milkTop, 0.56, 0.62, z + 0.215);
  put(new THREE.BoxGeometry(0.07, 0.2, 0.07), mat.milk, 0.56, 0.72, z + 0.1); put(new THREE.BoxGeometry(0.07, 0.03, 0.05), mat.milkTop, 0.56, 0.72, z + 0.215);
  for (let k = 0; k < 4; k++) { const x = 0.65 + (k % 2) * 0.075, y = 0.9 + Math.floor(k / 2) * 0.075; put(cyl(0.034, 0.03, 0.07), mat.yog, x, y, z + 0.035); put(cyl(0.035, 0.035, 0.004), mat.yogLid, x, y, z + 0.072); }
  put(new THREE.BoxGeometry(0.13, 0.06, 0.08), mat.cheese, 0.86, 0.95, z + 0.03);
  put(new THREE.BoxGeometry(0.1, 0.05, 0.05), mat.butter, 0.99, 0.95, z + 0.025);
  put(new THREE.BoxGeometry(0.2, 0.07, 0.11), mat.eggs, 0.92, 0.66, z + 0.035);
  // shelf 2: six beers and a bottle of white wine lying down
  z = 1.571;
  for (let k = 0; k < 6; k++) bottle(addI, 0.56 + (k % 3) * 0.066, 0.6 + Math.floor(k / 3) * 0.066, z, 'beer');
  { const wy = 0.94, wz = z + 0.038;                      // wine on its side, neck to the right
    put(cyl(0.037, 0.037, 0.2), mat.wine, 0.72, wy, wz, 0, 0, Math.PI / 2); put(cyl(0.0375, 0.0375, 0.08), mat.wineLabel, 0.7, wy, wz, 0, 0, Math.PI / 2);
    put(cyl(0.014, 0.037, 0.05), mat.wine, 0.845, wy, wz, 0, 0, Math.PI / 2); put(cyl(0.014, 0.014, 0.06), mat.foil, 0.9, wy, wz, 0, 0, Math.PI / 2); }
  put(new THREE.BoxGeometry(0.16, 0.08, 0.12), mat.box, 0.96, 0.64, z + 0.04); put(new THREE.BoxGeometry(0.16, 0.012, 0.12), mat.lidBlue, 0.96, 0.64, z + 0.086);
  put(new THREE.BoxGeometry(0.14, 0.04, 0.1), mat.food, 0.96, 0.64, z + 0.02);
  // shelf 3: leftovers, jam, pesto, ham
  z = 1.864;
  for (const [x, y] of [[0.6, 0.66], [0.6, 0.86]]) { put(new THREE.BoxGeometry(0.15, 0.07, 0.14), mat.box, x, y, z + 0.035); put(new THREE.BoxGeometry(0.15, 0.012, 0.14), mat.lidBlue, x, y, z + 0.076); put(new THREE.BoxGeometry(0.13, 0.035, 0.12), mat.food, x, y, z + 0.018); }
  put(cyl(0.035, 0.035, 0.1), mat.jam, 0.78, 0.9, z + 0.05); put(cyl(0.037, 0.037, 0.018), mat.jarLid, 0.78, 0.9, z + 0.109);
  put(cyl(0.03, 0.03, 0.08), mat.pesto, 0.86, 0.92, z + 0.04); put(cyl(0.032, 0.032, 0.016), mat.jarLid, 0.86, 0.92, z + 0.088);
  put(new THREE.BoxGeometry(0.16, 0.015, 0.11), mat.ham, 0.96, 0.8, z + 0.008);
  mergeByMaterial(g);
  // door racks: children of the fridge door pivot (local +x along the door from the hinge, +z into the fridge when closed)
  const door = doors.find((d) => d.id === 'fridge');
  if (!door) return;
  const dg = new THREE.Group(); door.pivot.add(dg);
  const zin = door.thick / 2, y0 = door.z0;
  const dput = (geo, m, x, y, zz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, zz); o.rotation.set(rx, ry, rz); o.castShadow = true; dg.add(o); return o; };
  // three door bins (white fronts)
  for (const by of [0.06, 0.5, 0.82]) {
    dput(new THREE.BoxGeometry(door.len - 0.08, 0.07, 0.006), mat.milk, door.len / 2, y0 + by + 0.035, zin + 0.085);
    dput(new THREE.BoxGeometry(door.len - 0.08, 0.006, 0.085), mat.milk, door.len / 2, y0 + by, zin + 0.043);
  }
  // bottom bin: two white wines + a juice carton
  for (const x of [0.1, 0.19]) {
    const yb = y0 + 0.066;
    dput(cyl(0.037, 0.037, 0.2), mat.wine, x, yb + 0.1, zin + 0.045); dput(cyl(0.0375, 0.0375, 0.08), mat.wineLabel, x, yb + 0.08, zin + 0.045);
    dput(cyl(0.014, 0.037, 0.05), mat.wine, x, yb + 0.225, zin + 0.045); dput(cyl(0.014, 0.014, 0.06), mat.foil, x, yb + 0.28, zin + 0.045);
  }
  dput(new THREE.BoxGeometry(0.07, 0.24, 0.07), mat.juice, 0.3, y0 + 0.066 + 0.12, zin + 0.045);
  dput(new THREE.BoxGeometry(0.07, 0.24, 0.07), mat.milk, 0.39, y0 + 0.066 + 0.12, zin + 0.045);
  // middle bin: beer cans
  for (let k = 0; k < 5; k++) { const x = 0.08 + k * 0.075, yb = y0 + 0.506; dput(cyl(0.033, 0.033, 0.115), mat.can, x, yb + 0.058, zin + 0.045); dput(cyl(0.0335, 0.0335, 0.05), mat.canBand, x, yb + 0.06, zin + 0.045); }
  // top bin: ketchup, mustard, butter dish
  dput(cyl(0.028, 0.03, 0.17), mat.ketchup, 0.1, y0 + 0.826 + 0.085, zin + 0.045); dput(cyl(0.012, 0.02, 0.03), mat.milk, 0.1, y0 + 0.826 + 0.185, zin + 0.045);
  dput(cyl(0.025, 0.027, 0.15), mat.mustard, 0.18, y0 + 0.826 + 0.075, zin + 0.045);
  dput(new THREE.BoxGeometry(0.14, 0.06, 0.07), mat.butter, 0.35, y0 + 0.826 + 0.03, zin + 0.045);
  mergeByMaterial(dg);
}
