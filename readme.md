# California Climate Farmer - Implementation Guide

## Project Overview

California Climate Farmer is a browser-based simulation game designed to educate players about sustainable farming practices under changing climate conditions in California. Players manage a farm, making strategic decisions about crops, water, soil management, economics, and technology adoption while facing the dynamic challenges of climate change simulated through events and evolving environmental parameters.

## Current Status & Recent Changes

- **Core Simulation:** The core game loop (`game.js`, `cell.js`) simulates daily ticks, crop growth (basic), soil health changes (including empty plots), water reserves, basic economics (costs, interest, subsidies), technology research, and a dynamic event system.
- **Headless Testing:** A significant refactoring separated the core simulation logic from the UI (`ui.js`). This enables fast, automated testing of different farming strategies (`scripts/test/strategies.js`) using Node.js via a test harness (`scripts/test/test-harness.js`) and a runner script (`run-tests.js`). This setup is crucial for balancing and future development (e.g., ML).
- **Initial Balancing:** Recent updates addressed critical bugs and performed an initial balancing pass focusing on early-game economics (adjusted starting balance, planting costs, crop values/times, overhead, interest rate) and refined logging for better test analysis. However, active farming strategies still face significant economic challenges in the early game.
- **UI:** The browser-based UI (`index.html`, `ui.js`) remains functional for interactive play but is now decoupled from the core simulation loop used in testing.

## File Structure
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
