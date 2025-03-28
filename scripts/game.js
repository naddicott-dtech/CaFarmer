/**
 * California Climate Farmer - Main Game Class
 *
 * This file contains the core game logic and simulation engine.
 * Can run in headless mode for testing or with UI for interactive play.
 */

import { Cell } from './cell.js';
import { crops, getCropById } from './crops.js';
import { createTechnologyTree, checkTechPrerequisites, getTechEffectValue } from './technology.js';
import { UIManager } from './ui.js'; // Still import, but instantiation is conditional
import { Logger, calculateFarmHealth, calculateFarmValue } from './utils.js';
import * as Events from './events.js';

// --- Constants (Replacing Spreadsheet Named Ranges used directly) ---
const ANNUAL_INTEREST_RATE = 0.05;
const PLANTING_COST_FACTOR = 0.4; // Factor of base crop price
const IRRIGATION_COST = 200;
const FERTILIZE_COST = 300;
// --- End Constants ---


// Main game class
export class CaliforniaClimateFarmer {
    constructor(options = {}) {
        this.headless = options.headless || false; // NEW: Headless mode flag
        this.debugMode = options.debugMode || false;

        // Test mode flags (used primarily in headless testing now)
        this.testMode = options.testMode || false; // Indicates if a test strategy is active
        this.testStrategyId = options.testStrategyId || null; // Store the ID
        this.testEndYear = options.testEndYear || 50;
        this.autoTerminate = options.autoTerminate || false; // For headless tests
        this.nextTestCallback = options.nextTestCallback || null; // For headless test harness
        this.strategyTick = null; // NEW: Hook for strategy logic

        // Farm dimensions
        this.gridSize = 10;
        this.cellSize = 40; // Primarily for UI, but kept for potential future use

        // Base game state
        this.day = 1;
        this.year = 1;
        this.season = 'Spring';
        this.seasonDay = 1;
        this.balance = 100000;
        this.farmValue = 250000;
        this.farmHealth = 85;
        this.waterReserve = 75;
        this.paused = false;
        this.speed = 5; // UI related
        this.currentOverlay = 'crop'; // UI related

        // Game Parameters (pulled from constants above)
        this.interestRate = ANNUAL_INTEREST_RATE;
        this.plantingCostFactor = PLANTING_COST_FACTOR;
        this.irrigationCost = IRRIGATION_COST;
        this.fertilizeCost = FERTILIZE_COST;


        // Debug logging
        const loggerVerbosity = (this.headless && this.debugMode) ? 2 : (this.debugMode ? 2 : 1);
        this.logger = new Logger(100, loggerVerbosity, this.headless); // Pass headless flag to logger

        // Game grid
        this.grid = [];

        // Technology/Research
        this.technologies = createTechnologyTree(); // This holds tech costs etc.
        this.researchedTechs = [];

        // Events
        this.events = []; // Only needed for UI event log
        this.pendingEvents = [];

        // Market prices
        this.marketPrices = {};

        // Climate parameters
        this.climate = {
            avgTemp: 70,
            rainfall: 20,
            droughtProbability: 0.05,
            floodProbability: 0.03,
            heatwaveProbability: 0.08
        };

        // Initialize the farm grid
        this.initializeGrid();

        // Initialize market prices
        this.updateMarketPrices();

        // UI manager (conditional)
        this.ui = null;
        if (!this.headless) {
            // Ensure UIManager is only instantiated after DOM is ready if needed by UIManager constructor
             if (document.readyState === 'loading') {
                 document.addEventListener('DOMContentLoaded', () => { this.ui = new UIManager(this); });
             } else {
                 this.ui = new UIManager(this);
             }
        } else {
            this.logger.log('Running in Headless Mode');
        }

        // Game loop state (for UI mode)
        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / this.speed;
        this.animationFrameId = null; // To control the loop
    }

    // Initialize the farm grid
    initializeGrid() {
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col] = new Cell();
            }
        }
    }

    // Start the game (UI Mode)
    start() {
        if (this.headless) {
            this.logger.log('Start() called in headless mode. Use test runner or external loop to call runTick().', 1);
            return;
        }
         // Ensure UI is ready before starting loop/rendering
         if (!this.ui) {
             // Possible race condition if DOMContentLoaded hasn't fired yet
             // Retry after a short delay or handle more robustly
             setTimeout(() => this.start(), 100);
             console.warn("UI not ready, delaying start...");
             return;
         }

        this.paused = false; // Ensure game is not paused
        this.lastUpdateTime = performance.now();
        if (this.ui) {
            this.ui.updateLegend();
            this.ui.render(); // Initial render
        }
        // Start the animation loop only if not already running
        if (!this.animationFrameId) {
            this.gameLoop();
        }
        this.logger.log("Game started (UI Mode)");
    }

    // Stop the game loop (UI Mode)
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.logger.log("Game loop stopped (UI Mode)");
        }
        this.paused = true; // Ensure state reflects stopped loop
    }


    // Main game loop (UI Mode - uses requestAnimationFrame)
    gameLoop(timestamp = 0) {
        // Store the frame ID so it can be cancelled
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));

        // Calculate elapsed time
        const elapsed = timestamp - this.lastUpdateTime;

        // Update game state if enough time has passed and game isn't paused
        if (!this.paused && elapsed > this.updateInterval) {
            this.runTick(); // Execute one simulation step
            this.lastUpdateTime = timestamp;
             // Update UI elements controlled by the main loop
            if (this.ui) {
                this.ui.updateHUD(); // Update HUD based on new state
                this.ui.render(); // Re-render the grid
            }
        }
    }

    // Run a single simulation step (Core Logic - used by UI loop and headless runner)
    runTick() {
        // Advance day
        this.day++;
        this.seasonDay++;

        // Update crop growth and conditions
        this.updateFarmCells(); // Renamed from updateFarm for clarity

        // Check for season change (every 90 days)
        if (this.seasonDay > 90) {
            this.seasonDay = 1;
            this.advanceSeason();
        }

        // Check for year change
        if (this.day > 360) {
            this.day = 1;
            this.advanceYear(); // This includes the termination check logic now
        }

        // Process any pending events for the current day
        this.processPendingEvents();

        // Update farm health based on overall conditions
        this.farmHealth = calculateFarmHealth(this.grid, this.waterReserve);

        // Generate random events occasionally
        if (this.day % 5 === 0 && Math.random() < 0.2) {
             this.scheduleRandomEvent();
        }

        // --- NEW: Strategy Hook ---
        // Execute strategy logic if a strategy tick function is assigned
        if (this.strategyTick) {
            try {
                this.strategyTick(this); // 'this' refers to the game instance
            } catch(error) {
                this.logger.log(`ERROR in strategyTick (${this.testStrategyId}): ${error.message}`, 0);
                 console.error("Error during strategy execution:", error);
                 // Optionally stop the test?
                 // For now, just log and continue
            }
        }

        // Note: UI updates (HUD, render) are NOT called here.
        // They are handled by the gameLoop (UI mode) or not at all (headless).
    }


    // Schedule a random event
    scheduleRandomEvent() {
         const farmState = {
            climate: this.climate,
            day: this.day,
            season: this.season,
            waterReserve: this.waterReserve,
            farmHealth: this.farmHealth,
            balance: this.balance,
            researchedTechs: this.researchedTechs
        };

        const newEvent = Events.generateRandomEvent(farmState);
        if (newEvent) {
            const isDuplicate = this.pendingEvents.some(event =>
                event.type === newEvent.type &&
                Math.abs(event.day - newEvent.day) < 5 // Check proximity in days
            );

            if (!isDuplicate) {
                // Ensure event day is in the future relative to current day
                if(newEvent.day <= this.day) { // Check if event day is today or in the past
                    newEvent.day = this.day + Math.floor(Math.random() * 5) + 1; // Schedule 1-5 days ahead
                }
                this.pendingEvents.push(newEvent);
                if (newEvent.forecastMessage) {
                    this.addEvent(newEvent.forecastMessage); // Add forecast to UI log
                }
                this.logger.log(`Scheduled event: ${newEvent.type} on day ${newEvent.day}. Forecast: ${newEvent.forecastMessage || 'None'}`, 2);
            } else {
                 this.logger.log(`Skipped duplicate event scheduling: ${newEvent.type}`, 2);
            }
        }
    }


    // Update farm cells state
    updateFarmCells() {
        let harvestReadyCells = [];

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.grid[row][col];
                // Pass researched techs to cell update
                const result = cell.update(this.waterReserve, this.researchedTechs);

                if (result === 'harvest-ready') {
                    harvestReadyCells.push({ row, col });
                }
            }
        }

        // Add harvest-ready notifications (primarily for UI)
        harvestReadyCells.forEach(({ row, col }) => {
            const cell = this.grid[row][col];
            this.addEvent(`${cell.crop.name} at row ${row+1}, column ${col+1} is ready for harvest!`);
        });
    }

    // Advance to next season
    advanceSeason() {
        const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
        const currentIndex = seasons.indexOf(this.season);
        this.season = seasons[(currentIndex + 1) % 4];

        this.addEvent(`Season changed to ${this.season}`);
        this.logger.log(`Season changed to ${this.season}`, 1);

        this.fluctuateMarketPrices();

        // Simplified seasonal event scheduling & water recovery
        let recovery = 0;
        switch (this.season) {
            case 'Summer':
                if (Math.random() < 0.3) this.pendingEvents.push(Events.scheduleDrought(this.day, this.climate.droughtProbability));
                if (Math.random() < 0.4) this.pendingEvents.push(Events.scheduleHeatwave(this.day));
                break;
            case 'Winter':
                if (Math.random() < 0.3) this.pendingEvents.push(Events.scheduleFrost(this.day));
                recovery = Math.floor(5 + Math.random() * 10); // 5-15%
                break;
            case 'Spring':
                 if (Math.random() < 0.4) this.pendingEvents.push(Events.scheduleRain(this.day));
                recovery = Math.floor(10 + Math.random() * 15); // 10-25%
                break;
            case 'Fall':
                 if (Math.random() < 0.3) this.pendingEvents.push(Events.scheduleRain(this.day));
                 if (Math.random() < 0.2) this.pendingEvents.push(Events.scheduleHeatwave(this.day));
                recovery = Math.floor(5 + Math.random() * 10); // 5-15%
                break;
        }

        if (recovery > 0) {
             this.waterReserve = Math.min(100, this.waterReserve + recovery);
             const msg = `${this.season} precipitation replenished ${recovery}% water reserves.`;
             this.addEvent(msg);
             this.logger.log(msg, 1);
        }
    }

    // Advance to next year
    advanceYear() {
        this.year++;
        this.logger.log(`======== STARTING YEAR ${this.year} ========`, 1);

        // Apply interest
        if (this.balance > 0) {
            // *** FIX: Use the interestRate property defined in the constructor ***
            const interest = Math.floor(this.balance * this.interestRate);
             if (interest > 0) {
                this.balance += interest;
                const msg = `Earned $${interest.toLocaleString()} in interest.`;
                this.addEvent(msg);
                this.logger.log(msg, 1);
             }
        }

        this.farmValue = calculateFarmValue(this.grid, this.technologies);
        const sustainabilityScore = this.calculateSustainabilityScore();

        this.logger.log(`Year ${this.year} Summary: Balance: $${this.balance.toLocaleString()}, Value: $${this.farmValue.toLocaleString()}, Health: ${this.farmHealth}%, Water: ${this.waterReserve}%, SustainScore: ${sustainabilityScore.total}%`, 1);
        this.logger.log(` -- Sustain Breakdown: Soil ${sustainabilityScore.soilScore}%, Diversity ${sustainabilityScore.diversityScore}%, Tech ${sustainabilityScore.techScore}%`, 2);

        // Climate change effect
        this.climate.droughtProbability = Math.min(0.5, this.climate.droughtProbability + 0.005); // Cap probability
        this.climate.heatwaveProbability = Math.min(0.6, this.climate.heatwaveProbability + 0.005);
        this.logger.log(`Climate Change Update: Drought Prob ${this.climate.droughtProbability.toFixed(3)}, Heatwave Prob ${this.climate.heatwaveProbability.toFixed(3)}`, 2);


        this.addEvent(`Happy New Year! Completed Year ${this.year - 1}.`);

        // Sustainability subsidy
        let bonus = 0;
        if (sustainabilityScore.total >= 70) bonus = Math.round(10000 * (sustainabilityScore.total / 100));
        else if (sustainabilityScore.total >= 50) bonus = Math.round(5000 * (sustainabilityScore.total / 100));
        else if (sustainabilityScore.total >= 30) bonus = Math.round(2000 * (sustainabilityScore.total / 100));

        if (bonus > 0) {
            this.balance += bonus;
             const msg = `Received $${bonus.toLocaleString()} sustainability subsidy.`;
             this.addEvent(msg);
             this.logger.log(msg, 1);
        } else {
            this.addEvent(`Farm did not qualify for sustainability subsidies.`);
            this.logger.log(`Farm did not qualify for sustainability subsidies.`, 1);
        }

        if (this.year % 10 === 0) {
            this.addEvent(`Major milestone: ${this.year} years of operation!`);
            if (Math.random() < 0.7) {
                const policyEvent = Events.generatePolicyEvent(this.day, this.farmHealth);
                 if (policyEvent.day <= this.day) policyEvent.day = this.day + 1; // Ensure future date
                this.pendingEvents.push(policyEvent);
                this.addEvent(`New climate policy announced.`);
                this.logger.log(`Scheduled policy event for 10-year milestone: ${policyEvent.policyType || 'Unknown'}`, 1);
            }
        }

        // Check for test termination condition AFTER year processing
        if (this.testMode && this.autoTerminate && (this.year >= this.testEndYear || this.balance <= 0)) {
             this.logger.log(`Test termination condition met after year processing. Year: ${this.year}, Balance: ${this.balance}`, 1);
             // The test harness loop should catch this state on the *next* iteration's check.
        }
    }

    // Calculate sustainability score (keep as is - same as provided before)
    calculateSustainabilityScore() {
        let soilScore = 0;
        let cropDiversityScore = 0;
        let techScore = 0;
        let totalSoilHealth = 0;
        let cellCount = 0;
        let cropCounts = {};
        let totalCrops = 0;
        let monocropPenalty = 0;

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.grid[row][col];
                totalSoilHealth += cell.soilHealth;
                cellCount++;
                if (cell.crop.id !== 'empty') {
                    cropCounts[cell.crop.id] = (cropCounts[cell.crop.id] || 0) + 1;
                    totalCrops++;
                    if (cell.consecutivePlantings > 0) {
                         monocropPenalty += cell.consecutivePlantings * 2; // Example penalty
                    }
                }
            }
        }

        const avgSoilHealth = cellCount > 0 ? totalSoilHealth / cellCount : 0;
        soilScore = Math.round(avgSoilHealth);

        const uniqueCrops = Object.keys(cropCounts).length;
        if (totalCrops > 0) {
             const maxPossibleCrops = Math.min(totalCrops, crops.length - 1);
             let rawDiversityScore = (maxPossibleCrops > 0 ? (uniqueCrops / maxPossibleCrops) : 0) * 100;
             const maxSingleCropCount = totalCrops > 0 ? Math.max(0, ...Object.values(cropCounts)) : 0;
             const dominantCropPercentage = totalCrops > 0 ? maxSingleCropCount / totalCrops : 0;
             const distributionPenalty = dominantCropPercentage > 0.5 ? (dominantCropPercentage - 0.5) * 100 : 0; // Penalize >50% dominance
             const monocropScorePenalty = totalCrops > 0 ? Math.min(50, monocropPenalty / totalCrops * 10) : 0; // Scale penalty
             cropDiversityScore = Math.round(Math.max(0, rawDiversityScore - distributionPenalty - monocropScorePenalty));
        }


        const sustainableTechs = ['drip_irrigation', 'soil_sensors', 'no_till_farming', 'precision_drones', 'renewable_energy', 'greenhouse', 'drought_resistant', 'ai_irrigation', 'silvopasture'];
        let rawTechScore = 0;
        let techPointsPossible = 0; // Calculate max possible points based on defined techs

         sustainableTechs.forEach(techId => {
            const techDef = this.technologies.find(t => t.id === techId);
            if (!techDef) return; // Skip if tech definition not found

             let points = 0;
             switch (techId) { // Assign points based on impact
                case 'no_till_farming': case 'silvopasture': points = 20; break;
                case 'drip_irrigation': case 'renewable_energy': case 'precision_drones': case 'ai_irrigation': points = 15; break;
                default: points = 10; break;
             }
             techPointsPossible += points; // Add to total possible points

             if (this.hasTechnology(techId)) {
                 rawTechScore += points;
             }
         });

         techScore = techPointsPossible > 0 ? Math.round((rawTechScore / techPointsPossible) * 100) : 0;

        // Weighted average: Soil 40%, Diversity 30%, Tech 30%
        const totalScore = Math.round((soilScore * 0.4) + (cropDiversityScore * 0.3) + (techScore * 0.3));

        return { total: totalScore, soilScore, diversityScore: cropDiversityScore, techScore };
    }


    // Process pending events (keep as is - same as provided before)
    processPendingEvents() {
        const activeEventsToday = this.pendingEvents.filter(event => event.day === this.day);
        const remainingEvents = this.pendingEvents.filter(event => event.day !== this.day);
        this.pendingEvents = remainingEvents; // Update pending list immediately

        if (activeEventsToday.length > 0) {
             this.logger.log(`Processing ${activeEventsToday.length} events for Day ${this.day}`, 2);
        }


        activeEventsToday.forEach(event => {
             this.logger.log(`-- Applying event: ${event.type} (${event.subType || event.severity || ''})`, 2);
            let result = {};
            let continueEvent = null;
            let logMsg = event.message; // Default log message
            let logLvl = event.isAlert ? 1 : 2; // Log alerts at level 1

            try {
                 switch (event.type) {
                    case 'rain':
                        result = Events.applyRainEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                        this.waterReserve = result.waterReserve;
                        logMsg = result.message;
                        break;
                    case 'drought':
                         result = Events.applyDroughtEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                         if (!result.skipped) {
                             this.waterReserve = result.waterReserve;
                             logMsg = result.message;
                             if (result.continueEvent) {
                                 continueEvent = { ...event, day: this.day + 1, duration: result.nextDuration, message: result.message }; // Carry message forward
                             } else {
                                 this.addEvent(`The drought has ended.`); this.logger.log('Drought event ended.', 1);
                             }
                         } else { logMsg = null; } // Don't log skipped
                        break;
                    case 'heatwave':
                        result = Events.applyHeatwaveEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                         if (!result.skipped) {
                            this.waterReserve = result.waterReserve;
                            logMsg = result.message;
                             if (result.continueEvent) {
                                continueEvent = { ...event, day: this.day + 1, duration: result.nextDuration, message: result.message };
                             } else {
                                 this.addEvent(`The heatwave has ended.`); this.logger.log('Heatwave event ended.', 1);
                             }
                         } else { logMsg = null; }
                        break;
                    case 'frost':
                         result = Events.applyFrostEvent(event, this.grid, this.researchedTechs);
                         logMsg = result.message;
                        break;
                    case 'market':
                         result = Events.applyMarketEvent(event, this.marketPrices, crops);
                        this.marketPrices = result.marketPrices;
                        logMsg = result.message;
                        break;
                    case 'policy':
                         result = Events.applyPolicyEvent(event, this.balance);
                        this.balance = result.newBalance;
                         logMsg = result.message;
                         if (result.balanceChange) logMsg += ` (Balance change: $${result.balanceChange.toLocaleString()})`;
                        break;
                    case 'technology':
                         result = Events.applyTechnologyEvent(event, this.balance, this.researchedTechs);
                        this.balance = result.newBalance;
                         logMsg = result.message;
                         if(event.subType === 'innovation_grant' && event.amount > 0) logMsg += ` (+$${event.amount.toLocaleString()})`;
                         if(event.subType === 'technology_setback') logMsg += ` (-$${event.amount.toLocaleString()})`;
                        break;
                    default:
                         this.logger.log(`Unknown event type processed: ${event.type}`, 0);
                         logMsg = null;
                 }

                 // Add resulting message to UI event log and logger
                 if (logMsg) {
                     this.addEvent(logMsg, event.isAlert);
                     this.logger.log(`Event Result: ${logMsg}`, logLvl);
                 }


                 // Re-schedule continuing events
                 if (continueEvent) {
                     this.pendingEvents.push(continueEvent);
                     this.logger.log(`-- Event ${event.type} continues tomorrow (Day ${continueEvent.day}), duration left: ${continueEvent.duration}`, 2);
                 }
            } catch (error) {
                 this.logger.log(`ERROR applying event ${event.type}: ${error.message}`, 0);
                 console.error("Error during event processing:", error); // Keep console error for stack trace
            }
        });
    }

    // Add an event to the event log (UI only)
    addEvent(message, isAlert = false) {
        if (this.headless) return; // Don't store events in headless mode

        const event = {
            date: `${this.season}, Year ${this.year}`,
            message,
            isAlert
        };
        this.events.unshift(event);
        if (this.events.length > 20) this.events.pop();

        if (this.ui) {
            this.ui.updateEventsList(); // Update UI immediately
        }
    }

    // --- Player Actions (callable by UI or strategy) ---

    plantCrop(row, col, cropId) {
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
             this.logger.log(`Invalid coordinates for planting: (${row}, ${col})`, 0); return false;
        }
        const cell = this.grid[row][col];
        const newCrop = getCropById(cropId);

        if (!newCrop || newCrop.id === 'empty') {
             this.logger.log(`Invalid crop ID for planting: ${cropId}`, 0); return false;
        }

        // *** FIX: Use the plantingCostFactor property from 'this' ***
        const plantingCost = Math.round(newCrop.basePrice * this.plantingCostFactor);

        if (this.balance < plantingCost) {
            const msg = `Cannot afford to plant ${newCrop.name}. Cost: $${plantingCost.toLocaleString()}, Balance: $${this.balance.toLocaleString()}`;
            this.addEvent(msg, true); this.logger.log(msg, 1);
            return false;
        }
        if (cell.crop.id !== 'empty') {
            const msg = `Cannot plant ${newCrop.name}, plot (${row}, ${col}) is already occupied by ${cell.crop.name}.`;
            // Only log error if attempted manually, strategies might try planting occupied cells
            if (!this.testMode) this.addEvent(msg, true);
            this.logger.log(msg, this.testMode ? 2 : 1); // Log less severely in test mode
            return false;
        }

        this.balance -= plantingCost;
        cell.plant(newCrop);

        const msg = `Planted ${newCrop.name} at (${row}, ${col}). Cost: $${plantingCost.toLocaleString()}`;
        this.addEvent(msg); this.logger.log(msg, 2);

        if (this.ui) {
            this.ui.updateHUD();
            this.ui.showCellInfo(row, col); // Update if panel is open
            // this.ui.render(); // Render handled by gameLoop
        }
        return true;
    }

    irrigateCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        // *** FIX: Use the irrigationCost property from 'this' ***
        const cost = this.irrigationCost;

        if (cell.crop.id === 'empty') { this.addEvent('Cannot irrigate empty plot.', true); this.logger.log(`Attempted to irrigate empty plot (${row}, ${col})`, 2); return false; }
        if (cell.irrigated) { /*this.addEvent('Plot already irrigated today.', true);*/ this.logger.log(`Plot (${row}, ${col}) already irrigated today.`, 3); return false; } // Reduce log noise
        if (this.balance < cost) { this.addEvent(`Cannot afford irrigation ($${cost}).`, true); this.logger.log(`Cannot afford irrigation ($${cost}). Balance: $${this.balance}`, 1); return false; }

        this.balance -= cost;
        const waterEfficiency = this.getTechEffectValue('waterEfficiency', 1.0); // Default 1.0
        cell.irrigate(waterEfficiency);

        const msg = `Irrigated plot at (${row}, ${col}). Cost: $${cost.toLocaleString()}`;
        this.addEvent(msg); this.logger.log(msg, 2);

        if (this.ui) {
            this.ui.updateHUD();
            this.ui.showCellInfo(row, col);
            // this.ui.render();
        }
        return true;
    }

    fertilizeCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        // *** FIX: Use the fertilizeCost property from 'this' ***
        const cost = this.fertilizeCost;

        if (cell.crop.id === 'empty') { this.addEvent('Cannot fertilize empty plot.', true); this.logger.log(`Attempted to fertilize empty plot (${row}, ${col})`, 2); return false; }
        if (cell.fertilized) { /*this.addEvent('Plot already fertilized.', true);*/ this.logger.log(`Plot (${row}, ${col}) already fertilized.`, 3); return false; } // Reduce log noise
        if (this.balance < cost) { this.addEvent(`Cannot afford fertilizer ($${cost}).`, true); this.logger.log(`Cannot afford fertilizer ($${cost}). Balance: $${this.balance}`, 1); return false; }


        this.balance -= cost;
        const fertilizerEfficiency = this.getTechEffectValue('fertilizerEfficiency', 1.0);
        cell.fertilize(fertilizerEfficiency);

        const msg = `Fertilized plot at (${row}, ${col}). Cost: $${cost.toLocaleString()}`;
        this.addEvent(msg); this.logger.log(msg, 2);

        if (this.ui) {
            this.ui.updateHUD();
            this.ui.showCellInfo(row, col);
            // this.ui.render();
        }
        return true;
    }

    harvestCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];

        if (cell.crop.id === 'empty') { /*this.addEvent('Nothing to harvest.', true);*/ this.logger.log(`Attempted harvest on empty plot (${row}, ${col})`, 3); return false; } // Reduce log noise
        if (!cell.harvestReady) { /*this.addEvent('Crop not ready for harvest.', true);*/ this.logger.log(`Attempted harvest on not-ready plot (${row}, ${col})`, 3); return false; } // Reduce log noise

        const marketPriceFactor = this.marketPrices[cell.crop.id] || 1.0;
        const result = cell.harvest(this.waterReserve, marketPriceFactor); // Harvest returns { value, cropName, yieldPercentage }

        if (result.value === undefined || result.yieldPercentage === undefined) {
             this.logger.log(`ERROR: Harvest calculation failed for plot (${row}, ${col})`, 0);
             return false;
        }


        this.balance += result.value;

        const msg = `Harvested ${result.cropName} at (${row}, ${col}) for $${result.value.toLocaleString()}. Yield: ${result.yieldPercentage}%`;
        this.addEvent(msg); this.logger.log(msg, 1); // Log harvest as level 1

        if (this.ui) {
            this.ui.updateHUD();
            this.ui.showCellInfo(row, col);
            // this.ui.render();
        }
        return true;
    }

    researchTechnology(techId) {
        const tech = this.technologies.find(t => t.id === techId);
        if (!tech) { this.logger.log(`Technology ID not found: ${techId}`, 0); return false; }
        if (tech.researched) { this.logger.log(`${tech.name} already researched.`, 1); return false; }

        if (!checkTechPrerequisites(tech, this.researchedTechs)) { // Use imported function
            const msg = `Prerequisites not met for ${tech.name}.`;
            this.addEvent(msg, true); this.logger.log(msg, 1);
            return false;
        }

        if (this.balance < tech.cost) {
            const msg = `Cannot afford ${tech.name} ($${tech.cost.toLocaleString()}). Balance: $${this.balance.toLocaleString()}`;
            this.addEvent(msg, true); this.logger.log(msg, 1);
            return false;
        }

        this.balance -= tech.cost;
        tech.researched = true;
        this.researchedTechs.push(tech.id);

        const msg = `Researched ${tech.name} for $${tech.cost.toLocaleString()}`;
        this.addEvent(msg); this.logger.log(msg, 1); // Log research as level 1

        if (this.ui) {
            this.ui.updateHUD();
            this.ui.showResearchModal(); // Update modal if open
        }
        return true;
    }

    // --- Helper Methods ---

    updateMarketPrices() {
        crops.forEach(crop => {
            if (crop.id !== 'empty') {
                this.marketPrices[crop.id] = 0.8 + Math.random() * 0.4; // Start 80-120%
            }
        });
         this.logger.log("Initial market prices set.", 2);
    }

    fluctuateMarketPrices() {
         let changes = [];
        crops.forEach(crop => {
            if (crop.id !== 'empty') {
                const change = 0.9 + Math.random() * 0.2; // +/- 10% fluctuation
                const oldPrice = this.marketPrices[crop.id];
                this.marketPrices[crop.id] = Math.max(0.5, Math.min(2.0, oldPrice * change)); // Keep between 50% and 200%
                 // Only log significant changes? For now log all
                 //if (Math.abs(this.marketPrices[crop.id] - oldPrice) > 0.01) {
                    changes.push(`${crop.id}: ${Math.round(oldPrice*100)}%->${Math.round(this.marketPrices[crop.id]*100)}%`);
                 //}
            }
        });
         if(changes.length > 0) this.logger.log(`Market prices fluctuated: ${changes.join(', ')}`, 2);
        if(this.ui && this.ui.isMarketModalOpen) this.ui.showMarketModal(); // Update if open
    }

    togglePause() { // UI Only method
        if (this.headless) return;
        this.paused = !this.paused;
        this.logger.log(`Game ${this.paused ? 'Paused' : 'Resumed'}`, 1);
        if (this.ui) {
            document.getElementById('pause-btn').textContent = this.paused ? 'Resume' : 'Pause';
        }
        // If resuming, restart the animation loop if it was stopped
        if (!this.paused && !this.animationFrameId) {
            this.lastUpdateTime = performance.now(); // Reset timer
            this.gameLoop();
        }
    }

    // Check if a technology is researched
    hasTechnology(techId) {
        return this.researchedTechs.includes(techId);
    }

    // Get combined effect value from researched technologies
    getTechEffectValue(effectName, defaultValue = 1.0) {
        // Use the imported helper function directly
        return getTechEffectValue(effectName, this.researchedTechs, defaultValue);
    }

    // Find technology cost (helper for strategies)
    getTechnologyCost(techId) {
        const tech = this.technologies.find(t => t.id === techId);
        return tech ? tech.cost : Infinity; // Return Infinity if not found
    }


    // --- Test Mode Specific Methods (mostly for harness interaction) ---

    // Called by harness after test finishes to log results & trigger next
    terminateTest() {
        this.logger.log(`==== TEST ${this.testStrategyId} FINAL RESULT ====`, 1);
        this.logger.log(`Ending Year: ${this.year}, Day: ${this.day}`, 1);
        this.logger.log(`Final Balance: $${this.balance.toLocaleString()}`, 1);
        this.logger.log(`Final Farm Value: $${this.farmValue.toLocaleString()}`, 1);
        this.logger.log(`Final Farm Health: ${this.farmHealth}%`, 1);
        this.logger.log(`Final Water Reserve: ${this.waterReserve}%`, 1);
        const finalSustainability = this.calculateSustainabilityScore();
        this.logger.log(`Final Sustainability: ${finalSustainability.total}% (S:${finalSustainability.soilScore} D:${finalSustainability.diversityScore} T:${finalSustainability.techScore})`, 1);
        this.logger.log(`Researched Techs: ${this.researchedTechs.join(', ') || 'None'}`, 1);
        this.logger.log(`========================================`, 1);


        // Stop simulation if in UI mode (though unlikely for auto-terminate tests)
        this.stop();

        // Call the callback provided by the test harness to start the next test
        if (this.nextTestCallback) {
            // Use setTimeout to avoid potential call stack issues if callback immediately starts new test
            setTimeout(() => {
                 if (this.nextTestCallback) {
                     try {
                        this.nextTestCallback();
                     } catch (error) {
                         console.error("Error executing nextTestCallback:", error);
                     }
                 }
            }, 100); // Short delay
        }
    }
}
