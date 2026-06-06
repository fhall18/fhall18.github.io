import React, { useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import D3Chart from './D3Chart';

const MilesPerDollarViz = () => {
  const [stateData, setStateData] = useState([]);
  const [selectedState, setSelectedState] = useState('Vermont');
  const [electricRate, setElectricRate] = useState(0.22);
  const [gasPricePerGallon, setGasPricePerGallon] = useState(3.80);
  const [evEfficiency, setEvEfficiency] = useState(3.0);
  const [gasCarMpg, setGasCarMpg] = useState(28);

  const offPeakDiscount = 0.4;
  const offPeakRate = electricRate * (1 - offPeakDiscount);

  useEffect(() => {
    d3.csv(`${process.env.PUBLIC_URL}/data/state_energy_prices.csv`).then((rows) => {
      setStateData(rows);
      const initial = rows.find((r) => r.state === 'Vermont');
      if (initial) {
        setElectricRate(parseFloat(initial.residential_electric_rate) / 100);
        setGasPricePerGallon(parseFloat(initial.regular_gas));
      }
    });
  }, []);

  const handleStateChange = (e) => {
    const name = e.target.value;
    setSelectedState(name);
    const row = stateData.find((r) => r.state === name);
    if (row) {
      setElectricRate(parseFloat(row.residential_electric_rate) / 100);
      setGasPricePerGallon(parseFloat(row.regular_gas));
    }
  };

  const computeData = () => {
    const milesPerDollarGas = gasCarMpg / gasPricePerGallon;
    const milesPerDollarEV = evEfficiency / electricRate;
    const milesPerDollarEVOffPeak = evEfficiency / offPeakRate;

    return [
      { category: 'Gas Car', value: milesPerDollarGas, color: '#e74c3c' },
      { category: 'EV (Retail Rate)', value: milesPerDollarEV, color: '#3498db' },
      { category: 'EV (Off-Peak Rate)', value: milesPerDollarEVOffPeak, color: '#27ae60' },
    ];
  };

  const chartData = computeData();

  const renderChart = useCallback((svg, data, dim) => {
    const g = svg.append('g')
      .attr('transform', `translate(${dim.margin.left},${dim.margin.top})`);

    const y = d3.scaleBand()
      .domain(data.map((d) => d.category))
      .range([0, dim.innerHeight])
      .padding(0.3);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) * 1.15])
      .range([0, dim.innerWidth]);

    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('font-size', '13px');

    g.append('g')
      .attr('transform', `translate(0,${dim.innerHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d3.format('.0f')(d)} mi`))
      .selectAll('text')
      .style('font-size', '11px');

    g.append('text')
      .attr('x', dim.innerWidth / 2)
      .attr('y', dim.innerHeight + 40)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Miles per $1');

    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', (d) => y(d.category))
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', (d) => x(d.value))
      .attr('fill', (d) => d.color)
      .attr('rx', 3);

    g.selectAll('.label')
      .data(data)
      .join('text')
      .attr('class', 'label')
      .attr('y', (d) => y(d.category) + y.bandwidth() / 2 + 5)
      .attr('x', (d) => x(d.value) + 8)
      .style('font-size', '13px')
      .style('font-weight', 'bold')
      .text((d) => `${d3.format('.1f')(d.value)} miles`);
  }, []);

  return (
    <div className="interactive-viz">
      <h3>How Far Can $1 Take You?</h3>
      <p className="viz-description">
        Select a state to load local energy prices, then adjust to compare
        how many miles you can travel on a single dollar.
      </p>

      <div className="viz-state-selector">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label htmlFor="state-select">State</label>
        <select
          id="state-select"
          value={selectedState}
          onChange={handleStateChange}
        >
          {stateData.map((row) => (
            <option key={row.state} value={row.state}>{row.state}</option>
          ))}
        </select>
      </div>

      <div className="viz-controls">
        <div className="control-group">
          <label htmlFor="electric-rate">
            Electric Rate ($/kWh): <strong>${electricRate.toFixed(3)}</strong>
          </label>
          <input
            id="electric-rate"
            type="range"
            min="0.05"
            max="0.50"
            step="0.001"
            value={electricRate}
            onChange={(e) => setElectricRate(parseFloat(e.target.value))}
          />
          <span className="sub-label">Off-peak: ${offPeakRate.toFixed(3)}/kWh (40% discount)</span>
        </div>

        <div className="control-group">
          <label htmlFor="gas-price">
            Gas Price ($/gallon): <strong>${gasPricePerGallon.toFixed(2)}</strong>
          </label>
          <input
            id="gas-price"
            type="range"
            min="2.00"
            max="6.00"
            step="0.05"
            value={gasPricePerGallon}
            onChange={(e) => setGasPricePerGallon(parseFloat(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="ev-efficiency">
            EV Efficiency (mi/kWh): <strong>{evEfficiency.toFixed(1)}</strong>
          </label>
          <input
            id="ev-efficiency"
            type="range"
            min="2.0"
            max="5.0"
            step="0.1"
            value={evEfficiency}
            onChange={(e) => setEvEfficiency(parseFloat(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="gas-mpg">
            Gas Car (MPG): <strong>{gasCarMpg}</strong>
          </label>
          <input
            id="gas-mpg"
            type="range"
            min="15"
            max="50"
            step="1"
            value={gasCarMpg}
            onChange={(e) => setGasCarMpg(parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      <D3Chart
        renderChart={renderChart}
        data={chartData}
        height={280}
      />

      <div className="viz-legend">
        <span className="legend-item fossil">&#9632; Gas Car</span>
        <span className="legend-item electric">&#9632; EV (Retail)</span>
        <span className="legend-item" style={{ color: '#27ae60' }}>&#9632; EV (Off-Peak, 40% discount)</span>
      </div>
    </div>
  );
};

export default MilesPerDollarViz;
