import * as THREE from 'three';
import { CONFIG } from './config.js?v=11';
import { makeWoodMaterial } from './woodshader.js?v=11';

// The workshop around the log: a bench lathe (bed, headstock with drive spur,
// tailstock with live centre, sliding tool rest), the bench it sits on, a
// painted board wall with afternoon window light, a shelf of finished pieces,
// a pendant lamp, and the image-based lighting the finishes reflect.
//
// World layout: the lathe axis is the X axis (y = z = 0); the turner stands on
// the +Z side; the wall is behind at -Z.

export const BED_TOP = -0.74;          // top of the bed ways (shavings land here)
export const REST = { y: -0.2, z: 0.8, r: 0.026, half: 0.5 };   // tool rest bar

const HL = CONFIG.LENGTH / 2;

const MAT = {
  enamel: () => new THREE.MeshPhysicalMaterial({ color: 0x2c4a3e, roughness: 0.42, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.3 }),
  iron: () => new THREE.MeshStandardMaterial({ color: 0x3a3e41, roughness: 0.62, metalness: 0.45 }),
  steel: () => new THREE.MeshStandardMaterial({ color: 0xc3c9ce, roughness: 0.26, metalness: 1 }),
  darkSteel: () => new THREE.MeshStandardMaterial({ color: 0x2c3035, roughness: 0.34, metalness: 0.85 }),
  brass: () => new THREE.MeshStandardMaterial({ color: 0xc79d55, roughness: 0.3, metalness: 1 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.85 }),
};

function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// Box with softly rounded edges (w along x, h along y, d along z), centred.
function roundedBox(w, h, d, r = 0.03) {
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -h / 2 + r, W = w - 2 * r, H = h - 2 * r;
  s.moveTo(x, y - r);
  s.absarc(x + W, y, r, -Math.PI / 2, 0);
  s.absarc(x + W, y + H, r, 0, Math.PI / 2);
  s.absarc(x, y + H, r, Math.PI / 2, Math.PI);
  s.absarc(x, y, r, Math.PI, Math.PI * 1.5);
  const bev = Math.min(r * 0.8, d * 0.2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.9, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * bev) / 2);
  return g;
}

function cylX(r, len, seg = 32, rTop = r) {
  const g = new THREE.CylinderGeometry(rTop, r, len, seg);
  g.rotateZ(-Math.PI / 2);          // axis along +X (rTop at +X)
  return g;
}

// ---------------------------------------------------------------------------
export function buildWorkshop(scene) {
  const m = Object.fromEntries(Object.entries(MAT).map(([k, f]) => [k, f()]));
  const out = { materials: m };

  // --- bench -----------------------------------------------------------------
  const benchTop = makeWoodMaterial({ plank: 0.3, sanded: 1, oiled: 0.35, clearcoat: 1 });
  benchTop.userData.wood.uEarly.value.setHex(0xc8a375);
  benchTop.userData.wood.uLate.value.setHex(0x9c7447);
  benchTop.userData.wood.uRing.value.set(9, 0.7, 0.05, 0.12);
  benchTop.userData.wood.uPith.value.set(-0.9, 0, 0.0, 0.02);
  const top = mesh(new THREE.BoxGeometry(14, 0.14, 2.4), benchTop, { cast: false });
  top.position.set(0, -1.25, 0.02);
  scene.add(top);
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.8 });
  const apron = mesh(new THREE.BoxGeometry(13.8, 0.34, 0.08), apronMat, { cast: false });
  apron.position.set(0, -1.49, 1.12);
  scene.add(apron);

  // --- lathe bed -------------------------------------------------------------
  const bedLen = CONFIG.LENGTH + 2.3, bedX = -0.12;
  for (const z of [-0.155, 0.155]) {
    const way = mesh(roundedBox(bedLen, 0.1, 0.1, 0.012), m.steel);
    way.position.set(bedX, BED_TOP - 0.05, z);
    scene.add(way);
  }
  const web = mesh(new THREE.BoxGeometry(bedLen - 0.1, 0.12, 0.24), m.iron);
  web.position.set(bedX, BED_TOP - 0.15, 0);
  scene.add(web);
  // cast feet down to the bench
  for (const x of [-2.02, 1.86]) {
    const foot = mesh(roundedBox(0.34, 0.36, 0.62, 0.04), m.enamel);
    foot.position.set(x, -1.0, 0);
    scene.add(foot);
  }

  // --- headstock (left) --------------------------------------------------------
  const hs = new THREE.Group();
  const hsBody = mesh(roundedBox(0.78, 1.02, 0.62, 0.07), m.enamel);
  hsBody.position.set(-2.0, BED_TOP + 0.5, 0);
  hs.add(hsBody);
  const cover = mesh(roundedBox(0.5, 0.3, 0.56, 0.12), m.enamel);   // pulley cover
  cover.position.set(-2.12, BED_TOP + 1.1, 0);
  hs.add(cover);
  const motor = mesh(cylX(0.17, 0.62, 28), m.darkSteel);
  motor.position.set(-2.05, BED_TOP + 0.36, -0.46);
  hs.add(motor);
  for (let k = 0; k < 6; k++) {                                        // cooling fins
    const fin = mesh(cylX(0.18, 0.018, 28), m.iron);
    fin.position.set(-2.3 + k * 0.1, BED_TOP + 0.36, -0.46);
    hs.add(fin);
  }
  // spindle, index ring and drive spur biting into the blank
  const spindle = mesh(cylX(0.085, 0.26, 32), m.steel);
  spindle.position.set(-1.5, 0, 0);
  hs.add(spindle);
  const ring = mesh(cylX(0.13, 0.05, 40), m.darkSteel);
  ring.position.set(-1.58, 0, 0);
  hs.add(ring);
  const spurBody = mesh(cylX(0.055, 0.06, 24), m.steel);
  spurBody.position.set(-HL - 0.045, 0, 0);
  hs.add(spurBody);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    const prong = mesh(new THREE.BoxGeometry(0.04, 0.012, 0.03), m.steel);
    prong.position.set(-HL - 0.005, Math.cos(a) * 0.035, Math.sin(a) * 0.035);
    prong.rotation.x = a;
    hs.add(prong);
  }
  // front panel: speed dial, switch, maker's plate
  const dial = mesh(new THREE.CylinderGeometry(0.06, 0.066, 0.035, 32), m.darkSteel);
  dial.rotation.x = Math.PI / 2;
  dial.position.set(-1.86, BED_TOP + 0.52, 0.325);
  hs.add(dial);
  const knobMark = mesh(new THREE.BoxGeometry(0.008, 0.045, 0.01), m.brass);
  knobMark.position.set(-1.86, BED_TOP + 0.54, 0.345);
  hs.add(knobMark);
  const sw = mesh(roundedBox(0.09, 0.13, 0.04, 0.012), m.rubber);
  sw.position.set(-2.16, BED_TOP + 0.52, 0.33);
  hs.add(sw);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.1), new THREE.MeshStandardMaterial({ map: plateTexture(), metalness: 0.9, roughness: 0.35 }));
  plate.position.set(-2.0, BED_TOP + 0.84, 0.316);
  hs.add(plate);
  scene.add(hs);

  // --- tailstock (right) -----------------------------------------------------
  const ts = new THREE.Group();
  const tsBody = mesh(roundedBox(0.5, 0.86, 0.5, 0.07), m.enamel);
  tsBody.position.set(1.98, BED_TOP + 0.42, 0);
  ts.add(tsBody);
  const quill = mesh(cylX(0.07, 0.4, 28), m.steel);
  quill.position.set(1.6, 0, 0);
  ts.add(quill);
  const bearing = mesh(cylX(0.058, 0.1, 28), m.darkSteel);
  bearing.position.set(HL + 0.1, 0, 0);
  ts.add(bearing);
  const point = mesh(cylX(0.045, 0.07, 24, 0.002).rotateY(Math.PI), m.steel);    // cone toward -X
  point.position.set(HL + 0.02, 0, 0);
  ts.add(point);
  const wheel = mesh(new THREE.TorusGeometry(0.16, 0.017, 12, 40), m.darkSteel);
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(2.36, 0, 0);
  ts.add(wheel);
  const hub = mesh(cylX(0.04, 0.14, 20), m.darkSteel);
  hub.position.set(2.3, 0, 0);
  ts.add(hub);
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI * 2 / 3;
    const spoke = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 8), m.darkSteel);
    spoke.position.set(2.36, Math.cos(a) * 0.08, Math.sin(a) * 0.08);
    spoke.rotation.x = a;
    ts.add(spoke);
  }
  const knob = mesh(cylX(0.02, 0.1, 12), m.rubber);
  knob.position.set(2.42, 0.16, 0);
  ts.add(knob);
  const lever = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 10), m.darkSteel);
  lever.position.set(1.98, BED_TOP + 0.95, 0.12);
  lever.rotation.x = -0.7;
  ts.add(lever);
  scene.add(ts);

  // --- banjo + tool rest (slides along the bed with the tool) ----------------
  const rest = new THREE.Group();
  const banjo = mesh(roundedBox(0.3, 0.09, 0.62, 0.03), m.enamel);
  banjo.position.set(0, BED_TOP + 0.045, 0.29);
  rest.add(banjo);
  const post = mesh(new THREE.CylinderGeometry(0.042, 0.042, REST.y - BED_TOP - 0.02, 20), m.steel);
  post.position.set(0, (REST.y + BED_TOP) / 2 - 0.02, REST.z);
  rest.add(post);
  const bar = mesh(cylX(REST.r, REST.half * 2, 24), m.steel);
  bar.position.set(0, REST.y, REST.z);
  rest.add(bar);
  const lockLever = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), m.darkSteel);
  lockLever.position.set(0.1, BED_TOP + 0.06, 0.58);
  lockLever.rotation.z = -1.1;
  rest.add(lockLever);
  scene.add(rest);
  out.rest = rest;

  // --- wall, shelf, lamp -------------------------------------------------------
  const wallTex = wallTextures();
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 9),
    new THREE.MeshStandardMaterial({ map: wallTex.paint, emissiveMap: wallTex.sun, emissive: 0xffd9a6, emissiveIntensity: 0.32, roughness: 0.92 }));
  wall.position.set(0.6, 1.7, -1.75);
  wall.receiveShadow = true;
  scene.add(wall);

  const shelfMat = makeWoodMaterial({ sanded: 1, oiled: 0.6 });
  shelfMat.userData.wood.uEarly.value.setHex(0x9a6a44);
  shelfMat.userData.wood.uLate.value.setHex(0x6a4428);
  shelfMat.userData.wood.uRing.value.set(10, 0.6, 0.05, 0.2);
  shelfMat.userData.wood.uPith.value.set(-0.6, 0.1, 0, 0.03);
  const shelf = mesh(new THREE.BoxGeometry(2.1, 0.07, 0.34), shelfMat);
  shelf.position.set(2.6, 1.02, -1.56);
  scene.add(shelf);
  const pieces = [
    { x: 1.85, prof: [[0, 0.0], [0.12, 0.0], [0.14, 0.03], [0.16, 0.12], [0.12, 0.3], [0.06, 0.42], [0.075, 0.5], [0, 0.5]], wood: [0x7a5236, 0x4b2e1c, 14] },
    { x: 2.45, prof: [[0, 0.0], [0.08, 0.0], [0.2, 0.08], [0.24, 0.16], [0.235, 0.17], [0.19, 0.1], [0, 0.07]], wood: [0xe9d5ad, 0xcfb487, 26] },
    { x: 3.1, prof: [[0, 0], [0.09, 0], [0.09, 0.03], [0.04, 0.06], [0.03, 0.3], [0.06, 0.36], [0.05, 0.4], [0.02, 0.44], [0, 0.44]], wood: [0xd6a070, 0x9b5a33, 20] },
  ];
  for (const p of pieces) {
    const pts = p.prof.map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 40);
    g.rotateZ(-Math.PI / 2);                  // grain axis along X for the wood shader
    const wm = makeWoodMaterial({ sanded: 1, oiled: 1, side: THREE.DoubleSide });
    wm.userData.wood.uEarly.value.setHex(p.wood[0]);
    wm.userData.wood.uLate.value.setHex(p.wood[1]);
    wm.userData.wood.uRing.value.set(p.wood[2], 0.7, 0.06, 0.15);
    wm.userData.wood.uPith.value.set(0.3, -0.5, 0.05, 0.1);
    const piece = mesh(g, wm);
    piece.rotation.z = Math.PI / 2;           // stand it up
    piece.position.set(p.x, 1.055, -1.54);
    scene.add(piece);
  }

  const lamp = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 3, 6), m.rubber);
  cord.position.y = 1.5;
  lamp.add(cord);
  const shadePts = [];
  for (let k = 14; k >= 0; k--) { const t = k / 14; shadePts.push(new THREE.Vector2(0.05 + Math.sin(t * Math.PI / 2) * 0.28, 0.2 - (1 - Math.cos(t * Math.PI / 2)) * 0.22)); }  // rim up to the top, so faces point out
  const shadeOuter = new THREE.Mesh(new THREE.LatheGeometry(shadePts, 40), new THREE.MeshPhysicalMaterial({ color: 0x2c4a3e, roughness: 0.4, clearcoat: 0.6, side: THREE.FrontSide }));
  lamp.add(shadeOuter);
  const shadeInner = new THREE.Mesh(new THREE.LatheGeometry(shadePts, 40), new THREE.MeshStandardMaterial({ color: 0xf4efe6, emissive: 0xffe2b0, emissiveIntensity: 0.5, side: THREE.BackSide }));
  shadeInner.scale.setScalar(0.985);
  lamp.add(shadeInner);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.86, 0.62).multiplyScalar(3) }));
  bulb.position.y = 0.02;
  lamp.add(bulb);
  lamp.position.set(-0.35, 1.72, 0.25);
  scene.add(lamp);
  out.lamp = lamp;

  return out;
}

// ---------------------------------------------------------------------------
// Lights + reflections.
export function buildLighting(scene, renderer) {
  // A small warm room rendered once into a PMREM: a big window on the left (with
  // mullions, so glossy wood shows a real reflection), a lamp overhead, warm
  // plaster walls and a dark floor.
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshBasicMaterial({ color: 0x2c231b, side: THREE.BackSide }));
  env.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0x140e09 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -4.9;
  env.add(floor);
  const glow = (w, h, rgb, pos, rotY = 0) => {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), side: THREE.DoubleSide }));
    q.position.set(...pos); q.rotation.y = rotY;
    env.add(q);
    return q;
  };
  // window: four panes
  for (const [dy, dz] of [[0.9, -1.1], [0.9, 1.1], [-1.3, -1.1], [-1.3, 1.1]]) glow(2.0, 2.0, [9, 8, 6.6], [-9.9, 1.2 + dy, 1 + dz], Math.PI / 2);
  glow(2.4, 0.6, [4.0, 3.0, 2.0], [0, 4.9, 0]).rotation.x = Math.PI / 2;     // lamp overhead
  glow(6, 2.5, [0.9, 0.72, 0.52], [3, 1, -9.9]);                             // sunlit back wall
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.035).texture;
  pm.dispose();

  const hemi = new THREE.HemisphereLight(0xfff1dd, 0x3a2a1c, 0.9);
  scene.add(hemi);

  // afternoon sun through the window (left, high, a little in front)
  const sun = new THREE.DirectionalLight(0xffe2bd, 3.1);
  sun.position.set(-4.2, 5.2, 3.6);
  sun.target.position.set(0.2, -0.6, -0.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.near = 2; sc.far = 14; sc.left = -3.4; sc.right = 3.4; sc.top = 2.6; sc.bottom = -2.6;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  // the pendant lamp: warm pool of light on the work
  const lampLight = new THREE.PointLight(0xffc98a, 4.5, 6, 1.6);
  lampLight.position.set(-0.35, 1.62, 0.25);
  scene.add(lampLight);

  // cool rim from behind-right so the turned profile always reads against the wall
  const rim = new THREE.DirectionalLight(0xcfe0ff, 1.1);
  rim.position.set(3.5, 2.2, -4);
  scene.add(rim);

  return { sun, lampLight, rim, hemi };
}

// ---------------------------------------------------------------------------
// Hand tools. Each model has its cutting tip at the origin and its handle
// running along +Z (toward the turner).
export function buildTools() {
  const steel = MAT.steel(), dark = MAT.darkSteel(), brass = MAT.brass();
  steel.roughness = 0.22;
  const handleWood = makeWoodMaterial({ sanded: 1, oiled: 1 });
  handleWood.userData.wood.uEarly.value.setHex(0xe7d1a8);
  handleWood.userData.wood.uLate.value.setHex(0xb88f5a);
  handleWood.userData.wood.uRing.value.set(22, 0.8, 0.05, 0.12);
  handleWood.userData.wood.uPith.value.set(0.4, -0.5, 0.02, 0.04);

  const handleGeo = (() => {
    const prof = [[0.0, 0], [0.024, 0], [0.03, 0.03], [0.034, 0.18], [0.038, 0.36], [0.036, 0.5], [0.028, 0.56], [0, 0.565]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    g.rotateZ(-Math.PI / 2);   // grain along the geometry's X; the mesh turns it to +Z
    return g;
  })();
  const withHandle = (blade, bladeLen) => {
    const g = new THREE.Group();
    g.add(blade);
    const ferrule = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 20).rotateX(Math.PI / 2), brass);
    ferrule.position.z = bladeLen + 0.02;
    g.add(ferrule);
    const handle = mesh(handleGeo, handleWood);
    handle.rotation.y = -Math.PI / 2;
    handle.position.z = bladeLen + 0.04;
    g.add(handle);
    return g;
  };
  const bar = (w, h, len, mat = steel) => { const b = mesh(new THREE.BoxGeometry(w, h, len), mat); b.position.z = len / 2; return b; };

  const T = {};
  T.chisel = withHandle(bar(0.07, 0.016, 0.42), 0.42);
  T.scraper = withHandle(bar(0.11, 0.02, 0.42), 0.42);
  T.parting = withHandle(bar(0.014, 0.055, 0.4), 0.4);
  {
    const flute = mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.42, 24, 1, true, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2), steel);
    flute.material = steel.clone(); flute.material.side = THREE.DoubleSide;
    flute.position.z = 0.21;
    T.roughing = withHandle(flute, 0.42);
  }
  {
    const g = new THREE.Group();
    const shaft = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 20).rotateX(Math.PI / 2), steel);
    shaft.position.z = 0.22;
    const nose = mesh(new THREE.SphereGeometry(0.022, 16, 10), steel);
    nose.position.z = 0.02;
    g.add(shaft, nose);
    T.gouge = withHandle(g, 0.42);
  }
  {
    const g = new THREE.Group();
    const shaft = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.34, 14).rotateX(Math.PI / 2), steel);
    shaft.position.z = 0.23;
    const tip = mesh(new THREE.ConeGeometry(0.013, 0.06, 14).rotateX(-Math.PI / 2), steel);
    tip.position.z = 0.03;
    g.add(shaft, tip);
    T.detail = withHandle(g, 0.4);
  }
  {
    const g = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.5, 24).rotateX(Math.PI / 2), MAT.rubber());
    body.position.z = 0.34;
    const collet = mesh(new THREE.CylinderGeometry(0.016, 0.03, 0.08, 16).rotateX(Math.PI / 2), steel);
    collet.position.z = 0.06;
    const burr = mesh(new THREE.SphereGeometry(0.018, 12, 10), brass);
    g.add(body, collet, burr);
    T.rotary = g;
  }
  {
    const g = new THREE.Group();
    const cork = mesh(roundedBox(0.16, 0.05, 0.1, 0.015), new THREE.MeshStandardMaterial({ color: 0xb58a5c, roughness: 0.95 }));
    cork.position.set(0, 0.035, 0);
    const paper = mesh(new THREE.BoxGeometry(0.17, 0.012, 0.11), new THREE.MeshStandardMaterial({ color: 0xcdb58a, roughness: 1 }));
    paper.position.set(0, 0.006, 0);
    g.add(cork, paper);
    g.userData.pad = true;
    T.sandblock = g;
  }
  {
    const g = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 28), new THREE.MeshStandardMaterial({ color: 0xcdb58a, roughness: 1 }));
    disc.position.set(0, 0.014, 0);
    const bodyS = mesh(roundedBox(0.16, 0.1, 0.24, 0.04), MAT.enamel());
    bodyS.position.set(0, 0.08, 0.06);
    g.add(disc, bodyS);
    g.userData.pad = true;
    T.autosand = g;
  }
  {
    const g = new THREE.Group();
    // a folded cloth pad, oil-stained where it meets the wood
    const rag = mesh(roundedBox(0.2, 0.05, 0.13, 0.022), new THREE.MeshStandardMaterial({ color: 0xe9dcc4, roughness: 0.95 }));
    rag.position.set(0, 0.03, 0);
    const fold = mesh(roundedBox(0.19, 0.03, 0.07, 0.014), new THREE.MeshStandardMaterial({ color: 0xdccdb2, roughness: 0.95 }));
    fold.position.set(0.004, 0.065, -0.02); fold.rotation.z = 0.05;
    const stain = mesh(roundedBox(0.16, 0.012, 0.1, 0.02), new THREE.MeshStandardMaterial({ color: 0xa8742f, roughness: 0.45 }));
    stain.position.set(0, 0.004, 0);
    g.add(rag, fold, stain);
    g.userData.pad = true;
    T.oil = g;
  }
  for (const k in T) { T[k].visible = false; T[k].traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } }); }
  return T;
}

// ---------------------------------------------------------------------------
function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 150;
  const g = c.getContext('2d');
  g.fillStyle = '#b8914c'; g.fillRect(0, 0, 512, 150);
  g.strokeStyle = '#6b5226'; g.lineWidth = 6; g.strokeRect(10, 10, 492, 130);
  g.fillStyle = '#4a3714';
  g.textAlign = 'center';
  g.font = 'bold 58px Georgia, serif';
  g.fillText('WOODFORM', 256, 82);
  g.font = '26px Georgia, serif';
  g.fillText('No. 2  BENCH LATHE', 256, 120);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Painted tongue-and-groove boards, plus a separate soft patch of window light
// (used as an emissive map so it glows like sun on paint).
function wallTextures() {
  const W = 2048, H = 576;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#9d9d92'; g.fillRect(0, 0, W, H);
  // gentle paint mottling
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = 6 + Math.random() * 30;
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,248,235' : '90,80,65'},${0.018 + Math.random() * 0.025})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // board seams every ~0.3 world units (the wall is 16 wide)
  const boards = Math.round(32 / 0.3);
  for (let k = 0; k <= boards; k++) {
    const x = (k / boards) * W;
    g.fillStyle = 'rgba(60,50,38,0.38)'; g.fillRect(x - 1, 0, 1.6, H);
    g.fillStyle = 'rgba(255,250,240,0.25)'; g.fillRect(x + 0.8, 0, 1, H);
  }
  // darker skirting shadow toward the bottom, lighter up high
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, 'rgba(40,30,20,0.18)');
  grd.addColorStop(0.5, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(40,30,20,0.25)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const paint = new THREE.CanvasTexture(c);
  paint.colorSpace = THREE.SRGBColorSpace;
  paint.anisotropy = 4;

  // sun patch: a skewed window with a cross mullion, drawn small then scaled up
  // (the upscale blurs its edges softly)
  const s = document.createElement('canvas');
  s.width = 128; s.height = 64;
  const sg = s.getContext('2d');
  sg.fillStyle = '#000'; sg.fillRect(0, 0, 128, 64);
  sg.save();
  sg.translate(72, 28); sg.transform(1, 0, -0.35, 1, 0, 0);
  sg.fillStyle = '#fff';
  const pw = 6.5, ph = 9, gap = 0.9;
  for (const [ix, iy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) sg.fillRect(ix * (pw + gap) - pw, iy * (ph + gap) - ph, pw, ph);
  sg.restore();
  const big = document.createElement('canvas');
  big.width = 512; big.height = 256;
  const bg = big.getContext('2d');
  bg.imageSmoothingEnabled = true;
  bg.globalAlpha = 0.5;
  for (const [dx, dy] of [[0, 0], [2, 1], [-2, -1], [1, -2], [-1, 2]]) bg.drawImage(s, dx, dy, 512, 256);
  const sun = new THREE.CanvasTexture(big);
  sun.colorSpace = THREE.SRGBColorSpace;
  return { paint, sun };
}
