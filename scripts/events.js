/**
 * California Climate Farmer - Events System
 *
 * Contains event generation and handling logic for random events like weather,
 * market fluctuations, policy changes, and technology events.
 */

import { crops } from './crops.js';
import { formatCurrency } from './utils.js'; // Import for formatting messages

// --- PHASE 1: Cooldown Constants ---
const DROUGHT_COOLDOWN_DAYS = 90;
const HEATWAVE_COOLDOWN_DAYS = 45;
const FROST_COOLDOWN_DAYS = 15;
// ------------------------------------

// --- Event Generation ---

export function generateRandomEvent(farmState) {
    // Base chance slightly lower now that positive events exist
    if (Math.random() < 0.48) return null; // 52% chance event occurs (was 55%)

    const eventTypes = [
        { type: 'weather', probability: 0.4 }, // Keep weather dominant
        { type: 'market', probability: 0.25 }, // Slightly reduce market
        { type: 'policy', probability: 0.20 }, // Increase policy slightly for rebates
        { type: 'technology', probability: 0.15 }
    ];

    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = eventTypes[0].type;

    for (const type of eventTypes) {
        cumulativeProbability += type.probability;
        if (roll < cumulativeProbability) {
            selectedType = type.type;
            break;
        }
    }

    const isEarlyGame = farmState.year <= 2;

    switch (selectedType) {
        case 'weather':
            return scheduleWeatherEvent(farmState.day, farmState.climate, farmState.season, farmState);
        case 'market':
            return scheduleMarketEvent(farmState.day);
        case 'policy':
             // Pass farmState for potential use in more complex policy events later
             return schedulePolicyEvent(farmState.day, farmState, null, isEarlyGame);
        case 'technology':
             return generateTechnologyEvent(farmState.day, farmState, isEarlyGame);
        default:
            return scheduleWeatherEvent(farmState.day, farmState.climate, farmState.season, farmState);
    }
}

function scheduleWeatherEvent(day, climate, season, farmState) {
    const eventTypes = [
        // Adjust probabilities to make space for favorable weather
        { id: 'rain', probability: 0.35 }, // Reduced rain slightly
        { id: 'drought', probability: climate.droughtProbability * 0.9 }, // Keep slight reduction
        { id: 'heatwave', probability: climate.heatwaveProbability * 0.9 }, // Keep slight reduction
        { id: 'frost', probability: (season === 'Winter' ? 0.3 : 0.05) * 0.9 }, // Keep slight reduction
        // --- PHASE 2: Added Favorable Weather ---
        { id: 'favorable', probability: 0.15 } // Add positive event chance
        // -----------------------------------------
    ];

    const totalProbability = eventTypes.reduce((sum, type) => sum + type.probability, 0);
    const fallbackEventDay = day + Math.floor(Math.random() * 15) + 3;
    if (totalProbability <= 0) return scheduleRain(fallbackEventDay); // Fallback still rain

    const normalizedTypes = eventTypes.map(type => ({ ...type, probability: type.probability / totalProbability }));

    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = normalizedTypes[0].id;

    for (const type of normalizedTypes) {
        // Skip scheduling if probability is zero or negative (can happen with high climate change)
        if (type.probability <= 0) continue;
        cumulativeProbability += type.probability;
        if (roll < cumulativeProbability) {
            selectedType = type.id;
            break;
        }
    }
     // Ensure selectedType is valid if all probabilities somehow became zero
     if (!eventTypes.find(et => et.id === selectedType)) {
         selectedType = 'rain'; // Default fallback
     }


    const eventDay = day + Math.floor(Math.random() * 15) + 3;

    switch (selectedType) {
        case 'rain': return scheduleRain(eventDay);
        case 'drought': return scheduleDrought(eventDay, climate.droughtProbability, farmState);
        case 'heatwave': return scheduleHeatwave(eventDay, farmState);
        case 'frost': return scheduleFrost(eventDay, farmState);
        // --- PHASE 2: Case for Favorable Weather ---
        case 'favorable': return createFavorableWeatherEvent(eventDay);
        // -------------------------------------------
        default: return scheduleRain(eventDay);
    }
}

function scheduleMarketEvent(day) {
    // Keep market event types as is for now
    const eventTypes = [ { id: 'price_increase', probability: 0.4 }, { id: 'price_decrease', probability: 0.4 }, { id: 'market_opportunity', probability: 0.2 }];
    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = eventTypes[0].id;
    for (const type of eventTypes) {
        cumulativeProbability += type.probability;
        if (roll < cumulativeProbability) { selectedType = type.id; break; }
    }
    const eventDay = day + Math.floor(Math.random() * 10) + 3;

    switch (selectedType) {
        case 'price_increase': return createMarketEvent(eventDay, 'increase');
        case 'price_decrease': return createMarketEvent(eventDay, 'decrease');
        case 'market_opportunity': return createMarketOpportunityEvent(eventDay);
        default: return createMarketEvent(eventDay, 'increase');
    }
}

// --- PHASE 2: Pass full farmState ---
export function schedulePolicyEvent(day, farmState, policyType = null, isEarlyGame = false) {
    // Adjust probabilities for rebate
    const eventTypes = [
        { id: 'water_restriction', probability: 0.35 }, // Slightly reduced
        { id: 'environmental_subsidy', probability: 0.25 }, // Slightly reduced
        { id: 'new_regulations', probability: 0.25 }, // Slightly reduced
        // --- PHASE 2: Added Policy Rebate ---
        { id: 'policy_rebate', probability: 0.15 }
        // ------------------------------------
    ];
    if (!policyType) {
        const roll = Math.random();
        let cumulativeProbability = 0;
        policyType = eventTypes[0].id;
        for (const type of eventTypes) { cumulativeProbability += type.probability; if (roll < cumulativeProbability) { policyType = type.id; break; } }
    }

    // Keep early game suppression for costly regulations
    if (isEarlyGame && policyType === 'new_regulations') {
         if (Math.random() < 0.4) {
             console.log("[Event Balancing] Switching early costly policy event to subsidy.");
             policyType = 'environmental_subsidy';
         }
    }
    const eventDay = day + Math.floor(Math.random() * 15) + 5;
    // Pass farmState to generatePolicyEvent
    return generatePolicyEvent(eventDay, farmState, policyType);
}

export function generateTechnologyEvent(day, farmState, isEarlyGame = false) {
    // Keep tech event probabilities for now
    const eventTypes = [ { id: 'innovation_grant', probability: 0.5 }, { id: 'research_breakthrough', probability: 0.3 }, { id: 'technology_setback', probability: 0.2 } ];
    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = eventTypes[0].id;
    for (const type of eventTypes) { cumulativeProbability += type.probability; if (roll < cumulativeProbability) { selectedType = type.id; break; } }

    if (isEarlyGame) {
         if (selectedType === 'technology_setback' && Math.random() < 0.6) {
             console.log("[Event Balancing] Switching early tech setback to grant.");
             selectedType = 'innovation_grant';
         } else if (selectedType !== 'innovation_grant' && Math.random() < 0.1) {
             selectedType = 'innovation_grant';
         }
    }
    const eventDay = day + Math.floor(Math.random() * 20) + 5;

    switch (selectedType) {
        case 'innovation_grant': return createInnovationGrantEvent(eventDay, farmState, isEarlyGame);
        case 'research_breakthrough': return createResearchBreakthroughEvent(eventDay);
        case 'technology_setback': return createTechnologySetbackEvent(eventDay); // Pass farmState for potential future scaling
        default: return createInnovationGrantEvent(eventDay, farmState, isEarlyGame);
    }
}

// --- Event Creation Helpers ---
function createInnovationGrantEvent(day, farmState, isEarlyGame) {
    const techCount = farmState?.researchedTechs?.length || 0;
    let grantAmount = 0;
    let message = '';
    const earlyGrantChance = isEarlyGame ? 0.35 : 0.2;
    const earlyGrantAmount = 3000;

    if (techCount === 0) {
        if (Math.random() < earlyGrantChance) {
            grantAmount = earlyGrantAmount;
            message = `You received a small ${formatCurrency(grantAmount)} starter grant for farm innovation. Consider investing in research.`;
        } else {
            message = 'Your farm was not selected for an innovation grant this time.';
        }
    } else if (techCount <= 1 && Math.random() < 0.4) {
         grantAmount = 5000;
         message = `You received a ${formatCurrency(grantAmount)} innovation grant for your initial research efforts.`;
    } else if (techCount <= 3 && Math.random() < 0.3) {
         grantAmount = 8000;
         message = `You received a ${formatCurrency(grantAmount)} innovation grant for farm research!`;
    } else if (techCount <= 5 && Math.random() < 0.2) {
         grantAmount = 12000;
         message = `You received a ${formatCurrency(grantAmount)} substantial innovation grant for your technological leadership!`;
    } else if (techCount > 5 && Math.random() < 0.15) {
         grantAmount = 15000 + (techCount - 6) * 1000;
         grantAmount = Math.min(grantAmount, 25000);
         message = `You received a major ${formatCurrency(grantAmount)} innovation grant for being at the cutting edge!`;
    } else {
         message = 'Your farm was considered but not selected for a major innovation grant.';
    }

    if (grantAmount === 0 && !message) {
         message = 'No innovation grants awarded this cycle.';
    }

    return { type: 'technology', subType: 'innovation_grant', day, amount: grantAmount, message, isAlert: grantAmount > 5000 };
 }

function createResearchBreakthroughEvent(day) {
    const duration = Math.floor(Math.random() * 16) + 15;
    return { type: 'technology', subType: 'research_breakthrough', day, duration, discount: 0.3, message: `Research breakthrough! Technology costs reduced by 30% for the next ${duration} days.`, isAlert: true };
}

// Pass farmState for potential future scaling
function createTechnologySetbackEvent(day, farmState) {
    const setbackAmountBase = Math.floor(Math.random() * 3000) + 2000;
    // Scaling could be added here later based on farmState.year or farmState.balance
    return { type: 'technology', subType: 'technology_setback', day, amount: setbackAmountBase, message: `Technology setback! Equipment malfunction reported.`, isAlert: true };
}

export function scheduleRain(day) {
    const intensity = Math.random();
    let severity, message, waterIncrease;
    if (intensity < 0.3) { severity = 'light'; message = 'Light rainfall increased water levels slightly.'; waterIncrease = 5 + Math.floor(Math.random() * 5); }
    else if (intensity < 0.7) { severity = 'moderate'; message = 'Moderate rainfall increased water levels.'; waterIncrease = 10 + Math.floor(Math.random() * 10); }
    else { severity = 'heavy'; message = 'Heavy rainfall significantly increased water levels but may cause erosion.'; waterIncrease = 15 + Math.floor(Math.random() * 15); }
    const forecastMessage = 'Weather forecast: ' + severity + ' rain expected soon.';
    return { type: 'rain', day, severity, waterIncrease, message, forecastMessage, isAlert: severity === 'heavy' };
}

export function scheduleDrought(day, baseProbability, farmState) {
    if (farmState && day < farmState.lastDroughtEndDay + DROUGHT_COOLDOWN_DAYS) {
        farmState.logger?.log(`Skipping drought schedule due to cooldown. Current: ${day}, Last End: ${farmState.lastDroughtEndDay}, Cooldown: ${DROUGHT_COOLDOWN_DAYS}`, 3);
        return null;
    }

    const severityRoll = Math.random();
    let severity, duration, baseMessage;
    if (severityRoll < 0.6) { severity = 'mild'; duration = Math.floor(Math.random() * 3) + 3; baseMessage = 'Drought conditions affecting your farm.'; }
    else if (severityRoll < 0.9) { severity = 'moderate'; duration = Math.floor(Math.random() * 4) + 5; baseMessage = 'Moderate drought conditions! Water levels dropping, crops stressed.'; }
    else { severity = 'severe'; duration = Math.floor(Math.random() * 5) + 7; baseMessage = 'Severe drought conditions! Water critically low, crops at high risk.'; }
    const climateModifier = Math.max(1.0, baseProbability / 0.05);
    duration = Math.max(1, Math.floor(duration * climateModifier));
    const forecastMessage = 'Weather forecast: Dry conditions expected. Potential drought warning.';
    return { type: 'drought', day: day, severity, duration, message: baseMessage, forecastMessage, isAlert: severity !== 'mild' };
}

export function scheduleHeatwave(day, farmState) {
    if (farmState && day < farmState.lastHeatwaveEndDay + HEATWAVE_COOLDOWN_DAYS) {
         farmState.logger?.log(`Skipping heatwave schedule due to cooldown. Current: ${day}, Last End: ${farmState.lastHeatwaveEndDay}, Cooldown: ${HEATWAVE_COOLDOWN_DAYS}`, 3);
         return null;
    }

    const duration = Math.floor(Math.random() * 4) + 2;
    const forecastMessage = 'Weather forecast: Extreme heat expected in the coming days.';
    return { type: 'heatwave', day: day, duration, message: 'Heatwave conditions! Crops experiencing heat stress.', forecastMessage, isAlert: true };
}

export function scheduleFrost(day, farmState) {
    if (farmState && day < farmState.lastFrostDay + FROST_COOLDOWN_DAYS) {
        farmState.logger?.log(`Skipping frost schedule due to cooldown. Current: ${day}, Last: ${farmState.lastFrostDay}, Cooldown: ${FROST_COOLDOWN_DAYS}`, 3);
        return null;
    }

    const forecastMessage = 'Weather forecast: Temperatures expected to drop below freezing overnight.';
    return { type: 'frost', day: day, message: 'Frost warning! Young plants are vulnerable.', forecastMessage, isAlert: true };
}

// --- PHASE 2: Added Favorable Weather Event ---
function createFavorableWeatherEvent(day) {
    const baseMessage = 'Favorable weather conditions boosting growth and reducing water needs.';
    // Effect could be varied, e.g., longer duration, stronger boost
    return {
        type: 'weather',
        subType: 'favorable',
        day,
        duration: 1, // Simple single-day boost for now
        message: baseMessage,
        forecastMessage: 'Weather forecast: Conditions look ideal for growth.',
        waterUseModifier: 0.8, // 20% less water needed that day
        growthBoost: 1.05, // 5% growth boost that day
        isAlert: false // Not an alert
    };
}
// ---------------------------------------------

function createMarketEvent(day, direction) {
    const validCrops = crops.filter(c => c.id !== 'empty');
    if (validCrops.length === 0) return null;
    const cropIndex = Math.floor(Math.random() * validCrops.length);
    const targetCrop = validCrops[cropIndex];
    let changePercent, message, forecast, isAlert;
    if (direction === 'increase') { changePercent = 10 + Math.floor(Math.random() * 30); message = `Market update: ${targetCrop.name} prices have risen by ${changePercent}%.`; forecast = `Market news: Increased demand expected for ${targetCrop.name}.`; isAlert = false; }
    else { changePercent = 10 + Math.floor(Math.random() * 30); message = `Market update: ${targetCrop.name} prices have fallen by ${changePercent}%.`; forecast = `Market news: Market surplus expected for ${targetCrop.name}.`; isAlert = true; }
    return { type: 'market', day, direction, cropId: targetCrop.id, changePercent, message, forecastMessage: forecast, isAlert };
}

function createMarketOpportunityEvent(day) {
    const validCrops = crops.filter(c => c.id !== 'empty');
    if (validCrops.length === 0) return null;
    const cropIndex = Math.floor(Math.random() * validCrops.length);
    const targetCrop = validCrops[cropIndex];
    const bonusPercent = 30 + Math.floor(Math.random() * 30);
    const duration = Math.floor(Math.random() * 10) + 5;
    const message = `Market opportunity! ${targetCrop.name} prices temporarily increased by ${bonusPercent}% for ${duration} days!`;
    const forecast = `Market news: Special demand expected for ${targetCrop.name}.`;
    return { type: 'market', day, direction: 'opportunity', cropId: targetCrop.id, changePercent: bonusPercent, duration, message, forecastMessage: forecast, isAlert: true };
}

// --- PHASE 2: Pass full farmState ---
export function generatePolicyEvent(day, farmState, policyType) {
    const farmHealth = farmState?.farmHealth || 0; // Safely access farmHealth
    const subsidyAmount = farmHealth > 60 ? 5000 : (farmHealth > 40 ? 3000 : 0);
    const complianceCostBase = 3000;
    // --- PHASE 2: Added Policy Rebate Event ---
    const rebateAmount = 1500 + Math.floor(Math.random() * 2000);
    // ------------------------------------------
    switch (policyType) {
        case 'water_restriction': return { type: 'policy', policyType, day, message: 'Water restriction policy enacted. Irrigation costs increased by 50%.', forecastMessage: 'Policy update: Water restrictions being considered.', isAlert: true, irrigationCostIncrease: 0.5, balanceChange: 0 };
        case 'environmental_subsidy': return subsidyAmount > 0 ? { type: 'policy', policyType, day, message: `You received a ${formatCurrency(subsidyAmount)} environmental subsidy!`, forecastMessage: 'Policy update: Environmental subsidies being discussed.', isAlert: false, balanceChange: subsidyAmount } : null;
        case 'new_regulations': return { type: 'policy', policyType, day, message: `New regulations require compliance upgrades.`, baseCost: complianceCostBase, forecastMessage: 'Policy update: New farming regulations proposed.', isAlert: true, balanceChange: -complianceCostBase };
        // --- PHASE 2: Added Policy Rebate Case ---
        case 'policy_rebate': return { type: 'policy', policyType, day, message: `Received an unexpected policy rebate of ${formatCurrency(rebateAmount)}!`, forecastMessage: 'Policy update: Potential for rebates being discussed.', isAlert: false, balanceChange: rebateAmount };
        // -----------------------------------------
        default: return null;
    }
}


// --- Event Application Functions ---

export function applyRainEvent(event, grid, waterReserve, techs = []) {
    let newWaterReserve = Math.min(100, waterReserve + event.waterIncrease);
    let soilDamage = 0;
    if (event.severity === 'heavy') soilDamage = 1 + Math.random() * 2;
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            cell.applyEnvironmentalEffect('water-increase', event.waterIncrease * 0.8);
            if (soilDamage > 0) {
                let protection = 1.0;
                if (techs.includes('no_till_farming')) protection *= 0.5;
                cell.applyEnvironmentalEffect('soil-damage', soilDamage, protection);
            }
        }
    }
    return { waterReserve: newWaterReserve, message: event.message };
}

export function applyDroughtEvent(event, grid, waterReserve, techs = []) {
    if (event.duration <= 0) return { skipped: true };
    let newWaterReserve = waterReserve;
    const severityFactor = event.severity === 'mild' ? 1 : (event.severity === 'moderate' ? 2 : 3);
    const dailyFarmReserveLoss = 0.5 * severityFactor;
    const dailyCellWaterLoss = 2 * severityFactor;
    let droughtProtection = 1.0;
    if (techs.includes('drought_resistant')) droughtProtection *= 0.7;
    if (techs.includes('silvopasture')) droughtProtection *= 0.8;
    if (techs.includes('ai_irrigation')) droughtProtection *= 0.95;
    newWaterReserve = Math.max(0, newWaterReserve - (dailyFarmReserveLoss * droughtProtection));
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            if (cell.crop.id !== 'empty') {
                cell.applyEnvironmentalEffect('water-decrease', dailyCellWaterLoss, droughtProtection);
                if (severityFactor > 1) {
                    const yieldDamageMagnitude = 1.5 * (severityFactor - 1);
                    cell.applyEnvironmentalEffect('yield-damage', yieldDamageMagnitude, droughtProtection);
                }
            } else {
                 cell.applyEnvironmentalEffect('water-decrease', dailyFarmReserveLoss * 0.5, 1.0);
            }
        }
    }
    const continueEvent = event.duration > 1;
    const nextDuration = event.duration - 1;
    let message = event.message;
     if (!message || event.duration === nextDuration + 1) {
         if (event.severity === 'mild') message = 'Mild drought conditions. Water reserves decreasing slowly.';
         else if (event.severity === 'moderate') message = 'Moderate drought! Crop stress increasing, yield potentially impacted.';
         else message = 'Severe drought! Critical water levels, significant yield loss likely.';
     }
    return { waterReserve: newWaterReserve, message, skipped: false, continueEvent, nextDuration, severity: event.severity };
}

export function applyHeatwaveEvent(event, grid, waterReserve, techs = []) {
    if (event.duration <= 0) return { skipped: true };
    let newWaterReserve = waterReserve;
    const dailyWaterLoss = 2;
    let heatProtection = 1.0;
    if (techs.includes('greenhouse')) heatProtection = 0.6;
    if (techs.includes('silvopasture')) heatProtection *= 0.85;
    newWaterReserve = Math.max(0, newWaterReserve - (dailyWaterLoss * heatProtection));
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            if (cell.crop.id !== 'empty') {
                cell.applyEnvironmentalEffect('water-decrease', dailyWaterLoss * 1.5, heatProtection);
                const crop = cell.crop;
                const heatSensitivityFactor = crop.heatSensitivity || 1.0;
                const heatDamageMagnitude = 2.0;
                cell.applyEnvironmentalEffect('yield-damage', heatDamageMagnitude * heatSensitivityFactor, heatProtection);
            }
        }
    }
    const continueEvent = event.duration > 1;
    const nextDuration = event.duration - 1;
    let message = event.message;
     if (!message || event.duration === nextDuration + 1) {
        message = "Heatwave conditions! Crops experiencing heat stress, water use increased, potential yield loss.";
     }
    return { waterReserve: newWaterReserve, message, skipped: false, continueEvent, nextDuration };
}

export function applyFrostEvent(event, grid, techs = []) {
    let frostProtection = 1.0;
    if (techs.includes('greenhouse')) frostProtection = 0.4;
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            if (cell.crop.id !== 'empty') {
                const growthProtectionFactor = Math.min(1, cell.growthProgress / 50);
                const frostDamageBase = 5.0;
                const effectiveDamage = frostDamageBase * (1 - growthProtectionFactor);
                cell.applyEnvironmentalEffect('yield-damage', effectiveDamage, frostProtection);
            }
        }
    }
    const message = event.message || "Frost reported! Crops, especially young ones, may have suffered yield damage.";
    return { message };
}

// --- PHASE 2: Added Favorable Weather Application ---
export function applyFavorableWeatherEvent(event, grid, techs = []) {
    const waterEffect = -2; // Give back a small amount of water need
    const growthBoost = event.growthBoost || 1.05; // Default 5% boost
    let cellsAffected = 0;

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            if (cell.crop.id !== 'empty') {
                cell.applyEnvironmentalEffect('water-decrease', waterEffect); // Negative decrease = increase
                cell.growthProgress = Math.min(100, cell.growthProgress * growthBoost);
                cellsAffected++;
            }
        }
    }
    return { message: event.message || "Favorable weather helped crops grow." };
}
// ----------------------------------------------------

export function applyMarketEvent(event, marketPrices, allCropsData) {
    const newMarketPrices = { ...marketPrices };
    const cropId = event.cropId;
    // Ensure cropId exists before trying to access it
    if (!newMarketPrices.hasOwnProperty(cropId) && cropId) {
        const cropData = allCropsData.find(c => c.id === cropId);
        if(cropData) newMarketPrices[cropId] = 1.0; // Initialize if missing
        else return { marketPrices, message: `Error: Market event for unknown crop ${cropId}`}; // Skip if invalid crop
    } else if (!cropId) {
         return { marketPrices, message: `Error: Market event with missing cropId`}; // Skip if no cropId
    }

    const currentPriceFactor = newMarketPrices[cropId];
    let message = event.message || "Market conditions changed.";

    if (event.direction === 'increase') {
        newMarketPrices[cropId] = Math.min(2.5, currentPriceFactor * (1 + (event.changePercent / 100)));
    } else if (event.direction === 'decrease') {
        newMarketPrices[cropId] = Math.max(0.4, currentPriceFactor * (1 - (event.changePercent / 100)));
    } else if (event.direction === 'opportunity') {
        newMarketPrices[cropId] = Math.min(3.0, currentPriceFactor * (1 + (event.changePercent / 100)));
        // TODO: Handle temporary boost reset mechanism if needed.
    }
     if (!message.includes('%') && event.changePercent) { // Add check for event.changePercent
         const newPricePercent = Math.round(newMarketPrices[cropId] * 100);
         message += ` ${cropId} price factor now ${newPricePercent}%.`;
     }
    return { marketPrices: newMarketPrices, message };
}

export function applyPolicyEvent(event, balance) {
    // Balance change is now direct, scaling is handled in game.js
    return {
        newBalance: balance + (event.balanceChange || 0),
        message: event.message,
        balanceChange: event.balanceChange || 0,
        irrigationCostIncrease: event.irrigationCostIncrease // Pass this through if needed
    };
}

export function applyTechnologyEvent(event, balance, researchedTechs = []) {
    let newBalance = balance;
    let message = event.message || "Technology event occurred.";
    let balanceChange = 0;
    // Base amounts calculated in create event, scaling handled in game.js
    switch (event.subType) {
        case 'innovation_grant':
             balanceChange = event.amount;
             newBalance += balanceChange; // Apply base grant amount
             break;
        case 'research_breakthrough': break; // Effect handled elsewhere
        case 'technology_setback':
             balanceChange = -event.amount; // Negative base cost
             newBalance += balanceChange; // Apply base setback cost (will be scaled in game.js)
             break;
    }
    return { newBalance, message, balanceChange };
}
