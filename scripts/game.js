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
import { Logger, calculateFarmHealth, calculateFarmValue, formatCurrency } from './utils.js'; // ADDED formatCurrency here
import * as Events from './events.js';

// --- Constants ---
// ADJUSTED: Keep interest rate low
const ANNUAL_INTEREST_RATE = 0.01; // Lowered to 1%
// ADJUSTED: Raise low threshold back slightly, keep higher tiers
const SUSTAINABILITY_THRESHOLD_LOW = 35; // Was 30, originally 40
const SUSTAINABILITY_THRESHOLD_MED = 60;
const SUSTAINABILITY_THRESHOLD_HIGH = 75;
// KEEP: Base subsidy amounts seem okay if threshold adjusted
const SUSTAINABILITY_SUBSIDY_BASE_LOW = 3000;
const SUSTAINABILITY_SUBSIDY_BASE_MED = 6000;
const SUSTAINABILITY_SUBSIDY_BASE_HIGH = 12000;
// REMOVED: Early establishment support grant - let first harvest matter more
// Suggestion B: Early Economics
const INITIAL_BALANCE = 225000; // Keep slightly higher start
// ADJUSTED: Further reduce planting cost factor
const PLANTING_COST_FACTOR = 0.15; // Was 0.2
// ADJUSTED: Drastically reduce daily overhead
const DAILY_OVERHEAD_COST = 3; // Was 8 - Minimal baseline cost

// KEEP: Action costs seem low enough now
const IRRIGATION_COST = 100;
const FERTILIZE_COST = 150;
// --- End Constants ---

const DAYS_IN_YEAR = 360; // Define for clarity if using seasons of 90 days


// Main game class
export class CaliforniaClimateFarmer {
    constructor(options = {}) {
        this.headless = options.headless || false;
        this.debugMode = options.debugMode || false;

        this.testMode = options.testMode || false;
        this.testStrategyId = options.testStrategyId || null;
        this.testEndYear = options.testEndYear || 50;
        this.autoTerminate = options.autoTerminate || false;
        this.nextTestCallback = options.nextTestCallback || null;
        this.strategyTick = null;

        this.gridSize = 10;
        this.cellSize = 40;

        this.day = 1;
        this.year = 1;
        this.season = 'Spring';
        this.seasonDay = 1;
        this.balance = INITIAL_BALANCE; // Use constant
        this.farmValue = 50000; // Initial placeholder, recalculated immediately
        this.farmHealth = 85; // Starting health
        this.waterReserve = 75;
        this.paused = false;
        this.speed = 5;
        this.currentOverlay = 'crop';

        // Game Parameters
        this.interestRate = ANNUAL_INTEREST_RATE;
        this.plantingCostFactor = PLANTING_COST_FACTOR;
        this.irrigationCost = IRRIGATION_COST; // Use constant
        this.fertilizeCost = FERTILIZE_COST; // Use constant
        this.dailyOverhead = DAILY_OVERHEAD_COST; // Use constant

        // Debug logging
        const loggerVerbosity = (this.headless && this.debugMode) ? 2 : (this.debugMode ? 2 : 1);
        this.logger = new Logger(200, loggerVerbosity, this.headless);

        this.grid = [];
        this.technologies = createTechnologyTree();
        this.researchedTechs = [];
        this.events = [];
        this.pendingEvents = [];
        this.marketPrices = {};

        this.climate = {
            avgTemp: 70,
            rainfall: 20,
            droughtProbability: 0.05,
            floodProbability: 0.03,
            heatwaveProbability: 0.08
        };

        this.initializeGrid();
        this.updateMarketPrices();
        // Recalculate initial farm value based on grid state and techs (no balance included)
        this.farmValue = calculateFarmValue(this.grid, this.technologies);

        this.ui = null;
        if (!this.headless) {
             if (typeof window !== 'undefined' && document.readyState === 'loading') {
                 document.addEventListener('DOMContentLoaded', () => { this.ui = new UIManager(this); });
             } else if (typeof window !== 'undefined') {
                 this.ui = new UIManager(this);
             }
        } else {
            this.logger.log('Running in Headless Mode');
        }

        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / this.speed;
        this.animationFrameId = null;
    }

    initializeGrid() {
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col] = new Cell();
            }
        }
         this.logger.log(`Initialized ${this.gridSize}x${this.gridSize} grid.`, 2);
    }

    start() {
        if (this.headless) {
            this.logger.log('Start() called in headless mode. Use test runner or external loop to call runTick().', 1);
            return;
        }
         if (!this.ui) {
             setTimeout(() => this.start(), 100);
             console.warn("UI not ready, delaying start...");
             return;
         }

        this.paused = false;
        this.lastUpdateTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

        if (this.ui) {
            this.ui.updateLegend();
            this.ui.render();
        }
        if (!this.animationFrameId) {
            this.gameLoop();
        }
        this.logger.log("Game started (UI Mode)");
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.logger.log("Game loop stopped (UI Mode)");
        }
        this.paused = true;
    }

    gameLoop(timestamp = 0) {
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
        const currentTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const elapsed = currentTime - this.lastUpdateTime;

        if (!this.paused && elapsed >= this.updateInterval) {
            this.runTick();
            this.lastUpdateTime = currentTime;
            if (this.ui) {
                this.ui.updateHUD();
                this.ui.render();
            }
        }
    }

    runTick() {
        // DEDUCT DAILY OVERHEAD COST (using the constant)
        this.balance -= this.dailyOverhead; // Now much lower
        if (this.balance < -5000 && !this.testMode) {
             this.addEvent("Warning: Farm operating at a significant loss!", true);
        }

        this.day++;
        this.seasonDay++;
        this.updateFarmCells();

        // Advance season/year logic
        if (this.seasonDay > 90) { // Assuming 90 days/season
            this.seasonDay = 1;
            this.advanceSeason();
        }
        if (this.day > DAYS_IN_YEAR) { // Use constant
            this.day = 1;
            this.advanceYear(); // Advance year logic handles subsidies, interest, etc.
        }

        // Process events *after* potential year/season change
        this.processPendingEvents();
        this.farmHealth = calculateFarmHealth(this.grid, this.waterReserve);

        // Keep event chance the same for now
        if (this.day % 4 === 0 && Math.random() < 0.25) {
             this.scheduleRandomEvent();
        }

        // Execute strategy tick if in headless mode
        if (this.strategyTick) {
            try {
                this.strategyTick(this);
            } catch(error) {
                this.logger.log(`ERROR in strategyTick (${this.testStrategyId}): ${error.message}`, 0);
                 console.error("Error during strategy execution:", error);
            }
        }
    }

    scheduleRandomEvent() {
         const farmState = {
            climate: this.climate, day: this.day, season: this.season, year: this.year, // Pass year
            waterReserve: this.waterReserve, farmHealth: this.farmHealth,
            balance: this.balance, researchedTechs: this.researchedTechs
        };
        const newEvent = Events.generateRandomEvent(farmState);
        if (newEvent) {
            const isDuplicate = this.pendingEvents.some(event =>
                event.type === newEvent.type && Math.abs(event.day - newEvent.day) < 5);
            if (!isDuplicate) {
                // Ensure event day is in the future (or current day if needed?)
                if(newEvent.day <= this.day) newEvent.day = this.day + Math.floor(Math.random() * 5) + 1;

                // Prevent scheduling events too far into the future? Maybe limit to current year?
                const maxEventDay = (this.year * DAYS_IN_YEAR) + DAYS_IN_YEAR; // Rough max day
                const currentAbsoluteDay = (this.year - 1) * DAYS_IN_YEAR + this.day;
                if (newEvent.day > maxEventDay) newEvent.day = currentAbsoluteDay + Math.floor(Math.random() * 30) + 10;


                this.pendingEvents.push(newEvent);
                if (newEvent.forecastMessage) this.addEvent(newEvent.forecastMessage);
                this.logger.log(`Scheduled event: ${newEvent.type} on day ${newEvent.day}. Forecast: ${newEvent.forecastMessage || 'None'}`, 2);
            } else {
                 this.logger.log(`Skipped duplicate event scheduling: ${newEvent.type}`, 2);
            }
        }
    }

    updateFarmCells() {
        let harvestReadyCells = [];
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.grid[row][col];
                // Pass techs array to cell update
                const result = cell.update(this.waterReserve, this.researchedTechs);
                if (result === 'harvest-ready') harvestReadyCells.push({ row, col });
            }
        }
        harvestReadyCells.forEach(({ row, col }) => {
            const cell = this.grid[row][col];
            this.addEvent(`${cell.crop.name} at row ${row+1}, col ${col+1} is ready for harvest!`);
        });
    }

    advanceSeason() {
        const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
        const currentIndex = seasons.indexOf(this.season);
        this.season = seasons[(currentIndex + 1) % 4];
        this.addEvent(`Season changed to ${this.season}`);
        this.logger.log(`Season changed to ${this.season}`, 1);
        this.fluctuateMarketPrices();

        let recovery = 0;
        switch (this.season) {
            case 'Summer':
                // Schedule potential drought/heatwave
                if (Math.random() < this.climate.droughtProbability) this.pendingEvents.push(Events.scheduleDrought(this.day, this.climate.droughtProbability));
                if (Math.random() < this.climate.heatwaveProbability) this.pendingEvents.push(Events.scheduleHeatwave(this.day));
                break;
            case 'Winter':
                 // Schedule potential frost
                 if (Math.random() < 0.3) this.pendingEvents.push(Events.scheduleFrost(this.day));
                // Water recovery
                recovery = Math.floor(4 + Math.random() * 5); // 4-8%
                break;
            case 'Spring':
                 // Schedule potential rain
                 if (Math.random() < 0.4) this.pendingEvents.push(Events.scheduleRain(this.day));
                // Water recovery
                recovery = Math.floor(8 + Math.random() * 11); // 8-18%
                break;
            case 'Fall':
                 // Schedule potential rain or late heatwave
                 if (Math.random() < 0.3) this.pendingEvents.push(Events.scheduleRain(this.day));
                 if (Math.random() < (this.climate.heatwaveProbability * 0.5)) this.pendingEvents.push(Events.scheduleHeatwave(this.day));
                 // Water recovery
                recovery = Math.floor(4 + Math.random() * 5); // 4-8%
                break;
        }
        if (recovery > 0) {
             this.waterReserve = Math.min(100, this.waterReserve + recovery);
             const msg = `${this.season} precipitation replenished ${recovery}% water reserves.`;
             this.addEvent(msg); this.logger.log(msg, 1);
        }
    }

    advanceYear() {
        this.year++;
        this.logger.log(`======== STARTING YEAR ${this.year} ========`, 1);

        // Apply interest (using the lower constant rate)
        if (this.balance > 0) {
            const interest = Math.floor(this.balance * this.interestRate); // Lower rate
             if (interest > 0) {
                this.balance += interest;
                const msg = `Earned ${formatCurrency(interest)} in interest.`;
                this.addEvent(msg);
                this.logger.log(msg, 1);
             }
        } else if (this.balance < 0) {
             // Keep higher rate on debt
             const debtInterest = Math.floor(Math.abs(this.balance) * this.interestRate * 2.5); // 2.5x base rate for debt
             this.balance -= debtInterest;
             const msg = `Paid ${formatCurrency(debtInterest)} in interest on debt.`;
             this.addEvent(msg, true);
             this.logger.log(msg, 1);
        }

        // Recalculate farm value (using the updated utils function)
        this.farmValue = calculateFarmValue(this.grid, this.technologies);
        const sustainabilityScore = this.calculateSustainabilityScore();

        this.logger.log(`Year ${this.year} Summary: Balance: ${formatCurrency(this.balance)}, Value: ${formatCurrency(this.farmValue)}, Health: ${this.farmHealth}%, Water: ${this.waterReserve.toFixed(1)}%, SustainScore: ${sustainabilityScore.total}%`, 1);
        this.logger.log(` -- Sustain Breakdown: Soil ${sustainabilityScore.soilScore}%, Diversity ${sustainabilityScore.diversityScore}%, Tech ${sustainabilityScore.techScore}%`, 2);

        // Climate change effect (keep rates for now)
        this.climate.droughtProbability = Math.min(0.5, this.climate.droughtProbability + 0.005);
        this.climate.heatwaveProbability = Math.min(0.6, this.climate.heatwaveProbability + 0.005);
        this.logger.log(`Climate Change Update: Drought Prob ${this.climate.droughtProbability.toFixed(3)}, Heatwave Prob ${this.climate.heatwaveProbability.toFixed(3)}`, 2);

        this.addEvent(`Happy New Year! Completed Year ${this.year - 1}.`);

        // --- ADJUSTED: Sustainability subsidy logic ---
        let bonus = 0;
        let subsidyMsg = "Farm did not qualify for sustainability subsidies.";
        // Using adjusted low threshold, REMOVED guaranteed early bonus
        if (sustainabilityScore.total >= SUSTAINABILITY_THRESHOLD_HIGH) {
             bonus = SUSTAINABILITY_SUBSIDY_BASE_HIGH;
             subsidyMsg = `Received ${formatCurrency(bonus)} high-tier sustainability subsidy!`;
        } else if (sustainabilityScore.total >= SUSTAINABILITY_THRESHOLD_MED) {
             bonus = SUSTAINABILITY_SUBSIDY_BASE_MED;
             subsidyMsg = `Received ${formatCurrency(bonus)} mid-tier sustainability subsidy.`;
        } else if (sustainabilityScore.total >= SUSTAINABILITY_THRESHOLD_LOW) { // Use constant threshold (35)
             bonus = SUSTAINABILITY_SUBSIDY_BASE_LOW;
             subsidyMsg = `Received ${formatCurrency(bonus)} low-tier sustainability subsidy.`;
        }
        // NO guaranteed early bonus anymore

        if (bonus > 0) {
            this.balance += bonus;
        }
        this.addEvent(subsidyMsg);
        this.logger.log(subsidyMsg, 1);

        // Milestone Events (logic remains same)
        // ...

        // Check for test termination condition AFTER year processing
        if (this.testMode && this.autoTerminate && (this.year >= this.testEndYear || this.balance <= 0)) {
             this.logger.log(`Test termination condition met after year processing. Year: ${this.year}, Balance: ${formatCurrency(this.balance)}`, 1);
        }
    }
    
    calculateSustainabilityScore() { // No changes here from previous version
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
                    if (cell.consecutivePlantings > 0) monocropPenalty += cell.consecutivePlantings * 2;
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
             const distributionPenalty = dominantCropPercentage > 0.5 ? (dominantCropPercentage - 0.5) * 100 : 0;
             const monocropScorePenalty = totalCrops > 0 ? Math.min(50, monocropPenalty / totalCrops * 10) : 0;
             cropDiversityScore = Math.round(Math.max(0, rawDiversityScore - distributionPenalty - monocropScorePenalty));
        }
        const sustainableTechs = ['drip_irrigation', 'soil_sensors', 'no_till_farming', 'precision_drones', 'renewable_energy', 'greenhouse', 'drought_resistant', 'ai_irrigation', 'silvopasture'];
        let rawTechScore = 0;
        let techPointsPossible = 0;
         sustainableTechs.forEach(techId => {
            const techDef = this.technologies.find(t => t.id === techId);
            if (!techDef) return;
             let points = 0;
             switch (techId) {
                case 'no_till_farming': case 'silvopasture': points = 20; break;
                case 'drip_irrigation': case 'renewable_energy': case 'precision_drones': case 'ai_irrigation': points = 15; break;
                default: points = 10; break;
             }
             techPointsPossible += points;
             if (this.hasTechnology(techId)) rawTechScore += points;
         });
         techScore = techPointsPossible > 0 ? Math.round((rawTechScore / techPointsPossible) * 100) : 0;
        const totalScore = Math.round((soilScore * 0.4) + (cropDiversityScore * 0.3) + (techScore * 0.3));
        return { total: totalScore, soilScore, diversityScore: cropDiversityScore, techScore };
    }

    processPendingEvents() {
        const activeEventsToday = this.pendingEvents.filter(event => event.day === this.day);
        const remainingEvents = this.pendingEvents.filter(event => event.day !== this.day);
        this.pendingEvents = remainingEvents;

        activeEventsToday.forEach(event => {
             this.logger.log(`-- Applying event: ${event.type} (${event.subType || event.severity || event.policyType || ''})`, 2);
            let result = {};
            let continueEvent = null;
            let logMsg = event.message;
            let logLvl = 3; // Default VERBOSE

            // Determine log level (same logic as before)
            // ...

            let originalBalance = this.balance; // Store balance before applying event

            try {
                 switch (event.type) {
                    // ... (rain, drought, heatwave, frost, market cases remain same logic) ...

                    case 'policy':
                         result = Events.applyPolicyEvent(event, this.balance); // Get base change
                         let finalCostPolicy = 0;
                         if (result.balanceChange < 0 && event.baseCost) { // Check if it's a cost event with baseCost
                             const baseCostPolicy = Math.abs(event.baseCost); // Use baseCost from event creation
                             const minCostPolicy = 500; // Minimum cost
                             const maxCostPolicy = 6000; // Max cost cap increased slightly
                             // Scaling factor based on balance, less aggressive curve
                             const scaleFactorPolicy = Math.min(1.8, Math.max(0.7, 1 + (originalBalance - 150000) / 300000));
                             finalCostPolicy = Math.round(Math.min(maxCostPolicy, Math.max(minCostPolicy, baseCostPolicy * scaleFactorPolicy)));

                             this.balance = originalBalance - finalCostPolicy; // Apply scaled cost
                             logMsg = `${event.message} Final Cost: ${formatCurrency(finalCostPolicy)}`;
                         } else if (result.balanceChange > 0) { // Subsidy
                             this.balance = originalBalance + result.balanceChange; // Apply subsidy
                             logMsg = result.message; // Use message from event creation
                         } else { // Water restriction etc. (no direct balance change)
                              this.balance = result.newBalance; // Should be originalBalance
                              logMsg = result.message;
                         }

                         if (logLvl <= 1 && (result.balanceChange !== 0 || finalCostPolicy > 0)) {
                             logMsg += ` (New Balance: ${formatCurrency(this.balance)})`;
                         }
                        break;

                    case 'technology':
                         result = Events.applyTechnologyEvent(event, this.balance, this.researchedTechs); // Get base change
                         let finalCostTech = 0;
                         if (event.subType === 'technology_setback' && event.amount) {
                              const baseCostTech = event.amount; // Base amount from event creation
                              const minCostTech = 800; // Lower min cost
                              const maxCostTech = 6000; // Lower max cost
                              const scaleFactorTech = Math.min(1.6, Math.max(0.6, 1 + (originalBalance - 180000) / 250000)); // Adjusted scaling
                              finalCostTech = Math.round(Math.min(maxCostTech, Math.max(minCostTech, baseCostTech * scaleFactorTech)));

                              this.balance = originalBalance - finalCostTech; // Apply scaled cost
                              logMsg = `Technology setback! Equipment malfunction repair cost: ${formatCurrency(finalCostTech)}.`;
                         } else if (event.subType === 'innovation_grant' && event.amount) {
                              this.balance = originalBalance + event.amount; // Apply grant
                              logMsg = result.message;
                         } else { // research_breakthrough
                             this.balance = result.newBalance; // No change expected
                             logMsg = result.message;
                         }

                         if (logLvl <= 1) {
                             if(event.subType === 'innovation_grant' && event.amount > 0) logMsg += ` (+${formatCurrency(event.amount)})`;
                             if(event.subType === 'technology_setback') logMsg += ` (New Balance: ${formatCurrency(this.balance)})`;
                         }
                        break;

                    default:
                         this.logger.log(`Unknown event type processed: ${event.type}`, 0);
                         logMsg = null;
                 }

                 // Log the final result message (same logic)
                 // ...

                 // Handle event continuation (same logic)
                 // ...
            } catch (error) {
                 this.logger.log(`ERROR applying event ${event.type}: ${error.message}`, 0);
                 console.error("Error during event processing:", error);
            }
        });
    }

    addEvent(message, isAlert = false) {
        if (this.headless || !this.ui) return;
        const event = { date: `${this.season}, Year ${this.year}`, message, isAlert };
        this.events.unshift(event);
        if (this.events.length > 20) this.events.pop();
        if (this.ui && this.ui.updateEventsList) { // Check if UI method exists
             this.ui.updateEventsList();
        }
    }

    plantCrop(row, col, cropId) {
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) { this.logger.log(`Invalid coordinates for planting: (${row}, ${col})`, 0); return false; }
        const cell = this.grid[row][col];
        const newCrop = getCropById(cropId);
        if (!newCrop || newCrop.id === 'empty') { this.logger.log(`Invalid crop ID for planting: ${cropId}`, 0); return false; }

        // Use plantingCostFactor property (now 0.15)
        const plantingCost = Math.round(newCrop.basePrice * this.plantingCostFactor);

        if (this.balance < plantingCost) {
            const msg = `Cannot afford to plant ${newCrop.name}. Cost: ${formatCurrency(plantingCost)}, Balance: ${formatCurrency(this.balance)}`;
            this.addEvent(msg, true); this.logger.log(msg, 2); return false;
        }
        if (cell.crop.id !== 'empty') {
            const msg = `Cannot plant ${newCrop.name}, plot (${row}, ${col}) is already occupied by ${cell.crop.name}.`;
            if (!this.testMode) this.addEvent(msg, true); this.logger.log(msg, this.testMode ? 2 : 1); return false;
        }

        this.balance -= plantingCost;
        if (cell.plant(newCrop)) { // Pass full crop object to cell.plant
             const msg = `Planted ${newCrop.name} at (${row}, ${col}). Cost: ${formatCurrency(plantingCost)}`;
             this.addEvent(msg); this.logger.log(msg, 2);
             if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
             return true;
        } else {
             // Refund if planting failed internally in cell? Should not happen with checks.
             this.balance += plantingCost;
             this.logger.log(`Internal cell planting failed for ${newCrop.name} at (${row}, ${col})`, 0);
             return false;
        }
    }
    
    irrigateCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        const cost = this.irrigationCost; // Use property (constant)

        if (cell.crop.id === 'empty') { this.addEvent('Cannot irrigate empty plot.', true); this.logger.log(`Attempted to irrigate empty plot (${row}, ${col})`, 2); return false; }
        if (cell.irrigated) { this.logger.log(`Plot (${row}, ${col}) already irrigated today.`, 3); return false; }

        if (this.balance < cost) {
             this.addEvent(`Cannot afford irrigation (${formatCurrency(cost)}).`, true);
             this.logger.log(`Cannot afford irrigation (${formatCurrency(cost)}). Balance: ${formatCurrency(this.balance)}`, 2);
             return false;
        }

        this.balance -= cost;
        const waterEfficiency = this.getTechEffectValue('waterEfficiency', 1.0); // Apply tech effect here? Or cell does? Cell should handle internal logic.
        cell.irrigate(waterEfficiency); // Pass efficiency if cell uses it
        const msg = `Irrigated plot at (${row}, ${col}). Cost: ${formatCurrency(cost)}`;
        this.addEvent(msg); this.logger.log(msg, 2);
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    fertilizeCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        const cost = this.fertilizeCost; // Use property (constant)

        if (cell.crop.id === 'empty') { this.addEvent('Cannot fertilize empty plot.', true); this.logger.log(`Attempted to fertilize empty plot (${row}, ${col})`, 2); return false; }
        if (cell.fertilized) { this.logger.log(`Plot (${row}, ${col}) already fertilized for this cycle.`, 3); return false; }

        if (this.balance < cost) {
            this.addEvent(`Cannot afford fertilizer (${formatCurrency(cost)}).`, true);
            this.logger.log(`Cannot afford fertilizer (${formatCurrency(cost)}). Balance: ${formatCurrency(this.balance)}`, 2);
            return false;
        }

        this.balance -= cost;
        const fertilizerEfficiency = this.getTechEffectValue('fertilizerEfficiency', 1.0); // Get tech effect
        cell.fertilize(fertilizerEfficiency); // Pass efficiency if cell uses it
        const msg = `Fertilized plot at (${row}, ${col}). Cost: ${formatCurrency(cost)}`;
        this.addEvent(msg); this.logger.log(msg, 2);
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    harvestCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        if (cell.crop.id === 'empty') { this.logger.log(`Attempted harvest on empty plot (${row}, ${col})`, 3); return false; }
        if (!cell.harvestReady) { this.logger.log(`Attempted harvest on not-ready plot (${row}, ${col}), Crop: ${cell.crop.id}, Progress: ${cell.growthProgress}%`, 3); return false; }

        const marketPriceFactor = this.marketPrices[cell.crop.id] || 1.0;
        const result = cell.harvest(this.waterReserve, marketPriceFactor); // Cell calculates yield and value

        if (result.value === undefined || result.yieldPercentage === undefined) { this.logger.log(`ERROR: Harvest calculation failed for plot (${row}, ${col})`, 0); return false; }

        if (result.value > 0) {
             this.balance += result.value;
             const msg = `Harvested ${result.cropName} at (${row}, ${col}) for ${formatCurrency(result.value)}. Yield: ${result.yieldPercentage}%`;
             this.addEvent(msg); this.logger.log(msg, 2);
        } else {
             this.logger.log(`Harvested ${result.cropName} at (${row}, ${col}) yielded $0 (Yield: ${result.yieldPercentage}%). Plot reset.`, 2);
        }
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    researchTechnology(techId) {
        const tech = this.technologies.find(t => t.id === techId);
        if (!tech) { this.logger.log(`Technology ID not found: ${techId}`, 0); return false; }
        if (tech.researched) { this.logger.log(`${tech.name} already researched.`, 1); return false; }
        if (!checkTechPrerequisites(tech, this.researchedTechs)) {
            const msg = `Prerequisites not met for ${tech.name}.`; this.addEvent(msg, true); this.logger.log(msg, 1); return false;
        }

        // Check for research breakthrough discount
        const techDiscountEvent = this.pendingEvents.find(e => e.type === 'technology' && e.subType === 'research_breakthrough' && e.day >= this.day);
        let currentCost = tech.cost;
        if (techDiscountEvent) {
             currentCost = Math.round(tech.cost * (1 - techDiscountEvent.discount));
             this.logger.log(`Applying research breakthrough discount! ${tech.name} cost reduced to ${formatCurrency(currentCost)}`, 1);
        }


        if (this.balance < currentCost) {
            const msg = `Cannot afford ${tech.name} (${formatCurrency(currentCost)}). Balance: ${formatCurrency(this.balance)}`;
            this.addEvent(msg, true); this.logger.log(msg, 2); return false;
        }
        this.balance -= currentCost;
        tech.researched = true;
        this.researchedTechs.push(tech.id);
        const msg = `Researched ${tech.name} for ${formatCurrency(currentCost)}`;
        this.addEvent(msg); this.logger.log(msg, 1);
        if (this.ui) { this.ui.updateHUD(); if (this.ui.isResearchModalOpen) this.ui.showResearchModal(); }

        // Recalculate farm value immediately after researching tech
        this.farmValue = calculateFarmValue(this.grid, this.technologies);

        return true;
    }

    updateMarketPrices() { // Initialize with less volatility?
        crops.forEach(crop => {
             if (crop.id !== 'empty') {
                 // Start prices closer to 1.0 factor
                 this.marketPrices[crop.id] = 0.9 + Math.random() * 0.2;
             }
        });
         this.logger.log("Initial market prices set.", 2);
    }

    fluctuateMarketPrices() { // Keep fluctuations modest unless event-driven
         let changes = [];
        crops.forEach(crop => {
            if (crop.id !== 'empty') {
                // Smaller random fluctuations each season
                const change = 0.95 + Math.random() * 0.1; // +/- 5% random change
                const oldPrice = this.marketPrices[crop.id];
                this.marketPrices[crop.id] = Math.max(0.5, Math.min(2.0, oldPrice * change)); // Keep bounds
                 if (Math.abs(this.marketPrices[crop.id] - oldPrice) > 0.01) {
                     changes.push(`${crop.id}: ${Math.round(oldPrice*100)}%->${Math.round(this.marketPrices[crop.id]*100)}%`);
                 }
            }
        });
         if(changes.length > 0) this.logger.log(`Market prices fluctuated: ${changes.join(', ')}`, 2);
        if(this.ui && this.ui.isMarketModalOpen) this.ui.showMarketModal();
    }

    togglePause() {
        if (this.headless) return;
        this.paused = !this.paused;
        this.logger.log(`Game ${this.paused ? 'Paused' : 'Resumed'}`, 1);
        if (this.ui) document.getElementById('pause-btn').textContent = this.paused ? 'Resume' : 'Pause';
        if (!this.paused && !this.animationFrameId) {
            this.lastUpdateTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.gameLoop();
        }
    }

    hasTechnology(techId) {
        return this.researchedTechs.includes(techId);
    }

    getTechEffectValue(effectName, defaultValue = 1.0) {
        // Pass the full technology array definition, not just researched IDs
        return getTechEffectValue(effectName, this.researchedTechs, this.technologies, defaultValue);
    }


    getTechnologyCost(techId) {
        const tech = this.technologies.find(t => t.id === techId);
        return tech ? tech.cost : Infinity;
    }

    terminateTest() { // Log final state for headless tests
        this.logger.log(`==== TEST ${this.testStrategyId} FINAL RESULT ====`, 1);
        this.logger.log(`Ending Year: ${this.year}, Day: ${this.day}`, 1);
        this.logger.log(`Final Balance: ${formatCurrency(this.balance)}`, 1); // Use formatCurrency
        this.logger.log(`Final Farm Value: ${formatCurrency(this.farmValue)}`, 1); // Use formatCurrency
        this.logger.log(`Final Farm Health: ${this.farmHealth}%`, 1);
        this.logger.log(`Final Water Reserve: ${this.waterReserve.toFixed(2)}%`, 1);
        const finalSustainability = this.calculateSustainabilityScore();
        this.logger.log(`Final Sustainability: ${finalSustainability.total}% (S:${finalSustainability.soilScore} D:${finalSustainability.diversityScore} T:${finalSustainability.techScore})`, 1);
        this.logger.log(`Researched Techs: ${this.researchedTechs.join(', ') || 'None'}`, 1);
        this.logger.log(`========================================`, 1);
        this.stop(); // Stop any internal loops if applicable
        // Trigger next test via callback set by harness
        if (this.nextTestCallback) {
            setTimeout(() => {
                 if (this.nextTestCallback) { try { this.nextTestCallback(); } catch (error) { console.error("Error executing nextTestCallback:", error); } }
            }, 100); // Small delay
        }
    }
} // End of CaliforniaClimateFarmer class
