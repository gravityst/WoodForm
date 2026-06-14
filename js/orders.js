// Carving orders. Each order's `profile(t)` returns the TARGET radius as a
// fraction of R0 for t in [0,1] along the length. The carving model samples it
// to build the goal silhouette and the score compares the carved log to it.

// --- profile helper functions -------------------------------------------------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// smoothstep from edge a to edge b
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
// gaussian bump centred at c with width w
const bump = (t, c, w) => Math.exp(-((t - c) * (t - c)) / (2 * w * w));

const TOP = 0.86;   // never ask for more than this fraction of R0 (log must cover it)
const FLOOR = 0.10; // thin spindle waste at the extremes

const fit = (r) => clamp(r, FLOOR, TOP);

// --- shape library ------------------------------------------------------------
const shapes = {
  rollingPin(t) {
    const e = Math.min(t, 1 - t);          // distance to nearer end
    if (e < 0.05) return 0.30;             // handle end knob
    if (e < 0.12) return 0.30 - 0.07 * ss(0.05, 0.12, e); // taper into neck
    if (e < 0.18) return 0.23;             // neck
    if (e < 0.24) return 0.23 + 0.43 * ss(0.18, 0.24, e); // shoulder up to body
    return 0.66;                            // body
  },
  bowl(t) {
    const foot = 0.30 * bump(t, 0.04, 0.05);
    return fit(0.27 + 0.57 * Math.pow(ss(0.02, 0.98, t), 0.85) + foot * 0.4);
  },
  goblet(t) {
    if (t < 0.08) return 0.46;
    if (t < 0.16) return fit(0.46 - 0.30 * ss(0.08, 0.16, t));
    if (t < 0.52) return fit(0.16 + 0.015 * Math.sin(t * 26));
    return fit(0.16 + 0.66 * ss(0.52, 0.93, t));
  },
  handle(t) {
    if (t > 0.90) return 0.16;                       // ferrule
    return fit(0.26 + 0.20 * Math.sin(ss(0, 1, t) * Math.PI));
  },
  spinningTop(t) {
    if (t < 0.58) return fit(0.10 + 0.74 * (t / 0.58));      // cone
    if (t < 0.74) return fit(0.84 - 0.52 * ss(0.58, 0.74, t)); // shoulder
    return fit(0.32 - 0.18 * ss(0.74, 1, t));                  // knob/handle
  },
  eggCup(t) {
    return fit(0.16
      + 0.30 * bump(t, 0.06, 0.06)   // foot
      + 0.40 * bump(t, 0.80, 0.13)   // cup
      - 0.06 * bump(t, 0.45, 0.10)); // waist
  },
  honeyDipper(t) {
    if (t > 0.55) return fit(0.20 + 0.06 * Math.sin(t * 70)); // ridged head
    return fit(0.15 + 0.05 * Math.sin(t * 30));               // handle
  },
  tealight(t) {
    return fit(0.34 + 0.30 * bump(t, 0.04, 0.05) - 0.10 * bump(t, 0.7, 0.4));
  },
  vase(t) {
    return fit(0.20
      + 0.50 * bump(t, 0.38, 0.18)   // belly
      + 0.10 * bump(t, 0.04, 0.05)   // base
      + 0.16 * bump(t, 0.96, 0.04)); // flared lip
  },
  candlestick(t) {
    return fit(0.16
      + 0.42 * bump(t, 0.06, 0.06)
      + 0.18 * bump(t, 0.32, 0.05)
      + 0.16 * bump(t, 0.56, 0.06)
      + 0.24 * bump(t, 0.93, 0.05));
  },
  chessPawn(t) {
    return fit(0.13
      + 0.34 * bump(t, 0.05, 0.055)  // base
      + 0.12 * bump(t, 0.60, 0.03)   // collar
      + 0.30 * bump(t, 0.86, 0.09));  // head sphere
  },
  chessBishop(t) {
    return fit(0.12
      + 0.36 * bump(t, 0.05, 0.06)
      + 0.13 * bump(t, 0.42, 0.03)
      + 0.22 * bump(t, 0.72, 0.10)   // mitre body
      + 0.16 * bump(t, 0.96, 0.04));  // finial
  },
  urn(t) {
    return fit(0.18
      + 0.30 * bump(t, 0.07, 0.06)
      + 0.52 * bump(t, 0.45, 0.16)
      + 0.20 * bump(t, 0.90, 0.07));
  },
  newelPost(t) {
    let r = 0.40;
    r -= 0.14 * bump(t, 0.30, 0.045);  // cove
    r += 0.12 * bump(t, 0.45, 0.03);   // bead
    r -= 0.13 * bump(t, 0.62, 0.05);   // cove
    r += 0.22 * bump(t, 0.92, 0.06);   // cap
    r += 0.10 * bump(t, 0.05, 0.05);   // plinth
    return fit(r);
  },
  tableLeg(t) {
    let r = 0.30;
    r += 0.10 * bump(t, 0.05, 0.05);
    r += 0.09 * bump(t, 0.20, 0.025);
    r -= 0.12 * bump(t, 0.34, 0.05);
    r += 0.10 * bump(t, 0.50, 0.025);
    r -= 0.12 * bump(t, 0.66, 0.06);
    r += 0.08 * bump(t, 0.82, 0.03);
    r -= 0.10 * (1 - ss(0.85, 1.0, t)) * ss(0.9, 1.0, t);
    return fit(r);
  },
  mushroom(t) {
    if (t < 0.5) return fit(0.16 + 0.05 * Math.sin(t * 12)); // stem
    return fit(0.16 + 0.62 * bump(t, 0.82, 0.16));           // cap
  },
  bird(t) {
    return fit(0.14
      + 0.40 * bump(t, 0.25, 0.13)   // body
      + 0.16 * bump(t, 0.5, 0.05)    // neck swell
      + 0.30 * bump(t, 0.72, 0.07)   // head
      + 0.10 * bump(t, 0.92, 0.05));  // beak base
  },
  spire(t) {
    // master piece: a tapering twisted-looking spire with stacked beads
    let r = 0.42 * (1 - 0.7 * t);
    r += 0.10 * bump(t, 0.15, 0.03);
    r += 0.085 * bump(t, 0.33, 0.025);
    r += 0.07 * bump(t, 0.50, 0.02);
    r += 0.055 * bump(t, 0.66, 0.018);
    r += 0.18 * bump(t, 0.05, 0.05);   // base
    return fit(r);
  },
  totem(t) {
    let r = 0.34;
    r += 0.18 * bump(t, 0.18, 0.07);
    r -= 0.10 * bump(t, 0.36, 0.03);
    r += 0.20 * bump(t, 0.55, 0.08);
    r -= 0.10 * bump(t, 0.74, 0.03);
    r += 0.22 * bump(t, 0.90, 0.07);
    return fit(r);
  },
};

// --- order catalogue ----------------------------------------------------------
export const ORDERS = [
  { id: 'rolling_pin', name: 'Rolling Pin', tier: 1, minLevel: 1, baseReward: 60, tutorial: true,
    blurb: 'A baker wants a classic rolling pin with slim handles. (Tutorial: the tool won\'t let you over-cut.)',
    tools: ['roughing', 'chisel', 'sandblock'], profile: shapes.rollingPin },
  { id: 'bowl', name: 'Salad Bowl', tier: 1, minLevel: 1, baseReward: 70,
    blurb: 'A wide, gently flaring bowl with a small foot.',
    tools: ['gouge', 'chisel', 'sandblock'], profile: shapes.bowl },
  { id: 'goblet', name: 'Goblet', tier: 1, minLevel: 1, baseReward: 80,
    blurb: 'A drinking goblet: wide cup, slender stem, flat foot.',
    tools: ['parting', 'gouge', 'sandblock'], profile: shapes.goblet },
  { id: 'handle', name: 'Tool Handle', tier: 1, minLevel: 1, baseReward: 55,
    blurb: 'A comfortable bellied handle with a thin ferrule neck.',
    tools: ['roughing', 'chisel', 'sandblock'], profile: shapes.handle },
  { id: 'top', name: 'Spinning Top', tier: 1, minLevel: 2, baseReward: 75,
    blurb: 'A toy top — smooth cone to a fine point.',
    tools: ['chisel', 'detail', 'sandblock'], profile: shapes.spinningTop },
  { id: 'egg_cup', name: 'Egg Cup', tier: 1, minLevel: 2, baseReward: 70,
    blurb: 'A footed egg cup with a gentle waist.',
    tools: ['gouge', 'parting', 'sandblock'], profile: shapes.eggCup },
  { id: 'honey_dipper', name: 'Honey Dipper', tier: 1, minLevel: 3, baseReward: 90,
    blurb: 'A ridged honey dipper — keep those grooves even.',
    tools: ['parting', 'detail', 'sandblock'], profile: shapes.honeyDipper },
  { id: 'tealight', name: 'Tealight Holder', tier: 1, minLevel: 3, baseReward: 85,
    blurb: 'A squat holder with a recessed top.',
    tools: ['gouge', 'chisel', 'sandblock'], profile: shapes.tealight },

  { id: 'vase', name: 'Bud Vase', tier: 2, minLevel: 4, baseReward: 140,
    blurb: 'A bellied vase with a narrow neck and flared lip.',
    tools: ['gouge', 'parting', 'sandblock'], profile: shapes.vase },
  { id: 'candlestick', name: 'Candlestick', tier: 2, minLevel: 5, baseReward: 150,
    blurb: 'A turned candlestick with stacked beads.',
    tools: ['parting', 'detail', 'sandblock'], profile: shapes.candlestick },
  { id: 'chess_pawn', name: 'Chess Pawn', tier: 2, minLevel: 5, baseReward: 130,
    blurb: 'A tournament pawn: round head, collar, weighted base.',
    tools: ['detail', 'parting', 'sandblock'], profile: shapes.chessPawn },
  { id: 'chess_bishop', name: 'Chess Bishop', tier: 2, minLevel: 6, baseReward: 170,
    blurb: 'A taller bishop with a fine finial.',
    tools: ['detail', 'parting', 'sandblock'], profile: shapes.chessBishop },
  { id: 'urn', name: 'Decorative Urn', tier: 2, minLevel: 7, baseReward: 190,
    blurb: 'A full-bodied lidded urn shape.',
    tools: ['gouge', 'rotary', 'sandblock'], profile: shapes.urn },
  { id: 'newel', name: 'Newel Post', tier: 2, minLevel: 7, baseReward: 200,
    blurb: 'An architectural newel with coves, beads and a cap.',
    tools: ['parting', 'detail', 'rotary'], profile: shapes.newelPost },

  { id: 'table_leg', name: 'Cabriole Leg', tier: 3, minLevel: 8, baseReward: 280,
    blurb: 'A furniture leg — alternating beads and coves, precisely spaced.',
    tools: ['rotary', 'detail', 'parting'], profile: shapes.tableLeg },
  { id: 'mushroom', name: 'Mushroom Sculpture', tier: 3, minLevel: 9, baseReward: 300,
    blurb: 'A decorative mushroom with a domed cap.',
    tools: ['gouge', 'detail', 'autosand'], profile: shapes.mushroom },
  { id: 'bird', name: 'Stylised Bird', tier: 3, minLevel: 10, baseReward: 360,
    blurb: 'An abstract bird — flowing body, swept head and beak.',
    tools: ['rotary', 'detail', 'autosand'], profile: shapes.bird },
  { id: 'totem', name: 'Totem Carving', tier: 3, minLevel: 11, baseReward: 420,
    blurb: 'A stacked totem of swelling and pinched forms.',
    tools: ['rotary', 'detail', 'autosand'], profile: shapes.totem },

  { id: 'spire', name: 'Master Spire', tier: 4, minLevel: 12, baseReward: 650,
    blurb: 'A master-craftsman spire: a long taper stacked with fine beads.',
    tools: ['rotary', 'detail', 'autosand'], profile: shapes.spire },
];

export const ORDER_BY_ID = Object.fromEntries(ORDERS.map(o => [o.id, o]));
export { shapes };
