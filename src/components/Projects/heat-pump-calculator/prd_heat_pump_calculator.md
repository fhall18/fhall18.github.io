# PRD: Heat pump heating cost calculator

Nov 7, 2026 · @Frederick Hall

## Summary

The calculator answers two questions for a homeowner in under 3 minutes: what heating has cost them with their current system, and what it would cost (or save) with a heat pump. It starts from 4 inputs anyone knows (ZIP code, heating fuel, home size, year built) and gets more accurate as the user adds real bills and equipment details.

The core method converts the home's current fuel use into a heat demand, then replays that demand through a heat pump's temperature-dependent efficiency using local weather. Every result shows a range, so the tool is honest about how much it knows.

Status: draft for structure and scope. Units are US customary (°F, therms, gallons, kWh) and USD.

## Problem and goals

Homeowners hear that heat pumps can cut heating bills, and they also hear stories of bills going up. Both happen. The outcome depends on local climate, fuel and electricity prices, the home's heat loss, and the equipment chosen. Most existing calculators either ask 40 questions or hide their assumptions, so people don't trust the number.

**Goals**

1. Give a credible annual heating cost estimate for the current system and for a heat pump, with a range.
2. Show the past: what the user paid last heating season and each of the 4 before it, and what a heat pump would have cost under the same weather and prices in each of those 5 winters. For people who already switched, show what they actually saved compared with their old fuel.
3. Keep the default path short (4 required inputs), with optional depth for people who have bills or a contractor quote.
4. Make every assumption visible and editable.

**Non-goals for v1**

- Equipment sizing for installation (Manual J). The tool estimates operating cost, and a contractor sizes the system.
- Contractor matching, quotes, or financing applications.
- Whole-home electrification (water heating, cooking, EVs, solar). These can come later.
- Commercial or multifamily buildings with central plants.

**Success metrics**

| Metric | Target | How measured |
| --- | --- | --- |
| Completion rate of default path | 70% of starts | Analytics funnel |
| Median time to first result | Under 3 minutes | Analytics |
| Share of users who add bill data | 30% | Analytics |
| Accuracy vs metered post-install bills | Within ±20% for bill-based estimates | Validation cohort (see Validation) |
| User trust | 4 of 5 average on "I understand where this number came from" | In-tool survey |

## Users and use cases

The primary user is a homeowner in a single-family home who heats with gas, propane, oil, or electric resistance and is curious about a heat pump. They know their ZIP code and roughly what they pay each winter. They don't know their furnace's AFUE or their home's heat loss.

| User | Situation | What they need from the tool |
| --- | --- | --- |
| Curious homeowner | No quote yet, just exploring | A quick ballpark: save, break even, or pay more |
| Furnace or AC is failing | Must replace something within weeks | Heat pump vs like-for-like replacement, operating cost side by side |
| Has a contractor quote | Specific model and price in hand | Payback using that model's real performance data |
| Propane or oil household | High fuel costs, often rural, cold climate | Confidence that a cold-climate unit holds up at 0°F and below |
| Already has a heat pump | Bills feel high | "What would I have paid with my old system?" (reverse comparison) |
| Utility or program staff (secondary) | Advising customers | Shareable result with assumptions listed |

## Prior art and what this adds

Several good tools already cover parts of this problem, and the plan is to borrow from them, not rebuild them. None found in a November 2026 search combines bill calibration with a multi-year lookback that uses each winter's actual weather and actual prices, aimed at homeowners.

| Tool | What it does well | What to borrow | What it leaves open |
| --- | --- | --- | --- |
| [Should I Heat Pump?](https://github.com/jlfwong/hvac-sim-app) (Canada, open source) | Time-step simulation on real historical weather, NEEP performance data, configurable tariffs | Simulation approach and possibly the library itself (check license) | Canada only; no bill calibration; single-year view |
| [Code for Boston Home Energy Analysis Tool](https://science.ecosyste.ms/projects/75377) (open source) | Bill-based heat loss estimate for sizing, built with heat pump coaches | Bill regression method for Stage 1 | Focused on sizing, less on cost comparison |
| [Lumina Heat Pump Calculator](https://analytica.com/?p=32102) | Detailed rate structures and temperature-dependent efficiency | Tariff handling | No multi-year or bill-calibrated view found |
| [SWEEP calculator](https://www.swenergy.org/heat-pump-calculator) (thinkheatpump.org) | Cold-climate vs dual-fuel comparison, published methodology | Dual-fuel framing, transparent assumptions page | Modeled only, no bills |
| [Rewiring America Bill Impacts Calculator](https://www.rewiringamerica.org/newsroom/press-releases/bill-impacts-calculator-announcement) | Address-level estimates from ResStock, embeddable | Incentives API for the v2 rebate lookup instead of building one | Aimed at contractors and partners; modeled, not bill-calibrated |
| [PNNL CCHP Decision Tool](https://basc.pnnl.gov/decision-tools) | Cold-climate sizing and selection guidance | Link out for users ready to size a system | Contractor tool, 15 to 30 minutes, not a cost calculator |

**Where this tool adds value**

- **Five-winter lookback.** Shows how both systems would have fared across mild and harsh winters and price swings, so users see the realistic spread instead of one typical year.
- **Bill calibration for every fuel**, including irregular propane and oil deliveries, which most tools skip.
- **Honest ranges.** Derived from the uncertain inputs, with a confidence level tied to what the user provided.
- **Visible failure modes.** Backup heat share and the economic balance point show when a heat pump would cost more, instead of hiding it.
- **Homeowner-first.** A result in under 3 minutes, with depth on demand.

Most simple online calculators use one fixed COP for the whole season and some still count the expired 25C credit. Those patterns are explicit anti-requirements for this tool.

## User experience

The tool uses progressive disclosure: a result appears after the first screen, and each optional step tightens the range. The user always sees what the next step would improve ("Adding your bills typically narrows this range by half").

1. **Your home (required, about 1 minute).** ZIP code, current heating fuel, approximate square footage, year built. Result: a modeled estimate with a wide range.
2. **Your bills (optional, highest value).** Either upload or link utility bills, or type monthly or annual usage and cost. Delivered fuels (propane, oil) accept a list of fill-up dates, gallons, and price. Result: a bill-calibrated estimate.
3. **Your equipment (optional).** Current system type and age, efficiency if known, whether there is central AC and ductwork. Result: better baseline and cooling comparison.
4. **Heat pump options (optional).** Pick a tier (standard, cold-climate, high-performance) or enter a specific model from a quote. Choose whether to keep the existing furnace as backup (dual fuel). Enter quote price and known rebates for payback.
5. **Results.** Headline comparison, monthly view, assumptions panel with every editable value, and a shareable link or PDF.

Design principles:

- Plain language first, technical term second ("How efficient is your furnace? (AFUE)").
- "I don't know" is a valid answer for every optional field, and it picks a sensible default by vintage and region.
- The headline never shows a single number without its range.
- No account required to see a result. Saving and sharing can require an email.

## Data inputs

Four inputs are required; everything else has a default. The inputs with the biggest effect on accuracy are real fuel usage, local fuel and electricity prices, and the heat pump's cold-weather performance.

**Home and location**

| Input | Step | Default if unknown | Why it matters |
| --- | --- | --- | --- |
| ZIP code | 1 (required) | None | Sets weather station, climate zone, default prices, utility territory |
| Heating fuel | 1 (required) | None | Natural gas, propane, heating oil, electric resistance, wood, or existing heat pump |
| Conditioned floor area (sq ft) | 1 (required) | None | Scales modeled heat loss when no bills exist |
| Year built | 1 (required) | None | Proxy for insulation and air tightness |
| Home type | 3 | Single-family detached | Attached homes lose less heat |
| Insulation or envelope upgrades since built | 3 | None | Adjusts vintage-based heat loss down |
| Thermostat setpoints (day, night) | 3 | 68°F day, 64°F night | Setback habits change load and favor different equipment |
| Secondary heat (wood stove, space heaters) | 3 | None | Explains low bills that would otherwise understate load |

**Bills and usage**

| Input | Step | Default if unknown | Why it matters |
| --- | --- | --- | --- |
| Heating fuel usage by billing period | 2 | Modeled from home inputs | Most reliable measure of actual heat demand |
| Fuel cost per period (or price per unit) | 2 | State average price | Sets baseline cost and future fuel price |
| Electricity usage by billing period | 2 | Regional average | Separates baseload from cooling; checks tariff tiers |
| Electricity rate plan | 2 | Utility default residential rate | Tiered, time-of-use, or heat pump rates change results a lot |
| Fixed monthly charges (gas and electric) | 2 | Utility default | Matters if the user would disconnect gas entirely |
| Other gas uses (water heater, stove, dryer) | 2 | Inferred from summer usage | Must be removed from heating load |

**Current equipment**

| Input | Step | Default if unknown | Why it matters |
| --- | --- | --- | --- |
| System type | 3 | Furnace for gas or propane, boiler for oil | Ducted vs hydronic changes heat pump options |
| Equipment age | 3 | Typical for vintage | Older units are less efficient |
| Efficiency (AFUE, or HSPF2 for existing heat pump) | 3 | 80% AFUE gas, 82% oil | Converts fuel into delivered heat |
| Central AC present, and its SEER | 3 | Regional saturation rate; SEER 10 if present and old | Drives cooling savings or added cooling cost |
| Ductwork location and condition | 3 | Unconditioned space, average leakage | Duct losses apply to both systems |

**Heat pump scenario**

| Input | Step | Default if unknown | Why it matters |
| --- | --- | --- | --- |
| Performance tier or specific model | 4 | Cold-climate tier in climate zones 5 to 7; standard tier elsewhere | Sets COP and capacity curve vs outdoor temperature |
| Ducted, ductless, or mixed | 4 | Ducted if ducts exist | Ductless avoids duct losses; zoning changes coverage |
| Backup heat type | 4 | Electric resistance strips | Dual fuel can cut cost where electricity is expensive |
| Switchover temperature (dual fuel) | 4 | Economic balance point (computed) | Sets when furnace takes over |
| Coverage (whole home vs partial) | 4 | Whole home | Partial installs leave some load on the old system |
| Installed cost and incentives | 4 | Regional cost range; no incentives | Needed for payback; incentives vary by state and utility |

## Calculation model

The model runs in 5 stages: estimate the home's heat demand, spread it across outdoor temperatures, cost it with the current system, replay it through the heat pump, then compare. Bills are used when available because they capture what modeling misses (behavior, drafts, odd additions).

&#91;embedded content: calculation flow · 5 stages, 2 input paths\]

Both systems see the same hourly load, so the comparison isolates equipment and price differences.

**Stage 1: heat demand.** Two paths feed one number, the home's heat loss coefficient (UA, in Btu per hour per °F).

- *Bill path (preferred).* Regress heating fuel use per billing period against heating degree days (HDD) for that period. The intercept is non-heating use (water heater, cooking); the slope is heating use per HDD. Multiply by system efficiency to get delivered heat per HDD, which converts to UA.
- *Modeled path (fallback).* Look up a UA from floor area, vintage, home type, and climate zone. A good source is NREL ResStock: match the user to similar simulated homes and use their median. Apply adjustments for reported upgrades.

```latex
UA = \frac{\text{fuel per HDD} \times \text{energy content} \times \eta_{\text{existing}}}{24}
```

**Stage 2: temperature distribution.** Use hourly outdoor temperature for the user's nearest weather station. Forward-looking estimates use a typical year (TMY3). Retrospective estimates replay each of the last 5 heating seasons hour by hour on actual weather, so both mild and harsh winters show up. Hourly heat load is UA × (balance point − outdoor temperature), where the balance point defaults to 60 to 65°F depending on setpoint and internal gains.

**Stage 3: current system cost.** Delivered heat divided by existing efficiency gives fuel use. Multiply by fuel price and add the heating share of fixed charges. Add cooling cost with the existing AC if present.

**Stage 4: heat pump energy.** For each hour:

1. Look up heat pump capacity and COP at that outdoor temperature from the performance curve (interpolated from rated points at 47°F, 17°F, and 5°F, extended below 5°F for cold-climate units).
2. Apply a defrost derate between roughly 17°F and 45°F where frost forms.
3. If load exceeds capacity, the shortfall goes to backup heat: resistance at COP 1.0, or the existing furnace at its efficiency for dual fuel.
4. For dual fuel, switch fully to the furnace below the switchover temperature.
5. Add duct losses for ducted systems.

```latex
\text{kWh}_{\text{HP}} = \sum_{h} \frac{\min(L_h, Q_{\text{cap}}(T_h))}{3412 \times \text{COP}(T_h)} + \frac{\max(0, L_h - Q_{\text{cap}}(T_h))}{3412 \times \eta_{\text{backup}}}
```

**Stage 5: cost and comparison.** Price heat pump electricity through the user's tariff, including tiers and time-of-use periods, since added winter usage can push customers into higher tiers. Add cooling with the heat pump's SEER2. If the user removes gas entirely, drop the gas fixed charge. Compute annual difference, simple payback, and 15-year net present value with fuel price escalation.

The **economic balance point** is worth showing users directly. It's the outdoor temperature where a dual-fuel system should switch to the furnace because the heat pump becomes more expensive per unit of heat:

```latex
\text{COP}_{\text{break-even}} = \frac{\text{electricity price per kWh} \times 3412 \times \eta_{\text{furnace}}}{\text{fuel price per Btu}}
```

**Five-winter lookback.** The tool reruns stages 2 to 5 for each of the last 5 heating seasons (October to April, currently 2021-22 through 2025-26). Each season uses its own hourly weather and its own monthly fuel and electricity prices, while the home's UA and the equipment stay fixed. This separates the two sources of year-to-year swing: winter harshness (HDD vs the 30-year normal) and price moves, such as the 2022-23 spike in heating oil and propane.

- Prices per season come from the user's bills where they have them, and from EIA monthly state price history otherwise. The current tariff structure is kept and scaled to each year's average electricity price, since full historical tariff data is rarely available.
- Most users will have 1 to 2 years of bills at most. Older seasons are modeled from the calibrated UA, and the results label which seasons are bill-based.
- The spread across the 5 winters gives an empirical range (best, typical, worst winter) that sits next to the model's uncertainty range. It also answers a question users actually ask: "Would a heat pump have saved money even in the bad year?"
- If the user made envelope upgrades or changed equipment in the window, seasons before the change need a different UA. v1 asks for the year of any upgrade and splits the regression there.

**Reverse mode (already switched).** For homeowners who already have a heat pump, the model runs backwards. Winter electricity use minus summer baseload gives heat pump kWh. Multiplying by the modeled seasonal COP for that winter's weather gives the heat delivered. That same heat, priced at that season's oil, propane, or gas price through the old system's efficiency, is what they would have paid.

This answers a common worry. Electricity prices went up, and that's visible on every bill, but the avoided fuel often rose too, sometimes faster (residential heating oil hit $5.90 a gallon in November 2022, per [EIA](https://www.eia.gov/todayinenergy/detail.php?id=54699)). The result shows both price trends side by side, with savings per season = avoided fuel cost − added electricity cost. The COP estimate drives this number, so it carries a range like every other result.

## Assumptions and default data

Every default below is shown in the results' assumptions panel, labeled with its source and date, and is editable. Defaults refresh on a schedule so the tool doesn't drift out of date.

| Assumption | Default | Source | Refresh |
| --- | --- | --- | --- |
| Fuel and electricity prices | State average residential price, trailing 12 months; monthly history for the 5-winter lookback | EIA (natural gas, electricity, propane, heating oil price series) | Monthly |
| Electricity tariff structure | v1: state average price plus a typical fixed charge; utility rate shapes later | OpenEI Utility Rate Database | Quarterly |
| Weather, typical year | Nearest TMY3 station | NREL / NSRDB | Static |
| Weather, actual | Hourly observations for the last 5 heating seasons | NOAA ISD or similar | Daily |
| Heat loss by home type and vintage | Median of matched simulated homes | [NREL ResStock](https://resstock.nrel.gov/datasets) 2024.2 | Per release |
| Heat pump performance by tier | Median curves for standard, cold-climate, and high-performance units | NEEP cold-climate heat pump product list; ENERGY STAR specs | Annually |
| Specific model performance | Rated capacity and COP at 47°F, 17°F, 5°F | NEEP list or AHRI certificate | On lookup |
| Existing furnace or boiler efficiency | 80% AFUE gas, 82% oil, by vintage | Federal minimums and age curves | Static |
| Balance point | 62°F at 68°F setpoint | Engineering default, adjusted by setpoint | Static |
| Defrost penalty | 5 to 10% COP reduction in frosting range | Field studies | Static |
| Duct losses | 15% if in unconditioned space | Industry typical | Static |
| Fuel price escalation | EIA Annual Energy Outlook regional forecast | EIA AEO | Annually |
| Discount rate for NPV | 5% | Editable | Static |
| Federal tax credit | $0 for 2026 installs | Section 25C ended for property placed in service after December 31, 2025 | As law changes |
| State and utility rebates | User-entered; v2 adds a lookup | State energy offices, utilities | v2 |

Two assumptions carry the most risk. Rated COP often overstates field performance, especially for poorly installed or oversized systems, so the tool should apply a field-performance haircut and show it. Prices also move: a 20% change in electricity price can flip a result from savings to loss in some regions, which is why the results page includes a price sensitivity view.

On incentives: the One Big Beautiful Bill Act (signed July 4, 2025) ended the Section 25C credit for systems placed in service after December 31, 2025 ([filterbuy](https://filterbuy.com/resources/heat-pumps/heat-pumps-basics/heat-pump-rebates-and-tax-incentives-in-2026/)). HEAR rebates, already granted to state energy offices, were left in place ([Energy Rebate Calculator](https://energyrebatecalculator.com/blog/heat-pump-tax-credit-2026)), but availability differs by state and some programs have filled up. The tool should not assume any rebate by default.

## Outputs

The headline is one sentence with a range: "With a cold-climate heat pump, you'd likely pay $1,450 to $1,800 a year for heating and cooling, versus about $2,100 today." For the lookback, it reads "Over the last 5 winters, a heat pump would have saved you about $X." A toggle splits every number into Heating, Cooling, and All. Everything else supports or qualifies the headline.

| Output | What it shows | Notes |
| --- | --- | --- |
| Headline comparison | Annual heating and cooling cost, current vs heat pump, with low, expected, high | Range from price and performance uncertainty |
| Five-winter lookback | Cost of each of the last 5 heating seasons, current system vs heat pump, using that winter's weather and prices, with each winter's harshness vs normal | Grouped bars by season; bill-based seasons labeled, older seasons modeled |
| Monthly view | Cost by month for both systems | Shows that heat pumps cost more in the coldest months and less in shoulder months |
| Backup heat share | Share of heating delivered by resistance strips or the furnace | High share is a warning sign about sizing or unit choice |
| Economic balance point | Outdoor temperature where the heat pump stops being cheaper than the furnace | Only for dual fuel or fuel-burning baseline |
| Payback and NPV | Simple payback years and 15-year NPV | Only if the user entered installed cost |
| Sensitivity | Result under ±20% electricity and fuel prices | Slider or small table |
| Confidence level | Low, medium, high based on which inputs were provided | Encourages adding bills |
| Emissions (optional) | Annual CO2 for both systems using regional grid factors | Uses EPA eGRID or Cambium marginal factors |
| Assumptions panel | Every default, its source, and an edit control | Always one tap away |

The range should be derived, not decorative. Low and high bounds come from running the model at the edges of the most uncertain inputs (field COP haircut, price band, UA uncertainty when no bills), and the confidence level reflects how wide that band is.

## Technical architecture

The tool runs entirely in the browser as a static site on GitHub Pages. A scheduled GitHub Action does the one job a backend would have done: once a month it fetches new prices, writes them as JSON into the repo, and the site redeploys. No server runs at any time.

**What "backend" meant, and why it isn't needed.** The earlier draft floated a server to hold performance curves and tariffs and to run the simulation. GitHub Pages serves only static files, so that can't run there. It doesn't need to: 5 winters × 8,760 hours is about 44,000 steps, which takes a few milliseconds in JavaScript, and the reference data is small enough to ship as files. The only server-side need is the scheduled fetch, and GitHub Actions handles it on a public repo at no cost (check GitHub's current limits).

&#91;embedded content: data flow · no running server\]

| Component | Where it runs | What it does |
| --- | --- | --- |
| Site (HTML, JavaScript, D3) | GitHub Pages | Inputs, charts, results |
| Calculation engine | User's browser | Stages 1 to 5, lookback, reverse mode; a plain JS module with unit tests |
| Reference data | Repo, static JSON | Heat pump tier curves, furnace efficiencies, ResStock-derived heat loss lookup, ZIP-to-region map |
| Price data | Repo, JSON, refreshed monthly | EIA monthly state electricity and natural gas prices; weekly heating oil and propane rolled up to monthly |
| Weather data | Repo, one JSON file per region, refreshed after each heating season | Binned temperatures for the last 5 winters plus a typical year |
| Refresh job | GitHub Actions, monthly schedule | Calls the EIA API with a key stored as a repo secret, validates values, commits JSON, logs what changed |
| User data | Browser memory, optional localStorage | Bills and home details never leave the device |

**Data size and speed**

- **Weather.** Store hours per 2°F temperature bin per month instead of raw hours. That's about 3,600 numbers per region for 5 seasons, a few KB. Raw hourly data (about 44,000 values, 100 to 200 KB per region) is only needed for time-of-use rates, so it stays an optional file. The browser loads only the user's region.
- **Prices.** 5 years × 12 months × 50 states × 4 fuels is about 12,000 numbers, roughly 200 KB as one JSON file.
- **Compute.** The binned model runs in under a millisecond, so sliders and the Heating/Cooling/All toggle can recalculate live.

**Price data caveats.** EIA's heating oil and propane survey runs only October through March and covers about 21 states for heating oil and 38 for propane ([EIA](https://www.eia.gov/todayinenergy/detail.php?id=47396), [EIA](https://www.eia.gov/todayinEnergy/detail.php?id=47416)). Other states fall back to regional averages, labeled as such. State electricity and gas averages lag a couple of months, so results show the as-of month. Weather comes from NOAA hourly observations or the Open-Meteo historical archive, processed in the Action, never called from the browser.

**Future option: bill upload**

| Option | How it works | Compute cost | Trade-offs |
| --- | --- | --- | --- |
| CSV upload | Parse in the browser (Papa Parse) and map columns to dates, usage, cost | Milliseconds | User has to export a CSV; needs a column-mapping step |
| PDF upload, text-based | Extract text with pdf.js in the browser, then match per-utility patterns | About 1 MB library; under a second per bill | Every utility's layout differs, so templates need upkeep |
| PDF upload, scanned | OCR with Tesseract.js in the browser | Several MB download; seconds per page | Slow on phones and error-prone; probably not worth it |
| Utility data connection (Green Button) | OAuth with the utility | Needs a server to hold credentials | Breaks the no-server model; would need a serverless function such as Cloudflare Workers |

Browser-side parsing keeps bills on the user's device, which is worth saying on the page.

## Validation and edge cases

Accuracy is tested against homes where both pre- and post-install bills exist. The target is ±20% on annual heating cost for bill-based estimates and ±35% for modeled-only estimates.

**Validation plan**

1. Back-test the bill path: hold out one year of a home's pre-install bills, predict it from the other year, and measure error. This tests the HDD regression alone.
2. Compare predicted heat pump usage to actual post-install bills from a partner utility or program cohort (100+ homes across at least 3 climate zones).
3. Cross-check modeled estimates against ResStock distributions for the same ZIP and home type.
4. Hand-calculate 10 reference homes in a spreadsheet and lock them as regression tests in the codebase.

**Edge cases to handle**

| Case | Risk | Handling |
| --- | --- | --- |
| Propane or oil fill-ups don't align with months | Regression fails on irregular periods | Allocate deliveries across days by HDD between fill dates |
| Fewer than 6 months of bills | Unreliable slope | Blend bill-based and modeled UA, weight by data coverage |
| Gas also heats water and cooks | Overstates heating load | Subtract summer baseload from every period |
| Wood stove or space heaters supplement heat | Understates load, so heat pump looks cheaper than reality | Ask directly; widen the range if yes |
| Home already has a heat pump | Reverse question | Run the comparison backwards against a chosen fuel baseline |
| Boiler with radiators, no ducts | Ducted options don't fit | Default to ductless or air-to-water; flag partial coverage |
| Very cold climate (design temperature below -10°F) | Backup share dominates cost | Require cold-climate tier; show backup share prominently |
| Net metering or solar | Marginal electricity price differs from retail | v1: let user override price; v2: model solar |
| Tiered rates with high winter tiers | Heat pump kWh priced at top tier | Price incremental kWh through the actual tier structure |
| Bill shows abnormal period (vacancy, renovation) | Skews regression | Flag outliers and let user exclude periods |

## Risks, open questions, and phasing

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tool overpromises savings, user's bills go up | Lost trust, reputational harm | Show ranges, field COP haircut, backup share; never round up savings |
| Default prices go stale | Wrong answers at scale | Scheduled refresh with as-of date on every result |
| Rate data is incomplete for small utilities | Tariff errors | Fall back to state average with a visible warning; allow manual rate entry |
| Bill upload handles personal data | Privacy exposure | Parse in session, store only derived usage, clear retention policy |
| Users read operating cost as total cost | Bad decisions | Keep installed cost and payback visible next to operating cost |

**Decisions**

| Question | Decision (November 2026) |
| --- | --- |
| Audience and channel | Homeowners considering a switch, and homeowners who already switched and want to know what they're actually saving. Standalone public page on GitHub Pages, built in JavaScript with D3. No utility account integration. |
| What "would have been paying" means | Both. An apples-to-apples comparison under identical weather and prices, plus a "you could have saved $X over the last 5 winters" result. People who already switched get a reverse mode that measures savings against their old fuel. |
| Bill data path for v1 | Manual entry. CSV and PDF upload are future options; their costs are in Technical architecture. |
| Cooling in the headline | Results split into Heating, Cooling, and All with a toggle. |
| Rebate lookup | Future. |
| Browser vs backend | All calculation runs in the browser. A scheduled GitHub Action refreshes data monthly. No server runs. |

**Still open**

- [ ] Weather region size: state, state × climate zone, or about 100 representative stations? Smaller regions are more accurate but mean more files to maintain.
- [ ] Electricity pricing in v1: flat state average plus fixed charge, or a few common rate shapes (tiered, time-of-use)?
- [ ] Reverse mode inputs: require winter electricity bills from after the switch, or allow an estimate when they aren't handy?

**Phasing**

| Phase | Scope |
| --- | --- |
| v0 prototype | Spreadsheet or notebook model of the 5 stages, validated on 10 reference homes; data pipeline script that builds price and weather JSON |
| v1 | Static site on GitHub Pages with D3: 4 required inputs, manual bill entry, tier-based heat pumps, state average prices, monthly price refresh via GitHub Actions, regional binned weather, five-winter lookback, reverse mode for people who already switched, Heating/Cooling/All toggle, ranges, assumptions panel |
| v1.1 | Dual fuel with economic balance point, specific model lookup, emissions |
| v2 | CSV bill upload, utility rate shapes (tiered, time-of-use) using hourly weather files |
| Future | PDF bill upload, rebate lookup (for example via the Rewiring America incentives API), utility data connections (needs a serverless function) |

Sources: [ResStock datasets](https://resstock.nrel.gov/datasets), [Section 25C status for 2026](https://filterbuy.com/resources/heat-pumps/heat-pumps-basics/heat-pump-rebates-and-tax-incentives-in-2026/), [HEAR rebate status](https://energyrebatecalculator.com/blog/heat-pump-tax-credit-2026).
