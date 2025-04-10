/**
 * California Climate Farmer - Headless Test Harness
 *
 * Runs different farming strategies in a fast, headless simulation environment.
 */
import { CaliforniaClimateFarmer } from '../game.js';
import { setupTestStrategy } from './strategies.js';
// *** ADDED formatCurrency ***
import { formatCurrency } from '../utils.js';


console.log('TestHarness module loading...');

// Test Harness class
export class TestHarness {
    constructor() {
        console.log('TestHarness constructor called');
        this.tests = [
            { id: 'monoculture', name: 'Monoculture Strategy' },
            { id: 'diverse', name: 'Diverse Crops Strategy' },
            { id: 'tech-focus', name: 'Technology Focus Strategy' },
            { id: 'water-saving', name: 'Water Conservation Strategy' },
            // --- ADDED DecisionRule ---
            { id: 'decision-rule', name: 'Decision Rule Strategy' },
            // --------------------------
            { id: 'no-action', name: 'No Action Strategy' }
        ];
        this.activeGame = null;
        this.selectedTests = []; // Array of test IDs to run
        this.currentTestIndex = -1;
        this.results = {}; // Store results per test ID
    }

    // Select all available tests
    selectAllTests() {
        this.selectedTests = this.tests.map(test => test.id);
        console.log('Selected all tests:', this.selectedTests);
    }

    // Select a specific test by ID
    selectTest(testId) {
        if (this.tests.some(t => t.id === testId) && !this.selectedTests.includes(testId)) {
            this.selectedTests.push(testId);
            console.log(`Selected test: ${testId}. Current selection:`, this.selectedTests);
        } else if (!this.tests.some(t => t.id === testId)) {
            console.warn(`Test ID "${testId}" not found in definitions.`);
        }
    }

    // Deselect a specific test
    deselectTest(testId) {
        this.selectedTests = this.selectedTests.filter(id => id !== testId);
        console.log(`Deselected test: ${testId}. Current selection:`, this.selectedTests);
    }

    // Clear selected tests
    clearSelection() {
        this.selectedTests = [];
        console.log('Cleared test selection.');
    }

    // Start the next test in the selected queue
    async startNextTest() {
        this.currentTestIndex++;

        if (this.currentTestIndex >= this.selectedTests.length) {
            console.log('\n🎉 All selected tests completed! 🎉');
            this.displaySummaryResults();
            return false; // No more tests
        }

        const testId = this.selectedTests[this.currentTestIndex];
        const testInfo = this.tests.find(t => t.id === testId);

        if (!testInfo) {
             console.error(`Test definition not found for ID: ${testId}. Skipping.`);
             return this.startNextTest();
        }


        console.log(`\n--- Starting Test ${this.currentTestIndex + 1}/${this.selectedTests.length}: [${testInfo.name}] (ID: ${testId}) ---`);

        this.activeGame = null;

        try {
            this.activeGame = new CaliforniaClimateFarmer({
                headless: true,
                testMode: true,
                testStrategyId: testId,
                debugMode: false, // Keep default logging level low
                testEndYear: 50,
                autoTerminate: true,
                nextTestCallback: () => this.startNextTest()
            });

            setupTestStrategy(this.activeGame, testId);

            console.log(`Simulating test '${testId}' until Year ${this.activeGame.testEndYear} or Balance <= 0...`);
            const startTime = Date.now();

            while (this.activeGame.year < this.activeGame.testEndYear && this.activeGame.balance > 0) {
                this.activeGame.runTick();
            }

            const endTime = Date.now();
            const durationMs = endTime - startTime;
            console.log(`Test '${testId}' simulation finished in ${durationMs} ms.`);

            // Store final state
            this.results[testId] = {
                endYear: this.activeGame.year,
                endBalance: this.activeGame.balance,
                endFarmValue: this.activeGame.farmValue,
                endFarmHealth: this.activeGame.farmHealth,
                endWaterReserve: this.activeGame.waterReserve,
                endSustainability: this.activeGame.calculateSustainabilityScore().total,
                researchedTechs: this.activeGame.researchedTechs.length,
                durationMs: durationMs
            };

            this.activeGame.terminateTest();
            return true;

        } catch (error) {
            console.error(`❌❌❌ Error running test ${testId}:`, error);
            setTimeout(() => this.startNextTest(), 50);
            return false;
        }
    }

    // Run all tests currently selected
    runSelectedTests() {
        if (this.selectedTests.length === 0) {
            console.warn("No tests selected to run. Use selectAllTests() or selectTest('id').");
            return;
        }
        console.log(`\n🚀 Starting test run for ${this.selectedTests.length} selected tests...`);
        this.currentTestIndex = -1;
        this.results = {};
        this.startNextTest();
    }

    // Display a summary table of results
    displaySummaryResults() {
        console.log("\n--- Test Run Summary ---");
        const summary = Object.entries(this.results).map(([id, result]) => ({
            ID: id,
            EndYear: result.endYear,
            // *** CHANGE: Use formatCurrency ***
            Balance: formatCurrency(result.endBalance),
            FarmValue: formatCurrency(result.endFarmValue),
            // *** END CHANGE ***
            Health: `${result.endFarmHealth}%`,
            Water: `${result.endWaterReserve.toFixed(2)}%`,
            Sustain: `${result.endSustainability}%`,
            Techs: result.researchedTechs,
            Time: `${(result.durationMs / 1000).toFixed(2)}s`
        }));

        if (summary.length > 0) {
            console.table(summary);
        } else {
            console.log("No results to display.");
        }
        console.log("------------------------");
    }
}

console.log('TestHarness module loaded.');
