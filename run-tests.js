/**
 * Headless Test Runner for California Climate Farmer
 *
 * Usage: node run-tests.js [testId1] [testId2] ...
 *   - If no arguments are provided, runs all defined tests.
 *   - Example: node run-tests.js monoculture tech-focus
 */

// Need to adjust the import path based on running from the root directory
import { TestHarness } from './scripts/test/test-harness.js';

console.log("Starting Headless Test Runner...");

async function run() {
    const harness = new TestHarness();
    const args = process.argv.slice(2); // Get command line arguments (test IDs)

    if (args.length > 0) {
        console.log("Running specified tests:", args);
        args.forEach(testId => harness.selectTest(testId));
    } else {
        console.log("No specific tests provided, running all tests.");
        harness.selectAllTests();
    }

    // Start the test execution process
    // The harness now manages the loop and calls back to start the next test.
    harness.runSelectedTests();

    // The script will keep running until all async operations initiated by
    // the test harness (including setTimeout for callbacks) are complete.
     console.log("Test runner script initiated. Waiting for tests to complete...");
     // Node.js will exit automatically when the event loop is empty.
}

// Run the tests
run().catch(error => {
    console.error("Unhandled error during test execution:", error);
    process.exit(1); // Exit with error code
});
