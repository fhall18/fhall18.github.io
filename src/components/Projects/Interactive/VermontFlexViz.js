import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import VT_DATA from './vtFlex/vtData';
import { buildScenario, notebookParams, toHourly } from './vtFlex/flexModel';
import ChartCard from './vtFlex/ChartCard';
import {
  Tiles, Derived, DailyTable, HourlyTable, downloadCsv,
} from './vtFlex/Summary';
import {
  COLORS,
  drawSupplyDemand, drawNetShift, drawLdc, drawExport,
  supplyDemandLegend, netShiftLegend, exportLegend,
} from './vtFlex/charts';

const hourly = toHourly(VT_DATA);
const NOTEBOOK_PARAMS = notebookParams(hourly);

// Gas slider runs up to the week's peak demand (base load + data center + EV), rounded up to
// the next 100 MW, which is enough to cover every gap whatever the renewable mix.
const GAS_MAX = (() => {
  const base = buildScenario(hourly, NOTEBOOK_PARAMS);
  const peak = Math.max(...base.hours.map((h) => h.load + h.dc + h.ev));
  return Math.ceil(peak / 100) * 100;
})();
const fmtMwSlider = (v) => `${Math.round(v)} MW`;

// Slider definitions. Values are held in percent. EV penetration is fixed at the notebook's
// value (300 MW times the hourly shape). The three supply sliders always sum to 100%.
const SUPPLY_CONTROLS = [
  {
    key: 'solarShare', name: 'Solar', hint: 'Local solar generation', swatch: COLORS.solar,
  },
  {
    key: 'windShare', name: 'Wind', hint: 'Local wind generation', swatch: COLORS.wind,
  },
  {
    key: 'hydroShare', name: 'Hydro', hint: 'Run-of-river', swatch: COLORS.hydro,
  },
  {
    key: 'gasMw',
    name: 'Gas',
    hint: 'Plant capacity; runs to fill gaps',
    max: GAS_MAX,
    step: 10,
    fmt: fmtMwSlider,
    swatch: COLORS.gas,
  },
];
const EV_CONTROLS = [
  {
    key: 'flexShare',
    name: 'Flexible EVs',
    hint: 'Share of EV charging that can move to another hour',
    max: 100,
    step: 1,
    swatch: COLORS.ev,
  },
  {
    key: 'shiftWindow',
    name: 'Shift window',
    hint: 'Window of time EV charging can shift',
    max: 24,
    step: 1,
    fmt: (v) => `±${Math.round(v)} h`,
    swatch: COLORS.ev,
  },
];
// Only the renewable shares are rebalanced to total 100%; gas capacity is independent.
const SUPPLY_KEYS = ['solarShare', 'windShare', 'hydroShare'];

const initialState = () => ({
  solarShare: NOTEBOOK_PARAMS.solarShare * 100,
  windShare: NOTEBOOK_PARAMS.windShare * 100,
  hydroShare: NOTEBOOK_PARAMS.hydroShare * 100,
  flexShare: NOTEBOOK_PARAMS.flexShare * 100,
  shiftWindow: NOTEBOOK_PARAMS.shiftWindow,
  gasMw: NOTEBOOK_PARAMS.gasMw,
});

// Set one supply share and rebalance the other two so the three total 100%. The remainder is
// split between the other two in their current ratio; if both are zero it is split equally.
const withSupplyShare = (state, key, value) => {
  const v = Math.min(Math.max(value, 0), 100);
  const others = SUPPLY_KEYS.filter((k) => k !== key);
  const remaining = 100 - v;
  const otherSum = others.reduce((s, k) => s + state[k], 0);
  const next = { ...state, [key]: v };
  others.forEach((k) => {
    next[k] = otherSum > 0 ? (state[k] / otherSum) * remaining : remaining / others.length;
  });
  return next;
};

// Readouts show whole percents; the state keeps the exact rebalanced values.
const fmtPct = (v) => `${Math.round(v)}%`;

const Controls = ({
  controls, state, onChange,
}) => (
  <div className="control-row">
    {controls.map((c) => (
      <div className="control" key={c.key}>
        <div className="control-label">
          <label className="control-name" htmlFor={`vt-ctl-${c.key}`}>
            <span className="swatch" style={{ background: c.swatch }} />
            <span>{c.name}</span>
          </label>
          <span className="control-value">{(c.fmt || fmtPct)(state[c.key])}</span>
        </div>
        <input
          type="range"
          id={`vt-ctl-${c.key}`}
          min={0}
          max={c.max || 100}
          step={c.step || 0.1}
          value={state[c.key]}
          onChange={(e) => onChange(c.key, Number(e.target.value))}
        />
        <span className="control-hint">{c.hint}</span>
      </div>
    ))}
  </div>
);

Controls.propTypes = {
  controls: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  state: PropTypes.shape({}).isRequired,
  onChange: PropTypes.func.isRequired,
};

const VermontFlexViz = () => {
  const [state, setState] = useState(initialState);

  const onChange = (key, value) => setState((prev) => (
    SUPPLY_KEYS.includes(key) ? withSupplyShare(prev, key, value) : { ...prev, [key]: value }
  ));

  const scn = useMemo(() => buildScenario(hourly, {
    evShare: NOTEBOOK_PARAMS.evShare,
    solarShare: state.solarShare / 100,
    windShare: state.windShare / 100,
    hydroShare: state.hydroShare / 100,
    flexShare: state.flexShare / 100,
    shiftWindow: state.shiftWindow,
    gasMw: state.gasMw,
  }), [state]);

  const { flexShare, gasMw } = state;
  const draws = useMemo(() => ({
    supplyDemand: (svg, tip) => drawSupplyDemand(svg, scn, tip),
    netShift: (svg, tip) => drawNetShift(svg, scn, tip, flexShare),
    ldc: (svg, tip) => drawLdc(svg, scn, tip, flexShare),
    exported: (svg, tip) => drawExport(svg, scn, tip, flexShare),
  }), [scn, flexShare]);

  return (
    <div className="vt-flex">
      <section className="card vt-flex-intro">
        <div className="card-head">
          <h4>Summary</h4>
        </div>
        <p>
          The power grid is one of the biggest machines people have ever built. It&apos;s a web
          of wires that ties together lots of places that make power: rivers turning
          turbines, wind spinning blades, sunlight landing on flat panels, and big plants
          burning fuel. Every moment, it pulls from the cheapest power it can get and sends it to
          your home. Each year, more of that power comes from sun, wind and water, which cost
          little to run and avoid pollution.
        </p>
        <p className="intro-rule">
          The grid has one hard rule: the power going into the wires has to match the power
          coming out, every second of every day.
        </p>
        <p>
          So when we turn up our air conditioners, flip on the lights, add data centers and
          plug in our electric cars, a power plant has to turn up to meet them. But what if
          we could introduce flexibility into when we use power? How would this flexibility
          change the grid as we know it?
        </p>
        <h4>The nitty-gritty</h4>
        <p>
          This explorable shows the supply and demand of electricity during a hot summer week
          in Vermont. The demand includes normal electric use (base load), a 300 MW data center and
          250,000 EVs (about half of all Vermont vehicles). You get to select your power supply,
          which has an impact on net demand (white region). In the section below, we explore
          flexibility with EV charging and how it can lower net demand while filling the
          deepest valleys where renewable energy is abundant.
        </p>
        <h4>What the heck is net demand?!</h4>
        <p>
          Net demand is the imbalance between supply and demand. When supply exceeds demand it
          drops below zero, indicating too much generation. When demand exceeds supply it rises
          above zero, indicating a capacity shortage. Net demand is calculated as total demand
          minus the total supply (solar, wind, hydro and gas). The white region plots this net
          demand, showing the gaps that need to be filled by new generation or flexible resources.
        </p>
      </section>

      <section className="controls" aria-label="Supply controls">
        <div className="card-head">
          <h4>
            Step 1:
            <span className="step-title"> Choose your power supply</span>
          </h4>
          <p className="card-sub">
            Split the week&apos;s supply between solar, wind and run-of-river hydro. The three
            always total 100%. Then size a gas plant: it runs as hard as needed to fill the gaps
            the renewables leave, up to its capacity.
          </p>
        </div>
        <Controls controls={SUPPLY_CONTROLS} state={state} onChange={onChange} />
        <div className="control-footer">
          <button type="button" className="btn" onClick={() => setState(initialState())}>
            Reset to notebook scenario
          </button>
          <Derived scn={scn} />
        </div>

        <ChartCard
          embedded
          title="Supply and demand"
          subtitle="Demand above zero, supply below, and net demand showing the imbalance."
          legend={supplyDemandLegend(gasMw)}
          draw={draws.supplyDemand}
          label="Stacked supply and demand with net demand"
        />
      </section>

      <section className="controls ev-controls" aria-label="EV flexibility controls">
        <div className="card-head">
          <h4>
            Step 2:
            <span className="step-title"> Adjust the amount of flexibility</span>
          </h4>
          <p className="card-sub">
            Choose how much EV charging is flexible, and how far it can be shifted.
          </p>
        </div>
        <Controls controls={EV_CONTROLS} state={state} onChange={onChange} />

        <ChartCard
          embedded
          title="Net demand and shiftable EV charging"
          subtitle="White is net demand (after renewables and gas) before any shifting. Green is net
          demand after the flexible share of EV charging is moved, each hour within its shift window,
          to minimize the peak; gas re-dispatches against the shifted demand.
          The green always stays inside the white region, so it flattens toward the axis as flexibility
          rises but never crosses it. Hover for the EV load moved out of or into each hour."
          legend={netShiftLegend(flexShare)}
          draw={draws.netShift}
          label="Net demand with EV shift dispatch"
        />
      </section>

      <Tiles scn={scn} />

      <div className="card-row">
        <ChartCard
          title="Load duration curve"
          subtitle="This helps utility planners determine how much capacity to build into their system.
          Hours with positive net demand (demand > supply) are sorted from highest to lowest, before
          and after introducing flexibility. Lowering the peak net demand with flexibility reduces the
          need for additional gas power plants and uses existing capacity efficiently."
          legend={netShiftLegend(flexShare)}
          draw={draws.ldc}
          label="Load duration curve"
          short
        />
        <ChartCard
          title="Generation exported or curtailed"
          subtitle="Total renewable generation that exceeded demand (supply > demand) that would
          have been exported out of state or curtailed. The first bar is without EV flexibility;
          the second shows the impact of flexible EV charging. Lower is better! I got fancy and
          added an indicator to each bar showing the breakdown of each energy source."
          legend={exportLegend(flexShare)}
          draw={draws.exported}
          label="Surplus generation exported before and after EV flexibility"
          short
        />
      </div>

      <section className="card">
        <div className="card-head">
          <h4>Daily results</h4>
          <p className="card-sub">
            Peak is the largest absolute net demand in the day. Sum |net| is the total absolute
            net demand in MWh.
          </p>
        </div>
        <div className="table-wrap">
          <DailyTable scn={scn} />
        </div>
      </section>

      <section className="card">
        <details>
          <summary>Hourly results table</summary>
          <div className="table-actions">
            <button type="button" className="btn" onClick={() => downloadCsv(scn)}>
              Download hourly CSV
            </button>
          </div>
          <div className="table-wrap">
            <HourlyTable scn={scn} />
          </div>
        </details>
      </section>

      <section className="card vt-flex-method">
        <div className="card-head">
          <h4>How the shifting works</h4>
        </div>
        <p>
          The model never picks out the peak and attacks it. Instead it asks a yes-or-no question:
          can every hour of the week be held at or below some level? It then searches for the
          lowest level where the answer is yes. That lowest level is the smallest peak that
          flexibility can reach.
        </p>
        <ol>
          <li>
            <strong>Split the charging.</strong> The flexible share of each hour&apos;s EV charging
            can move; the rest stays put. Moved charging may land anywhere within the shift window,
            and never so much that an hour&apos;s net demand crosses zero.
          </li>
          <li>
            <strong>Test a level.</strong> For a trial level, each hour has a certain amount of
            room before its net demand would rise above it. Walking the week in time order, the
            model fills each hour&apos;s room from the earliest charging that can still reach it.
            Earliest first matters: that charging is the first to run out of places to go. If all
            the movable charging finds a home, the level is reachable.
          </li>
          <li>
            <strong>Search for the lowest level.</strong> Try a level halfway between the best and
            worst cases. If it is reachable, try lower; if not, try higher. Repeating this homes in
            on the lowest reachable level, which is the new peak.
          </li>
          <li>
            <strong>Fill from the bottom.</strong> With the peak fixed, charging is placed by
            raising the level gradually from the deepest valley upward, so it pools where renewable
            energy is most abundant and the result is as flat as the windows allow.
          </li>
        </ol>
        <p>
          Gas is dispatched afterwards against whatever shortfall remains, up to its capacity.
          In optimization terms this is a binary search on the peak with an earliest-deadline-first
          feasibility check, followed by water-filling. It gives an exact answer for this problem
          without a general-purpose solver.
        </p>
      </section>
    </div>
  );
};

export default VermontFlexViz;
