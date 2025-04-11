// Add event listeners for splash screen buttons
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const regularGameBtn = document.getElementById('regular-game-btn');
    const tutorialBtn = document.getElementById('tutorial-btn');
    const testOptions = document.getElementById('test-options');
    const runSelectedTestsBtn = document.getElementById('run-selected-tests-btn');
    
    // Start regular game
    regularGameBtn.addEventListener('click', () => {
        splashScreen.style.display = 'none';
        startGame(false, false);
    });
    
    // For now, tutorial just starts a regular game
    tutorialBtn.addEventListener('click', () => {
        splashScreen.style.display = 'none';
        startGame(false, false);
        
        // Display a welcome message with the advisor
        showAdvisorMessage('Welcome to the California Climate Farmer tutorial! For now, this is the regular game. A structured tutorial will be added in a future update.');
    });
    
    // Helper function to show advisor message
    function showAdvisorMessage(message) {
        const advisorPlaceholder = document.querySelector('.advisor-placeholder');
        if (advisorPlaceholder) {
            const p = document.createElement('p');
            p.textContent = message;
            
            // Clear any existing content except the header
            const header = advisorPlaceholder.querySelector('h3');
            advisorPlaceholder.innerHTML = '';
            advisorPlaceholder.appendChild(header);
            advisorPlaceholder.appendChild(p);
        }
    }
    
    // Start the game
    function startGame(testMode, autoTerminate) {
        const game = new CaliforniaClimateFarmer({
            headless: false,
            testMode: testMode,
            autoTerminate: autoTerminate
        });
        game.start();
    }
});
