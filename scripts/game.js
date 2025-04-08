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
const ANNUAL_INTEREST_RATE = 0.01;
const SUSTAINABILITY_THRESHOLD_LOW = 35;
const SUSTAINABILITY_THRESHOLD_MED = 60;
const SUSTAINABILITY_THRESHOLD_HIGH = 75;
const SUSTAINABILITY_SUBSIDY_BASE_LOW = 3000;
const SUSTAINABILITY_SUBSIDY_BASE_MED = 6000;
const SUSTAINABILITY_SUBSIDY_BASE_HIGH = 12000;

const INITIAL_BALANCE = 235000;
const PLANTING_COST_FACTOR = 0.10;
const DAILY_OVERHEAD_COST = 3;

const IRRIGATION_COST = 35;
const FERTILIZE_COST = 50;
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
        this.balance = INITIAL_BALANCE;
        this.farmValue = 50000; // Initial placeholder, recalculated immediately
        this.farmHealth = 85; // Starting health
        this.waterReserve = 75;
        this.paused = false;
        this.speed = 5;
        this.currentOverlay = 'crop';

        // Game Parameters
        this.interestRate = ANNUAL_INTEREST_RATE;
        this.plantingCostFactor = PLANTING_COST_FACTOR;
        this.irrigationCost = IRRIGATION_COST;
        this.fertilizeCost = FERTILIZE_COST;
        this.dailyOverhead = DAILY_OVERHEAD_COST;

        // Debug logging
        const loggerVerbosity = (this.headless && this.debugMode) ? 2 : (this.debugMode ? 2 : 1);
        this.logger = new Logger(200, loggerVerbosity, this.headless);

        this.grid = [];
        this.technologies = createTechnologyTree();
        this.researchedTechs = [];
        this.events = [];
        this.pendingEvents = [];
        this.marketPrices = {};

        // Climate Parameters
        this.climate = {
            avgTemp: 70,
            rainfall: 20,
            droughtProbability: 0.05,
            floodProbability: 0.03,
            heatwaveProbability: 0.08
        };

        // --- PHASE 1: Event Cooldown Tracking ---
        this.lastDroughtEndDay = -Infinity;
        this.lastHeatwaveEndDay = -Infinity;
        this.lastFrostDay = -Infinity;
        // -----------------------------------------

        this.initializeGrid();
        this.updateMarketPrices();
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
        this.balance -= this.dailyOverhead;
        if (this.balance < -5000 && !this.testMode) {
             this.addEvent("Warning: Farm operating at a significant loss!", true);
        }

        this.day++;
        this.seasonDay++;
        this.updateFarmCells();

        if (this.seasonDay > 90) {
            this.seasonDay = 1;
            this.advanceSeason();
        }
        if (this.day > DAYS_IN_YEAR) {
            this.day = 1;
            this.advanceYear();
        }

        this.processPendingEvents();
        this.farmHealth = calculateFarmHealth(this.grid, this.waterReserve);

        // Reduced base event chance slightly
        if (this.day % 4 === 0 && Math.random() < 0.20) {
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
         // Pass event cooldown state into scheduling
         const farmState = {
            climate: this.climate, day: this.day, season: this.season, year: this.year,
            waterReserve: this.waterReserve, farmHealth: this.farmHealth,
            balance: this.balance, researchedTechs: this.researchedTechs,
            // --- PHASE 1: Pass cooldown trackers ---
            lastDroughtEndDay: this.lastDroughtEndDay,
            lastHeatwaveEndDay: this.lastHeatwaveEndDay,
            lastFrostDay: this.lastFrostDay,
            logger: this.logger // Pass logger for potential debug messages in events.js
        };
        const newEvent = Events.generateRandomEvent(farmState);
        if (newEvent) {
            const isDuplicate = this.pendingEvents.some(event =>
                event.type === newEvent.type && Math.abs(event.day - newEvent.day) < 5);
            if (!isDuplicate) {
                if(newEvent.day <= this.day) newEvent.day = this.day + Math.floor(Math.random() * 5) + 1;

                const maxEventDay = (this.year * DAYS_IN_YEAR) + DAYS_IN_YEAR;
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
        // Pass farmState for seasonal event scheduling checks
        const farmState = {
            climate: this.climate, day: this.day, season: this.season, year: this.year,
            lastDroughtEndDay: this.lastDroughtEndDay, lastHeatwaveEndDay: this.lastHeatwaveEndDay,
            lastFrostDay: this.lastFrostDay, logger: this.logger
        };

        switch (this.season) {
            case 'Summer':
                if (Math.random() < this.climate.droughtProbability) {
                    const droughtEvent = Events.scheduleDrought(this.day, this.climate.droughtProbability, farmState);
                    if (droughtEvent) this.pendingEvents.push(droughtEvent);
                }
                if (Math.random() < this.climate.heatwaveProbability) {
                     const heatwaveEvent = Events.scheduleHeatwave(this.day, farmState);
                     if (heatwaveEvent) this.pendingEvents.push(heatwaveEvent);
                }
                break;
            case 'Winter':
                 if (Math.random() < 0.3) {
                      const frostEvent = Events.scheduleFrost(this.day, farmState);
                      if (frostEvent) this.pendingEvents.push(frostEvent);
                 }
                 recovery = Math.floor(4 + Math.random() * 5);
                 break;
            case 'Spring':
                 if (Math.random() < 0.4) this.pendingEvents.push(Events.scheduleRain(this.day));
                 recovery = Math.floor(8 + Math.random() * 11);
                 break;
            case 'Fall':
                 if (Math.random() < 0.3) this.pendingEvents.push(Events.scheduleRain(this.day));
                 if (Math.random() < (this.climate.heatwaveProbability * 0.5)) {
                     const heatwaveEvent = Events.scheduleHeatwave(this.day, farmState);
                     if (heatwaveEvent) this.pendingEvents.push(heatwaveEvent);
                 }
                 recovery = Math.floor(4 + Math.random() * 5);
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

        if (this.balance > 0) {
            const interest = Math.floor(this.balance * this.interestRate);
             if (interest > 0) {
                this.balance += interest;
                const msg = `Earned ${formatCurrency(interest)} in interest.`;
                this.addEvent(msg);
                this.logger.log(msg, 1);
             }
        } else if (this.balance < 0) {
             const debtInterest = Math.floor(Math.abs(this.balance) * this.interestRate * 2.5);
             this.balance -= debtInterest;
             const msg = `Paid ${formatCurrency(debtInterest)} in interest on debt.`;
             this.addEvent(msg, true);
             this.logger.log(msg, 1);
        }

        this.farmValue = calculateFarmValue(this.grid, this.technologies);
        const sustainabilityScore = this.calculateSustainabilityScore();

        this.logger.log(`Year ${this.year} Summary: Balance: ${formatCurrency(this.balance)}, Value: ${formatCurrency(this.farmValue)}, Health: ${this.farmHealth}%, Water: ${this.waterReserve.toFixed(1)}%, SustainScore: ${sustainabilityScore.total}%`, 1);
        this.logger.log(` -- Sustain Breakdown: Soil ${sustainabilityScore.soilScore}%, Diversity ${sustainabilityScore.diversityScore}%, Tech ${sustainabilityScore.techScore}%`, 2);

        this.climate.droughtProbability = Math.min(0.5, this.climate.droughtProbability + 0.005);
        this.climate.heatwaveProbability = Math.min(0.6, this.climate.heatwaveProbability + 0.005);
        this.logger.log(`Climate Change Update: Drought Prob ${this.climate.droughtProbability.toFixed(3)}, Heatwave Prob ${this.climate.heatwaveProbability.toFixed(3)}`, 2);

        this.addEvent(`Happy New Year! Completed Year ${this.year - 1}.`);

        let bonus = 0;
        let subsidyMsg = "Farm did not qualify for sustainability subsidies.";
        if (sustainabilityScore.total >= SUSTAINABILITY_THRESHOLD_HIGH) {
             bonus = SUSTAINABILITY_SUBSIDY_BASE_HIGH;
             subsidyMsg = `Received ${formatCurrency(bonus)} high-tier sustainability subsidy!`;
        } else if (sustainabilityScore.total >= SUSTAINABILITY_THRESHOLD_MED) {
             bonus = SUSTAINABILITY_SUBSIDY_BASE_MED;
             subsidyMsg = `Received ${formatCurrency(bonus)} mid-tier sustainability subsidy.`;
        } else if (sustainabilityScore.total >= SUSTAINABILITY_THRESHOLD_LOW) {
             bonus = SUSTAINABILITY_SUBSIDY_BASE_LOW;
             subsidyMsg = `Received ${formatCurrency(bonus)} low-tier sustainability subsidy.`;
        }

        if (bonus > 0) {
            this.balance += bonus;
        }
        this.addEvent(subsidyMsg);
        this.logger.log(subsidyMsg, 1);

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
             if (!event || !event.type) {
                 this.logger.log(`ERROR: Processing invalid event object.`, 0);
                 console.error("Invalid event object:", event);
                 return;
             }

             this.logger.log(`-- Applying event: ${event.type} (${event.subType || event.severity || event.policyType || ''})`, 2);
            let result = {};
            let continueEvent = null;
            let logMsg = event.message;
            let logLvl = 3;

            // Determine log level
            if (event.isAlert) logLvl = 1;
            // --- PHASE 2: Adjust log levels for new/changed events ---
            if (event.type === 'frost' || (event.type === 'policy' && event.policyType !== 'policy_rebate') || event.type === 'technology') logLvl = 1;
            if (event.type === 'drought' || event.type === 'heatwave') {
                 if (event.severity === 'severe') logLvl = 1; else logLvl = 2;
            }
             if (event.type === 'weather' && event.subType === 'favorable') logLvl = 2; // INFO level for positive weather
            if (event.type === 'market' && (event.direction === 'opportunity' || Math.abs(event.changePercent || 0) > 25)) { logLvl = 1; }
            // -------------------------------------------------------

            let originalBalance = this.balance;

            try {
                 switch (event.type) {
                    case 'rain':
                        result = Events.applyRainEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                        this.waterReserve = result.waterReserve;
                        logMsg = result.message;
                        if (event.severity === 'heavy') logLvl = 2; else logLvl = 3;
                        break;
                    case 'drought':
                         result = Events.applyDroughtEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                         if (!result.skipped) {
                             this.waterReserve = result.waterReserve;
                             logMsg = result.message;
                             if (result.continueEvent) {
                                 continueEvent = { ...event, day: this.day + 1, duration: result.nextDuration, message: result.message };
                                 if (event.duration === result.nextDuration + 1) { this.logger.log(`Event Started: ${logMsg}`, logLvl); }
                                 else { this.logger.log(`Event Continues: ${logMsg}`, 3); }
                                 logMsg = null; // Don't log generic message again if continuing
                             } else {
                                 this.lastDroughtEndDay = this.day;
                                 this.addEvent(`The drought has ended.`); this.logger.log('Drought event ended.', logLvl);
                                 logMsg = null; // Don't log generic message if ended
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
                                if (event.duration === result.nextDuration + 1) { this.logger.log(`Event Started: ${logMsg}`, 1); }
                                else { this.logger.log(`Event Continues: ${logMsg}`, 3); }
                                logMsg = null;
                             } else {
                                 this.lastHeatwaveEndDay = this.day;
                                 this.addEvent(`The heatwave has ended.`); this.logger.log('Heatwave event ended.', 1);
                                 logMsg = null;
                             }
                         } else { logMsg = null; }
                        break;
                    case 'frost':
                         result = Events.applyFrostEvent(event, this.grid, this.researchedTechs);
                         logMsg = result.message;
                         this.lastFrostDay = this.day;
                        break;
                     // --- PHASE 2: Handle Favorable Weather ---
                     case 'weather': // Catch-all for weather sub-types if needed
                         if (event.subType === 'favorable') {
                             result = Events.applyFavorableWeatherEvent(event, this.grid, this.researchedTechs);
                             logMsg = result.message;
                             logLvl = 2; // Make it INFO level
                         } else {
                              this.logger.log(`Unknown weather subType processed: ${event.subType}`, 1);
                              logMsg = null;
                         }
                         break;
                     // ---------------------------------------
                    case 'market':
                         result = Events.applyMarketEvent(event, this.marketPrices, crops);
                        this.marketPrices = result.marketPrices;
                        logMsg = result.message;
                        // TODO: Implement temporary boost reset mechanism if needed.
                        break;
                    case 'policy':
                         result = Events.applyPolicyEvent(event, this.balance);
                         let finalCostPolicy = 0;
                         // Handle different policy types
                         if (event.policyType === 'water_restriction' && event.irrigationCostIncrease) {
                              // Apply irrigation cost modifier - HOW? Need a game state flag or modifier
                              // For now, we log it, but effect isn't applied yet. Needs mechanism.
                              this.logger.log(`Water restriction active: Irrigation costs increased by ${event.irrigationCostIncrease * 100}%`, 1);
                              logMsg = result.message; // Use message from event
                         } else if (result.balanceChange < 0 && event.baseCost) { // Handle 'new_regulations' cost scaling
                             const baseCostPolicy = Math.abs(event.baseCost);
                             const minCostPolicy = 500; const maxCostPolicy = 6000;
                             const scaleFactorPolicy = Math.min(1.8, Math.max(0.7, 1 + (originalBalance - 150000) / 300000));
                             finalCostPolicy = Math.round(Math.min(maxCostPolicy, Math.max(minCostPolicy, baseCostPolicy * scaleFactorPolicy)));
                             this.balance = originalBalance - finalCostPolicy; // Apply scaled cost
                             logMsg = `${event.message} Final Cost: ${formatCurrency(finalCostPolicy)}`;
                         } else if (result.balanceChange > 0) { // Handle subsidies and rebates
                             this.balance = originalBalance + result.balanceChange;
                             logMsg = result.message;
                             // Adjust log level for rebates if desired (make less prominent than subsidies)
                             if (event.policyType === 'policy_rebate') logLvl = 2;
                         } else {
                              // Should not happen for current policy events unless balanceChange is 0
                              this.balance = result.newBalance;
                              logMsg = result.message;
                         }
                         // Add balance change to log message if significant cost/gain
                         if (logLvl <= 1 && (finalCostPolicy > 0 || Math.abs(result.balanceChange) > 0)) {
                              if (logMsg && !logMsg.includes('(New Balance:')) { // Avoid double logging
                                 logMsg += ` (New Balance: ${formatCurrency(this.balance)})`;
                              }
                         }
                        break;
                    case 'technology':
                         result = Events.applyTechnologyEvent(event, this.balance, this.researchedTechs);
                         let finalCostTech = 0;
                         // Apply scaling ONLY to setbacks
                         if (event.subType === 'technology_setback' && result.balanceChange < 0) {
                              const baseCostTech = Math.abs(result.balanceChange); // Use the base amount passed back
                              const minCostTech = 800; const maxCostTech = 6000;
                              const scaleFactorTech = Math.min(1.6, Math.max(0.6, 1 + (originalBalance - 180000) / 250000));
                              finalCostTech = Math.round(Math.min(maxCostTech, Math.max(minCostTech, baseCostTech * scaleFactorTech)));
                              this.balance = originalBalance - finalCostTech; // Apply scaled cost
                              logMsg = `Technology setback! Equipment malfunction repair cost: ${formatCurrency(finalCostTech)}.`;
                         } else if (event.subType === 'innovation_grant' && result.balanceChange > 0) {
                              this.balance = originalBalance + result.balanceChange; // Apply grant amount
                              logMsg = result.message;
                         } else {
                             // Handle research breakthrough (no balance change here) or other future types
                             this.balance = result.newBalance;
                             logMsg = result.message;
                         }
                         // Add balance change to log message for grants/setbacks
                         if (logLvl <= 1) {
                             if(event.subType === 'innovation_grant' && result.balanceChange > 0) {
                                 if (logMsg && !logMsg.includes('(+$')) logMsg += ` (+${formatCurrency(result.balanceChange)})`;
                             }
                             if(event.subType === 'technology_setback') {
                                 if (logMsg && !logMsg.includes('(New Balance:')) logMsg += ` (New Balance: ${formatCurrency(this.balance)})`;
                             }
                         }
                        break;

                    default:
                         this.logger.log(`Unknown event type processed: ${event.type}`, 0);
                         logMsg = null;
                 }

                 if (logMsg) {
                     this.addEvent(logMsg, event.isAlert);
                     // Only log event result if message exists (prevents double logs for continuing events)
                     this.logger.log(`Event Result: ${logMsg}`, logLvl);
                 }

                 if (continueEvent) {
                     this.pendingEvents.push(continueEvent);
                     this.logger.log(`-- Event ${event.type} continues tomorrow (Day ${continueEvent.day}), duration left: ${continueEvent.duration}`, 2);
                 }
            } catch (error) {
                 this.logger.log(`ERROR applying event ${event.type} (${event.subType || event.policyType || ''}): ${error.message}`, 0);
                 console.error("Error during event processing:", event, error);
            }
        });
    } // END processPendingEvents

    addEvent(message, isAlert = false) {
        if (this.headless || !this.ui) return;
        const event = { date: `${this.season}, Year ${this.year}`, message, isAlert };
        this.events.unshift(event);
        if (this.events.length > 20) this.events.pop();
        if (this.ui && this.ui.updateEventsList) {
             this.ui.updateEventsList();
        }
    }

    plantCrop(row, col, cropId) {
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) { this.logger.log(`Invalid coordinates for planting: (${row}, ${col})`, 0); return false; }
        if (!this.grid[row] || !this.grid[row][col]) { this.logger.log(`ERROR: Cell object missing at (${row}, ${col})`, 0); return false; }
        const cell = this.grid[row][col];
        const newCrop = getCropById(cropId);
        if (!newCrop || newCrop.id === 'empty') { this.logger.log(`Invalid crop ID for planting: ${cropId}`, 0); return false; }
        const plantingCost = Math.round(newCrop.basePrice * this.plantingCostFactor);
        if (this.balance < plantingCost) {
            const msg = `Cannot afford to plant ${newCrop.name}. Cost: ${formatCurrency(plantingCost)}, Balance: ${formatCurrency(this.balance)}`;
            if (!this.testMode) this.addEvent(msg, true);
            this.logger.log(msg, 2);
            return false;
        }
        const currentCropId = cell.crop ? cell.crop.id : 'error_cell.crop_null';
        if (currentCropId !== 'empty') {
            const msg = `Cannot plant ${newCrop.name}, plot (${row}, ${col}) is already occupied by ${cell.crop.name}. Current ID: '${currentCropId}'`;
             if (!this.testMode) this.addEvent(msg, true);
            this.logger.log(msg, this.testMode ? 3 : 1);
            return false;
        }

        this.balance -= plantingCost;
        if (cell.plant(newCrop)) {
             const msg = `Planted ${newCrop.name} at (${row}, ${col}). Cost: ${formatCurrency(plantingCost)}`;
             this.logger.log(msg, 2);
             if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
             return true;
        } else {
             this.balance += plantingCost;
             this.logger.log(`Internal cell.plant() method failed for ${newCrop.name} at (${row}, ${col})`, 0);
             return false;
        }
    }

    irrigateCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        const cost = this.irrigationCost;
        if (cell.crop.id === 'empty') { this.addEvent('Cannot irrigate empty plot.', true); this.logger.log(`Attempted to irrigate empty plot (${row}, ${col})`, 2); return false; }
        if (cell.irrigated) { this.logger.log(`Plot (${row}, ${col}) already irrigated today.`, 3); return false; }
        if (this.balance < cost) {
             this.addEvent(`Cannot afford irrigation (${formatCurrency(cost)}).`, true);
             this.logger.log(`Cannot afford irrigation (${formatCurrency(cost)}). Balance: ${formatCurrency(this.balance)}`, 2);
             return false;
        }
        this.balance -= cost;
        const waterEfficiency = this.getTechEffectValue('waterEfficiency', 1.0);
        cell.irrigate(waterEfficiency);
        const msg = `Irrigated plot at (${row}, ${col}). Cost: ${formatCurrency(cost)}`;
        this.addEvent(msg); this.logger.log(msg, 2);
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    fertilizeCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return false;
        const cell = this.grid[row][col];
        const cost = this.fertilizeCost;
        if (cell.crop.id === 'empty') { this.addEvent('Cannot fertilize empty plot.', true); this.logger.log(`Attempted to fertilize empty plot (${row}, ${col})`, 2); return false; }
        if (cell.fertilized) { this.logger.log(`Plot (${row}, ${col}) already fertilized for this cycle.`, 3); return false; }
        if (this.balance < cost) {
            this.addEvent(`Cannot afford fertilizer (${formatCurrency(cost)}).`, true);
            this.logger.log(`Cannot afford fertilizer (${formatCurrency(cost)}). Balance: ${formatCurrency(this.balance)}`, 2);
            return false;
        }
        this.balance -= cost;
        const fertilizerEfficiency = this.getTechEffectValue('fertilizerEfficiency', 1.0);
        cell.fertilize(fertilizerEfficiency);
        const msg = `Fertilized plot at (${row}, ${col}). Cost: ${formatCurrency(cost)}`;
        this.addEvent(msg); this.logger.log(msg, 2);
        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }
        return true;
    }

    harvestCell(row, col) {
         if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
             return { success: false, reason: 'Invalid coordinates' };
         }
        const cell = this.grid[row][col];
        if (cell.crop.id === 'empty') {
            this.logger.log(`Attempted harvest on empty plot (${row}, ${col})`, 3);
            return { success: false, reason: 'Empty plot' };
        }
        if (!cell.harvestReady) {
            this.logger.log(`Attempted harvest on not-ready plot (${row}, ${col}), Crop: ${cell.crop.id}, Progress: ${cell.growthProgress}%`, 3);
             return { success: false, reason: 'Not ready' };
        }

        const marketPriceFactor = this.marketPrices[cell.crop.id] || 1.0;
        const harvestData = cell.harvest(this.waterReserve, marketPriceFactor);

        if (harvestData.value === undefined || harvestData.yieldPercentage === undefined) {
             this.logger.log(`ERROR: Harvest calculation failed for plot (${row}, ${col})`, 0);
             return { success: false, reason: 'Calculation error' };
        }

        if (harvestData.value > 0) {
             this.balance += harvestData.value;
        }

        if (this.ui) { this.ui.updateHUD(); this.ui.showCellInfo(row, col); }

        return {
            success: true,
            income: harvestData.value,
            cropName: harvestData.cropName,
            yieldPercentage: harvestData.yieldPercentage
        };
    }

    researchTechnology(techId) {
        const tech = this.technologies.find(t => t.id === techId);
        if (!tech) { this.logger.log(`Technology ID not found: ${techId}`, 0); return false; }
        if (tech.researched) { this.logger.log(`${tech.name} already researched.`, 1); return false; }
        if (!checkTechPrerequisites(tech, this.researchedTechs)) {
            const msg = `Prerequisites not met for ${tech.name}.`; this.addEvent(msg, true); this.logger.log(msg, 1); return false;
        }

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

        this.farmValue = calculateFarmValue(this.grid, this.technologies);

        return true;
    }

    updateMarketPrices() {
        crops.forEach(crop => {
             if (crop.id !== 'empty') {
                 this.marketPrices[crop.id] = 0.9 + Math.random() * 0.2;
             }
        });
         this.logger.log("Initial market prices set.", 2);
    }

    fluctuateMarketPrices() {
         let changes = [];
        crops.forEach(crop => {
            if (crop.id !== 'empty') {
                const change = 0.95 + Math.random() * 0.1;
                const oldPrice = this.marketPrices[crop.id];
                this.marketPrices[crop.id] = Math.max(0.5, Math.min(2.0, oldPrice * change));
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
        return getTechEffectValue(effectName, this.researchedTechs, this.technologies, defaultValue);
    }

    getTechnologyCost(techId) {
        const tech = this.technologies.find(t => t.id === techId);
        return tech ? tech.cost : Infinity;
    }

    terminateTest() {
        this.logger.log(`==== TEST ${this.testStrategyId} FINAL RESULT ====`, 1);
        this.logger.log(`Ending Year: ${this.year}, Day: ${this.day}`, 1);
        this.logger.log(`Final Balance: ${formatCurrency(this.balance)}`, 1);
        this.logger.log(`Final Farm Value: ${formatCurrency(this.farmValue)}`, 1);
        this.logger.log(`Final Farm Health: ${this.farmHealth}%`, 1);
        this.logger.log(`Final Water Reserve: ${this.waterReserve.toFixed(2)}%`, 1);
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
