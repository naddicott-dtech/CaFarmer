// scripts/main.js
import { CaliforniaClimateFarmer } from './game.js';

console.log("Loading main.js for UI game...");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM ready - Initializing UI game controls...");

    const regularGameBtn = document.getElementById('regular-game-btn');
    const splashScreen = document.getElementById('splash-screen');

    if (!regularGameBtn) {
        console.error("Start Regular Game button not found! Cannot start game.");
        return;
    }
    if (!splashScreen) {
        console.warn("Splash screen not found!");
    }

    // Listener that starts the game
    regularGameBtn.addEventListener('click', () => {
        console.log("Main.js: Regular game start triggered.");

        if (splashScreen) {
            splashScreen.style.display = 'none';
        }

        // --- Initialize and start the game ---
        try {
            if (window.currentGameInstance) {
                console.warn("Game instance already exists.");
                return;
            }

            const game = new CaliforniaClimateFarmer({
                headless: false,
                testMode: false,
            });
            window.currentGameInstance = game; // Store globally
            game.start(); // Start the game loop
            console.log("Main.js: UI Game started successfully.");
        } catch (error) {
            console.error("Main.js: Failed to initialize or start the game:", error);
            document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Error Starting Game</h1><p>${error.message}</p><pre>${error.stack}</pre></div>`;
        }
    });

    console.log("Main.js: Game start listener attached.");
});
