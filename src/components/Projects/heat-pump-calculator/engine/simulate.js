// Stages 3 to 5 for one month of weather bins: load, current system fuel, heat pump
// electricity and backup, cooling, then cost.
import { BTU_PER_KWH } from '../data/equipment';
import { performanceAt } from './heatPump';

// Energy for one month. `p` is the resolved parameter set from engine/index.js.
// Both systems see the same house load, so the comparison isolates equipment and price.
export function simulateMonth(bins, p) {
  const r = {
    loadBtu: 0,
    existingFuelUnits: 0,
    hpKwh: 0,
    backupKwh: 0,
    backupFuelUnits: 0,
    hpBtu: 0,
    backupBtu: 0,
    coolingKwhCurrent: 0,
    coolingKwhHp: 0,
  };
  const perfOpts = {
    copFactor: p.copFactor, defrostPenalty: p.defrostPenalty, maxCop: p.maxCop,
  };

  bins.forEach(({ t, hours }) => {
    if (t < p.balancePoint) {
      const houseLoad = p.ua * (p.balancePoint - t); // Btu/h
      r.loadBtu += houseLoad * hours;

      // Current system: delivered heat (plus its duct losses) divided by efficiency.
      r.existingFuelUnits += (houseLoad * (1 + p.ductLossExisting) * hours)
        / (p.existingEfficiency * p.btuPerUnit);

      // Heat pump: serve what capacity allows, send the shortfall to backup.
      const hpLoad = houseLoad * (1 + p.ductLossHp);
      const furnaceOnly = p.backup === 'furnace' && t < p.switchover;
      let served = 0;
      if (!furnaceOnly) {
        const perf = performanceAt(p.tier, t, perfOpts);
        served = Math.min(hpLoad, p.capacity47 * perf.capFrac);
        if (served > 0) r.hpKwh += (served * hours) / (BTU_PER_KWH * perf.cop);
      }
      const shortfall = hpLoad - served;
      r.hpBtu += served * hours;
      r.backupBtu += shortfall * hours;
      if (p.backup === 'furnace') {
        r.backupFuelUnits += (shortfall * hours) / (p.existingEfficiency * p.btuPerUnit);
      } else {
        r.backupKwh += (shortfall * hours) / BTU_PER_KWH;
      }
    } else if (t > p.coolingBalancePoint) {
      // Cooling: a rough envelope-only load. SEER is Btu per Wh.
      const coolBtu = p.ua * (t - p.coolingBalancePoint) * hours;
      const oldAcKwh = p.hasAC ? coolBtu / (p.acSeer * 1000) : 0;
      r.coolingKwhCurrent += oldAcKwh;
      r.coolingKwhHp += p.hpCooling ? coolBtu / (p.hpSeer2 * 1000) : oldAcKwh;
    }
  });
  return r;
}

// Dollars for one simulated month. Gas fixed charges count only when the heat pump would
// let the user drop gas service; otherwise they're the same in both columns.
export function costMonth(sim, prices, p) {
  const fixed = p.removeGas ? prices.gasFixed : 0;
  return {
    current: {
      heating: sim.existingFuelUnits * prices.fuel + fixed,
      cooling: sim.coolingKwhCurrent * prices.electricity,
    },
    hp: {
      heating: (sim.hpKwh + sim.backupKwh) * prices.electricity
        + sim.backupFuelUnits * prices.fuel,
      cooling: sim.coolingKwhHp * prices.electricity,
    },
  };
}

// Sum a list of { current: {heating, cooling}, hp: {...} } into one.
export function sumCosts(list) {
  const total = {
    current: { heating: 0, cooling: 0 },
    hp: { heating: 0, cooling: 0 },
  };
  list.forEach((c) => {
    ['current', 'hp'].forEach((sys) => {
      total[sys].heating += c[sys].heating;
      total[sys].cooling += c[sys].cooling;
    });
  });
  return total;
}

// Heating, Cooling and All views of a cost pair, with savings (positive = heat pump cheaper).
export function views(cost) {
  const pick = (sys) => ({
    heating: cost[sys].heating,
    cooling: cost[sys].cooling,
    all: cost[sys].heating + cost[sys].cooling,
  });
  const current = pick('current');
  const hp = pick('hp');
  return {
    current,
    hp,
    savings: {
      heating: current.heating - hp.heating,
      cooling: current.cooling - hp.cooling,
      all: current.all - hp.all,
    },
  };
}
