// Weather regions and the ZIP-to-region map.
//
// PLACEHOLDER DATA. Monthly means are rounded 30-year normals for one station per region.
// The hourly spread (`sd`) and the per-season offsets are illustrative. The planned GitHub
// Action replaces all of this with binned NOAA hourly observations and TMY3 typical years.

// Heating seasons in the lookback, oldest first. Each runs October to April.
export const SEASONS = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];

// How much warmer (+) or colder (-) each season's October to April months were than normal,
// in °F. ILLUSTRATIVE ONLY, one set shared by all regions until real data is wired in.
export const SEASON_OFFSETS = [-0.5, 1.5, 3.5, -1, -0.5];

export const REGIONS = {
  burlington: {
    name: 'Burlington, VT',
    state: 'VT',
    climateZone: 6,
    designTemp: -11,
    monthlyMean: [19, 22, 32, 45, 57, 66, 71, 69, 61, 48, 37, 25],
    sd: { winter: 11, summer: 7 },
  },
  boston: {
    name: 'Boston, MA',
    state: 'MA',
    climateZone: 5,
    designTemp: 7,
    monthlyMean: [30, 32, 39, 49, 59, 69, 74, 73, 66, 55, 45, 35],
    sd: { winter: 9, summer: 7 },
  },
  minneapolis: {
    name: 'Minneapolis, MN',
    state: 'MN',
    climateZone: 6,
    designTemp: -11,
    monthlyMean: [16, 20, 33, 47, 59, 69, 74, 71, 62, 49, 34, 21],
    sd: { winter: 12, summer: 8 },
  },
  chicago: {
    name: 'Chicago, IL',
    state: 'IL',
    climateZone: 5,
    designTemp: -1,
    monthlyMean: [26, 30, 40, 51, 62, 72, 76, 75, 68, 55, 42, 31],
    sd: { winter: 11, summer: 8 },
  },
  denver: {
    name: 'Denver, CO',
    state: 'CO',
    climateZone: 5,
    designTemp: 1,
    monthlyMean: [32, 33, 41, 47, 57, 68, 75, 73, 64, 51, 39, 31],
    sd: { winter: 12, summer: 10 },
  },
  atlanta: {
    name: 'Atlanta, GA',
    state: 'GA',
    climateZone: 3,
    designTemp: 22,
    monthlyMean: [44, 48, 55, 62, 70, 77, 80, 79, 74, 64, 53, 46],
    sd: { winter: 9, summer: 7 },
  },
  seattle: {
    name: 'Seattle, WA',
    state: 'WA',
    climateZone: 4,
    designTemp: 26,
    monthlyMean: [42, 43, 46, 50, 56, 61, 66, 67, 61, 53, 46, 41],
    sd: { winter: 6, summer: 8 },
  },
};

// ZIP prefixes (first 3 digits) for the states each region represents exactly.
const EXACT_PREFIXES = [
  { region: 'burlington', from: 50, to: 59 },
  { region: 'boston', from: 10, to: 27 },
  { region: 'minneapolis', from: 550, to: 567 },
  { region: 'chicago', from: 600, to: 629 },
  { region: 'denver', from: 800, to: 816 },
  { region: 'atlanta', from: 300, to: 319 },
  { region: 'atlanta', from: 398, to: 399 },
  { region: 'seattle', from: 980, to: 994 },
];

// Everything else falls back to a rough match on the ZIP's first digit.
const FALLBACK_BY_FIRST_DIGIT = [
  'boston', // 0: New England, NJ, PR
  'boston', // 1: NY, PA, DE
  'atlanta', // 2: DC, MD, VA, WV, NC, SC
  'atlanta', // 3: Southeast
  'chicago', // 4: IN, KY, MI, OH
  'minneapolis', // 5: IA, MN, MT, ND, SD, WI
  'chicago', // 6: IL, KS, MO, NE
  'atlanta', // 7: AR, LA, OK, TX
  'denver', // 8: AZ, CO, ID, NM, NV, UT, WY
  'seattle', // 9: AK, CA, HI, OR, WA
];

// Returns { key, region, exact } or null if the ZIP isn't 5 digits.
export function regionForZip(zip) {
  if (!/^\d{5}$/.test(String(zip || ''))) return null;
  const prefix = Number(String(zip).slice(0, 3));
  const match = EXACT_PREFIXES.find((p) => prefix >= p.from && prefix <= p.to);
  const key = match ? match.region : FALLBACK_BY_FIRST_DIGIT[Number(String(zip)[0])];
  return { key, region: REGIONS[key], exact: Boolean(match) };
}
