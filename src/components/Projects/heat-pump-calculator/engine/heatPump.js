// Stage 4 building blocks: heat pump performance vs outdoor temperature, and sizing.
import { HP_TIERS, DEFAULTS } from '../data/equipment';

// Linear interpolation through [x, y] points sorted by x, extrapolating from the end segments.
export function interpolate(points, x) {
  let i = points.findIndex(([px]) => px >= x);
  if (i === -1) i = points.length - 1;
  if (i === 0) i = 1;
  const [x0, y0] = points[i - 1];
  const [x1, y1] = points[i];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

// COP multiplier for defrost: no loss at 17°F or 47°F, the full penalty at 32°F.
export function defrostFactor(t, penalty = DEFAULTS.defrostPenalty) {
  return 1 - penalty * Math.max(0, 1 - Math.abs(t - 32) / 15);
}

// Effective COP and capacity fraction at outdoor temperature `t`.
// `copFactor` is the field-performance haircut applied to the rated curve.
export function performanceAt(tierKey, t, {
  copFactor = DEFAULTS.copFactor,
  defrostPenalty = DEFAULTS.defrostPenalty,
  maxCop = DEFAULTS.maxCop,
} = {}) {
  const tier = HP_TIERS[tierKey];
  if (t < tier.cutoff) return { cop: 1, capFrac: 0 };
  const rated = Math.min(maxCop, interpolate(tier.cop, t));
  const cop = Math.max(1, rated * defrostFactor(t, defrostPenalty) * copFactor);
  const capFrac = Math.min(1.2, Math.max(0, interpolate(tier.cap, t)));
  return { cop, capFrac };
}

// Rated 47°F capacity (Btu/h) for a unit that fully covers the load at the tier's sizing
// temperature, or at the local design temperature if that is warmer. This is a stand-in for
// the contractor's sizing, which the PRD leaves out of scope.
// `round: false` skips rounding to a half ton, which keeps results linear in UA.
export function sizeHeatPump({
  ua, balancePoint, ductLoss, tierKey, designTemp, round = true,
}) {
  const tier = HP_TIERS[tierKey];
  const sizeAt = Math.max(tier.sizeAt, designTemp);
  const load = ua * Math.max(0, balancePoint - sizeAt) * (1 + ductLoss);
  const capacity = load / interpolate(tier.cap, sizeAt);
  if (!round) return capacity;
  const step = DEFAULTS.capacityStep;
  return Math.max(step, Math.ceil(capacity / step) * step);
}
