// Residential energy prices by state and heating season (see SEASONS in regions.js).
//
// PLACEHOLDER VALUES, roughly in line with each state's recent prices but NOT taken from
// EIA series. The planned monthly GitHub Action replaces this file with EIA state monthly
// prices: electricity, natural gas, and the weekly heating oil and propane survey rolled
// up to monthly.
//
// Units: electricity $/kWh, gas $/therm, propane and oil $/gallon.
// `fixed` is the monthly customer charge in $, used only if the user would drop gas service.

const PRICES = {
  VT: {
    electricity: [0.19, 0.2, 0.21, 0.22, 0.23],
    gas: [1.5, 1.9, 1.8, 1.7, 1.8],
    propane: [3.2, 3.6, 3.2, 3.2, 3.3],
    oil: [3.4, 4.9, 4, 3.7, 3.8],
    fixed: { gas: 15 },
  },
  MA: {
    electricity: [0.23, 0.3, 0.29, 0.3, 0.31],
    gas: [1.7, 2.2, 2, 2, 2.2],
    propane: [3.4, 3.8, 3.5, 3.4, 3.5],
    oil: [3.5, 4.8, 4, 3.7, 3.8],
    fixed: { gas: 12 },
  },
  MN: {
    electricity: [0.14, 0.15, 0.16, 0.16, 0.17],
    gas: [0.95, 1.2, 0.95, 0.95, 1],
    propane: [2.2, 2.3, 1.9, 1.9, 2],
    oil: [3.4, 4.5, 3.9, 3.6, 3.6],
    fixed: { gas: 10 },
  },
  IL: {
    electricity: [0.14, 0.16, 0.16, 0.17, 0.18],
    gas: [1, 1.3, 1, 1, 1.1],
    propane: [2.2, 2.4, 2, 2, 2.1],
    oil: [3.4, 4.6, 3.9, 3.6, 3.6],
    fixed: { gas: 25 },
  },
  CO: {
    electricity: [0.13, 0.14, 0.15, 0.155, 0.16],
    gas: [0.9, 1.25, 1.05, 0.95, 1],
    propane: [2.4, 2.6, 2.3, 2.3, 2.4],
    oil: [3.5, 4.5, 3.9, 3.6, 3.6],
    fixed: { gas: 12 },
  },
  GA: {
    electricity: [0.13, 0.14, 0.145, 0.15, 0.155],
    gas: [1.4, 1.9, 1.6, 1.5, 1.6],
    propane: [2.9, 3.1, 2.9, 2.9, 3],
    oil: [3.5, 4.6, 4, 3.7, 3.7],
    fixed: { gas: 20 },
  },
  WA: {
    electricity: [0.105, 0.11, 0.12, 0.125, 0.13],
    gas: [1.2, 1.5, 1.7, 1.6, 1.6],
    propane: [2.9, 3.1, 2.8, 2.8, 2.9],
    oil: [3.8, 5, 4.3, 4, 4],
    fixed: { gas: 13 },
  },
};

export const LATEST_SEASON = 4;

// Prices for one season. `fuel` is the price of the home's heating fuel in its own unit.
export function pricesFor(state, seasonIndex, fuel) {
  const p = PRICES[state];
  return {
    electricity: p.electricity[seasonIndex],
    fuel: fuel === 'electric' ? p.electricity[seasonIndex] : p[fuel][seasonIndex],
    gasFixed: p.fixed.gas,
  };
}
