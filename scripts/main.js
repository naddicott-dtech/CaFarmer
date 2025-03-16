/**
 * California Climate Farmer - Main Entry Point
 * 
 * This file serves as the entry point for the game, handling initial setup,
 * splash screen interactions, and launching either the main game or test mode.
 */

console.log('Loading main.js...');

// Use dynamic imports with error handling
let CaliforniaClimateFarmer, TestHarness;

async function loadModules() {
    try {
        console.log('Importing game.js...');
        const gameModule = await import('./game.js');
        CaliforniaClimateFarmer = gameModule.CaliforniaClimateFarmer;
        console.log('Successfully imported game.js');
        
        try {
            console.log('Importing test-harness.js...');
            const testModule = await import('./test/test-harness.js');
            TestHarness = testModule.TestHarness;
            console.log('Successfully imported test-harness.js');
        } catch (error) {
            console.error('Error importing test-harness.js:', error);
        }
    } catch (error) {
        console.error('Error importing game.js:', error);
    }
}

// Global game instance
let gameInstance = null;
let testHarness = null;

// Initialize once modules are loaded
loadModules().then(() => {
    console.log('Modules loaded, setting up event listeners');
    
    // Initialize splash screen controls
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM Content Loaded - Initializing game...");
        
        const splashScreen = document.getElementById('splash-screen');
        const regularGameBtn = document.getElementById('regular-game-btn');
        
        // Start regular game
        regularGameBtn.addEventListener('click', () => {
            console.log("Starting regular game...");
            splashScreen.style.display = 'none';
            startRegularGame();
        });

        // TEST MODE setup - Check if TestHarness was successfully imported
        const testModeBtn = document.getElementById('test-mode-btn');
        const testOptions = document.getElementById('test-options');
        const runSelectedTestsBtn = document.getElementById('run-selected-tests-btn');
        const testAll = document.getElementById('test-all');
        
        if (testModeBtn) {
            console.log("Setting up test mode button");
            
            // Show test options when Test Mode button is clicked
            testModeBtn.addEventListener('click', () => {
                console.log("Test mode button clicked");
                
                if (!TestHarness) {
                    console.error("TestHarness module not loaded. Cannot run tests.");
                    alert("Error: Test module not loaded. Check console for details.");
                    return;
                }
                
                testOptions.style.display = 'block';
                
                // Initialize test harness if not already done
                if (!testHarness) {
                    console.log("Initializing TestHarness");
                    testHarness = new TestHarness();
                }
            });
        } else {
            console.warn("Test mode button not found in DOM");
        }

        // Handle test selection
        if (testOptions) {
            console.log("Setting up test checkboxes");
            
            document.querySelectorAll('.test-list input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    if (!testHarness) {
                        console.error("TestHarness not initialized. Cannot select tests.");
                        return;
                    }
                    
                    const testId = e.target.id.replace('test-', '');
                    console.log(`Test checkbox changed: ${testId}, checked=${e.target.checked}`);

                    if (testId === 'all') {
                        // When "Run All Tests" is toggled, update all other checkboxes
                        const isChecked = e.target.checked;
                        document.querySelectorAll('.test-list input[type="checkbox"]:not(#test-all)').forEach(cb => {
                            cb.checked = isChecked;
                            cb.disabled = isChecked;
                        });
                    } else {
                        // Individual test selection
                        if (e.target.checked) {
                            testHarness.selectTest(testId);
                            console.log(`Selected test: ${testId}`);
                        } else {
                            testHarness.deselectTest(testId);
                            console.log(`Deselected test: ${testId}`);
                        }
                    }
                });
            });
        } else {
            console.warn("Test options panel not found in DOM");
        }

        // Run selected tests
        if (runSelectedTestsBtn) {
            console.log("Setting up run tests button");
            
            runSelectedTestsBtn.addEventListener('click', () => {
                console.log("Run selected tests button clicked");
                
                if (!testHarness) {
                    console.error("TestHarness not initialized. Cannot run tests.");
                    alert("Error: Test module not initialized. Check console for details.");
                    return;
                }
                
                if (testAll && testAll.checked) {
                    console.log("'Test all' is checked, selecting all tests");
                    testHarness.selectAllTests();
                }

                console.log("Selected tests:", testHarness.selectedTests);
                
                if (testHarness.selectedTests.length === 0) {
                    console.warn("No tests selected");
                    alert('Please select at least one test to run.');
                    return;
                }

                console.log("Hiding splash screen and running tests");
                splashScreen.style.display = 'none';
                
                try {
                    testHarness.runSelectedTests();
                    console.log("Tests started successfully");
                } catch (error) {
                    console.error("Error running tests:", error);
                    alert("Error running tests. Check console for details.");
                }
            });
            
        } else {
            console.warn("Run tests button not found in DOM");
        }
    });
});

function startRegularGame() {
    if (!CaliforniaClimateFarmer) {
        console.error("Game module not loaded. Cannot start game.");
        alert("Error: Game module not loaded. Check console for details.");
        return;
    }
    
    try {
        // Initialize the game normally
        console.log("Creating game instance...");
        gameInstance = new CaliforniaClimateFarmer();
        gameInstance.start();
        console.log("Game started successfully");
    } catch (error) {
        console.error("Error starting game:", error);
        alert("Error starting game. Check console for details.");
    }
}

// Export game instance for potential external access
export { gameInstance };
