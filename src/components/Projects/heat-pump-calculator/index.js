import React, { useMemo, useState } from 'react';

import { DEFAULT_INPUTS, runCalculator, runReverse } from './engine';
import Form from './Form';
import Results from './Results';

// Set a value at a path such as ['heatPump', 'tier'] without mutating the old state.
const setPath = (obj, [key, ...rest], value) => ({
  ...obj,
  [key]: rest.length ? setPath(obj[key], rest, value) : value,
});

const HeatPumpCalculator = () => {
  const [mode, setMode] = useState('compare'); // 'compare' | 'reverse'
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [view, setView] = useState('all');

  const set = (path, value) => setInputs((prev) => setPath(prev, path, value));
  const onOverride = (key, value) => set(['overrides', key], value);
  const reverse = mode === 'reverse';

  const result = useMemo(
    () => (reverse ? runReverse(inputs) : runCalculator(inputs)),
    [inputs, reverse],
  );

  return (
    <div className="hp-calc">
      <p className="hp-draft-note">
        Draft. Prices, weather and heat pump curves are placeholder values until the data
        pipeline is built, so treat every number as illustrative.
      </p>

      <div className="hp-toggle hp-mode" role="group" aria-label="Which describes you?">
        <button
          type="button"
          className={reverse ? '' : 'active'}
          onClick={() => setMode('compare')}
        >
          I&apos;m thinking about a heat pump
        </button>
        <button
          type="button"
          className={reverse ? 'active' : ''}
          onClick={() => setMode('reverse')}
        >
          I already have one
        </button>
      </div>

      <div className="hp-layout">
        <Form inputs={inputs} set={set} reverse={reverse} />
        {result.errors.length ? (
          <div className="hp-results hp-empty">
            <p>To see your estimate:</p>
            <ul>{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        ) : (
          <Results
            result={result}
            view={reverse ? 'heating' : view}
            setView={setView}
            overrides={inputs.overrides}
            onOverride={onOverride}
          />
        )}
      </div>
    </div>
  );
};

export default HeatPumpCalculator;
