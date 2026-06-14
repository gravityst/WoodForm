// WoodForm — global tunables. Kept in one place so balancing is easy.
export const CONFIG = {
  // Log geometry (a surface of revolution sampled along its length).
  SAMPLES: 200,        // radius samples along the length axis (X)
  RADIAL_SEGMENTS: 48, // facets around the axis (purely visual)
  LENGTH: 2.6,         // world length of the log
  R0: 0.52,            // starting (cylinder) radius
  MIN_R: 0.05,         // mandrel/core radius — cannot cut below this

  // Lathe
  SPIN_SPEED: 7.0,     // radians/sec visual spin

  // Carving feel
  BASE_REMOVAL: 0.85,  // base radius removed per second at power 1, hardness 1
  CONTACT_TOL: 0.004,  // how far below the surface counts as "in contact"

  // Scoring tolerances (fractions of R0)
  SHAPE_TOL: 0.085,    // mean abs error at which shape score hits 0
  SYM_TOL: 0.10,
  WASTE_TOL: 0.07,
  ROUGH_TOL: 0.020,
  PAR_TIME: 70,        // seconds; finishing within this = full time score

  // Scoring weights (sum to 1.0)
  WEIGHTS: {
    shape: 0.34,
    smoothness: 0.16,
    symmetry: 0.12,
    efficiency: 0.14,
    finishing: 0.16,
    time: 0.08,
  },

  STAR_THRESHOLDS: [45, 65, 80, 92], // 1★ below 45 ... 5★ at/above 92

  // Economy
  XP_PER_LEVEL_BASE: 100,
  XP_GROWTH: 1.18,
};

// Star count from an overall 0-100 score.
export function starsFor(score) {
  const t = CONFIG.STAR_THRESHOLDS;
  if (score >= t[3]) return 5;
  if (score >= t[2]) return 4;
  if (score >= t[1]) return 3;
  if (score >= t[0]) return 2;
  return 1;
}

// XP needed to go from `level` to `level+1`.
export function xpForLevel(level) {
  return Math.round(CONFIG.XP_PER_LEVEL_BASE * Math.pow(CONFIG.XP_GROWTH, level - 1));
}
