// ------------------------------------------------------------ PLAN panel (O): shopping list, saved/shared layouts, placement check, daylight
// One panel with four tabs. Everything reads the live furniture state, so it is always current.
const PLAN_UI = { tab: 'list', open: false };
const SEK_DKK = 0.69;       // rough rate for the two items only priced in Sweden
const fmtKr = (n) => `${Math.round(n).toLocaleString('da-DK')} kr`;
// "3.749 + 899 kr (før 4.999)" → 4648 ; "≈ 2,900 kr" → 2900 (approx) ; "price at dealers" → null
function parseKr(s) {
  if (!s) return null; s = String(s).split(/\((?:før|was|list|before)/i)[0];
  const m = s.match(/((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:\s*\+\s*(?:\d{1,3}(?:[.,]\d{3})+|\d+))*)\s*kr/i); if (!m) return null;
  const kr = m[1].split('+').reduce((a, t) => a + +t.trim().replace(/[.,]/g, ''), 0);
  return { kr, approx: /≈|from|ca\.?/i.test(s.slice(Math.max(0, m.index - 10), m.index + 1)) };
}
const plainDetail = (s) => String(s || '').replace(/\s*·\s*[\d.,]+\s*kr.*$/i, '').trim();
// ---- shopping list: one line per thing to buy (or still to decide). key = stable id for the "decided" tick.
function shopLines() {
  const L = [], add = (room, key, name, o = {}) => L.push({ room, key, name, detail: o.detail || '', kr: o.kr ?? null, approx: !!o.approx, href: o.href || null, note: o.note || '', qty: o.qty || 1, unit: o.unit ?? null });
  const safe = (f) => { try { return f(); } catch (_) { return null; } };
  const linkOf = (m) => safe(() => m.link && m.link()) || {};
  // bedroom
  add('Bedroom', 'bed', `Bed ${Math.round(bed.width * 100)} × 200 cm`, { note: 'No product picked yet' });
  safe(() => { const N = NIGHT[night.m], c = N.cols[night.col]; add('Bedroom', 'night', `${N.brand} ${N.name} nightstand`, { qty: 2, unit: N.kr, kr: N.kr * 2, detail: `${Math.round(N.W * 100)} × ${Math.round(N.D * 100)} × ${Math.round(N.H * 100)} cm · ${c.name}`, href: c.url || N.url }); });
  safe(() => { const lk = linkOf(closetMover); add('Bedroom', 'closets', 'PAX / FLISBERGET closets', { detail: `${PAX_H[furn.height].name} · Gianluca + Svetlana`, href: lk.href, note: 'Price comes from the IKEA planner' }); });
  safe(() => { const F = FRAME_SIZES[tv.size], p = parseKr(F.price); add('Bedroom', 'frame', `Samsung The Frame ${F.inch}″`, { detail: `${F.note} · white bezel`, kr: p && p.kr, approx: p && p.approx, href: linkOf(tvMover).href || F.url }); });
  add('Bedroom', 'bedcurt', 'Blackout curtains', { note: 'No product picked yet' });
  // living
  safe(() => { const ro = Object.fromEntries(sofaMover.readonly); const p = parseKr(ro.Price); add('Living', 'sofa', `${ro.Model || 'Sofa'}`, { detail: [ro.Size, ro.Fabric, ro.Legs, ro.Seat].filter(Boolean).join(' · '), kr: p && p.kr, href: linkOf(sofaMover).href }); });
  safe(() => { const UM = UNIT_MODELS[unitSel.m], p = parseKr(UM.price); add('Living', 'tvunit', `${UM.brand} ${UM.name}`, { detail: `TV bench · ${UM.finishes[unitSel.f].name}`, kr: p && p.kr, approx: p && p.approx, href: UM.finishes[unitSel.f].url || UM.url }); });
  safe(() => { const Tm = TABLE_MODELS[dining.t], C = Tm.configs[dining.tc], p = parseKr(C.name), lk = linkOf(diningMover);
    add('Living', 'table', `${Tm.brand} ${Tm.name} dining table`, { detail: C.name.split('·')[0].trim(), kr: p && p.kr, href: lk.href });
    const Ch = CHAIR_MODELS[dining.c], V = Ch.variants[dining.cv], q = parseKr(V.name);
    add('Living', 'chairs', `${Ch.brand} ${Ch.name} chair`, { qty: dining.n, unit: q && q.kr, kr: q && q.kr * dining.n, detail: plainDetail(V.name), href: lk.href2 }); });
  safe(() => { const p = parseKr(PH5.price); add('Living', 'ph5', 'Louis Poulsen PH 5, grey', { detail: 'Ø50 cm pendant over the table', kr: p && p.kr, href: PH5.url }); });
  safe(() => { if (petra.model) add('Living', 'lounge', 'House Nordic Gudrun lounge chair', { detail: 'teddy, black legs', kr: GUDRUN.kr, href: GUDRUN.url });
    else { const C = PETRA.covers[petra.cover]; add('Living', 'lounge', '&Tradition Little Petra VB1', { detail: `${C.name} · ${PETRA.woods[petra.wood].name}`, kr: C.kr[petra.wood], href: linkOf(petraMover).href }); } });
  safe(() => { if (!cons.on) return; const C = consoleCost(), lk = linkOf(consoleMover); add('Living', 'console', 'IKEA BESTÅ console behind the sofa', { detail: `${cons.n} frames, ${C.doorsN} doors${C.legsPacks ? `, ${C.legsPacks} × 2 legs` : ''}`, kr: C.kr, approx: true, href: lk.href, note: 'Plus the top board' }); });
  safe(() => add('Living', 'holm', 'IKEA HOLMERUD side table', { detail: HOLM.cols[holm.col].name, kr: HOLM.kr, href: HOLM.cols[holm.col].url }));
  safe(() => { const p = BOOKT.packs[books.pack]; add('Living', 'books', `Book tower, ${p.n}-pack (white)`, { detail: `Amazon · SEK ${Math.round(p.sek)}`, kr: p.sek * SEK_DKK, approx: true, href: BOOKT.url(p.asin), note: 'converted from SEK' }); });
  add('Living', 'plant', `${PLANTS[plant.kind] ? PLANTS[plant.kind].name || 'Plant' : 'Plant'} + pot`, { note: 'No product picked yet' });
  add('Living', 'balcurt', 'Balcony-door curtains (light)', { note: 'No product picked yet' });
  // værelse
  safe(() => { const p = parseKr(GS.price); add('Værelse', 'guest', 'Møbelkompagniet Arezzo sofa bed', { detail: '237 cm, 3 seats', kr: p && p.kr, href: GS.url }); });
  safe(() => { const lk = linkOf(vpaxMover), p = parseKr(vpaxMover.info()); add('Værelse', 'vpax', 'IKEA PAX closet', { detail: 'by the window wall', kr: p && p.kr * SEK_DKK, approx: true, href: lk.href, note: 'IKEA SE price, converted from SEK' }); });
  safe(() => { const Dm = DESKS[desk.m]; add('Værelse', 'desk', `ILVA ${Dm.name} desk`, { detail: Dm.desc, kr: Dm.kr, href: linkOf(deskMover).href }); });
  add('Værelse', 'nook', 'IKEA PAX + FLISBERGET nook closet', { detail: '50 × 58 × 236 cm', kr: 1300, href: linkOf(nookMover).href });
  add('Værelse', 'alcove', alc.model ? 'Alcove shelves + ceiling-track curtain' : 'Alcove built-in closet (carpenter)', { note: 'Needs a quote' });
  // entrance, bathroom, balcony (built by add_rooms)
  safe(() => roomShopLines(add));
  // lights: Philips Hue everywhere
  add('Lights', 'hue', `Philips Hue: ${Object.keys(LIGHTS).length} lights + bridge`, { detail: Object.values(LIGHTS).map((x) => x.name).join(', '), note: 'Not priced yet' });
  return L;
}
// ticks for "we've decided on this one"; kept per browser and travel with shared layouts
let shopDecided = { sofa: true };
try { const v = JSON.parse(localStorage.getItem('aptDecided') || 'null'); if (v) shopDecided = v; } catch (_) { /* ignore */ }
function saveDecided() { try { localStorage.setItem('aptDecided', JSON.stringify(shopDecided)); } catch (_) { /* ignore */ } }
function shopTotals(lines) {
  let pick = 0, dec = 0, approx = false, missing = 0;
  for (const l of lines) { if (l.kr == null) { missing++; continue; } pick += l.kr; if (shopDecided[l.key]) dec += l.kr; if (l.approx) approx = true; }
  return { pick, dec, approx, missing };
}
function shopText() {
  const lines = shopLines(), T = shopTotals(lines); let room = '', out = 'Apartment shopping list\n';
  for (const l of lines) { if (l.room !== room) { room = l.room; out += `\n${room}\n`; }
    out += `${shopDecided[l.key] ? '[x]' : '[ ]'} ${l.qty > 1 ? l.qty + ' × ' : ''}${l.name}${l.detail ? ' (' + l.detail + ')' : ''} — ${l.kr != null ? (l.approx ? '≈ ' : '') + fmtKr(l.kr) : l.note || 'no price'}${l.href ? '\n    ' + l.href : ''}\n`; }
  return out + `\nTotal of current picks: ${T.approx ? '≈ ' : ''}${fmtKr(T.pick)} (+ ${T.missing} without a price)\nDecided so far: ${fmtKr(T.dec)}\n`;
}
function renderShop(box) {
  const lines = shopLines(), T = shopTotals(lines); let room = '', h = '';
  h += `<div class="pl-sum"><div><span class="eyebrow">Current picks</span><b>${T.approx ? '≈ ' : ''}${fmtKr(T.pick)}</b></div><div><span class="eyebrow">Decided</span><b class="dec">${fmtKr(T.dec)}</b></div></div>
    <p class="pl-note">${T.missing} items have no price yet. Tick what you've agreed on.</p><ul class="pl-list">`;
  for (const l of lines) {
    if (l.room !== room) { room = l.room; h += `<li class="pl-room">${room}</li>`; }
    const price = l.kr != null ? `${l.approx ? '≈ ' : ''}${fmtKr(l.kr)}` : `<i>${l.note || '—'}</i>`;
    h += `<li class="pl-item${shopDecided[l.key] ? ' dec' : ''}"><label><input type="checkbox" data-k="${l.key}"${shopDecided[l.key] ? ' checked' : ''}><span class="nm"><span>${l.qty > 1 ? `${l.qty} × ` : ''}${l.name}${l.href ? ` <a href="${l.href}" target="_blank" rel="noopener" aria-label="Open the product page">↗</a>` : ''}</span><small>${l.detail}${l.unit && l.qty > 1 ? ` · ${fmtKr(l.unit)} each` : ''}${l.kr != null && l.note ? ` · ${l.note}` : ''}</small></span></label><span class="pr">${price}</span></li>`;
  }
  h += `</ul><div class="pl-row"><button type="button" class="pl-btn" data-act="copylist">Copy as text</button></div>`;
  box.innerHTML = h;
  box.querySelectorAll('input[data-k]').forEach((c) => c.addEventListener('change', () => { if (c.checked) shopDecided[c.dataset.k] = true; else delete shopDecided[c.dataset.k]; saveDecided(); renderShop(box); }));
  box.querySelector('[data-act="copylist"]').addEventListener('click', () => copyText(shopText(), 'Shopping list copied'));
}
async function copyText(t, msg) {
  try { await navigator.clipboard.writeText(t); showToast(msg); return true; }
  catch (_) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ } ta.remove(); showToast(ok ? msg : 'Couldn’t copy'); return ok; }
}
// ---- layouts: the whole furniture state (choices, positions), the lights and the clock, in a link or saved by name
const LAYOUT_OBJS = () => ({ bed, furn, tv, liv, unitSel, lamp, dining, petra, guest, vpax, nook, books, plant, art, cons, alc, desk, holm, night, rooms: roomsState });
const LAYOUT_SKIP = new Set(['group', 'parts', 'doors', 'door', 'dims', 'wall', 'base', 'run', 'runs', 'swap', 'box', 'E', 'a', 'n', 'room', 'curtain', 'hitDoor', 'swapDoor',
  'svetlanaInfo', 'swingReport', 'gianluca', 'svetlana', 'svetlanaB', 'swingDoors', 'mesh', 'hit']);
function ser(o, depth = 0) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (LAYOUT_SKIP.has(k) || v === undefined || typeof v === 'function') continue;
    if (typeof v === 'number') out[k] = Math.round(v * 10000) / 10000;
    else if (typeof v === 'string' || typeof v === 'boolean' || v === null) out[k] = v;
    else if (Array.isArray(v)) { if (v.every((x) => typeof x === 'number')) out[k] = v.map((x) => Math.round(x * 10000) / 10000); }
    else if (v.isVector3) { if (k === 'O') out[k] = { v3: v.toArray().map((x) => Math.round(x * 10000) / 10000) }; }
    else if (depth < 1 && Object.getPrototypeOf(v) === Object.prototype) out[k] = ser(v, depth + 1);
  }
  return out;
}
function layoutSnapshot() {
  const S = { v: 1, f: {}, l: {}, d: shopDecided, h: +clockHour.toFixed(2) };
  for (const [k, o] of Object.entries(LAYOUT_OBJS())) if (o) S.f[k] = ser(o);
  for (const [id, L] of Object.entries(LIGHTS)) S.l[id] = [L.on ? 1 : 0, +L.bri.toFixed(2), L.mode, L.mode === 'ct' ? L.ct : L.color];
  return S;
}
function des(o, d) {
  for (const [k, v] of Object.entries(d)) {
    if (v && typeof v === 'object' && v.v3) { if (o[k] && o[k].isVector3) o[k].fromArray(v.v3); else o[k] = new THREE.Vector3().fromArray(v.v3); }
    else if (v && typeof v === 'object' && !Array.isArray(v)) { if (o[k] && typeof o[k] === 'object') des(o[k], v); }
    else o[k] = v;
  }
}
function layoutApply(S) {
  if (!S || !S.f) return false;
  const objs = LAYOUT_OBJS();
  for (const [k, d] of Object.entries(S.f)) if (objs[k]) des(objs[k], d);
  if (S.d) { shopDecided = S.d; saveDecided(); }
  if (S.l) for (const [id, v] of Object.entries(S.l)) { const L = LIGHTS[id]; if (!L) continue; L.on = !!v[0]; L.bri = v[1]; L.mode = v[2]; if (v[2] === 'ct') L.ct = v[3]; else L.color = v[3]; }
  if (PAX_H[furn.height]) { H_CL = PAX_H[furn.height].H; DOOR_H = PAX_H[furn.height].door; }
  if (selected) selectFurniture(null);
  const steps = [buildBed, buildClosets, buildTV, buildMedia, buildSofa, livingDims, buildDining, buildGuestSofa, buildVaerCloset, buildNookCloset,
    buildPetra, buildBooks, buildPlant, buildArt, buildConsole, buildAlcove, buildDesk, buildHolm, buildRoomFurniture];
  for (const f of steps) { try { f(); } catch (e) { console.warn('layout rebuild', f.name, e); } }
  if (typeof S.h === 'number') { const r = $('sunrange'); r.value = S.h; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }
  autoLightsCfg.last = null; applyLights(); if (lightPanelSync) lightPanelSync();
  if (furn.gianluca || furn.svetlanaInfo) try { furnitureDims(); } catch (_) { /* ok */ }
  shadowDirty = true;
  return true;
}
const b64u = { enc: (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)) };
async function layoutEncode(S) {
  const raw = new TextEncoder().encode(JSON.stringify(S));
  if (typeof CompressionStream === 'function') { const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); return 'z' + b64u.enc(z); }
  return 'j' + b64u.enc(raw);
}
async function layoutDecode(code) {
  const kind = code[0], bytes = b64u.dec(code.slice(1));
  const raw = kind === 'z' ? new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}
function pageBase() {          // the blog page when we're inside its iframe, else this page
  try { if (window.parent !== window && window.parent.location.origin === location.origin) return window.parent.location.origin + window.parent.location.pathname; } catch (_) { /* cross-origin */ }
  return location.origin + location.pathname;
}
async function shareLayout() {
  const url = `${pageBase()}#s=${await layoutEncode(layoutSnapshot())}`;
  if (navigator.share && coarse) { try { await navigator.share({ title: 'Our apartment layout', url }); return; } catch (_) { /* cancelled: fall back to copy */ } }
  copyText(url, 'Link copied: it opens this exact layout');
}
let savedLayouts = [];
try { savedLayouts = JSON.parse(localStorage.getItem('aptLayouts') || '[]'); } catch (_) { savedLayouts = []; }
const saveLayouts = () => { try { localStorage.setItem('aptLayouts', JSON.stringify(savedLayouts)); } catch (_) { showToast('Couldn’t save (browser storage is off)'); } };
const abState = { a: null, b: null, cur: null };
function layoutSummary() { const lines = shopLines(); return { total: shopTotals(lines).pick, items: Object.fromEntries(lines.map((l) => [l.key, `${l.qty > 1 ? l.qty + ' × ' : ''}${l.name}${l.detail ? ' · ' + l.detail : ''}`])) }; }
function renderLayouts(box) {
  const ab = abState.a !== null && abState.b !== null ? [savedLayouts[abState.a], savedLayouts[abState.b]] : null;
  let h = `<p class="pl-note">A link holds every choice and position, the lights and the time of day. Send it to Svetlana: she can change things and send hers back.</p>
    <div class="pl-row"><button type="button" class="pl-btn pri" data-act="share">${navigator.share && coarse ? 'Share this layout' : 'Copy link to this layout'}</button></div>
    <div class="pl-row"><input type="text" class="pl-in" maxlength="40" placeholder="Name this layout, e.g. “Gudrun + Yasumi”"><button type="button" class="pl-btn" data-act="save">Save</button></div>`;
  if (savedLayouts.length) {
    h += `<ul class="pl-list pl-saved">`;
    savedLayouts.forEach((s, i) => { const tag = abState.a === i ? 'A' : abState.b === i ? 'B' : '';
      h += `<li class="pl-item"><span class="nm"><span>${tag ? `<em class="ab">${tag}</em>` : ''}${s.name.replace(/</g, '&lt;')}</span><small>${new Date(s.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${fmtKr(s.sum.total)}</small></span>
        <span class="acts"><button type="button" class="pl-mini" data-load="${i}">Open</button><button type="button" class="pl-mini" data-ab="${i}" title="Pick for comparing">A/B</button><button type="button" class="pl-mini" data-del="${i}" aria-label="Delete">✕</button></span></li>`; });
    h += `</ul><p class="pl-note">Pick two with A/B to compare them; then flip between them with one button.</p>`;
  }
  if (ab) {
    const diffs = Object.keys({ ...ab[0].sum.items, ...ab[1].sum.items }).filter((k) => ab[0].sum.items[k] !== ab[1].sum.items[k]);
    h += `<div class="pl-cmp"><div class="pl-row"><button type="button" class="pl-btn pri" data-act="flip">Show ${abState.cur === 'a' ? 'B' : 'A'}: ${(abState.cur === 'a' ? ab[1] : ab[0]).name.replace(/</g, '&lt;')}</button></div>
      <div class="pl-sum"><div><span class="eyebrow">A</span><b>${fmtKr(ab[0].sum.total)}</b></div><div><span class="eyebrow">B</span><b>${fmtKr(ab[1].sum.total)}</b></div><div><span class="eyebrow">B − A</span><b>${(ab[1].sum.total - ab[0].sum.total >= 0 ? '+' : '−') + fmtKr(Math.abs(ab[1].sum.total - ab[0].sum.total))}</b></div></div>
      ${diffs.length ? `<ul class="pl-list">${diffs.map((k) => `<li class="pl-item diff"><span class="nm"><small>A</small>${(ab[0].sum.items[k] || '—').replace(/</g, '&lt;')}<small>B</small>${(ab[1].sum.items[k] || '—').replace(/</g, '&lt;')}</span></li>`).join('')}</ul>` : '<p class="pl-note">Same products; only positions differ.</p>'}</div>`;
  }
  box.innerHTML = h;
  const inp = box.querySelector('.pl-in');
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') box.querySelector('[data-act="save"]').click(); });
  inp.addEventListener('keyup', (e) => e.stopPropagation());
  box.querySelector('[data-act="share"]').addEventListener('click', shareLayout);
  box.querySelector('[data-act="save"]').addEventListener('click', () => {
    const name = inp.value.trim() || `Layout ${savedLayouts.length + 1}`;
    savedLayouts.push({ name, t: Date.now(), s: layoutSnapshot(), sum: layoutSummary() }); saveLayouts(); showToast(`Saved “${name}”`); renderLayouts(box); });
  box.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => { const s = savedLayouts[+b.dataset.load]; layoutApply(s.s); showToast(`Opened “${s.name}”`); renderLayouts(box); }));
  box.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.del; savedLayouts.splice(i, 1); for (const k of ['a', 'b']) { if (abState[k] === i) abState[k] = null; else if (abState[k] > i) abState[k]--; } saveLayouts(); renderLayouts(box); }));
  box.querySelectorAll('[data-ab]').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.ab;
    if (abState.a === i) abState.a = null; else if (abState.b === i) abState.b = null; else if (abState.a === null) abState.a = i; else if (abState.b === null) abState.b = i; else { abState.a = abState.b; abState.b = i; }
    abState.cur = null; renderLayouts(box); }));
  const fl = box.querySelector('[data-act="flip"]');
  if (fl) fl.addEventListener('click', () => { const nx = abState.cur === 'a' ? 'b' : 'a'; layoutApply(savedLayouts[abState[nx]].s); abState.cur = nx; showToast(`${nx.toUpperCase()}: ${savedLayouts[abState[nx]].name}`); renderLayouts(box); });
}
async function layoutBoot() {       // furnish() done: open the layout in the link, if any
  const m = location.hash.match(/[#&]s=([A-Za-z0-9_-]+)/); if (!m) return;
  try { const S = await layoutDecode(m[1]); if (layoutApply(S)) showToast('Opened the shared layout'); }
  catch (e) { console.warn(e); showToast('That layout link looks broken'); }
}
// ---- placement check: doors and windows that can't open fully, sockets and switches behind furniture, the balcony door path
const SWITCH_SPOTS = [];        // filled by addWallSwitch
function isFurnMesh(o) { const d = o.userData.door; return !!(o.userData.furniture || (d && FURN_LABELS.has(d.label))); }
function furnLabel(o) { const d = o.userData.door; return (d && (d.name || d.label)) || 'furniture'; }
function placementCheck() {
  const out = [], F = collidables.filter(isFurnMesh), rc = new THREE.Raycaster();
  const hitF = (from, dir, far) => { rc.set(from, dir); rc.far = far; return rc.intersectObjects(F, false)[0] || null; };
  // hinged doors and inward windows: sweep the leaf from closed to open and find the first furniture it touches
  for (const d of PLAN.doors) {
    if (!/door|Window/i.test(d.label) || /Fridge|Toilet|Washing|Dryer|cupboard/i.test(d.label)) continue;
    const a0 = Math.atan2(d.closed[1], d.closed[0]); let da = Math.atan2(d.open[1], d.open[0]) - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
    const hs = [d.z0 + 0.15, d.z0 + d.h * 0.5, Math.min(d.z0 + d.h - 0.15, 1.9)];
    let stop = null, who = null;
    for (let k = 1; k <= 18 && stop === null; k++) {
      const a = a0 + da * k / 18, dir = b2t(Math.cos(a), Math.sin(a)).normalize();
      for (const z of hs) { const h = hitF(b2t(d.hinge[0], d.hinge[1], z), dir, d.len - 0.02); if (h) { stop = Math.abs(da * (k - 1) / 18); who = h.object; break; } }
    }
    if (stop !== null) { const deg = Math.round(stop * 180 / Math.PI), full = Math.round(Math.abs(da) * 180 / Math.PI);
      out.push({ sev: deg < 75 ? 2 : 1, what: `${d.label === 'Window' ? 'Window' : d.label}${d.id.includes('vaer') ? ' (værelse)' : d.id.includes('bed') ? ' (bedroom)' : d.id.includes('w1') || d.id.includes('w2') ? ' (living)' : ''}`, msg: `opens only ${deg}° of ${full}° · ${furnLabel(who)} is in the way`, obj: who }); }
  }
  // sockets and switches: is there furniture right in front of them?
  const spots = PLAN.outlets.map((o) => ({ label: o.label, p: o.p, z: o.z, n: o.n, kind: o.kind })).concat(SWITCH_SPOTS);
  for (const s of spots) {
    const P = b2t(s.p[0] + s.n[0] * 0.02, s.p[1] + s.n[1] * 0.02, s.z), h = hitF(P, b2t(s.n[0], s.n[1]).normalize(), 0.45);
    if (!h) continue;
    const cm = Math.round(h.distance * 100), sw = /switch/i.test(s.kind || s.label);
    if (cm < 12) out.push({ sev: sw ? 2 : 1, what: s.label, msg: `covered by ${furnLabel(h.object)} (${cm} cm)${sw ? '' : ' · fine for a lamp plug, awkward for chargers'}`, obj: h.object });
    else if (sw && cm < 40) out.push({ sev: 1, what: s.label, msg: `${furnLabel(h.object)} is ${cm} cm in front: reachable, but a stretch`, obj: h.object });
  }
  // balcony door: 70 cm free in front of the opening
  for (const S of PLAN.sliders) for (const sg of [1, -1]) for (let t = 0.15; t < 1; t += 0.35) {
    const bx = S.a[0] + S.dir[0] * S.w * t, by = S.a[1] + S.dir[1] * S.w * t;
    if (!inPoly(bx + S.n[0] * sg * 0.3, by + S.n[1] * sg * 0.3, PLAN.rooms[0].poly)) continue;
    for (const z of [0.3, 1.0]) { const h = hitF(b2t(bx, by, z), b2t(S.n[0] * sg, S.n[1] * sg).normalize(), 0.7);
      if (h && !out.some((o) => o.what === S.label)) out.push({ sev: h.distance < 0.45 ? 2 : 1, what: S.label, msg: `${furnLabel(h.object)} is ${Math.round(h.distance * 100)} cm in front of it`, obj: h.object }); }
  }
  // closets: the doors' own swing report (bed, desk…)
  try { furnitureDims(); } catch (_) { /* ok */ }
  for (const r of furn.swingReport || []) out.push({ sev: r.deg < 75 ? 2 : 1, what: r.name || 'Closet door', msg: `opens only ${r.deg}° of 90° · ${r.by}`, obj: null });
  return out.sort((p, q) => q.sev - p.sev);
}
function renderCheck(box) {
  const R = placementCheck();
  let h = `<p class="pl-note">Doors and windows that can’t open fully, sockets and switches behind furniture, and the way out to the balcony. It runs on the current layout, so move things and check again.</p>`;
  h += R.length ? `<ul class="pl-list">${R.map((r, i) => `<li class="pl-item chk s${r.sev}" data-i="${i}"><span class="dot"></span><span class="nm">${r.what}<small>${r.msg}</small></span>${r.obj && r.obj.userData.door ? '<button type="button" class="pl-mini">Select</button>' : ''}</li>`).join('')}</ul>`
    : '<p class="pl-ok">✓ Nothing in the way: every door and window opens fully, and no socket or switch is hidden.</p>';
  h += `<div class="pl-row"><button type="button" class="pl-btn" data-act="recheck">Check again</button></div><p class="pl-note">Floor heating, so there are no radiators to keep clear.</p>`;
  box.innerHTML = h;
  box.querySelector('[data-act="recheck"]').addEventListener('click', () => renderCheck(box));
  box.querySelectorAll('li[data-i] .pl-mini').forEach((b) => b.addEventListener('click', () => { const r = R[+b.closest('li').dataset.i], d = r.obj.userData.door; if (d && d.swap) { if (selected) selectFurniture(null); d.swap(); } }));
}
// ---- daylight: hours of direct sun on each room's floor area (at table height) on the solstices, the equinox and today
function sunAltAz(date) {           // NOAA-style low-precision solar position, Copenhagen
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const Lm = rev(280.460 + 0.9856474 * n), g = rev(357.528 + 0.9856003 * n);
  const lam = Lm + 1.915 * sind(g) + 0.020 * sind(2 * g), eps = 23.439 - 0.0000004 * n;
  const ra = atan2d(cosd(eps) * sind(lam), cosd(lam)), dec = Math.asin(sind(eps) * sind(lam)) / rad;
  const H = rev(280.46061837 + 360.98564736629 * n + SKY_LON - ra);
  const alt = Math.asin(sind(SKY_LAT) * sind(dec) + cosd(SKY_LAT) * cosd(dec) * cosd(H)) / rad;
  const az = rev(atan2d(sind(H), cosd(H) * sind(SKY_LAT) - Math.tan(dec * rad) * cosd(SKY_LAT)) + 180);
  return { alt, az };
}
function sunVec(alt, az) { const A = (az + PLAN_TURN) * D2R, E = alt * D2R; return new THREE.Vector3(-Math.cos(A) * Math.cos(E), Math.sin(E), -Math.sin(A) * Math.cos(E)).normalize(); }
const DAYLIGHT = { res: null, busy: false };
function daylightOccluders() {
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || isFurnMesh(o)) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m || m === MATS.glass || m.isMeshBasicMaterial || (m.transparent && m.opacity < 0.6) || m.isShaderMaterial || m.isPointsMaterial) return;
    const d = o.userData.door; if (d && (d.kind === 'curtain' || d.kind === 'swap')) return;
    let p = o, under = false; while (p) { if (p === modelRoot) { under = true; break; } p = p.parent; }
    if (under || o.castShadow) out.push(o);
  });
  return out;
}
function daylightDays() {
  const y = new Date().getFullYear(), now = new Date();
  return [{ k: 'dec', label: '21 Dec', d: Date.UTC(y, 11, 21) }, { k: 'mar', label: '20 Mar', d: Date.UTC(y, 2, 20) }, { k: 'jun', label: '21 Jun', d: Date.UTC(y, 5, 21) },
    { k: 'today', label: 'Today', d: Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) }];
}
function computeDaylight(onProgress) {
  return new Promise((resolve) => {
    const occ = daylightOccluders(), rc = new THREE.Raycaster(); rc.far = 120;
    const rooms = PLAN.rooms.filter((r) => r.id !== 'stair' && r.id !== 'tek');
    const pts = {};
    for (const r of rooms) { const xs = r.poly.map((p) => p[0]), ys = r.poly.map((p) => p[1]), arr = [];
      for (let x = Math.min(...xs) + 0.3; x < Math.max(...xs) - 0.2; x += 0.55) for (let y = Math.min(...ys) + 0.3; y < Math.max(...ys) - 0.2; y += 0.55)
        if (inPoly(x, y, r.poly) && inPoly(x + 0.2, y, r.poly) && inPoly(x - 0.2, y, r.poly) && inPoly(x, y + 0.2, r.poly) && inPoly(x, y - 0.2, r.poly)) arr.push(b2t(x, y, r.id === 'bal' ? 0.9 : 0.8));
      pts[r.id] = arr; }
    const days = daylightDays(), STEP = 10, jobs = [];
    for (const D of days) for (let mn = 2 * 60; mn <= 21 * 60; mn += STEP) { const t = new Date(D.d + mn * 60000), s = sunAltAz(t); if (s.alt > 1.5) jobs.push({ D, t, s }); }
    const res = {}; for (const D of days) { res[D.k] = {}; for (const r of rooms) res[D.k][r.id] = { min: 0, from: null, to: null, peak: 0 }; }
    let j = 0;
    const tick = () => {
      const t0 = performance.now();
      while (j < jobs.length && performance.now() - t0 < 30) {
        const { D, t, s } = jobs[j++], v = sunVec(s.alt, s.az);
        for (const r of rooms) { const P = pts[r.id]; if (!P.length) continue; let lit = 0;
          for (const p of P) { rc.set(p, v); if (!rc.intersectObjects(occ, false).length) lit++; }
          const f = lit / P.length, R = res[D.k][r.id];
          if (f >= 0.04) { R.min += STEP; if (!R.from) R.from = t; R.to = t; }
          R.peak = Math.max(R.peak, f); }
      }
      if (onProgress) onProgress(j / jobs.length);
      if (j < jobs.length) setTimeout(tick, 0); else resolve({ res, rooms, days });
    };
    tick();
  });
}
function renderSun(box) {
  const tf = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit' });
  const hm = (m) => (m ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : '—');
  if (!DAYLIGHT.res) {
    box.innerHTML = `<p class="pl-note">Direct sun on each room’s floor, at table height, with the real sun path over Sluseholmen and the neighbouring buildings in the way. Curtains count as open.</p><p class="pl-note" data-prog>Working it out… 0%</p>`;
    if (!DAYLIGHT.busy) { DAYLIGHT.busy = true; computeDaylight((f) => { const e = box.querySelector('[data-prog]'); if (e) e.textContent = `Working it out… ${Math.round(f * 100)}%`; })
      .then((r) => { DAYLIGHT.res = r; DAYLIGHT.busy = false; if (PLAN_UI.open && PLAN_UI.tab === 'sun') renderSun(box); }); }
    return;
  }
  const { res, rooms, days } = DAYLIGHT.res;
  let h = `<p class="pl-note">Hours of direct sun reaching the room’s floor (at table height), with the time window. The real sun path over Sluseholmen; neighbouring buildings and the balcony above count, curtains are open.</p>
    <div class="pl-sun"><table><thead><tr><th></th>${days.map((D) => `<th>${D.label}</th>`).join('')}</tr></thead><tbody>`;
  for (const r of rooms) {
    h += `<tr><th>${r.da}<small>${r.en || ''}</small></th>`;
    for (const D of days) { const R = res[D.k][r.id];
      h += `<td${R.min ? '' : ' class="none"'}><b>${hm(R.min)}</b>${R.min ? `<small>${tf.format(R.from)}–${tf.format(new Date(R.to.getTime() + 10 * 60000))}</small>` : ''}</td>`; }
    h += '</tr>';
  }
  h += `</tbody></table></div><p class="pl-note">“Hours” count while at least a few percent of the floor is in direct sun. The time slider (H) uses a simplified late-September sun; this table uses the real one.</p>`;
  box.innerHTML = h;
}
// ---- the panel itself
function buildPlanPanel() {
  const P = document.createElement('div'); P.id = 'plan'; P.className = 'panel'; P.hidden = true; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Plan');
  P.innerHTML = `<div class="pl-top"><div class="pl-tabs" role="tablist">
      <button type="button" role="tab" data-tab="list">Shopping list</button><button type="button" role="tab" data-tab="lay">Layouts</button>
      <button type="button" role="tab" data-tab="check">Check</button><button type="button" role="tab" data-tab="sun">Sun</button></div>
      <button type="button" class="pl-x" aria-label="Close">✕</button></div><div class="pl-body"></div>`;
  document.body.appendChild(P);
  P.querySelector('.pl-x').addEventListener('click', () => setPlan(false));
  P.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { PLAN_UI.tab = b.dataset.tab; renderPlan(); }));
  for (const t of ['keydown', 'keyup']) P.addEventListener(t, (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  for (const t of ['pointerdown', 'wheel', 'touchstart']) P.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
}
function renderPlan() {
  const P = $('plan'); if (!P) return;
  P.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === PLAN_UI.tab)));
  const box = P.querySelector('.pl-body'); box.scrollTop = 0;
  ({ list: renderShop, lay: renderLayouts, check: renderCheck, sun: renderSun })[PLAN_UI.tab](box);
}
function setPlan(on) {
  PLAN_UI.open = on; $('plan').hidden = !on; document.body.classList.toggle('plan', on);
  $('qPlan').setAttribute('aria-pressed', String(on));
  if (on) { if (selected) selectFurniture(null); if (document.pointerLockElement) document.exitPointerLock(); renderPlan(); }
}

buildPlanPanel();
$('qPlan').addEventListener('click', () => setPlan(!PLAN_UI.open));
addEventListener('keydown', (e) => { if (e.code === 'KeyO' && !e.repeat && e.target.tagName !== 'INPUT' && !e.metaKey && !e.ctrlKey && !e.altKey) setPlan(!PLAN_UI.open); else if (e.code === 'Escape' && PLAN_UI.open) setPlan(false); });
bedMover.selects = [{ id: 'nstand', label: 'Nightstands', options: () => NIGHT.map((n) => ({ label: `${n.brand} ${n.name} · ${Math.round(n.W * 100)} × ${Math.round(n.D * 100)} × ${Math.round(n.H * 100)} cm · ${n.kr} kr` })), get: () => night.m, set: (i) => { night.m = i; night.col = 0; buildBed(); } }];
bedMover.link = () => { const N = NIGHT[night.m]; return { href: N.url, text: `IKEA · ${N.name} nightstand · ${N.kr} kr ↗` }; };
function furnish() { fridgeSideSkin(); buildBed(); buildClosets(); buildTV(); buildMedia(); buildSofa(); livingDims(); buildCoffee(); buildDining(); buildTeknikGolem(); buildFridgeFood(); buildGuestSofa(); buildVaerCloset(); buildNookCloset(); buildPetra(); buildBooks(); buildPlant(); buildOutside(); buildSwitches(); buildLift(); buildCurtains(); buildArt(); buildAlcove(); buildDesk(); buildHolm(); buildRoomFixtures(); buildRoomSwitches(); buildRoomFurniture(); autoLightTick(clockHour, dayLevel, true); try { updateNight(); } catch (_) { /* ok */ } layoutBoot(); }
function prewarmShaders() {
  // compile every material variant now (incl. hidden things: ceiling, upper floors, closed panels), not the first time it comes into view
  // lights first exactly as perfTick leaves them (light counts are part of every shader), then the meshes
  scene.traverse((o) => { if (o.isLight && o !== sun && o !== hemi) o.visible = !!o.userData.pool || o.intensity > 0.001; });
  const hidden = []; scene.traverse((o) => { if (!o.visible && (o.isMesh || o.isGroup)) { hidden.push(o); o.visible = true; } });
  const done = () => { for (const o of hidden) o.visible = false; };
  const comp = () => { try { if (renderer.compileAsync) renderer.compileAsync(scene, camera).catch(() => {}); else renderer.compile(scene, camera); } catch (_) { /* best effort */ } };
  comp();
  // and the variant with every Hue light present (a light panel open, or all lights on with L), so switching never compiles
  if (typeof hueLights === 'function') { for (const o of hueLights()) o.visible = true; comp(); for (const o of hueLights()) o.visible = lightHold || o.intensity > 0.001; }
  done();
}
const furnishAll = () => { furnish(); setTimeout(prewarmShaders, 0); };
if (modelRoot) furnishAll(); else window.__afterModel = furnishAll;

