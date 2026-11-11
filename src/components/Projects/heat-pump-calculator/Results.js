import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import { HP_TIERS } from './data/equipment';
import BarChart from './BarChart';
import {
  COLORS, usd10, fmtUsd, fmtNum, fmtPct,
} from './charts';

const VIEW_WORDS = { heating: 'heating', cooling: 'cooling', all: 'heating and cooling' };
const CONFIDENCE_HINTS = {
  low: 'Based on your home\'s size and age only. Adding your bills typically narrows the range by half.',
  medium: 'Calibrated to your energy use. Adding your system\'s efficiency tightens it further.',
  high: 'Calibrated to a full year of bills and your equipment.',
};

// "saves about $X to $Y a year", or the reverse, or a range that crosses zero.
function savingsSentence({ low, high }, period) {
  if (low >= 0) return `That saves about ${usd10(low)} to ${usd10(high)} ${period}.`;
  if (high <= 0) return `That costs about ${usd10(-high)} to ${usd10(-low)} more ${period}.`;
  return `Depending on prices and how the unit performs, that ranges from ${usd10(-low)} more `
    + `to ${usd10(high)} less ${period}.`;
}

const Headline = ({ result, view }) => {
  const p = result.params;
  const tierLabel = HP_TIERS[p.tier].label.toLowerCase();
  const total = result.lookback.reduce((s, w) => s + w.savings, 0);
  const subject = result.reverse ? 'your heat pump' : 'a heat pump';
  const lookbackText = total >= 0
    ? `Over the last 5 winters, ${subject} would have saved you about ${usd10(total)}.`
    : `Over the last 5 winters, ${subject} would have cost you about ${usd10(-total)} more.`;

  if (result.reverse) {
    const r = result.reverse;
    const fuel = p.fuelInfo.label.toLowerCase();
    return (
      <div className="hp-headline">
        <p className="hp-headline-main">
          Last winter ({r.season}) your heat pump used about {fmtNum(r.heatPumpKwh)} kWh for
          heat, roughly {usd10(r.actualElectricCost)}. Heating with {fuel} would have cost
          about {usd10(r.avoidedFuelCost)}, so you{' '}
          {r.savings >= 0
            ? `saved about ${usd10(r.savings)}`
            : `paid about ${usd10(-r.savings)} more`}.
        </p>
        <p>{lookbackText}</p>
      </div>
    );
  }

  const hp = result.range.hp[view];
  const current = result.expected.current[view];
  if (view === 'cooling' && hp.high === 0 && current === 0) {
    return (
      <div className="hp-headline">
        <p className="hp-headline-main">No cooling in this comparison.</p>
        <p>Tell us about central AC in step 3, or choose to cool with the heat pump in step 4.</p>
      </div>
    );
  }
  return (
    <div className="hp-headline">
      <p className="hp-headline-main">
        With a {tierLabel} heat pump, you&apos;d likely pay {usd10(hp.low)} to {usd10(hp.high)} a
        year for {VIEW_WORDS[view]}, versus about {usd10(current)} today.
      </p>
      <p>{savingsSentence(result.range.savings[view], 'a year')}</p>
      {view !== 'cooling' && <p>{lookbackText}</p>}
    </div>
  );
};

const Tiles = ({ result }) => {
  const p = result.params;
  const { balance } = result;
  let balanceText = 'Not applicable for electric resistance heat.';
  if (balance && balance.temperature == null) {
    balanceText = 'The heat pump is cheaper per unit of heat at every outdoor temperature.';
  } else if (balance && balance.temperature >= 60) {
    balanceText = `${p.fuelInfo.label} is cheaper per unit of heat at almost any temperature.`;
  } else if (balance) {
    balanceText = `Below ${balance.temperature}°F, ${p.fuelInfo.label.toLowerCase()} is cheaper per unit of heat.`;
  }
  const backupHigh = result.backupShare > 0.1;

  return (
    <div className="hp-tiles">
      <div className="hp-tile">
        <span className="hp-tile-label">Confidence</span>
        <span className={`hp-tile-value hp-confidence-${result.confidence}`}>
          {result.confidence}
        </span>
        <span className="hp-hint">{CONFIDENCE_HINTS[result.confidence]}</span>
      </div>
      <div className={`hp-tile${backupHigh ? ' hp-tile-warn' : ''}`}>
        <span className="hp-tile-label">Backup heat share</span>
        <span className="hp-tile-value">{fmtPct(result.backupShare)}</span>
        <span className="hp-hint">
          {backupHigh
            ? 'High. The unit is undersized or not suited to this climate.'
            : 'Share of heat from backup on the coldest hours.'}
        </span>
      </div>
      <div className="hp-tile">
        <span className="hp-tile-label">Economic balance point</span>
        <span className="hp-tile-value">
          {balance ? `COP ${balance.breakEvenCop.toFixed(1)}` : 'n/a'}
        </span>
        <span className="hp-hint">{balanceText}</span>
      </div>
      <div className="hp-tile">
        <span className="hp-tile-label">Heat pump size</span>
        <span className="hp-tile-value">{(p.capacity47 / 12000).toFixed(1)} tons</span>
        <span className="hp-hint">An estimate for costing only. A contractor sizes the real system.</span>
      </div>
    </div>
  );
};

const SERIES = [
  { key: 'current', label: 'Current system', color: COLORS.current },
  { key: 'hp', label: 'Heat pump', color: COLORS.hp },
];

const Lookback = ({ result }) => {
  const groups = useMemo(() => result.lookback.map((w) => ({
    label: w.season,
    sublabel: `${fmtPct(Math.abs(w.hddVsNormal))} ${w.hddVsNormal >= 0 ? 'colder' : 'milder'}`,
    values: { current: w.current, hp: w.hp },
    flag: w.billBased,
  })), [result]);
  const u = result.params.fuelInfo.unit;

  return (
    <section className="hp-card">
      <h4>Five-winter lookback</h4>
      <p className="hp-hint">
        Heating cost each October to April with that winter&apos;s weather and prices. Your
        home and equipment stay the same. A dot marks a winter based on your bills; the others
        are modeled.
      </p>
      <BarChart groups={groups} series={SERIES} label="Heating cost by winter" yLabel="Heating cost" />
      <details>
        <summary>Prices used</summary>
        <table className="hp-table">
          <thead>
            <tr>
              <th>Winter</th>
              <th>Electricity ($/kWh)</th>
              {result.params.fuel !== 'electric' && <th>{result.params.fuelInfo.label} ($/{u})</th>}
              <th>Heat pump saved</th>
            </tr>
          </thead>
          <tbody>
            {result.lookback.map((w) => (
              <tr key={w.season}>
                <td>{w.season}</td>
                <td>{w.prices.electricity.toFixed(3)}</td>
                {result.params.fuel !== 'electric' && <td>{w.prices.fuel.toFixed(2)}</td>}
                <td>{fmtUsd(w.savings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
};

const Monthly = ({ result, view }) => {
  const groups = useMemo(() => result.monthly.map((m) => ({
    label: m.month,
    values: { current: m.current[view], hp: m.hp[view] },
  })), [result, view]);
  return (
    <section className="hp-card">
      <h4>Month by month, typical year</h4>
      <p className="hp-hint">
        Heat pumps cost the most in the coldest months, when they&apos;re least efficient, and
        save the most in spring and fall.
      </p>
      <BarChart groups={groups} series={SERIES} label="Cost by month" yLabel="Cost per month" />
    </section>
  );
};

const Sensitivity = ({ result }) => {
  const fuelName = result.params.fuel === 'electric' ? 'Electricity' : result.params.fuelInfo.label;
  const label = (f) => (f === 1 ? 'today' : `${f > 1 ? '+' : '−'}${Math.round(Math.abs(f - 1) * 100)}%`);
  return (
    <section className="hp-card">
      <h4>If prices change</h4>
      <p className="hp-hint">Yearly savings with a heat pump (heating and cooling). Negative means it costs more.</p>
      <table className="hp-table hp-sensitivity">
        <thead>
          <tr>
            <th>{fuelName} price ↓ / electricity price →</th>
            {result.sensitivity[0].map((c) => <th key={c.electricity}>{label(c.electricity)}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.sensitivity.map((row) => (
            <tr key={row[0].fuel}>
              <th>{label(row[0].fuel)}</th>
              {row.map((c) => (
                <td key={c.electricity} className={c.savings >= 0 ? 'hp-pos' : 'hp-neg'}>
                  {usd10(c.savings)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const Payback = ({ payback }) => (
  <section className="hp-card">
    <h4>Payback</h4>
    <p>
      Net cost {fmtUsd(payback.netCost)}.{' '}
      {payback.paybackYears != null
        ? `Simple payback about ${payback.paybackYears.toFixed(1)} years.`
        : 'Operating costs don\'t go down, so there is no payback on cost alone.'}{' '}
      {payback.years}-year net present value: {fmtUsd(payback.npv)}.
    </p>
  </section>
);

const Assumptions = ({ result, overrides, onOverride }) => (
  <details className="hp-card hp-assumptions">
    <summary>Assumptions ({result.assumptions.length}), every one editable or explained</summary>
    <table className="hp-table">
      <tbody>
        {result.assumptions.map((a) => (
          <tr key={a.label}>
            <th>{a.label}</th>
            <td>
              {a.edit ? (
                <span className="hp-inline-edit">
                  <input
                    type="number"
                    step="any"
                    aria-label={a.label}
                    value={overrides[a.edit] ?? ''}
                    placeholder={String(Math.round(a.value * 1000) / 1000)}
                    onChange={(e) => onOverride(a.edit, e.target.value)}
                  />
                  <span>{a.unit}</span>
                </span>
              ) : a.value}
            </td>
            <td className="hp-hint">{a.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </details>
);

const Results = ({
  result, view, setView, overrides, onOverride,
}) => (
  <div className="hp-results">
    {!result.reverse && (
      <div className="hp-toggle" role="group" aria-label="Show costs for">
        {['heating', 'cooling', 'all'].map((v) => (
          <button
            type="button"
            key={v}
            className={view === v ? 'active' : ''}
            onClick={() => setView(v)}
          >
            {v === 'all' ? 'All' : v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    )}
    <Headline result={result} view={view} />
    <Tiles result={result} />
    <Lookback result={result} />
    {!result.reverse && <Monthly result={result} view={view} />}
    {!result.reverse && <Sensitivity result={result} />}
    {result.payback && <Payback payback={result.payback} />}
    <Assumptions result={result} overrides={overrides} onOverride={onOverride} />
  </div>
);

// The result object is built by engine/index.js; only the fields read here are listed.
const byView = PropTypes.shape({
  heating: PropTypes.number, cooling: PropTypes.number, all: PropTypes.number,
});
const band = PropTypes.shape({ low: PropTypes.number, high: PropTypes.number });
const bandByView = PropTypes.shape({ heating: band, cooling: band, all: band });

const resultShape = PropTypes.shape({
  params: PropTypes.shape({
    tier: PropTypes.string,
    fuel: PropTypes.string,
    capacity47: PropTypes.number,
    fuelInfo: PropTypes.shape({ label: PropTypes.string, unit: PropTypes.string }),
  }).isRequired,
  confidence: PropTypes.string.isRequired,
  expected: PropTypes.shape({ current: byView, hp: byView, savings: byView }).isRequired,
  range: PropTypes.shape({ current: bandByView, hp: bandByView, savings: bandByView })
    .isRequired,
  monthly: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string, current: byView, hp: byView,
  })).isRequired,
  lookback: PropTypes.arrayOf(PropTypes.shape({
    season: PropTypes.string,
    current: PropTypes.number,
    hp: PropTypes.number,
    savings: PropTypes.number,
    hddVsNormal: PropTypes.number,
    billBased: PropTypes.bool,
    prices: PropTypes.shape({ electricity: PropTypes.number, fuel: PropTypes.number }),
  })).isRequired,
  sensitivity: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.shape({
    electricity: PropTypes.number, fuel: PropTypes.number, savings: PropTypes.number,
  }))).isRequired,
  assumptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    unit: PropTypes.string,
    edit: PropTypes.string,
    source: PropTypes.string,
  })).isRequired,
  backupShare: PropTypes.number.isRequired,
  balance: PropTypes.shape({ breakEvenCop: PropTypes.number, temperature: PropTypes.number }),
  payback: PropTypes.shape({}),
  reverse: PropTypes.shape({
    season: PropTypes.string,
    heatPumpKwh: PropTypes.number,
    actualElectricCost: PropTypes.number,
    avoidedFuelCost: PropTypes.number,
    savings: PropTypes.number,
  }),
});

Headline.propTypes = { result: resultShape.isRequired, view: PropTypes.string.isRequired };
Tiles.propTypes = { result: resultShape.isRequired };
Lookback.propTypes = { result: resultShape.isRequired };
Monthly.propTypes = { result: resultShape.isRequired, view: PropTypes.string.isRequired };
Sensitivity.propTypes = { result: resultShape.isRequired };
Payback.propTypes = {
  payback: PropTypes.shape({
    netCost: PropTypes.number,
    paybackYears: PropTypes.number,
    npv: PropTypes.number,
    years: PropTypes.number,
  }).isRequired,
};
Assumptions.propTypes = {
  result: resultShape.isRequired,
  overrides: PropTypes.objectOf(PropTypes.string).isRequired,
  onOverride: PropTypes.func.isRequired,
};
Results.propTypes = {
  result: resultShape.isRequired,
  view: PropTypes.string.isRequired,
  setView: PropTypes.func.isRequired,
  overrides: PropTypes.objectOf(PropTypes.string).isRequired,
  onOverride: PropTypes.func.isRequired,
};

export default Results;
