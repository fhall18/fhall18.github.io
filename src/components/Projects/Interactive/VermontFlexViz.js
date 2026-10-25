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
];
const EV_CONTROLS = [
  {
    key: 'flexShare',
    name: 'Flexible EVs',
    hint: 'share of EV charging that can move to another hour',
    max: 100,
    step: 1,
    swatch: COLORS.ev,
  },
  {
    key: 'shiftWindow',
    name: 'Shift window',
    hint: "hours either side that an hour's charging may move",
    max: 24,
    step: 1,
    fmt: (v) => `±${Math.round(v)} h`,
    swatch: COLORS.ev,
  },
];
const SUPPLY_KEYS = SUPPLY_CONTROLS.map((c) => c.key);

const initialState = () => ({
  solarShare: NOTEBOOK_PARAMS.solarShare * 100,
  windShare: NOTEBOOK_PARAMS.windShare * 100,
  hydroShare: NOTEBOOK_PARAMS.hydroShare * 100,
  flexShare: NOTEBOOK_PARAMS.flexShare * 100,
  shiftWindow: NOTEBOOK_PARAMS.shiftWindow,
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
  }), [state]);

  const { flexShare } = state;
  const draws = useMemo(() => ({
    supplyDemand: (svg, tip) => drawSupplyDemand(svg, scn, tip),
    netShift: (svg, tip) => drawNetShift(svg, scn, tip, flexShare),
    ldc: (svg, tip) => drawLdc(svg, scn, tip, flexShare),
    exported: (svg, tip) => drawExport(svg, scn, tip, flexShare),
  }), [scn, flexShare]);

  return (
    <div className="vt-flex">
      <section className="card">
        <p className="vt-flex-intro">
          <strong>Summary:</strong> One peak summer week of Vermont demand for electricity with
          a 300 MW data center and 250,000 EVs (~50% of vehicles). You can split weekly supply
          of energy between solar, wind and run-of-river hydro (the three always total 100%),
          then choose how much EV charging can be flexed. Total EV energy is unchanged, and net
          demand is never pushed past zero. Within those limits charging is placed to keep net
          demand as low as possible while filling the deepest valleys where renewables are abundant.
        </p>
      </section>

      <section className="controls" aria-label="Supply controls">
        <Controls controls={SUPPLY_CONTROLS} state={state} onChange={onChange} />
        <div className="control-footer">
          <button type="button" className="btn" onClick={() => setState(initialState())}>
            Reset to notebook scenario
          </button>
          <Derived scn={scn} />
        </div>
      </section>

      <ChartCard
        title="Supply and demand"
        subtitle="Demand stacked above zero, supply below. The white region is net demand before demand flexibility."
        legend={supplyDemandLegend}
        draw={draws.supplyDemand}
        label="Stacked supply and demand with net demand"
      />

      <Tiles scn={scn} />

      <section className="controls ev-controls" aria-label="EV flexibility controls">
        <Controls controls={EV_CONTROLS} state={state} onChange={onChange} />
      </section>

      <ChartCard
        title="Net demand and shiftable EV charging"
        subtitle="White is net demand before any shifting. Green is net demand after the flexible share of EV charging is moved, each hour within its shift window, to minimise the peak. The green always stays inside the white region, so it flattens toward the axis as flexibility rises but never crosses it. Hover for the EV load moved out of or into each hour."
        legend={netShiftLegend(flexShare)}
        draw={draws.netShift}
        label="Net demand with EV shift dispatch"
      />

      <div className="card-row">
        <ChartCard
          title="Load duration curve"
          subtitle="Hours with positive net demand, sorted from highest to lowest, before and after the shift. Each series is sorted independently."
          legend={netShiftLegend(flexShare)}
          draw={draws.ldc}
          label="Load duration curve"
          short
        />
        <ChartCard
          title="Surplus generation exported"
          subtitle="Total generation over the week that exceeds demand (negative net demand) and would be exported or curtailed. The first bar is the surplus with no EV flexibility; the second is what remains after flexible EV charging is moved into surplus hours. The sliver on the left of each bar splits the surplus by source, in proportion to each source's output in the surplus hours. Hover a bar for details."
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
    </div>
  );
};

export default VermontFlexViz;
