import React, { useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import D3Chart from './D3Chart';
import HexMap from './HexMap';

const MilesPerDollarViz = () => {
  const [stateData, setStateData] = useState([]);
  const [selectedState, setSelectedState] = useState('Vermont');
  const [electricRate, setElectricRate] = useState(0.22);
  const [gasPricePerGallon, setGasPricePerGallon] = useState(4.50);
  const [evEfficiency, setEvEfficiency] = useState(4.0);
  const [gasCarMpg, setGasCarMpg] = useState(24);
  const [meanTemp, setMeanTemp] = useState(6.0);

  const offPeakDiscount = 0.3;
  const offPeakRate = electricRate * (1 - offPeakDiscount);

  useEffect(() => {
    d3.csv(`${process.env.PUBLIC_URL}/data/state_energy_prices.csv`).then((rows) => {
      setStateData(rows);
      const initial = rows.find((r) => r.state === 'Vermont');
      if (initial) {
        setElectricRate(parseFloat(initial.residential_electric_rate) / 100);
        setGasPricePerGallon(parseFloat(initial.regular_gas));
        setMeanTemp(parseFloat(initial.mean_temp_c) || 6.0);
      }
    });
  }, []);

  const handleStateChange = (name) => {
    setSelectedState(name);
    const row = stateData.find((r) => r.state === name);
    if (row) {
      setElectricRate(parseFloat(row.residential_electric_rate) / 100);
      setGasPricePerGallon(parseFloat(row.regular_gas));
      setMeanTemp(parseFloat(row.mean_temp_c) || 6.0);
    }
  };

  const computeData = () => {
    const t = meanTemp;
    const tempFactor = 0.000011 * t ** 3
      + 0.00045 * t ** 2 - 0.038 * t + 1.57;
    const adjEfficiency = evEfficiency / tempFactor;
    const milesPerDollarGas = gasCarMpg / gasPricePerGallon;
    const milesPerDollarEV = adjEfficiency / electricRate;
    const milesPerDollarEVOffPeak = adjEfficiency / offPeakRate;

    return [
      { category: 'Gas car', value: milesPerDollarGas, color: '#FFAA00' },
      { category: 'EV', value: milesPerDollarEV, color: '#364F6B' },
      { category: 'EV (off-peak)', value: milesPerDollarEVOffPeak, color: '#519A66' },
    ];
  };

  const tempFactor = 0.000011 * meanTemp ** 3
    + 0.00045 * meanTemp ** 2 - 0.038 * meanTemp + 1.57;
  const adjEfficiency = evEfficiency / tempFactor;

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

    g.selectAll('.road-line')
      .data(data)
      .join('line')
      .attr('class', 'road-line')
      .attr('x1', 4)
      .attr('x2', (d) => x(d.value) - 4)
      .attr('y1', (d) => y(d.category) + y.bandwidth() / 2)
      .attr('y2', (d) => y(d.category) + y.bandwidth() / 2)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8 6')
      .attr('opacity', 0.8);

    g.selectAll('.car-emoji')
      .data(data)
      .join('image')
      .attr('class', 'car-emoji')
      .attr('href', (d) => (d.category === 'Gas car'
        ? `${process.env.PUBLIC_URL}/images/random/gas_car_emoji.png`
        : `${process.env.PUBLIC_URL}/images/random/ev_emoji.png`))
      .attr('x', (d) => x(d.value) - (d.category === 'Gas car' ? 62 : 55))
      .attr('y', (d) => y(d.category) - (d.category === 'Gas car' ? 35 : 33))
      .attr('width', (d) => (d.category === 'Gas car' ? 60 : 52))
      .attr('height', (d) => (d.category === 'Gas car' ? 45 : 38));

    g.selectAll('.label')
      .data(data)
      .join('text')
      .attr('class', 'label')
      .attr('y', (d) => y(d.category) + y.bandwidth() / 2 + 5)
      .attr('x', (d) => x(d.value) + 18)
      .style('font-size', '13px')
      .style('font-weight', 'bold')
      .text((d) => `${d3.format('.1f')(d.value)} miles`);
  }, []);

  return (
    <div className="interactive-viz">
      <h3>How far can you get on $1?</h3>
      <p className="viz-description">
        Select a state to load local energy prices and weather data, then adjust to compare
        how many miles you can travel on a single dollar.
      </p>

      <HexMap
        selectedState={selectedState}
        onStateSelect={handleStateChange}
        stateData={stateData}
      />

      <div className="viz-legend">
        <span className="legend-item" style={{ color: '#FFAA00' }}>&#9632; Gas car</span>
        <span className="legend-item electric" style={{ color: '#364F6B' }}>&#9632; EV (Retail)</span>
        <span className="legend-item" style={{ color: '#519A66' }}>&#9632; EV (off-peak, 30% discount)</span>
      </div>

      <D3Chart
        renderChart={renderChart}
        data={chartData}
        height={280}
      />
      <h3>knobs and dials</h3>
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
          <span className="sub-label">Off-peak: ${offPeakRate.toFixed(3)}/kWh (30% discount)</span>
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
            Base EV Efficiency (mi/kWh): <strong>{evEfficiency.toFixed(1)}</strong>
          </label>
          <input
            id="ev-efficiency"
            type="range"
            min="2.5"
            max="5.0"
            step="0.1"
            value={evEfficiency}
            onChange={(e) => setEvEfficiency(parseFloat(e.target.value))}
          />
          <span className="sub-label">Temp-adjusted: {adjEfficiency.toFixed(2)} mi/kWh ({meanTemp.toFixed(0)}&deg;C)</span>
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
      <h3>Sources</h3>
      <p className="viz-description">
        Data is sourced from the U.S. Energy Information Administration, AAA, NOAA and this{' '}
        <a href="https://www.sciencedirect.com/science/article/pii/S2666052024000190" target="_blank" rel="noopener noreferrer">ScienceDirect article</a>
        {' '} to model EV fuel efficiency given weather. I use the base vehicle efficiencies of 4 miles/kWh and a gas car MPG of 24 to reflect
        the 2026 U.S. passenger car averages. The idea for this visual was heavily inspired by the excellent work of the {' '}
        <a href="https://eanvt.org/about/what-we-do/about-ean/" target="_blank" rel="noopener noreferrer">Energy Action Network</a>, showcased in their annual report.
      </p>
    </div>
  );
};

export default MilesPerDollarViz;
