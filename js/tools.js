// Carving tools. Each tool defines a FOOTPRINT over the length axis: how wide
// it cuts (halfWidth, in world units) and how its bottom is shaped (shapeOffset
// raises the cut floor away from the tool centre, so a gouge leaves a rounded
// cove, a parting tool a narrow groove, a chisel a flat bottom).
//
// `maxStep` is the depth-of-cut limit: in one pass a point can only be cut this
// far below the wood still supporting it, so you peel thin layers instead of
// slicing straight through. Narrow tools (parting/detail) are allowed to plunge
// deeper for grooves; wide tools take gentle bites.
//
// `power` scales removal rate. `kind` selects behaviour: 'cut' removes material
// toward a target depth, 'sand' smooths the surface and raises the finish.

export const TOOLS = [
  {
    id: 'chisel', name: 'Basic Chisel', kind: 'cut',
    halfWidth: 0.028, power: 1.0, precision: 0.6, maxStep: 0.06,
    color: 0xbfc6cc, cost: 0, unlockLevel: 1,
    icon: '⟍', desc: 'Flat-bottomed all-rounder. Cuts straight, even surfaces.',
    shapeOffset: (d, hw) => 0, // flat floor across the width
  },
  {
    id: 'scraper', name: 'Flat Scraper', kind: 'cut',
    halfWidth: 0.05, power: 0.7, precision: 0.5, maxStep: 0.045,
    color: 0xa9b0b6, cost: 0, unlockLevel: 1,
    icon: '▭', desc: 'Wider and gentle. Good for fairing long, flat tapers.',
    shapeOffset: (d, hw) => 0,
  },
  {
    id: 'roughing', name: 'Roughing Gouge', kind: 'cut',
    halfWidth: 0.075, power: 1.7, precision: 0.35, maxStep: 0.08,
    color: 0xc9a36b, cost: 150, unlockLevel: 2,
    icon: '◗', desc: 'Hogs away bulk material fast over a wide area. Rough work only.',
    shapeOffset: (d, hw) => 0.18 * (d * d) / (hw * hw),
  },
  {
    id: 'gouge', name: 'Curved Gouge', kind: 'cut',
    halfWidth: 0.034, power: 1.1, precision: 0.7, maxStep: 0.07,
    color: 0xb9883f, cost: 320, unlockLevel: 3,
    icon: '◡', desc: 'Rounded edge for scooping smooth coves and bowls.',
    shapeOffset: (d, hw) => 0.42 * (d * d) / (hw * hw),
  },
  {
    id: 'parting', name: 'Parting Tool', kind: 'cut',
    halfWidth: 0.011, power: 1.25, precision: 0.85, maxStep: 0.24,
    color: 0xd0d6db, cost: 300, unlockLevel: 3,
    icon: '▽', desc: 'Razor-narrow and deep. Cuts crisp grooves, beads and shoulders.',
    shapeOffset: (d, hw) => 0.9 * (d / hw),
  },
  {
    id: 'detail', name: 'Detail Carver', kind: 'cut',
    halfWidth: 0.013, power: 0.9, precision: 0.95, maxStep: 0.18,
    color: 0xe2c98c, cost: 700, unlockLevel: 5,
    icon: '✎', desc: 'Fine point for crisp lines and intricate profiles.',
    shapeOffset: (d, hw) => 0.25 * (d / hw),
  },
  {
    id: 'rotary', name: 'Powered Rotary', kind: 'cut',
    halfWidth: 0.024, power: 2.1, precision: 0.8, maxStep: 0.11,
    color: 0xcf5b4a, cost: 2400, unlockLevel: 9,
    icon: '✺', desc: 'Motorised cutter: fast AND precise. The pro\'s workhorse.',
    shapeOffset: (d, hw) => 0.1 * (d * d) / (hw * hw),
  },
  {
    id: 'sandblock', name: 'Sanding Block', kind: 'sand',
    halfWidth: 0.09, power: 1.0, precision: 0.5,
    color: 0xe8d9b5, cost: 0, unlockLevel: 1,
    icon: '▤', desc: 'Smooths the surface and brings up a fine finish.',
    smoothing: 5.0, grit: 0.5,
    shapeOffset: (d, hw) => 0,
  },
  {
    id: 'autosand', name: 'Auto-Sander', kind: 'sand',
    halfWidth: 0.15, power: 1.0, precision: 0.6,
    color: 0xf0e6c9, cost: 3000, unlockLevel: 12,
    icon: '⊞', desc: 'Powered sander: covers the whole piece in seconds.',
    smoothing: 9.0, grit: 0.85,
    shapeOffset: (d, hw) => 0,
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map(t => [t.id, t]));
