import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';

/**
 * Reusable D3 chart wrapper that handles SVG setup, resize, and re-render.
 * Pass a `renderChart` function that receives (svgElement, data, dimensions).
 */
const D3Chart = ({
  renderChart, data, width, height,
}) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !renderChart) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const dimensions = {
      width: width || svgRef.current.parentElement.clientWidth,
      height: height || 400,
      margin: {
        top: 30, right: 30, bottom: 50, left: 60,
      },
    };

    dimensions.innerWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.innerHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    renderChart(svg, data, dimensions);
  }, [renderChart, data, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width || '100%'}
      height={height || 400}
      className="d3-chart"
    />
  );
};

D3Chart.propTypes = {
  renderChart: PropTypes.func.isRequired,
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  width: PropTypes.number,
  height: PropTypes.number,
};

D3Chart.defaultProps = {
  data: [],
  width: null,
  height: 400,
};

export default D3Chart;
