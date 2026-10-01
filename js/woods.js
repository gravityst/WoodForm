// Wood species. `carveSpeed` scales removal rate (soft woods carve faster),
// `valueMult` scales coin rewards, colors drive the UI swatch + shavings.
// `figure` drives the procedural grain shader (js/woodshader.js): earlywood and
// latewood colours, growth rings per world unit, ring contrast, ring waviness,
// long-fibre streaks, and the species extras (sapwood, spalt lines, pores).
export const WOODS = [
  {
    id: 'pine',   name: 'Pine',   hardness: 1.0, carveSpeed: 1.35, valueMult: 1.0,
    color: 0xdcc18a, grain: 0xb89a63, shaving: 0xe8d6a8, grainScale: 1.0,
    cost: 0, unlockLevel: 1,
    figure: { early: 0xecd6a8, late: 0xc28a4e, rings: 17, contrast: 0.95, warp: 0.07, streak: 0.12 },
    blurb: 'Soft, forgiving and fast to cut. The beginner\'s friend.',
  },
  {
    id: 'cedar',  name: 'Cedar',  hardness: 1.15, carveSpeed: 1.2, valueMult: 1.25,
    color: 0xc78d5e, grain: 0x9c5f37, shaving: 0xe0a878, grainScale: 1.1,
    cost: 120, unlockLevel: 2,
    figure: { early: 0xb8784c, late: 0x7a3c1f, rings: 21, contrast: 0.75, warp: 0.06, streak: 0.16, sap: 0xe6c9a0, sapDist: 1.3 },
    blurb: 'Aromatic and light with a warm reddish tone.',
  },
  {
    id: 'oak',    name: 'Oak',    hardness: 1.5, carveSpeed: 0.92, valueMult: 1.6,
    color: 0xc9a878, grain: 0x8a6b42, shaving: 0xd8bd8e, grainScale: 1.4,
    cost: 400, unlockLevel: 4,
    figure: { early: 0xd9b98a, late: 0xa27444, rings: 15, contrast: 0.8, warp: 0.05, streak: 0.14, pores: 1 },
    blurb: 'Hard, strong and open-grained. Slower but valuable.',
  },
  {
    id: 'maple',  name: 'Maple',  hardness: 1.7, carveSpeed: 0.82, valueMult: 1.9,
    color: 0xe7d2a8, grain: 0xc9ac76, shaving: 0xf0e2bf, grainScale: 0.8,
    cost: 850, unlockLevel: 6,
    figure: { early: 0xf1dfbb, late: 0xdcc093, rings: 26, contrast: 0.45, warp: 0.05, streak: 0.08 },
    blurb: 'Pale, fine-grained and dense. Takes a glassy finish.',
  },
  {
    id: 'walnut', name: 'Walnut', hardness: 1.9, carveSpeed: 0.72, valueMult: 2.4,
    color: 0x6b4a32, grain: 0x432c1c, shaving: 0x8a6244, grainScale: 1.2,
    cost: 1600, unlockLevel: 8,
    figure: { early: 0x6e4c38, late: 0x3f2a1d, rings: 14, contrast: 0.6, warp: 0.08, streak: 0.32, sap: 0xcfae86, sapDist: 1.25 },
    blurb: 'Rich chocolate tones prized by master turners.',
  },
  {
    id: 'ebony',  name: 'Ebony',  hardness: 2.4, carveSpeed: 0.58, valueMult: 3.4,
    color: 0x2c2622, grain: 0x110d0b, shaving: 0x4a423a, grainScale: 0.6,
    cost: 3600, unlockLevel: 11,
    figure: { early: 0x3a2e26, late: 0x16110e, rings: 30, contrast: 0.55, warp: 0.1, streak: 0.5 },
    blurb: 'Jet-black, dense as stone. Unforgiving but exquisite.',
  },
  {
    id: 'purpleheart', name: 'Purpleheart', hardness: 2.2, carveSpeed: 0.62, valueMult: 3.8,
    color: 0x6e3d6b, grain: 0x47233f, shaving: 0x8c5288, grainScale: 1.0,
    cost: 5200, unlockLevel: 13,
    figure: { early: 0x7c4264, late: 0x592b48, rings: 24, contrast: 0.4, warp: 0.05, streak: 0.22 },
    blurb: 'Exotic. Cuts a deep royal purple — a collector favorite.',
  },
  {
    id: 'spalted', name: 'Spalted Maple', hardness: 1.6, carveSpeed: 0.85, valueMult: 4.5,
    color: 0xd8c7a0, grain: 0x4d4030, shaving: 0xe6dabc, grainScale: 1.8,
    cost: 7800, unlockLevel: 15,
    figure: { early: 0xcdb285, late: 0xb08f5e, rings: 26, contrast: 0.35, warp: 0.06, streak: 0.12, spalt: 1 },
    blurb: 'Rare fungal grain lines. No two logs are ever alike.',
  },
];

export const WOOD_BY_ID = Object.fromEntries(WOODS.map(w => [w.id, w]));
