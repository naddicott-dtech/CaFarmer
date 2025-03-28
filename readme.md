# California Climate Farmer - Implementation Guide

## Project Overview

California Climate Farmer is a browser-based simulation game designed to educate players about sustainable farming practices under changing climate conditions in California. Players manage a farm, making strategic decisions about crops, water, soil management, economics, and technology adoption while facing the dynamic challenges of climate change simulated through events and evolving environmental parameters.

## Current Status & Recent Changes

- **Core Simulation:** The core game loop (`game.js`, `cell.js`) simulates daily ticks, crop growth (basic), soil health changes (including empty plots), water reserves, basic economics (costs, interest, subsidies), technology research, and a dynamic event system.
- **Headless Testing:** A significant refactoring separated the core simulation logic from the UI (`ui.js`). This enables fast, automated testing of different farming strategies (`scripts/test/strategies.js`) using Node.js via a test harness (`scripts/test/test-harness.js`) and a runner script (`run-tests.js`). This setup is crucial for balancing and future development (e.g., ML).
- **Initial Balancing:** Recent updates addressed critical bugs and performed an initial balancing pass focusing on early-game economics (adjusted starting balance, planting costs, crop values/times, overhead, interest rate) and refined logging for better test analysis. However, active farming strategies still face significant economic challenges in the early game.
- **UI:** The browser-based UI (`index.html`, `ui.js`) remains functional for interactive play but is now decoupled from the core simulation loop used in testing.

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
| |-- test-harness.js # TestHarness class: Manages execution of test strategies
| |-- strategies.js # Implementations of automated farming strategies
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
    - Manages grid, crops, soil, water, economics, tech, and events.
    - **No longer contains test-specific setup methods.** Test interaction managed by `TestHarness`.

- **`cell.js` (Cell Class):**
    - Represents a single farm plot.
    - Manages properties: crop, water, soil, growth, history, pests, etc.
    - Includes logic for daily updates, including empty plot dynamics.
    - Contains methods for `plant`, `irrigate`, `fertilize`, `harvest`.

- **`crops.js` (Crop Definitions):**
    - Defines data for all crop types (`id`, `name`, `waterUse`, `growthTime`, `harvestValue`, `basePrice`, sensitivities, etc.).
    - Provides `getCropById` helper.

- **`events.js` (Event System):**
    - Generates and applies random and scheduled game events (weather, market, policy, technology).
    - Modifies game state based on event outcomes. Includes logic for multi-day events (droughts, heatwaves).

- **`technology.js` (Technology Tree):**
    - Defines available technologies, costs, effects, and prerequisites.
    - Provides helper functions (`checkTechPrerequisites`, `getTechEffectValue`).

- **`ui.js` (UI Manager):**
    - Manages rendering and interaction for the **browser version only**.
    - Handles canvas drawing, HUD updates, modals, tooltips, event listeners.
    - Instantiated by `game.js` only when `headless: false`.

- **`utils.js` (Utility Functions):**
    - Includes `formatCurrency`, `calculateFarmHealth`, `calculateFarmValue`.
    - Contains the `Logger` class with configurable verbosity and console output levels.

### Headless Testing Framework (`run-tests.js`, `scripts/test/`)

- **`run-tests.js` (Test Runner):**
    - A Node.js script executed from the command line (`node run-tests.js`).
    - Imports and instantiates the `TestHarness`.
    - Selects which tests to run (all by default, or specific IDs via arguments).
    - Initiates the test run.

- **`test/test-harness.js` (Test Harness):**
    - Manages the execution flow for multiple test strategies.
    - Instantiates `CaliforniaClimateFarmer` in `headless: true` mode for each test.
    - Calls `setupTestStrategy` to configure the game instance.
    - Runs the simulation loop by repeatedly calling `gameInstance.runTick()` until end condition (Year 50 or Balance <= 0).
    - Collects and displays summary results using `console.table`.

- **`test/strategies.js` (Test Strategies):**
    - Implements different automated farming approaches (e.g., `monoculture`, `diverse`, `tech-focus`).
    - `setupTestStrategy` function assigns a specific update function (e.g., `updateMonocultureStrategy`) to the `gameInstance.strategyTick` hook.
    - Strategy update functions are called by `gameInstance.runTick()` and make decisions (plant, irrigate, research, etc.) by calling methods on the `gameInstance`.

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
2. **Ensure `main.js` is Clean:** Verify `main.js` does not contain any imports or logic related to `TestHarness` (already done in refactoring).
3. **HTML Cleanup:** Ensure `index.html` does not contain any UI elements specific to test mode (e.g., "Run Tests" button, test options panel) (already done in refactoring).
4. **Core Code:** The core simulation files (`game.js`, `cell.js`, etc.) can remain as they are, as the `headless` flag and `strategyTick` hook do not interfere with browser gameplay when initiated via `main.js`.

## Key Design Points & Improvements

- **Modularity:** Clear separation of concerns using ES Modules.
- **Decoupled Testing:** Headless testing framework allows rapid iteration and balancing without UI overhead, using the same core simulation code.
- **Maintainability:** Easier to update individual systems.
- **Extensibility:** Modular design supports adding new features (crops, techs, events, mechanics).
- **Data-Driven:** Core parameters (crops, techs) are defined in dedicated data files (`crops.js`, `technology.js`).
- **Realistic Simulation Goals:** Aims to model complex interactions (climate, soil, water, economics) based on real-world data and formulas (see TDD.md).

## Implementation Notes

- Uses ES modules (`import`/`export`).
- Browser version uses `requestAnimationFrame` for the game loop.
- Headless tests run via Node.js in a simple `while` loop.
- Logging is handled by the `Logger` class in `utils.js` with configurable levels.
