# California Climate Farmer - Implementation Guide

## Project Overview
California Climate Farmer is a browser-based simulation game that teaches players about sustainable farming practices under changing climate conditions. Players manage a farm in California, making decisions about crops, water, soil management, and technology adoption while facing the challenges of climate change.

## File Structure
The project has been refactored into a modular structure:

```
/california-climate-farmer
|-- index.html
|-- styles/
|   |-- main.css
|-- scripts/
|   |-- main.js            # Entry point
|   |-- game.js            # Core game logic
|   |-- cell.js            # Cell class and methods
|   |-- crops.js           # Crop definitions
|   |-- events.js          # Event generation and handling
|   |-- technology.js      # Technology tree handling
|   |-- ui.js              # UI-related functions
|   |-- utils.js           # Helper functions
|   |-- test/              # Test-related code (can be excluded in public release)
|       |-- test-harness.js    # Test framework
|       |-- strategies.js      # Test strategies implementation
```

## Key Components

### Core Game Logic
- `main.js`: Entry point that initializes the game or test harness
- `game.js`: Main game class with simulation logic
- `cell.js`: Manages individual farm plots 
- `crops.js`: Defines crop types and properties
- `events.js`: Handles random events (weather, market, etc.)
- `technology.js`: Manages the research tree
- `ui.js`: Handles UI rendering and interactions
- `utils.js`: Provides utility functions

### Test Framework
- `test/test-harness.js`: Framework for automated testing
- `test/strategies.js`: Implementation of different farming strategies

## Modified HTML

The index.html file would need to properly import the JS modules:

```html
<!-- Add to your index.html head section -->
<script type="module" src="scripts/main.js"></script>
```

## Removing Test Functionality for Public Release

To remove the test functionality for a public release, follow these steps:

1. **Remove test imports in main.js**:
   - Delete the import line: `import { TestHarness } from './test/test-harness.js';`
   - Delete all code in the "TEST MODE" section (clearly marked with comments)

2. **Remove test directory**:
   - Delete the entire `scripts/test/` directory

3. **Remove test-related methods in game.js**:
   - Delete or comment out the `setupTestMode()`, `runTestUpdate()`, and `terminateTest()` methods
   - Remove the test mode initialization in the constructor

4. **Remove UI elements**:
   - Remove any test mode buttons or UI components from index.html
   - Remove debug panel HTML if not needed for the release

## Key Improvements from Refactoring

1. **Modularity**: Code is now organized into logical modules with clear responsibilities
2. **Testability**: Test code is separated from core functionality
3. **Maintainability**: Each component can be updated independently
4. **Code Reuse**: Helper functions and utilities are properly encapsulated
5. **Extensibility**: New features can be added by extending the appropriate modules

## Implementation Notes

- All JavaScript files use ES modules (import/export)
- The UI is designed to be responsive and adapt to different screen sizes
- The game loop uses requestAnimationFrame for optimal performance
- Environmental conditions are simulated with realistic formulas based on input parameters
