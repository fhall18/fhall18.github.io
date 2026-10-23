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
  drawSupplyDemand, drawNetShift, drawLdc, drawCurtailment,
  supplyDemandLegend, netShiftLegend, curtailmentLegend,
} from './vtFlex/charts';

const hourly = toHourly(VT_DATA);
const NOTEBOOK_PARAMS = notebookParams(hourly);

// Slider definitions. Values are held in percent. EV penetration is fixed at the notebook's
// value (300 MW times the hourly shape). The three supply sliders always sum to 100%.
const SUPPLY_HINT = 'share of weekly demand energy; solar, wind and hydro always total 100%';
const SUPPLY_CONTROLS = [
  {
    key: 'solarShare', name: 'Solar', hint: SUPPLY_HINT, swatch: COLORS.solar,
  },
  {
    key: 'windShare', name: 'Wind', hint: SUPPLY_HINT, swatch: COLORS.wind,
  },
  {
    key: 'hydroShare', name: 'Hydro', hint: `run-of-river; ${SUPPLY_HINT}`, swatch: COLORS.hydro,
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
    curtailment: (svg, tip) => drawCurtailment(svg, scn, tip, flexShare),
  }), [scn, flexShare]);

  return (
    <div className="vt-flex">
      <section className="card">
        <p className="vt-flex-intro">
          <strong>Summary:</strong> One week of Vermont load with a 300 MW data centre and the
          notebook&apos;s EV fleet. Split weekly demand energy between solar, wind and
          run-of-river hydro (the three always total 100%), then choose how much EV charging can
          move and how far. Each hour&apos;s flexible charging may move up to the shift window
          either side of itself (clipped at the start and end of the week), total EV energy is
          unchanged, and net demand is never pushed past zero. Within those limits charging is
          placed to make the peak net demand as low as possible, filling the deepest valleys
          first.
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
        subtitle="Demand stacked above zero, supply below. The white region is net demand before any EV shifting."
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
          title="Generation curtailment curve"
          subtitle="Hours with surplus generation (negative net demand), sorted from the largest surplus down, before and after the shift. Each series is sorted independently."
          legend={curtailmentLegend(flexShare)}
          draw={draws.curtailment}
          label="Generation curtailment curve"
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

      <p className="vt-flex-footer">
        Method ported from <code>flexibility_example.ipynb</code>. Data centre load is fixed at 300
        MW times the notebook&apos;s shape.
      </p>
    </div>
  );
};

export default VermontFlexViz;
