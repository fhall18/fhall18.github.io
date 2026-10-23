import React from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';

import {
  fmtMw, fmtMwh, fmtSigned, fmtPctSigned, fmtTime, fmtDay,
} from './charts';
import scenarioShape from './propTypes';

const fmtPct0 = d3.format('.0%');
const fmt1 = d3.format(',.1f');

// ---------- summary tiles ----------
const delta = (before, after, lowerIsBetter) => {
  const d = after - before;
  let cls = '';
  if (d !== 0) cls = (d < 0) === lowerIsBetter ? 'good' : 'bad';
  const pct = before !== 0 ? ` (${fmtPctSigned(d / Math.abs(before))})` : '';
  return { text: `${fmtSigned(d)}${pct} vs. before shift`, cls };
};

export const Tiles = ({ scn }) => {
  const t = scn.totals;
  const posDelta = t.hoursPositiveAfter - t.hoursPositiveBefore;
  const tiles = [
    {
      label: 'Weekly peak net demand',
      value: fmtMw(t.peakNetAfter),
      unit: 'MW',
      delta: delta(t.peakNetBefore, t.peakNetAfter, true),
    },
    {
      label: 'Weekly peak surplus (negative net)',
      value: fmtMw(-Math.min(t.minNetAfter, 0)),
      unit: 'MW',
      delta: delta(-Math.min(t.minNetBefore, 0), -Math.min(t.minNetAfter, 0), true),
    },
    {
      label: 'EV energy moved to another hour',
      value: fmtMwh(t.mwhMoved),
      unit: 'MWh/wk',
      delta: {
        text: t.evMwh > 0 ? `${fmtPct0(t.mwhMoved / t.evMwh)} of weekly EV charging` : 'no EV charging',
        cls: '',
      },
    },
    {
      label: 'Peak EV charging load after shift',
      value: fmtMw(t.evPeakMwShifted),
      unit: 'MW',
      delta: {
        text: `${fmtSigned(t.evPeakMwShifted - t.evPeakMw)} vs. ${fmtMw(t.evPeakMw)} MW unshifted`,
        cls: '',
      },
    },
    {
      label: 'Hours with positive net demand',
      value: String(t.hoursPositiveAfter),
      unit: `of ${scn.hours.length}`,
      delta: { text: `${posDelta >= 0 ? '+' : ''}${posDelta} vs. before shift`, cls: '' },
    },
  ];
  return (
    <section className="tiles" aria-label="Weekly summary">
      {tiles.map((tile) => (
        <div className="tile" key={tile.label}>
          <div className="tile-label">{tile.label}</div>
          <div className="tile-value">
            <span>{tile.value}</span>
            <span className="tile-unit">{tile.unit}</span>
          </div>
          <div className={`tile-delta ${tile.delta.cls}`}>{tile.delta.text}</div>
        </div>
      ))}
    </section>
  );
};

Tiles.propTypes = { scn: scenarioShape.isRequired };

export const Derived = ({ scn }) => {
  const t = scn.totals;
  const parts = [
    `Weekly demand ${d3.format(',.0f')(t.totalDemandMwh / 1000)} GWh (base load ${fmtPct0(t.loadMwh / t.totalDemandMwh)}, `
      + `data centre ${fmtPct0(t.dcMwh / t.totalDemandMwh)}, EV ${fmtPct0(t.evMwh / t.totalDemandMwh)})`,
    `EV charging fixed at ${fmtMwh(t.evMwh)} MWh/wk, peak ${fmtMw(t.evPeakMw)} MW (300 MW times the notebook shape)`,
    `Solar ${fmtMwh(t.solarMwh)}, wind ${fmtMwh(t.windMwh)}, hydro ${fmtMwh(t.hydroMwh)} MWh/wk`,
  ];
  return <span className="derived">{parts.join('  ·  ')}</span>;
};

Derived.propTypes = { scn: scenarioShape.isRequired };

// ---------- tables ----------
const DataTable = ({ columns, rows, footer }) => (
  <table className="data-table">
    <thead>
      <tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}</tr>
    </thead>
    <tbody>
      {rows.map((r) => (
        <tr key={r.t || r.dayKey}>
          {columns.map((c) => <td key={c.label}>{c.fmt(r)}</td>)}
        </tr>
      ))}
    </tbody>
    {footer && (
      <tfoot>
        <tr>{footer.map((v, i) => <td key={columns[i].label}>{v}</td>)}</tr>
      </tfoot>
    )}
  </table>
);

DataTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    fmt: PropTypes.func.isRequired,
  })).isRequired,
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  footer: PropTypes.arrayOf(PropTypes.string),
};

DataTable.defaultProps = { footer: null };

export const DailyTable = ({ scn }) => {
  const cols = [
    { label: 'Day', fmt: (d) => fmtDay(d.date) },
    { label: 'EV MWh', fmt: (d) => fmtMwh(d.evMwh) },
    { label: 'EV MWh after shift', fmt: (d) => fmtMwh(d.evMwhShifted) },
    { label: 'MWh moved out', fmt: (d) => fmtMwh(d.mwhMoved) },
    { label: 'Max out (MW)', fmt: (d) => fmtMw(d.maxDispatchMw) },
    { label: 'Max in (MW)', fmt: (d) => fmtMw(-d.minDispatchMw) },
    { label: 'EV peak after (MW)', fmt: (d) => fmtMw(d.evPeakMwShifted) },
    { label: 'Peak |net| before (MW)', fmt: (d) => fmtMw(d.peakNetBefore) },
    { label: 'Peak |net| after (MW)', fmt: (d) => fmtMw(d.peakNetAfter) },
    { label: 'Sum |net| before (MWh)', fmt: (d) => fmtMwh(d.totalAbsNetBefore) },
    { label: 'Sum |net| after (MWh)', fmt: (d) => fmtMwh(d.totalAbsNetAfter) },
  ];
  const t = scn.totals;
  const footer = [
    'Week',
    fmtMwh(t.evMwh),
    fmtMwh(d3.sum(scn.days, (d) => d.evMwhShifted)),
    fmtMwh(t.mwhMoved),
    fmtMw(d3.max(scn.days, (d) => d.maxDispatchMw)),
    fmtMw(-d3.min(scn.days, (d) => d.minDispatchMw)),
    fmtMw(t.evPeakMwShifted),
    fmtMw(d3.max(scn.days, (d) => d.peakNetBefore)),
    fmtMw(d3.max(scn.days, (d) => d.peakNetAfter)),
    fmtMwh(t.totalAbsNetBefore),
    fmtMwh(t.totalAbsNetAfter),
  ];
  return <DataTable columns={cols} rows={scn.days} footer={footer} />;
};

DailyTable.propTypes = { scn: scenarioShape.isRequired };

const HOURLY_COLUMNS = [
  {
    label: 'Hour',
    fmt: (h) => fmtTime(h.date),
    csv: (h) => h.date.toISOString().slice(0, 16).replace('T', ' '),
  },
  { label: 'Base load', key: 'load' },
  { label: 'Data centre', key: 'dc' },
  { label: 'EV charging', key: 'ev' },
  { label: 'Solar', key: 'solar' },
  { label: 'Wind', key: 'wind' },
  { label: 'Hydro', key: 'hydro' },
  { label: 'Net demand', key: 'net' },
  { label: 'EV shifted', key: 'evShifted' },
  { label: 'EV shift (+out / -in)', key: 'dispatch' },
  { label: 'Net after shift', key: 'netAfter' },
].map((c) => ({
  ...c,
  fmt: c.fmt || ((h) => fmt1(h[c.key])),
  csv: c.csv || ((h) => h[c.key].toFixed(3)),
}));

export const HourlyTable = ({ scn }) => (
  <DataTable columns={HOURLY_COLUMNS} rows={scn.hours} />
);

HourlyTable.propTypes = { scn: scenarioShape.isRequired };

export function downloadCsv(scn) {
  const header = HOURLY_COLUMNS.map((c) => c.label.replace(/,/g, '')).join(',');
  const lines = scn.hours.map((h) => HOURLY_COLUMNS.map((c) => c.csv(h)).join(','));
  const p = scn.params;
  const meta = `# ev_share=${p.evShare.toFixed(4)} solar_share=${p.solarShare} wind_share=${p.windShare}`
    + ` hydro_share=${p.hydroShare} flex_share=${p.flexShare} shift_window=${p.shiftWindow}`;
  const blob = new Blob([`${meta}\n${header}\n${lines.join('\n')}\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vt_flexibility_scenario.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
