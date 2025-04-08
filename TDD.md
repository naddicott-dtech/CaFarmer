```markdown
# California Climate Farmer - Technical Design Document (Updated)

## 1. Project Overview

California Climate Farmer is a browser-based simulation game focused on educating players about the challenges and adaptation strategies for farming in California under climate change. Players manage a farm, making decisions about crops, water use, soil health, technology adoption, and finances. The game simulates environmental conditions (including increasing drought and heatwave risks) and economic factors over time.

**Core Objective:** To create an engaging simulation demonstrating the economic and environmental trade-offs of different farming practices and technologies in the face of climate volatility, grounded in realistic data and simplified scientific models.

**Key Features:**
- Grid-based farm management.
- Simulation of crop growth, soil health, water resources, and basic farm economics.
- Dynamic event system (weather, market, policy, tech).
- Technology tree for adaptation strategies.
- Headless automated testing framework for balancing and analysis.
- Decoupled browser-based UI for interactive gameplay.

## 2. Current Development Status (As of Post-Bug Fixing & Re-Balancing)

- **Engine:** Core simulation loop (`runTick`) is functional and decoupled from UI. Runs daily steps updating crop growth, soil health (incl. realistic empty plot degradation), water reserves, and basic economics.
- **Testing:** Headless testing framework (`run-tests.js`, `TestHarness`, `strategies.js`) is operational via Node.js. Runs multiple automated strategies until bankruptcy or time limit (Year 50). Essential for iterative balancing.
- **Major Bugs Fixed:**
    - Resolved critical failure in `game.js::processPendingEvents` that prevented most event types (weather, market, etc.) from being applied.
    - Corrected bug in `strategies.js` where `monoculture` and `diverse` setups failed to plant initial crops.
- **Balancing:** Multiple passes focused on early/mid-game economic viability:
    - **Costs:** Adjusted `INITIAL_BALANCE`, `PLANTING_COST_FACTOR` (low), `DAILY_OVERHEAD_COST` (low), `IRRIGATION_COST` (moderate), `FERTILIZE_COST` (moderate).
    - **Income:** Tuned `harvestValue` and `growthTime` for crops, initially boosted significantly then slightly reduced for fastest crops. `ANNUAL_INTEREST_RATE` kept low.
    - **Subsidies:** Adjusted sustainability score thresholds, removed guaranteed early support.
    - **Events:** Implemented cost scaling for negative monetary events (`policy`, `technology`). Tuned innovation grant probability/amounts to reduce extreme windfalls.
    - **Strategies:** Basic strategies (`mono`/`diverse`) modified to delay tech research past Year 1.
    - **Farm Value:** `calculateFarmValue` adjusted to reduce impact of passive soil health.
    - **Soil:** Empty plot degradation increased, regeneration decreased.
- **Current Balance State (via Headless Tests):**
    - `no-action`: Survives 50 years but shows realistic decline in balance, farm value, health, and sustainability. Functions as a proper baseline.
    - `tech-focus`: Survives 50 years, achieves high balance (potentially still too high due to grants, requires monitoring). Health/sustainability mediocre, indicating tech investment alone isn't a full solution.
    - `water-saving`: Survives significantly longer than basic strategies (~Year 28 in one run) but ultimately fails, highlighting limitations of single-focus adaptation.
    - `monoculture` / `diverse`: Now survive past Year 1 (typically failing around Year 4-6). Demonstrates the challenge of basic farming without adaptation or tech, closer to intended difficulty.
- **Mechanics:**
    - Basic heat/drought/frost yield penalties are functional (via fixed event system).
    *   Empty plot soil degradation is active and tuned.
- **Logging:** Refined for headless analysis, with harvest logs aggregated per tick in strategies.
- **UI:** Browser UI functional but needs usability improvements (bulk actions).
- **Planned Features:** Major systems (detailed economics, soil OM/nutrients, water rights, labor, crop rotation) remain **NOT YET IMPLEMENTED**.

## 3. Core Gameplay Loop (Current Implementation)

1.  Game state updates daily (`runTick`).
2.  Daily overhead cost is deducted.
3.  Cell states (crop growth, soil, water, pests) are updated based on simplified models and tech effects.
4.  Pending events are processed via `processPendingEvents`, potentially altering game state (resources, balance, market prices, cell conditions). Negative monetary event costs are scaled.
5.  New random events are potentially scheduled.
6.  Farm health and value are recalculated.
7.  If running headless test, the assigned `strategyTick` function executes farm actions (plant, irrigate, fertilize, harvest, research).
8.  If running in browser, the UI updates, and player actions are handled via UI event listeners.
9.  Season and Year advance, triggering interest calculation, subsidies, climate change progression, and potential milestone events.

## 4. System Architecture & Modules

The modular architecture remains, with updates reflecting the headless testing setup and recent fixes/balancing.

- **Module 1: Simulation Engine (`game.js`, `cell.js`)**
    - **Responsibilities:** Manages core game state and daily `runTick` execution. Handles `headless` flag. Contains `strategyTick` hook. Simulates crop growth, soil health (incl. empty plots), cell water levels. Calculates farm health. Manages tech research state. Applies event effects (incl. scaling costs). Basic economics (balance, interest, subsidies, overhead). `harvestCell` updates balance and returns harvest data.
    - **Current State:** Core loop functional. Event processing bug fixed. Economic parameters heavily tuned. Still uses simplified growth/yield/soil models.

- **Module 2: Data Modules (`crops.js`, `technology.js`)**
    - **Responsibilities:** Define static data for crops and technologies. Provide helper functions.
    - **Current State:** Functional. `harvestValue`, `growthTime`, and some tech `cost` values adjusted during balancing.

- **Module 3: Event System (`events.js`)**
    - **Responsibilities:** Generate and apply probabilistic events. Handles event duration and impact scaling. `apply...` functions return effects to be applied by `game.js`.
    - **Current State:** Major processing bug fixed in `game.js`. Grant event logic (`createInnovationGrantEvent`) tuned to reduce extreme payouts. Base costs for policy/tech setbacks defined here.

- **Module 4: Utility Module (`utils.js`)**
    - **Responsibilities:** Provide helper functions (`formatCurrency`, `calculateFarmHealth`, `calculateFarmValue`). Contains `Logger` class.
    - **Current State:** Functional. `calculateFarmValue` revised to reduce passive value inflation. Logger levels refined.

- **Module 5: UI Management (`ui.js`, `main.js`, `index.html`)**
    - **Responsibilities:** Handles rendering and user interaction for the browser-based game only. Decoupled from core `runTick`.
    - **Current State:** Functional but needs UX improvements (bulk actions). Confirmed compatible with `harvestCell` refactor.

- **Module 6: Headless Testing Framework (`run-tests.js`, `test/test-harness.js`, `test/strategies.js`)**
    - **Responsibilities:** Orchestrate automated test runs via Node.js. Instantiate headless game instances. Assign and execute strategies. Log results.
    - **Current State:** Functional. Initial planting bug in strategy setup fixed. Basic strategies (`mono`/`diverse`) modified to delay tech research. Harvest logging aggregated.

## 5. Planned Revisions / Future Work (Major Systems)

These key systems remain **priorities for future development** to achieve the desired simulation depth:

- **Agricultural Economic Model:** Implement seasonal loans, crop insurance, detailed operating costs (especially labor per crop type), realistic profit margins.
- **Soil Health System:** Model Soil Organic Matter (OM) impacting water holding capacity and nutrient availability. Implement nutrient cycling (N, P, K) with crop uptake, fertilizer inputs, fixation (covers), and leaching losses. Refine impact of tillage, covers, compost on OM and health.
- **Water Management System:** Implement groundwater pumping costs scaling with depth, aquifer depletion mechanics (linked to SGMA concept). Add surface water rights/allocations that vary with drought.
- **Labor Model:** Track labor demand per crop/task vs. availability. Implement wage fluctuations or penalties/losses for labor shortages. Model impact of mechanization tech.
- **Crop Rotation:** Implement tracking of crop history per plot and provide explicit benefits (pest/disease reduction, soil health boost) for diverse rotations, and stronger penalties for continuous monoculture (current penalties are basic).
- **Advanced Events:** Add flood events (requiring drainage/levees?), wildfire smoke impacts, pest/disease outbreaks linked to climate/monoculture. Model multi-year impacts of major events.
- **Tech Effects:** Refine and expand the effects of researched technologies on yield, costs, soil health, water use, and event resilience based on research data. Ensure tech investments provide tangible, balanced benefits beyond just enabling grants.

## 6. Target Formulas for Future Implementation (From Research)

These represent more realistic models to incorporate during future revisions:

- **Water Balance (Daily):** `M[t+1] = M[t] + I[t] + R[t] - (Kc * ET₀[t]) - D[t]`
- **Yield Response to Water (FAO):** `1 - Y/Ymax = Ky * (1 - ETa/ETm)`
- **Growing Degree Days:** `GDD = max(((Tmax+Tmin)/2 - Tbase), 0)`
- **Nitrogen Budget:** `N_soil_new = N_soil_old + N_fert + N_fix - N_uptake - N_leached`
- **Soil Organic Matter:** `ΔOM = Inputs - (k * OM)`
- **Soil Erosion (USLE):** `A = R*K*LS*C*P`
- **Net Present Value (NPV):** `NPV = sum( CashFlow_t / (1+r)^t )`

*(Note: Current implementation uses simpler approximations).*

## 7. Testing Methodology (Current & Planned)

- **Headless Strategy Testing (Current):** Primary method for balancing. Run `node run-tests.js [ids...]` to execute automated strategies. Analyze end-state results and console logs (INFO level by default, aggregated harvest logs) to assess economic viability, event impacts, and strategy effectiveness across different dimensions (profit, sustainability, farm health/value).
- **Unit Testing (Planned):** Implement unit tests for critical functions.
- **Integration Testing (Planned):** Create tests simulating interactions between modules.
- **User Acceptance Testing (Planned):** Manual testing of the browser version for usability, engagement, clarity, and fun/educational value.

## 8. Head-Full Game Needs & UI/UX

While headless testing is efficient, the **interactive browser experience needs attention:**

- **Usability:** Manually clicking every plot is tedious.
- **Required Feature:** Implement **bulk action tools** (Plant/Irrigate/Fertilize/Harvest Row/Column/Field). This is crucial for playability.
- **Feedback:** Ensure UI clearly communicates current tool/action mode, costs, and outcomes. Improve tooltips or info panels.
- **Performance:** Monitor rendering performance.

## 9. Planning for ML Advisor

The current headless, modular structure remains well-suited for future ML integration.

**Key Considerations for ML:**

- **Environment Interface:** Formalize State Representation, Action Space (including bulk actions), and Reward Function (balancing profit, sustainability, farm value). The `step()` function based on `game.runTick()` needs refinement to handle action inputs and reward calculation.
- **Framework Choice:** TensorFlow.js (in Node.js) or Python via API remain options.
- **Training:** Fast headless execution is essential. Ensure simulation remains deterministic.

**Planning Ahead:** Keep ML interface needs in mind during further development.

## 10. Deliverables & Constraints

- **Code:** Well-commented, modular JavaScript using ES Modules.
- **Testing:** Automated headless tests via Node.js.
- **Documentation:** This TDD, README.md, inline code comments.
- **Performance:** Headless tests should run quickly. Browser version needs responsive UI.

/california-climate-farmer
|-- index.html # Main HTML for the browser game
|-- style.css # Main CSS for styling
|-- run-tests.js # Node.js script to execute headless tests
|-- scripts/
| |-- main.js # Entry point for BROWSER game: Initializes UI game instance
| |-- game.js # Core game logic: CaliforniaClimateFarmer class, simulation engine
| |-- cell.js # Cell class: Manages individual farm plot properties
| |-- crops.js # Crop definitions and data
| |-- events.js # Event system: Generation and application of game events
| |-- technology.js # Technology tree: Definitions and management
| |-- ui.js # UI Manager: Handles browser UI rendering and interactions
| |-- utils.js # Utility functions: Formatting, calculations, Logger class
| |-- test/ # Headless testing framework
| | |-- test-harness.js # TestHarness class: Manages execution of test strategies
| | |-- strategies.js # Implementations of automated farming strategies
|-- TDD.md # Technical Design Document (this file)
|-- README.md # Project overview and guide 
```
