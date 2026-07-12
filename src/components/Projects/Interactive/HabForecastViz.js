import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import * as d3 from 'd3';
import { parquetRead } from 'hyparquet';

const PARQUET_URL = 'https://raw.githubusercontent.com/fhall18/kuanos/main/data/predictions.parquet';
const BEACH_STATUS_URL = 'https://raw.githubusercontent.com/fhall18/kuanos/main/data/beach_status.parquet';

// Get current time in ET timezone
const getCurrentTimeET = () => {
  const now = new Date();
  // Format current time as it would appear in ET, then parse it
  // This gives us a Date object that aligns with how datetime_local strings are parsed
  const etString = now.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  // Parse the ET string (browser will interpret in local timezone, matching our data parsing)
  return new Date(etString.replace(',', ''));
};

const formatET = (isoStr) => {
  const d = new Date(isoStr);
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const HabForecastViz = () => {
  const [data, setData] = useState([]);
  const [predictedAtOptions, setPredictedAtOptions] = useState([]);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [beachStatus, setBeachStatus] = useState([]);
  const svgRef = useRef(null);
  const lineSvgRef = useRef(null);

  // Fetch and parse the parquet file
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(PARQUET_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        const rows = [];
        await parquetRead({
          file: arrayBuffer,
          onComplete: (result) => {
            result.forEach((row) => {
              const dtStr = row[25]; // datetime_local
              const predictedAt = row[26]; // predicted_at
              const pred = row[27]; // raw_preds
              const actual = row[28]; // target
              if (dtStr) {
                rows.push({
                  date: new Date(dtStr),
                  predictedAt: predictedAt || null,
                  predicted: pred,
                  actual: actual != null ? actual : null,
                });
              }
            });
          },
        });

        rows.sort((a, b) => a.date - b.date);

        // Extract unique predicted_at values sorted descending
        const uniquePredictedAt = [...new Set(
          rows.map((r) => r.predictedAt).filter(Boolean),
        )].sort((a, b) => new Date(b) - new Date(a));

        setPredictedAtOptions(uniquePredictedAt);
        if (uniquePredictedAt.length > 0) {
          setRangeStart(0);
          setRangeEnd(Math.min(2, uniquePredictedAt.length - 1));
        }
        setData(rows);

        // Fetch beach status data
        // updated_at is in local time (America/New_York),
        // matching the predictions datetime_local column.
        const bsResp = await fetch(BEACH_STATUS_URL);
        if (bsResp.ok) {
          const bsBuf = await bsResp.arrayBuffer();
          const statusRows = [];
          await parquetRead({
            file: bsBuf,
            onComplete: (bsResult) => {
              bsResult.forEach((r) => {
                const name = r[0]; // beach_name
                const st = r[1]; // status
                const updatedAt = r[2]; // updated_at (ET)
                if (name && st && updatedAt) {
                  statusRows.push({
                    beach: name,
                    status: st.toLowerCase(),
                    updatedAt: new Date(updatedAt),
                  });
                }
              });
            },
          });
          setBeachStatus(statusRows);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Smooth a series with a rolling average
  const smooth = (rows, window) => {
    const clipped = rows.map((d) => ({
      ...d,
      predicted: d.predicted != null ? Math.max(0, Math.min(1, d.predicted)) : null,
    }));
    return clipped.map((d, i) => {
      const start = Math.max(0, i - window + 1);
      const windowSlice = clipped.slice(start, i + 1);
      const preds = windowSlice.map((w) => w.predicted).filter((v) => v != null);
      return {
        ...d,
        predicted: preds.length > 0 ? preds.reduce((s, v) => s + v, 0) / preds.length : null,
      };
    });
  };

  // Draw chart
  const drawChart = useCallback(() => {
    if (!svgRef.current || data.length === 0 || predictedAtOptions.length === 0) return;

    // Derive selected forecasts from the range slider indices
    const lo = Math.min(rangeStart, rangeEnd);
    const hi = Math.max(rangeStart, rangeEnd);
    const selectedForecasts = predictedAtOptions.slice(lo, hi + 1);
    if (selectedForecasts.length === 0) return;

    const WINDOW = 3;

    // Build smoothed series for each selected forecast, sorted oldest→newest
    const sortedSelected = [...selectedForecasts]
      .sort((a, b) => new Date(a) - new Date(b));
    const n = sortedSelected.length;

    const seriesMap = {};
    sortedSelected.forEach((ts) => {
      const raw = data.filter((d) => d.predictedAt === ts);
      const smoothed = smooth(raw, WINDOW);
      seriesMap[ts] = new Map(smoothed.map((d) => [d.date.getTime(), d.predicted]));
    });

    // Build a common set of time points (union of all dates)
    const allDatesSet = new Set();
    sortedSelected.forEach((ts) => {
      seriesMap[ts].forEach((val, key) => { allDatesSet.add(key); });
    });
    const allDates = [...allDatesSet].sort((a, b) => a - b);
    const m = allDates.length;
    if (m === 0) return;

    // Build matrix: rows = time points, columns = forecast layers
    // Normalize each value by the number of forecasts present at that time point
    // so the sum equals the average value across overlapping forecasts
    const FADE_POINTS = 6;
    const rawMatrix = allDates.map((t) => {
      const row = {};
      let count = 0;
      sortedSelected.forEach((ts, i) => {
        const val = seriesMap[ts].get(t) || 0;
        row[i] = val;
        if (val > 0) count += 1;
      });
      // Normalize by number of active forecasts at this time point
      const divisor = count || 1;
      sortedSelected.forEach((ts, i) => {
        row[i] /= divisor;
      });
      return row;
    });
    // Smooth edges: fade each layer in/out over FADE_POINTS
    const matrix = rawMatrix.map((row) => ({ ...row }));
    sortedSelected.forEach((ts, i) => {
      // Find first and last non-zero indices for this layer
      let first = -1;
      let last = -1;
      for (let j = 0; j < matrix.length; j += 1) {
        if (rawMatrix[j][i] > 0) {
          if (first === -1) first = j;
          last = j;
        }
      }
      if (first === -1) return;
      // Fade in
      for (let j = first; j < Math.min(first + FADE_POINTS, matrix.length); j += 1) {
        const t = (j - first) / FADE_POINTS;
        matrix[j][i] = rawMatrix[j][i] * t;
      }
      // Fade out
      for (let j = last; j > Math.max(last - FADE_POINTS, -1); j -= 1) {
        const t = (last - j) / FADE_POINTS;
        matrix[j][i] = rawMatrix[j][i] * t;
      }
    });

    // Stack with silhouette offset (centered around 0)
    const stack = d3.stack()
      .keys(d3.range(n))
      .offset(d3.stackOffsetSilhouette)
      .order(d3.stackOrderNone);

    const layers = stack(matrix);

    const container = svgRef.current.parentElement;
    const width = container.clientWidth || 700;
    const height = 360;
    const margin = {
      top: 30, right: 30, bottom: 50, left: 55,
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales — fixed y domain [-0.5, 0.5] (centered stream, max total height = 1)
    const x = d3.scaleLinear()
      .domain([0, m - 1])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([-0.5, 0.5])
      .range([innerHeight, 0]);

    const z = d3.interpolateCool;

    // Risk band backgrounds (symmetric around 0)
    // Stream total height = sum; half above, half below center
    // Low: sum 0–0.1 → stream within ±0.05
    // Medium: sum 0.1–0.3 → stream within ±0.15
    // High: sum 0.3–1.0 → stream within ±0.5
    const riskBands = [
      {
        top: 0.05, bottom: -0.05, color: '#7e7e7e', label: 'Low',
      },
      {
        top: 0.15, bottom: 0.05, color: '#d0d0d0', label: 'Medium',
      },
      {
        top: 0.5, bottom: 0.15, color: '#ffffff', label: 'High',
      },
    ];
    riskBands.forEach((band) => {
      // Upper half
      g.append('rect')
        .attr('x', 0)
        .attr('width', innerWidth)
        .attr('y', y(band.top))
        .attr('height', y(band.bottom) - y(band.top))
        .attr('fill', band.color)
        .attr('opacity', 0.3);
      // Lower half (mirror)
      g.append('rect')
        .attr('x', 0)
        .attr('width', innerWidth)
        .attr('y', y(-band.bottom))
        .attr('height', y(-band.top) - y(-band.bottom))
        .attr('fill', band.color)
        .attr('opacity', 0.3);
      // Label on the left side of the plot (upper side only)
      g.append('text')
        .attr('x', -4)
        .attr('y', y((band.top + band.bottom) / 2))
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '10px')
        .style('fill', '#666')
        .text(band.label);
    });

    // Center line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', '#999')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '3,3');

    // Area generator
    const area = d3.area()
      .x((d, i) => x(i))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveBasis);

    // Draw layers — each forecast gets a unique color from interpolateCool
    g.selectAll('path')
      .data(layers)
      .join('path')
      .attr('d', area)
      .attr('fill', (d, i) => z(i / Math.max(n - 1, 1)));

    // X-axis with date labels
    const xTime = d3.scaleTime()
      .domain([new Date(allDates[0]), new Date(allDates[m - 1])])
      .range([0, innerWidth]);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xTime).ticks(6).tickFormat(d3.timeFormat('%b %d')))
      .selectAll('text')
      .style('font-size', '11px');

    // Y-axis (line only, no tick labels)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#000');

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -48)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('HAB risk index');

    // Current time indicator
    const now = getCurrentTimeET();
    const [xTimeMin, xTimeMax] = xTime.domain();
    if (now >= xTimeMin && now <= xTimeMax) {
      g.append('line')
        .attr('x1', xTime(now))
        .attr('x2', xTime(now))
        .attr('y1', 3)
        .attr('y2', innerHeight - 3)
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.9);
      g.append('text')
        .attr('x', xTime(now) + 5)
        .attr('y', 25)
        .style('font-size', '11px')
        .style('fill', '#000')
        .text('Current time');
    }

    // Tooltip interaction
    const tooltip = d3.select(container).select('.hab-tooltip');

    svg.append('rect')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const i = Math.round(x.invert(mx - margin.left));
        if (i < 0 || i >= m) return;
        const dateStr = d3.timeFormat('%b %d, %H:%M')(new Date(allDates[i]));
        let total = 0;
        sortedSelected.forEach((ts, idx) => { total += matrix[i][idx]; });
        let riskLabel = 'Low';
        if (total >= 0.3) riskLabel = 'High';
        else if (total >= 0.1) riskLabel = 'Medium';
        let html = `<strong>${dateStr}</strong><br/>Risk: ${total.toFixed(3)} (${riskLabel})`;
        sortedSelected.forEach((ts, idx) => {
          const val = matrix[i][idx];
          if (val > 0) {
            html += `<br/><span style="color:${z(idx / Math.max(n - 1, 1))};">\u25CF</span> `
              + `${formatET(ts)}: ${val.toFixed(3)}`;
          }
        });
        tooltip
          .style('display', 'block')
          .style('left', `${x(i) + margin.left + 10}px`)
          .style('top', `${margin.top + 20}px`)
          .html(html);
      })
      .on('mouseleave', () => {
        tooltip.style('display', 'none');
      });
  }, [data, predictedAtOptions, rangeStart, rangeEnd]);

  // Draw the original line chart below
  const drawLineChart = useCallback(() => {
    if (!lineSvgRef.current || data.length === 0 || predictedAtOptions.length === 0) return;

    const lo = Math.min(rangeStart, rangeEnd);
    const hi = Math.max(rangeStart, rangeEnd);
    const selectedForecasts = predictedAtOptions.slice(lo, hi + 1);
    if (selectedForecasts.length === 0) return;

    const WINDOW = 3;
    const sortedSelected = [...selectedForecasts]
      .sort((a, b) => new Date(a) - new Date(b));
    const latestForecast = sortedSelected[sortedSelected.length - 1];

    const seriesList = sortedSelected.map((ts) => {
      const raw = data.filter((d) => d.predictedAt === ts);
      return { ts, data: smooth(raw, WINDOW), isLatest: ts === latestForecast };
    });

    const allPoints = seriesList.flatMap((s) => s.data);

    const container = lineSvgRef.current.parentElement;
    const width = container.clientWidth || 700;
    const height = 300;
    const margin = {
      top: 20, right: 30, bottom: 50, left: 55,
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(lineSvgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(allPoints, (d) => d.date))
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    // Risk band backgrounds for y-axis
    const riskBands = [
      { top: 0.1, bottom: 0, color: '#7e7e7e' }, // Low 7e7e7e
      { top: 0.3, bottom: 0.1, color: '#d0d0d0' }, // Medium d0d0d0
      { top: 1.0, bottom: 0.3, color: '#ffffff' }, // High ffffff
    ];
    riskBands.forEach((band) => {
      g.append('rect')
        .attr('x', 0)
        .attr('width', innerWidth)
        .attr('y', y(band.top))
        .attr('height', y(band.bottom) - y(band.top))
        .attr('fill', band.color)
        .attr('opacity', 0.3);
    });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b %d')))
      .selectAll('text')
      .style('font-size', '11px');

    g.append('g')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .style('font-size', '11px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -48)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('HAB risk index');

    // Beach status shading
    // Build aggregated worst-status time series from beach data
    if (beachStatus.length > 0) {
      // Get unique update times sorted ascending
      const statusTimes = [...new Set(
        beachStatus.map((s) => s.updatedAt.getTime()),
      )].sort((a, b) => a - b);

      // For each time, find worst status across all beaches
      // Priority: closure > warning > open
      const statusPriority = (s) => {
        if (s.includes('clos')) return 2;
        if (s.includes('warn') || s.includes('advisory')) return 1;
        return 0;
      };

      const intervals = statusTimes.map((t) => {
        const atTime = beachStatus.filter(
          (s) => s.updatedAt.getTime() === t,
        );
        const worst = d3.max(atTime, (s) => statusPriority(s.status));
        return { time: new Date(t), level: worst };
      });

      // Draw shaded rectangles for each interval
      // Only shade closure (red) and warning (orange), not open (green)
      const [xMin, xMax] = x.domain();
      for (let idx = 0; idx < intervals.length; idx += 1) {
        const iv = intervals[idx];
        if (iv.level === 0) continue; // eslint-disable-line no-continue
        const tStart = Math.max(iv.time, xMin);
        const tEnd = idx < intervals.length - 1
          ? Math.min(intervals[idx + 1].time, xMax)
          : xMax;
        if (tStart >= tEnd) continue; // eslint-disable-line no-continue
        const color = iv.level >= 2 ? '#ff3c00' : '#f5c124';
        g.append('rect')
          .attr('x', x(tStart))
          .attr('width', x(tEnd) - x(tStart))
          .attr('y', 0)
          .attr('height', innerHeight)
          .attr('fill', color)
          .attr('opacity', 0.7);
      }
    }

    const line = d3.line()
      .defined((d) => d.predicted != null)
      .x((d) => x(d.date))
      .y((d) => y(d.predicted))
      .curve(d3.curveMonotoneX);

    const historicalSeries = seriesList.filter((s) => !s.isLatest);
    const latestSeries = seriesList.find((s) => s.isLatest);

    historicalSeries.forEach((s) => {
      g.append('path')
        .datum(s.data)
        .attr('fill', 'none')
        .attr('stroke', '#364F6B')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6)
        .attr('d', line);
    });

    if (latestSeries) {
      g.append('path')
        .datum(latestSeries.data)
        .attr('fill', 'none')
        .attr('stroke', '#FFAA00')
        .attr('stroke-width', 2.5)
        .attr('d', line);
    }

    // Current time indicator
    const now = getCurrentTimeET();
    const [xMin, xMax] = x.domain();
    if (now >= xMin && now <= xMax) {
      g.append('line')
        .attr('x1', x(now))
        .attr('x2', x(now))
        .attr('y1', 3)
        .attr('y2', innerHeight)
        .attr('stroke', '#000')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.9);
      g.append('text')
        .attr('x', x(now) + 5)
        .attr('y', 25)
        .style('font-size', '11px')
        .style('fill', '#000')
        .text('Current time');
    }

    // Legend - horizontal row at top
    const legend = g.append('g')
      .attr('transform', 'translate(0, -15)');

    let legendX = 0;

    // Latest forecast
    legend.append('line')
      .attr('x1', legendX)
      .attr('x2', legendX + 20)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', '#FFAA00')
      .attr('stroke-width', 2.5);
    legend.append('text')
      .attr('x', legendX + 25)
      .attr('y', 4)
      .style('font-size', '11px')
      .text('Latest forecast');
    legendX += 130;

    // Prior forecasts
    if (historicalSeries.length > 0) {
      legend.append('line')
        .attr('x1', legendX)
        .attr('x2', legendX + 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#364F6B')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6);
      legend.append('text')
        .attr('x', legendX + 25)
        .attr('y', 4)
        .style('font-size', '11px')
        .text('Prior forecasts');
      legendX += 120;
    }

    // Beach status legend entries (always show closure and warning)
    legend.append('rect')
      .attr('x', legendX)
      .attr('y', -6)
      .attr('width', 20)
      .attr('height', 12)
      .attr('fill', '#ff3c00')
      .attr('opacity', 0.7);
    legend.append('text')
      .attr('x', legendX + 25)
      .attr('y', 4)
      .style('font-size', '11px')
      .text('Beach closure');
    legendX += 125;

    legend.append('rect')
      .attr('x', legendX)
      .attr('y', -6)
      .attr('width', 20)
      .attr('height', 12)
      .attr('fill', '#f5c124')
      .attr('opacity', 0.7);
    legend.append('text')
      .attr('x', legendX + 25)
      .attr('y', 4)
      .style('font-size', '11px')
      .text('Beach warning');
  }, [data, predictedAtOptions, rangeStart, rangeEnd, beachStatus]);

  useEffect(() => {
    drawChart();
    drawLineChart();
  }, [drawChart, drawLineChart]);

  if (loading) return <div className="loading">Loading HAB forecast data...</div>;
  if (error) return <div className="error">Error loading data: {error}</div>;

  return (
    <div className="hab-forecast-container" style={{ position: 'relative', width: '100%' }}>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .range-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: all;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #364F6B;
          cursor: pointer;
          border: none;
          margin-top: 3px;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: all;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #364F6B;
          cursor: pointer;
          border: none;
        }
        .range-thumb::-webkit-slider-runnable-track {
          height: 20px;
        }
        .range-thumb::-moz-range-track {
          height: 20px;
          background: transparent;
        }
      `,
      }}
      />
      <h3>Harmful Algal Bloom Forecast</h3>
      <p style={{ fontSize: '14px', color: '#666' }}>
        <h4>IMPORTANT NOTE</h4>
        {' '}
        <a
          href="https://www.burlingtonvt.gov/1219/Beach-Closure-Tracker"
          target="_blank"
          rel="noopener noreferrer"
        >
          Burlington, VT Beach Closure Tracker
        </a>
        {' '}
        has the most accurate information.
        This tool is for personal use only and should not
        be used to make decisions about swimming or other
        recreational activities where water quality is a consideration.
        There is also a
        {' '}
        <a
          href="https://experience.arcgis.com/experience/194da900279747efa8cee01b57fb23e6/page/Tracker"
          target="_blank"
          rel="noopener noreferrer"
        >
          Public Reporting Tool
        </a>
        {' '}
        that tracks harmful algal bloom occurrences.
      </p>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Forecast runs:
        </span>
        {predictedAtOptions.length > 1 && (() => {
          const maxIdx = predictedAtOptions.length - 1;
          // Slider values are inverted: 0=oldest(left), max=newest(right)
          const leftIdx = maxIdx - Math.max(rangeStart, rangeEnd);
          const rightIdx = maxIdx - Math.min(rangeStart, rangeEnd);
          return (
            <div style={{ padding: '0 4px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#666',
                marginBottom: '2px',
                paddingLeft: '55px',
                paddingRight: '30px',
              }}
              >
                <span>{formatET(predictedAtOptions[maxIdx - leftIdx])}</span>
                <span>{formatET(predictedAtOptions[maxIdx - rightIdx])}</span>
              </div>
              <div style={{
                marginLeft: '55px', marginRight: '30px', position: 'relative', height: '20px',
              }}
              >
                <input
                  type="range"
                  min={0}
                  max={maxIdx}
                  value={maxIdx - rangeStart}
                  onChange={(e) => setRangeStart(maxIdx - Number(e.target.value))}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    top: 0,
                    height: '20px',
                    margin: 0,
                    pointerEvents: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: 'transparent',
                    zIndex: 2,
                  }}
                  className="range-thumb"
                />
                <input
                  type="range"
                  min={0}
                  max={maxIdx}
                  value={maxIdx - rangeEnd}
                  onChange={(e) => setRangeEnd(maxIdx - Number(e.target.value))}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    top: 0,
                    height: '20px',
                    margin: 0,
                    pointerEvents: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: 'transparent',
                    zIndex: 2,
                  }}
                  className="range-thumb"
                />
                {/* Track background */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: 0,
                  right: 0,
                  height: '6px',
                  background: '#ddd',
                  borderRadius: '3px',
                }}
                />
                {/* Filled portion with solid blue */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: `${(leftIdx / maxIdx) * 100}%`,
                  width: `${((rightIdx - leftIdx) / maxIdx) * 100}%`,
                  height: '6px',
                  background: '#364F6B',
                  borderRadius: '3px',
                }}
                />
              </div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                {Math.abs(rangeEnd - rangeStart) + 1} forecast(s) selected
              </div>
            </div>
          );
        })()}
      </div>
      <h4 style={{ margin: '0 0 0px 0' }}>Stream-graph</h4>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
        <div
          className="hab-tooltip"
          style={{
            display: 'none',
            position: 'absolute',
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '12px',
            pointerEvents: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        />
      </div>
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ margin: '0 0 4px 0' }}>Actual Forecasts</h4>
        <svg ref={lineSvgRef} style={{ width: '100%', height: 'auto' }} />
      </div>
      <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
        Data: {data.length} hourly observations &middot; Source:&nbsp;
        <a href="https://github.com/fhall18/kuanos" target="_blank" rel="noopener noreferrer">kuanos</a>
      </p>
    </div>
  );
};

export default HabForecastViz;
