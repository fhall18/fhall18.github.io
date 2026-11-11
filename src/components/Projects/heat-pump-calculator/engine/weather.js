// Stage 2: temperature distribution.
//
// Weather is stored as hours per 2°F temperature bin per month (PRD, "Data size and speed").
// Until the data pipeline exists, bins are generated from each region's monthly mean and
// spread, assuming hourly temperatures are normally distributed within a month.

export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
// October to April, in season order.
export const HEATING_SEASON_MONTHS = [9, 10, 11, 0, 1, 2, 3];

const BIN_WIDTH = 2;
const BIN_LO = -40;
const BIN_HI = 112;
const WINTER_MONTHS = [10, 11, 0, 1, 2];
const SUMMER_MONTHS = [4, 5, 6, 7, 8];

// Error function, Abramowitz and Stegun 7.1.26 (absolute error under 1.5e-7).
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t
    + 0.254829592) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

// Hours in each 2°F bin for one month. The edge bins absorb the tails.
export function monthBins(mean, sd, days) {
  const hours = days * 24;
  const cdf = (t) => 0.5 * (1 + erf((t - mean) / (sd * Math.SQRT2)));
  const bins = [];
  for (let lo = BIN_LO; lo < BIN_HI; lo += BIN_WIDTH) {
    const pLo = lo === BIN_LO ? 0 : cdf(lo);
    const pHi = lo + BIN_WIDTH >= BIN_HI ? 1 : cdf(lo + BIN_WIDTH);
    const h = hours * (pHi - pLo);
    if (h > 1e-3) bins.push({ t: lo + BIN_WIDTH / 2, hours: h });
  }
  return bins;
}

function monthSd(region, month) {
  if (WINTER_MONTHS.includes(month)) return region.sd.winter;
  if (SUMMER_MONTHS.includes(month)) return region.sd.summer;
  return (region.sd.winter + region.sd.summer) / 2;
}

// Twelve months of bins. `heatingOffset` (°F) shifts the October to April months, which is
// how one past heating season differs from the typical year.
export function buildYear(region, heatingOffset = 0) {
  return region.monthlyMean.map((mean, month) => {
    const offset = HEATING_SEASON_MONTHS.includes(month) ? heatingOffset : 0;
    return {
      month,
      bins: monthBins(mean + offset, monthSd(region, month), MONTH_DAYS[month]),
    };
  });
}

// Heating degree days below `base` for one month's bins.
export const degreeDays = (bins, base) => bins.reduce(
  (sum, b) => (b.t < base ? sum + (b.hours * (base - b.t)) / 24 : sum),
  0,
);
