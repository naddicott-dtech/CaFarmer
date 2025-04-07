/**
 * California Climate Farmer - Utility Functions
 *
 * This file contains utility functions used throughout the game.
 */

// Format currency values for display
export function formatCurrency(value) {
    const num = Number(value);
    if (isNaN(num)) {
        // console.warn(`formatCurrency received NaN for value: ${value}`); // Optional warning
        return '$NaN';
    }
    // Ensure it handles negative numbers correctly for display
    const options = {
        style: 'currency',
        currency: 'USD', // Or your desired currency
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    };
    // Use Intl.NumberFormat for better localization and formatting
    try {
        return new Intl.NumberFormat('en-US', options).format(num);
    } catch (e) {
        // Fallback for environments without Intl support or other errors
        return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
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

    if (plotCount === 0) return 50; // Default health if no plots

    const avgSoilHealth = totalSoilHealth / plotCount;
    // Water reserve factor contributes, but soil is more dominant
    const waterFactor = Math.max(0, Math.min(100, waterReserve)) / 100;

    // Weighted average: 70% soil health, 30% water reserve
    let farmHealth = Math.round((avgSoilHealth * 0.7) + (waterFactor * 100 * 0.3)); // Ensure waterFactor is scaled correctly
    farmHealth = Math.max(0, Math.min(100, farmHealth)); // Clamp between 0 and 100

    return farmHealth;
}

// Calculate farm value based on land, soil quality, GROWING crops, and technologies
// ** CONFIRMED ** Does NOT include cash balance.
export function calculateFarmValue(grid, technologies) {
     if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) return 0;
     if (!technologies) technologies = [];

    let baseLandValue = 50000; // Keep base value modest
    let soilValueAddon = 0; // Value added by soil quality *above* a baseline
    let growingCropValue = 0; // Value of currently growing crops
    let techValue = 0;

    // ADJUSTMENT: Lower soil value multiplier AND apply it as a bonus above baseline
    const soilValueMultiplier = 25; // Was 60 - Much lower direct value per % point
    const baselineSoilHealth = 50; // Only health above this adds value? Or just scale differently? Let's scale.
    const techDepreciationFactor = 0.80; // Was 0.85 - Slightly less value retention

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
            if(grid[row] && grid[row][col]) {
                const cell = grid[row][col];
                // Soil adds value based on its health, but scaled less aggressively
                soilValueAddon += Math.max(0, cell.soilHealth) * soilValueMultiplier;

                // Value from GROWING crops
                if (cell.crop.id !== 'empty' && cell.crop.harvestValue > 0 && cell.growthProgress > 0) {
                     growingCropValue += cell.crop.harvestValue * (cell.growthProgress / 100);
                }
            }
        }
    }

    // Value from researched technologies
    technologies.forEach(tech => {
        if (tech.researched) {
            techValue += tech.cost * techDepreciationFactor;
        }
    });

    // Total value = Base Land + Soil Addon + Growing Crops + Technology
    // This prevents empty plots with high health from dominating the value.
    let totalValue = baseLandValue + soilValueAddon + growingCropValue + techValue;

    // Ensure value doesn't go below a minimum (e.g., base land + some minimum soil value)
    totalValue = Math.max(baseLandValue + (10 * soilValueMultiplier * grid.length * grid[0].length) , totalValue); // Floor slightly above pure base

    return Math.round(totalValue);
}

// Logger for debug info
// (Logger class remains unchanged from provided code)
export class Logger {
    constructor(maxLogs = 200, verbosityLevel = 1, isHeadless = false) {
        this.logs = [];
        this.maxLogs = maxLogs;
        this.verbosityLevel = verbosityLevel; // 0: Error, 1: Info, 2: Debug, 3: Verbose
        this.isHeadless = isHeadless;
        // Default: Log only ERR (0) and INF (1) to console
        this.consoleLogLevel = 1;
         // Set console log level based on debugMode if provided during instantiation implicitly
         // Example: if(debugMode) this.consoleLogLevel = 2; // Log DBG too if debugMode is true
    }

    // Add a log entry
    log(message, level = 1, metadata = {}) {
        if (level > this.verbosityLevel) return;

        const timestamp = new Date();
        let formattedMessage = message;

        if (typeof message === 'object' && message !== null) {
            try { formattedMessage = JSON.stringify(message); }
            catch (e) { formattedMessage = '[Unserializable Object]'; }
        } else {
            formattedMessage = String(message);
        }

        // Use formatCurrency utility for any detected currency strings
        if (formattedMessage.includes('$')) {
            // More robust regex to handle negative signs and avoid formatting already formatted numbers
            formattedMessage = formattedMessage.replace(/(?<!\d\.)\$(-?\d{1,3}(?:,\d{3})*|\d+)(?!\.?\d)/g, (match, p1) => {
                 const numStr = String(p1).replace(/,/g, '');
                 const num = Number(numStr);
                 return isNaN(num) ? match : formatCurrency(num); // Use the utility function
            });
        }


        const logEntry = { timestamp, message: formattedMessage, level, metadata };

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

    clear() { this.logs = []; }
    getRecentLogs(count = 50) { return this.logs.slice(-count); }
    setVerbosity(level) { this.verbosityLevel = Math.max(0, Math.min(3, level)); console.log(`[Logger INF] Verbosity set to ${this.verbosityLevel}`); }
    setConsoleLogLevel(level) { this.consoleLogLevel = Math.max(0, Math.min(3, level)); console.log(`[Logger INF] Console log level set to ${this.consoleLogLevel}`); }
}
