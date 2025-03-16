/**
 * California Climate Farmer - Test Harness
 * 
 * This file contains the test harness for automated testing of different
 * farming strategies. This can be excluded in a public release.
 */

import { CaliforniaClimateFarmer } from '../game.js';
import { setupTestStrategy } from './strategies.js';

// Test Harness class
export class TestHarness {
    constructor() {
        this.tests = [
            { id: 'monoculture', name: 'Monoculture Strategy', running: false, complete: false },
            { id: 'diverse', name: 'Diverse Crops Strategy', running: false, complete: false },
            { id: 'tech-focus', name: 'Technology Focus Strategy', running: false, complete: false },
            { id: 'water-saving', name: 'Water Conservation Strategy', running: false, complete: false },
            { id: 'no-action', name: 'No Action Strategy', running: false, complete: false }
        ];

        this.activeGame = null;
        this.selectedTests = [];
        this.currentTestIndex = -1;
    }

    // Select all tests for running
    selectAllTests() {
        this.selectedTests = this.tests.map(test => test.id);
    }

    // Select a specific test
    selectTest(testId) {
        if (!this.selectedTests.includes(testId)) {
            this.selectedTests.push(testId);
        }
    }

    // Deselect a specific test
    deselectTest(testId) {
        this.selectedTests = this.selectedTests.filter(id => id !== testId);
    }

    // Start the next test in queue
    startNextTest() {
        this.currentTestIndex++;

        if (this.currentTestIndex >= this.selectedTests.length) {
            console.log('All tests completed!');
            return false;
        }

        const testId = this.selectedTests[this.currentTestIndex];
        const test = this.tests.find(t => t.id === testId);

        if (test) {
            console.log(`Starting test: ${test.name}`);
            test.running = true;

            // Clean up previous game instance if exists
            if (this.activeGame) {
                // Nothing to cleanup for now
            }

            // Create new game with test settings
            this.activeGame = new CaliforniaClimateFarmer({
                testMode: true,
                testStrategy: testId,
                debugMode: true,
                testEndYear: 50,
                autoTerminate: true,
                nextTestCallback: () => this.startNextTest()
            });

            // Apply test strategy setup
            setupTestStrategy(this.activeGame, testId);

            // Start the game
            this.activeGame.start();

            // Show debug panel if available
            const debugPanel = document.getElementById('debug-panel');
            if (debugPanel) {
                debugPanel.style.display = 'block';
            }

            return true;
        }

        return false;
    }

    // Run all selected tests
    runSelectedTests() {
        this.currentTestIndex = -1;

        // Reset test status
        this.tests.forEach(test => {
            test.running = false;
            test.complete = false;
        });

        // Start the first test
        return this.startNextTest();
    }
}
