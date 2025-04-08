# California Climate Farmer - Implementation Guide

## Project Overview

California Climate Farmer is a browser-based simulation game designed to educate players about sustainable farming practices under changing climate conditions in California. Players manage a farm, making strategic decisions about crops, water, soil management, economics, and technology adoption while facing the dynamic challenges of climate change simulated through events and evolving environmental parameters.

## Current Status & Recent Changes

- **Core Simulation:** The core game loop (`game.js`, `cell.js`) simulates daily ticks, crop growth, soil health changes (including realistic empty plot degradation), water reserves, basic economics (costs, interest, subsidies), technology research, and a dynamic event system.
- **Headless Testing:** The core simulation logic remains decoupled from the UI (`ui.js`), enabling fast, automated testing (`scripts/test/strategies.js`, `scripts/test/test-harness.js`, `run-tests.js`). This setup is crucial for balancing and future development.
- **Major Bug Fixes:**
    - Resolved a critical bug where events (weather, market, etc.) were not being correctly processed in `game.js`, preventing their effects from applying.
    - Fixed a bug where the `monoculture` and `diverse` test strategies failed to plant crops during initial setup, causing immediate economic disadvantage.
- **Iterative Balancing:** Multiple balancing passes focused on the early-to-mid game economy:
    - Adjusted `INITIAL_BALANCE`, `PLANTING_COST_FACTOR`, `DAILY_OVERHEAD_COST`, `IRRIGATION_COST`, `FERTILIZE_COST`.
    - Tuned crop `harvestValue` and `growthTime`, particularly for early-game income.
    - Refined subsidy thresholds and amounts, removing guaranteed early grants.
    - Implemented scaling for negative event costs (`policy`, `technology`) based on player balance.
    - Tuned innovation grant frequency and amounts to reduce excessive randomness.
    - Adjusted `calculateFarmValue` to better reflect active improvements vs. passive value.
    - Tuned empty plot soil degradation/regeneration rates.
    - Delayed tech research in basic strategies (`monoculture`, `diverse`) to test core loop viability.
- **Current Balance State:**
    - `no-action` strategy now fails realistically over the long term (low balance, minimal farm value, poor health/sustainability).
    - `tech-focus` is viable long-term, potentially very profitable, though success may still be influenced by grant luck (needs further monitoring/tuning).
    - `water-saving` survives longer than basic strategies (e.g., Year 9) but eventually fails, showing single-focus adaptation isn't sufficient.
    - `monoculture` and `diverse` now survive the first year but fail mid-game (e.g., Year 4-5), representing the challenge for unadapted strategies. This is closer to the desired difficulty curve.
- **UI:** The browser-based UI (`index.html`, `ui.js`) remains functional for interactive play but is now decoupled from the core simulation loop used in testing. Requires usability improvements (bulk actions).


## File Structure
```
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
|-- TDD.md # Technical Design Document
|-- README.md # Project overview and guide (this file)
```

## Key Components

### Core Game Logic (`scripts/`)

- **`main.js` (Browser Entry Point):**
    - Solely responsible for initializing and starting the interactive browser version of the game.
    - Imports `game.js` and instantiates `CaliforniaClimateFarmer` with `headless: false`.
    - Handles the splash screen ("Start Regular Game" button).
    - **Does NOT handle test execution.**

- **`game.js` (Core Game Logic & Simulation Engine):**
    - Contains the `CaliforniaClimateFarmer` class.
    - Can be run in `headless: true` (for tests) or `headless: false` (for UI).
    - Manages core game state (day, year, balance, resources, etc.).
    - Contains the `runTick()` method which executes one step of the simulation (independent of UI).
    - Includes a `strategyTick` hook for automated strategies to inject actions in headless mode.
    - Manages grid, crops, soil, water, economics (costs, interest, subsidies, scaled event costs), tech, and events.
    - Applies event effects via `processPendingEvents`.
    - `harvestCell` method now returns harvest details for potential use by strategies, while still updating balance internally.

- **`cell.js` (Cell Class):**
    - Represents a single farm plot.
    - Manages properties: crop, water, soil, growth, history, pests, etc.
    - Includes logic for daily updates, including adjusted empty plot dynamics (increased degradation).
    - Contains methods for `plant`, `irrigate`, `fertilize`, `harvest`. `harvest` method resets cell and calculates results.

- **`crops.js` (Crop Definitions):**
    - Defines data for all crop types (`id`, `name`, `waterUse`, `growthTime`, `harvestValue`, `basePrice`, sensitivities, etc.). Values iteratively tuned for balance.
    - Provides `getCropById` helper.

- **`events.js` (Event System):**
    - Generates and applies random and scheduled game events (weather, market, policy, technology).
    - Defines event effects (e.g., `applyDroughtEvent`, `applyPolicyEvent`) which return changes to be applied by `game.js`.
    - Includes logic for multi-day events (droughts, heatwaves).
    - Grant event (`createInnovationGrantEvent`) logic tuned to reduce excessive payouts.

- **`technology.js` (Technology Tree):**
    - Defines available technologies, costs, effects, and prerequisites. Some early tech costs adjusted for balance.
    - Provides helper functions (`checkTechPrerequisites`, `getTechEffectValue`). `getTechEffectValue` logic updated.

- **`ui.js` (UI Manager):**
    - Manages rendering and interaction for the **browser version only**.
    - Handles canvas drawing, HUD updates, modals, tooltips, event listeners.
    - Instantiated by `game.js` only when `headless: false`.
    - Currently relies on side-effects of `game.harvestCell` for UI updates (balance, cell info), confirmed compatible with recent `harvestCell` refactor.

- **`utils.js` (Utility Functions):**
    - Includes `formatCurrency`, `calculateFarmHealth`, `calculateFarmValue`.
    - `calculateFarmValue` logic revised to better reflect active improvements and reduce passive value inflation.
    - Contains the `Logger` class with configurable verbosity and console output levels.

### Headless Testing Framework (`run-tests.js`, `scripts/test/`)

- **`run-tests.js` (Test Runner):**
    - A Node.js script executed from the command line (`node run-tests.js`).
    - Imports and instantiates the `TestHarness`.
    - Selects which tests to run (all by default, or specific IDs via arguments like `node run-tests.js monoculture diverse`).
    - Initiates the test run.

- **`test/test-harness.js` (Test Harness):**
    - Manages the execution flow for multiple test strategies.
    - Instantiates `CaliforniaClimateFarmer` in `headless: true` mode for each test.
    - Calls `setupTestStrategy` to configure the game instance (fixed initial planting).
    - Runs the simulation loop by repeatedly calling `gameInstance.runTick()` until end condition (Year 50 or Balance <= 0).
    - Collects and displays summary results using `console.table`.

- **`test/strategies.js` (Test Strategies):**
    - Implements different automated farming approaches (`monoculture`, `diverse`, `tech-focus`, `water-saving`, `no-action`).
    - `setupTestStrategy` function assigns a specific update function to the `gameInstance.strategyTick` hook. (Initial planting bug fixed).
    - Strategy update functions are called by `gameInstance.runTick()` and make decisions.
    - `monoculture` and `diverse` strategies modified to delay tech research until Year 2.
    - Harvest logging modified to be aggregated per tick for better readability.

## Running the Game / Tests

- **Interactive Browser Game:** Open `index.html` in a web browser. Click "Start Regular Game".
- **Headless Automated Tests:**
    1. Ensure Node.js is installed.
    2. Open a terminal/command prompt in the project root directory.
    3. Run `node run-tests.js` (runs all defined strategies).
    4. Optionally, run specific strategies: `node run-tests.js monoculture tech-focus`.
    5. Observe console output for yearly summaries and final results table. Adjust logger levels in `utils.js` or `game.js` for more/less detail.

## Preparing for Public Release

Distributing only the browser game without the testing framework:

1. **Exclude Test Files:** Do not include `run-tests.js` or the entire `scripts/test/` directory in the distributed files.
2. **Ensure `main.js` is Clean:** Verify `main.js` does not contain any imports or logic related to `TestHarness` (already done).
3. **HTML Cleanup:** Ensure `index.html` does not contain any UI elements specific to test mode (already done).
4. **Core Code:** The core simulation files (`game.js`, `cell.js`, etc.) can remain as they are, as the `headless` flag and `strategyTick` hook do not interfere with browser gameplay when initiated via `main.js`.

## Key Design Points & Improvements

- **Modularity:** Clear separation of concerns using ES Modules.
- **Decoupled Testing:** Headless testing framework allows rapid iteration and balancing without UI overhead, using the same core simulation code.
- **Maintainability:** Easier to update individual systems. Fixes to core logic (events, planting) demonstrate value of modularity.
- **Extensibility:** Modular design supports adding new features (crops, techs, events, mechanics).
- **Data-Driven:** Core parameters (crops, techs) are defined in dedicated data files (`crops.js`, `technology.js`).
- **Realistic Simulation Goals:** Aims to model complex interactions (climate, soil, water, economics) based on real-world data and formulas (see TDD.md). Current balance achieves more plausible outcomes for different strategies.

## Implementation Notes

- Uses ES modules (`import`/`export`).
- Browser version uses `requestAnimationFrame` for the game loop.
- Headless tests run via Node.js in a simple `while` loop.
- Logging is handled by the `Logger` class in `utils.js` with configurable levels. Harvest logging modified for aggregation in strategies.
