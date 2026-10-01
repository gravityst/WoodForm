import * as THREE from 'three';
import { CONFIG } from './config.js?v=11';
import { WOODS, WOOD_BY_ID } from './woods.js?v=11';
import { TOOLS, TOOL_BY_ID } from './tools.js?v=11';
import { ORDERS, ORDER_BY_ID } from './orders.js?v=11';
import { Log } from './lathe.js?v=11';
import { scoreLog, rewardFor, liveMatch } from './scoring.js?v=11';
import { Shavings } from './particles.js?v=11';
import { AudioEngine } from './audio.js?v=11';
import { Save } from './save.js?v=11';
import { drawProfileGraph, toast } from './ui.js?v=11';
import { makeWoodMaterial, setSpecies, newFigure } from './woodshader.js?v=11';
import { buildWorkshop, buildLighting, buildTools, BED_TOP, REST } from './workshop.js?v=11';
import { toolIcon, icon, starRow } from './icons.js?v=11';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const save = new Save();
const audio = new AudioEngine();
let renderer, scene, camera, log, shavings, woodMat, shop, tools, guide;
const HL = CONFIG.LENGTH / 2;

const state = {
  screen: 'menu',
  mode: 'career',       // career | workshop | daily
  order: null,
  wood: WOOD_BY_ID.pine,
  tool: TOOL_BY_ID.chisel,
  startTime: 0,
  carving: false,       // pointer is down on the canvas
  hover: false,         // a mouse is over the canvas (the tool follows it)
  ndc: new THREE.Vector2(),
  spinning: true,
  shopTab: 'tools',
  sweep: null,          // the closing oil wipe, while it runs
};

const raycaster = new THREE.Raycaster();
const _hit = new THREE.Vector3(), _v = new THREE.Vector3(), _dir = new THREE.Vector3();
const _Z = new THREE.Vector3(0, 0, 1);
let lastT = 0, graphVersion = -1;

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------
const MAX_DPR = 1.5;   // the wood shader is per-pixel work; 1.5x keeps laptops at 60 fps
let dpr = Math.min(devicePixelRatio || 1, MAX_DPR);

function initScene() {
  const canvas = document.getElementById('scene');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // AgX keeps warm browns brown (ACES pushes them orange); ACES where AgX is missing
  renderer.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = THREE.AgXToneMapping ? 1.25 : 1.0;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b2219);
  scene.fog = new THREE.Fog(0x2b2219, 9, 24);

  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  buildLighting(scene, renderer);
  shop = buildWorkshop(scene);

  // the blank: procedural solid wood with a per-vertex (sanded, oiled) finish
  woodMat = makeWoodMaterial({ finishAttr: true });
  log = new Log();
  const mesh = log.setMaterials(woodMat, woodMat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  newFigure(woodMat);
  applyWood(state.wood);

  // trace guide: the drawing's outline, turned to face the camera
  const guideMat = new THREE.MeshBasicMaterial({
    color: 0xffd23f, transparent: true, opacity: 0.92, depthTest: false, side: THREE.DoubleSide, toneMapped: false,
  });
  log.ensureGuide(guideMat);
  guide = new THREE.Group();
  guide.add(log.guideTop, log.guideBot);
  scene.add(guide);

  shavings = new Shavings(scene, { floorY: BED_TOP, floorZ: [-0.21, 0.21], benchY: -1.18 });
  tools = buildTools();
  for (const k in tools) scene.add(tools[k]);

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
  onResize();
}

function applyWood(wood) {
  state.wood = wood;
  setSpecies(woodMat, wood);
}

// ---------------------------------------------------------------------------
// Camera: a few framed shots, eased between as the screens change
// ---------------------------------------------------------------------------
const cam = {
  from: null, to: null, t: 1, dur: 0.9,
  pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 30, shift: 0, drift: 0,
};

function shotFor(name) {
  const aspect = innerWidth / innerHeight, wideUI = innerWidth >= 900 && aspect > 1.2;
  if (name === 'carve') {
    // straight on and a little above, fitted so the whole blank and both
    // centres stay in view at any aspect ratio
    const fov = 30, tanV = Math.tan(fov * Math.PI / 360);
    const target = new THREE.Vector3(0, -0.14, 0);
    const dist = Math.min(12, Math.max((HL + 0.85) / (tanV * aspect), 1.05 / tanV));
    const el = 0.26;
    return { pos: new THREE.Vector3(0, target.y + Math.sin(el) * dist, Math.cos(el) * dist), target, fov, shift: 0, drift: 0 };
  }
  // showcase shots: three-quarter views with the panel on the left
  const S = {
    hero: { dir: [0.3, 0.17, 1], dist: 5.1, target: [0.3, -0.08, 0], shift: 0.2 },
    wood: { dir: [0.22, 0.22, 1], dist: 5.4, target: [0.25, -0.12, 0], shift: 0.2 },
    show: { dir: [0.3, 0.15, 1], dist: 7.6, target: [0.3, -0.02, 0], shift: 0.13 },
  }[name];
  const s = S || { dir: [0.3, 0.15, 1], dist: 7.6, target: [0.3, -0.02, 0], shift: 0.13 };
  const k = wideUI ? 1 : Math.max(1, 1.6 / aspect);
  const target = new THREE.Vector3(...s.target);
  const pos = new THREE.Vector3(...s.dir).normalize().multiplyScalar(s.dist * k).add(target);
  return { pos, target, fov: 30, shift: wideUI ? s.shift : 0, drift: 1 };
}

function shotName(screen) {
  if (screen === 'carve') return 'carve';
  if (screen === 'result') return 'hero';
  if (screen === 'wood') return 'wood';
  return 'show';
}

function goToShot(name, instant = false) {
  const to = shotFor(name);
  cam.from = instant || !cam.to ? to : { pos: cam.pos.clone(), target: cam.target.clone(), fov: cam.fov, shift: cam.shift, drift: cam.drift };
  cam.to = to; cam.name = name;
  cam.t = instant ? 1 : 0;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function updateCamera(dt, now) {
  if (!cam.to) return;
  cam.t = Math.min(1, cam.t + dt / cam.dur);
  const e = ease(cam.t), a = cam.from, b = cam.to;
  cam.pos.lerpVectors(a.pos, b.pos, e);
  cam.target.lerpVectors(a.target, b.target, e);
  cam.fov = a.fov + (b.fov - a.fov) * e;
  cam.shift = a.shift + (b.shift - a.shift) * e;
  cam.drift = a.drift + (b.drift - a.drift) * e;
  camera.position.copy(cam.pos);
  if (cam.drift > 0) {
    // a slow, gentle orbit on the showcase shots
    const yaw = Math.sin(now * 0.00011) * 0.07 * cam.drift;
    _v.copy(cam.pos).sub(cam.target).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    camera.position.copy(cam.target).add(_v);
    camera.position.y += Math.sin(now * 0.00017) * 0.03 * cam.drift;
  }
  camera.fov = cam.fov;
  const W = innerWidth, H = innerHeight;
  if (cam.shift > 0.001) camera.setViewOffset(W, H, -cam.shift * W, 0, W, H);
  else camera.clearViewOffset();
  camera.lookAt(cam.target);
  camera.updateProjectionMatrix();
  // the trace guide lies in the plane through the axis that faces the camera
  guide.rotation.x = -Math.atan2(camera.position.y, camera.position.z);
}

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  if (cam.to && cam.name !== 'custom') { cam.to = shotFor(cam.name); if (cam.t >= 1) cam.from = cam.to; }
  else goToShot(shotName(state.screen), true);
  const rh = document.getElementById('rotateHint');
  if (rh) rh.classList.toggle('show', state.screen === 'carve' && h > w * 1.05);
}

// ---------------------------------------------------------------------------
// Carving interaction
// ---------------------------------------------------------------------------
function setupPointer() {
  const canvas = document.getElementById('scene');
  const setNdc = (e) => {
    const r = canvas.getBoundingClientRect();
    state.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    state.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (state.screen !== 'carve' || state.sweep) return;
    audio.ensure();
    setNdc(e);
    state.carving = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    setNdc(e);
    if (e.pointerType === 'mouse') state.hover = true;
  });
  const end = () => { state.carving = false; audio.stopCarve(); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { state.hover = false; end(); });
}

// where the tool is and what it is touching, for the tool model + FX
const toolPose = { x: 0, restX: 0, reach: CONFIG.R0 + 0.12, contact: false, shown: false };

function applyCarve(dt) {
  toolPose.contact = false;
  if (state.screen !== 'carve' || state.sweep || !(state.carving || state.hover)) {
    if (!state.carving) audio.stopCarve();
    return;
  }
  raycaster.setFromCamera(state.ndc, camera);
  const O = raycaster.ray.origin, D = raycaster.ray.direction;
  // Depth = the ray's closest approach to the lathe (X) axis: aim toward the
  // centreline to cut deeper. This is independent of x, so it adds no parallax.
  const t = -(O.y * D.y + O.z * D.z) / (D.y * D.y + D.z * D.z);
  const aim = Math.hypot(O.y + t * D.y, O.z + t * D.z);
  // Axial position comes from the ACTUAL wood surface under the pointer, so the
  // cut lands exactly where you touch (no plane-projection parallax).
  const hp = log.hitTest(raycaster.ray, _hit);
  const x = Math.min(HL, Math.max(-HL, hp ? hp.x : O.x + t * D.x));
  toolPose.x = x;
  toolPose.reach = aim;
  if (!state.carving || !hp) { if (state.carving) { audio.stopCarve(); audio.carve(0, false); } return; }

  const depth = Math.min(CONFIG.R0, Math.max(CONFIG.MIN_R, aim));
  const tool = state.tool, wood = state.wood;
  toolPose.contact = true;
  const tip = toolTip(x, log.radiusAt(x), _v);

  if (tool.kind === 'sand') {
    const work = log.sand(x, tool, wood, dt);
    audio.carve(Math.min(1, work * 4 + 0.15), true);
    if (work > 0) { shavings.puff(tip, wood.shaving, 2); pulse(0.3); }
  } else if (tool.kind === 'oil') {
    const work = log.oil(x, tool, dt);
    audio.carve(Math.min(0.5, work * 3 + 0.08), true);
  } else {
    const removed = log.carve(x, depth, tool, wood, dt);
    if (removed > 0) {
      const intensity = Math.min(1, removed * 45);
      audio.carve(0.3 + intensity * 0.7, false);
      shavings.spawn(tip, wood.shaving, intensity, tool.id === 'roughing' ? 'rough' : 'cut');
      pulse(intensity);
    } else {
      audio.carve(0.0, false);
    }
  }
}

// The cutting edge meets the wood just above centre height on the turner's side.
const TIP_ANGLE = 0.08;
function toolTip(x, r, out) { return out.set(x, r * Math.sin(TIP_ANGLE), r * Math.cos(TIP_ANGLE)); }

function updateTool(dt) {
  const inCarve = state.screen === 'carve';
  const sweeping = !!state.sweep;
  const tool = sweeping ? TOOL_BY_ID.oil : state.tool;
  for (const k in tools) tools[k].visible = false;
  // the tool rest slides along the bed after the tool
  const k1 = 1 - Math.exp(-dt * 22), k2 = 1 - Math.exp(-dt * 5);
  // away from the carve screen the rest is slid down to the tailstock end
  const wantX = sweeping ? state.sweep.front : inCarve ? toolPose.x : HL;
  toolPose.x = Math.min(HL, Math.max(-HL, wantX));
  toolPose.shownX = toolPose.shownX === undefined ? toolPose.x : toolPose.shownX + (toolPose.x - toolPose.shownX) * k1;
  const restLimit = HL - REST.half * 0.55;
  toolPose.restX += (Math.max(-restLimit, Math.min(restLimit, toolPose.shownX)) - toolPose.restX) * k2;
  shop.rest.position.x = toolPose.restX;
  if (!inCarve && !sweeping) return;

  const m = tools[tool.id];
  if (!m) return;
  m.visible = true;
  const x = toolPose.shownX, surf = log.radiusAt(x);
  const engaged = sweeping || (state.carving && toolPose.contact);
  const hovering = state.hover && !state.carving;
  // how far from the axis the tip sits: on the wood when cutting, hovering at the
  // aim point when the mouse is over the blank, parked on the rest otherwise
  let want = engaged ? surf : hovering ? Math.min(CONFIG.R0 + 0.2, Math.max(surf + 0.012, toolPose.reach)) : surf + 0.1;
  toolPose.tipR = toolPose.tipR === undefined ? want : toolPose.tipR + (want - toolPose.tipR) * k1;
  const tip = toolTip(x, toolPose.tipR, _v);

  if (m.userData.pad) {
    // sanding pads and the oil rag are held up against the underside of the
    // work, so they never hide the profile you're shaping
    const a = -0.95, r = toolPose.tipR;
    _dir.set(0, Math.sin(a), Math.cos(a));
    m.position.set(x, r * _dir.y, r * _dir.z);
    m.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, _dir);
    if (engaged) m.position.x += Math.sin(performance.now() * 0.018) * 0.02;
    return;
  }
  // handled tools lie over the rest: from the tip, back over the bar, handle low
  _dir.set(toolPose.restX - x, REST.y + REST.r + 0.01 - tip.y, REST.z - tip.z);
  _dir.x = _dir.x * 0.15 + 0.22;           // a right-hander's slight swing
  _dir.normalize();
  m.position.copy(tip);
  m.quaternion.setFromUnitVectors(_Z, _dir);
  if (engaged && state.tool.kind === 'cut') m.position.y += (Math.random() - 0.5) * 0.002; // a touch of chatter
}

let _lastVibe = 0;
function pulse(strength) {
  if (!navigator.vibrate) return;          // iOS Safari has no vibrate; harmless
  const now = performance.now();
  if (now - _lastVibe < 70) return;
  _lastVibe = now;
  navigator.vibrate(Math.round(Math.max(4, Math.min(16, strength * 16))));
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
function frame(dt, now) {
  if (state.spinning) log.mesh.rotation.x += CONFIG.SPIN_SPEED * dt;
  updateCamera(dt, now);
  applyCarve(dt);
  updateSweep(dt);
  log.updateGeometry();
  updateTool(dt);
  shavings.update(dt);
  guide.visible = state.screen === 'carve';

  if (state.screen === 'carve') {
    if (log.version !== graphVersion) {
      graphVersion = log.version;
      drawProfileGraph(document.getElementById('profileGraph'), log);
      const mr = document.getElementById('matchReadout');
      if (state.order) {
        mr.style.display = '';
        const m = liveMatch(log);
        document.getElementById('matchVal').textContent = m + '%';
        const bar = document.getElementById('matchBar');
        bar.style.width = m + '%';
        bar.className = m >= 85 ? 'good' : m >= 60 ? 'ok' : '';
      } else { mr.style.display = 'none'; }
    }
  }
  renderer.render(scene, camera);
}

// Frame-rate governor: if the machine can't hold ~50 fps at this resolution,
// render fewer pixels (never below 1x). Hidden/background frames are ignored.
const gov = { acc: 0, n: 0 };
function govern(ms) {
  if (ms > 100) return;
  gov.acc += ms; gov.n++;
  if (gov.n < 90) return;
  const avg = gov.acc / gov.n;
  gov.acc = 0; gov.n = 0;
  if (avg > 18.5 && dpr > 1) {
    dpr = Math.max(1, dpr - 0.25);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const ms = now - lastT;
  const dt = Math.min(0.05, ms / 1000) || 0;
  lastT = now;
  govern(ms);
  frame(dt, now);
}

// ---------------------------------------------------------------------------
// Finishing: a last wipe of oil along the piece, then the verdict
// ---------------------------------------------------------------------------
function updateSweep(dt) {
  const s = state.sweep;
  if (!s) return;
  s.t += dt;
  s.front = -HL - 0.15 + Math.min(1, s.t / s.dur) * (CONFIG.LENGTH + 0.3);
  let lo = log.S, hi = -1;
  for (let i = 0; i < log.S; i++) {
    if (log.axialX(i) > s.front || log.oiled[i] >= 1) continue;
    log.oiled[i] = Math.min(1, log.oiled[i] + dt * 5);
    if (i < lo) lo = i; if (i > hi) hi = i;
  }
  if (hi >= lo) log.markDirty(lo, hi);
  audio.carve(0.12, true);
  if (s.t >= s.dur + 0.25) {
    state.sweep = null;
    audio.stopCarve();
    s.done();
  }
}

// ---------------------------------------------------------------------------
// Screen / flow management
// ---------------------------------------------------------------------------
function showScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('show'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('show');
  document.body.dataset.screen = name;
  document.getElementById('topbar').style.display = (name === 'carve') ? 'none' : '';
  audio.hum(name === 'carve');
  if (name !== 'carve') { state.carving = false; audio.stopCarve(); }
  goToShot(shotName(name));
  if (name === 'carve') toolPose.x = toolPose.shownX = 0.35;
  const rh = document.getElementById('rotateHint');
  if (rh) rh.classList.toggle('show', name === 'carve' && innerHeight > innerWidth * 1.05);
}

function updateTopbar() {
  document.getElementById('statLevel').textContent = 'Level ' + save.level;
  document.getElementById('statCoins').textContent = save.coins.toLocaleString();
  const frac = Math.max(0, Math.min(1, save.xp / save.xpToNext()));
  document.getElementById('xpfill').style.width = (frac * 100) + '%';
}

function freshBlank() {
  newFigure(woodMat);
  shavings.clear();
}

function startOrder(order, wood, mode, fresh = true) {
  state.order = order; state.mode = mode; applyWood(wood);
  if (fresh) freshBlank();
  log.applyOrder(order);
  log.mesh.rotation.x = 0;
  // Only the tutorial order stops you over-cutting; everywhere else you CAN cut
  // past the line (and get penalised) — that's the skill. Trace guide shows on
  // easy/medium (toggle any time).
  log.assistNoOvercut = !!order.tutorial;
  log.setGuideVisible(order.tier <= 2);
  updateGuideToggle();
  buildToolbar();
  // default to a sensible starting tool the player owns
  const startTool = order.tools.find(t => save.hasTool(t)) || 'chisel';
  selectTool(startTool);
  document.querySelector('#orderTag .ot-name').textContent = order.name;
  document.querySelector('#orderTag .ot-wood').textContent = wood.name + (mode === 'daily' ? ' · Daily order' : '');
  document.getElementById('finishBtn').style.display = '';
  state.startTime = performance.now();
  showScreen('carve');
}

function startWorkshop(wood) {
  state.order = null; state.mode = 'workshop'; applyWood(wood);
  freshBlank();
  log.freeBlank();
  log.mesh.rotation.x = 0;
  log.assistNoOvercut = false;
  log.setGuideVisible(false);
  updateGuideToggle();
  buildToolbar();
  selectTool(save.hasTool('roughing') ? 'roughing' : 'chisel');
  document.querySelector('#orderTag .ot-name').textContent = 'Free turning';
  document.querySelector('#orderTag .ot-wood').textContent = wood.name + ' · Workshop';
  document.getElementById('finishBtn').style.display = 'none';
  state.startTime = performance.now();
  showScreen('carve');
}

function finishCarve() {
  if (state.sweep) return;
  if (state.mode === 'workshop' || !state.order) { showScreen('menu'); updateTopbar(); return; }
  audio.stopCarve();
  state.carving = false;
  const elapsed = (performance.now() - state.startTime) / 1000;
  const result = scoreLog(log, elapsed);   // scored before the (cosmetic) oil wipe
  let reward = rewardFor(state.order, state.wood, result);
  if (state.mode === 'daily') { reward.coins = Math.round(reward.coins * 1.5); reward.xp = Math.round(reward.xp * 1.5); }

  save.recordResult(state.order.id, result.stars);
  const levels = save.addReward(reward.coins, reward.xp);
  document.getElementById('carveBottom').classList.add('busy');
  const done = () => {
    document.getElementById('carveBottom').classList.remove('busy');
    audio.chime();
    showResult(result, reward, levels);
    updateTopbar();
  };
  // any wood still bare gets a quick coat of oil before the reveal
  if (log.oilCoverage() < 0.98) state.sweep = { t: 0, dur: 1.1, front: -HL, done };
  else done();
}

function showResult(result, reward, levels) {
  document.getElementById('resultStars').innerHTML = starRow(result.stars);
  document.getElementById('resultScore').textContent = result.overall;
  const titles = ['Keep practising', 'Getting there', 'Solid work', 'Fine craftsmanship', 'A masterpiece'];
  document.getElementById('resultTitle').textContent = titles[result.stars - 1] || 'Finished';
  const labels = { shape: 'Shape', smoothness: 'Smoothness', symmetry: 'Symmetry', efficiency: 'Material use', finishing: 'Finish', time: 'Time' };
  const m = result.metrics;
  document.getElementById('metricBars').innerHTML = Object.keys(labels).map(k =>
    `<div class="metric"><span class="ml">${labels[k]}</span>
      <span class="mbar"><i style="width:${m[k]}%"></i></span>
      <span class="mv">${m[k]}</span></div>`).join('');
  document.getElementById('rewardCoins').textContent = '+' + reward.coins;
  document.getElementById('rewardXp').textContent = '+' + reward.xp;
  const note = document.getElementById('unlockNote');
  if (levels.length) {
    const unlocked = [];
    for (const w of WOODS) if (w.cost === 0 && levels.includes(w.unlockLevel)) unlocked.push(w.name);
    for (const t of TOOLS) if (t.cost === 0 && levels.includes(t.unlockLevel)) unlocked.push(t.name);
    note.innerHTML = `Level ${save.level} reached` + (unlocked.length ? `<br><span>New: ${unlocked.join(', ')}</span>` : '');
    note.style.display = '';
  } else { note.style.display = 'none'; }
  showScreen('result');
}

function nextOrder() {
  // advance to the next career order the player can take
  const idx = ORDERS.findIndex(o => o.id === state.order.id);
  for (let k = 1; k <= ORDERS.length; k++) {
    const o = ORDERS[(idx + k) % ORDERS.length];
    if (o.minLevel <= save.level) { startOrder(o, state.wood, 'career'); return; }
  }
  startOrder(ORDERS[0], state.wood, 'career');
}

// ---------------------------------------------------------------------------
// UI building
// ---------------------------------------------------------------------------
function buildToolbar() {
  const bar = document.getElementById('toolbar');
  bar.innerHTML = '';
  for (const t of TOOLS) {
    if (!save.hasTool(t.id)) continue;
    const b = document.createElement('button');
    b.className = 'toolbtn ' + t.kind;
    b.dataset.tool = t.id;
    b.title = t.name;
    b.innerHTML = `${toolIcon(t.id)}<span class="tnm">${t.name}</span>`;
    b.onclick = () => { audio.ensure(); audio.click(); selectTool(t.id); };
    bar.appendChild(b);
  }
}

function selectTool(id) {
  state.tool = TOOL_BY_ID[id];
  document.querySelectorAll('#toolbar .toolbtn').forEach(b =>
    b.classList.toggle('active', b.dataset.tool === id));
}

function updateGuideToggle() {
  const b = document.getElementById('guideToggle');
  if (!b) return;
  b.classList.toggle('active', log.showGuide);
  b.innerHTML = icon(log.showGuide ? 'eye' : 'eyeOff') + (log.showGuide ? 'Trace on' : 'Trace off');
}

// the order's drawing as a small silhouette, for the order cards
function profileSvg(order, w = 120, h = 40) {
  const n = 64, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, r = Math.max(0.06, Math.min(0.92, order.profile(t)));
    pts.push([2 + t * (w - 4), r * (h / 2 - 2)]);
  }
  const top = pts.map(([x, r]) => `${x.toFixed(1)},${(h / 2 - r).toFixed(1)}`).join(' ');
  const bot = pts.slice().reverse().map(([x, r]) => `${x.toFixed(1)},${(h / 2 + r).toFixed(1)}`).join(' ');
  return `<svg class="silhouette" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polygon points="${top} ${bot}"/><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}"/></svg>`;
}

function woodSwatch(w) {
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const f = w.figure;
  return `<span class="swatch" style="background:repeating-radial-gradient(circle at 18% 120%, ${hex(f.early)} 0 5px, ${hex(f.late)} 7px, ${hex(f.early)} 9px)"></span>`;
}

function buildOrderList() {
  const list = document.getElementById('orderList');
  list.innerHTML = '';
  for (const o of ORDERS) {
    const locked = o.minLevel > save.level;
    const best = save.data.best[o.id] || 0;
    const card = document.createElement('div');
    card.className = 'card order' + (locked ? ' locked' : '');
    card.innerHTML = `
      <div class="card-top"><span class="tier">Tier ${o.tier}</span>${best ? starRow(best) : ''}</div>
      ${profileSvg(o)}
      <h3>${o.name}</h3>
      <p>${o.blurb}</p>
      <div class="card-foot">
        ${locked ? `<span class="lock">${icon('lock')}Level ${o.minLevel}</span>`
                 : `<span class="reward"><i class="coin"></i>${o.baseReward}+</span><button class="mini">Take the order</button>`}
      </div>`;
    if (!locked) card.querySelector('button').onclick = () => { audio.click(); openWoodSelect(o); };
    list.appendChild(card);
  }
}

function openWoodSelect(order) {
  state.order = order;
  document.getElementById('orderSummary').innerHTML =
    `<div><h3>${order.name}</h3><p class="muted">${order.blurb}</p></div>${profileSvg(order, 110, 38)}`;
  const list = document.getElementById('woodList');
  list.innerHTML = '';
  let chosen = null;
  freshBlank();
  log.freeBlank();                                  // show the bare blank in each timber
  for (const w of WOODS) {
    if (!save.hasWood(w.id)) continue;
    const card = document.createElement('button');
    card.className = 'card wood';
    card.dataset.wood = w.id;
    card.innerHTML = `${woodSwatch(w)}<h4>${w.name}</h4>
      <div class="wstats">Hardness ${w.hardness.toFixed(1)} · ×${w.valueMult} value</div>`;
    card.onclick = () => {
      audio.click();
      list.querySelectorAll('.wood').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel'); chosen = w; applyWood(w);
    };
    list.appendChild(card);
    if (!chosen) { card.classList.add('sel'); chosen = w; applyWood(w); }
  }
  document.getElementById('startCarve').onclick = () => { if (chosen) { audio.click(); startOrder(state.order, chosen, 'career', false); } };
  showScreen('wood');
}

function dailyPick() {
  // deterministic order/wood from today's date
  const now = new Date();
  const seed = now.getFullYear() * 1000 + (now.getMonth() + 1) * 50 + now.getDate();
  const order = ORDERS[seed % ORDERS.length];
  const owned = WOODS.filter(w => save.hasWood(w.id));
  return { order, wood: owned[seed % owned.length] };
}

function startDaily() {
  const { order, wood } = dailyPick();
  toast('Today\'s order: ' + order.name + ' in ' + wood.name);
  startOrder(order, wood, 'daily');
}

function openWorkshop() {
  // workshop uses any unlocked wood — default to the most valuable owned
  const owned = WOODS.filter(w => save.hasWood(w.id));
  startWorkshop(owned[owned.length - 1]);
}

function buildShop() {
  const list = document.getElementById('shopList');
  list.innerHTML = '';
  const isTools = state.shopTab === 'tools';
  const items = isTools ? TOOLS : WOODS;
  for (const it of items) {
    const owned = isTools ? save.hasTool(it.id) : save.hasWood(it.id);
    const lvlLocked = save.level < it.unlockLevel;
    const tooPoor = save.coins < it.cost;
    const card = document.createElement('div');
    card.className = 'card shop' + (owned ? ' owned' : '');
    const sub = isTools ? it.desc : it.blurb + ` Hardness ${it.hardness.toFixed(1)}, ×${it.valueMult} value.`;
    card.innerHTML = `
      <div class="card-top"><h3>${it.name}</h3>${isTools ? `<span class="tool-ic">${toolIcon(it.id)}</span>` : woodSwatch(it)}</div>
      <p>${sub}</p>
      <div class="card-foot">
        ${owned ? `<span class="owned-tag">${icon('check')}In the workshop</span>`
          : it.cost === 0 ? `<span class="lock">${icon('lock')}Reach level ${it.unlockLevel}</span>`
          : `<span class="reward"><i class="coin"></i>${it.cost.toLocaleString()}</span>
             <button class="mini ${lvlLocked || tooPoor ? 'disabled' : ''}">
               ${lvlLocked ? 'Level ' + it.unlockLevel : 'Buy'}</button>`}
      </div>`;
    if (!owned && it.cost > 0) {
      const btn = card.querySelector('button');
      btn.onclick = () => {
        audio.click();
        const ok = isTools ? save.buyTool(it.id) : save.buyWood(it.id);
        if (ok) { toast('Bought: ' + it.name); updateTopbar(); buildShop(); }
        else if (lvlLocked) toast('Needs level ' + it.unlockLevel);
        else toast('Not enough coins yet');
      };
    }
    list.appendChild(card);
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
function wireUI() {
  document.querySelectorAll('.icon-btn').forEach(b => { b.innerHTML = icon(b.classList.contains('back') ? 'back' : 'close'); });
  document.querySelectorAll('.ic-slot').forEach(s => { s.outerHTML = icon(s.dataset.icon); });
  const { order: dOrder, wood: dWood } = dailyPick();
  document.getElementById('dailyName').textContent = `${dOrder.name} in ${dWood.name}`;

  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      audio.ensure(); audio.click();
      const a = el.dataset.action;
      if (a === 'menu') { showScreen('menu'); updateTopbar(); }
      else if (a === 'career') { buildOrderList(); showScreen('orders'); }
      else if (a === 'orders') { buildOrderList(); showScreen('orders'); }
      else if (a === 'workshop') openWorkshop();
      else if (a === 'daily') startDaily();
      else if (a === 'shop') { state.shopTab = 'tools'; syncShopTabs(); buildShop(); showScreen('shop'); }
      else if (a === 'howto') showScreen('howto');
      else if (a === 'abandon') { if (!state.sweep) { showScreen('menu'); updateTopbar(); } }
    });
  });

  document.getElementById('finishBtn').onclick = () => { audio.click(); finishCarve(); };
  document.getElementById('guideToggle').onclick = () => {
    audio.click(); log.setGuideVisible(!log.showGuide); updateGuideToggle();
  };
  document.getElementById('retryBtn').onclick = () => { audio.click(); startOrder(state.order, state.wood, state.mode === 'daily' ? 'daily' : 'career'); };
  document.getElementById('nextBtn').onclick = () => { audio.click(); nextOrder(); };

  document.querySelectorAll('.shop-tabs .tab').forEach(t => {
    t.onclick = () => { audio.click(); state.shopTab = t.dataset.tab; syncShopTabs(); buildShop(); };
  });

  const at = document.getElementById('audioToggle');
  const paintAudio = () => { at.innerHTML = icon(save.data.audio ? 'soundOn' : 'soundOff'); };
  at.onclick = () => {
    audio.ensure();
    const on = !save.data.audio;
    save.setAudio(on); audio.setEnabled(on);
    paintAudio();
  };
  paintAudio();
  audio.enabled = save.data.audio;
}

function syncShopTabs() {
  document.querySelectorAll('.shop-tabs .tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === state.shopTab));
}

// A finished piece on the lathe for the menu, until the player turns their own.
function showcasePiece() {
  applyWood(WOOD_BY_ID.walnut);
  newFigure(woodMat, seeded(7));
  log.applyOrder(ORDER_BY_ID.urn || ORDERS[0]);
  for (let i = 0; i < log.S; i++) { log.radius[i] = log.target[i]; log.sanded[i] = 1; log.oiled[i] = 1; }
  log.markDirty(0, log.S - 1);
  log.updateGeometry();
  log.setGuideVisible(false);
  shavings.scatter(26, WOOD_BY_ID.walnut.shaving, -1.1, 0.9);
}

// small deterministic PRNG (mulberry32) for repeatable figures
function seeded(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  initScene();
  setupPointer();
  wireUI();
  updateTopbar();
  showcasePiece();
  showScreen('menu');
  goToShot('show', true);
  renderer.compile(scene, camera);        // build the shaders now, not on the first cut
  document.getElementById('loading').classList.add('gone');
  lastT = performance.now();
  requestAnimationFrame(animate);

  // ?dev exposes a handle for automated captures and frame-time checks
  if (new URLSearchParams(location.search).has('dev')) {
    window.WF = {
      THREE, scene, camera, renderer, log, state, woodMat, save, tools,
      frame, seeded, setFigure: (seed) => newFigure(woodMat, seeded(seed)),
      startOrder: (id, wood, fresh = true) => startOrder(ORDER_BY_ID[id], WOOD_BY_ID[wood], 'career', fresh),
      selectTool, finishCarve, showScreen, goToShot, shavings,
      // hold the camera on an arbitrary framing (captures)
      setShot({ pos, target, fov = 30, shift = 0, up = [0, 1, 0] }) {
        camera.up.set(...up);
        const o = { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), fov, shift, drift: 0 };
        cam.from = cam.to = o; cam.t = 1; cam.name = 'custom';
      },
      // client coords of the point whose ray passes `d` from the axis above world x
      screenFor(x, d) {
        const cy = camera.position.y, cz = camera.position.z;
        let lo = 0, hi = 1.4;
        for (let i = 0; i < 40; i++) { const h = (lo + hi) / 2; if (Math.abs(cz * h) / Math.hypot(h - cy, cz) < d) lo = h; else hi = h; }
        _v.set(x, (lo + hi) / 2, 0).project(camera);
        return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight];
      },
      aim(x, d) { return this.screenFor(x, d); },
    };
  }
}

boot();
