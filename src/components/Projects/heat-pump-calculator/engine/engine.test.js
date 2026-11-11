import { FUELS, BTU_PER_KWH } from '../data/equipment';
import { REGIONS, SEASON_OFFSETS, regionForZip } from '../data/regions';
import { LATEST_SEASON } from '../data/prices';
import {
  buildYear, degreeDays, monthBins, HEATING_SEASON_MONTHS,
} from './weather';
import {
  interpolate, performanceAt, defrostFactor, sizeHeatPump,
} from './heatPump';
import { modeledUA, uaFromMonthly, linearFit } from './heatDemand';
import { simulateMonth } from './simulate';
import {
  DEFAULT_INPUTS, runCalculator, runReverse, resolve,
} from './index';

const homeInputs = (over = {}) => ({
  ...DEFAULT_INPUTS,
  zip: '05401',
  fuel: 'oil',
  sqft: '2000',
  yearBuilt: '1965',
  ...over,
});

describe('weather bins', () => {
  it('puts every hour of the month in a bin', () => {
    const hours = monthBins(20, 11, 31).reduce((s, b) => s + b.hours, 0);
    // Bins under 0.001 hours are dropped, so allow a hundredth of an hour.
    expect(hours).toBeCloseTo(31 * 24, 2);
  });

  it('gives Burlington a plausible heating season', () => {
    const year = buildYear(REGIONS.burlington);
    const hdd65 = year.reduce((s, m) => s + degreeDays(m.bins, 65), 0);
    // NOAA normal for Burlington is roughly 7,500 HDD (base 65°F).
    expect(hdd65).toBeGreaterThan(6800);
    expect(hdd65).toBeLessThan(8200);
  });

  it('makes warmer seasons have fewer degree days', () => {
    const cold = buildYear(REGIONS.burlington, -2);
    const warm = buildYear(REGIONS.burlington, 2);
    const hdd = (y) => y.reduce((s, m) => s + degreeDays(m.bins, 62), 0);
    expect(hdd(warm)).toBeLessThan(hdd(cold));
  });
});

describe('ZIP lookup', () => {
  it('matches Vermont exactly and falls back elsewhere', () => {
    expect(regionForZip('05401')).toMatchObject({ key: 'burlington', exact: true });
    expect(regionForZip('10001')).toMatchObject({ key: 'boston', exact: false });
    expect(regionForZip('123')).toBeNull();
  });
});

describe('heat pump performance', () => {
  it('interpolates and extrapolates linearly', () => {
    const pts = [[0, 0], [10, 10]];
    expect(interpolate(pts, 5)).toBe(5);
    expect(interpolate(pts, 20)).toBe(20);
    expect(interpolate(pts, -10)).toBe(-10);
  });

  it('matches rated points when there is no haircut or defrost', () => {
    const opts = { copFactor: 1, defrostPenalty: 0 };
    expect(performanceAt('coldClimate', 17, opts).cop).toBeCloseTo(2.6);
    expect(performanceAt('coldClimate', 5, opts).capFrac).toBeCloseTo(0.75);
  });

  it('applies defrost only in the frosting range', () => {
    expect(defrostFactor(32)).toBeCloseTo(0.92);
    expect(defrostFactor(10)).toBe(1);
    expect(defrostFactor(50)).toBe(1);
  });

  it('shuts off below the cutoff', () => {
    expect(performanceAt('standard', -10).capFrac).toBe(0);
  });

  it('sizes to cover the load at the sizing temperature', () => {
    const args = {
      ua: 600, balancePoint: 62, ductLoss: 0, tierKey: 'coldClimate', designTemp: -11,
    };
    const exact = sizeHeatPump({ ...args, round: false });
    expect(exact * 0.75).toBeCloseTo(600 * (62 - 5));
    expect(sizeHeatPump(args) % 6000).toBe(0);
  });
});

describe('heat demand', () => {
  it('scales the modeled UA with area and vintage', () => {
    const old = modeledUA({ sqft: 2000, yearBuilt: 1930 });
    const recent = modeledUA({ sqft: 2000, yearBuilt: 2015 });
    expect(old).toBeGreaterThan(recent);
    expect(modeledUA({ sqft: 1000, yearBuilt: 2015 })).toBeCloseTo(recent / 2);
  });

  it('fits a line exactly when the data is a line', () => {
    const fit = linearFit([0, 1, 2, 3], [5, 7, 9, 11]);
    expect(fit.a).toBeCloseTo(5);
    expect(fit.b).toBeCloseTo(2);
    expect(fit.r2).toBeCloseTo(1);
  });

  it('recovers a known UA from synthetic monthly bills', () => {
    const ua = 500;
    const efficiency = 0.8;
    const year = buildYear(REGIONS.burlington);
    const hdd = year.map((m) => degreeDays(m.bins, 62));
    const baseload = 20;
    const units = hdd.map((d) => baseload + (ua * 24 * d) / (FUELS.gas.btuPerUnit * efficiency));
    const fit = uaFromMonthly({
      monthlyUnits: units, monthlyHdd: hdd, fuel: 'gas', efficiency, ductLoss: 0,
    });
    expect(fit.ua).toBeCloseTo(ua, 6);
    expect(fit.baseloadPerMonth).toBeCloseTo(baseload, 6);
  });
});

describe('simulation', () => {
  it('uses only resistance backup below the cutoff', () => {
    const p = resolve(homeInputs({ heatPump: { ...DEFAULT_INPUTS.heatPump, tier: 'standard' } }));
    const sim = simulateMonth([{ t: -20, hours: 10 }], p);
    expect(sim.hpKwh).toBe(0);
    expect(sim.backupKwh).toBeCloseTo((p.ua * 82 * (1 + p.ductLossHp) * 10) / BTU_PER_KWH);
  });
});

describe('runCalculator', () => {
  it('reports missing required inputs', () => {
    const r = runCalculator({ ...DEFAULT_INPUTS });
    expect(r.errors.length).toBe(3);
  });

  const r = runCalculator(homeInputs());

  it('produces an oil-heated Vermont home in a plausible range', () => {
    expect(r.errors).toEqual([]);
    const gallons = r.energy.currentFuelUnits;
    expect(gallons).toBeGreaterThan(500);
    expect(gallons).toBeLessThan(1500);
  });

  it('keeps expected values inside the derived range', () => {
    ['current', 'hp', 'savings'].forEach((sys) => {
      ['heating', 'all'].forEach((v) => {
        expect(r.range[sys][v].low).toBeLessThanOrEqual(r.expected[sys][v] + 1e-6);
        expect(r.range[sys][v].high).toBeGreaterThanOrEqual(r.expected[sys][v] - 1e-6);
      });
    });
  });

  it('returns five winters, latest last, modeled without bills', () => {
    expect(r.lookback.map((s) => s.season)).toEqual(
      ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'],
    );
    expect(r.lookback.some((s) => s.billBased)).toBe(false);
  });

  it('computes a break-even COP and balance temperature for fuel homes', () => {
    expect(r.balance.breakEvenCop).toBeGreaterThan(1);
    expect(r.balance.temperature).not.toBeNull();
  });

  it('raises confidence when monthly bills are given', () => {
    const p = resolve(homeInputs());
    const year = buildYear(REGIONS.burlington, SEASON_OFFSETS[LATEST_SEASON]);
    const monthlyUnits = year.map((m) => String(
      (p.ua * (1 + p.ductLossExisting) * 24 * degreeDays(m.bins, 62))
        / (FUELS.oil.btuPerUnit * p.existingEfficiency),
    ));
    const withBills = runCalculator(homeInputs({
      bills: { ...DEFAULT_INPUTS.bills, mode: 'monthly', monthlyUnits },
    }));
    expect(withBills.confidence).toBe('medium');
    expect(withBills.params.ua).toBeCloseTo(p.ua, 3);
    expect(withBills.lookback[4].billBased).toBe(true);
  });

  it('adds payback and NPV only when installed cost is entered', () => {
    expect(r.payback).toBeNull();
    const withCost = runCalculator(homeInputs({
      heatPump: { ...DEFAULT_INPUTS.heatPump, installedCost: '15000', incentives: '2000' },
    }));
    expect(withCost.payback.netCost).toBe(13000);
  });

  it('builds a 3×3 price sensitivity grid', () => {
    expect(r.sensitivity.length).toBe(3);
    expect(r.sensitivity[1][1].savings).toBeCloseTo(r.expected.savings.all, 6);
  });
});

describe('runReverse', () => {
  it('round-trips: heat pump kWh from the forward model gives back the same UA', () => {
    const forward = resolve(homeInputs());
    const year = buildYear(REGIONS.burlington, SEASON_OFFSETS[LATEST_SEASON]);
    const winterKwh = HEATING_SEASON_MONTHS.reduce((s, m) => {
      const sim = simulateMonth(year[m].bins, forward);
      return s + sim.hpKwh + sim.backupKwh;
    }, 0);
    const r = runReverse({
      ...homeInputs({ sqft: '', yearBuilt: '' }),
      reverse: { winterKwh: String(winterKwh), summerMonthlyKwh: '0' },
    });
    expect(r.errors).toEqual([]);
    // Sizing rounds to a half ton in the forward run, so allow a few percent.
    expect(r.params.ua / forward.ua).toBeGreaterThan(0.95);
    expect(r.params.ua / forward.ua).toBeLessThan(1.05);
    expect(r.reverse.avoidedFuelCost).toBeGreaterThan(0);
  });

  it('rejects winter use below the summer baseload', () => {
    const r = runReverse({
      ...homeInputs(),
      reverse: { winterKwh: '1000', summerMonthlyKwh: '500' },
    });
    expect(r.errors.length).toBe(1);
  });
});
