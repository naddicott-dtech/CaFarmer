/**
 * California Climate Farmer - Events System
 *
 * Contains event generation and handling logic for random events like weather,
 * market fluctuations, policy changes, and technology events.
 */

import { crops } from './crops.js'; // Assuming crops.js is in the parent directory

// --- Event Generation ---

export function generateRandomEvent(farmState) {
    if (Math.random() < 0.5) return null; // 50% chance no event

    const eventTypes = [
        { type: 'weather', probability: 0.4 },
        { type: 'market', probability: 0.3 },
        { type: 'policy', probability: 0.15 },
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

    // Check if negative financial events should be suppressed early (optional grace period)
    const isEarlyGame = farmState.year === 1 && farmState.day < 180; // Example: first 2 seasons

    switch (selectedType) {
        case 'weather':
            return scheduleWeatherEvent(farmState.day, farmState.climate, farmState.season);
        case 'market':
            return scheduleMarketEvent(farmState.day);
        case 'policy':
            // Optionally suppress costly policy events early on
            return schedulePolicyEvent(farmState.day, farmState.farmHealth, null, isEarlyGame);
        case 'technology':
             // Optionally suppress tech setbacks early on
            return generateTechnologyEvent(farmState.day, farmState, isEarlyGame);
        default:
            return scheduleWeatherEvent(farmState.day, farmState.climate, farmState.season);
    }
}

function scheduleWeatherEvent(day, climate, season) {
    const eventTypes = [
        { id: 'rain', probability: 0.5 },
        { id: 'drought', probability: climate.droughtProbability },
        { id: 'heatwave', probability: climate.heatwaveProbability },
        { id: 'frost', probability: season === 'Winter' ? 0.3 : 0.05 }
    ];

    const totalProbability = eventTypes.reduce((sum, type) => sum + type.probability, 0);
    if (totalProbability <= 0) return scheduleRain(day + 5); // Fallback if probabilities are zero

    // Normalize probabilities before selection
    const normalizedTypes = eventTypes.map(type => ({ ...type, probability: type.probability / totalProbability }));

    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = normalizedTypes[0].id;

    for (const type of normalizedTypes) {
        cumulativeProbability += type.probability;
        if (roll < cumulativeProbability) {
            selectedType = type.id;
            break;
        }
    }

    const eventDay = day + Math.floor(Math.random() * 20) + 5; // 5-25 days ahead

    switch (selectedType) {
        case 'rain': return scheduleRain(eventDay);
        case 'drought': return scheduleDrought(eventDay, climate.droughtProbability);
        case 'heatwave': return scheduleHeatwave(eventDay);
        case 'frost': return scheduleFrost(eventDay);
        default: return scheduleRain(eventDay);
    }
}

function scheduleMarketEvent(day) {
    const eventTypes = [
        { id: 'price_increase', probability: 0.4 },
        { id: 'price_decrease', probability: 0.4 },
        { id: 'market_opportunity', probability: 0.2 }
    ];
    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = eventTypes[0].id;

    for (const type of eventTypes) {
        cumulativeProbability += type.probability;
        if (roll < cumulativeProbability) {
            selectedType = type.id;
            break;
        }
    }
    const eventDay = day + Math.floor(Math.random() * 15) + 5;

    switch (selectedType) {
        case 'price_increase': return createMarketEvent(eventDay, 'increase');
        case 'price_decrease': return createMarketEvent(eventDay, 'decrease');
        case 'market_opportunity': return createMarketOpportunityEvent(eventDay);
        default: return createMarketEvent(eventDay, 'increase');
    }
}

export function schedulePolicyEvent(day, farmHealth, policyType = null, suppressCostly = false) {
    const eventTypes = [
        { id: 'water_restriction', probability: 0.4 },
        { id: 'environmental_subsidy', probability: 0.3 },
        { id: 'new_regulations', probability: 0.3 }
    ];

    if (!policyType) {
        const roll = Math.random();
        let cumulativeProbability = 0;
        policyType = eventTypes[0].id;
        for (const type of eventTypes) {
            cumulativeProbability += type.probability;
            if (roll < cumulativeProbability) {
                policyType = type.id;
                break;
            }
        }
    }

    // If suppressing costly events early, potentially switch to subsidy
    if (suppressCostly && (policyType === 'new_regulations' || policyType === 'water_restriction')) {
         if (Math.random() < 0.5) { // 50% chance to switch a negative early event
             console.log("Switching early costly policy event to subsidy."); // Use console log, not logger here
             policyType = 'environmental_subsidy';
         }
    }


    const eventDay = day + Math.floor(Math.random() * 20) + 10;
    return generatePolicyEvent(eventDay, farmHealth, policyType); // Call the generator
}

export function generateTechnologyEvent(day, farmState, suppressCostly = false) {
    const eventTypes = [
        { id: 'innovation_grant', probability: 0.5 },
        { id: 'research_breakthrough', probability: 0.3 },
        { id: 'technology_setback', probability: 0.2 }
    ];
    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = eventTypes[0].id;

    for (const type of eventTypes) {
        cumulativeProbability += type.probability;
        if (roll < cumulativeProbability) {
            selectedType = type.id;
            break;
        }
    }

    // If suppressing costly events early, potentially switch setback to grant
    if (suppressCostly && selectedType === 'technology_setback') {
         if (Math.random() < 0.5) {
             console.log("Switching early tech setback to grant.");
             selectedType = 'innovation_grant';
         }
    }


    const eventDay = day + Math.floor(Math.random() * 30) + 5;

    switch (selectedType) {
        case 'innovation_grant': return createInnovationGrantEvent(eventDay, farmState);
        case 'research_breakthrough': return createResearchBreakthroughEvent(eventDay);
        case 'technology_setback': return createTechnologySetbackEvent(eventDay);
        default: return createInnovationGrantEvent(eventDay, farmState);
    }
}

// --- Event Creation Helpers ---

function createInnovationGrantEvent(day, farmState) {
    const techCount = farmState?.researchedTechs?.length || 0;
    let grantAmount = 0;
    let message = '';
    if (techCount === 0) {
        if (Math.random() < 0.2) { grantAmount = 2000; message = `You received a small $${grantAmount} starter grant for farm innovation. Consider investing in research.`; }
        else { message = 'Your farm was not selected for an innovation grant due to lack of technological adoption.'; }
    } else if (techCount <= 1) { grantAmount = 5000; message = `You received a $${grantAmount} innovation grant for your initial research efforts.`; }
    else if (techCount <= 3) { grantAmount = 10000; message = `You received a $${grantAmount} innovation grant for farm research!`; }
    else if (techCount <= 5) { grantAmount = 15000; message = `You received a $${grantAmount} substantial innovation grant for your technological leadership!`; }
    else { grantAmount = 20000 + (techCount - 6) * 2000; message = `You received a major $${grantAmount} innovation grant for being at the cutting edge of agricultural technology!`; }

    return { type: 'technology', subType: 'innovation_grant', day, amount: grantAmount, message, isAlert: grantAmount > 0 };
}

function createResearchBreakthroughEvent(day) {
    const duration = Math.floor(Math.random() * 16) + 15;
    return {
        type: 'technology', subType: 'research_breakthrough', day, duration,
        discount: 0.3, message: `Research breakthrough! Technology costs reduced by 30% for the next ${duration} days.`, isAlert: true
    };
}

function createTechnologySetbackEvent(day) {
    const setbackAmount = Math.floor(Math.random() * 3000) + 2000;
    return {
        type: 'technology', subType: 'technology_setback', day, amount: setbackAmount,
        message: `Technology setback! Equipment malfunction has cost you $${setbackAmount} in repairs.`, isAlert: true
    };
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

export function scheduleDrought(day, baseProbability) {
    const severityRoll = Math.random();
    let severity, duration, baseMessage;
    if (severityRoll < 0.6) { severity = 'mild'; duration = Math.floor(Math.random() * 3) + 3; baseMessage = 'Drought conditions affecting your farm.'; }
    else if (severityRoll < 0.9) { severity = 'moderate'; duration = Math.floor(Math.random() * 4) + 5; baseMessage = 'Moderate drought conditions! Water levels dropping, crops stressed.'; }
    else { severity = 'severe'; duration = Math.floor(Math.random() * 5) + 7; baseMessage = 'Severe drought conditions! Water critically low, crops at high risk.'; }
    const climateModifier = Math.max(1.0, baseProbability / 0.05); // Increases duration with climate change
    duration = Math.max(1, Math.floor(duration * climateModifier)); // Ensure duration is at least 1
    const forecastMessage = 'Weather forecast: Dry conditions expected. Potential drought warning.';
    return { type: 'drought', day, severity, duration, message: baseMessage, forecastMessage, isAlert: severity !== 'mild' };
}

export function scheduleHeatwave(day) {
    const duration = Math.floor(Math.random() * 4) + 2; // 2-5 days
    const forecastMessage = 'Weather forecast: Extreme heat expected in the coming days.';
    return { type: 'heatwave', day, duration, message: 'Heatwave conditions! Crops experiencing heat stress.', forecastMessage, isAlert: true };
}

export function scheduleFrost(day) {
    const forecastMessage = 'Weather forecast: Temperatures expected to drop below freezing overnight.';
    return { type: 'frost', day, message: 'Frost warning! Young plants are vulnerable.', forecastMessage, isAlert: true };
}

function createMarketEvent(day, direction) {
    const validCrops = crops.filter(c => c.id !== 'empty');
    if (validCrops.length === 0) return null; // No crops to affect
    const cropIndex = Math.floor(Math.random() * validCrops.length);
    const targetCrop = validCrops[cropIndex];

    let changePercent, message, forecast, isAlert;
    if (direction === 'increase') {
        changePercent = 10 + Math.floor(Math.random() * 30);
        message = `Market update: ${targetCrop.name} prices have risen by ${changePercent}%.`;
        forecast = `Market news: Increased demand expected for ${targetCrop.name}.`;
        isAlert = false;
    } else { // decrease
        changePercent = 10 + Math.floor(Math.random() * 30);
        message = `Market update: ${targetCrop.name} prices have fallen by ${changePercent}%.`;
        forecast = `Market news: Market surplus expected for ${targetCrop.name}.`;
        isAlert = true;
    }
    return { type: 'market', day, direction, cropId: targetCrop.id, changePercent, message, forecastMessage: forecast, isAlert };
}

function createMarketOpportunityEvent(day) {
    const validCrops = crops.filter(c => c.id !== 'empty');
    if (validCrops.length === 0) return null;
    const cropIndex = Math.floor(Math.random() * validCrops.length);
    const targetCrop = validCrops[cropIndex];
    const bonusPercent = 30 + Math.floor(Math.random() * 30); // 30-60% bonus
    const duration = Math.floor(Math.random() * 10) + 5; // 5-15 days
    const message = `Market opportunity! ${targetCrop.name} prices temporarily increased by ${bonusPercent}% for ${duration} days!`;
    const forecast = `Market news: Special demand expected for ${targetCrop.name}.`;
    return { type: 'market', day, direction: 'opportunity', cropId: targetCrop.id, changePercent: bonusPercent, duration, message, forecastMessage: forecast, isAlert: true }; // Alert worthy
}

export function generatePolicyEvent(day, farmHealth, policyType) {
    const subsidyAmount = farmHealth > 60 ? 5000 : (farmHealth > 40 ? 3000 : 0); // Adjusted subsidy logic slightly
    const complianceCost = 3000;

    switch (policyType) {
        case 'water_restriction':
            return { type: 'policy', day, policyType, message: 'Water restriction policy enacted. Irrigation costs increased by 50%.', forecastMessage: 'Policy update: Water restrictions being considered.', isAlert: true, irrigationCostIncrease: 0.5, balanceChange: 0 };
        case 'environmental_subsidy':
             if (subsidyAmount > 0) {
                 return { type: 'policy', day, policyType, message: `You received a $${subsidyAmount} environmental subsidy!`, forecastMessage: 'Policy update: Environmental subsidies being discussed.', isAlert: false, balanceChange: subsidyAmount };
             } else {
                  // Don't generate a subsidy event if they don't qualify
                  return null; // Or maybe generate a different event? For now, just skip.
             }
        case 'new_regulations':
            return { type: 'policy', day, policyType, message: `New regulations require compliance upgrades costing $${complianceCost}.`, forecastMessage: 'Policy update: New farming regulations proposed.', isAlert: true, balanceChange: -complianceCost };
        default: // Fallback if type is invalid
            return null;
    }
}


// --- Event Application Functions ---

export function applyRainEvent(event, grid, waterReserve, techs = []) {
    let newWaterReserve = Math.min(100, waterReserve + event.waterIncrease);
    let soilDamage = 0;
    if (event.severity === 'heavy') {
        soilDamage = 1 + Math.random() * 2; // Base damage
    }

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            // Apply water increase to cells (maybe slightly less than reserve increase?)
            cell.applyEnvironmentalEffect('water-increase', event.waterIncrease * 0.8);
            // Apply soil damage if heavy rain
            if (soilDamage > 0) {
                let protection = 1.0;
                if (techs.includes('no_till_farming')) protection *= 0.5;
                if (techs.includes('cover_crop')) protection *= 0.7; // Cover crops also help
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
    const dailyFarmReserveLoss = 0.5 * severityFactor; // Base loss from reserve
    const dailyCellWaterLoss = 2 * severityFactor; // Higher loss within cell

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
                if (severityFactor > 1) { // Moderate or Severe
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
    let message = event.message; // Use continuing message by default
     if (!message || event.duration === nextDuration + 1) { // First day message
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
     if (!message || event.duration === nextDuration + 1) { // First day message
        message = "Heatwave conditions! Crops experiencing heat stress, water use increased, potential yield loss.";
     }

    return { waterReserve: newWaterReserve, message, skipped: false, continueEvent, nextDuration };
}

export function applyFrostEvent(event, grid, techs = []) {
    let frostProtection = 1.0;
    if (techs.includes('greenhouse')) frostProtection = 0.4; // Strong protection

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            if (cell.crop.id !== 'empty') {
                // More damage to younger plants (lower progress)
                const growthProtectionFactor = Math.min(1, cell.growthProgress / 50); // Full protection if > 50% grown
                const frostDamageBase = 5.0; // Base yield % points lost
                const effectiveDamage = frostDamageBase * (1 - growthProtectionFactor);
                cell.applyEnvironmentalEffect('yield-damage', effectiveDamage, frostProtection);
            }
        }
    }
    // Refined message
    const message = event.message || "Frost reported! Crops, especially young ones, may have suffered yield damage.";
    return { message };
}

export function applyMarketEvent(event, marketPrices, allCropsData) { // Pass allCropsData if needed
    const newMarketPrices = { ...marketPrices };
    const cropId = event.cropId;
    const currentPriceFactor = newMarketPrices[cropId] || 1.0; // Current factor relative to base
    let message = event.message || "Market conditions changed.";

    if (event.direction === 'increase') {
        newMarketPrices[cropId] = Math.min(2.5, currentPriceFactor * (1 + (event.changePercent / 100)));
    } else if (event.direction === 'decrease') {
        newMarketPrices[cropId] = Math.max(0.4, currentPriceFactor * (1 - (event.changePercent / 100)));
    } else if (event.direction === 'opportunity') {
        // Store original price and apply bonus temporarily? Or just boost it?
        // Let's just boost it for simplicity now. Need a mechanism to revert later.
        newMarketPrices[cropId] = Math.min(3.0, currentPriceFactor * (1 + (event.changePercent / 100)));
        // TODO: Need mechanism to end the market opportunity after event.duration
    }

     // Add price change details to message if not already present
     if (!message.includes('%')) {
         const newPricePercent = Math.round(newMarketPrices[cropId] * 100);
         message += ` ${cropId} price factor now ${newPricePercent}%.`;
     }


    return { marketPrices: newMarketPrices, message };
}

export function applyPolicyEvent(event, balance) {
    const newBalance = balance + (event.balanceChange || 0);
    // TODO: Implement irrigationCostIncrease effect from 'water_restriction'
    // This might require modifying where irrigation cost is accessed/calculated in game.js or strategies.js
    return { newBalance, message: event.message, balanceChange: event.balanceChange || 0 };
}

export function applyTechnologyEvent(event, balance, researchedTechs = []) {
    let newBalance = balance;
    let message = event.message || "Technology event occurred.";
    switch (event.subType) {
        case 'innovation_grant':
            newBalance += event.amount;
            break;
        case 'research_breakthrough':
             // Effect handled elsewhere (checking for active breakthrough when calculating research cost)
             // Need a way to track active temporary effects like this.
             // TODO: Add mechanism to track start/end day of research_breakthrough effect.
            break;
        case 'technology_setback':
            newBalance -= event.amount;
            break;
    }
    return { newBalance, message };
}
