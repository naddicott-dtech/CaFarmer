/**
 * California Climate Farmer - Main Entry Point
 * 
 * This file serves as the entry point for the game, handling initial setup,
 * splash screen interactions, and launching either the main game or test mode.
 * 
 * For a public release, simply remove the test-related imports and code sections 
 * marked with "TEST MODE" comments.
 */

import { CaliforniaClimateFarmer } from './game.js';
// TEST MODE: Import test harness (remove in public release)
import { TestHarness } from './test/test-harness.js';

// Global game instance
let gameInstance = null;

// Initialize splash screen controls
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const regularGameBtn = document.getElementById('regular-game-btn');
    
    // Start regular game
    regularGameBtn.addEventListener('click', () => {
        splashScreen.style.display = 'none';
        startRegularGame();
    });

    // TEST MODE: Test mode setup (remove in public release) -------------------
    const testModeBtn = document.getElementById('test-mode-btn');
    const testOptions = document.getElementById('test-options');
    const runSelectedTestsBtn = document.getElementById('run-selected-tests-btn');
    const testAll = document.getElementById('test-all');
    
    // Initialize test harness
    const testHarness = new TestHarness();
    
    // Show test options when Test Mode button is clicked
    if (testModeBtn) {
        testModeBtn.addEventListener('click', () => {
            testOptions.style.display = 'block';
        });
    }

    // Handle test selection
    document.querySelectorAll('.test-list input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const testId = e.target.id.replace('test-', '');

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
                } else {
                    testHarness.deselectTest(testId);
                }
            }
        });
    });

    // Run selected tests
    if (runSelectedTestsBtn) {
        runSelectedTestsBtn.addEventListener('click', () => {
            if (testAll.checked) {
                testHarness.selectAllTests();
            }

            if (testHarness.selectedTests.length === 0) {
                alert('Please select at least one test to run.');
                return;
            }

            splashScreen.style.display = 'none';
            testHarness.runSelectedTests();
        });
    }
    // END TEST MODE ----------------------------------------------------------
});

function startRegularGame() {
    // Initialize the game normally
    gameInstance = new CaliforniaClimateFarmer();
    gameInstance.start();
}

// Export game instance for potential external access
export { gameInstance };
