// Port of the modelling in flexibility_example.ipynb.
//
// Pipeline (same as the notebook):
//   1. 5-minute rows -> centered rolling means (load window 6, wind window 12), hourly averages.
//   2. Hourly shapes for EV charging, data centre load and run-of-river hydro.
//   3. Supply (solar, wind, hydro) scaled so each covers a chosen share of weekly demand energy.
//   4. Net demand = load - solar - wind - hydro + EV + data centre.
//   5. A share of EV charging is moved, each hour within +/- window hours of itself, so the peak
//      net demand is minimised, holding total EV energy fixed and keeping the shifted net demand
//      between zero and the original net demand in every hour.

const WEEKDAY_CURVE = [
  0.75, 0.65, 0.58, 0.55, 0.6, 0.8, 1.05, 1.1, 0.95, 0.8, 0.72, 0.7,
  0.72, 0.76, 0.82, 0.9, 1.0, 1.2, 1.6, 2, 1.7, 1.0, 0.9, 0.82,
];
const WEEKEND_CURVE = [
  0.6, 0.55, 0.5, 0.48, 0.5, 0.58, 0.68, 0.75, 0.8, 0.85, 0.9, 0.95,
  1.0, 1.05, 1.08, 1.1, 1.12, 1.08, 1.0, 0.92, 0.82, 0.75, 0.68, 0.62,
];
// Near-flat hourly shape for run-of-river hydro.
const HYDRO_CURVE = [
  0.82, 0.80, 0.79, 0.78, 0.78, 0.79, 0.82, 0.85, 0.88, 0.90, 0.91, 0.92,
  0.92, 0.91, 0.90, 0.89, 0.88, 0.87, 0.86, 0.85, 0.84, 0.83, 0.82, 0.82,
];
const DC_WEEKDAY = [
  0.75, 0.72, 0.70, 0.68, 0.70, 0.78, 0.88, 0.92, 0.95, 0.98, 1.0, 1.0,
  1.0, 0.98, 0.95, 0.92, 0.90, 0.88, 0.85, 0.80, 0.78, 0.75, 0.72, 0.70,
];
const DC_WEEKEND = [
  0.72, 0.70, 0.68, 0.67, 0.68, 0.72, 0.78, 0.82, 0.85, 0.88, 0.90, 0.90,
  0.90, 0.88, 0.85, 0.82, 0.80, 0.78, 0.75, 0.72, 0.70, 0.68, 0.65, 0.62,
];

// Fixed assumptions carried over from the notebook.
export const NOTEBOOK = {
  evMw: 300, // ev_charging_profile = ev_shape * 300
  dcMw: 300, // data_center_profile = dc_shape * 300
  solarShare: 0.4,
  windShare: 0.4,
  hydroShare: 0.2,
  flexShare: 0.8, // EV_FLEX_SHARE
  shiftWindow: 12, // hours either side flexible charging may move (page default, not in notebook)
};

const MS_PER_DAY = 86400000;

// "6/22/25 0:00" -> UTC epoch ms. Timestamps are treated as naive local clock time.
export function parseTimestamp(s) {
  const m = /^\s*(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/.exec(String(s));
  if (!m) throw new Error(`Unparseable timestamp: ${s}`);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return Date.UTC(year, Number(m[1]) - 1, Number(m[2]), Number(m[4]), Number(m[5]));
}

// pd.to_numeric(errors="coerce").fillna(0)
function toNumber(v) {
  const n = parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

const sum = (arr) => arr.reduce((s, v) => s + v, 0);

// pandas Series.rolling(window, center=True).mean() with min_periods = window,
// then .fillna(original). Label i covers [i - (window - offset - 1), i + offset].
export function centeredRollingMean(values, window) {
  const n = values.length;
  const offset = Math.floor((window - 1) / 2);
  return values.map((value, i) => {
    const end = i + 1 + offset;
    const start = end - window;
    if (start < 0 || end > n) return value;
    return sum(values.slice(start, end)) / window;
  });
}

// rows: [hourly, load, data_center, solar, wind] in original 5-minute order.
// Returns one record per hour with the smoothed and averaged inputs.
export function toHourly(rows) {
  const recs = rows.map((r) => ({
    t: parseTimestamp(r[0]),
    load: toNumber(r[1]),
    dc: toNumber(r[2]),
    solar: toNumber(r[3]),
    wind: toNumber(r[4]),
  }));
  const smoothedLoad = centeredRollingMean(recs.map((r) => r.load), 6);
  const smoothedWind = centeredRollingMean(recs.map((r) => r.wind), 12);

  const groups = new Map();
  recs.forEach((r, i) => {
    let g = groups.get(r.t);
    if (!g) {
      g = {
        n: 0, load: 0, dc: 0, solar: 0, wind: 0,
      };
      groups.set(r.t, g);
    }
    g.n += 1;
    g.load += smoothedLoad[i];
    g.dc += r.dc;
    g.solar += r.solar;
    g.wind += smoothedWind[i];
  });

  return Array.from(groups.keys()).sort((a, b) => a - b).map((t) => {
    const g = groups.get(t);
    const d = new Date(t);
    const dow = d.getUTCDay();
    return {
      t,
      hour: d.getUTCHours(),
      isWeekend: dow === 0 || dow === 6,
      dayKey: Math.floor(t / MS_PER_DAY),
      load: g.load / g.n, // smoothed_load
      solarRaw: g.solar / g.n, // solar before scaling
      windRaw: g.wind / g.n, // smoothed_wind before scaling
    };
  });
}

const evShape = (h) => (h.isWeekend ? WEEKEND_CURVE[h.hour] : WEEKDAY_CURVE[h.hour]);
const dcShape = (h) => (h.isWeekend ? DC_WEEKEND[h.hour] : DC_WEEKDAY[h.hour]);

// Per-hour bounds on flexible charging so the shifted net demand stays between zero and the
// original net demand (the "white region"):
//   net >= 0: flexible charging at most what was there, at least enough to keep net >= 0
//   net <  0: flexible charging at least what was there, at most enough to bring net to 0
export function regionBounds(net, evFlex) {
  const lo = [];
  const hi = [];
  net.forEach((n, i) => {
    const base = n - evFlex[i];
    if (n >= 0) {
      lo.push(Math.max(-base, 0));
      hi.push(evFlex[i]);
    } else {
      lo.push(evFlex[i]);
      hi.push(-base);
    }
  });
  return { lo, hi };
}

// Shifted EV charging profile over the whole series, where each hour's flexible charging may
// move to any hour within +/- `window` hours of itself (clipped at the start and end of the
// series). Total energy is unchanged and the shifted net demand stays inside the white region.
//
// Each hour first keeps its own lower bound `lo` (what it must retain to stay in the region).
// The rest of its flexible charging is "free" energy that can be placed at any hour in its
// window, up to that hour's remaining room below a level L: room_h(L) = clip(L - base_h, lo_h,
// hi_h) - lo_h. For a given L, whether all free energy can be placed is a transport problem
// with ordered interval windows, which an earliest-deadline-first sweep solves exactly. The
// lowest feasible L (found by bisection) is the lowest achievable peak net demand. The final
// placement raises L progressively from the lowest valley up to L*, so energy settles into the
// deepest valleys first and the result is as flat as the windows allow.
export function shiftEvWindow(net, ev, flexShare, window, levels = 200) {
  const n = net.length;
  const W = Math.max(0, Math.round(window));
  const evFixed = ev.map((v) => v * (1 - flexShare));
  const evFlex = ev.map((v) => v * flexShare);
  const base = net.map((v, i) => v - evFlex[i]);
  const { lo, hi } = regionBounds(net, evFlex);
  const free = evFlex.map((v, i) => v - lo[i]);
  const eps = 1e-9;
  // Sweeps subtract exactly, so a feasible level leaves exactly zero; keep the tolerance tight so
  // the dust returned to its own hour below cannot visibly breach the region.
  const tol = 1e-9;

  const room = (level) => base.map((b, h) => Math.min(Math.max(level - b, lo[h]), hi[h]) - lo[h]);

  // Earliest-deadline-first sweep. Sinks are visited in time order; each takes from the sources
  // whose windows cover it, smallest source index (earliest deadline) first. Mutates remaining
  // and placed. Returns the energy left unplaced.
  /* eslint-disable no-param-reassign */
  const sweep = (cap, remaining, placed) => {
    for (let h = 0; h < n; h += 1) {
      let space = cap[h] - placed[h];
      const sMax = Math.min(n - 1, h + W);
      for (let s = Math.max(0, h - W); s <= sMax && space > eps; s += 1) {
        if (remaining[s] > eps) {
          const take = Math.min(remaining[s], space);
          remaining[s] -= take;
          placed[h] += take;
          space -= take;
        }
      }
    }
    return sum(remaining);
  };
  /* eslint-enable no-param-reassign */

  const feasible = (level) => sweep(room(level), free.slice(), new Array(n).fill(0)) <= tol;

  let loLevel = Math.min(...base.map((b, i) => b + lo[i]));
  let hiLevel = Math.max(...base.map((b, i) => b + hi[i]));
  const bottom = loLevel;
  for (let k = 0; k < 100; k += 1) {
    const mid = (loLevel + hiLevel) / 2;
    if (feasible(mid)) hiLevel = mid;
    else loLevel = mid;
  }
  const levelStar = hiLevel;

  // Progressive fill from the lowest valley up to the optimal level.
  let remaining = free.slice();
  let placed = new Array(n).fill(0);
  for (let k = 1; k <= levels; k += 1) {
    sweep(room(bottom + ((levelStar - bottom) * k) / levels), remaining, placed);
  }
  if (sum(remaining) > tol) {
    // The progressive fill committed energy in a way the final level could not absorb; fall back
    // to the single sweep at the optimal level, which the bisection showed to be feasible.
    remaining = free.slice();
    placed = new Array(n).fill(0);
    sweep(room(levelStar), remaining, placed);
  }
  // Any dust left from tolerance goes back to its own hour (always inside the window).
  return evFixed.map((v, i) => v + lo[i] + placed[i] + Math.max(remaining[i], 0));
}

// The EV share of total demand energy implied by the notebook's fixed 300 MW scaling.
function notebookEvShare(hourly) {
  const loadSum = sum(hourly.map((h) => h.load));
  const dcSum = sum(hourly.map((h) => dcShape(h) * NOTEBOOK.dcMw));
  const evSum = sum(hourly.map((h) => evShape(h) * NOTEBOOK.evMw));
  return evSum / (loadSum + dcSum + evSum);
}

export function notebookParams(hourly) {
  return {
    evShare: notebookEvShare(hourly),
    solarShare: NOTEBOOK.solarShare,
    windShare: NOTEBOOK.windShare,
    hydroShare: NOTEBOOK.hydroShare,
    flexShare: NOTEBOOK.flexShare,
    shiftWindow: NOTEBOOK.shiftWindow,
  };
}

// params: shares are fractions (0..1).
//   evShare    EV charging energy as a share of total demand energy (load + data centre + EV)
//   solarShare, windShare, hydroShare   supply energy as a share of total demand energy
//   flexShare  share of EV charging that can move to another hour
//   shiftWindow  hours either side of its own hour that flexible charging may move (default 12)
export function buildScenario(hourly, params) {
  const evShare = Math.min(Math.max(params.evShare, 0), 0.95);

  const evShapes = hourly.map(evShape);
  const dcProfile = hourly.map((h) => dcShape(h) * NOTEBOOK.dcMw);
  const hydroShapes = hourly.map((h) => HYDRO_CURVE[h.hour]);

  const loadSum = sum(hourly.map((h) => h.load));
  const dcSum = sum(dcProfile);
  const evShapeSum = sum(evShapes);
  // ev = share * (load + dc + ev)  =>  ev = share / (1 - share) * (load + dc)
  const evEnergy = (evShare / (1 - evShare)) * (loadSum + dcSum);
  const evMw = evShapeSum > 0 ? evEnergy / evShapeSum : 0;
  const totalDemand = loadSum + dcSum + evEnergy;

  const solarRawSum = sum(hourly.map((h) => h.solarRaw));
  const windRawSum = sum(hourly.map((h) => h.windRaw));
  const hydroShapeSum = sum(hydroShapes);
  const solarScale = solarRawSum > 0 ? (params.solarShare * totalDemand) / solarRawSum : 0;
  const windScale = windRawSum > 0 ? (params.windShare * totalDemand) / windRawSum : 0;
  const hydroMw = hydroShapeSum > 0 ? (params.hydroShare * totalDemand) / hydroShapeSum : 0;

  const hours = hourly.map((h, i) => {
    const ev = evShapes[i] * evMw;
    const solar = h.solarRaw * solarScale;
    const wind = h.windRaw * windScale;
    const hydro = hydroShapes[i] * hydroMw;
    const net = h.load - solar - wind - hydro + ev + dcProfile[i];
    return {
      t: h.t,
      date: new Date(h.t),
      dayKey: h.dayKey,
      hour: h.hour,
      isWeekend: h.isWeekend,
      load: h.load,
      dc: dcProfile[i],
      ev,
      solar,
      wind,
      hydro,
      net,
    };
  });

  // EV shifting across the whole series within +/- shiftWindow hours of each hour.
  const shifted = shiftEvWindow(
    hours.map((h) => h.net),
    hours.map((h) => h.ev),
    params.flexShare,
    params.shiftWindow == null ? NOTEBOOK.shiftWindow : params.shiftWindow,
  );
  hours.forEach((h, i) => {
    /* eslint-disable no-param-reassign */
    h.evShifted = shifted[i];
    // positive = charging moved out of this hour (net reduced), negative = moved in
    h.dispatch = h.ev - shifted[i];
    h.netAfter = h.net - h.dispatch;
    /* eslint-enable no-param-reassign */
  });

  const dayKeys = Array.from(new Set(hours.map((h) => h.dayKey)));
  const days = dayKeys.map((key) => {
    const dayHours = hours.filter((h) => h.dayKey === key);
    return {
      dayKey: key,
      date: new Date(key * MS_PER_DAY),
      evMwh: sum(dayHours.map((h) => h.ev)),
      evMwhShifted: sum(dayHours.map((h) => h.evShifted)),
      mwhMoved: sum(dayHours.map((h) => Math.max(h.dispatch, 0))),
      maxDispatchMw: Math.max(...dayHours.map((h) => h.dispatch)),
      minDispatchMw: Math.min(...dayHours.map((h) => h.dispatch)),
      evPeakMwShifted: Math.max(...dayHours.map((h) => h.evShifted)),
      peakNetBefore: Math.max(...dayHours.map((h) => Math.abs(h.net))),
      peakNetAfter: Math.max(...dayHours.map((h) => Math.abs(h.netAfter))),
      totalAbsNetBefore: sum(dayHours.map((h) => Math.abs(h.net))),
      totalAbsNetAfter: sum(dayHours.map((h) => Math.abs(h.netAfter))),
    };
  });

  const totals = {
    loadMwh: loadSum,
    dcMwh: dcSum,
    evMwh: evEnergy,
    totalDemandMwh: totalDemand,
    solarMwh: solarRawSum * solarScale,
    windMwh: windRawSum * windScale,
    hydroMwh: hydroShapeSum * hydroMw,
    evMw,
    evPeakMw: Math.max(...hours.map((h) => h.ev)),
    evPeakMwShifted: Math.max(...hours.map((h) => h.evShifted)),
    mwhMoved: sum(days.map((d) => d.mwhMoved)),
    peakNetBefore: Math.max(...hours.map((h) => h.net)),
    peakNetAfter: Math.max(...hours.map((h) => h.netAfter)),
    minNetBefore: Math.min(...hours.map((h) => h.net)),
    minNetAfter: Math.min(...hours.map((h) => h.netAfter)),
    totalAbsNetBefore: sum(hours.map((h) => Math.abs(h.net))),
    totalAbsNetAfter: sum(hours.map((h) => Math.abs(h.netAfter))),
    hoursPositiveBefore: hours.filter((h) => h.net > 0).length,
    hoursPositiveAfter: hours.filter((h) => h.netAfter > 0).length,
  };

  return {
    params: { ...params, evShare }, hours, days, totals,
  };
}
