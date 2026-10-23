import PropTypes from 'prop-types';

const num = PropTypes.number.isRequired;
const numbers = (keys) => Object.fromEntries(keys.map((k) => [k, num]));

// Shape of the object returned by buildScenario in flexModel.js.
const scenarioShape = PropTypes.shape({
  params: PropTypes.shape(numbers([
    'evShare', 'solarShare', 'windShare', 'hydroShare', 'flexShare', 'shiftWindow',
  ])).isRequired,
  hours: PropTypes.arrayOf(PropTypes.shape({
    ...numbers([
      't', 'dayKey', 'hour', 'load', 'dc', 'ev', 'solar', 'wind', 'hydro', 'net',
      'evShifted', 'dispatch', 'netAfter',
    ]),
    date: PropTypes.instanceOf(Date).isRequired,
    isWeekend: PropTypes.bool.isRequired,
  })).isRequired,
  days: PropTypes.arrayOf(PropTypes.shape({
    ...numbers([
      'dayKey', 'evMwh', 'evMwhShifted', 'mwhMoved', 'maxDispatchMw', 'minDispatchMw',
      'evPeakMwShifted', 'peakNetBefore', 'peakNetAfter', 'totalAbsNetBefore',
      'totalAbsNetAfter',
    ]),
    date: PropTypes.instanceOf(Date).isRequired,
  })).isRequired,
  totals: PropTypes.shape(numbers([
    'loadMwh', 'dcMwh', 'evMwh', 'totalDemandMwh', 'solarMwh', 'windMwh', 'hydroMwh', 'evMw',
    'evPeakMw', 'evPeakMwShifted', 'mwhMoved', 'peakNetBefore', 'peakNetAfter', 'minNetBefore',
    'minNetAfter', 'totalAbsNetBefore', 'totalAbsNetAfter', 'hoursPositiveBefore',
    'hoursPositiveAfter',
  ])).isRequired,
});

export default scenarioShape;
