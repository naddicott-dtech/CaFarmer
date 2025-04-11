// scripts/splash-screen.js

// Add event listeners for splash screen buttons
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const regularGameBtn = document.getElementById('regular-game-btn');
    const tutorialBtn = document.getElementById('tutorial-btn');
    // Assuming test logic is still handled elsewhere (e.g., run-tests.js)
    // const testOptions = document.getElementById('test-options');
    // const runSelectedTestsBtn = document.getElementById('run-selected-tests-btn');

    if (!splashScreen || !regularGameBtn || !tutorialBtn) {
        console.error("Splash screen elements not found!");
        return;
    }

    // --- Make splash screen visible initially ---
    splashScreen.style.display = 'flex'; // Ensure it's visible on load

    // Regular Game Button just hides the splash screen.
    // main.js will listen for this button click to start the actual game.
    regularGameBtn.addEventListener('click', () => {
        console.log("Splash screen: Regular Game button clicked, hiding splash screen."); // Added log for clarity
        splashScreen.style.display = 'none';
        // The actual game start is now triggered by main.js listening to this same button.
    });

    // Tutorial button just hides splash and shows a message for now.
    tutorialBtn.addEventListener('click', () => {
        console.log("Splash screen: Tutorial button clicked, hiding splash screen."); // Added log for clarity
        splashScreen.style.display = 'none';
        // The game will be started by main.js listening to 'regular-game-btn'
        // We might need a different trigger in main.js for tutorial mode later.
        // For now, just show the message.
        showAdvisorMessage('Welcome to the California Climate Farmer tutorial! A structured tutorial will be added in a future update. Click "Start Regular Game" to begin playing.');
    });

    // Helper function to show advisor message (can stay here for now)
    function showAdvisorMessage(message) {
        const advisorPlaceholder = document.querySelector('.advisor-placeholder');
        if (advisorPlaceholder) {
            const header = advisorPlaceholder.querySelector('h3');
            // Ensure header exists before clearing
            advisorPlaceholder.innerHTML = ''; // Clear previous content
            if (header) {
                advisorPlaceholder.appendChild(header); // Re-add header if it existed
            }

            const p = document.createElement('p');
            p.textContent = message;
            advisorPlaceholder.appendChild(p);
        } else {
            console.warn("Advisor placeholder not found for tutorial message.");
        }
    }

    // --- Ensure NO startGame function or CaliforniaClimateFarmer usage here ---

    console.log("Splash screen listeners added.");
});
