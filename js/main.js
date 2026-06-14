import * as THREE from 'three';
import { CONFIG } from './config.js?v=10';
import { WOODS, WOOD_BY_ID } from './woods.js?v=10';
import { TOOLS, TOOL_BY_ID } from './tools.js?v=10';
import { ORDERS, ORDER_BY_ID } from './orders.js?v=10';
import { Log } from './lathe.js?v=10';
import { scoreLog, rewardFor, liveMatch } from './scoring.js?v=10';
import { Shavings } from './particles.js?v=10';
import { AudioEngine } from './audio.js?v=10';
import { Save } from './save.js?v=10';
import { drawProfileGraph, toast, stars } from './ui.js?v=10';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const save = new Save();
const audio = new AudioEngine();
let renderer, scene, camera, log, shavings, toolMarker;
let woodMat, capMat, grainTex, endMat, endDiscL, endDiscR;

const state = {
  screen: 'menu',
  mode: 'career',       // career | workshop | daily
  order: null,
  wood: WOOD_BY_ID.pine,
  tool: TOOL_BY_ID.chisel,
  startTime: 0,
  carving: false,       // pointer is down on the canvas
  ndc: new THREE.Vector2(),
  spinning: true,
  shopTab: 'tools',
};

const raycaster = new THREE.Raycaster();
let lastT = 0;

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------
function initScene() {
  const canvas = document.getElementById('scene');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = makeGradientBg();
  scene.fog = new THREE.Fog(0x1c140d, 6, 14);

  // image-based lighting so metal reads as metal and the wood catches soft light
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = makeEnvTexture();
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose(); pmrem.dispose();

  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.55, 3.15);
  camera.lookAt(0, 0, 0);

  // lights — warm workshop feel
  const hemi = new THREE.HemisphereLight(0xffe9c8, 0x2a1d12, 0.65);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0d6, 1.5);
  key.position.set(2.2, 3.4, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
  key.shadow.camera.left = -2.5; key.shadow.camera.right = 2.5;
  key.shadow.camera.top = 2.5; key.shadow.camera.bottom = -2.5;
  key.shadow.bias = -0.0008;
  key.shadow.radius = 3.5;       // softer shadow edges
  scene.add(key);
  const warm = new THREE.PointLight(0xffb36b, 0.5, 12);
  warm.position.set(-2.4, 1.0, 1.8);
  scene.add(warm);

  buildEnvironment();

  // materials + log
  grainTex = makeGrainTexture();
  woodMat = new THREE.MeshStandardMaterial({ map: grainTex, roughness: 0.72, metalness: 0.0 });
  woodMat.envMapIntensity = 0.35;
  capMat = new THREE.MeshStandardMaterial({ color: 0x9c7a4d, roughness: 0.8, metalness: 0.0 });
  capMat.envMapIntensity = 0.3;

  log = new Log();
  const mesh = log.setMaterials(woodMat, capMat);
  scene.add(mesh);

  // realistic end grain: a ring-textured disc on each end that spins with the log
  endMat = new THREE.MeshStandardMaterial({ map: makeEndGrainTexture(), roughness: 0.72, metalness: 0.0 });
  endMat.envMapIntensity = 0.3;
  const discGeo = new THREE.CircleGeometry(CONFIG.R0, 56);
  endDiscL = new THREE.Mesh(discGeo, endMat);
  endDiscR = new THREE.Mesh(discGeo, endMat);
  endDiscL.rotation.y = -Math.PI / 2; endDiscL.position.x = -CONFIG.LENGTH / 2 - 0.003;
  endDiscR.rotation.y = Math.PI / 2; endDiscR.position.x = CONFIG.LENGTH / 2 + 0.003;
  log.mesh.add(endDiscL); log.mesh.add(endDiscR);

  applyWood(state.wood);

  // trace guide: a thin yellow outline of the target shape drawn over the log
  const guideMat = new THREE.LineBasicMaterial({
    color: 0xffd23f, transparent: true, opacity: 0.95, depthTest: false,
  });
  log.ensureGuide(guideMat);
  scene.add(log.guideTop, log.guideBot);

  shavings = new Shavings(scene);

  // tool marker — a small sharp tip that touches the log exactly where it cuts
  const tm = new THREE.Mesh(
    new THREE.ConeGeometry(0.016, 0.13, 14),
    new THREE.MeshStandardMaterial({ color: 0xcfd6db, metalness: 0.7, roughness: 0.35 })
  );
  tm.rotation.z = Math.PI;       // point downward
  tm.visible = false;
  toolMarker = tm;
  scene.add(tm);

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
  onResize();
}

function makeGradientBg() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#3a2a1b');
  grd.addColorStop(0.55, '#241910');
  grd.addColorStop(1, '#140d08');
  g.fillStyle = grd; g.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// warm equirectangular environment -> reflections for the metal lathe parts
function makeEnvTexture() {
  const w = 256, h = 128, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#7a6650');     // warm ceiling
  grd.addColorStop(0.46, '#3a2f24');
  grd.addColorStop(0.52, '#241c14');
  grd.addColorStop(1, '#0c0906');     // dark floor
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const blob = (x, y, r, col) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  };
  blob(w * 0.30, h * 0.26, 48, 'rgba(255,228,176,0.95)'); // soft window light
  blob(w * 0.72, h * 0.30, 38, 'rgba(255,205,150,0.6)');
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// concentric growth-ring end grain for the cut faces (tinted per wood)
function makeEndGrainTexture() {
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const cx = s / 2 + (Math.random() - 0.5) * 10, cy = s / 2 + (Math.random() - 0.5) * 10;
  g.fillStyle = '#dcc49c';
  g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.fill();
  for (let r = 5; r < s * 0.72; r += 3.5 + Math.random() * 5) {
    const sh = 80 + Math.random() * 60;
    g.strokeStyle = `rgba(${sh * 0.5 | 0},${sh * 0.36 | 0},${sh * 0.22 | 0},${0.22 + Math.random() * 0.32})`;
    g.lineWidth = 0.7 + Math.random() * 1.7;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = 'rgba(60,40,24,0.55)';
  g.beginPath(); g.arc(cx, cy, 3, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 3; k++) {
    const a = Math.random() * Math.PI * 2;
    g.strokeStyle = 'rgba(48,32,18,0.28)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildEnvironment() {
  // wooden workbench
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.5, 2.8),
    new THREE.MeshStandardMaterial({ color: 0x4a2f1a, roughness: 0.88, metalness: 0.0 })
  );
  bench.position.set(0, -1.06, -0.1);
  bench.receiveShadow = true;
  scene.add(bench);

  // cast-iron lathe bed (the ways)
  const bed = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.LENGTH + 1.7, 0.16, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x32373c, roughness: 0.4, metalness: 0.75 })
  );
  bed.position.set(0, -0.78, 0);
  bed.receiveShadow = true; bed.castShadow = true;
  scene.add(bed);

  const iron = new THREE.MeshStandardMaterial({ color: 0x3b4146, roughness: 0.52, metalness: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.26, metalness: 0.92 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.38, metalness: 0.85 });

  for (const dir of [-1, 1]) {
    const baseX = dir * (CONFIG.LENGTH / 2 + 0.42);
    // foot clamped to the bed
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.68), iron);
    foot.position.set(baseX, -0.82, 0); foot.castShadow = foot.receiveShadow = true; scene.add(foot);
    // headstock / tailstock casting
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.9, 0.46), iron);
    body.position.set(baseX, -0.42, 0); body.castShadow = body.receiveShadow = true; scene.add(body);
    // spindle barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 24), steel);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(dir * (CONFIG.LENGTH / 2 + 0.27), 0, 0);
    barrel.castShadow = true; scene.add(barrel);
    // live centre seated into the wood end
    const center = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 22), steel);
    center.rotation.z = dir * Math.PI / 2;
    center.position.set(dir * (CONFIG.LENGTH / 2 + 0.09), 0, 0);
    center.castShadow = true; scene.add(center);
    // handwheel on the tailstock
    if (dir > 0) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 12, 30), darkSteel);
      wheel.rotation.y = Math.PI / 2; wheel.position.set(baseX + 0.36, 0, 0); scene.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16), darkSteel);
      hub.rotation.z = Math.PI / 2; hub.position.set(baseX + 0.30, 0, 0); scene.add(hub);
    }
  }
}

// procedural straight-grain wood texture (tinted per-wood via material.color)
function makeGrainTexture() {
  const W = 256, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#cdba94'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * W;
    const shade = 150 + Math.random() * 70;
    g.strokeStyle = `rgba(${shade * 0.6 | 0},${shade * 0.45 | 0},${shade * 0.3 | 0},${0.10 + Math.random() * 0.18})`;
    g.lineWidth = 0.6 + Math.random() * 2.2;
    g.beginPath();
    let xx = x;
    for (let y = 0; y <= H; y += 16) {
      xx += (Math.random() - 0.5) * 4;
      y ? g.lineTo(xx, y) : g.moveTo(xx, y);
    }
    g.stroke();
  }
  // a couple of darker knots/streaks
  for (let i = 0; i < 5; i++) {
    g.fillStyle = `rgba(70,48,28,${0.05 + Math.random() * 0.08})`;
    g.beginPath();
    g.ellipse(Math.random() * W, Math.random() * H, 4 + Math.random() * 10, 18 + Math.random() * 40, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function applyWood(wood) {
  state.wood = wood;
  woodMat.color.setHex(wood.color);
  capMat.color.setHex(wood.grain);
  if (endMat) endMat.color.setHex(wood.shaving);
  grainTex.repeat.set(3 * wood.grainScale, 1);
  grainTex.needsUpdate = true;
}

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  frameCamera();
  // surface a "rotate to landscape" hint on tall/narrow screens
  const rh = document.getElementById('rotateHint');
  if (rh) rh.classList.toggle('show', state.screen === 'carve' && h > w * 1.05);
}

// Pull the camera back far enough that the whole log fits, whatever the aspect
// ratio / orientation — so it works on phones in portrait and landscape.
function frameCamera() {
  if (!camera) return;
  const tanV = Math.tan(camera.fov * Math.PI / 360);
  const halfLen = CONFIG.LENGTH / 2 + 0.5;          // length + handle margin
  const maxR = CONFIG.R0 + 0.45;                     // radius + vertical margin
  const distH = halfLen / (tanV * camera.aspect);    // fit length horizontally
  const distV = maxR / tanV;                          // fit radius vertically
  const dist = Math.min(11, Math.max(distH, distV, 2.6));
  camera.position.set(0, dist * 0.16, dist);
  camera.lookAt(0, 0, 0);
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
    if (state.screen !== 'carve') return;
    audio.ensure();
    setNdc(e);
    state.carving = true;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => { if (state.carving) setNdc(e); });
  const end = () => { state.carving = false; audio.stopCarve(); toolMarker.visible = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);
}

function applyCarve(dt) {
  if (!(state.screen === 'carve' && state.carving)) { audio.stopCarve(); return; }
  raycaster.setFromCamera(state.ndc, camera);
  // Axial position comes from the ACTUAL wood surface under the pointer, so the
  // cut lands exactly where you touch (no plane-projection parallax).
  const hits = raycaster.intersectObject(log.mesh, false);
  if (!hits.length) { audio.stopCarve(); audio.carve(0, false); toolMarker.visible = false; return; }
  const hp = hits[0].point;
  const x = Math.min(CONFIG.LENGTH / 2, Math.max(-CONFIG.LENGTH / 2, hp.x));
  const i = log.indexAt(x);
  // Depth = the ray's closest approach to the lathe (X) axis: aim toward the
  // centreline to cut deeper. This is independent of x, so it adds no parallax.
  const O = raycaster.ray.origin, D = raycaster.ray.direction;
  const t = -(O.y * D.y + O.z * D.z) / (D.y * D.y + D.z * D.z);
  const depth = Math.min(CONFIG.R0, Math.max(CONFIG.MIN_R,
    Math.hypot(O.y + t * D.y, O.z + t * D.z)));
  const tool = state.tool, wood = state.wood;

  let work = 0, isSand = tool.kind === 'sand';
  if (isSand) {
    work = log.sand(x, tool, wood, dt);
    audio.carve(Math.min(1, work * 4 + 0.15), true);
    if (work > 0) { if (Math.random() < 0.5) shavings.spawn(hp, wood.shaving, 0.25); pulse(0.3); }
  } else {
    const removed = log.carve(x, depth, tool, wood, dt);
    work = removed;
    if (removed > 0) {
      const intensity = Math.min(1, removed * 45);
      audio.carve(0.3 + intensity * 0.7, false);
      shavings.spawn(hp, wood.shaving, intensity);
      pulse(intensity);
    } else {
      audio.carve(0.0, false);
    }
  }

  // tool marker tip sits right on the contact point
  toolMarker.visible = true;
  toolMarker.position.set(x, log.radius[i] + 0.065, 0);
  toolMarker.material.color.setHex(tool.color);
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
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastT) / 1000) || 0;
  lastT = now;

  if (state.spinning) log.mesh.rotation.x += CONFIG.SPIN_SPEED * dt;

  applyCarve(dt);
  log.updateGeometry();
  if (endDiscL) {
    endDiscL.scale.setScalar(Math.max(0.04, log.radius[0] / CONFIG.R0));
    endDiscR.scale.setScalar(Math.max(0.04, log.radius[log.S - 1] / CONFIG.R0));
  }
  shavings.update(dt);

  if (state.screen === 'carve') {
    drawProfileGraph(document.getElementById('profileGraph'), log);
    const mr = document.getElementById('matchReadout');
    if (state.order) {
      mr.style.display = '';
      const m = liveMatch(log);
      const mv = document.getElementById('matchVal');
      mv.textContent = m + '%';
      mv.style.color = m >= 85 ? '#7dc480' : m >= 60 ? '#e8cd96' : '#d9a06a';
    } else { mr.style.display = 'none'; }
  }

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// Screen / flow management
// ---------------------------------------------------------------------------
function showScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('show'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('show');
  document.getElementById('topbar').style.display = (name === 'carve') ? 'none' : '';
  audio.hum(name === 'carve');
  if (name !== 'carve') { state.carving = false; audio.stopCarve(); toolMarker.visible = false; }
  const rh = document.getElementById('rotateHint');
  if (rh) rh.classList.toggle('show', name === 'carve' && innerHeight > innerWidth * 1.05);
}

function updateTopbar() {
  document.getElementById('statLevel').textContent = 'Lv ' + save.level;
  document.getElementById('statCoins').textContent = save.coins.toLocaleString();
  const frac = Math.max(0, Math.min(1, save.xp / save.xpToNext()));
  document.getElementById('xpfill').style.width = (frac * 100) + '%';
}

function startOrder(order, wood, mode) {
  state.order = order; state.mode = mode; applyWood(wood);
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
  document.querySelector('#orderTag .ot-wood').textContent = wood.name + (mode === 'daily' ? ' · Daily' : '');
  document.getElementById('finishBtn').style.display = '';
  state.startTime = performance.now();
  showScreen('carve');
}

function startWorkshop(wood) {
  state.order = null; state.mode = 'workshop'; applyWood(wood);
  log.freeBlank();
  log.mesh.rotation.x = 0;
  log.assistNoOvercut = false;
  log.setGuideVisible(false);
  updateGuideToggle();
  buildToolbar();
  selectTool(save.hasTool('roughing') ? 'roughing' : 'chisel');
  document.querySelector('#orderTag .ot-name').textContent = 'Free Carving';
  document.querySelector('#orderTag .ot-wood').textContent = wood.name + ' · Workshop';
  document.getElementById('finishBtn').style.display = 'none';
  state.startTime = performance.now();
  showScreen('carve');
}

function finishCarve() {
  if (state.mode === 'workshop' || !state.order) { showScreen('menu'); updateTopbar(); return; }
  audio.stopCarve();
  const elapsed = (performance.now() - state.startTime) / 1000;
  const result = scoreLog(log, elapsed);
  let reward = rewardFor(state.order, state.wood, result);
  if (state.mode === 'daily') { reward.coins = Math.round(reward.coins * 1.5); reward.xp = Math.round(reward.xp * 1.5); }

  save.recordResult(state.order.id, result.stars);
  const levels = save.addReward(reward.coins, reward.xp);
  audio.chime();
  showResult(result, reward, levels);
  updateTopbar();
}

function showResult(result, reward, levels) {
  document.getElementById('resultStars').textContent = stars(result.stars);
  document.getElementById('resultScore').textContent = result.overall;
  const titles = ['Keep practising!', 'Getting there', 'Solid work', 'Great craftsmanship', 'Masterpiece!'];
  document.getElementById('resultTitle').textContent = titles[result.stars - 1] || 'Finished!';
  const labels = { shape: 'Shape Accuracy', smoothness: 'Smoothness', symmetry: 'Symmetry', efficiency: 'Material Use', finishing: 'Finishing', time: 'Time' };
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
    for (const w of WOODS) if (w.cost === 0 && levels.includes(w.unlockLevel)) unlocked.push(w.name + ' wood');
    for (const t of TOOLS) if (t.cost === 0 && levels.includes(t.unlockLevel)) unlocked.push(t.name);
    note.innerHTML = `🎉 Reached <b>Level ${save.level}</b>!` +
      (unlocked.length ? `<br>Unlocked: ${unlocked.join(', ')}` : '');
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
    b.className = 'toolbtn' + (t.kind === 'sand' ? ' sand' : '');
    b.dataset.tool = t.id;
    b.innerHTML = `<span class="tic">${t.icon}</span><span class="tnm">${t.name}</span>`;
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
  b.textContent = log.showGuide ? '👁 Trace: On' : '👁 Trace: Off';
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
      <div class="card-top"><span class="tier">Tier ${o.tier}</span>
        <span class="best">${best ? stars(best) : ''}</span></div>
      <h3>${o.name}</h3>
      <p>${o.blurb}</p>
      <div class="card-foot">
        ${locked ? `<span class="lock">🔒 Level ${o.minLevel}</span>`
                 : `<span class="reward">🪙 ${o.baseReward}+</span><button class="mini">Carve →</button>`}
      </div>`;
    if (!locked) card.querySelector('button').onclick = () => { audio.click(); openWoodSelect(o); };
    list.appendChild(card);
  }
}

function openWoodSelect(order) {
  state.order = order;
  document.getElementById('orderSummary').innerHTML =
    `<div><h3>${order.name}</h3><p class="muted">${order.blurb}</p></div>
     <span class="tier">Tier ${order.tier}</span>`;
  const list = document.getElementById('woodList');
  list.innerHTML = '';
  let chosen = null;
  for (const w of WOODS) {
    if (!save.hasWood(w.id)) continue;
    const card = document.createElement('button');
    card.className = 'card wood';
    card.dataset.wood = w.id;
    card.innerHTML = `<span class="swatch" style="background:#${w.color.toString(16).padStart(6, '0')}"></span>
      <h4>${w.name}</h4>
      <div class="wstats">Hardness ${w.hardness.toFixed(1)} · ×${w.valueMult} value</div>`;
    card.onclick = () => {
      audio.click();
      list.querySelectorAll('.wood').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel'); chosen = w; applyWood(w);
    };
    list.appendChild(card);
    if (!chosen) { card.classList.add('sel'); chosen = w; applyWood(w); }
  }
  document.getElementById('startCarve').onclick = () => { if (chosen) { audio.click(); startOrder(state.order, chosen, 'career'); } };
  showScreen('wood');
}

function startDaily() {
  // deterministic order/wood from today's date
  const now = new Date();
  const seed = now.getFullYear() * 1000 + (now.getMonth() + 1) * 50 + now.getDate();
  const order = ORDERS[seed % ORDERS.length];
  const owned = WOODS.filter(w => save.hasWood(w.id));
  const wood = owned[seed % owned.length];
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
  const items = state.shopTab === 'tools' ? TOOLS : WOODS;
  for (const it of items) {
    const owned = state.shopTab === 'tools' ? save.hasTool(it.id) : save.hasWood(it.id);
    const lvlLocked = save.level < it.unlockLevel;
    const tooPoor = save.coins < it.cost;
    const card = document.createElement('div');
    card.className = 'card shop' + (owned ? ' owned' : '');
    const sub = state.shopTab === 'tools'
      ? it.desc
      : it.blurb + ` (Hardness ${it.hardness.toFixed(1)}, ×${it.valueMult} value)`;
    card.innerHTML = `
      <div class="card-top"><h3>${it.name}</h3>
        <span class="best">${state.shopTab === 'tools' ? (it.icon || '') : ''}</span></div>
      <p>${sub}</p>
      <div class="card-foot">
        ${owned ? `<span class="owned-tag">✓ Owned</span>`
          : it.cost === 0 ? `<span class="lock">🔒 Reach Level ${it.unlockLevel}</span>`
          : `<span class="reward">🪙 ${it.cost.toLocaleString()}</span>
             <button class="mini ${lvlLocked || tooPoor ? 'disabled' : ''}">
               ${lvlLocked ? 'Lv ' + it.unlockLevel : 'Buy'}</button>`}
      </div>`;
    if (!owned && it.cost > 0) {
      const btn = card.querySelector('button');
      btn.onclick = () => {
        audio.click();
        const ok = state.shopTab === 'tools' ? save.buyTool(it.id) : save.buyWood(it.id);
        if (ok) { toast('Purchased ' + it.name + '!'); updateTopbar(); buildShop(); }
        else if (lvlLocked) toast('Requires Level ' + it.unlockLevel);
        else toast('Not enough coins');
      };
    }
    list.appendChild(card);
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
function wireUI() {
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
      else if (a === 'abandon') { showScreen('menu'); updateTopbar(); }
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
  at.onclick = () => {
    audio.ensure();
    const on = !save.data.audio;
    save.setAudio(on); audio.setEnabled(on);
    at.textContent = on ? '🔊' : '🔇';
  };
  at.textContent = save.data.audio ? '🔊' : '🔇';
  audio.enabled = save.data.audio;
}

function syncShopTabs() {
  document.querySelectorAll('.shop-tabs .tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === state.shopTab));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  initScene();
  setupPointer();
  wireUI();
  updateTopbar();
  showScreen('menu');
  document.getElementById('loading').style.display = 'none';
  lastT = performance.now();
  requestAnimationFrame(animate);
}

boot();
