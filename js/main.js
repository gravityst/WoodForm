import * as THREE from 'three';
import { CONFIG } from './config.js';
import { WOODS, WOOD_BY_ID } from './woods.js';
import { TOOLS, TOOL_BY_ID } from './tools.js';
import { ORDERS, ORDER_BY_ID } from './orders.js';
import { Log } from './lathe.js';
import { scoreLog, rewardFor } from './scoring.js';
import { Shavings } from './particles.js';
import { AudioEngine } from './audio.js';
import { Save } from './save.js';
import { drawProfileGraph, toast, stars } from './ui.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const save = new Save();
const audio = new AudioEngine();
let renderer, scene, camera, log, shavings, toolMarker;
let woodMat, capMat, grainTex;

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

const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z = 0
const raycaster = new THREE.Raycaster();
const hitPoint = new THREE.Vector3();
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
  scene.add(key);
  const warm = new THREE.PointLight(0xffb36b, 0.5, 12);
  warm.position.set(-2.4, 1.0, 1.8);
  scene.add(warm);

  buildEnvironment();

  // materials + log
  grainTex = makeGrainTexture();
  woodMat = new THREE.MeshStandardMaterial({ map: grainTex, roughness: 0.72, metalness: 0.0 });
  capMat = new THREE.MeshStandardMaterial({ color: 0x9c7a4d, roughness: 0.85, metalness: 0.0 });

  log = new Log();
  const mesh = log.setMaterials(woodMat, capMat);
  scene.add(mesh);
  applyWood(state.wood);

  shavings = new Shavings(scene);

  // tool marker
  const tm = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0xcfd6db, metalness: 0.7, roughness: 0.35 })
  );
  tm.rotation.z = Math.PI;       // point downward
  tm.visible = false;
  toolMarker = tm;
  scene.add(tm);

  window.addEventListener('resize', onResize);
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

function buildEnvironment() {
  // workshop bench
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(7, 0.25, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x53341d, roughness: 0.9 })
  );
  bench.position.set(0, -0.92, 0);
  bench.receiveShadow = true;
  scene.add(bench);

  // lathe bed rail
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.LENGTH + 1.2, 0.12, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x39414a, roughness: 0.5, metalness: 0.6 })
  );
  rail.position.set(0, -0.78, 0);
  rail.receiveShadow = true; rail.castShadow = true;
  scene.add(rail);

  // head & tail stocks holding the log
  const stockMat = new THREE.MeshStandardMaterial({ color: 0x4a525b, roughness: 0.45, metalness: 0.65 });
  for (const dir of [-1, 1]) {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.95, 0.5), stockMat);
    stock.position.set(dir * (CONFIG.LENGTH / 2 + 0.32), -0.42, 0);
    stock.castShadow = true; stock.receiveShadow = true;
    scene.add(stock);
    const center = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.22, 18),
      new THREE.MeshStandardMaterial({ color: 0xbfc6cc, metalness: 0.8, roughness: 0.3 })
    );
    center.position.set(dir * (CONFIG.LENGTH / 2 + 0.11), 0, 0);
    center.rotation.z = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(center);
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
  grainTex.repeat.set(3 * wood.grainScale, 1);
  grainTex.needsUpdate = true;
}

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
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
  const hit = raycaster.ray.intersectPlane(plane, hitPoint);
  if (!hit || Math.abs(hitPoint.x) > CONFIG.LENGTH / 2 || Math.abs(hitPoint.y) > CONFIG.R0 * 1.3) {
    audio.stopCarve(); toolMarker.visible = false; return;
  }
  const x = hitPoint.x;
  const depth = Math.min(CONFIG.R0, Math.max(CONFIG.MIN_R, Math.abs(hitPoint.y)));
  const i = log.indexAt(x);
  const tool = state.tool, wood = state.wood;

  let work = 0, isSand = tool.kind === 'sand';
  if (isSand) {
    work = log.sand(x, tool, wood, dt);
    audio.carve(Math.min(1, work * 4 + 0.15), true);
    if (work > 0 && Math.random() < 0.5) spawnFx(x, i, wood.shaving, 0.25);
  } else {
    const removed = log.carve(x, depth, tool, wood, dt);
    work = removed;
    if (removed > 0) {
      const intensity = Math.min(1, removed * 45);
      audio.carve(0.3 + intensity * 0.7, false);
      spawnFx(x, i, wood.shaving, intensity);
    } else {
      audio.carve(0.0, false);
    }
  }

  // place the tool marker at the contact, above the current surface
  const top = Math.max(depth, log.radius[i]);
  toolMarker.visible = true;
  toolMarker.position.set(x, top + 0.12, 0);
  toolMarker.material.color.setHex(tool.color);
}

function spawnFx(x, i, color, intensity) {
  hitPoint.set(x, log.radius[i], 0);
  shavings.spawn(hitPoint, color, intensity);
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
  shavings.update(dt);

  if (state.screen === 'carve') {
    const pg = document.getElementById('profileGraph');
    drawProfileGraph(pg, log);
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
