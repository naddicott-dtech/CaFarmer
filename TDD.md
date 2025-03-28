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

## 2. Current Development Status (As of Post-Refactor & Initial Balancing)

- **Engine:** Core simulation loop (`runTick`) is functional and decoupled from UI. Runs daily steps updating basic crop growth, soil health (incl. empty plot degradation), water reserves, and simple economics.
- **Testing:** Headless testing framework (`run-tests.js`, `TestHarness`, `strategies.js`) is operational via Node.js. Runs multiple automated strategies until bankruptcy or time limit.
- **Balancing:**
    - **Passive Income Reduced:** Interest rate significantly lowered; sustainability subsidies adjusted. `no-action` strategy is now roughly break-even, not highly profitable.
    - **Early Economics Adjusted:** Starting balance increased, planting cost factor reduced, basic daily overhead added, some crop harvest values/growth times tweaked.
    - **Result:** Active farming strategies still face **severe economic challenges** and typically fail within the first few years due to costs outpacing income. Further balancing is the highest priority.
- **Mechanics:**
    - Basic heat stress yield penalty implemented.
    - Basic drought impact on farm water reserve implemented.
    *   Empty plot soil degradation implemented.
- **Logging:** Refined to reduce console spam, allowing clearer analysis of test results via INFO-level messages (yearly summaries, major events) while retaining detailed logs at DEBUG/VERBOSE levels.
- **UI:** Browser UI remains functional but needs usability improvements (see Section 8).
- **Planned Features:** Major systems described in the original TDD (detailed economics w/ loans, labor costs, soil organic matter/nutrients, crop rotation benefits, advanced water rights) are **NOT YET IMPLEMENTED**.

## 3. Core Gameplay Loop (Current Implementation)

1.  Game state updates daily (`runTick`).
2.  Daily overhead cost is deducted.
3.  Cell states (crop growth, soil, water) are updated based on simplified models and tech effects.
4.  Pending events are processed, potentially altering game state (resources, balance, market prices).
5.  New random events are potentially scheduled.
6.  Farm health and value are recalculated (value based on soil, tech, base land value).
7.  If running headless test, the assigned `strategyTick` function executes farm actions (plant, irrigate, fertilize, harvest, research).
8.  If running in browser, the UI updates, and player actions are handled via UI event listeners.
9.  Season and Year advance, triggering interest calculation, subsidies, climate change progression, and potential milestone events.

## 4. System Architecture & Modules

The modular architecture remains, with updates reflecting the headless testing setup.

- **Module 1: Simulation Engine (`game.js`, `cell.js`)**
    - **Responsibilities:** Manages core game state and daily `runTick` execution. Handles `headless` flag. Contains `strategyTick` hook. Simulates crop growth, soil health, cell water levels. Calculates farm health. Manages tech research state. Applies event effects. Basic economics (balance, interest, subsidies, overhead).
    - **Current State:** Functional but needs significant economic balancing. Growth/yield models are basic. Complex soil/nutrient/labor models are future work.

- **Module 2: Data Modules (`crops.js`, `technology.js`)**
    - **Responsibilities:** Define static data for crops and technologies (costs, effects, prerequisites, etc.). Provide helper functions (`getCropById`, `getTechEffectValue`, etc.).
    - **Current State:** Functional. Data values require ongoing balancing.

- **Module 3: Event System (`events.js`)**
    - **Responsibilities:** Generate and apply probabilistic events (weather, market, policy, tech). Handles event duration and impact scaling. Includes heat stress and drought reserve impact.
    - **Current State:** Functional. Event probability, frequency, and magnitude need balancing. Logging levels adjusted.

- **Module 4: Utility Module (`utils.js`)**
    - **Responsibilities:** Provide helper functions (`formatCurrency`, `calculateFarmHealth`, `calculateFarmValue`). Contains `Logger` class.
    - **Current State:** Functional. `calculateFarmValue` revised to exclude cash balance and adjust tech value. Logger levels refined.

- **Module 5: UI Management (`ui.js`, `main.js`, `index.html`)**
    - **Responsibilities:** Handles rendering and user interaction for the browser-based game only. Initiated via `main.js`. Decoupled from core `runTick`.
    - **Current State:** Functional but needs UX improvements (see Section 8).

- **Module 6: Headless Testing Framework (`run-tests.js`, `test/test-harness.js`, `test/strategies.js`)**
    - **Responsibilities:** Orchestrate automated test runs via Node.js. Instantiate headless game instances. Assign and execute strategies via `strategyTick` hook. Drive simulation using `runTick`. Log results.
    - **Current State:** Functional. Provides essential tool for balancing. Strategies are basic and need refinement alongside core economic balancing.

## 5. Planned Revisions / Future Work (Major Systems)

These key systems, outlined in the original TDD, remain **priorities for future development** to achieve the desired simulation depth:

- **Agricultural Economic Model:** Implement seasonal loans, crop insurance, detailed operating costs (especially labor per crop type), realistic profit margins.
- **Soil Health System:** Model Soil Organic Matter (OM) impacting water holding capacity and nutrient availability. Implement nutrient cycling (N, P, K) with crop uptake, fertilizer inputs, fixation (covers), and leaching losses. Refine impact of tillage, covers, compost on OM and health.
- **Water Management System:** Implement groundwater pumping costs scaling with depth, aquifer depletion mechanics (linked to SGMA concept). Add surface water rights/allocations that vary with drought.
- **Labor Model:** Track labor demand per crop/task vs. availability. Implement wage fluctuations or penalties/losses for labor shortages. Model impact of mechanization tech.
- **Crop Rotation:** Implement tracking of crop history per plot and provide explicit benefits (pest/disease reduction, soil health boost) for diverse rotations, and stronger penalties for continuous monoculture.
- **Advanced Events:** Add flood events (requiring drainage/levees?), wildfire smoke impacts, pest/disease outbreaks linked to climate/monoculture. Model multi-year impacts of major events.

## 6. Target Formulas for Future Implementation (From Research)

These represent more realistic models to incorporate during future revisions:

- **Water Balance (Daily):** `M[t+1] = M[t] + I[t] + R[t] - (Kc * ET₀[t]) - D[t]`
- **Yield Response to Water (FAO):** `1 - Y/Ymax = Ky * (1 - ETa/ETm)`
- **Growing Degree Days:** `GDD = max(((Tmax+Tmin)/2 - Tbase), 0)`
- **Nitrogen Budget:** `N_soil_new = N_soil_old + N_fert + N_fix - N_uptake - N_leached`
- **Soil Organic Matter:** `ΔOM = Inputs - (k * OM)`
- **Soil Erosion (USLE):** `A = R*K*LS*C*P`
- **Net Present Value (NPV):** `NPV = sum( CashFlow_t / (1+r)^t )`

*(Note: Current implementation uses simpler approximations of some of these concepts).*

## 7. Testing Methodology (Current & Planned)

- **Headless Strategy Testing (Current):** Primary method for balancing. Run `node run-tests.js` to execute automated strategies (`monoculture`, `diverse`, `tech-focus`, `water-saving`, `no-action`) over 50 simulated years. Analyze end-state results (Balance, Farm Value, Health, Water, Sustainability, Techs) and console logs (INFO level by default) to identify economic viability issues, event impacts, and strategy effectiveness.
- **Unit Testing (Planned):** Implement unit tests for critical functions within modules (e.g., `cell.update`, `calculateFarmValue`, event application logic) using a framework like Jest or Mocha.
- **Integration Testing (Planned):** Create tests simulating interactions between modules (e.g., does researching water tech correctly reduce water use and affect economics over a season?).
- **User Acceptance Testing (Planned):** Manual testing of the browser version for usability, engagement, clarity of feedback, and overall fun/educational value, especially after major balancing or feature additions.

## 8. Head-Full Game Needs & UI/UX

While headless testing is efficient for balancing, the **interactive browser experience needs attention:**

- **Usability:** Manually clicking every plot for planting, irrigation, or harvesting is tedious for a full field.
- **Required Feature:** Implement **bulk action tools**:
    - "Plant/Irrigate/Fertilize/Harvest Row" button/mode.
    - "Plant/Irrigate/Fertilize/Harvest Column" button/mode.
    - "Plant/Irrigate/Fertilize/Harvest Whole Field" (or maybe quadrant/zone) button/mode. This is crucial for playability.
- **Feedback:** Ensure UI clearly communicates current tool/action mode, costs, and outcomes. Improve tooltips or info panels.
- **Performance:** Monitor rendering performance as complexity increases.

## 9. Planning for ML Advisor

The current headless, modular structure is well-suited for future Machine Learning integration (e.g., training a Reinforcement Learning agent to play the game).

**Key Considerations for ML:**

- **Environment Interface:** The `CaliforniaClimateFarmer` class already forms the basis of the environment. We will need to formalize:
    - **State Representation (Observation Space):** Define what information the ML agent receives each step. This could include: current balance, year/day/season, water reserve, average soil health, tech researched (encoded), market prices, active negative events, and potentially simplified grid state (e.g., % plots planted, % harvest-ready). Need to balance detail vs. complexity.
    - **Action Space:** Define the discrete actions the agent can take (e.g., research tech X, plant crop Y on plot Z, irrigate plot Z, fertilize plot Z, wait). Bulk actions simplify the action space.
    - **Reward Function:** Define how to reward the agent. This is critical. Rewards could be based on:
        - Change in balance/farm value per step/year.
        - Successful harvests.
        - Reaching sustainability score milestones.
        - Penalties for bankruptcy or very low health/sustainability.
        - A combination, weighted appropriately.
    - **`step()` function:** The current `game.runTick()` is essentially the core of the `step` function needed by RL libraries. We'd wrap it to accept an action, run the tick (including applying the chosen action via the strategy hook or a dedicated agent action method), calculate the reward, determine if the episode is done (bankruptcy/time limit), and return (newState, reward, done, info).
- **Framework Choice:**
    - **TensorFlow.js:** Can run directly in Node.js or potentially even the browser, using the existing JS codebase. Good for integration.
    - **Python (Stable-Baselines3, etc.) via API:** Create a simple Node.js server (using e.g., Express) that exposes the JS simulation engine via API endpoints (e.g., `/reset`, `/step`, `/getState`). Python RL libraries can then interact with this API. This allows using the powerful Python ML ecosystem without rewriting the simulation core.
- **Training:** Requires significant computational resources to run thousands/millions of simulation steps. The fast headless execution is essential here.

**Planning Ahead:** As we balance and add features, keep the state/action/reward definitions in mind. Ensure the core simulation remains deterministic (given the same inputs/random seed, produces the same output) for reproducible training.

## 10. Deliverables & Constraints

- **Code:** Well-commented, modular JavaScript using ES Modules.
- **Testing:** Automated headless tests via Node.js. Future unit/integration tests.
- **Documentation:** This TDD, README.md, inline code comments.
- **Performance:** Headless tests should run quickly (currently <100ms per 50-year run is good). Browser version needs to maintain responsive UI.
```
'''
/california-climate-farmer
|-- index.html
|-- style.css        # CSS is in the main directory
|-- scripts/
|   |-- main.js            # Entry point
|   |-- game.js            # Core game logic
|   |-- cell.js            # Cell class and methods
|   |-- crops.js           # Crop definitions
|   |-- events.js          # Event generation and handling
|   |-- technology.js      # Technology tree handling
|   |-- economy.js         # NEW: Loan and economic systems
|   |-- ui.js              # UI-related functions
|   |-- utils.js           # Helper functions
|   |-- test/              # Test-related code
|       |-- test-harness.js    # Test framework
|       |-- strategies.js      # Test strategies implementation
```
