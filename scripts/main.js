/**
 * California Climate Farmer - Main Entry Point (UI Version)
 *
 * Initializes and starts the interactive game using the UI Manager.
 * Assumes this runs in a browser environment with the necessary HTML.
 */

console.log('Loading main.js for UI game...');

import { CaliforniaClimateFarmer } from './game.js';

// Global game instance for the UI
let gameInstance = null;

// Initialize the game once the DOM is ready
function initializeGame() {
    console.log("DOM ready - Initializing UI game controls...");

    const splashScreen = document.getElementById('splash-screen');
    const regularGameBtn = document.getElementById('regular-game-btn');
    // Remove or comment out references to test-mode-btn, test-options, run-selected-tests-btn

    if (splashScreen && regularGameBtn) {
        // Clone and replace to ensure clean event listeners
        const newRegularGameBtn = regularGameBtn.cloneNode(true);
        regularGameBtn.parentNode.replaceChild(newRegularGameBtn, regularGameBtn);

        newRegularGameBtn.addEventListener('click', () => {
            console.log("Starting regular game...");
            splashScreen.style.display = 'none'; // Hide splash
            startRegularGame();
        });

         // Hide test mode button if it still exists in HTML
         const testBtn = document.getElementById('test-mode-btn');
         if(testBtn) testBtn.style.display = 'none';

    } else {
        console.error('Splash screen or regular game button not found. Cannot initialize.');
        // Optionally display an error to the user
        document.body.innerHTML = '<p style="color: red; font-size: 1.2em;">Error: Game UI elements missing. Cannot start.</p>';
    }

     // Ensure test options panel is hidden
     const testOptionsPanel = document.getElementById('test-options');
     if (testOptionsPanel) testOptionsPanel.style.display = 'none';
}

function startRegularGame() {
    if (gameInstance) {
        console.warn("Game already running.");
        return;
    }
    try {
        // Create game instance (NOT headless)
        console.log("Creating game instance for UI...");
        gameInstance = new CaliforniaClimateFarmer({ headless: false }); // Explicitly set headless to false
        console.log("Game instance created, starting UI game loop...");
        gameInstance.start(); // This will start the requestAnimationFrame loop
        console.log("UI Game started successfully.");
    } catch (error) {
        console.error("Error starting UI game:", error);
        alert("Error starting game. Check console for details.");
        // Display error in UI?
    }
}

// --- Initialization ---
// Wait for the DOM to load before setting up controls
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    // DOM already loaded
    initializeGame();
}

// Export game instance for potential debugging from console
export { gameInstance };
