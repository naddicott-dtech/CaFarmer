/**
 * California Climate Farmer - Utility Functions
 *
 * This file contains utility functions used throughout the game.
 */

// Format currency values for display
export function formatCurrency(value) {
    // Handle potential non-numeric inputs gracefully
    const num = Number(value);
    if (isNaN(num)) {
        return '$NaN';
    }
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // No decimals
}

// Calculate farm health based on soil and water conditions
export function calculateFarmHealth(grid, waterReserve) {
    if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) return 50; // Default if grid invalid

    let totalSoilHealth = 0;
    let plotCount = 0;

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
             if(grid[row] && grid[row][col]) { // Ensure cell exists
                totalSoilHealth += grid[row][col].soilHealth;
                plotCount++;
             }
        }
    }

    if (plotCount === 0) return 50; // Avoid division by zero

    const avgSoilHealth = totalSoilHealth / plotCount;
    const waterFactor = Math.max(0, Math.min(100, waterReserve)) / 100; // Ensure waterReserve is clamped 0-100

    // Calculate overall health: 70% based on avg soil, 30% on water reserve
    let farmHealth = Math.round((avgSoilHealth * 0.7 + waterFactor * 30));

    // Clamp to valid range 0-100
    farmHealth = Math.max(0, Math.min(100, farmHealth));

    return farmHealth;
}

// Calculate farm value based on land, crops, soil quality, technologies, and balance
// (Suggestion B implemented)
export function calculateFarmValue(grid, technologies, currentBalance) {
     if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) return 0;

    // Base land value (reduced - represents undeveloped potential)
    let value = 50000;
    let developedValue = 0;
    let techValue = 0;

    const soilValueMultiplier = 50; // Reduced from 100
    const cropValueMultiplier = 5; // Value per % growth progress per base price unit? Simpler might be better. Let's try baseValue * progress%.
    const techValueMultiplier = 1.0; // Tech adds value based on its cost (depreciation?)


    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
            if(grid[row] && grid[row][col]) {
                const cell = grid[row][col];

                // Value from soil quality (always contributes, even if empty)
                developedValue += cell.soilHealth * soilValueMultiplier;

                // Value from currently growing crops
                if (cell.crop.id !== 'empty' && cell.crop.basePrice > 0) {
                    // Value based on growth progress and base price
                    developedValue += cell.crop.basePrice * (cell.growthProgress / 100);
                }
            }
        }
    }

    // Value from researched technologies
    technologies.forEach(tech => {
        if (tech.researched) {
            // Add value based on a factor of the research cost
            techValue += tech.cost * techValueMultiplier;
        }
    });

    // Add liquid assets (cash balance)
    const cashValue = Math.max(0, currentBalance); // Don't let debt reduce farm value directly this way

    // Total value = Base + Developed Land/Crops + Technology + Cash
    value += developedValue + techValue + cashValue;


    return Math.round(value);
}

// Logger for debug info
export class Logger {
    constructor(maxLogs = 200, verbosityLevel = 1, isHeadless = false) {
        this.logs = [];
        this.maxLogs = maxLogs;
        this.verbosityLevel = verbosityLevel; // 0: Error, 1: Info, 2: Debug, 3: Verbose
        this.isHeadless = isHeadless; // If true, always log to console regardless of level? Or just control which levels hit console?
        this.consoleLogLevel = 1; // Log level 1 (Info) and 0 (Error) to console by default
    }

    // Add a log entry
    log(message, level = 1, metadata = {}) {
        // Only process messages at or below the current verbosity level
        if (level > this.verbosityLevel) return;

        const timestamp = new Date();
        let formattedMessage = message;

        // Basic formatting for objects/arrays in logs
        if (typeof message === 'object' && message !== null) {
            try {
                formattedMessage = JSON.stringify(message);
            } catch (e) {
                formattedMessage = '[Unserializable Object]';
            }
        } else {
            formattedMessage = String(message); // Ensure it's a string
        }

        // Format currency within the string message
        if (formattedMessage.includes('$')) {
            formattedMessage = formattedMessage.replace(/\$(-?\d{1,3}(?:,\d{3})*|\d+)/g, (match, p1) => {
                // Re-format existing formatted numbers or format raw numbers
                 const num = Number(String(p1).replace(/,/g, ''));
                 return isNaN(num) ? match : '$' + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            });
        }

        const logEntry = {
            timestamp: timestamp,
            message: formattedMessage,
            level: level,
            metadata: metadata
        };

        // Add to internal logs array (only if not headless? No, keep for potential retrieval)
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift(); // Remove oldest log
        }

        // Output to console based on level
        if (level <= this.consoleLogLevel) {
             const timeStr = timestamp.toLocaleTimeString();
             const levelStr = ['ERR', 'INF', 'DBG', 'VRB'][level] || 'LOG';
             console.log(`[${timeStr} ${levelStr}] ${formattedMessage}`);
        }

        return logEntry;
    }

    // Clear all logs
    clear() {
        this.logs = [];
    }

    // Get the most recent N logs
    getRecentLogs(count = 50) {
        return this.logs.slice(-count);
    }

    // Set verbosity level
    setVerbosity(level) {
        this.verbosityLevel = Math.max(0, Math.min(3, level)); // Clamp level 0-3
        console.log(`[Logger INF] Verbosity set to ${this.verbosityLevel}`);
    }

    // Set console log level
    setConsoleLogLevel(level) {
        this.consoleLogLevel = Math.max(0, Math.min(3, level));
        console.log(`[Logger INF] Console log level set to ${this.consoleLogLevel}`);
    }
}
