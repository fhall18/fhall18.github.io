import { lazy } from 'react';

// Interactive visualizations, keyed by the `interactive` field in src/data/projects.js.
// Each project lives in its own folder here, named after its slug. To add one:
// create the folder with an index.js, add a line below, and set `interactive` in projects.js.
const interactiveComponents = {
  VermontFlexViz: lazy(() => import('./vermont-flex')),
  HabForecastViz: lazy(() => import('./hab-forecast')),
  MilesPerDollarViz: lazy(() => import('./miles-per-dollar')),
  HeatPumpCalculator: lazy(() => import('./heat-pump-calculator')),
};

export default interactiveComponents;
