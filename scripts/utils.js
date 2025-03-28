/**
 * California Climate Farmer - Utility Functions
 *
 * This file contains utility functions used throughout the game.
 */

// Format currency values for display
export function formatCurrency(value) {
    const num = Number(value);
    if (isNaN(num)) {
        return '$NaN';
    }
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Calculate farm health based on soil and water conditions
export function calculateFarmHealth(grid, waterReserve) {
    if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) return 50;

    let totalSoilHealth = 0;
    let plotCount = 0;

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
             if(grid[row] && grid[row][col]) {
                totalSoilHealth += grid[row][col].soilHealth;
                plotCount++;
             }
        }
    }

    if (plotCount === 0) return 50;

    const avgSoilHealth = totalSoilHealth / plotCount;
    const waterFactor = Math.max(0, Math.min(100, waterReserve)) / 100;

    let farmHealth = Math.round((avgSoilHealth * 0.7 + waterFactor * 30));
    farmHealth = Math.max(0, Math.min(100, farmHealth));

    return farmHealth;
}

// Calculate farm value based on land, crops, soil quality, technologies, and balance
export function calculateFarmValue(grid, technologies, currentBalance) {
     if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) return 0;

    let value = 50000; // Base land value
    let developedValue = 0;
    let techValue = 0;

    const soilValueMultiplier = 50;
    const techValueMultiplier = 1.0;


    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
            if(grid[row] && grid[row][col]) {
                const cell = grid[row][col];
                developedValue += cell.soilHealth * soilValueMultiplier;
                if (cell.crop.id !== 'empty' && cell.crop.basePrice > 0) {
                    developedValue += cell.crop.basePrice * (cell.growthProgress / 100);
                }
            }
        }
    }

    technologies.forEach(tech => {
        if (tech.researched) {
            techValue += tech.cost * techValueMultiplier;
        }
    });

    const cashValue = Math.max(0, currentBalance);
    value += developedValue + techValue + cashValue;

    return Math.round(value);
}

// Logger for debug info
export class Logger {
    constructor(maxLogs = 200, verbosityLevel = 1, isHeadless = false) {
        this.logs = [];
        this.maxLogs = maxLogs;
        this.verbosityLevel = verbosityLevel; // 0: Error, 1: Info, 2: Debug, 3: Verbose
        this.isHeadless = isHeadless;
        // *** CHANGE DEFAULT CONSOLE LOG LEVEL HERE ***
        this.consoleLogLevel = 1; // Default: Log only ERR (0) and INF (1) to console
    }

    // Add a log entry
    log(message, level = 1, metadata = {}) {
        if (level > this.verbosityLevel) return;

        const timestamp = new Date();
        let formattedMessage = message;

        if (typeof message === 'object' && message !== null) {
            try {
                formattedMessage = JSON.stringify(message);
            } catch (e) {
                formattedMessage = '[Unserializable Object]';
            }
        } else {
            formattedMessage = String(message);
        }

        if (formattedMessage.includes('$')) {
            formattedMessage = formattedMessage.replace(/\$(-?\d{1,3}(?:,\d{3})*|\d+)/g, (match, p1) => {
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

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Output to console based on consoleLogLevel
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

    // Set verbosity level (determines which logs are processed/stored)
    setVerbosity(level) {
        this.verbosityLevel = Math.max(0, Math.min(3, level));
        console.log(`[Logger INF] Verbosity set to ${this.verbosityLevel}`); // Use console.log directly for this meta-message
    }

    // Set console log level (determines which processed logs appear in console)
    setConsoleLogLevel(level) {
        this.consoleLogLevel = Math.max(0, Math.min(3, level));
        console.log(`[Logger INF] Console log level set to ${this.consoleLogLevel}`); // Use console.log directly
    }
}
