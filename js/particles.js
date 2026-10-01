import * as THREE from 'three';

// Wood shavings and sanding dust. Shavings are little curled ribbons (one
// instanced draw for all of them) that fly off the cut, tumble, and settle on
// the lathe bed, where they rest a while before fading. Dust is a soft cloud of
// points that drifts up from sanding and fine cuts.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _s = new THREE.Vector3(), _c = new THREE.Color();

export class Shavings {
  constructor(scene, { count = 240, dust = 260, floorY = -0.66, floorZ = [-0.34, 0.36], benchY = -1.2 } = {}) {
    this.floorY = floorY; this.floorZ = floorZ; this.benchY = benchY;
    const geo = curlGeometry();
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.pool = [];
    for (let i = 0; i < count; i++) {
      this.pool.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(),
        av: new THREE.Vector3(), life: 0, rest: false, size: 0 });
      this.mesh.setColorAt(i, _c.set(0xffffff));
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    }
    scene.add(this.mesh);
    this._next = 0;

    // dust: soft round points, per-point alpha through a 4-component colour
    const dp = new Float32Array(dust * 3), dc = new Float32Array(dust * 4);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3).setUsage(THREE.DynamicDrawUsage));
    dg.setAttribute('color', new THREE.BufferAttribute(dc, 4).setUsage(THREE.DynamicDrawUsage));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({
      size: 0.022, map: softDot(), vertexColors: true, transparent: true, depthWrite: false,
    }));
    this.dust.frustumCulled = false;
    this.dust.renderOrder = 4;
    scene.add(this.dust);
    this.dustPool = [];
    for (let i = 0; i < dust; i++) this.dustPool.push({ vel: new THREE.Vector3(), life: 0, max: 1, a: 0 });
    this._nextDust = 0;
  }

  // a burst of shavings from the contact point; `kind` shapes them
  spawn(pos, color, intensity, kind = 'cut') {
    // ~30-70 shavings a second (spawn is called every cutting frame)
    if (Math.random() > 0.4 + intensity * 0.55) { if (Math.random() < 0.3) this.puff(pos, color, 1); return; }
    const n = intensity > 0.5 && Math.random() < 0.5 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const i = this._next, p = this.pool[i];
      this._next = (this._next + 1) % this.pool.length;
      p.pos.copy(pos);
      p.pos.x += (Math.random() - 0.5) * 0.05;
      const speed = 0.6 + intensity * 1.2;
      // flung off the front of the spinning work toward the turner, then down
      p.vel.set((Math.random() - 0.5) * 0.7, 0.25 + Math.random() * 1.0, 0.4 + Math.random() * 0.8).multiplyScalar(speed);
      p.av.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
      p.rot.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
      p.size = (kind === 'rough' ? 0.06 : 0.036) * (0.6 + Math.random() * 0.8);
      p.life = 8 + Math.random() * 6;
      p.rest = false;
      _c.set(color).offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08);
      this.mesh.setColorAt(i, _c);
    }
    this.mesh.instanceColor.needsUpdate = true;
    if (Math.random() < 0.6) this.puff(pos, color, 1 + (intensity * 2 | 0));
  }

  // fine dust (sanding, and a little from every cut)
  puff(pos, color, n = 3) {
    _c.set(color).offsetHSL(0, -0.05, 0.12);
    const dp = this.dust.geometry.attributes.position.array, dc = this.dust.geometry.attributes.color.array;
    for (let k = 0; k < n; k++) {
      const i = this._nextDust, d = this.dustPool[i];
      this._nextDust = (this._nextDust + 1) % this.dustPool.length;
      dp[i * 3] = pos.x + (Math.random() - 0.5) * 0.08;
      dp[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.04;
      dp[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.04;
      d.vel.set((Math.random() - 0.5) * 0.25, 0.08 + Math.random() * 0.22, 0.05 + Math.random() * 0.2);
      d.max = d.life = 1.4 + Math.random() * 1.6;
      d.a = 0.3 + Math.random() * 0.3;
      dc[i * 4] = _c.r; dc[i * 4 + 1] = _c.g; dc[i * 4 + 2] = _c.b;
    }
  }

  // shavings already lying on the bed (a workshop that's been used)
  scatter(n, color, x0 = -1.2, x1 = 1.2) {
    for (let k = 0; k < n; k++) {
      const i = this._next, p = this.pool[i];
      this._next = (this._next + 1) % this.pool.length;
      p.pos.set(x0 + Math.random() * (x1 - x0), this.floorY + 0.01, this.floorZ[0] + Math.random() * (this.floorZ[1] - this.floorZ[0]));
      p.rot.set(Math.PI / 2 + (Math.random() - 0.5) * 0.8, Math.random() * 6.3, (Math.random() - 0.5) * 0.8);
      p.size = 0.035 + Math.random() * 0.035;
      p.rest = true; p.life = 1e6;
      _c.set(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
      this.mesh.setColorAt(i, _c);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  // sweep the bed clean (new blank)
  clear() {
    for (let i = 0; i < this.pool.length; i++) { this.pool[i].life = 0; this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); }
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const d of this.dustPool) d.life = 0;
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.life <= 0) continue;
      any = true;
      p.life -= dt;
      if (!p.rest) {
        p.vel.y -= 4.2 * dt;
        p.vel.multiplyScalar(1 - 1.6 * dt);
        p.pos.addScaledVector(p.vel, dt);
        p.rot.x += p.av.x * dt; p.rot.y += p.av.y * dt; p.rot.z += p.av.z * dt;
        // land on the bed ways, or on the bench if they miss the bed
        const onBed = p.pos.z > this.floorZ[0] && p.pos.z < this.floorZ[1];
        const floor = onBed ? this.floorY : this.benchY;
        if (p.pos.y < floor && p.vel.y < 0) {
          p.pos.y = floor + p.size * 0.25;
          p.rest = true;
          p.rot.x = Math.PI / 2 + (Math.random() - 0.5) * 0.6; p.rot.z = (Math.random() - 0.5) * 0.6;
        }
      }
      const fade = Math.min(1, p.life / 1.2);          // shrink away at the end
      _s.setScalar(p.size * fade);
      _q.setFromEuler(_e.copy(p.rot));
      this.mesh.setMatrixAt(i, p.life > 0 ? _m.compose(p.pos, _q, _s) : _m.makeScale(0, 0, 0));
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;

    const dp = this.dust.geometry.attributes.position.array, dc = this.dust.geometry.attributes.color.array;
    let dAny = false;
    for (let i = 0; i < this.dustPool.length; i++) {
      const d = this.dustPool[i];
      if (d.life <= 0) { if (dc[i * 4 + 3] !== 0) { dc[i * 4 + 3] = 0; dAny = true; } continue; }
      dAny = true;
      d.life -= dt;
      d.vel.multiplyScalar(1 - 0.8 * dt);
      d.vel.y += 0.02 * dt;
      dp[i * 3] += d.vel.x * dt; dp[i * 3 + 1] += d.vel.y * dt; dp[i * 3 + 2] += d.vel.z * dt;
      const t = d.life / d.max;
      dc[i * 4 + 3] = Math.max(0, d.a * Math.min(1, t * 2) * Math.min(1, (1 - t) * 6));
    }
    if (dAny) {
      this.dust.geometry.attributes.position.needsUpdate = true;
      this.dust.geometry.attributes.color.needsUpdate = true;
    }
  }
}

// A thin ribbon rolled into a loose spiral: one shaving, unit size.
function curlGeometry() {
  const g = new THREE.PlaneGeometry(1, 0.34, 14, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, v = p.getY(i);
    const a = u * Math.PI * 1.7, r = 0.42 * (1 - 0.45 * u);
    p.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, v + u * 0.12);
  }
  g.computeVertexNormals();
  return g;
}

function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
