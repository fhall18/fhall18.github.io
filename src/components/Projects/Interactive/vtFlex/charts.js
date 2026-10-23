import * as d3 from 'd3';

// Palette carried over from the notebook figures (drawn for a dark background).
export const COLORS = {
  solar: '#ffc136',
  wind: '#ff9166',
  hydro: '#0963be',
  dc: '#b34cc8',
  load: '#7fa6c8',
  ev: '#a0cc41',
  net: '#ffffff',
  after: '#a0cc41', // net demand after the shift, same green as EV charging
  ldcZero: '#ebc3b4',
};

// ---------- formatting ----------
export const fmtMw = d3.format(',.0f');
export const fmtMwh = d3.format(',.0f');
export const fmtSigned = d3.format('+,.0f');
export const fmtPctSigned = d3.format('+.0%');
export const fmtTime = d3.utcFormat('%a %-d %b %H:%M');
export const fmtDay = d3.utcFormat('%a %-d %b');
const fmtAxisDay = d3.utcFormat('%a %-d');

const fmtAxis = (v) => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(v);
};

export const afterLabel = (flexShare) => `Net demand with ${Math.round(flexShare)}% EV flexibility`;
export const curtailedAfterLabel = (flexShare) => `Curtailed with ${Math.round(flexShare)}% EV flexibility`;

// ---------- chart scaffolding ----------
function chartFrame(svgNode, { width = 1100, height = 420 }) {
  const margin = {
    top: 16, right: 24, bottom: 40, left: 60,
  };
  const svg = d3.select(svgNode).attr('viewBox', `0 0 ${width} ${height}`);
  svg.selectAll('*').remove();
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  return {
    svg, g, innerW: width - margin.left - margin.right, innerH: height - margin.top - margin.bottom,
  };
}

function drawAxes({
  g, innerW, innerH,
}, x, y, { xAxis, xLabel }) {
  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(''));
  g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${innerH})`)
    .call(xAxis);
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6).tickFormat(fmtAxis));
  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -46)
    .attr('text-anchor', 'middle')
    .text('MW');
  if (xLabel) {
    g.append('text')
      .attr('class', 'axis-label')
      .attr('x', innerW / 2)
      .attr('y', innerH + 34)
      .attr('text-anchor', 'middle')
      .text(xLabel);
  }
}

const drawZeroLine = (f, y) => f.g.append('line')
  .attr('class', 'zero-line')
  .attr('x1', 0)
  .attr('x2', f.innerW)
  .attr('y1', y(0))
  .attr('y2', y(0));

// Hours are sorted by time, so bisect finds the nearest one to the cursor.
const nearestHour = (hours, x, mx) => {
  const t = x.invert(mx).getTime();
  const i = d3.bisector((h) => h.t).center(hours, t);
  return Math.min(hours.length - 1, Math.max(0, i));
};

// Vertical crosshair plus tooltip. `at(mx)` maps a pointer x to { pos, title, rows }.
function addCrosshair(f, tip, at) {
  const cross = f.g.append('line')
    .attr('class', 'crosshair')
    .attr('y1', 0)
    .attr('y2', f.innerH)
    .style('display', 'none');
  f.g.append('rect')
    .attr('class', 'overlay')
    .attr('width', f.innerW)
    .attr('height', f.innerH)
    .on('pointermove', (event) => {
      const [mx] = d3.pointer(event, f.g.node());
      const hit = at(mx);
      if (!hit) return;
      cross.style('display', null).attr('x1', hit.pos).attr('x2', hit.pos);
      tip.show(event, hit.title, hit.rows);
    })
    .on('pointerleave', () => {
      cross.style('display', 'none');
      tip.hide();
    });
}

const timeAxis = (x) => d3.axisBottom(x).ticks(d3.utcDay.every(1)).tickFormat(fmtAxisDay);

// ---------- chart 1: supply and demand ----------
export function drawSupplyDemand(svgNode, scn, tip) {
  const { hours } = scn;
  const f = chartFrame(svgNode, { height: 440 });
  const x = d3.scaleUtc().domain(d3.extent(hours, (h) => h.date)).range([0, f.innerW]);
  const yMax = d3.max(hours, (h) => Math.max(
    h.dc + h.load + h.ev,
    h.solar + h.wind + h.hydro,
    Math.abs(h.net),
  ));
  const y = d3.scaleLinear().domain([-yMax, yMax]).nice().range([f.innerH, 0]);

  const area = (y0, y1) => d3.area()
    .x((h) => x(h.date))
    .y0((h) => y(y0(h)))
    .y1((h) => y(y1(h)))
    .curve(d3.curveLinear);

  const layers = [
    // demand, stacked above zero: data centre, base load, EV
    { color: COLORS.dc, y0: () => 0, y1: (h) => h.dc },
    { color: COLORS.load, y0: (h) => h.dc, y1: (h) => h.dc + h.load },
    { color: COLORS.ev, y0: (h) => h.dc + h.load, y1: (h) => h.dc + h.load + h.ev },
    // supply, stacked below zero: solar, wind, hydro
    { color: COLORS.solar, y0: () => 0, y1: (h) => -h.solar },
    { color: COLORS.wind, y0: (h) => -h.solar, y1: (h) => -(h.solar + h.wind) },
    {
      color: COLORS.hydro,
      y0: (h) => -(h.solar + h.wind),
      y1: (h) => -(h.solar + h.wind + h.hydro),
    },
  ];
  layers.forEach((l) => {
    f.g.append('path')
      .datum(hours)
      .attr('fill', l.color)
      .attr('fill-opacity', 0.5)
      .attr('d', area(l.y0, l.y1));
  });
  f.g.append('path')
    .datum(hours)
    .attr('fill', COLORS.net)
    .attr('fill-opacity', 0.5)
    .attr('d', area(() => 0, (h) => h.net));
  drawZeroLine(f, y);
  drawAxes(f, x, y, { xAxis: timeAxis(x) });

  addCrosshair(f, tip, (mx) => {
    const h = hours[nearestHour(hours, x, mx)];
    return {
      pos: x(h.date),
      title: fmtTime(h.date),
      rows: [
        { name: 'Net demand', value: `${fmtMw(h.net)} MW`, color: COLORS.net },
        { name: 'Base load', value: `${fmtMw(h.load)} MW`, color: COLORS.load },
        { name: 'Data centre', value: `${fmtMw(h.dc)} MW`, color: COLORS.dc },
        { name: 'EV charging', value: `${fmtMw(h.ev)} MW`, color: COLORS.ev },
        { name: 'Solar', value: `${fmtMw(h.solar)} MW`, color: COLORS.solar },
        { name: 'Wind', value: `${fmtMw(h.wind)} MW`, color: COLORS.wind },
        { name: 'Hydro', value: `${fmtMw(h.hydro)} MW`, color: COLORS.hydro },
      ],
    };
  });
}

export const supplyDemandLegend = [
  { label: 'Data centre', color: COLORS.dc, opacity: 0.5 },
  { label: 'Base load', color: COLORS.load, opacity: 0.5 },
  { label: 'EV charging', color: COLORS.ev, opacity: 0.5 },
  { label: 'Solar', color: COLORS.solar, opacity: 0.5 },
  { label: 'Wind', color: COLORS.wind, opacity: 0.5 },
  { label: 'Hydro', color: COLORS.hydro, opacity: 0.5 },
  { label: 'Net demand', color: COLORS.net, opacity: 0.9 },
];

// ---------- chart 2: net demand with EV shift ----------
export function drawNetShift(svgNode, scn, tip, flexShare) {
  const { hours } = scn;
  const f = chartFrame(svgNode, { height: 440 });
  const x = d3.scaleUtc().domain(d3.extent(hours, (h) => h.date)).range([0, f.innerW]);
  const yMax = d3.max(hours, (h) => Math.max(Math.abs(h.net), Math.abs(h.netAfter)));
  const y = d3.scaleLinear().domain([-yMax, yMax]).nice().range([f.innerH, 0]);

  const netArea = d3.area().x((h) => x(h.date)).y0(y(0)).y1((h) => y(h.net))
    .curve(d3.curveLinear);
  const afterArea = d3.area().x((h) => x(h.date)).y0(y(0)).y1((h) => y(h.netAfter))
    .curve(d3.curveLinear);

  // Net demand before the shift, in the same white as the first chart. It doubles as the clip
  // path for the green fill so straight segments between hours never leave the region.
  f.svg.append('defs').append('clipPath').attr('id', 'vt-clip-net-region')
    .append('path')
    .datum(hours)
    .attr('d', netArea);
  f.g.append('path').datum(hours).attr('fill', COLORS.net).attr('fill-opacity', 0.9)
    .attr('d', netArea);
  // Net demand with EV flexibility. It always lies inside the net demand region, closer to the
  // axis.
  f.g.append('path')
    .datum(hours)
    .attr('clip-path', 'url(#vt-clip-net-region)')
    .attr('fill', COLORS.after)
    .attr('fill-opacity', 0.9)
    .attr('d', afterArea);
  drawZeroLine(f, y);
  drawAxes(f, x, y, { xAxis: timeAxis(x) });

  addCrosshair(f, tip, (mx) => {
    const h = hours[nearestHour(hours, x, mx)];
    return {
      pos: x(h.date),
      title: fmtTime(h.date),
      rows: [
        { name: 'Net demand', value: `${fmtMw(h.net)} MW`, color: COLORS.net },
        { name: afterLabel(flexShare), value: `${fmtMw(h.netAfter)} MW`, color: COLORS.after },
        { name: 'EV load moved out (+) / in (-)', value: `${fmtSigned(h.dispatch)} MW`, color: COLORS.ev },
        { name: 'EV charging before', value: `${fmtMw(h.ev)} MW`, color: COLORS.ev },
        { name: 'EV charging after', value: `${fmtMw(h.evShifted)} MW`, color: COLORS.ev },
      ],
    };
  });
}

export const netShiftLegend = (flexShare) => [
  { label: 'Net demand', color: COLORS.net, opacity: 0.9 },
  { label: afterLabel(flexShare), color: COLORS.after },
];

// ---------- charts 3 and 4: duration curves ----------
// Rows are { i, before, after, moved }, sorted descending, drawn as a white area (before) with
// the green area (after) on top.
function drawDurationCurve(svgNode, tip, cfg) {
  const { rows } = cfg;
  const f = chartFrame(svgNode, { width: 600, height: 340 });
  const x = d3.scaleLinear().domain([0, Math.max(rows.length - 1, 1)]).range([0, f.innerW]);
  const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.before) || 1]).nice()
    .range([f.innerH, 0]);

  const area = (acc) => d3.area().x((d) => x(d.i)).y0(y(0)).y1((d) => y(acc(d)))
    .curve(d3.curveLinear);

  if (rows.length > 0) {
    f.g.append('path').datum(rows).attr('fill', COLORS.net).attr('fill-opacity', 0.9)
      .attr('d', area((d) => d.before));
    f.g.append('path').datum(rows).attr('fill', COLORS.after).attr('fill-opacity', 0.9)
      .attr('d', area((d) => d.after));
  }
  f.g.append('line')
    .attr('x1', 0)
    .attr('x2', f.innerW)
    .attr('y1', y(0))
    .attr('y2', y(0))
    .attr('stroke', COLORS.ldcZero)
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 1.2);

  drawAxes(f, x, y, {
    xAxis: d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')),
    xLabel: cfg.xLabel,
  });

  addCrosshair(f, tip, (mx) => {
    if (rows.length === 0) return null;
    const i = Math.min(rows.length - 1, Math.max(0, Math.round(x.invert(mx))));
    const d = rows[i];
    return {
      pos: x(i),
      title: `Rank ${i + 1} of ${rows.length}`,
      rows: [
        { name: cfg.beforeLabel, value: `${fmtMw(d.before)} MW`, color: COLORS.net },
        { name: cfg.afterLabel, value: `${fmtMw(d.after)} MW`, color: COLORS.after },
        { name: cfg.movedLabel, value: `${fmtMw(d.moved)} MW`, color: COLORS.ev },
      ],
    };
  });
}

const desc = (a, b) => b - a;
const toRows = (before, after, moved) => before.map((v, i) => ({
  i, before: v, after: after[i], moved: moved[i],
}));

// Load duration curve: hours with positive net demand, each series sorted independently.
export function drawLdc(svgNode, scn, tip, flexShare) {
  const pos = scn.hours.filter((h) => h.net > 0);
  drawDurationCurve(svgNode, tip, {
    rows: toRows(
      pos.map((h) => h.net).sort(desc),
      pos.map((h) => h.netAfter).sort(desc),
      pos.map((h) => h.dispatch).sort(desc),
    ),
    xLabel: `Hours with positive net demand, ranked (${pos.length} of ${scn.hours.length})`,
    beforeLabel: 'Net demand',
    afterLabel: afterLabel(flexShare),
    movedLabel: 'EV load moved out',
  });
}

// Generation curtailment curve: hours with surplus (negative net demand), shown as the MW of
// generation that would be curtailed, each series sorted independently.
export function drawCurtailment(svgNode, scn, tip, flexShare) {
  const neg = scn.hours.filter((h) => h.net < 0);
  drawDurationCurve(svgNode, tip, {
    rows: toRows(
      neg.map((h) => -h.net).sort(desc),
      neg.map((h) => Math.max(-h.netAfter, 0)).sort(desc),
      neg.map((h) => -h.dispatch).sort(desc),
    ),
    xLabel: `Hours with surplus generation, ranked (${neg.length} of ${scn.hours.length})`,
    beforeLabel: 'Curtailed generation',
    afterLabel: curtailedAfterLabel(flexShare),
    movedLabel: 'EV load moved in',
  });
}

export const curtailmentLegend = (flexShare) => [
  { label: 'Curtailed generation', color: COLORS.net, opacity: 0.9 },
  { label: curtailedAfterLabel(flexShare), color: COLORS.after },
];
