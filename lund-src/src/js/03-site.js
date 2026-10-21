// ============================================================ the block and the streets around it (OpenStreetMap footprints + the listing photos)
const v2 = (x, y) => new THREE.Vector2(x, y);
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
function inPolyW(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function polyAreaW(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function offsetPoly(p, d) {     // CCW polygon grown outward by d (mitred)
  const n = p.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
    const u1 = norm2([b[0] - a[0], b[1] - a[1]]), u2 = norm2([c[0] - b[0], c[1] - b[1]]);
    const n1 = [u1[1], -u1[0]], n2 = [u2[1], -u2[0]];
    const m = norm2([n1[0] + n2[0], n1[1] + n2[1]]), k = d / Math.max(0.35, m[0] * n1[0] + m[1] * n1[1]);
    out.push([b[0] + m[0] * k, b[1] + m[1] * k]);
  }
  return out;
}
function norm2(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

// ---- polygon offset materials for the ground layers (no z-fighting from far away)
function layerMat(base, k) { const m = base.clone(); m.polygonOffset = true; m.polygonOffsetFactor = -k; m.polygonOffsetUnits = -k * 2; return m; }
MATS.gSide = layerMat(MATS.sidewalk, 0);
MATS.gGrass = layerMat(MATS.grass, 1);
MATS.gPave = layerMat(MATS.pavers, 2);
MATS.gFoot = layerMat(std({ map: sidewalkTex, color: 0xcfcac2, roughness: 0.9 }), 2);
MATS.gRoad = layerMat(MATS.asphalt, 3);
MATS.gPaint = layerMat(MATS.roadpaint, 4);
MATS.gCycle = layerMat(std({ map: asphaltTex, color: 0xb8b3ad, roughness: 0.9 }), 3);
const GROUND = { floor: true, noShadow: true };

// ground: a big paved disc; roads, grass and courtyard pavers drawn on top
{
  const g = new THREE.CircleGeometry(420, 64); g.rotateX(-Math.PI / 2); worldUV(g);
  addStatic(g, MATS.gSide, GROUND);
}
function ribbon(pts, w, z, mat, flags = GROUND) {
  if (pts.length < 2) return;
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[Math.min(pts.length - 1, i + 1)];
    const u1 = norm2([b[0] - a[0] || c[0] - b[0], b[1] - a[1] || c[1] - b[1]]), u2 = norm2([c[0] - b[0] || b[0] - a[0], c[1] - b[1] || b[1] - a[1]]);
    const t = norm2([u1[0] + u2[0], u1[1] + u2[1]]), nrm = [-t[1], t[0]];
    const k = (w / 2) / Math.max(0.5, nrm[0] * -u1[1] + nrm[1] * u1[0]);
    L.push([b[0] + nrm[0] * k, b[1] + nrm[1] * k]); R.push([b[0] - nrm[0] * k, b[1] - nrm[1] * k]);
  }
  const pos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const q = [L[i], R[i], R[i + 1], L[i + 1]];
    for (const [i0, i1, i2] of [[0, 1, 2], [0, 2, 3]]) for (const k of [i0, i1, i2]) pos.push(q[k][0], z, -q[k][1]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // make sure the triangles face up
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const ax = p.getX(i), az = p.getZ(i), bx = p.getX(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cz = p.getZ(i + 2);
    if ((bx - ax) * (cz - az) - (bz - az) * (cx - ax) > 0) { p.setXYZ(i + 1, cx, z, cz); p.setXYZ(i + 2, bx, z, bz); }
  }
  g.computeVertexNormals(); worldUV(g);
  addStatic(g, mat, flags);
}
for (const r of SITE.roads) {
  const car = ['secondary', 'tertiary', 'residential', 'unclassified', 'service', 'living_street'].includes(r.c);
  if (car) ribbon(r.p, r.w, 0.0, MATS.gRoad);
  else if (r.c === 'cycleway') ribbon(r.p, r.w, 0.0, MATS.gCycle);
  else if (r.c !== 'platform' && r.c !== 'steps') ribbon(r.p, r.w, 0.0, MATS.gFoot);
  // centre dashes on the bigger roads
  if (['secondary', 'tertiary'].includes(r.c)) {
    for (let i = 0; i < r.p.length - 1; i++) {
      const [ax, ay] = r.p[i], [bx, by] = r.p[i + 1], L = Math.hypot(bx - ax, by - ay), u = [(bx - ax) / L, (by - ay) / L];
      for (let s = 1; s < L - 2; s += 6) ribbon([[ax + u[0] * s, ay + u[1] * s], [ax + u[0] * (s + 3), ay + u[1] * (s + 3)]], 0.12, 0.0, MATS.gPaint);
    }
  }
}
for (const a of SITE.areas) {
  const k = a.k;
  const mat = ['grass', 'park', 'grassland', 'common', 'playground', 'pitch', 'garden', 'meadow'].includes(k) ? MATS.gGrass
    : ['parking'].includes(k) ? MATS.gRoad : ['pave', 'pedestrian', 'paving_stones'].includes(k) ? MATS.gFoot : null;
  if (!mat || a.p.length < 3) continue;
  const g = new THREE.ShapeGeometry(new THREE.Shape(a.p.map((q) => v2(q[0], q[1])))); g.rotateX(-Math.PI / 2); worldUV(g);
  addStatic(g, mat, GROUND);
}

// ============================================================ our building: 1989 brick block, three storeys, hipped tile roof, green bays and gutters
const MAIN = SITE.buildings.find((b) => b.lv === 3 && inPolyW(...P(600, 600), b.p));
// snap the corner to the flat's walls: the OSM outline is a metre or so off and has its own chamfer
const OUTW = (px) => P(px, 31 - T * PXM);               // a point on our outer Rådmansgatan face
const OUTN = (py) => P(1173 + T * PXM, py);             // a point on our outer Trollebergsvägen face
const chamOut = (() => {   // outer chamfer line: inner chamfer pushed out by T
  const a = P(785, 31), b = P(1173, 420), u = norm2([b[0] - a[0], b[1] - a[1]]), n = [-u[1], u[0]];   // outward = left of a->b
  const o = [a[0] + n[0] * T, a[1] + n[1] * T];
  // intersect with the two outer faces
  const hit = (p0, p1) => { const d = [p1[0] - p0[0], p1[1] - p0[1]]; const den = d[0] * u[1] - d[1] * u[0]; const t = ((o[0] - p0[0]) * u[1] - (o[1] - p0[1]) * u[0]) / den; return [p0[0] + d[0] * t, p0[1] + d[1] * t]; };
  return [hit(OUTW(0), OUTW(1000)), hit(OUTN(0), OUTN(1000))];
})();
if (MAIN) {
  const p = MAIN.p;
  const near = (q, r = 2.5) => p.findIndex((v) => Math.hypot(v[0] - q[0], v[1] - q[1]) < r);
  const i4 = near([-10.54, 19.97]), i5 = near([-8.42, 23.95]);
  if (i4 >= 0) p[i4] = chamOut[0];
  if (i5 >= 0) p[i5] = chamOut[1];
  const proj = (q, A, B) => { const u = norm2([B[0] - A[0], B[1] - A[1]]); const t = (q[0] - A[0]) * u[0] + (q[1] - A[1]) * u[1]; return [A[0] + u[0] * t, A[1] + u[1] * t]; };
  for (const q of [[-1.27, -11.46], [-3.09, -5.26]]) { const i = near(q); if (i >= 0) p[i] = proj(p[i], OUTW(0), OUTW(1000)); }
  { const i = near([18.29, 31.75]); if (i >= 0) p[i] = proj(p[i], OUTN(0), OUTN(1000)); }
}
// our own walls on the ground floor (they carry real windows) — facade spans to leave out there, in world points
const OWN = [[OUTW(11), chamOut[0]], [chamOut[0], chamOut[1]], [chamOut[1], OUTN(1544)], [P(-635, 1685), P(-459, 1685)]];
const OWN_WINS = windows.map((w) => { const mid = (w.s0 + w.s1) / 2; const c = [w.a[0] + w.u[0] * mid + w.n[0] * T, w.a[1] + w.u[1] * mid + w.n[1] * T]; return { c, w: w.s1 - w.s0 }; });

MATS.bayGreen = std({ color: 0x9cbf9f, roughness: 0.5 });
MATS.bayBlue = std({ color: 0x9cc3d6, roughness: 0.5 });
MATS.balcony = std({ map: canvasTex(256, 256, (g, W) => { g.fillStyle = '#8fb1cf'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(40,60,90,.35)'; g.lineWidth = 6; for (let k = -W; k < 2 * W; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + W, W); g.stroke(); } }, [1, 1]), roughness: 0.45, metalness: 0.3 });
MATS.winFrameOut = std({ color: 0xf2f1ec, roughness: 0.45 });
MATS.railing = std({ color: 0x151515, roughness: 0.5, metalness: 0.4, alphaTest: 0.5, side: THREE.DoubleSide, map: canvasTex(256, 128, (g, W, Hh) => { g.clearRect(0, 0, W, Hh); g.fillStyle = '#fff'; g.fillRect(0, 0, W, 9); g.fillRect(0, Hh - 7, W, 7); for (let x = 4; x < W; x += 16) g.fillRect(x, 0, 4, Hh); }, [1, 1]) });
MATS.railing.map.repeat.set(1, 1);
MATS.litGlass = std({ color: 0x1e262c, roughness: 0.1, metalness: 0.2, emissive: 0xffffff, emissiveIntensity: 0, emissiveMap: canvasTex(64, 64, (g, W) => { const gr = g.createLinearGradient(0, 0, 0, W); gr.addColorStop(0, '#6b4a2a'); gr.addColorStop(0.35, '#e8b878'); gr.addColorStop(1, '#a8743e'); g.fillStyle = gr; g.fillRect(0, 0, W, W); g.fillStyle = 'rgba(40,25,15,.55)'; g.fillRect(W * 0.62, W * 0.2, W * 0.3, W * 0.8); }, [1, 1]) });
MATS.litGlass.emissiveMap.repeat.set(1, 1);
const LIT = [[], [], []];       // lit window glass per tier: evening, late, night owls
function facadeEdges(b) { const p = b.p, out = []; for (let i = 0; i < p.length; i++) { const a = p[i], c = p[(i + 1) % p.length]; const L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.3) continue; const u = [(c[0] - a[0]) / L, (c[1] - a[1]) / L]; out.push({ a, b: c, L, u, n: [u[1], -u[0]], ang: Math.atan2(u[1], u[0]) }); } return out; }
// glass pane (front-facing quad, recessed), optional night tier
function glassPane(e, s0, s1, z0, z1, rec, tier, fl = {}) {
  const sc = (s0 + s1) / 2, x = e.a[0] + e.u[0] * sc - e.n[0] * rec, y = e.a[1] + e.u[1] * sc - e.n[1] * rec;
  sbox(s1 - s0, 0.02, z1 - z0, x, y, z0, e.ang, MATS.darkglass, { ...fl, noShadow: true });
  if (tier >= 0) LIT[tier].push(boxGeoRaw(s1 - s0 - 0.04, 0.01, z1 - z0 - 0.04, x + e.n[0] * 0.012, y + e.n[1] * 0.012, z0 + 0.02, e.ang));
}
function facadeWindow(e, sc, w, z0, h, seed, flags = {}) {
  const FL = flags;
  const s0 = sc - w / 2, s1 = sc + w / 2, rec = 0.12, at = (s, o) => [e.a[0] + e.u[0] * s - e.n[0] * o, e.a[1] + e.u[1] * s - e.n[1] * o];
  const fb = (a0, a1, o0, o1, zb, zt, mat, fl = FL) => { const c = at((a0 + a1) / 2, (o0 + o1) / 2); sbox(a1 - a0, o1 - o0, zt - zb, c[0], c[1], zb, e.ang, mat, fl); };
  const fw = 0.06;
  fb(s0, s0 + fw, rec - 0.04, rec + 0.04, z0, z0 + h, MATS.winFrameOut); fb(s1 - fw, s1, rec - 0.04, rec + 0.04, z0, z0 + h, MATS.winFrameOut);
  fb(s0, s1, rec - 0.04, rec + 0.04, z0, z0 + fw, MATS.winFrameOut); fb(s0, s1, rec - 0.04, rec + 0.04, z0 + h - fw, z0 + h, MATS.winFrameOut);
  if (w > 1.0) fb(sc - 0.04, sc + 0.04, rec - 0.04, rec + 0.04, z0, z0 + h, MATS.winFrameOut);
  fb(s0 - 0.03, s1 + 0.03, -0.06, rec, z0 - 0.04, z0 - 0.005, MATS.zinc);
  const r = rng(Math.floor(seed * 1e6) + 7)();
  glassPane(e, s0 + fw, s1 - fw, z0 + fw, z0 + h - fw, rec + 0.01, r < 0.05 ? 2 : r < 0.2 ? 1 : r < 0.5 ? 0 : -1, FL);
}
// facade with real openings (brick pieces around each window), storey by storey
function buildFacades(b, opt) {
  const E = facadeEdges(b), rnd = rng(Math.floor(hashStr(b.id) * 1e6) + 3);
  const wallT = 0.35, brick = opt.brick, base = opt.base ?? 0, top = opt.top, levels = opt.levels, st = opt.storey, zf = opt.zf ?? base;
  for (const e of E) {
    if (opt.noEdge && opt.noEdge(e)) continue;
    // our own ground floor span on this edge
    const res = [], fixed = [];
    for (const [A, B] of (opt.skip || (opt.own ? OWN : []))) {
      const dA = (A[0] - e.a[0]) * e.n[0] + (A[1] - e.a[1]) * e.n[1], dB = (B[0] - e.a[0]) * e.n[0] + (B[1] - e.a[1]) * e.n[1];
      if (Math.abs(dA) > 0.15 || Math.abs(dB) > 0.15) continue;
      let sA = (A[0] - e.a[0]) * e.u[0] + (A[1] - e.a[1]) * e.u[1], sB = (B[0] - e.a[0]) * e.u[0] + (B[1] - e.a[1]) * e.u[1];
      if (sA > sB) [sA, sB] = [sB, sA];
      sA = Math.max(0, sA); sB = Math.min(e.L, sB); if (sB - sA < 0.2) continue;
      res.push([sA, sB]);
      if (opt.own) for (const ow of OWN_WINS) { const d = (ow.c[0] - e.a[0]) * e.n[0] + (ow.c[1] - e.a[1]) * e.n[1]; const s = (ow.c[0] - e.a[0]) * e.u[0] + (ow.c[1] - e.a[1]) * e.u[1]; if (Math.abs(d) < 0.2 && s > sA - 0.1 && s < sB + 0.1) fixed.push({ s, w: ow.w }); }
    }
    // window centres: fixed (above our windows) + an even rhythm in the rest
    const cols = [...fixed];
    const free = []; { let s = 0; for (const [a, c] of res.sort((p, q) => p[0] - q[0])) { if (a - s > 0.5) free.push([s, a]); s = c; } if (e.L - s > 0.5) free.push([s, e.L]); }
    for (const [a, c] of free) {
      const m = 0.9, span = c - a - 2 * m, n = Math.floor(span / opt.pitch);
      if (span < 1.3) continue;
      const k = Math.max(1, n), step = span / k;
      for (let i = 0; i < k; i++) cols.push({ s: a + m + step * (i + 0.5), w: rnd() < 0.3 ? 1.1 : 1.5 });
    }
    const piece = (s0, s1, z0, z1, mat = brick, fl = WALLF) => { if (s1 - s0 < 0.01 || z1 - z0 < 0.01) return; const sc = (s0 + s1) / 2; sbox(s1 - s0, wallT, z1 - z0, e.a[0] + e.u[0] * sc - e.n[0] * wallT / 2, e.a[1] + e.u[1] * sc - e.n[1] * wallT / 2, z0, e.ang, mat, fl); };
    // plinth (except under our own walls, which have their own)
    { let s = 0; for (const [a, c] of res) { piece(s, a, base, zf, MATS.plinth); s = c; } piece(s, e.L, base, zf, MATS.plinth); }
    for (let lv = 0; lv < levels; lv++) {
      const z0 = zf + lv * st, z1 = lv === levels - 1 ? top : z0 + st, sill = z0 + 0.85, head = z0 + 2.2;
      const skip = lv === 0 ? res : [];
      const colsL = (opt.fixedCols && opt.fixedCols(e, lv)) || cols;
      const ops = colsL.filter((c) => !skip.some(([a, c2]) => c.s > a - 0.1 && c.s < c2 + 0.1)).map((c) => ({ s0: c.s - c.w / 2, s1: c.s + c.w / 2 })).filter((o) => o.s0 > 0.3 && o.s1 < e.L - 0.3).sort((p, q) => p.s0 - q.s0);
      const lay = lv > 0 && opt.own ? { ...WALLF, layer: 'above' } : WALLF;
      let s = 0;
      const segs = []; { let t = 0; for (const [a, c] of skip) { segs.push([t, a]); t = c; } segs.push([t, e.L]); }
      for (const [g0, g1] of segs) {
        s = g0;
        for (const o of ops) { if (o.s0 < g0 || o.s1 > g1) continue;
          piece(s, o.s0, z0, z1, brick, lay); piece(o.s0, o.s1, z0, sill, brick, lay); piece(o.s0, o.s1, head, z1, brick, lay); s = o.s1; }
        piece(s, g1, z0, z1, brick, lay);
      }
      for (const o of ops) {
        const hs = hashStr(b.id + e.ang.toFixed(3) + lv + o.s0.toFixed(1)), fl = lv > 0 && opt.own ? { layer: 'above' } : {};
        facadeWindow(e, (o.s0 + o.s1) / 2, o.s1 - o.s0, sill, head - sill, hs, fl);
        // black French balcony railing on some upper windows (as in the street photo)
        if (opt.own && lv > 0 && hashStr('r' + hs) < 0.3) { const c = [e.a[0] + e.u[0] * (o.s0 + o.s1) / 2 + e.n[0] * 0.08, e.a[1] + e.u[1] * (o.s0 + o.s1) / 2 + e.n[1] * 0.08]; addStatic(boxGeoRaw(o.s1 - o.s0 + 0.1, 0.03, 0.62, c[0], c[1], sill - 0.05, e.ang), MATS.railing, fl); }
        // small basement window in the plinth under each ground-floor window
        if ((opt.own || opt.basement) && lv === 0) { const c = [e.a[0] + e.u[0] * (o.s0 + o.s1) / 2 + e.n[0] * 0.005, e.a[1] + e.u[1] * (o.s0 + o.s1) / 2 + e.n[1] * 0.005]; sbox(0.7, 0.02, 0.32, c[0], c[1], 0.3, e.ang, MATS.winFrameOut, {}); sbox(0.6, 0.025, 0.24, c[0], c[1], 0.34, e.ang, MATS.darkglass, {}); }
      }
    }
    // gutter + fascia, painted green (as on the block)
    if (opt.fascia) { const c = [e.a[0] + e.u[0] * e.L / 2 + e.n[0] * 0.35, e.a[1] + e.u[1] * e.L / 2 + e.n[1] * 0.35]; sbox(e.L + 0.9, 0.16, 0.22, c[0], c[1], top - 0.05, e.ang, opt.fascia, { layer: opt.own ? 'above' : undefined }); }
  }
  return E;
}
// ---- roof: hip roof of constant pitch, as a height field over the outline (clipped to the eaves outline)
function clipPolySquare(poly, x0, y0, x1, y1) {
  let out = poly;
  const clip = (inside, inter) => { const res = []; for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; const ia = inside(a), ib = inside(b); if (ia) res.push(a); if (ia !== ib) res.push(inter(a, b)); } out = res; };
  const lerpX = (x) => (a, b) => [x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])], lerpY = (y) => (a, b) => [a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y];
  clip((p) => p[0] >= x0, lerpX(x0)); if (!out.length) return out; clip((p) => p[0] <= x1, lerpX(x1)); if (!out.length) return out;
  clip((p) => p[1] >= y0, lerpY(y0)); if (!out.length) return out; clip((p) => p[1] <= y1, lerpY(y1));
  return out;
}
function buildRoof(poly, zEave, pitch, overhang, mat, flags = {}, cell = 0.5) {
  const eave = offsetPoly(poly, overhang), k = Math.tan(pitch * D2R);
  const height = (x, y) => { let d = Infinity; for (let i = 0; i < eave.length; i++) { const a = eave[i], b = eave[(i + 1) % eave.length]; d = Math.min(d, segDist(x, y, a[0], a[1], b[0], b[1])); } return zEave + k * d; };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of eave) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pos = [];
  const cache = new Map(); const hz = (x, y) => { const key = x.toFixed(3) + ',' + y.toFixed(3); let v = cache.get(key); if (v === undefined) { v = height(x, y); cache.set(key, v); } return v; };
  for (let cx = x0; cx < x1; cx += cell) for (let cy = y0; cy < y1; cy += cell) {
    const ex = Math.min(cx + cell, x1), ey = Math.min(cy + cell, y1);
    const corners = [[cx, cy], [ex, cy], [ex, ey], [cx, ey]];
    const ins = corners.map((q) => inPolyW(q[0], q[1], eave));
    let pieces;
    if (ins.every(Boolean)) pieces = [corners];
    else { const c = clipPolySquare(eave, cx, cy, ex, ey); if (c.length < 3) continue; pieces = [c]; }
    for (const pc of pieces) {
      const tri = THREE.ShapeUtils.triangulateShape(pc.map((q) => v2(q[0], q[1])), []);
      for (const t of tri) {
        let [a, b2, c] = t.map((i) => pc[i]);
        if ((b2[0] - a[0]) * (c[1] - a[1]) - (b2[1] - a[1]) * (c[0] - a[0]) < 0) [b2, c] = [c, b2];
        for (const q of [a, b2, c]) pos.push(q[0], hz(q[0], q[1]), -q[1]);
      }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // roof tile UVs: along the fall line is hard to get per facet; use world xz with a slope stretch
  const P2 = g.attributes.position, uv = new Float32Array(P2.count * 2), N2 = g.attributes.normal;
  for (let i = 0; i < P2.count; i++) { const nx = N2.getX(i), nz = N2.getZ(i); const horiz = Math.hypot(nx, nz) || 1; const dx = nx / horiz, dz = nz / horiz;
    const x = P2.getX(i), z = P2.getZ(i), y = P2.getY(i);
    uv[i * 2] = x * -dz + z * dx; uv[i * 2 + 1] = (x * dx + z * dz) / Math.cos(pitch * D2R) + y * 0; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  addStatic(g, mat, flags);
  // soffit under the overhang: one quad per edge between the wall line and the eave line
  const sp = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = eave[(i + 1) % poly.length], d = eave[i];
    for (const q of [a, c, b, a, d, c]) sp.push(q[0], zEave - 0.02, -q[1]);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.computeVertexNormals(); worldUV(sg);
  addStatic(sg, std({ color: 0xf2f0ea, roughness: 0.8, side: THREE.DoubleSide }), { ...flags, noShadow: true });
}

// ---- the block itself
if (MAIN) {
  buildFacades(MAIN, { own: true, brick: MATS.brick, base: 0, zf: FZ, levels: 3, storey: STOREY, top: TOPZ, pitch: 3.3, fascia: MATS.greenpaint });
  buildRoof(MAIN.p, TOPZ, 27, 0.45, MATS.roof, { layer: 'above' });
  // bay windows on the upper floors (green and blue, as in the photos): world point on the outer face + width
  const E = facadeEdges(MAIN);
  const onEdge = (q) => { let best = null; for (const e of E) { const d = (q[0] - e.a[0]) * e.n[0] + (q[1] - e.a[1]) * e.n[1], s = (q[0] - e.a[0]) * e.u[0] + (q[1] - e.a[1]) * e.u[1]; if (Math.abs(d) < 0.3 && s > 1 && s < e.L - 1 && (!best || Math.abs(d) < best.d)) best = { e, s, d: Math.abs(d) }; } return best; };
  const bays = [[OUTW(-1200), MATS.bayBlue], [OUTW(-2700), MATS.bayGreen], [OUTN(1500 + 470), MATS.bayGreen], [OUTN(1544 + 1700), MATS.bayBlue], [OUTN(1544 + 2900), MATS.bayGreen]];
  for (const [q, mat] of bays) {
    const hit = onEdge(q); if (!hit) continue;
    const { e, s } = hit, w = 1.75, dpt = 0.55, z0 = FZ + STOREY - 0.15, z1 = TOPZ - 0.1;
    const at = (ss, o) => [e.a[0] + e.u[0] * ss + e.n[0] * o, e.a[1] + e.u[1] * ss + e.n[1] * o];
    const c = at(s, dpt / 2);
    sbox(w, dpt, 0.25, c[0], c[1], z0, e.ang, mat, { layer: 'above' });
    sbox(w + 0.1, dpt + 0.1, 0.2, c[0], c[1], z1, e.ang, MATS.greenpaint, { layer: 'above' });
    for (let lv = 0; lv < 2; lv++) {
      const zb = z0 + 0.25 + lv * STOREY, zs = zb + 0.6, zt = Math.min(zb + STOREY - 0.25, z1);
      const cf = at(s, dpt - 0.04);
      sbox(w, 0.08, zs - zb, cf[0], cf[1], zb, e.ang, mat, { layer: 'above' });
      sbox(w, 0.08, zt - (zs + 1.45), cf[0], cf[1], zs + 1.45, e.ang, mat, { layer: 'above' });
      const ge = { a: at(s - w / 2, dpt + 0.02), u: e.u, n: e.n, ang: e.ang };
      for (const k of [0, 1, 2]) { const s0 = 0.08 + k * (w - 0.16) / 3, s1 = s0 + (w - 0.16) / 3 - 0.06; glassPane(ge, s0, s1, zs, zs + 1.45, 0.06, -1, { layer: 'above' }); }
      for (const k of [0, 1, 2, 3]) { const cc = at(s - w / 2 + 0.04 + k * (w - 0.08) / 3, dpt - 0.04); sbox(0.07, 0.1, zt - zb, cc[0], cc[1], zb, e.ang, MATS.winFrameOut, { layer: 'above' }); }
      for (const side of [-1, 1]) { const cs = at(s + side * (w / 2 - 0.04), dpt / 2); sbox(0.08, dpt, zt - zb, cs[0], cs[1], zb, e.ang, mat, { layer: 'above' }); }
    }
  }
  // courtyard balconies (blue diagonal cladding) on the floors above, as in the courtyard photo
  for (const e of E) {
    const mid = [e.a[0] + e.u[0] * e.L / 2, e.a[1] + e.u[1] * e.L / 2];
    const yard = inPolyW(mid[0] + e.n[0] * 3, mid[1] + e.n[1] * 3, [[3, -12], [3, 15], [20, 21], [34, 24], [34, 9], [18, 9], [18, -14]]);
    if (!yard || e.L < 6) continue;
    for (let s = 2.5; s < e.L - 3; s += 7) for (let lv = 1; lv < 3; lv++) {
      const z = FZ + lv * STOREY, c = [e.a[0] + e.u[0] * (s + 1.6) + e.n[0] * 0.7, e.a[1] + e.u[1] * (s + 1.6) + e.n[1] * 0.7];
      sbox(3.2, 1.4, 0.15, c[0], c[1], z - 0.15, e.ang, MATS.concrete, { layer: 'above' });
      const f = [c[0] + e.n[0] * 0.68, c[1] + e.n[1] * 0.68];
      sbox(3.2, 0.04, 1.0, f[0], f[1], z, e.ang, MATS.balcony, { layer: 'above' });
      for (const sd of [-1, 1]) { const q = [c[0] + e.u[0] * sd * 1.58, c[1] + e.u[1] * sd * 1.58]; sbox(0.04, 1.4, 1.0, q[0], q[1], z, e.ang, MATS.balcony, { layer: 'above' }); }
    }
  }
  // seen from above, the rest of the ground floor is a closed block: a lid at our ceiling level with our flat cut out
  {
    const own = [[11, -26], [806, -26], [1229, 400], [1229, 1544], [247, 1544], [247, 1680], [-635, 1680], [-635, 1247], [163, 1247], [163, 855], [11, 855]].map(PLANPT);
    const sh = new THREE.Shape(MAIN.p.map((q) => v2(q[0], q[1]))); sh.holes.push(new THREE.Path(own.map((q) => v2(q[0], q[1]))));
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, FZ + STOREY, 0); worldUV(g);
    addStatic(g, std({ color: 0x55524e, roughness: 0.9 }), { layer: 'over', noShadow: true });
  }
}

// ---- neighbours: extruded footprints with painted windows, pitched roofs
function facadeTex(o) {
  return canvasTex(512, 512, (g, W) => {
    const r = rng(o.seed), pxm = W / 6;
    g.fillStyle = o.wall; g.fillRect(0, 0, W, W);
    if (o.brick) for (let row = 0; row < 90; row++) { const y = row * 0.067 * pxm; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y, W, 1); for (let x = (row % 2) * 0.125 * pxm; x < W; x += 0.25 * pxm) { const v = (r() - 0.5) * 0.14; g.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v).toFixed(3)})`; g.fillRect(x, y + 1, 0.25 * pxm - 1, 0.067 * pxm - 1); } }
    for (let bx = 0; bx < 2; bx++) for (let by = 0; by < 2; by++) {
      const ww = 1.3, wh = 1.4, ws = 0.9, x0 = (bx * 3 + (3 - ww) / 2) * pxm, yTop = W - (by * 3 + ws + wh) * pxm;
      g.fillStyle = o.frame; g.fillRect(x0 - 4, yTop - 4, ww * pxm + 8, wh * pxm + 8);
      const gl = g.createLinearGradient(0, yTop, 0, yTop + wh * pxm); gl.addColorStop(0, '#a6b8c6'); gl.addColorStop(0.5, '#3f4b55'); gl.addColorStop(1, '#283037');
      g.fillStyle = gl; g.fillRect(x0, yTop, ww * pxm, wh * pxm);
      g.fillStyle = o.frame; g.fillRect(x0 + ww * pxm / 2 - 2, yTop, 4, wh * pxm);
    }
  }, [6, 6]);
}
const NSTYLES = [
  std({ map: facadeTex({ seed: 3, wall: '#b4593f', frame: '#f1efe9', brick: true }), roughness: 0.9 }),
  std({ map: facadeTex({ seed: 5, wall: '#c9ad7f', frame: '#f4f2ec', brick: true }), roughness: 0.9 }),
  std({ map: facadeTex({ seed: 7, wall: '#ece6da', frame: '#4c4c4c' }), roughness: 0.9 }),
  std({ map: facadeTex({ seed: 9, wall: '#9c4a35', frame: '#ece9e2', brick: true }), roughness: 0.9 }),
  std({ map: facadeTex({ seed: 11, wall: '#d9d3c7', frame: '#f6f4ef' }), roughness: 0.9 }),
];
const NROOFS = [MATS.roof, std({ map: roofTileTex, color: 0xd88e6a, roughness: 0.85 }), std({ color: 0x4a4d50, roughness: 0.8 })];
for (const b of SITE.buildings) {
  if (b === MAIN || b.id === '121435864') continue;
  const A = Math.abs(polyAreaW(b.p));
  if (A < 6) continue;
  const flat = ['school', 'sports_hall', 'sports_centre', 'retail', 'commercial', 'industrial'].includes(b.b) || A > 1400;
  const lv = b.lv || (b.b === 'roof' ? 1 : A > 260 ? 3 : A > 70 ? 2 : 1);
  if (b.b === 'roof' || b.b === 'service' || (b.b === 'yes' && A < 25)) {
    // shelters, sheds: low box
    const h = 2.4; const E = facadeEdges(b);
    for (const e of E) { const c = [e.a[0] + e.u[0] * e.L / 2 - e.n[0] * 0.05, e.a[1] + e.u[1] * e.L / 2 - e.n[1] * 0.05]; sbox(e.L, 0.1, h, c[0], c[1], 0, e.ang, MATS.concrete, WALLF); }
    const g = polyGeo(b.p, h); addStatic(g, NROOFS[2], {});
    continue;
  }
  const hsh = hashStr(b.id), st = 2.9, top = lv * st + 0.5, mat = NSTYLES[Math.floor(hsh * NSTYLES.length)];
  const E = facadeEdges(b);
  const pos = [], uv = [];
  for (const e of E) {
    const q = [[0, 0], [e.L, 0], [e.L, top], [0, top]].map(([s, z]) => [e.a[0] + e.u[0] * s, e.a[1] + e.u[1] * s, z, s]);
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(q[i][0], q[i][2], -q[i][1]); uv.push(q[i][3] / 6 + hsh * 3, (q[i][2] - 0.4) / 6); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const mm = new THREE.Mesh(g, mat); mm.castShadow = mm.receiveShadow = true; g.computeBoundsTree(); scene.add(mm); collidables.push(mm);
  if (flat) addStatic(polyGeo(b.p, top), NROOFS[2], {});
  else buildRoof(b.p, top, b.b === 'apartments' || A > 200 ? 27 : 35, 0.35, NROOFS[Math.floor(hsh * 7) % 2], {}, A > 600 ? 0.8 : 0.5);
}

// ============================================================ the courtyard (traced from the Esri aerial at 8 cm/px, and the courtyard photos)
// The yard sits at our floor level (no steps at the red door); the street is 0.9 m lower: the gateway ramps up.
const YZ = FZ - 0.02;
const YARD = [[2.75, 15.45], [19.73, 21.21], [32.89, 23.91], [34.32, 12.69], [18, 9], [13.4, 8.6], [15.6, -6.8], [24.5, -8], [25, -18], [20, -21], [11.58, -16.75], [9.35, -8.6], [9.81, -8.48]];
const GARDEN2 = [[13.4, 8.6], [18, 9], [19, 4], [37, 7], [38, -3], [38.5, -5], [24.5, -8], [15.6, -6.8]];   // Idrottsgatan 4's garden, behind the white wall
const YARDF = { floor: true, noShadow: true };
function flatPoly(pts, z, mat, flags) { const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map((q) => v2(q[0], q[1])))); g.rotateX(-Math.PI / 2); g.translate(0, z, 0); worldUV(g); return addStatic(g, mat, flags); }
flatPoly(YARD, YZ, MATS.gPave, YARDF);
flatPoly(GARDEN2, YZ, MATS.gGrass, YARDF);
// a raised yard: its open edges get a low retaining face down to the street level
for (const poly of [YARD, GARDEN2]) for (let i = 0; i < poly.length; i++) {
  const a = poly[i], c = poly[(i + 1) % poly.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
  sbox(L, 0.2, YZ, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0, Math.atan2(c[1] - a[1], c[0] - a[0]), MATS.plinth, {});
}
const yardAt = (x, y) => [x, y];
MATS.bench = std({ color: 0x7a6248, roughness: 0.85 });
MATS.planter = std({ color: 0x8a6a4c, roughness: 0.9 });
MATS.hedge = std({ color: 0x55743a, roughness: 1, flatShading: true });
MATS.lavender = std({ color: 0x8c93a8, roughness: 1, flatShading: true });
MATS.picket = std({ color: 0xf0efea, roughness: 0.6 });
MATS.darkfence = std({ color: 0x4a3a30, roughness: 0.8 });
MATS.sand = std({ color: 0xcdb98e, roughness: 1 });
MATS.cobble = std({ map: canvasTex(256, 256, (g, W) => { const r = rng(91); g.fillStyle = '#6c6660'; g.fillRect(0, 0, W, W); for (let i = 0; i < 70; i++) { const v = 110 + r() * 90; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.beginPath(); g.ellipse(r() * W, r() * W, 10 + r() * 10, 8 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill(); } }, [0.6, 0.6]), roughness: 0.8 });
const ANG16 = Math.atan2(DIRN[1], DIRN[0]) - Math.PI / 2;   // the block's grid (north-wing facade direction)
// octagonal raised planter with a wooden bench ring, lavender and a tree (centre traced from the aerial)
const planterC = [22.4, 15.4];
{
  const [cx, cy] = planterC, r = 1.55;
  for (let k = 0; k < 8; k++) {
    const a0 = k * Math.PI / 4 + Math.PI / 8 + ANG16, a1 = a0 + Math.PI / 4;
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
    const c = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    sbox(L, 0.22, 0.42, c[0], c[1], YZ, ang, MATS.concrete, WALLF);
    const cb = [cx + Math.cos((a0 + a1) / 2) * (r + 0.32), cy + Math.sin((a0 + a1) / 2) * (r + 0.32)];
    sbox(L * 1.22, 0.42, 0.05, cb[0], cb[1], YZ + 0.42, ang, MATS.bench, {});
    sbox(L * 1.22, 0.06, 0.05, cb[0] + Math.cos((a0 + a1) / 2) * 0.19, cb[1] + Math.sin((a0 + a1) / 2) * 0.19, YZ + 0.37, ang, MATS.bench, {});
    sbox(0.08, 0.32, 0.42, cb[0], cb[1], YZ, ang, MATS.darkfence, {});
  }
  const g = new THREE.CircleGeometry(r - 0.1, 8); g.rotateX(-Math.PI / 2); g.rotateY(ANG16 + Math.PI / 8); g.translate(cx, YZ + 0.4, -cy); worldUV(g); addStatic(g, std({ color: 0x4a3a2c, roughness: 1 }), {});
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = 0.6 + (k % 3) * 0.28; const sp = new THREE.IcosahedronGeometry(0.28 + (k % 2) * 0.06, 1); sp.scale(1, 0.75, 1); sp.translate(cx + Math.cos(a) * rr, YZ + 0.58, -(cy + Math.sin(a) * rr)); addStatic(sp, MATS.lavender, {}); }
}
// lawn (low hedge on its courtyard side), the small sandbox, the second lawn with its white picket fence
const LAWN_A = [[7.72, 13.81], [16.55, 15.91], [16.97, 12.13], [8.13, 10.87]];
flatPoly(LAWN_A, YZ + 0.02, MATS.grass, {});
flatPoly([[8.6, 5.4], [12.8, 5.4], [12.8, 3.7], [8.6, 3.7]], YZ + 0.03, MATS.sand, {});
for (const [a, c] of [[[8.6, 5.4], [12.8, 5.4]], [[12.8, 5.4], [12.8, 3.7]], [[12.8, 3.7], [8.6, 3.7]], [[8.6, 3.7], [8.6, 5.4]]]) { const L = Math.hypot(c[0] - a[0], c[1] - a[1]); sbox(L, 0.12, 0.2, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, YZ, Math.atan2(c[1] - a[1], c[0] - a[0]), MATS.bench, {}); }
const LAWN_B = [[8.1, 3.3], [13.6, 3.3], [14.4, -2.2], [8.6, -2.2]];
flatPoly(LAWN_B, YZ + 0.02, MATS.grass, {});
function fenceLine(a, b, h, mat, picket = true, z = YZ) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], ang = Math.atan2(u[1], u[0]);
  for (let s = 0.06; s < L; s += picket ? 0.14 : L) {
    const w = picket ? 0.08 : L, c = picket ? [a[0] + u[0] * s, a[1] + u[1] * s] : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    sbox(w, 0.03, h, c[0], c[1], z, ang, mat, WALLF);
  }
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; sbox(L, 0.05, 0.08, c[0], c[1], z + h * 0.75, ang, mat, {});
}
fenceLine([8.6, -2.2], [14.4, -2.2], 1.1, MATS.picket);
fenceLine([8.1, 3.3], [8.6, -2.2], 1.1, MATS.picket);
// the white wall around Idrottsgatan 4's garden
for (const [a, c] of [[[13.4, 8.6], [15.6, -6.8]], [[15.6, -6.8], [24.5, -8]], [[13.4, 8.6], [18, 9]]]) { const L = Math.hypot(c[0] - a[0], c[1] - a[1]); sbox(L, 0.18, 1.7, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, YZ, Math.atan2(c[1] - a[1], c[0] - a[0]), MATS.picket, WALLF); }
// the dark wooden patio screen with blue posts, garden chairs and a round table (courtyard photo)
fenceLine([9.0, 9.0], [12.8, 10.3], 1.2, MATS.darkfence, false);
for (const q of [[9.0, 9.0], [10.9, 9.65], [12.8, 10.3]]) sbox(0.1, 0.1, 1.45, q[0], q[1], YZ, 0, MATS.bayBlue, {});
{ const c = [11.2, 7.6]; const g = new THREE.CylinderGeometry(0.45, 0.45, 0.03, 20); g.translate(c[0], YZ + 0.72, -c[1]); addStatic(g, MATS.picket, {}); const l = new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8); l.translate(c[0], YZ + 0.36, -c[1]); addStatic(l, MATS.picket, {});
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4, q = [c[0] + Math.cos(a) * 0.75, c[1] + Math.sin(a) * 0.75]; sbox(0.45, 0.45, 0.04, q[0], q[1], YZ + 0.44, a, MATS.picket, {}); sbox(0.45, 0.04, 0.45, q[0] + Math.cos(a) * 0.22, q[1] + Math.sin(a) * 0.22, YZ + 0.46, a + Math.PI / 2, MATS.picket, {}); } }
// hedges along the north wing (behind the planter) and by the lawn
for (const [a, c, h] of [[[17.5, 18.5], [27.5, 21.3], 1.0], [[7.9, 14.4], [16.5, 16.5], 0.6]]) { const L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.ceil(L / 0.7); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const sp = new THREE.IcosahedronGeometry(0.5, 1); sp.scale(1, h / 1, 0.8); sp.translate(a[0] + (c[0] - a[0]) * t, YZ + h * 0.45, -(a[1] + (c[1] - a[1]) * t)); addStatic(sp, MATS.hedge, {}); } }
// round cobble drip strip along the west wing's courtyard face
ribbon([[9.75, -8.0], [2.95, 15.0]].map(([x, y]) => [x + 0.35 * 0.959, y + 0.35 * 0.283]), 0.6, YZ + 0.01, layerMat(MATS.cobble, 3), YARDF);
// the parking corner by the gateway: a white van and a bike rack
{ const c = [16, -13]; sbox(2.0, 5.2, 2.0, c[0], c[1], YZ + 0.35, ANG16 + Math.PI / 2, MATS.white, WALLF); sbox(1.9, 1.0, 0.7, c[0] + 2.2 * Math.cos(ANG16), c[1] + 2.2 * Math.sin(ANG16), YZ + 0.35, ANG16 + Math.PI / 2, MATS.darkglass, {});
  for (const dx of [-0.8, 0.8]) for (const dy of [-1.8, 1.8]) { const w = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16); w.rotateX(Math.PI / 2); w.rotateY(ANG16); w.translate(c[0] + dx * Math.cos(ANG16 + Math.PI / 2) + dy * Math.cos(ANG16), YZ + 0.33, -(c[1] + dx * Math.sin(ANG16 + Math.PI / 2) + dy * Math.sin(ANG16))); addStatic(w, MATS.rubber, {}); } }
for (let k = 0; k < 6; k++) { const q = [7.3 + k * 0.08, 1.0 + k * 0.7]; sbox(0.05, 1.7, 0.75, q[0], q[1], YZ, ANG16, MATS.steel, {}); }

// ============================================================ the gateway house: Rådmansgatan's red arched doors (street view), 2 storeys + attic with dormers
// Left arch: the glazed main door into the gateway (through the building to the yard); right arch: the garage door.
const GATE = SITE.buildings.find((b) => b.id === '121435864');
const GATEWAY = { s0: 4.65, s1: 5.9 };     // left arch, along the west face from its north end (metres)
if (GATE) {
  const fixedCols = (e, lv) => { if (Math.abs(e.ang - Math.atan2(-8.16, 2.24)) > 0.1) return null; return lv === 0 ? [{ s: 1.3, w: 1.2 }, { s: 3.0, w: 1.2 }] : [{ s: 1.3, w: 1.2 }, { s: 3.0, w: 1.2 }, { s: 5.2, w: 1.2 }, { s: 7.0, w: 1.2 }]; };
  const E0 = facadeEdges(GATE);
  const west = E0.find((e) => Math.abs(e.ang - Math.atan2(-8.16, 2.24)) < 0.1);
  const at = (s, o = 0) => [west.a[0] + west.u[0] * s + west.n[0] * o, west.a[1] + west.u[1] * s + west.n[1] * o];
  const arches = [[GATEWAY.s0, GATEWAY.s1], [6.45, 7.95]];
  // where the gateway comes out on the yard side (east face)
  const east = E0.find((e) => Math.hypot((e.a[0] + e.b[0]) / 2 - 10.47, (e.a[1] + e.b[1]) / 2 + 12.68) < 1);
  const gc = at((GATEWAY.s0 + GATEWAY.s1) / 2), din = [-west.n[0], -west.n[1]];
  const tHit = ((east.a[0] - gc[0]) * east.n[0] + (east.a[1] - gc[1]) * east.n[1]) / (din[0] * east.n[0] + din[1] * east.n[1]);
  GATEWAY.L = tHit; GATEWAY.at = at; GATEWAY.ang = west.ang;
  const exitC = [gc[0] + din[0] * tHit, gc[1] + din[1] * tHit], hw = (GATEWAY.s1 - GATEWAY.s0) / 2 + 0.05;
  const eSkip = [[exitC[0] - east.u[0] * hw, exitC[1] - east.u[1] * hw], [exitC[0] + east.u[0] * hw, exitC[1] + east.u[1] * hw]];
  buildFacades(GATE, { brick: MATS.brick, base: 0, zf: FZ, levels: 2, storey: STOREY, top: FZ + 2 * STOREY, pitch: 3, fascia: MATS.greenpaint, basement: true,
    skip: [...arches.map(([s0, s1]) => [at(s0), at(s1)]), eSkip], fixedCols, noEdge: (e) => Math.hypot((e.a[0] + e.b[0]) / 2 - 4.04, (e.a[1] + e.b[1]) / 2 + 10.03) < 1 });
  buildRoof(GATE.p, FZ + 2 * STOREY, 42, 0.4, MATS.roof, {});
  // the two arches: brick above the springing, a pale stone surround
  MATS.stone = std({ color: 0xd8cfbf, roughness: 0.8 });
  for (const [s0, s1] of arches) {
    const w = s1 - s0, sc = (s0 + s1) / 2, c = at(sc, -0.175), r = w / 2, spring = 2.05;
    sbox(w, 0.35, FZ + STOREY - spring - r, c[0], c[1], spring + r, west.ang, MATS.brick, WALLF);
    // arch fill (brick spandrels) and the pale surround as a half ring
    const ring = new THREE.TorusGeometry(r + 0.06, 0.09, 6, 24, Math.PI); ring.rotateY(west.ang); const rc = at(sc, 0.03); ring.translate(rc[0], spring, -rc[1]); addStatic(ring, MATS.stone, {});
    for (const sd of [-1, 1]) { const q = at(sc + sd * (r + 0.06), 0.03); sbox(0.18, 0.1, spring, q[0], q[1], 0, west.ang, MATS.stone, {}); }
    const sp = new THREE.Shape(); sp.moveTo(-r, 0); sp.lineTo(-r, r); sp.lineTo(r, r); sp.lineTo(r, 0); sp.absarc(0, 0, r, 0, Math.PI, false);
    const sg = new THREE.ExtrudeGeometry(sp, { depth: 0.35, bevelEnabled: false, curveSegments: 16 }); sg.translate(0, 0, -0.35); sg.rotateY(west.ang); const sc2 = at(sc, 0); sg.translate(sc2[0], spring, -sc2[1]); boxUVs(sg, 1, 1, 1); addStatic(sg, MATS.brick, WALLF);
  }
  // the garage door (red frame, glazed top panels) — closed
  { const [s0, s1] = arches[1], c = at((s0 + s1) / 2, -0.12); sbox(s1 - s0, 0.06, 2.05, c[0], c[1], 0, west.ang, MATS.redframe = MATS.redframe || std({ color: 0x9a2a22, roughness: 0.45 }), WALLF);
    for (let k = 0; k < 4; k++) { const q = at(s0 + 0.12 + k * (s1 - s0 - 0.24) / 4 + (s1 - s0 - 0.24) / 8, -0.085); sbox((s1 - s0 - 0.3) / 4, 0.02, 0.5, q[0], q[1], 1.35, west.ang, MATS.darkglass, {}); } }
  // house number above the left arch
  // the gateway passage: from the street door straight through to the yard, ramping up the 0.9 m to the yard level
  const L = GATEWAY.L + 0.05, w = GATEWAY.s1 - GATEWAY.s0;
  const pIn = (d, side) => at((GATEWAY.s0 + GATEWAY.s1) / 2 + side * w / 2, -d);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const d0 = 0.35 + i * (L - 0.35) / n, d1 = 0.35 + (i + 1) * (L - 0.35) / n, z = YZ * Math.min(1, Math.max(0, (d1 - 1.4) / (L - 2.4)));
    const c = at((GATEWAY.s0 + GATEWAY.s1) / 2, -(d0 + d1) / 2);
    sbox(w + 0.02, d1 - d0 + 0.01, 0.1, c[0], c[1], z - 0.1, west.ang, MATS.terrazzo, { floor: true, noShadow: true });
  }
  { const c = at((GATEWAY.s0 + GATEWAY.s1) / 2, -0.2); sbox(w + 0.02, 0.45, 0.1, c[0], c[1], -0.08, west.ang, MATS.terrazzo, { floor: true, noShadow: true }); }
  for (const side of [-1, 1]) { const c = at((GATEWAY.s0 + GATEWAY.s1) / 2 + side * (w / 2 + 0.06), -(L / 2 + 0.2)); sbox(0.12, L, 3.0, c[0], c[1], 0, west.ang, MATS.stairwall, WALLF); }
  { const c = at((GATEWAY.s0 + GATEWAY.s1) / 2, -(L / 2 + 0.2)); sbox(w + 0.3, L, 0.15, c[0], c[1], 3.0, west.ang, MATS.ceiling, {}); }
  // mailboxes and a lamp in the gateway
  { const c = at(GATEWAY.s0 + 0.08, -4.5); sbox(0.12, 1.2, 0.6, c[0], c[1], 1.3, west.ang, std({ color: 0x5e6b62, roughness: 0.5, metalness: 0.4 }), WALLF); }
}
// ============================================================ trees (OSM + the courtyard tree + street trees in the photos) and street lamps
MATS.trunk = std({ color: 0x5a4a3c, roughness: 0.95 });
MATS.leaves = std({ color: 0x8a9a3e, roughness: 0.95, flatShading: true });
MATS.leaves2 = std({ color: 0xa3923c, roughness: 0.95, flatShading: true });
const TREES = [...SITE.trees.map((t) => [t[0], t[1], 1, 0]), [planterC[0], planterC[1], 0.65, YZ + 0.4], [17, 16.3, 0.6, YZ], [22.2, 19.4, 0.55, YZ], [6.2, 9.6, 0.75, YZ]];
for (let s = 6; s < 60; s += 9) { const q = OUTW(-s * PXM); TREES.push([q[0] - DIRI[0] * 5.5, q[1] - DIRI[1] * 5.5, 0.85]); }
for (const [x, y, k, zb = 0] of TREES) {
  const r = rng(Math.floor((x * 131 + y * 71) * 100) >>> 0 || 1), h = (5 + r() * 3) * k;
  const tg = new THREE.CylinderGeometry(0.08 * k, 0.14 * k, h * 0.6, 7); tg.translate(x, zb + h * 0.3, -y); addStatic(tg, MATS.trunk, WALLF);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.IcosahedronGeometry((1.0 + r() * 0.8) * k, 1);
    s.translate(x + (r() - 0.5) * 1.6 * k, zb + h * (0.66 + r() * 0.3), -(y + (r() - 0.5) * 1.6 * k));
    addStatic(s, i % 2 ? MATS.leaves : MATS.leaves2, {});
  }
}
// tall street lamps along Rådmansgatan and Trollebergsvägen (as in the street photo)
MATS.pole = std({ color: 0x8d9295, roughness: 0.4, metalness: 0.7 });
MATS.lampHead = std({ color: 0xdedcd4, emissive: 0xffd7a0, emissiveIntensity: 0, roughness: 0.4 });
const LAMPS = [];
for (const s of [3, 28, 53]) { const q = OUTW(-s * PXM + 900); LAMPS.push([q[0] - DIRI[0] * 3.2, q[1] - DIRI[1] * 3.2, DIRI]); }
for (const s of [6, 30]) { const q = OUTN(1544 + s * PXM - 800); LAMPS.push([q[0] + DIRN[0] * 3.2, q[1] + DIRN[1] * 3.2, [-DIRN[0], -DIRN[1]]]); }
for (const [x, y, d] of LAMPS) {
  const pg = new THREE.CylinderGeometry(0.06, 0.09, 8, 8); pg.translate(x, 4, -y); addStatic(pg, MATS.pole, WALLF);
  const ang = Math.atan2(-d[1], -d[0]);
  sbox(1.2, 0.06, 0.06, x - d[0] * 0.55, y - d[1] * 0.55, 7.9, ang, MATS.pole, {});
  sbox(0.55, 0.22, 0.12, x - d[0] * 1.2, y - d[1] * 1.2, 7.8, ang, MATS.lampHead, { noShadow: true });
}
// the nearest lamps really light the street at night
const streetLights = (coarse ? [] : [LAMPS[0], LAMPS[3]]).map(([x, y, d]) => {
  const L = new THREE.SpotLight(0xffd2a0, 0, 26, 1.05, 0.6, 1.4);
  L.position.copy(w2t(x - d[0] * 1.2, y - d[1] * 1.2, 7.7)); L.target.position.copy(w2t(x - d[0] * 2.5, y - d[1] * 2.5, 0));
  scene.add(L, L.target); return L;
});
const litMeshes = LIT.map((list, i) => { if (!list.length) return null; const g = mergeGeometries(list.map((x) => x.toNonIndexed()), false); const m = new THREE.Mesh(g, MATS.litGlass); m.userData.tier = i; scene.add(m); m.visible = false; return m; });
onSunHooks.push((h, dusk) => {
  const night = 1 - dusk;
  MATS.lampHead.emissiveIntensity = night > 0.3 ? 2.2 : 0;
  for (const L of streetLights) L.intensity = night > 0.3 ? 60 * night : 0;
  // windows: evening sets go dark at 23-00:30, late ones at 01:30, a few owls all night
  const hh = h < 12 ? h + 24 : h;
  const on = [night > 0.25 && hh < 23.5, night > 0.25 && hh < 25.5, night > 0.25];
  litMeshes.forEach((m, i) => { if (m) { m.visible = on[i]; } });
  MATS.litGlass.emissiveIntensity = 0.9 * night;
});
