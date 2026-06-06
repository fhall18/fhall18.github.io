import React, { useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import D3Chart from './D3Chart';
import HexMap from './HexMap';

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

  const handleStateChange = (name) => {
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
      { category: 'Gas car', value: milesPerDollarGas, color: '#FFAA00' },
      { category: 'EV', value: milesPerDollarEV, color: '#364F6B' },
      { category: 'EV (off-peak)', value: milesPerDollarEVOffPeak, color: '#519A66' },
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
      .text('Distance in miles');

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
      <h3>How far can you get on $1?</h3>
      <p className="viz-description">
        Select a state to load local energy prices, then adjust to compare
        how many miles you can travel on a single dollar. Data is provided
        by the U.S. Energy Information Administration and AAA, and assumes an
        EV efficiency of 3 miles/kWh and a gas car MPG of 24 (the 2026 U.S.
        passenger car averages).
      </p>

      <HexMap
        selectedState={selectedState}
        onStateSelect={handleStateChange}
        stateData={stateData}
      />

      <div className="viz-legend">
        <span className="legend-item" style={{ color: '#FFAA00' }}>&#9632; Gas car</span>
        <span className="legend-item electric" style={{ color: '#364F6B' }}>&#9632; EV (Retail)</span>
        <span className="legend-item" style={{ color: '#519A66' }}>&#9632; EV (off-peak, 40% discount)</span>
      </div>

      <D3Chart
        renderChart={renderChart}
        data={chartData}
        height={280}
      />

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
    </div>
  );
};

export default MilesPerDollarViz;
