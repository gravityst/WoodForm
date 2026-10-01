import * as THREE from 'three';
import { CONFIG } from './config.js?v=11';

// The log is a surface of revolution about the X axis: a radius value at each of
// SAMPLES positions along the length. Carving lowers radii toward a target depth;
// because a real lathe spins, removal is axisymmetric and we only track radius.
export class Log {
  constructor() {
    const S = CONFIG.SAMPLES, RS = CONFIG.RADIAL_SEGMENTS;
    this.S = S; this.RS = RS;
    this.L = CONFIG.LENGTH;
    this.R0 = CONFIG.R0;
    this.dx = this.L / (S - 1);

    this.radius = new Float32Array(S).fill(this.R0);
    this.target = new Float32Array(S).fill(this.R0);
    this.sanded = new Float32Array(S);   // 0..1 finish coverage per sample
    this.oiled = new Float32Array(S);    // 0..1 oil coat per sample (purely visual)
    this.hasTarget = false;
    this.removedVolume = 0;
    this.assistNoOvercut = false; // beginner guard: floor clamps to target
    this.showGuide = false;       // draw the trace guide on the blank
    this.guideTop = null;         // yellow target-outline lines
    this.guideBot = null;

    // precompute ring angle trig
    this.cos = new Float32Array(RS + 1);
    this.sin = new Float32Array(RS + 1);
    for (let j = 0; j <= RS; j++) {
      const a = (j / RS) * Math.PI * 2;
      this.cos[j] = Math.cos(a);
      this.sin[j] = Math.sin(a);
    }

    this._buildGeometry();
    this._dirtyLo = 0; this._dirtyHi = S - 1;
    this.updateGeometry();
  }

  axialX(i) { return -this.L / 2 + i * this.dx; }
  // nearest sample index for a world-x position
  indexAt(x) {
    const i = Math.round((x + this.L / 2) / this.dx);
    return Math.min(this.S - 1, Math.max(0, i));
  }

  _buildGeometry() {
    const S = this.S, RS = this.RS;
    const ringVerts = S * (RS + 1);
    const totalVerts = ringVerts + 2; // + two cap centres
    this.leftCenter = ringVerts;
    this.rightCenter = ringVerts + 1;

    this.positions = new Float32Array(totalVerts * 3);
    this.normals = new Float32Array(totalVerts * 3);
    this.finish = new Float32Array(totalVerts * 2); // (sanded, oiled) per vertex -> wood shader
    const uvs = new Float32Array(totalVerts * 2);
    for (let i = 0; i < S; i++) {
      for (let j = 0; j <= RS; j++) {
        const vi = i * (RS + 1) + j;
        uvs[vi * 2] = j / RS;          // around the axis
        uvs[vi * 2 + 1] = i / (S - 1); // along the length (grain runs this way)
      }
    }
    this._uvs = uvs;
    const indices = [];
    // side
    for (let i = 0; i < S - 1; i++) {
      for (let j = 0; j < RS; j++) {
        const a = i * (RS + 1) + j;
        const b = (i + 1) * (RS + 1) + j;
        const c = (i + 1) * (RS + 1) + (j + 1);
        const d = i * (RS + 1) + (j + 1);
        // counter-clockwise seen from outside, so the outer surface is the front
        // face (it used to be wound inward: the near side was culled and the
        // inside of the far wall showed through as hollow ends and hoops)
        indices.push(a, d, b, b, d, c);
      }
    }
    const sideCount = indices.length;
    // left cap (faces -X)
    for (let j = 0; j < RS; j++) {
      indices.push(this.leftCenter, j + 1, j);
    }
    // right cap (faces +X)
    const base = (S - 1) * (RS + 1);
    for (let j = 0; j < RS; j++) {
      indices.push(this.rightCenter, base + j, base + j + 1);
    }
    const capCount = indices.length - sideCount;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(this._uvs, 2));
    geo.setAttribute('finish', new THREE.BufferAttribute(this.finish, 2));
    geo.setIndex(indices);
    // The log only ever gets thinner, so the blank's bounds stay valid for good:
    // no per-frame computeBoundingSphere over every vertex.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(this.L / 2, this.R0) + 0.01);
    geo.addGroup(0, sideCount, 0);          // material 0 = bark/side
    geo.addGroup(sideCount, capCount, 1);   // material 1 = end grain
    this.geometry = geo;

    // cap centres are fixed in X
    this.positions[this.leftCenter * 3] = -this.L / 2;
    this.positions[this.rightCenter * 3] = this.L / 2;
    this.normals[this.leftCenter * 3] = -1;
    this.normals[this.rightCenter * 3] = 1;
  }

  setMaterials(sideMat, capMat) {
    if (!this.mesh) {
      this.mesh = new THREE.Mesh(this.geometry, [sideMat, capMat]);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    } else {
      this.mesh.material = [sideMat, capMat];
    }
    return this.mesh;
  }

  markDirty(lo, hi) {
    this._dirtyLo = Math.min(this._dirtyLo, lo);
    this._dirtyHi = Math.max(this._dirtyHi, hi);
  }

  // Recompute vertex positions+normals for the dirty range (and one ring of
  // neighbours, whose normals depend on slope).
  updateGeometry() {
    if (this._dirtyHi < this._dirtyLo) return; // nothing changed
    this.version = (this.version || 0) + 1;    // lets the HUD redraw only on change
    const S = this.S, RS = this.RS, r = this.radius;
    let lo = Math.max(0, this._dirtyLo - 1);
    let hi = Math.min(S - 1, this._dirtyHi + 1);
    const pos = this.positions, nor = this.normals, fin = this.finish;

    for (let i = lo; i <= hi; i++) {
      const x = this.axialX(i);
      const ri = r[i];
      // slope dr/dx via central difference
      const rp = r[Math.min(S - 1, i + 1)];
      const rm = r[Math.max(0, i - 1)];
      const slope = (rp - rm) / (2 * this.dx);
      const nx = -slope;
      const inv = 1 / Math.hypot(nx, 1);
      for (let j = 0; j <= RS; j++) {
        const idx = (i * (RS + 1) + j) * 3;
        const cj = this.cos[j], sj = this.sin[j];
        pos[idx] = x;
        pos[idx + 1] = ri * cj;
        pos[idx + 2] = ri * sj;
        // outward normal ∝ (-r'(x), cosθ, sinθ)
        nor[idx] = nx * inv;
        nor[idx + 1] = cj * inv;
        nor[idx + 2] = sj * inv;
        const f = (i * (RS + 1) + j) * 2;
        fin[f] = this.sanded[i];
        fin[f + 1] = this.oiled[i];
      }
    }
    // the end caps take the finish of the end rings
    fin[this.leftCenter * 2] = this.sanded[0]; fin[this.leftCenter * 2 + 1] = this.oiled[0];
    fin[this.rightCenter * 2] = this.sanded[S - 1]; fin[this.rightCenter * 2 + 1] = this.oiled[S - 1];
    const a = this.geometry.attributes;
    const v0 = lo * (RS + 1), vn = (hi - lo + 1) * (RS + 1);
    uploadRange(a.position, [v0 * 3, vn * 3]);
    uploadRange(a.normal, [v0 * 3, vn * 3]);
    uploadRange(a.finish, [v0 * 2, vn * 2], [this.leftCenter * 2, 4]); // + the two cap centres
    this._dirtyLo = S; this._dirtyHi = -1;
  }

  applyOrder(order) {
    const S = this.S;
    for (let i = 0; i < S; i++) {
      this.radius[i] = this.R0;
      this.sanded[i] = 0;
      this.oiled[i] = 0;
      const t = i / (S - 1);
      this.target[i] = Math.min(this.R0 * 0.92,
        Math.max(CONFIG.MIN_R, order.profile(t) * this.R0));
    }
    this.hasTarget = true;
    this.removedVolume = 0;
    this.markDirty(0, S - 1);
    this.updateGeometry();
    this.updateGuide();
  }

  freeBlank() {
    for (let i = 0; i < this.S; i++) {
      this.radius[i] = this.R0; this.sanded[i] = 0; this.oiled[i] = 0; this.target[i] = this.R0;
    }
    this.hasTarget = false;
    this.removedVolume = 0;
    this.markDirty(0, this.S - 1);
    this.updateGeometry();
    this.updateGuide();
  }

  // Cut material. `depth` is the target radius the tool tip is at. Returns the
  // amount of radius actually removed this step (0 = no contact) for FX/audio.
  //
  // A point can only be cut `maxStep` below the wood still supporting it (its
  // taller neighbour, sampled from BEFORE this frame's cuts). That makes a deep
  // shape take several peeling passes and makes it impossible to slice a thin
  // line straight through the log — you must work the surrounding wood down too.
  carve(x, depth, tool, wood, dt) {
    const S = this.S, r = this.radius;
    const hw = tool.halfWidth;
    const i0 = this.indexAt(x);
    const span = Math.ceil(hw / this.dx);
    const rate = CONFIG.BASE_REMOVAL * tool.power * wood.carveSpeed * dt / wood.hardness;
    const maxStep = tool.maxStep || 0.06;
    const lo0 = Math.max(0, i0 - span - 1);
    const hi0 = Math.min(S - 1, i0 + span + 1);
    const snap = r.slice(lo0, hi0 + 1); // surface before this frame -> support
    let removed = 0, lo = i0, hi = i0;
    for (let i = Math.max(0, i0 - span); i <= Math.min(S - 1, i0 + span); i++) {
      const d = Math.abs(this.axialX(i) - x);
      if (d > hw) continue;
      const li = i - lo0;
      const support = Math.max(snap[Math.max(0, li - 1)], snap[Math.min(snap.length - 1, li + 1)]);
      let floor = Math.max(CONFIG.MIN_R, depth + tool.shapeOffset(d, hw) * this.R0);
      floor = Math.max(floor, support - maxStep);          // depth-of-cut limit
      if (this.assistNoOvercut) floor = Math.max(floor, this.target[i]); // beginner guard
      if (r[i] <= floor + CONFIG.CONTACT_TOL) continue;
      const before = r[i];
      const edge = 1 - (d / hw) * 0.35; // softer at the footprint edge
      r[i] = Math.max(floor, r[i] - rate * edge);
      removed += before - r[i];
      this.sanded[i] *= 0.4; // a fresh cut roughens the surface again
      if (i < lo) lo = i; if (i > hi) hi = i;
    }
    // A one-sample-thick fin left standing at either end of the blank can't
    // exist in real wood (it snaps off); it used to show as a floating hoop.
    if (lo <= 1 && r[0] > r[1] + 0.02) { r[0] = r[1] + 0.02; this.sanded[0] = 0; lo = 0; }
    if (hi >= S - 2 && r[S - 1] > r[S - 2] + 0.02) { r[S - 1] = r[S - 2] + 0.02; this.sanded[S - 1] = 0; hi = S - 1; }
    if (removed > 0) { this.removedVolume += removed; this.markDirty(lo, hi); }
    return removed;
  }

  // Sand: pull each sample toward its neighbours' average and raise finish.
  sand(x, tool, wood, dt) {
    const S = this.S, r = this.radius;
    const hw = tool.halfWidth;
    const i0 = this.indexAt(x);
    const span = Math.ceil(hw / this.dx);
    const k = Math.min(0.9, tool.smoothing * dt);
    let work = 0, lo = i0, hi = i0;
    const src = r.slice(Math.max(0, i0 - span - 1), Math.min(S, i0 + span + 2));
    const off = Math.max(0, i0 - span - 1);
    for (let i = Math.max(1, i0 - span); i <= Math.min(S - 2, i0 + span); i++) {
      const d = Math.abs(this.axialX(i) - x);
      if (d > hw) continue;
      const a = src[i - 1 - off], b = src[i + 1 - off];
      const avg = (a + b + src[i - off]) / 3;
      r[i] += (avg - r[i]) * k;
      this.sanded[i] = Math.min(1, this.sanded[i] + tool.grit * dt * 1.6);
      work += k;
      if (i < lo) lo = i; if (i > hi) hi = i;
    }
    if (work > 0) this.markDirty(lo, hi);
    return work;
  }

  // Wipe on finishing oil: deepens the colour and builds a gloss coat. Purely
  // cosmetic (scoring is unchanged). Returns how much oil went on, for FX/audio.
  oil(x, tool, dt) {
    const S = this.S, hw = tool.halfWidth;
    const i0 = this.indexAt(x), span = Math.ceil(hw / this.dx);
    let work = 0, lo = S, hi = -1;
    for (let i = Math.max(0, i0 - span); i <= Math.min(S - 1, i0 + span); i++) {
      const d = Math.abs(this.axialX(i) - x);
      if (d > hw) continue;
      const before = this.oiled[i];
      this.oiled[i] = Math.min(1, before + dt * 2.6 * (1 - (d / hw) * 0.5));
      work += this.oiled[i] - before;
      if (i < lo) lo = i; if (i > hi) hi = i;
    }
    if (hi >= lo) this.markDirty(lo, hi);
    return work;
  }

  oilCoverage() {
    let s = 0;
    for (let i = 0; i < this.S; i++) s += this.oiled[i];
    return s / this.S;
  }

  // Where does a world-space ray first meet the wood? The log is a surface of
  // revolution about the world X axis (its spin doesn't change the shape), so
  // march the ray through the blank's bounding cylinder instead of testing
  // ~28k triangles every frame. Returns the hit point or null.
  hitTest(ray, out = new THREE.Vector3()) {
    const O = ray.origin, D = ray.direction, R0 = this.R0, hl = this.L / 2;
    const a = D.y * D.y + D.z * D.z;
    if (a < 1e-9) return null;
    const b = 2 * (O.y * D.y + O.z * D.z), c = O.y * O.y + O.z * O.z - R0 * R0;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    let t0 = Math.max(0, (-b - sq) / (2 * a)), t1 = (-b + sq) / (2 * a);
    if (t1 <= t0) return null;
    const inside = (t) => {
      const x = O.x + t * D.x;
      if (x < -hl || x > hl) return false;
      const y = O.y + t * D.y, z = O.z + t * D.z;
      return y * y + z * z <= this.radiusAt(x) ** 2;
    };
    const N = 160, step = (t1 - t0) / N;
    let prev = t0;
    for (let k = 0; k <= N; k++) {
      const t = t0 + k * step;
      if (inside(t)) {
        let lo = prev, hi = t;               // refine the entry point
        for (let n = 0; n < 8; n++) { const m = (lo + hi) / 2; if (inside(m)) hi = m; else lo = m; }
        return out.copy(D).multiplyScalar(hi).add(O);
      }
      prev = t;
    }
    return null;
  }

  // linearly interpolated radius at a world x
  radiusAt(x) {
    const f = (x + this.L / 2) / this.dx;
    const i = Math.max(0, Math.min(this.S - 2, Math.floor(f)));
    const u = Math.max(0, Math.min(1, f - i));
    return this.radius[i] * (1 - u) + this.radius[i + 1] * u;
  }

  // average finish coverage 0..1 over samples that carry the object
  finishCoverage() {
    let s = 0, n = 0;
    for (let i = 0; i < this.S; i++) {
      if (this.target[i] > CONFIG.MIN_R * 1.5) { s += this.sanded[i]; n++; }
    }
    return n ? s / n : 0;
  }

  // ---- trace guide: a thin yellow outline of the target silhouette ---------
  // Two lines (top + mirrored bottom) following the target radius along the
  // length, drawn over the log (depthTest off) so you can trace the shape
  // without hiding the wood or your actual cut. NOT parented to the spinning
  // mesh — it stays a fixed front-facing silhouette.
  ensureGuide(material) {
    if (this.guideTop) return;
    // a thin ribbon (constant width) rather than a 1px GL line, so it reads on
    // high-density screens
    const mk = (sign) => {
      const S = this.S;
      const pos = new Float32Array(S * 2 * 3);
      const idx = [];
      for (let i = 0; i < S - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(idx);
      const line = new THREE.Mesh(g, material);
      line.frustumCulled = false;
      line.renderOrder = 6;
      line.visible = false;
      line._sign = sign; line._pos = pos;
      return line;
    };
    this.guideTop = mk(1);
    this.guideBot = mk(-1);
    this.updateGuide();
  }

  updateGuide() {
    for (const line of [this.guideTop, this.guideBot]) {
      if (!line) continue;
      const pos = line._pos, S = this.S, w = 0.0045;
      for (let i = 0; i < S; i++) {
        const x = this.axialX(i), y = line._sign * this.target[i];
        const ya = line._sign * this.target[Math.max(0, i - 1)], yb = line._sign * this.target[Math.min(S - 1, i + 1)];
        let tx = 2 * this.dx, ty = yb - ya;
        const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
        const k = i * 6;
        pos[k] = x - ty * w; pos[k + 1] = y + tx * w; pos[k + 2] = 0;
        pos[k + 3] = x + ty * w; pos[k + 4] = y - tx * w; pos[k + 5] = 0;
      }
      line.geometry.attributes.position.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    }
  }

  setGuideVisible(v) {
    this.showGuide = v;
    if (this.guideTop) this.guideTop.visible = v;
    if (this.guideBot) this.guideBot.visible = v;
  }
}

// Upload only the part of a buffer that changed (three r159+ API, with the older
// updateRange as a fallback).
function uploadRange(attr, ...ranges) {
  if (attr.addUpdateRange) {
    attr.clearUpdateRanges();
    for (const [start, count] of ranges) attr.addUpdateRange(start, count);
  } else if (attr.updateRange && ranges.length === 1) {
    attr.updateRange.offset = ranges[0][0]; attr.updateRange.count = ranges[0][1];
  }
  attr.needsUpdate = true;
}
