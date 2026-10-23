import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';

// Card with a legend and an SVG that D3 draws into. `draw(svgNode, tip)` is called whenever it
// changes; `tip.show(event, title, rows)` and `tip.hide()` drive the hover tooltip.
const ChartCard = ({
  title, subtitle, legend, draw, label, short,
}) => {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const tipRef = useRef(null);

  useEffect(() => {
    const tip = {
      show(event, heading, rows) {
        const el = d3.select(tipRef.current);
        el.attr('hidden', null);
        el.selectAll('*').remove();
        el.append('div').attr('class', 'tip-title').text(heading);
        const tr = el.append('table').selectAll('tr').data(rows).join('tr');
        tr.append('td').attr('class', 'key').append('span').style('border-color', (d) => d.color);
        tr.append('td').attr('class', 'val').text((d) => d.value);
        tr.append('td').attr('class', 'name').text((d) => d.name);

        const rect = wrapRef.current.getBoundingClientRect();
        const tipW = tipRef.current.offsetWidth;
        const tipH = tipRef.current.offsetHeight;
        let left = event.clientX - rect.left + 16;
        if (left + tipW > rect.width - 8) left = event.clientX - rect.left - tipW - 16;
        let top = event.clientY - rect.top + 12;
        if (top + tipH > rect.height - 4) top = Math.max(4, rect.height - tipH - 4);
        el.style('left', `${left}px`).style('top', `${top}px`);
      },
      hide() {
        d3.select(tipRef.current).attr('hidden', true);
      },
    };
    draw(svgRef.current, tip);
  }, [draw]);

  return (
    <section className="card">
      <div className="card-head">
        <h4>{title}</h4>
        <p className="card-sub">{subtitle}</p>
      </div>
      <div className="legend">
        {legend.map((item) => (
          <span className="legend-item" key={item.label}>
            <span
              className="legend-key"
              style={{ background: item.color, opacity: item.opacity }}
            />
            <span>{item.label}</span>
          </span>
        ))}
      </div>
      <div className="chart-wrap" ref={wrapRef}>
        <svg
          ref={svgRef}
          className={short ? 'chart chart-short' : 'chart'}
          role="img"
          aria-label={label}
        />
        <div className="tooltip" ref={tipRef} hidden />
      </div>
    </section>
  );
};

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  legend: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    opacity: PropTypes.number,
  })).isRequired,
  draw: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  short: PropTypes.bool,
};

ChartCard.defaultProps = {
  short: false,
};

export default ChartCard;
