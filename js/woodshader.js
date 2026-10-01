import * as THREE from 'three';

// Procedural solid wood. The grain is a 3D function of the object-space point
// (x = along the fibres), so it follows whatever shape the log is turned into:
// growth rings wrap around a pith line that sits off the blank's axis with a
// little run-out, which gives the long flames and cathedrals of a real spindle,
// and any face cut across the fibres shows its rings. Species set the colours
// and figure; per-vertex `finish` (sanded, oiled) takes the surface from fuzzy
// fresh-cut, to satin once sanded, to a deep glossy oil finish.

const GLSL_COMMON = /* glsl */`
uniform vec3 uEarly;
uniform vec3 uLate;
uniform vec3 uSap;
uniform vec4 uPith;     // xy: pith (y,z) at x=0, zw: run-out per unit x
uniform vec4 uRing;     // rings per unit, ring contrast, ring waviness, fibre streaks
uniform vec4 uFig;      // spalt lines, sapwood distance, pores, seed
uniform vec2 uFinish;   // (sanded, oiled) when there is no per-vertex finish
uniform float uPlank;   // board width for plank seams (0 = one solid piece)
uniform float uMarks;   // strength of fresh tool marks
varying vec3 vWfPos;
varying vec3 vWfNrm;
#ifdef WF_FINISH_ATTR
varying vec2 vWfFin;
#endif

float wf_hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float wf_noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wf_hash(i), wf_hash(i + vec3(1, 0, 0)), f.x),
                 mix(wf_hash(i + vec3(0, 1, 0)), wf_hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(wf_hash(i + vec3(0, 0, 1)), wf_hash(i + vec3(1, 0, 1)), f.x),
                 mix(wf_hash(i + vec3(0, 1, 1)), wf_hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

vec3 wfWood(vec3 p, out float h) {
  vec3 q = p + uFig.w * vec3(7.13, 3.71, 5.27);
  vec2 pith = uPith.xy + uPith.zw * p.x;
  if (uPlank > 0.0) {
    // each board is its own flat-sawn piece: pith below the board, near its middle
    float pid = floor(p.z / uPlank + 0.5);
    pith = vec2(uPith.x, pid * uPlank + (fract(sin(pid * 12.9898) * 43758.5453) - 0.5) * uPlank * 0.7)
         + uPith.zw * p.x;
    q += pid * 13.7;
  }
  vec2 d2 = p.yz - pith;
  float warp = (wf_noise(q * vec3(0.8, 3.2, 3.2)) - 0.5) * uRing.z
             + (wf_noise(q * vec3(2.6, 12.0, 12.0)) - 0.5) * uRing.z * 0.3;
  float d = length(d2) + warp;
  float rc = d * uRing.x;
  float f = fract(rc);
  float aa = clamp(fwidth(rc) * 1.5, 0.0, 1.0);
  // earlywood ramps into latewood, then drops back sharply at the ring boundary
  float late = smoothstep(0.35, 0.88, f) * (1.0 - smoothstep(0.9, 0.995, f));
  late = mix(late, 0.32, aa);
  // long fibres running along x
  float streak = wf_noise(q * vec3(1.3, 42.0, 42.0));
  streak = mix(streak, 0.5, clamp((fwidth(p.y) + fwidth(p.z)) * 42.0, 0.0, 1.0) * 0.8);
  vec3 col = mix(uEarly, uLate, late * uRing.y);
  col *= 1.0 + (streak - 0.5) * uRing.w * 2.0;
  col *= 0.88 + 0.24 * wf_noise(q * vec3(0.45, 1.5, 1.5));
  if (uFig.y > 0.0) col = mix(col, uSap, smoothstep(uFig.y, uFig.y + 0.1, d) * 0.85);
  if (uFig.z > 0.0) {
    // ring-porous woods: dark pores in the earlywood
    float pn = wf_noise(q * vec3(9.0, 150.0, 150.0));
    float paa = clamp((fwidth(p.y) + fwidth(p.z)) * 100.0, 0.0, 1.0);
    col *= 1.0 - smoothstep(0.62, 0.8, pn) * (1.0 - late) * (1.0 - paa) * 0.35 * uFig.z;
  }
  if (uFig.x > 0.0) {
    // spalting: black zone lines and grey blotches
    float z1 = wf_noise(q * vec3(1.4, 2.4, 2.4)) - 0.5;
    float z2 = wf_noise(q * vec3(2.1, 3.6, 3.6) + 17.0) - 0.5;
    float w1 = fwidth(z1) * 1.5 + 0.008, w2 = fwidth(z2) * 1.5 + 0.006;
    float line = (1.0 - smoothstep(0.0, w1, abs(z1))) + (1.0 - smoothstep(0.0, w2, abs(z2))) * 0.7;
    float blot = smoothstep(0.5, 0.8, wf_noise(q * vec3(0.9, 2.0, 2.0) + 5.0));
    col = mix(col, col * vec3(0.72, 0.74, 0.76), blot * 0.7 * uFig.x);
    col = mix(col, vec3(0.02, 0.018, 0.015), clamp(line, 0.0, 1.0) * uFig.x);
  }
  if (uPlank > 0.0) {
    float sd = abs(fract(p.z / uPlank + 0.5) - 0.5) * uPlank;
    col *= mix(0.4, 1.0, smoothstep(0.0, 0.003 + fwidth(p.z) * 1.5, sd));
  }
  // fresh tool marks: fine ridges around the circumference
  float tf = p.x * 620.0;
  float marks = sin(tf + wf_noise(q * vec3(3.0, 20.0, 20.0)) * 4.0) * (1.0 - clamp(fwidth(tf) * 0.5, 0.0, 1.0));
  h = (late * 0.5 + streak * 0.5) * 0.0003 + marks * 0.00022 * uMarks;
  return col;
}

vec3 wfBump(vec3 pos, vec3 n, float h) {
  vec3 dpx = dFdx(pos), dpy = dFdy(pos);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - grad);
}
`;

export function makeWoodMaterial(opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.7, metalness: 0,
    clearcoat: opts.clearcoat ?? 1, clearcoatRoughness: 0.1,
    side: opts.side ?? THREE.FrontSide,
  });
  const u = {
    uEarly: { value: new THREE.Color(0xe0c49a) },
    uLate: { value: new THREE.Color(0xa87a4a) },
    uSap: { value: new THREE.Color(0xe0c49a) },
    uPith: { value: new THREE.Vector4(0.2, -0.78, 0.04, 0.08) },
    uRing: { value: new THREE.Vector4(18, 0.8, 0.06, 0.14) },
    uFig: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFinish: { value: new THREE.Vector2(opts.sanded ?? 1, opts.oiled ?? 1) },
    uPlank: { value: opts.plank ?? 0 },
    uMarks: { value: opts.marks ?? 0 },
  };
  mat.userData.wood = u;
  const perVertex = !!opts.finishAttr;
  if (perVertex) mat.defines = { WF_FINISH_ATTR: '' };
  mat.customProgramCacheKey = () => 'wf-wood' + (perVertex ? '-fin' : '');
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vWfPos;
varying vec3 vWfNrm;
#ifdef WF_FINISH_ATTR
attribute vec2 finish;
varying vec2 vWfFin;
#endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vWfPos = position;
vWfNrm = normal;
#ifdef WF_FINISH_ATTR
vWfFin = finish;
#endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
      .replace('#include <color_fragment>', `#include <color_fragment>
#ifdef WF_FINISH_ATTR
vec2 wfFin = clamp(vWfFin, 0.0, 1.0);
#else
vec2 wfFin = uFinish;
#endif
float wfH;
vec3 wfCol = wfWood(vWfPos, wfH);
// fresh-cut fibres are paler and a little grey until sanded or oiled
float wfLum = dot(wfCol, vec3(0.2126, 0.7152, 0.0722));
wfCol = mix(mix(wfCol, vec3(wfLum), 0.08) * 1.06 + 0.008, wfCol, clamp(wfFin.x + wfFin.y, 0.0, 1.0));
// end grain (faces across the fibres) drinks the finish and reads darker
float wfEnd = abs(normalize(vWfNrm).x);
wfCol *= 1.0 - wfEnd * (0.12 + 0.2 * wfFin.y);
// oil deepens the colour and lifts its saturation (the "wet" look)
float wfL2 = dot(wfCol, vec3(0.2126, 0.7152, 0.0722));
wfCol = mix(wfCol, max(mix(vec3(wfL2), wfCol, 1.3), 0.0) * 0.86, wfFin.y);
diffuseColor.rgb *= wfCol;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(mix(0.82, 0.6, wfFin.x), 0.42, wfFin.y);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = wfBump(-vViewPosition, normal, wfH * (1.0 - 0.75 * wfFin.x) * (1.0 - 0.7 * wfFin.y));`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
material.clearcoat *= wfFin.y;
material.clearcoatRoughness = min(max(mix(0.3, 0.07, wfFin.y), 0.0525) + geometryRoughness, 1.0);
#endif`);
  };
  return mat;
}

// Colours and figure for a species (see `figure` in woods.js).
export function setSpecies(mat, wood) {
  const u = mat.userData.wood, f = wood.figure;
  u.uEarly.value.setHex(f.early);
  u.uLate.value.setHex(f.late);
  u.uSap.value.setHex(f.sap ?? f.early);
  u.uRing.value.set(f.rings, f.contrast, f.warp, f.streak);
  u.uFig.value.set(f.spalt || 0, f.sap ? f.sapDist : 0, f.pores || 0, u.uFig.value.w);
}

// A fresh blank: where the pith sits and how the grain runs out along it, so no
// two logs look the same. `rand` is injectable for repeatable captures.
export function newFigure(mat, rand = Math.random) {
  const u = mat.userData.wood;
  const a = rand() * Math.PI * 2, dist = 0.72 + rand() * 0.45;
  const ta = rand() * Math.PI * 2, tilt = 0.05 + rand() * 0.08;
  u.uPith.value.set(Math.cos(a) * dist, Math.sin(a) * dist, Math.cos(ta) * tilt, Math.sin(ta) * tilt);
  u.uFig.value.w = Math.floor(rand() * 97);
}
