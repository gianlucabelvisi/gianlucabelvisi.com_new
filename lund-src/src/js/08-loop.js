// ============================================================ start-up and the frame loop
flushStatic();
setMode('walk');
updateSun(+$('sunrange').value, true);
updateHint();
const PR_MAX = Math.min(devicePixelRatio, coarse ? 1.5 : 2);
let prNow = PR_MAX, slowFrames = 0, fastFrames = 0, ftAvg = 16;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(prNow); renderer.setSize(w, h, false);
  if (composer) { composer.setPixelRatio(prNow); composer.setSize(w, h); }
  camera.aspect = w / h; camera.updateProjectionMatrix();
  stars.material.uniforms.uPR.value = prNow;
  mapXf = null; drawMap();
}
addEventListener('resize', resize); resize();
function perfTick(ms) {
  ftAvg = ftAvg * 0.95 + ms * 0.05;
  if (ftAvg > 30 && prNow > 0.75) { if (++slowFrames > 40) { prNow = Math.max(0.75, prNow - 0.25); slowFrames = 0; resize(); } } else slowFrames = 0;
  if (ftAvg < 14 && prNow < PR_MAX) { if (++fastFrames > 240) { prNow = Math.min(PR_MAX, prNow + 0.25); fastFrames = 0; resize(); } } else fastFrames = 0;
}
window.__perf = () => ({ pr: prNow, ft: +ftAvg.toFixed(1), calls: renderer.info.render.calls, tris: renderer.info.render.triangles });
const clock = new THREE.Clock();
let lastFrame = 0, frameCount = 0, idleT = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min(0.05, clock.getDelta());
  const active = mode === 'over' || Object.values(keys).some(Boolean) || joy.id !== null || look.id !== null || autoTarget || INTER.some((it) => it.t !== it.target) || locked;
  idleT = active ? 0 : idleT + dt;
  updatePlayer(dt);
  stepInter(dt);
  hudUpdate();
  if (poolDirty || frameCount % 20 === 0) poolAssign();
  stars.material.uniforms.uT.value = now / 1000;
  // shadow map only when something changed (sun, doors, furniture)
  if (shadowDirty || ++frameCount % 600 === 0) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
  // keep the sun's shadow box around where you are
  if (mode === 'walk') { const c = _v.set(player.pos.x, FZ, player.pos.z); if (c.distanceTo(sun.target.position) > 6) { const d = sun.position.clone().sub(sun.target.position); sun.target.position.copy(c); sun.position.copy(c).add(d); sun.target.updateMatrixWorld(); shadowDirty = true; } }
  if (composer && !lite) composer.render(); else renderer.render(scene, camera);
  perfTick(now - (lastFrame || now)); lastFrame = now;
}
// expose for tests
window.__lund = { THREE, scene, camera, player, setFeet, P, toPlan, INTER, DOORS, ROOMS, collidables, floors, tryMove, groundAt, updateSun, setMode, useInter, interNear, w2t,
  stepWalk: (dx, dz, n = 1) => { for (let i = 0; i < n; i++) tryMove(dx, dz); return { x: player.pos.x, z: player.pos.z, fy: player.fy }; },
  placeAt, orbit, MAIN, GATEWAY, blocked, lookFrom: (x, y, z, tx, ty, tz) => { player.pos.set(x, z, -y); const dx = tx - x, dy = ty - y, dz = tz - z; player.yaw = Math.atan2(-dx, dy); player.pitch = Math.atan2(dz, Math.hypot(dx, dy)); }, inPolyW, PLANPT, room: () => currentRoom, LIGHTS: typeof LIGHTS !== 'undefined' ? LIGHTS : null };
$('go').disabled = false; $('go').textContent = 'Start walking';
$('go').addEventListener('click', () => { $('intro').hidden = true; started = true; if (!coarse) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* optional */ } } canvas.focus(); });
frame();
