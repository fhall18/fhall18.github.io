import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import { drawGroupedBars } from './charts';

// SVG that D3 redraws whenever its data changes.
const BarChart = ({
  groups, series, label, yLabel,
}) => {
  const ref = useRef(null);
  useEffect(() => {
    drawGroupedBars(ref.current, { groups, series, yLabel });
  }, [groups, series, yLabel]);

  return (
    <div className="hp-chart-wrap">
      <div className="hp-legend">
        {series.map((s) => (
          <span key={s.key} className="hp-legend-item">
            <span className="hp-legend-key" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg ref={ref} className="hp-chart" role="img" aria-label={label} />
    </div>
  );
};

BarChart.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    sublabel: PropTypes.string,
    values: PropTypes.objectOf(PropTypes.number).isRequired,
    flag: PropTypes.bool,
  })).isRequired,
  series: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  })).isRequired,
  label: PropTypes.string.isRequired,
  yLabel: PropTypes.string,
};

BarChart.defaultProps = {
  yLabel: 'Cost',
};

export default BarChart;
