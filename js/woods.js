// Wood species. `carveSpeed` scales removal rate (soft woods carve faster),
// `valueMult` scales coin rewards, colors drive the material + shavings.
export const WOODS = [
  {
    id: 'pine',   name: 'Pine',   hardness: 1.0, carveSpeed: 1.35, valueMult: 1.0,
    color: 0xdcc18a, grain: 0xb89a63, shaving: 0xe8d6a8, grainScale: 1.0,
    cost: 0, unlockLevel: 1,
    blurb: 'Soft, forgiving and fast to cut. The beginner\'s friend.',
  },
  {
    id: 'cedar',  name: 'Cedar',  hardness: 1.15, carveSpeed: 1.2, valueMult: 1.25,
    color: 0xc78d5e, grain: 0x9c5f37, shaving: 0xe0a878, grainScale: 1.1,
    cost: 120, unlockLevel: 2,
    blurb: 'Aromatic and light with a warm reddish tone.',
  },
  {
    id: 'oak',    name: 'Oak',    hardness: 1.5, carveSpeed: 0.92, valueMult: 1.6,
    color: 0xc9a878, grain: 0x8a6b42, shaving: 0xd8bd8e, grainScale: 1.4,
    cost: 400, unlockLevel: 4,
    blurb: 'Hard, strong and open-grained. Slower but valuable.',
  },
  {
    id: 'maple',  name: 'Maple',  hardness: 1.7, carveSpeed: 0.82, valueMult: 1.9,
    color: 0xe7d2a8, grain: 0xc9ac76, shaving: 0xf0e2bf, grainScale: 0.8,
    cost: 850, unlockLevel: 6,
    blurb: 'Pale, fine-grained and dense. Takes a glassy finish.',
  },
  {
    id: 'walnut', name: 'Walnut', hardness: 1.9, carveSpeed: 0.72, valueMult: 2.4,
    color: 0x6b4a32, grain: 0x432c1c, shaving: 0x8a6244, grainScale: 1.2,
    cost: 1600, unlockLevel: 8,
    blurb: 'Rich chocolate tones prized by master turners.',
  },
  {
    id: 'ebony',  name: 'Ebony',  hardness: 2.4, carveSpeed: 0.58, valueMult: 3.4,
    color: 0x2c2622, grain: 0x110d0b, shaving: 0x4a423a, grainScale: 0.6,
    cost: 3600, unlockLevel: 11,
    blurb: 'Jet-black, dense as stone. Unforgiving but exquisite.',
  },
  {
    id: 'purpleheart', name: 'Purpleheart', hardness: 2.2, carveSpeed: 0.62, valueMult: 3.8,
    color: 0x6e3d6b, grain: 0x47233f, shaving: 0x8c5288, grainScale: 1.0,
    cost: 5200, unlockLevel: 13,
    blurb: 'Exotic. Cuts a deep royal purple — a collector favorite.',
  },
  {
    id: 'spalted', name: 'Spalted Maple', hardness: 1.6, carveSpeed: 0.85, valueMult: 4.5,
    color: 0xd8c7a0, grain: 0x4d4030, shaving: 0xe6dabc, grainScale: 1.8,
    cost: 7800, unlockLevel: 15,
    blurb: 'Rare fungal grain lines. No two logs are ever alike.',
  },
];

export const WOOD_BY_ID = Object.fromEntries(WOODS.map(w => [w.id, w]));
