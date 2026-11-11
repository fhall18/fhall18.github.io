import React from 'react';
import PropTypes from 'prop-types';

import { FUELS, HP_TIERS, HOME_TYPES } from './data/equipment';
import { MONTH_NAMES } from './engine/weather';

// ---------- small controlled fields ----------
// Every field is a <label> wrapping its control, so a click on the text focuses it.

const NumberField = ({
  id, label, value, onChange, hint, placeholder, step,
}) => (
  <label className="hp-field" htmlFor={id}>
    <span className="hp-field-label">{label}</span>
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
    {hint && <span className="hp-hint">{hint}</span>}
  </label>
);

NumberField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.string,
  placeholder: PropTypes.string,
  step: PropTypes.string,
};
NumberField.defaultProps = { hint: null, placeholder: '', step: 'any' };

const SelectField = ({
  id, label, value, onChange, options, hint, disabled,
}) => (
  <label className="hp-field" htmlFor={id}>
    <span className="hp-field-label">{label}</span>
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
    </select>
    {hint && <span className="hp-hint">{hint}</span>}
  </label>
);

SelectField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  hint: PropTypes.string,
  disabled: PropTypes.bool,
};
SelectField.defaultProps = { hint: null, disabled: false };

const CheckField = ({
  id, label, checked, onChange, disabled,
}) => (
  <label className="hp-check" htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </label>
);

CheckField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
CheckField.defaultProps = { disabled: false };

// Yes / No / I don't know, stored as true / false / null.
const triOptions = [['', 'I don\'t know'], ['yes', 'Yes'], ['no', 'No']];
const triToString = (v) => {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '';
};
const stringToTri = (s) => {
  if (s === 'yes') return true;
  if (s === 'no') return false;
  return null;
};

const fuelOptions = Object.entries(FUELS).map(([k, f]) => [k, f.label]);
const tierOptions = [
  ['', 'Pick for my climate'],
  ...Object.entries(HP_TIERS).map(([k, t]) => [k, t.label]),
];

// ---------- the form ----------

const Form = ({ inputs, set, reverse }) => {
  const fuel = FUELS[inputs.fuel];
  const { bills, equipment, heatPump } = inputs;
  const at = (section, key) => (v) => set([section, key], v);

  return (
    <div className="hp-form">
      <fieldset className="hp-step">
        <legend>
          <strong>Step 1:</strong> Your home{' '}
          <span className="hp-step-note">required, about 1 minute</span>
        </legend>
        <div className="hp-grid">
          <label className="hp-field" htmlFor="hp-zip">
            <span className="hp-field-label">ZIP code</span>
            <input
              id="hp-zip"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={inputs.zip}
              onChange={(e) => set(['zip'], e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <SelectField
            id="hp-fuel"
            label={reverse ? 'What did you heat with before?' : 'How do you heat now?'}
            value={inputs.fuel}
            onChange={(v) => set(['fuel'], v)}
            options={fuelOptions}
          />
          <NumberField
            id="hp-sqft"
            label="Heated floor area (sq ft)"
            value={inputs.sqft}
            onChange={(v) => set(['sqft'], v)}
            hint={reverse ? 'Optional here' : null}
          />
          <NumberField
            id="hp-year"
            label="Year built"
            value={inputs.yearBuilt}
            onChange={(v) => set(['yearBuilt'], v)}
            step="1"
            hint={reverse ? 'Optional here' : null}
          />
        </div>
      </fieldset>

      {reverse ? (
        <fieldset className="hp-step">
          <legend>
            <strong>Step 2:</strong> Your electricity use{' '}
            <span className="hp-step-note">from last winter&apos;s bills</span>
          </legend>
          <div className="hp-grid">
            <NumberField
              id="hp-winter-kwh"
              label="Electricity used, October to April (kWh)"
              value={inputs.reverse.winterKwh}
              onChange={at('reverse', 'winterKwh')}
            />
            <NumberField
              id="hp-summer-kwh"
              label="Typical summer month without AC (kWh)"
              value={inputs.reverse.summerMonthlyKwh}
              onChange={at('reverse', 'summerMonthlyKwh')}
              hint="Subtracted as your non-heating use"
            />
          </div>
        </fieldset>
      ) : (
        <details className="hp-step">
          <summary>
            <strong>Step 2:</strong> Your bills{' '}
            <span className="hp-step-note">optional, the biggest accuracy gain</span>
          </summary>
          <div className="hp-grid">
            <SelectField
              id="hp-bill-mode"
              label="What can you enter?"
              value={bills.mode}
              onChange={at('bills', 'mode')}
              options={[
                ['none', 'Nothing yet'],
                ['annual', 'Last 12 months, total'],
                ['monthly', 'Month by month'],
              ]}
            />
            <CheckField
              id="hp-water"
              label={`${fuel.label} also heats water or cooks`}
              checked={bills.alsoWaterCooking}
              onChange={at('bills', 'alsoWaterCooking')}
            />
          </div>
          {bills.mode === 'annual' && (
            <div className="hp-grid">
              <NumberField
                id="hp-annual-units"
                label={`${fuel.label} used (${fuel.units})`}
                value={bills.annualUnits}
                onChange={at('bills', 'annualUnits')}
              />
              <NumberField
                id="hp-annual-cost"
                label="What you paid for it ($)"
                value={bills.annualCost}
                onChange={at('bills', 'annualCost')}
                hint="Sets your fuel price"
              />
            </div>
          )}
          {bills.mode === 'monthly' && (
            <div className="hp-months">
              {MONTH_NAMES.map((name, m) => (
                <NumberField
                  key={name}
                  id={`hp-month-${m}`}
                  label={name}
                  value={bills.monthlyUnits[m]}
                  onChange={(v) => {
                    const next = [...bills.monthlyUnits];
                    next[m] = v;
                    set(['bills', 'monthlyUnits'], next);
                  }}
                />
              ))}
              <p className="hp-hint">
                {fuel.units} per month, most recent 12 months. Leave gaps blank. For propane or
                oil deliveries, enter the total for each month you can.
              </p>
            </div>
          )}
        </details>
      )}

      <details className="hp-step">
        <summary>
          <strong>Step 3:</strong> {reverse ? 'Your old system' : 'Your equipment'}{' '}
          <span className="hp-step-note">optional</span>
        </summary>
        <div className="hp-grid">
          <NumberField
            id="hp-eff"
            label="How efficient is it? (AFUE, %)"
            value={equipment.efficiency}
            onChange={at('equipment', 'efficiency')}
            placeholder={String(Math.round(fuel.defaultEfficiency * 100))}
            hint="On the yellow EnergyGuide label or the unit's nameplate"
          />
          <SelectField
            id="hp-home-type"
            label="Home type"
            value={inputs.homeType}
            onChange={(v) => set(['homeType'], v)}
            options={Object.entries(HOME_TYPES).map(([k, t]) => [k, t.label])}
          />
          <SelectField
            id="hp-ducts"
            label="Do you have ductwork?"
            value={triToString(equipment.hasDucts)}
            onChange={(v) => set(['equipment', 'hasDucts'], stringToTri(v))}
            options={triOptions}
          />
          <SelectField
            id="hp-ac"
            label="Central air conditioning?"
            value={triToString(equipment.hasAC)}
            onChange={(v) => set(['equipment', 'hasAC'], stringToTri(v))}
            options={triOptions}
          />
          {equipment.hasAC && (
            <NumberField
              id="hp-seer"
              label="AC efficiency (SEER)"
              value={equipment.acSeer}
              onChange={at('equipment', 'acSeer')}
              placeholder="10"
            />
          )}
          <CheckField
            id="hp-upgraded"
            label="Insulation or air sealing added since it was built"
            checked={inputs.upgraded}
            onChange={(v) => set(['upgraded'], v)}
          />
        </div>
      </details>

      <details className="hp-step">
        <summary>
          <strong>Step 4:</strong> {reverse ? 'Your heat pump' : 'Heat pump options'}{' '}
          <span className="hp-step-note">optional</span>
        </summary>
        <div className="hp-grid">
          <SelectField
            id="hp-tier"
            label="Heat pump type"
            value={heatPump.tier}
            onChange={at('heatPump', 'tier')}
            options={tierOptions}
          />
          <SelectField
            id="hp-ducted"
            label="Ducted or ductless?"
            value={triToString(heatPump.ducted)}
            onChange={(v) => set(['heatPump', 'ducted'], stringToTri(v))}
            options={[['', 'Match my ducts'], ['yes', 'Ducted'], ['no', 'Ductless']]}
          />
          {!reverse && (
            <>
              <SelectField
                id="hp-backup"
                label="Backup heat"
                value={inputs.fuel === 'electric' ? 'resistance' : heatPump.backup}
                onChange={at('heatPump', 'backup')}
                disabled={inputs.fuel === 'electric'}
                options={[
                  ['resistance', 'Electric strips'],
                  ['furnace', 'Keep my current system (dual fuel)'],
                ]}
              />
              {heatPump.backup === 'furnace' && inputs.fuel !== 'electric' && (
                <NumberField
                  id="hp-switchover"
                  label="Switch to the furnace below (°F)"
                  value={heatPump.switchover}
                  onChange={at('heatPump', 'switchover')}
                  hint="Blank uses the economic balance point"
                />
              )}
              <SelectField
                id="hp-cooling"
                label="Use the heat pump for cooling?"
                value={triToString(heatPump.cooling)}
                onChange={(v) => set(['heatPump', 'cooling'], stringToTri(v))}
                options={[['', 'Only if I have AC now'], ['yes', 'Yes'], ['no', 'No']]}
              />
              {inputs.fuel === 'gas' && heatPump.backup !== 'furnace' && (
                <CheckField
                  id="hp-remove-gas"
                  label="I'd drop gas service entirely"
                  checked={heatPump.removeGas}
                  onChange={at('heatPump', 'removeGas')}
                />
              )}
              <NumberField
                id="hp-cost"
                label="Installed cost from a quote ($)"
                value={heatPump.installedCost}
                onChange={at('heatPump', 'installedCost')}
              />
              <NumberField
                id="hp-incentives"
                label="Rebates you're sure of ($)"
                value={heatPump.incentives}
                onChange={at('heatPump', 'incentives')}
                hint="No federal tax credit for 2026 installs"
              />
            </>
          )}
        </div>
      </details>
    </div>
  );
};

Form.propTypes = {
  inputs: PropTypes.shape({
    zip: PropTypes.string,
    fuel: PropTypes.string,
    sqft: PropTypes.string,
    yearBuilt: PropTypes.string,
    homeType: PropTypes.string,
    upgraded: PropTypes.bool,
    bills: PropTypes.shape({
      mode: PropTypes.string,
      annualUnits: PropTypes.string,
      annualCost: PropTypes.string,
      monthlyUnits: PropTypes.arrayOf(PropTypes.string),
      alsoWaterCooking: PropTypes.bool,
    }),
    equipment: PropTypes.shape({
      efficiency: PropTypes.string,
      hasAC: PropTypes.bool,
      acSeer: PropTypes.string,
      hasDucts: PropTypes.bool,
    }),
    heatPump: PropTypes.shape({
      tier: PropTypes.string,
      ducted: PropTypes.bool,
      backup: PropTypes.string,
      switchover: PropTypes.string,
      cooling: PropTypes.bool,
      removeGas: PropTypes.bool,
      installedCost: PropTypes.string,
      incentives: PropTypes.string,
    }),
    reverse: PropTypes.shape({
      winterKwh: PropTypes.string,
      summerMonthlyKwh: PropTypes.string,
    }),
  }).isRequired,
  set: PropTypes.func.isRequired,
  reverse: PropTypes.bool.isRequired,
};

export default Form;
