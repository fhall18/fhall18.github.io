// Fuels, equipment curves and engineering defaults.
//
// PLACEHOLDER VALUES. These are reasonable round numbers for drafting the engine, not
// sourced data. Each block names where the real values should come from (see the PRD's
// "Assumptions and default data" table).

export const BTU_PER_KWH = 3412;

// Energy content per billing unit, and the default system each fuel implies.
export const FUELS = {
  gas: {
    label: 'Natural gas',
    unit: 'therm',
    units: 'therms',
    btuPerUnit: 100000,
    defaultEfficiency: 0.8,
    defaultSystem: 'furnace',
    hasDucts: true,
    // Monthly non-heating use (water heater, stove, dryer) when the user says the fuel
    // does more than heat. Replaced by the regression intercept when monthly bills exist.
    baseloadPerMonth: 20,
  },
  propane: {
    label: 'Propane',
    unit: 'gallon',
    units: 'gallons',
    btuPerUnit: 91500,
    defaultEfficiency: 0.8,
    defaultSystem: 'furnace',
    hasDucts: true,
    baseloadPerMonth: 18,
  },
  oil: {
    label: 'Heating oil',
    unit: 'gallon',
    units: 'gallons',
    btuPerUnit: 138500,
    defaultEfficiency: 0.82,
    defaultSystem: 'boiler',
    hasDucts: false,
    baseloadPerMonth: 15,
  },
  electric: {
    label: 'Electric resistance',
    unit: 'kWh',
    units: 'kWh',
    btuPerUnit: BTU_PER_KWH,
    defaultEfficiency: 1,
    defaultSystem: 'baseboard',
    hasDucts: false,
    // Electric bills always include lights, appliances and so on.
    baseloadPerMonth: 500,
  },
};

// Heat loss coefficient per square foot (Btu/h·°F per sq ft) by year built.
// Source to use: median of matched NREL ResStock homes by vintage, type and climate zone.
export const UA_PER_SQFT_BY_VINTAGE = [
  { throughYear: 1939, value: 0.4 },
  { throughYear: 1979, value: 0.32 },
  { throughYear: 1999, value: 0.25 },
  { throughYear: 2009, value: 0.21 },
  { throughYear: Infinity, value: 0.17 },
];

export const HOME_TYPES = {
  detached: { label: 'Single-family detached', factor: 1 },
  attached: { label: 'Townhouse or duplex', factor: 0.8 },
};

// Heat loss multiplier when the user reports insulation or air sealing since the home was built.
export const UPGRADE_FACTOR = 0.85;

// Heat pump tiers. `cop` and `cap` are [outdoor °F, value] points; `cap` is capacity as a
// fraction of the rated 47°F capacity. Below `cutoff` the unit shuts off and backup carries
// the whole load. `sizeAt` is the outdoor temperature the unit is sized to fully cover.
// Source to use: median curves from the NEEP cold-climate heat pump list and ENERGY STAR.
export const HP_TIERS = {
  standard: {
    label: 'Standard',
    cop: [[5, 1.7], [17, 2.3], [47, 3.6]],
    cap: [[5, 0.5], [17, 0.62], [47, 1]],
    cutoff: -5,
    sizeAt: 17,
    seer2: 15,
  },
  coldClimate: {
    label: 'Cold-climate',
    cop: [[-13, 1.6], [5, 2], [17, 2.6], [47, 3.9]],
    cap: [[-13, 0.65], [5, 0.75], [17, 0.85], [47, 1]],
    cutoff: -22,
    sizeAt: 5,
    seer2: 17,
  },
  highPerformance: {
    label: 'High-performance',
    cop: [[-13, 1.8], [5, 2.3], [17, 2.9], [47, 4.3]],
    cap: [[-13, 0.8], [5, 0.9], [17, 1], [47, 1]],
    cutoff: -22,
    sizeAt: 5,
    seer2: 20,
  },
};

// Engineering defaults. Every one of these is shown and editable in the assumptions panel.
export const DEFAULTS = {
  balancePoint: 62, // °F; heating starts below this outdoor temperature (68°F setpoint)
  coolingBalancePoint: 70, // °F; cooling starts above this
  copFactor: 0.9, // field performance vs rated COP
  copFactorBand: 0.1, // ± for the range
  maxCop: 5.5, // cap when extrapolating above 47°F
  defrostPenalty: 0.08, // peak COP loss in the frosting range, centered on 32°F
  ductLoss: 0.15, // ducts in unconditioned space
  oldAcSeer: 10,
  uaBand: {
    reverse: 0.15, monthlyBills: 0.1, annualBills: 0.15, modeled: 0.3,
  },
  priceBand: 0.1, // ± on electricity and fuel prices for the range
  discountRate: 0.05,
  analysisYears: 15,
  // Source to use: EIA Annual Energy Outlook regional forecast.
  escalation: { electricity: 0.02, fuel: 0.02 },
  capacityStep: 6000, // round heat pump size up to the next half ton
};
