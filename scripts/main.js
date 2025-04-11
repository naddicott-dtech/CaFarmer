// scripts/main.js
import { CaliforniaClimateFarmer } from './game.js';
import { UIManager } from './ui.js'; // Keep this if ui.js needs specific setup later, otherwise might be handled by game.js

console.log("Loading main.js for UI game..."); // Changed log slightly

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM ready - Initializing UI game controls..."); // Changed log slightly

    const regularGameBtn = document.getElementById('regular-game-btn');
    const splashScreen = document.getElementById('splash-screen');

    if (!regularGameBtn) {
        console.error("Start Regular Game button not found! Cannot start game.");
        return;
    }
    if (!splashScreen) {
        console.warn("Splash screen not found! Game might start immediately if button exists.");
    } else {
        console.log("Splash screen found.");
    }

    // Listener that ACTUALLY starts the game
    regularGameBtn.addEventListener('click', () => {
        console.log("Main.js: Regular game start triggered from button click."); // Clarified log source

        // Ensure splash screen is hidden
        if (splashScreen) {
            splashScreen.style.display = 'none';
        } else {
            console.warn("Splash screen was not found to hide.");
        }

        // --- Initialize and start the game ---
        try {
             console.log("Main.js: Creating game instance for UI..."); // Added log
            // Ensure the game instance is not created multiple times if button is somehow clicked twice
            if (window.currentGameInstance) {
                console.warn("Game instance already exists. Ignoring second start request.");
                return;
            }

            const game = new CaliforniaClimateFarmer({
                headless: false,
                testMode: false,
                autoTerminate: false
            });
             console.log("Main.js: Game instance created, starting UI game loop..."); // Added log
             window.currentGameInstance = game; // Optional: Store globally to prevent duplicates
            game.start(); // Start the game loop
            console.log("Main.js: UI Game started successfully."); // Changed log slightly
        } catch (error) {
            console.error("Main.js: Failed to initialize or start the game:", error);
            document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Error Starting Game</h1><p>${error.message}</p><pre>${error.stack}</pre></div>`;
        }
    });

    console.log("Main.js: Listener for game start attached.");
});
