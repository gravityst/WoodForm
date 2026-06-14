import { CONFIG, starsFor } from './config.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const pct = (x) => clamp(Math.round(x * 100), 0, 100);

// Score a carved log against its target profile. Returns per-metric 0-100 scores,
// a weighted overall, star count, and the data the result screen displays.
export function scoreLog(log, elapsedSec) {
  const S = log.S, r = log.radius, t = log.target, R0 = log.R0;

  // Only score samples that actually carry the object (ignore thin spindle waste).
  let n = 0, sumAbs = 0, sumWaste = 0, sumRough = 0, sumTargetRough = 0;
  let symErr = 0, symN = 0;
  for (let i = 0; i < S; i++) {
    const carries = t[i] > CONFIG.MIN_R * 1.4;
    if (!carries) continue;
    n++;
    const err = Math.abs(r[i] - t[i]);
    sumAbs += err;
    if (r[i] < t[i]) sumWaste += (t[i] - r[i]);     // cut below target = wasted wood
    if (i > 0 && i < S - 1) {
      sumRough += Math.abs(r[i - 1] - 2 * r[i] + r[i + 1]);        // 2nd derivative
      sumTargetRough += Math.abs(t[i - 1] - 2 * t[i] + t[i + 1]);
    }
    // asymmetry of carved vs asymmetry of target (works for symmetric & not)
    const m = S - 1 - i;
    symErr += Math.abs((r[i] - r[m]) - (t[i] - t[m]));
    symN++;
  }
  if (n === 0) n = 1;

  const meanAbs = sumAbs / n;
  const meanWaste = sumWaste / n;
  const excessRough = Math.max(0, (sumRough - sumTargetRough)) / n;
  const meanSym = symErr / Math.max(1, symN);
  const cover = log.finishCoverage();

  const shape = pct(1 - meanAbs / (CONFIG.SHAPE_TOL * R0));
  const symmetry = pct(1 - meanSym / (CONFIG.SYM_TOL * R0));
  const efficiency = pct(1 - meanWaste / (CONFIG.WASTE_TOL * R0));
  // smoothness blends low roughness with sanding coverage
  const smoothRaw = clamp(1 - excessRough / (CONFIG.ROUGH_TOL * R0), 0, 1);
  const smoothness = pct(0.55 * smoothRaw + 0.45 * cover);
  const finishing = pct(cover * (0.5 + 0.5 * (shape / 100))); // good finish needs the right shape
  const time = pct(elapsedSec <= CONFIG.PAR_TIME ? 1
    : Math.max(0, 1 - (elapsedSec - CONFIG.PAR_TIME) / (CONFIG.PAR_TIME * 2)));

  const w = CONFIG.WEIGHTS;
  const overall = Math.round(
    shape * w.shape + smoothness * w.smoothness + symmetry * w.symmetry +
    efficiency * w.efficiency + finishing * w.finishing + time * w.time);

  return {
    metrics: { shape, smoothness, symmetry, efficiency, finishing, time },
    overall: clamp(overall, 0, 100),
    stars: starsFor(overall),
  };
}

// Coin reward from a result. Scales with score, star bonus, the order's base
// reward and the wood's value. A floor keeps even rough attempts worthwhile.
export function rewardFor(order, wood, result) {
  const starBonus = [0, 0.6, 0.85, 1.0, 1.25, 1.6][result.stars];
  const base = order.baseReward * wood.valueMult;
  const coins = Math.round(base * (0.35 + 0.65 * result.overall / 100) * starBonus);
  const xp = Math.round(order.baseReward * 0.4 * (0.5 + result.overall / 100));
  return { coins: Math.max(5, coins), xp: Math.max(3, xp) };
}
