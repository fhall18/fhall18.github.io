import * as d3 from 'd3';

export const COLORS = {
  current: '#e08a3c', // current fuel system
  hp: '#3498db', // heat pump
  muted: '#8a8a8a',
};

export const fmtUsd = d3.format('$,.0f');
export const fmtNum = d3.format(',.0f');
export const fmtPct = d3.format('.0%');
export const fmtSignedPct = d3.format('+.0%');

// Round dollar figures to the nearest $10 so the page doesn't imply false precision.
export const usd10 = (v) => fmtUsd(Math.round(v / 10) * 10);

// Grouped bar chart. `groups` is [{ label, sublabel, values: { [seriesKey]: number }, flag }],
// `series` is [{ key, label, color }]. A group with `flag` gets a dot under its label
// (used to mark bill-based seasons). Hover text comes from SVG <title> elements.
export function drawGroupedBars(svgNode, { groups, series, yLabel = 'Cost per season' }) {
  // Drawn close to the results column's real width so text renders near its CSS size.
  const width = 520;
  const height = 280;
  const margin = {
    top: 12, right: 12, bottom: 52, left: 64,
  };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.select(svgNode).attr('viewBox', `0 0 ${width} ${height}`);
  svg.selectAll('*').remove();
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand().domain(groups.map((d) => d.label)).range([0, innerW]).padding(0.25);
  const x1 = d3.scaleBand().domain(series.map((s) => s.key)).range([0, x0.bandwidth()])
    .padding(0.08);
  const maxVal = d3.max(groups, (d) => d3.max(series, (s) => d.values[s.key])) || 1;
  const y = d3.scaleLinear().domain([0, maxVal * 1.08]).nice().range([innerH, 0]);

  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(''));
  g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5).tickFormat(fmtUsd));
  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -52)
    .attr('text-anchor', 'middle')
    .text(yLabel);

  const xAxis = g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x0).tickSizeOuter(0));
  // Second line under each group label, such as "12% colder than normal".
  xAxis.selectAll('.tick')
    .append('text')
    .attr('class', 'tick-sub')
    .attr('y', 30)
    .attr('fill', 'currentColor')
    .text((label) => {
      const grp = groups.find((d) => d.label === label);
      return grp && grp.sublabel ? grp.sublabel : '';
    });
  xAxis.selectAll('.tick')
    .filter((label) => (groups.find((d) => d.label === label) || {}).flag)
    .append('circle')
    .attr('class', 'tick-flag')
    .attr('cy', 44)
    .attr('r', 3.5);

  const group = g.selectAll('.bar-group')
    .data(groups)
    .join('g')
    .attr('class', 'bar-group')
    .attr('transform', (d) => `translate(${x0(d.label)},0)`);

  group.selectAll('rect')
    .data((d) => series.map((s) => ({ s, value: d.values[s.key], group: d.label })))
    .join('rect')
    .attr('x', (d) => x1(d.s.key))
    .attr('width', x1.bandwidth())
    .attr('y', (d) => y(Math.max(0, d.value)))
    .attr('height', (d) => Math.abs(y(0) - y(d.value)))
    .attr('rx', 2)
    .attr('fill', (d) => d.s.color)
    .append('title')
    .text((d) => `${d.group}, ${d.s.label}: ${fmtUsd(d.value)}`);
}
