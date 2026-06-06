import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';

const HexMap = ({
  selectedState,
  onStateSelect,
  stateData,
}) => {
  const svgRef = useRef(null);
  const geojsonRef = useRef(null);
  const drawnRef = useRef(false);

  const onStateSelectRef = useRef(onStateSelect);
  onStateSelectRef.current = onStateSelect;

  // Initial draw: load GeoJSON and render all hexes once
  useEffect(() => {
    if (!svgRef.current || drawnRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 500;
    const height = 250;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const geoUrl = `${process.env.PUBLIC_URL}/data/us_states_hexgrid.geojson`;
    d3.json(geoUrl).then((geojson) => {
      if (!geojson) return;
      geojsonRef.current = geojson;
      drawnRef.current = true;

      // Compute bounds and apply uniform scaling
      const rawPath = d3.geoPath().projection(null);
      const allBounds = geojson.features.map((f) => rawPath.bounds(f));
      const x0 = d3.min(allBounds, (b) => b[0][0]);
      const x1 = d3.max(allBounds, (b) => b[1][0]);
      const y0 = d3.min(allBounds, (b) => b[0][1]);
      const y1 = d3.max(allBounds, (b) => b[1][1]);
      const dx = x1 - x0;
      const dy = y1 - y0;

      // Single scale factor keeps all hexes identical size
      const pad = 10;
      const k = Math.min(
        (width - 2 * pad) / dx,
        (height - 2 * pad) / dy,
      );
      const tx = pad + ((width - 2 * pad) - dx * k) / 2;
      const ty = pad + ((height - 2 * pad) - dy * k) / 2;

      const projection = d3.geoIdentity()
        .reflectY(true)
        .scale(k)
        .translate([tx - x0 * k, ty + y1 * k]);
      const path = d3.geoPath().projection(projection);

      const g = svg.append('g');

      g.selectAll('.hex-state')
        .data(geojson.features)
        .join('g')
        .attr('class', 'hex-state')
        .attr('data-abbr', (d) => d.properties.iso3166_2)
        .style('cursor', 'pointer')
        .each(function drawHex(d) {
          const group = d3.select(this);
          group.append('path')
            .attr('d', path(d))
            .attr('class', 'hex-path')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('opacity', 0.88);

          const centroid = path.centroid(d);
          group.append('text')
            .attr('x', centroid[0])
            .attr('y', centroid[1] + 1)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('class', 'hex-label')
            .style('font-size', '11px')
            .style('pointer-events', 'none')
            .text(d.properties.iso3166_2);
        })
        .on('click', (event, d) => {
          const gName = d.properties.google_name || '';
          const name = gName.replace(' (United States)', '');
          if (name) onStateSelectRef.current(name);
        });
    });
  }, []);

  // Update colors when stateData loads
  const updateColors = useCallback(() => {
    if (!svgRef.current || !geojsonRef.current) return;
    const svg = d3.select(svgRef.current);
    const geojson = geojsonRef.current;

    const priceByAbbr = {};
    if (stateData && stateData.length > 0) {
      stateData.forEach((row) => {
        const feature = geojson.features.find(
          (f) => f.properties.google_name
            && f.properties.google_name.includes(row.state),
        );
        if (feature) {
          priceByAbbr[feature.properties.iso3166_2] = parseFloat(
            row.regular_gas,
          );
        }
      });
    }

    const prices = Object.values(priceByAbbr);
    const maxPrice = d3.max(prices) || 5.00;
    const minPrice = d3.min(prices) || 2.50;
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([2, maxPrice]);

    svg.selectAll('.hex-state').each(function applyColor() {
      const group = d3.select(this);
      const abbr = group.attr('data-abbr');
      const price = priceByAbbr[abbr];
      group.select('.hex-path')
        .attr('fill', price ? colorScale(price) : '#ddd');
      group.select('.hex-label')
        .style('fill', price && price > (maxPrice + minPrice) / 2 ? '#fff' : '#333');
    });
  }, [stateData]);

  useEffect(() => {
    const timer = setTimeout(updateColors, 50);
    return () => clearTimeout(timer);
  }, [updateColors]);

  // Update selection styling without redrawing
  useEffect(() => {
    if (!svgRef.current || !geojsonRef.current) return;
    const svg = d3.select(svgRef.current);
    const geojson = geojsonRef.current;

    const selectedFeature = geojson.features.find(
      (f) => f.properties.google_name
        && f.properties.google_name.includes(selectedState),
    );
    const selectedAbbr = selectedFeature
      ? selectedFeature.properties.iso3166_2
      : '';

    svg.selectAll('.hex-state').each(function updateStyle() {
      const group = d3.select(this);
      const abbr = group.attr('data-abbr');
      const isSelected = abbr === selectedAbbr;

      group.select('.hex-path')
        .attr('stroke', isSelected ? '#1976d2' : '#fff')
        .attr('stroke-width', isSelected ? 2.5 : 1)
        .attr('opacity', isSelected ? 1 : 0.88);

      group.select('.hex-label')
        .style('font-weight', isSelected ? 'bold' : 'normal')
        .style('fill', isSelected ? '#1976d2' : null);

      if (isSelected) group.raise();
    });
  }, [selectedState]);

  return (
    <div className="hex-map-container">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      />
      <div className="hex-map-caption">
        Click a state to load energy prices and weather data.
        Color indicates gas price (darker = higher).
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
