// Stage 1: the home's heat loss coefficient (UA, Btu/h per °F).
//
// UA here is the house alone. Duct losses are added on top for whichever system uses ducts,
// so a bill-based UA is divided by (1 + existing duct loss).
import {
  FUELS, UA_PER_SQFT_BY_VINTAGE, HOME_TYPES, UPGRADE_FACTOR,
} from '../data/equipment';

// Modeled path: floor area × vintage heat loss, adjusted for home type and upgrades.
export function modeledUA({
  sqft, yearBuilt, homeType = 'detached', upgraded = false,
}) {
  const perSqft = UA_PER_SQFT_BY_VINTAGE.find((v) => yearBuilt <= v.throughYear).value;
  const typeFactor = (HOME_TYPES[homeType] || HOME_TYPES.detached).factor;
  return sqft * perSqft * typeFactor * (upgraded ? UPGRADE_FACTOR : 1);
}

// Fuel units per heating degree day → UA.
const uaFromSlope = ({
  slope, fuel, efficiency, ductLoss,
}) => (slope * FUELS[fuel].btuPerUnit * efficiency) / (24 * (1 + ductLoss));

// Bill path, annual total only. Baseload is subtracted at a default monthly rate.
export function uaFromAnnual({
  annualUnits, baseloadPerMonth, annualHdd, fuel, efficiency, ductLoss,
}) {
  const heatingUnits = annualUnits - baseloadPerMonth * 12;
  if (!(heatingUnits > 0) || !(annualHdd > 0)) return null;
  return uaFromSlope({
    slope: heatingUnits / annualHdd, fuel, efficiency, ductLoss,
  });
}

// Ordinary least squares, y = a + b·x.
export function linearFit(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  xs.forEach((x, i) => {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  });
  const b = sxx > 0 ? sxy / sxx : 0;
  const r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  return { a: my - b * mx, b, r2 };
}

// Bill path, monthly usage. Regress usage against HDD: the slope is heating use per HDD and
// the intercept is non-heating use per month. `monthlyUnits` has 12 entries (null = missing).
export function uaFromMonthly({
  monthlyUnits, monthlyHdd, fuel, efficiency, ductLoss,
}) {
  const points = monthlyUnits
    .map((units, m) => ({ units, hdd: monthlyHdd[m] }))
    .filter((p) => p.units != null && Number.isFinite(p.units));
  if (points.length < 3) return null;
  const fit = linearFit(points.map((p) => p.hdd), points.map((p) => p.units));
  if (!(fit.b > 0)) return null;
  return {
    ua: uaFromSlope({
      slope: fit.b, fuel, efficiency, ductLoss,
    }),
    baseloadPerMonth: Math.max(0, fit.a),
    r2: fit.r2,
    months: points.length,
  };
}

// Fewer than 6 months of bills: weight the bill estimate by coverage (PRD edge cases).
export function blendUA(billUA, modelUA, months) {
  const w = Math.min(1, months / 6);
  return w * billUA + (1 - w) * modelUA;
}
