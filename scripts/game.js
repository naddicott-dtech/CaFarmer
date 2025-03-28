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

// --- Constants ---
// Suggestion A: Reduced passive income (already done)
const ANNUAL_INTEREST_RATE = 0.015; // 1.5%
const SUSTAINABILITY_THRESHOLD_LOW = 40;
const SUSTAINABILITY_THRESHOLD_MED = 60;
const SUSTAINABILITY_THRESHOLD_HIGH = 75;
const SUSTAINABILITY_SUBSIDY_BASE = 100;
const SUSTAINABILITY_SUBSIDY_FACTOR = 150;

// Suggestion B: Early Economics
const INITIAL_BALANCE = 200000; // Increased starting balance
const PLANTING_COST_FACTOR = 0.2; // Reduced planting cost factor (was 0.4)
const DAILY_OVERHEAD_COST = 5; // Small fixed daily cost for labor/upkeep proxy

const IRRIGATION_COST = 200;
const FERTILIZE_COST = 300;
// --- End Constants ---


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
        this.farmValue = 250000; // Initial placeholder, recalculated
        this.farmHealth = 85;
        this.waterReserve = 75;
        this.paused = false;
        this.speed = 5;
        this.currentOverlay = 'crop';

        // Game Parameters
        this.interestRate = ANNUAL_INTEREST_RATE;
        this.plantingCostFactor = PLANTING_COST_FACTOR;
        this.irrigationCost = IRRIGATION_COST;
        this.fertilizeCost = FERTILIZE_COST;
        this.dailyOverhead = DAILY_OVERHEAD_COST; // Store overhead

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
        this.farmValue = calculateFarmValue(this.grid, this.technologies); // Initial calculation based on grid state

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
        // *** ADDED: Deduct Daily Overhead Cost ***
        this.balance -= this.dailyOverhead;

        this.day++;
        this.seasonDay++;
        this.updateFarmCells();

        if (this.seasonDay > 90) {
            this.seasonDay = 1;
            this.advanceSeason();
        }
        if (this.day > 360) {
            this.day = 1;
            this.advanceYear();
        }

        this.processPendingEvents();
        this.farmHealth = calculateFarmHealth(this.grid, this.waterReserve);

        if (this.day % 5 === 0 && Math.random() < 0.2) {
             this.scheduleRandomEvent();
        }

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
            climate: this.climate, day: this.day, season: this.season,
            waterReserve: this.waterReserve, farmHealth: this.farmHealth,
            balance: this.balance, researchedTechs: this.researchedTechs
        };
        const newEvent = Events.generateRandomEvent(farmState);
        if (newEvent) {
            const isDuplicate = this.pendingEvents.some(event =>
                event.type === newEvent.type && Math.abs(event.day - newEvent.day) < 5);
            if (!isDuplicate) {
                if(newEvent.day <= this.day) newEvent.day = this.day + Math.floor(Math.random() * 5) + 1;
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
                if (Math.random() < this.climate.droughtProbability) this.pendingEvents.push(Events.scheduleDrought(this.day, this.climate.droughtProbability));
                if (Math.random() < this.climate.heatwaveProbability) this.pendingEvents.push(Events.scheduleHeatwave(this.day));
                break;
            case 'Winter':
                if (Math.random() < 0.3) this.pendingEvents.push(Events.scheduleFrost(this.day));
                // *** Keep slightly reduced water recovery ***
                recovery = Math.floor(4 + Math.random() * 5); // 4-8%
                break;
            case 'Spring':
                 if (Math.random() < 0.4) this.pendingEvents.push(Events.scheduleRain(this.day));
                // *** Keep slightly reduced water recovery ***
                recovery = Math.floor(8 + Math.random() * 11); // 8-18%
                break;
            case 'Fall':
                 if (Math.random() < 0.3) this.pendingEvents.push(Events.scheduleRain(this.day));
                 if (Math.random() < (this.climate.heatwaveProbability * 0.5)) this.pendingEvents.push(Events.scheduleHeatwave(this.day));
                // *** Keep slightly reduced water recovery ***
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

        // Apply interest
        if (this.balance > 0) {
            // Use the interestRate property defined in the constructor
            const interest = Math.floor(this.balance * this.interestRate);
             if (interest > 0) {
                this.balance += interest;
                const msg = `Earned $${interest.toLocaleString()} in interest.`;
                this.addEvent(msg);
                this.logger.log(msg, 1);
             }
        }

        // Recalculate farm value (using original logic for bug-fix only pass)
        // Ensure calculateFarmValue uses the older logic for now
        this.farmValue = calculateFarmValue(this.grid, this.technologies, this.balance); // Pass balance if original calc used it
        const sustainabilityScore = this.calculateSustainabilityScore();

        this.logger.log(`Year ${this.year} Summary: Balance: $${this.balance.toLocaleString()}, Value: $${this.farmValue.toLocaleString()}, Health: ${this.farmHealth}%, Water: ${this.waterReserve}%, SustainScore: ${sustainabilityScore.total}%`, 1);
        this.logger.log(` -- Sustain Breakdown: Soil ${sustainabilityScore.soilScore}%, Diversity ${sustainabilityScore.diversityScore}%, Tech ${sustainabilityScore.techScore}%`, 2);

        // Climate change effect - apply annually
        this.climate.droughtProbability = Math.min(0.5, this.climate.droughtProbability + 0.005); // Cap probability
        this.climate.heatwaveProbability = Math.min(0.6, this.climate.heatwaveProbability + 0.005);
        this.logger.log(`Climate Change Update: Drought Prob ${this.climate.droughtProbability.toFixed(3)}, Heatwave Prob ${this.climate.heatwaveProbability.toFixed(3)}`, 2);

        this.addEvent(`Happy New Year! Completed Year ${this.year - 1}.`);

        // Sustainability subsidy (Using original tiered logic for bug-fix pass)
        let bonus = 0;
        let subsidyMsg = "Farm did not qualify for sustainability subsidies.";
         // Revert to original subsidy logic for bug-fix pass if different
        // Example using original tiers (adjust if needed):
        // if (sustainabilityScore.total >= 70) bonus = Math.round(10000 * (sustainabilityScore.total / 100));
        // else if (sustainabilityScore.total >= 50) bonus = Math.round(5000 * (sustainabilityScore.total / 100));
        // else if (sustainabilityScore.total >= 30) bonus = Math.round(2000 * (sustainabilityScore.total / 100));

        // Using the logic from Response #16's game.js (tiers)
        if (sustainabilityScore.total >= 70) { bonus = Math.round(10000 * (sustainabilityScore.total / 100)); subsidyMsg = `Received $${bonus.toLocaleString()} high-tier sustainability subsidy!`; }
        else if (sustainabilityScore.total >= 50) { bonus = Math.round(5000 * (sustainabilityScore.total / 100)); subsidyMsg = `Received $${bonus.toLocaleString()} mid-tier sustainability subsidy.`; }
        else if (sustainabilityScore.total >= 30) { bonus = Math.round(2000 * (sustainabilityScore.total / 100)); subsidyMsg = `Received $${bonus.toLocaleString()} low-tier sustainability subsidy.`; }


        if (bonus > 0) {
            this.balance += bonus;
        }
        this.addEvent(subsidyMsg);
        this.logger.log(subsidyMsg, 1);

        // Milestone Events
        if (this.year % 10 === 0) {
            this.addEvent(`Major milestone: ${this.year} years of operation!`);
            if (Math.random() < 0.7) {
                const policyEvent = Events.generatePolicyEvent(this.day, this.farmHealth);

                // *** ADDED NULL CHECK HERE ***
                if (policyEvent) {
                    // Ensure event day is in the future
                    if (policyEvent.day <= this.day) {
                        policyEvent.day = this.day + 1;
                    }
                    this.pendingEvents.push(policyEvent);
                    this.addEvent(`New climate policy announced.`);
                    this.logger.log(`Scheduled policy event for 10-year milestone: ${policyEvent.policyType || 'Unknown'}`, 1);
                } else {
                    // Log that no policy event was generated for the milestone (optional)
                    this.logger.log(`No specific policy event generated for 10-year milestone.`, 2);
                }
            }
        }

        // Check for test termination condition AFTER year processing
        if (this.testMode && this.autoTerminate && (this.year >= this.testEndYear || this.balance <= 0)) {
             this.logger.log(`Test termination condition met after year processing. Year: ${this.year}, Balance: ${this.balance}`, 1);
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

    // *** UPDATED processPendingEvents function ***
    processPendingEvents() {
        const activeEventsToday = this.pendingEvents.filter(event => event.day === this.day);
        const remainingEvents = this.pendingEvents.filter(event => event.day !== this.day);
        this.pendingEvents = remainingEvents;

        activeEventsToday.forEach(event => {
             this.logger.log(`-- Applying event: ${event.type} (${event.subType || event.severity || ''})`, 2); // DBG
            let result = {};
            let continueEvent = null;
            let logMsg = event.message;
            let logLvl = 3; // *** Default result log level to VERBOSE ***

            // *** Promote specific important events/results back to INFO (1) or DEBUG (2) ***
            if (event.isAlert) logLvl = 1; // Alerts are INFO
            if (event.type === 'frost') logLvl = 1; // Frost is INFO
            if (event.type === 'policy' && Math.abs(result.balanceChange || 0) > 1000) logLvl = 1;
            if (event.type === 'technology') {
                if (event.subType === 'innovation_grant' && event.amount > 1000) logLvl = 1;
                if (event.subType === 'technology_setback') logLvl = 1;
                if (event.subType === 'research_breakthrough') logLvl = 1;
            }
            if (event.type === 'drought' || event.type === 'heatwave') {
                 // Only log start/end at INFO, or if severe
                 if (event.severity === 'severe') logLvl = 1;
                 // Logic below handles start/end logging
            }
             if (event.type === 'market' && (event.direction === 'opportunity' || Math.abs(event.changePercent || 0) > 25)) {
                 logLvl = 1; // Log significant market shifts at INFO
             }


            try {
                 switch (event.type) {
                    case 'rain': // Keep rain results less prominent unless heavy?
                        result = Events.applyRainEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                        this.waterReserve = result.waterReserve;
                        logMsg = result.message;
                        if (event.severity === 'heavy') logLvl = 2; // Log heavy rain at DEBUG
                        else logLvl = 3; // Light/moderate rain at VERBOSE
                        break;
                    case 'drought':
                         result = Events.applyDroughtEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                         if (!result.skipped) {
                             this.waterReserve = result.waterReserve;
                             logMsg = result.message;
                             if (result.continueEvent) {
                                 continueEvent = { ...event, day: this.day + 1, duration: result.nextDuration, message: result.message };
                                 // Log first day of drought at determined level (INFO if severe)
                                 if (event.duration === result.nextDuration + 1) {
                                      this.logger.log(`Event Started: ${logMsg}`, logLvl);
                                 } else { // Log continuation at VERBOSE
                                      this.logger.log(`Event Continues: ${logMsg}`, 3);
                                 }
                                 logMsg = null; // Prevent double logging below
                             } else {
                                 this.addEvent(`The drought has ended.`); this.logger.log('Drought event ended.', 1); // INFO
                                 logMsg = null; // End already logged
                             }
                         } else { logMsg = null; }
                        break;
                    case 'heatwave':
                        result = Events.applyHeatwaveEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                         if (!result.skipped) {
                            this.waterReserve = result.waterReserve;
                            logMsg = result.message;
                             if (result.continueEvent) {
                                continueEvent = { ...event, day: this.day + 1, duration: result.nextDuration, message: result.message };
                                // Log first day at INFO
                                if (event.duration === result.nextDuration + 1) {
                                     this.logger.log(`Event Started: ${logMsg}`, 1);
                                } else { // Log continuation at VERBOSE
                                     this.logger.log(`Event Continues: ${logMsg}`, 3);
                                }
                                logMsg = null;
                             } else {
                                 this.addEvent(`The heatwave has ended.`); this.logger.log('Heatwave event ended.', 1); // INFO
                                 logMsg = null;
                             }
                         } else { logMsg = null; }
                        break;
                    // Cases for frost, market, policy, technology remain same logic as before,
                    // but the logLvl calculated at the start determines final output level
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
                         // Add balance change info only if logging at INFO level
                         if (logLvl === 1 && Math.abs(result.balanceChange) > 0) {
                             logMsg += ` (Balance change: $${result.balanceChange.toLocaleString()})`;
                         }
                        break;
                    case 'technology':
                         result = Events.applyTechnologyEvent(event, this.balance, this.researchedTechs);
                        this.balance = result.newBalance;
                         logMsg = result.message;
                         // Add amount info only if logging at INFO level
                         if (logLvl === 1) {
                             if(event.subType === 'innovation_grant' && event.amount > 0) logMsg += ` (+$${event.amount.toLocaleString()})`;
                             if(event.subType === 'technology_setback') logMsg += ` (-$${event.amount.toLocaleString()})`;
                         }
                        break;
                    default:
                         this.logger.log(`Unknown event type processed: ${event.type}`, 0);
                         logMsg = null;
                 }

                 // Log the final result message ONLY if it wasn't handled by start/continue/end logic
                 if (logMsg) {
                     this.addEvent(logMsg, event.isAlert);
                     this.logger.log(`Event Result: ${logMsg}`, logLvl);
                 }

                 if (continueEvent) {
                     this.pendingEvents.push(continueEvent);
                     // Log continuation scheduling at DEBUG
                     this.logger.log(`-- Event ${event.type} continues tomorrow (Day ${continueEvent.day}), duration left: ${continueEvent.duration}`, 2);
                 }
            } catch (error) {
                 this.logger.log(`ERROR applying event ${event.type}: ${error.message}`, 0);
                 console.error("Error during event processing:", error);
            }
        });
    }

    addEvent(message, isAlert = false) { // No changes needed here
        if (this.headless || !this.ui) return;
        const event = { date: `${this.season}, Year ${this.year}`, message, isAlert };
        this.events.unshift(event);
        if (this.events.length > 20) this.events.pop();
        this.ui.updateEventsList();
    }

    plantCrop(row, col, cropId) { // Log level change already applied
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) { this.logger.log(`Invalid coordinates for planting: (${row}, ${col})`, 0); return false; }
        const cell = this.grid[row][col];
        const newCrop = getCropById(cropId);
        if (!newCrop || newCrop.id === 'empty') { this.logger.log(`Invalid crop ID for planting: ${cropId}`, 0); return false; }
        const plantingCost = Math.round(newCrop.basePrice * this.plantingCostFactor);
        if (this.balance < plantingCost) {
            const msg = `Cannot afford to plant ${newCrop.name}. Cost: $${plantingCost.toLocaleString()}, Balance: $${this.balance.toLocaleString()}`;
            this.addEvent(msg, true); this.logger.log(msg, 2); return false; // DBG
        }
        if (cell.crop.id !== 'empty') {
            const msg = `Cannot plant ${newCrop.name}, plot (${row}, ${col}) is already occupied by ${cell.crop.name}.`;
            if (!this.testMode) this.addEvent(msg, true); this.logger.log(msg, this.testMode ? 2 : 1); return false;
        }
        this.balance -= plantingCost;
        cell.plant(newCrop);
        const msg = `Planted ${newCrop.name} at (${row}, ${col}). Cost: $${plantingCost.toLocaleString()}`;
        this.addEvent(msg); this.logger.log(msg, 2); // DBG
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    irrigateCell(row, col) { // Log level change already applied
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        const cost = this.irrigationCost;
        if (cell.crop.id === 'empty') { this.addEvent('Cannot irrigate empty plot.', true); this.logger.log(`Attempted to irrigate empty plot (${row}, ${col})`, 2); return false; }
        if (cell.irrigated) { this.logger.log(`Plot (${row}, ${col}) already irrigated today.`, 3); return false; }
        if (this.balance < cost) {
            this.addEvent(`Cannot afford irrigation ($${cost}).`, true); this.logger.log(`Cannot afford irrigation ($${cost}). Balance: $${this.balance}`, 2); return false; // DBG
        }
        this.balance -= cost;
        const waterEfficiency = this.getTechEffectValue('waterEfficiency', 1.0);
        cell.irrigate(waterEfficiency);
        const msg = `Irrigated plot at (${row}, ${col}). Cost: $${cost.toLocaleString()}`;
        this.addEvent(msg); this.logger.log(msg, 2); // DBG
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    fertilizeCell(row, col) { // Log level change already applied
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        const cost = this.fertilizeCost;
        if (cell.crop.id === 'empty') { this.addEvent('Cannot fertilize empty plot.', true); this.logger.log(`Attempted to fertilize empty plot (${row}, ${col})`, 2); return false; }
        if (cell.fertilized) { this.logger.log(`Plot (${row}, ${col}) already fertilized for this cycle.`, 3); return false; }
        if (this.balance < cost) {
            this.addEvent(`Cannot afford fertilizer ($${cost}).`, true); this.logger.log(`Cannot afford fertilizer ($${cost}). Balance: $${this.balance}`, 2); return false; // DBG
        }
        this.balance -= cost;
        const fertilizerEfficiency = this.getTechEffectValue('fertilizerEfficiency', 1.0);
        cell.fertilize(fertilizerEfficiency);
        const msg = `Fertilized plot at (${row}, ${col}). Cost: $${cost.toLocaleString()}`;
        this.addEvent(msg); this.logger.log(msg, 2); // DBG
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    harvestCell(row, col) { // Log level change already applied
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        if (cell.crop.id === 'empty') { this.logger.log(`Attempted harvest on empty plot (${row}, ${col})`, 3); return false; }
        if (!cell.harvestReady) { this.logger.log(`Attempted harvest on not-ready plot (${row}, ${col}), Crop: ${cell.crop.id}, Progress: ${cell.growthProgress}%`, 3); return false; }
        const marketPriceFactor = this.marketPrices[cell.crop.id] || 1.0;
        const result = cell.harvest(this.waterReserve, marketPriceFactor);
        if (result.value === undefined || result.yieldPercentage === undefined) { this.logger.log(`ERROR: Harvest calculation failed for plot (${row}, ${col})`, 0); return false; }
        if (result.value <= 0 && result.yieldPercentage <= 0) {
             this.logger.log(`Harvested ${result.cropName} at (${row}, ${col}) yielded $0 (Yield: 0%). Plot reset.`, 2); // DBG
        } else {
             this.balance += result.value;
             const msg = `Harvested ${result.cropName} at (${row}, ${col}) for $${result.value.toLocaleString()}. Yield: ${result.yieldPercentage}%`;
             this.addEvent(msg); this.logger.log(msg, 2); // DBG
        }
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    researchTechnology(techId) { // Log level change already applied
        const tech = this.technologies.find(t => t.id === techId);
        if (!tech) { this.logger.log(`Technology ID not found: ${techId}`, 0); return false; }
        if (tech.researched) { this.logger.log(`${tech.name} already researched.`, 1); return false; }
        if (!checkTechPrerequisites(tech, this.researchedTechs)) {
            const msg = `Prerequisites not met for ${tech.name}.`; this.addEvent(msg, true); this.logger.log(msg, 1); return false;
        }
        if (this.balance < tech.cost) {
            const msg = `Cannot afford ${tech.name} ($${tech.cost.toLocaleString()}). Balance: $${this.balance.toLocaleString()}`;
            this.addEvent(msg, true); this.logger.log(msg, 2); return false; // DBG
        }
        this.balance -= tech.cost;
        tech.researched = true;
        this.researchedTechs.push(tech.id);
        const msg = `Researched ${tech.name} for $${tech.cost.toLocaleString()}`;
        this.addEvent(msg); this.logger.log(msg, 1); // INF
        if (this.ui) { this.ui.updateHUD(); if (this.ui.isResearchModalOpen) this.ui.showResearchModal(); }
        return true;
    }

    updateMarketPrices() { // No changes needed
        crops.forEach(crop => { if (crop.id !== 'empty') this.marketPrices[crop.id] = 0.8 + Math.random() * 0.4; });
         this.logger.log("Initial market prices set.", 2);
    }

    fluctuateMarketPrices() { // No changes needed
         let changes = [];
        crops.forEach(crop => {
            if (crop.id !== 'empty') {
                const change = 0.9 + Math.random() * 0.2; const oldPrice = this.marketPrices[crop.id];
                this.marketPrices[crop.id] = Math.max(0.5, Math.min(2.0, oldPrice * change));
                 if (Math.abs(this.marketPrices[crop.id] - oldPrice) > 0.01) changes.push(`${crop.id}: ${Math.round(oldPrice*100)}%->${Math.round(this.marketPrices[crop.id]*100)}%`);
            }
        });
         if(changes.length > 0) this.logger.log(`Market prices fluctuated: ${changes.join(', ')}`, 2);
        if(this.ui && this.ui.isMarketModalOpen) this.ui.showMarketModal();
    }

    togglePause() { // No changes needed
        if (this.headless) return;
        this.paused = !this.paused;
        this.logger.log(`Game ${this.paused ? 'Paused' : 'Resumed'}`, 1);
        if (this.ui) document.getElementById('pause-btn').textContent = this.paused ? 'Resume' : 'Pause';
        if (!this.paused && !this.animationFrameId) {
            this.lastUpdateTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.gameLoop();
        }
    }

    hasTechnology(techId) { // No changes needed
        return this.researchedTechs.includes(techId);
    }

    getTechEffectValue(effectName, defaultValue = 1.0) { // No changes needed
        return getTechEffectValue(effectName, this.researchedTechs, defaultValue);
    }

    getTechnologyCost(techId) { // No changes needed
        const tech = this.technologies.find(t => t.id === techId);
        return tech ? tech.cost : Infinity;
    }

    terminateTest() { // No changes needed
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
        this.stop();
        if (this.nextTestCallback) {
            setTimeout(() => {
                 if (this.nextTestCallback) { try { this.nextTestCallback(); } catch (error) { console.error("Error executing nextTestCallback:", error); } }
            }, 100);
        }
    }
} // End of CaliforniaClimateFarmer class
