import * as THREE from 'three';
import { CONFIG } from './config.js?v=8';

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
        indices.push(a, b, d, b, c, d);
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
    geo.setIndex(indices);
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
    const S = this.S, RS = this.RS, r = this.radius;
    let lo = Math.max(0, this._dirtyLo - 1);
    let hi = Math.min(S - 1, this._dirtyHi + 1);
    const pos = this.positions, nor = this.normals;

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
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.computeBoundingSphere();
    this._dirtyLo = S; this._dirtyHi = -1;
  }

  applyOrder(order) {
    const S = this.S;
    for (let i = 0; i < S; i++) {
      this.radius[i] = this.R0;
      this.sanded[i] = 0;
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
      this.radius[i] = this.R0; this.sanded[i] = 0; this.target[i] = this.R0;
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
    const mk = (sign) => {
      const pos = new Float32Array(this.S * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const line = new THREE.Line(g, material);
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
      const pos = line._pos;
      for (let i = 0; i < this.S; i++) {
        pos[i * 3] = this.axialX(i);
        pos[i * 3 + 1] = line._sign * this.target[i];
        pos[i * 3 + 2] = 0;
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
