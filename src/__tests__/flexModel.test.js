import VT_DATA from '../components/Projects/Interactive/vtFlex/vtData';
import {
  buildScenario, notebookParams, toHourly, shiftEvWindow,
} from '../components/Projects/Interactive/vtFlex/flexModel';

const hourly = toHourly(VT_DATA);
const base = notebookParams(hourly);
const sum = (arr) => arr.reduce((s, v) => s + v, 0);

describe('flexModel', () => {
  it('collapses the 5-minute rows into one record per hour of the week', () => {
    expect(VT_DATA.length).toBe(2016);
    expect(hourly.length).toBe(168);
  });

  it('keeps EV energy fixed and net demand inside the pre-shift region', () => {
    const scn = buildScenario(hourly, base);
    expect(sum(scn.hours.map((h) => h.evShifted))).toBeCloseTo(sum(scn.hours.map((h) => h.ev)), 4);
    scn.hours.forEach((h) => {
      const lo = Math.min(0, h.net);
      const hi = Math.max(0, h.net);
      expect(h.netAfter).toBeGreaterThanOrEqual(lo - 1e-6);
      expect(h.netAfter).toBeLessThanOrEqual(hi + 1e-6);
    });
  });

  it('does not raise the peak, and does nothing with no flexibility', () => {
    const flexible = buildScenario(hourly, base);
    expect(flexible.totals.peakNetAfter).toBeLessThanOrEqual(flexible.totals.peakNetBefore + 1e-6);
    const rigid = buildScenario(hourly, { ...base, flexShare: 0 });
    expect(rigid.totals.mwhMoved).toBeCloseTo(0, 6);
    expect(rigid.totals.peakNetAfter).toBeCloseTo(rigid.totals.peakNetBefore, 6);
  });

  it('counts renewable surplus the shift absorbs, which gas never touches', () => {
    const scn = buildScenario(hourly, base);
    const surplus = (hours, key) => sum(hours.map((h) => Math.max(-h[key], 0)));
    expect(scn.totals.surplusMwhBefore).toBeCloseTo(surplus(scn.hours, 'net'), 6);
    expect(scn.totals.surplusMwhAfter).toBeCloseTo(surplus(scn.hours, 'netAfter'), 6);
    expect(scn.totals.surplusMwhAbsorbed)
      .toBeCloseTo(scn.totals.surplusMwhBefore - scn.totals.surplusMwhAfter, 6);
    expect(scn.totals.surplusMwhAbsorbed).toBeGreaterThan(0);
    expect(scn.totals.surplusMwhAbsorbed).toBeLessThanOrEqual(scn.totals.mwhMoved + 1e-6);
    const rigid = buildScenario(hourly, { ...base, flexShare: 0 });
    expect(rigid.totals.surplusMwhAbsorbed).toBeCloseTo(0, 6);
    const gas = buildScenario(hourly, { ...base, gasMw: 200 });
    expect(gas.totals.surplusMwhBefore).toBeCloseTo(scn.totals.surplusMwhBefore, 6);
    expect(gas.totals.surplusMwhAbsorbed).toBeCloseTo(scn.totals.surplusMwhAbsorbed, 6);
  });

  it('only moves charging within the shift window', () => {
    // Surplus (negative net) hours 3-5 can absorb charging. With a window of 1 hour, hour 4 has
    // no charging within reach, so it stays empty while hours 3 and 5 are filled.
    const net = [10, 10, 10, -5, -5, -5, 10, 10, 10];
    const ev = [3, 3, 3, 0, 0, 0, 3, 3, 3];
    const shifted = shiftEvWindow(net, ev, 1, 1);
    expect(sum(shifted)).toBeCloseTo(sum(ev), 6);
    expect(shifted[4]).toBeCloseTo(0, 6);
    expect(shifted[3]).toBeGreaterThan(0);
    expect(shifted[5]).toBeGreaterThan(0);
    const peakAfter = Math.max(...net.map((n, i) => n - (ev[i] - shifted[i])));
    expect(peakAfter).toBeLessThan(10);
  });

  it('subtracts gas from net demand, up to its capacity, without changing the EV shift', () => {
    const noGas = buildScenario(hourly, base);
    const gasMw = 200;
    const scn = buildScenario(hourly, { ...base, gasMw });
    const gasFor = (x) => Math.min(gasMw, Math.max(x, 0));
    scn.hours.forEach((h, i) => {
      const ref = noGas.hours[i];
      expect(h.dispatch).toBeCloseTo(ref.dispatch, 9);
      expect(h.gasBefore).toBeCloseTo(gasFor(ref.net), 9);
      expect(h.gasAfter).toBeCloseTo(gasFor(ref.netAfter), 9);
      expect(h.net).toBeCloseTo(ref.net - h.gasBefore, 9);
      expect(h.netAfter).toBeCloseTo(ref.netAfter - h.gasAfter, 9);
      // Surplus hours are untouched by gas.
      if (ref.net < 0) expect(h.net).toBeCloseTo(ref.net, 9);
    });
    expect(noGas.totals.gasMwhAfter).toBe(0);
    expect(scn.totals.peakNetAfter).toBeCloseTo(Math.max(noGas.totals.peakNetAfter - gasMw, 0), 6);
    // A plant as large as the renewable-only peak covers every gap.
    const big = buildScenario(hourly, { ...base, gasMw: noGas.totals.peakNetBefore });
    expect(big.totals.positiveNetMwhBefore).toBeCloseTo(0, 6);
    expect(big.totals.positiveNetMwhAfter).toBeCloseTo(0, 6);
    expect(big.totals.hoursPositiveAfter).toBe(0);
  });
});
