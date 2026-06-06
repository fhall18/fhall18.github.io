import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';

// Hex tile grid positions for US states (col, row)
const stateGrid = {
  AK: {
    col: 0,
    row: 0,
  },
  HI: {
    col: 0,
    row: 5,
  },
  ME: {
    col: 10,
    row: 0,
  },
  VT: {
    col: 9,
    row: 0,
  },
  NH: {
    col: 10,
    row: 1,
  },
  MA: {
    col: 9,
    row: 1,
  },
  WA: {
    col: 1,
    row: 0,
  },
  MT: {
    col: 2,
    row: 0,
  },
  ND: {
    col: 3,
    row: 0,
  },
  MN: {
    col: 4,
    row: 0,
  },
  WI: {
    col: 5,
    row: 0,
  },
  MI: {
    col: 6,
    row: 0,
  },
  NY: {
    col: 8,
    row: 1,
  },
  CT: {
    col: 9,
    row: 2,
  },
  RI: {
    col: 10,
    row: 2,
  },
  OR: {
    col: 1,
    row: 1,
  },
  ID: {
    col: 2,
    row: 1,
  },
  WY: {
    col: 3,
    row: 1,
  },
  SD: {
    col: 4,
    row: 1,
  },
  IA: {
    col: 5,
    row: 1,
  },
  IN: {
    col: 6,
    row: 1,
  },
  OH: {
    col: 7,
    row: 1,
  },
  PA: {
    col: 8,
    row: 2,
  },
  NJ: {
    col: 9,
    row: 3,
  },
  CA: {
    col: 1,
    row: 2,
  },
  NV: {
    col: 2,
    row: 2,
  },
  CO: {
    col: 3,
    row: 2,
  },
  NE: {
    col: 4,
    row: 2,
  },
  IL: {
    col: 5,
    row: 2,
  },
  WV: {
    col: 7,
    row: 2,
  },
  DE: {
    col: 10,
    row: 3,
  },
  MD: {
    col: 9,
    row: 4,
  },
  UT: {
    col: 2,
    row: 3,
  },
  KS: {
    col: 4,
    row: 3,
  },
  MO: {
    col: 5,
    row: 3,
  },
  KY: {
    col: 6,
    row: 2,
  },
  VA: {
    col: 7,
    row: 3,
  },
  DC: {
    col: 8,
    row: 3,
  },
  AZ: {
    col: 2,
    row: 4,
  },
  NM: {
    col: 3,
    row: 3,
  },
  OK: {
    col: 4,
    row: 4,
  },
  AR: {
    col: 5,
    row: 4,
  },
  TN: {
    col: 6,
    row: 3,
  },
  NC: {
    col: 7,
    row: 4,
  },
  SC: {
    col: 8,
    row: 4,
  },
  TX: {
    col: 3,
    row: 4,
  },
  LA: {
    col: 4,
    row: 5,
  },
  MS: {
    col: 5,
    row: 5,
  },
  AL: {
    col: 6,
    row: 4,
  },
  GA: {
    col: 7,
    row: 5,
  },
  FL: {
    col: 8,
    row: 5,
  },
};

// State abbreviation to full name mapping
const stateNames = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

// Reverse lookup: full name -> abbreviation
const nameToAbbr = Object.fromEntries(
  Object.entries(stateNames).map(([abbr, name]) => [name, abbr]),
);

const HexMap = ({
  selectedState,
  onStateSelect,
  stateData,
}) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const hexRadius = 28;
    const hexWidth = hexRadius * 2;
    const hexHeight = Math.sqrt(3) * hexRadius;

    const width = 12 * hexWidth * 0.78;
    const height = 7 * hexHeight * 0.92;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Build a lookup for electric rate by state abbr
    const rateByState = {};
    if (stateData && stateData.length > 0) {
      stateData.forEach((row) => {
        const abbr = nameToAbbr[row.state];
        if (abbr) {
          rateByState[abbr] = parseFloat(row.residential_electric_rate) / 100;
        }
      });
    }

    const maxRate = d3.max(Object.values(rateByState)) || 0.40;
    const minRate = d3.min(Object.values(rateByState)) || 0.08;
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([minRate, maxRate]);

    const selectedAbbr = nameToAbbr[selectedState] || '';

    // Hex polygon points
    const hexPoints = (cx, cy) => {
      const points = [];
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        points.push([
          cx + hexRadius * Math.cos(angle),
          cy + hexRadius * Math.sin(angle),
        ]);
      }
      return points.map((p) => p.join(',')).join(' ');
    };

    const g = svg.append('g').attr('transform', 'translate(20, 20)');

    Object.entries(stateGrid).forEach(([abbr, pos]) => {
      const offsetX = pos.row % 2 === 1 ? hexWidth * 0.39 : 0;
      const cx = pos.col * hexWidth * 0.78 + offsetX;
      const cy = pos.row * hexHeight * 0.85;

      const rate = rateByState[abbr];
      const isSelected = abbr === selectedAbbr;

      const group = g.append('g')
        .attr('class', 'hex-state')
        .style('cursor', 'pointer')
        .on('click', () => {
          const name = stateNames[abbr];
          if (name) onStateSelect(name);
        });

      group.append('polygon')
        .attr('points', hexPoints(cx, cy))
        .attr('fill', rate ? colorScale(rate) : '#ddd')
        .attr('stroke', isSelected ? '#000' : '#fff')
        .attr('stroke-width', isSelected ? 3 : 1.5)
        .attr('opacity', isSelected ? 1 : 0.85);

      group.append('text')
        .attr('x', cx)
        .attr('y', cy + 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '10px')
        .style('font-weight', isSelected ? 'bold' : 'normal')
        .style('fill', rate && rate > (maxRate + minRate) / 2 ? '#fff' : '#333')
        .style('pointer-events', 'none')
        .text(abbr);
    });
  }, [selectedState, onStateSelect, stateData]);

  return (
    <div className="hex-map-container">
      <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
      <div className="hex-map-caption">
        Click a state to load its energy prices. Color = electric rate (darker = higher).
      </div>
    </div>
  );
};

HexMap.propTypes = {
  selectedState: PropTypes.string.isRequired,
  onStateSelect: PropTypes.func.isRequired,
  stateData: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    residential_electric_rate: PropTypes.string,
    regular_gas: PropTypes.string,
  })).isRequired,
};

export default HexMap;
