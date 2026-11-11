// Calculator entry points. Plain functions, no React or DOM, so they can be unit tested.
//
//   runCalculator(inputs)  forward comparison: current system vs a heat pump
//   runReverse(inputs)     already switched: what the old fuel would have cost
//
// Inputs arrive as the form holds them (mostly strings); blank means "I don't know" and the
// engine picks the default.
import {
  FUELS, HP_TIERS, DEFAULTS, BTU_PER_KWH,
} from '../data/equipment';
import { regionForZip, SEASONS, SEASON_OFFSETS } from '../data/regions';
import { pricesFor, LATEST_SEASON } from '../data/prices';
import {
  buildYear, degreeDays, HEATING_SEASON_MONTHS, MONTH_NAMES,
} from './weather';
import {
  modeledUA, uaFromAnnual, uaFromMonthly, blendUA,
} from './heatDemand';
import { sizeHeatPump, performanceAt } from './heatPump';
import {
  simulateMonth, costMonth, sumCosts, views,
} from './simulate';

const NORMAL_HDD_BASE = 65; // the base people know from weather reports
const VIEWS = ['heating', 'cooling', 'all'];
const SYSTEMS = ['current', 'hp', 'savings'];

const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const pct = (v) => (num(v) == null ? null : num(v) / 100);

export const DEFAULT_INPUTS = {
  zip: '',
  fuel: 'gas',
  sqft: '',
  yearBuilt: '',
  homeType: 'detached',
  upgraded: false,
  bills: {
    mode: 'none', // 'none' | 'annual' | 'monthly'
    annualUnits: '',
    annualCost: '',
    monthlyUnits: Array(12).fill(''),
    alsoWaterCooking: true,
  },
  equipment: {
    efficiency: '', // percent; blank = default for the fuel
    hasAC: null, // null = unknown
    acSeer: '',
    hasDucts: null,
  },
  heatPump: {
    tier: '', // blank = default for the climate zone
    ducted: null,
    backup: 'resistance', // 'resistance' | 'furnace'
    switchover: '', // °F; blank = economic balance point
    cooling: null, // use the heat pump for cooling; null = same as having AC today
    removeGas: false,
    installedCost: '',
    incentives: '',
  },
  reverse: {
    winterKwh: '', // October to April, last season
    summerMonthlyKwh: '',
  },
  // Assumptions panel edits. Percent values are entered as percents.
  overrides: {},
};

export function validate(inputs) {
  const errors = [];
  if (!regionForZip(inputs.zip)) errors.push('Enter a 5-digit ZIP code.');
  if (!FUELS[inputs.fuel]) errors.push('Choose a heating fuel.');
  if (num(inputs.overrides && inputs.overrides.ua) == null) {
    const sqft = num(inputs.sqft);
    const year = num(inputs.yearBuilt);
    if (sqft == null || sqft < 200 || sqft > 20000) {
      errors.push('Enter the heated floor area (200 to 20,000 sq ft).');
    }
    if (year == null || year < 1700 || year > new Date().getFullYear()) {
      errors.push('Enter the year the home was built.');
    }
  }
  return errors;
}

// The PRD's economic balance point: the COP at which heat from the heat pump costs the same
// as heat from the fuel system, and the outdoor temperature where the unit falls below it.
export function economicBalance(p, prices) {
  if (p.fuel === 'electric') return null;
  const fuelPerBtu = prices.fuel / p.btuPerUnit;
  const breakEvenCop = (prices.electricity * p.existingEfficiency) / (BTU_PER_KWH * fuelPerBtu);
  const opts = {
    copFactor: p.copFactor, defrostPenalty: p.defrostPenalty, maxCop: p.maxCop,
  };
  let temperature = null;
  for (let t = 65; t >= -30; t -= 1) {
    if (performanceAt(p.tier, t, opts).cop < breakEvenCop) {
      temperature = t;
      break;
    }
  }
  return { breakEvenCop, temperature };
}

// Turn form inputs into one flat parameter set for the simulation.
export function resolve(inputs) {
  const loc = regionForZip(inputs.zip);
  const { region } = loc;
  const { fuel } = inputs;
  const fuelInfo = FUELS[fuel];
  const o = inputs.overrides || {};
  const eq = inputs.equipment || {};
  const hpIn = inputs.heatPump || {};
  const bills = inputs.bills || { mode: 'none' };

  const efficiencyGiven = pct(eq.efficiency) != null;
  const existingEfficiency = efficiencyGiven ? pct(eq.efficiency) : fuelInfo.defaultEfficiency;
  const hasDucts = eq.hasDucts ?? fuelInfo.hasDucts;
  const ductLoss = pct(o.ductLoss) ?? DEFAULTS.ductLoss;
  const ductLossExisting = hasDucts && fuel !== 'electric' ? ductLoss : 0;
  const hpDucted = hpIn.ducted ?? hasDucts;
  const ductLossHp = hpDucted ? ductLoss : 0;
  // Placeholder for regional AC saturation: assume AC in climate zones 4 and warmer.
  const hasAC = eq.hasAC ?? region.climateZone <= 4;
  const tier = HP_TIERS[hpIn.tier] ? hpIn.tier
    : (region.climateZone >= 5 && 'coldClimate') || 'standard';
  const backup = fuel === 'electric' ? 'resistance' : hpIn.backup || 'resistance';
  const removeGas = fuel === 'gas' && backup !== 'furnace' && Boolean(hpIn.removeGas);
  const balancePoint = num(o.balancePoint) ?? DEFAULTS.balancePoint;
  const copFactor = pct(o.copFactor) ?? DEFAULTS.copFactor;

  // Prices: assumption panel override, then the price implied by the user's bill, then the
  // state average for the latest season.
  const latest = pricesFor(region.state, LATEST_SEASON, fuel);
  const billPrice = bills.mode === 'annual' && num(bills.annualCost) && num(bills.annualUnits)
    ? num(bills.annualCost) / num(bills.annualUnits) : null;
  const electricity = num(o.electricityPrice) ?? latest.electricity;
  let fuelPrice = num(o.fuelPrice) ?? billPrice ?? latest.fuel;
  let fuelPriceSource = (num(o.fuelPrice) != null && 'your edit')
    || (billPrice != null && 'your bills') || 'state average (placeholder)';
  if (fuel === 'electric') {
    fuelPrice = electricity;
    fuelPriceSource = 'same as electricity';
  }
  const prices = {
    electricity,
    fuel: fuelPrice,
    gasFixed: num(o.gasFixed) ?? latest.gasFixed,
  };

  // Stage 1: heat demand.
  const sqft = num(inputs.sqft);
  const yearBuilt = num(inputs.yearBuilt);
  const modelUa = sqft && yearBuilt ? modeledUA({
    sqft, yearBuilt, homeType: inputs.homeType, upgraded: inputs.upgraded,
  }) : null;
  // Bills cover the latest 12 months, so they're matched to the latest season's weather.
  const billYear = buildYear(region, SEASON_OFFSETS[LATEST_SEASON]);
  const billHdd = billYear.map((m) => degreeDays(m.bins, balancePoint));
  const demandArgs = { fuel, efficiency: existingEfficiency, ductLoss: ductLossExisting };

  let ua = modelUa;
  let uaSource = 'modeled';
  let billFit = null;
  if (num(o.ua) != null) {
    ua = num(o.ua);
    uaSource = 'reverse';
  } else if (bills.mode === 'monthly') {
    billFit = uaFromMonthly({
      ...demandArgs,
      monthlyUnits: bills.monthlyUnits.map(num),
      monthlyHdd: billHdd,
    });
    if (billFit) {
      ua = blendUA(billFit.ua, modelUa, billFit.months);
      uaSource = billFit.months >= 6 ? 'monthlyBills' : 'annualBills';
    }
  } else if (bills.mode === 'annual' && num(bills.annualUnits)) {
    const useBaseload = bills.alsoWaterCooking || fuel === 'electric';
    const billUa = uaFromAnnual({
      ...demandArgs,
      annualUnits: num(bills.annualUnits),
      baseloadPerMonth: useBaseload ? fuelInfo.baseloadPerMonth : 0,
      annualHdd: billHdd.reduce((s, v) => s + v, 0),
    });
    if (billUa) {
      ua = billUa;
      uaSource = 'annualBills';
    }
  }

  const p = {
    region,
    regionExact: loc.exact,
    fuel,
    fuelInfo,
    btuPerUnit: fuelInfo.btuPerUnit,
    existingEfficiency,
    efficiencyGiven,
    hasDucts,
    ductLoss,
    ductLossExisting,
    hpDucted,
    ductLossHp,
    hasAC,
    acSeer: num(eq.acSeer) ?? DEFAULTS.oldAcSeer,
    hpCooling: hpIn.cooling ?? hasAC,
    hpSeer2: HP_TIERS[tier].seer2,
    tier,
    backup,
    removeGas,
    balancePoint,
    coolingBalancePoint: DEFAULTS.coolingBalancePoint,
    copFactor,
    defrostPenalty: DEFAULTS.defrostPenalty,
    maxCop: DEFAULTS.maxCop,
    prices,
    fuelPriceSource,
    discountRate: pct(o.discountRate) ?? DEFAULTS.discountRate,
    ua,
    uaSource,
    uaBand: DEFAULTS.uaBand[uaSource],
    modelUa,
    billFit,
  };
  p.capacity47 = sizeHeatPump({
    ua,
    balancePoint,
    ductLoss: ductLossHp,
    tierKey: tier,
    designTemp: region.designTemp,
  });
  p.balance = economicBalance(p, prices);
  p.switchover = num(hpIn.switchover)
    ?? (p.balance && p.balance.temperature != null ? p.balance.temperature : -Infinity);
  return p;
}

const simulateYear = (months, p) => months.map((m) => simulateMonth(m.bins, p));
const priceYear = (sims, prices, p) => sumCosts(sims.map((s) => costMonth(s, prices, p)));

// Derived range: rerun at the edges of the uncertain inputs (UA, field COP, both prices) and
// take the lowest and highest result for each system and view. Equipment size stays fixed.
function rangeOf(p, typical) {
  const results = [];
  const pb = DEFAULTS.priceBand;
  const cfBand = DEFAULTS.copFactorBand;
  [1 - p.uaBand, 1 + p.uaBand].forEach((uaF) => {
    [p.copFactor - cfBand, Math.min(1.05, p.copFactor + cfBand)].forEach((copFactor) => {
      const q = { ...p, ua: p.ua * uaF, copFactor };
      const sims = simulateYear(typical, q);
      [1 - pb, 1 + pb].forEach((eF) => {
        [1 - pb, 1 + pb].forEach((fF) => {
          const prices = {
            ...p.prices,
            electricity: p.prices.electricity * eF,
            fuel: p.prices.fuel * (p.fuel === 'electric' ? eF : fF),
          };
          results.push(views(priceYear(sims, prices, q)));
        });
      });
    });
  });
  const band = {};
  SYSTEMS.forEach((sys) => {
    band[sys] = {};
    VIEWS.forEach((v) => {
      const vals = results.map((r) => r[sys][v]);
      band[sys][v] = { low: Math.min(...vals), high: Math.max(...vals) };
    });
  });
  return band;
}

// Five-winter lookback: same home and equipment, each season's own weather and prices.
function lookbackOf(p, normalHdd) {
  return SEASONS.map((season, s) => {
    const year = buildYear(p.region, SEASON_OFFSETS[s]);
    const prices = s === LATEST_SEASON ? p.prices : pricesFor(p.region.state, s, p.fuel);
    const months = HEATING_SEASON_MONTHS.map((m) => year[m]);
    const cost = priceYear(simulateYear(months, p), prices, p);
    const hdd = months.reduce((sum, m) => sum + degreeDays(m.bins, NORMAL_HDD_BASE), 0);
    return {
      season,
      current: cost.current.heating,
      hp: cost.hp.heating,
      savings: cost.current.heating - cost.hp.heating,
      hdd,
      hddVsNormal: hdd / normalHdd - 1,
      prices,
      billBased: s === LATEST_SEASON && p.uaSource !== 'modeled',
    };
  });
}

// Simple payback and NPV with separate escalation for fuel and electricity.
function paybackOf(p, inputs, sims) {
  const installed = num(inputs.heatPump && inputs.heatPump.installedCost);
  if (installed == null) return null;
  const net = installed - (num(inputs.heatPump.incentives) || 0);
  const year = views(priceYear(sims, p.prices, p));
  const backupFuelUnits = sims.reduce((s, m) => s + m.backupFuelUnits, 0);
  // Split each column into fuel dollars and electricity dollars so each can escalate.
  const currentFuel = p.fuel === 'electric' ? 0 : year.current.heating;
  const hpFuel = backupFuelUnits * p.prices.fuel;
  const { electricity: eEsc, fuel: fEsc } = DEFAULTS.escalation;
  let npv = -net;
  for (let y = 1; y <= DEFAULTS.analysisYears; y += 1) {
    const fuelGrowth = (1 + fEsc) ** y;
    const elecGrowth = (1 + eEsc) ** y;
    const current = currentFuel * fuelGrowth + (year.current.all - currentFuel) * elecGrowth;
    const hp = hpFuel * fuelGrowth + (year.hp.all - hpFuel) * elecGrowth;
    npv += (current - hp) / (1 + p.discountRate) ** y;
  }
  const annual = year.savings.all;
  return {
    netCost: net,
    annualSavings: annual,
    paybackYears: annual > 0 ? net / annual : null,
    npv,
    years: DEFAULTS.analysisYears,
  };
}

function sensitivityOf(p, sims) {
  const factors = [0.8, 1, 1.2];
  return factors.map((fF) => factors.map((eF) => {
    const prices = {
      ...p.prices,
      electricity: p.prices.electricity * eF,
      fuel: p.fuel === 'electric' ? p.prices.electricity * eF : p.prices.fuel * fF,
    };
    return { electricity: eF, fuel: fF, savings: views(priceYear(sims, prices, p)).savings.all };
  }));
}

function confidenceOf(p) {
  if (p.uaSource === 'modeled') return 'low';
  if (p.uaSource === 'monthlyBills' && p.efficiencyGiven) return 'high';
  return 'medium';
}

const UA_SOURCE_LABELS = {
  modeled: 'Modeled from size and year built',
  annualBills: 'Your annual bills',
  monthlyBills: 'Regression on your monthly bills',
  reverse: 'Your heat pump electricity use',
};

// Everything the assumptions panel lists. `edit` names the overrides key, if editable.
function assumptionsOf(p) {
  const u = p.fuelInfo.unit;
  const list = [
    { label: 'Weather region', value: `${p.region.name}${p.regionExact ? '' : ' (nearest match)'}`, source: 'Placeholder normals; NOAA bins planned' },
    { label: 'Heat loss (UA)', value: `${Math.round(p.ua)} Btu/h per °F`, source: UA_SOURCE_LABELS[p.uaSource] },
    {
      label: 'Electricity price', value: p.prices.electricity, unit: '$/kWh', edit: 'electricityPrice', source: 'State average (placeholder)',
    },
  ];
  if (p.fuel !== 'electric') {
    list.push({
      label: `${p.fuelInfo.label} price`, value: p.prices.fuel, unit: `$/${u}`, edit: 'fuelPrice', source: p.fuelPriceSource,
    });
  }
  if (p.fuel === 'gas') {
    list.push({
      label: 'Gas fixed charge', value: p.prices.gasFixed, unit: '$/month', edit: 'gasFixed', source: 'Counts only if you drop gas service',
    });
  }
  list.push(
    { label: 'Current system efficiency', value: `${Math.round(p.existingEfficiency * 100)}%`, source: p.efficiencyGiven ? 'You entered' : 'Default for fuel (edit in step 3)' },
    {
      label: 'Balance point', value: p.balancePoint, unit: '°F', edit: 'balancePoint', source: 'Engineering default for a 68°F setpoint',
    },
    { label: 'Heat pump', value: `${HP_TIERS[p.tier].label}, ${(p.capacity47 / 12000).toFixed(1)} tons`, source: 'Tier curve (placeholder NEEP median), sized by the tool' },
    {
      label: 'Field performance vs rated COP', value: Math.round(p.copFactor * 100), unit: '%', edit: 'copFactor', source: 'Haircut for real installs',
    },
    {
      label: 'Duct losses', value: Math.round(p.ductLoss * 100), unit: '%', edit: 'ductLoss', source: 'Ducts in unconditioned space',
    },
    { label: 'Defrost penalty', value: `${Math.round(p.defrostPenalty * 100)}% at 32°F`, source: 'Field studies (placeholder)' },
    { label: 'Federal tax credit', value: '$0', source: 'Section 25C ended for installs after Dec 31, 2025' },
    {
      label: 'Discount rate', value: Math.round(p.discountRate * 100), unit: '%', edit: 'discountRate', source: 'For 15-year NPV',
    },
  );
  return list;
}

export function runCalculator(inputs) {
  const errors = validate(inputs);
  if (errors.length) return { errors };

  const p = resolve(inputs);
  if (!(p.ua > 0)) return { errors: ['Could not estimate heat loss from these inputs.'] };

  const typical = buildYear(p.region, 0);
  const sims = simulateYear(typical, p);
  const expected = views(priceYear(sims, p.prices, p));
  const range = rangeOf(p, typical);
  const normalHdd = HEATING_SEASON_MONTHS
    .reduce((s, m) => s + degreeDays(typical[m].bins, NORMAL_HDD_BASE), 0);

  const hpBtu = sims.reduce((s, m) => s + m.hpBtu, 0);
  const backupBtu = sims.reduce((s, m) => s + m.backupBtu, 0);

  return {
    errors: [],
    params: p,
    confidence: confidenceOf(p),
    expected,
    range,
    monthly: sims.map((sim, m) => ({
      month: MONTH_NAMES[m],
      ...views(costMonth(sim, p.prices, p)),
    })),
    energy: {
      currentFuelUnits: sims.reduce((s, m) => s + m.existingFuelUnits, 0),
      hpKwh: sims.reduce((s, m) => s + m.hpKwh + m.backupKwh, 0),
      backupFuelUnits: sims.reduce((s, m) => s + m.backupFuelUnits, 0),
    },
    backupShare: hpBtu + backupBtu > 0 ? backupBtu / (hpBtu + backupBtu) : 0,
    balance: p.balance,
    lookback: lookbackOf(p, normalHdd),
    payback: paybackOf(p, inputs, sims),
    sensitivity: sensitivityOf(p, sims),
    assumptions: assumptionsOf(p),
  };
}

// Reverse mode. Last winter's heat pump electricity (winter use minus summer baseload) is
// divided by the modeled kWh per unit of UA for that winter's weather, which gives the home's
// UA. The forward model then reruns with that UA, using the old fuel as the "current" system.
export function runReverse(inputs) {
  const errors = [];
  if (!regionForZip(inputs.zip)) errors.push('Enter a 5-digit ZIP code.');
  const winterKwh = num(inputs.reverse && inputs.reverse.winterKwh);
  const summerKwh = num(inputs.reverse && inputs.reverse.summerMonthlyKwh) ?? 0;
  if (winterKwh == null) errors.push('Enter last winter\'s electricity use (October to April).');
  if (errors.length) return { errors };

  const heatPumpKwh = winterKwh - summerKwh * HEATING_SEASON_MONTHS.length;
  if (!(heatPumpKwh > 0)) {
    return { errors: ['Winter use must be higher than seven months of summer baseload.'] };
  }

  // Simulation is linear in UA when the unit is sized exactly (no rounding), so run UA = 1.
  const unit = resolve({ ...inputs, overrides: { ...inputs.overrides, ua: 1 } });
  unit.capacity47 = sizeHeatPump({
    ua: 1,
    balancePoint: unit.balancePoint,
    ductLoss: unit.ductLossHp,
    tierKey: unit.tier,
    designTemp: unit.region.designTemp,
    round: false,
  });
  const year = buildYear(unit.region, SEASON_OFFSETS[LATEST_SEASON]);
  const kwhPerUa = HEATING_SEASON_MONTHS.reduce((s, m) => {
    const sim = simulateMonth(year[m].bins, unit);
    return s + sim.hpKwh + sim.backupKwh;
  }, 0);
  const ua = heatPumpKwh / kwhPerUa;

  const result = runCalculator({
    ...inputs,
    bills: { mode: 'none' },
    overrides: { ...inputs.overrides, ua },
  });
  if (result.errors.length) return result;

  const last = result.lookback[LATEST_SEASON];
  const actualElectricCost = heatPumpKwh * last.prices.electricity;
  result.reverse = {
    season: SEASONS[LATEST_SEASON],
    heatPumpKwh,
    actualElectricCost,
    avoidedFuelCost: last.current,
    savings: last.current - actualElectricCost,
  };
  return result;
}
