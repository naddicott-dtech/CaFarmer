/**
 * California Climate Farmer - Events System
 *
 * Contains event generation and handling logic for random events like weather,
 * market fluctuations, policy changes, and technology events.
 */

import { crops } from './crops.js';
import { formatCurrency } from './utils.js'; // Import for formatting messages

// --- Event Generation ---

export function generateRandomEvent(farmState) {
    // Base chance slightly higher
    if (Math.random() < 0.45) return null; // 55% chance event occurs

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

    const isEarlyGame = farmState.year <= 2;

    switch (selectedType) {
        case 'weather':
            return scheduleWeatherEvent(farmState.day, farmState.climate, farmState.season);
        case 'market':
            return scheduleMarketEvent(farmState.day);
        case 'policy':
             return schedulePolicyEvent(farmState.day, farmState.farmHealth, null, isEarlyGame);
        case 'technology':
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
    if (totalProbability <= 0) return scheduleRain(day + 5); // Fallback

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

    // Schedule event slightly sooner on average
    const eventDay = day + Math.floor(Math.random() * 15) + 3; // Was up to 20 days + 5

    switch (selectedType) {
        case 'rain': return scheduleRain(eventDay);
        case 'drought': return scheduleDrought(eventDay, climate.droughtProbability);
        case 'heatwave': return scheduleHeatwave(eventDay);
        case 'frost': return scheduleFrost(eventDay);
        default: return scheduleRain(eventDay);
    }
}

function scheduleMarketEvent(day) {
    const eventTypes = [ { id: 'price_increase', probability: 0.4 }, { id: 'price_decrease', probability: 0.4 }, { id: 'market_opportunity', probability: 0.2 }];
    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = eventTypes[0].id;
    for (const type of eventTypes) {
        cumulativeProbability += type.probability;
        if (roll < cumulativeProbability) { selectedType = type.id; break; }
    }
    // Schedule event slightly sooner on average
    const eventDay = day + Math.floor(Math.random() * 10) + 3; // Was up to 15 days + 5

    switch (selectedType) {
        case 'price_increase': return createMarketEvent(eventDay, 'increase');
        case 'price_decrease': return createMarketEvent(eventDay, 'decrease');
        case 'market_opportunity': return createMarketOpportunityEvent(eventDay);
        default: return createMarketEvent(eventDay, 'increase');
    }
}

export function schedulePolicyEvent(day, farmHealth, policyType = null, isEarlyGame = false) {
    const eventTypes = [ { id: 'water_restriction', probability: 0.4 }, { id: 'environmental_subsidy', probability: 0.3 }, { id: 'new_regulations', probability: 0.3 }];
    if (!policyType) {
        const roll = Math.random();
        let cumulativeProbability = 0;
        policyType = eventTypes[0].id;
        for (const type of eventTypes) { cumulativeProbability += type.probability; if (roll < cumulativeProbability) { policyType = type.id; break; } }
    }

    // Keep early game suppression for costly regulations
    if (isEarlyGame && policyType === 'new_regulations') {
         if (Math.random() < 0.4) { // 40% chance to switch
             console.log("[Event Balancing] Switching early costly policy event to subsidy.");
             policyType = 'environmental_subsidy';
         }
    }
    const eventDay = day + Math.floor(Math.random() * 15) + 5;
    return generatePolicyEvent(eventDay, farmHealth, policyType);
}

export function generateTechnologyEvent(day, farmState, isEarlyGame = false) {
    const eventTypes = [ { id: 'innovation_grant', probability: 0.5 }, { id: 'research_breakthrough', probability: 0.3 }, { id: 'technology_setback', probability: 0.2 } ];
    const roll = Math.random();
    let cumulativeProbability = 0;
    let selectedType = eventTypes[0].id;
    for (const type of eventTypes) { cumulativeProbability += type.probability; if (roll < cumulativeProbability) { selectedType = type.id; break; } }

    // Keep early game chance adjustments
    if (isEarlyGame) {
         if (selectedType === 'technology_setback' && Math.random() < 0.6) { // 60% chance to avoid
             console.log("[Event Balancing] Switching early tech setback to grant.");
             selectedType = 'innovation_grant';
         } else if (selectedType !== 'innovation_grant' && Math.random() < 0.1) { // 10% bonus chance for grant
             selectedType = 'innovation_grant';
         }
    }
    const eventDay = day + Math.floor(Math.random() * 20) + 5;

    switch (selectedType) {
        // Pass isEarlyGame flag to grant creation
        case 'innovation_grant': return createInnovationGrantEvent(eventDay, farmState, isEarlyGame);
        case 'research_breakthrough': return createResearchBreakthroughEvent(eventDay);
        case 'technology_setback': return createTechnologySetbackEvent(eventDay);
        default: return createInnovationGrantEvent(eventDay, farmState, isEarlyGame);
    }
}

// --- Event Creation Helpers ---
function createInnovationGrantEvent(day, farmState, isEarlyGame) {
    const techCount = farmState?.researchedTechs?.length || 0;
    let grantAmount = 0;
    let message = '';
    const earlyGrantChance = isEarlyGame ? 0.35 : 0.2; // Keep higher chance early
    const earlyGrantAmount = 3000;

    // --- TUNED GRANT AMOUNTS AND PROBABILITIES ---
    if (techCount === 0) {
        if (Math.random() < earlyGrantChance) {
            grantAmount = earlyGrantAmount;
            message = `You received a small ${formatCurrency(grantAmount)} starter grant for farm innovation. Consider investing in research.`;
        } else {
            message = 'Your farm was not selected for an innovation grant this time.'; // Less harsh message
        }
    } else if (techCount <= 1 && Math.random() < 0.4) { // Lower chance for next tier
         grantAmount = 5000;
         message = `You received a ${formatCurrency(grantAmount)} innovation grant for your initial research efforts.`;
    } else if (techCount <= 3 && Math.random() < 0.3) { // Even lower chance
         grantAmount = 8000; // Reduced amount (was 10k)
         message = `You received a ${formatCurrency(grantAmount)} innovation grant for farm research!`;
    } else if (techCount <= 5 && Math.random() < 0.2) { // Low chance
         grantAmount = 12000; // Reduced amount (was 15k)
         message = `You received a ${formatCurrency(grantAmount)} substantial innovation grant for your technological leadership!`;
    } else if (techCount > 5 && Math.random() < 0.15) { // Very low chance for major grant
         grantAmount = 15000 + (techCount - 6) * 1000; // Reduced scaling, capped lower (was 20k + 2k per)
         grantAmount = Math.min(grantAmount, 25000); // Hard cap on max grant
         message = `You received a major ${formatCurrency(grantAmount)} innovation grant for being at the cutting edge!`;
    } else {
         // Default: No grant this time if higher tiers didn't trigger
         message = 'Your farm was considered but not selected for a major innovation grant.';
    }

    // Ensure message exists even if no grant
    if (grantAmount === 0 && !message) {
         message = 'No innovation grants awarded this cycle.';
    }

    return { type: 'technology', subType: 'innovation_grant', day, amount: grantAmount, message, isAlert: grantAmount > 5000 }; // Alert only for larger grants
 }

function createResearchBreakthroughEvent(day) {
    const duration = Math.floor(Math.random() * 16) + 15;
    return { type: 'technology', subType: 'research_breakthrough', day, duration, discount: 0.3, message: `Research breakthrough! Technology costs reduced by 30% for the next ${duration} days.`, isAlert: true };
}

function createTechnologySetbackEvent(day) {
    // Base amount remains, scaling happens in game.js
    const setbackAmountBase = Math.floor(Math.random() * 3000) + 2000;
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

export function scheduleDrought(day, baseProbability) {
    const severityRoll = Math.random();
    let severity, duration, baseMessage;
    if (severityRoll < 0.6) { severity = 'mild'; duration = Math.floor(Math.random() * 3) + 3; baseMessage = 'Drought conditions affecting your farm.'; }
    else if (severityRoll < 0.9) { severity = 'moderate'; duration = Math.floor(Math.random() * 4) + 5; baseMessage = 'Moderate drought conditions! Water levels dropping, crops stressed.'; }
    else { severity = 'severe'; duration = Math.floor(Math.random() * 5) + 7; baseMessage = 'Severe drought conditions! Water critically low, crops at high risk.'; }
    const climateModifier = Math.max(1.0, baseProbability / 0.05);
    duration = Math.max(1, Math.floor(duration * climateModifier));
    const forecastMessage = 'Weather forecast: Dry conditions expected. Potential drought warning.';
    return { type: 'drought', day, severity, duration, message: baseMessage, forecastMessage, isAlert: severity !== 'mild' };
}

export function scheduleHeatwave(day) {
    const duration = Math.floor(Math.random() * 4) + 2;
    const forecastMessage = 'Weather forecast: Extreme heat expected in the coming days.';
    return { type: 'heatwave', day, duration, message: 'Heatwave conditions! Crops experiencing heat stress.', forecastMessage, isAlert: true };
}

export function scheduleFrost(day) {
    const forecastMessage = 'Weather forecast: Temperatures expected to drop below freezing overnight.';
    return { type: 'frost', day, message: 'Frost warning! Young plants are vulnerable.', forecastMessage, isAlert: true };
}

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

export function generatePolicyEvent(day, farmHealth, policyType) {
    const subsidyAmount = farmHealth > 60 ? 5000 : (farmHealth > 40 ? 3000 : 0);
    const complianceCostBase = 3000; // Base cost before scaling
    switch (policyType) {
        case 'water_restriction': return { type: 'policy', policyType, day, message: 'Water restriction policy enacted. Irrigation costs increased by 50%.', forecastMessage: 'Policy update: Water restrictions being considered.', isAlert: true, irrigationCostIncrease: 0.5, balanceChange: 0 };
        case 'environmental_subsidy': return subsidyAmount > 0 ? { type: 'policy', policyType, day, message: `You received a ${formatCurrency(subsidyAmount)} environmental subsidy!`, forecastMessage: 'Policy update: Environmental subsidies being discussed.', isAlert: false, balanceChange: subsidyAmount } : null;
        // Pass the *base* cost for scaling later
        case 'new_regulations': return { type: 'policy', policyType, day, message: `New regulations require compliance upgrades.`, baseCost: complianceCostBase, forecastMessage: 'Policy update: New farming regulations proposed.', isAlert: true, balanceChange: -complianceCostBase }; // Pass negative balanceChange representing base cost
        default: return null;
    }
}


// --- Event Application Functions ---
// NOTE: No changes needed in the 'apply' functions here compared to the previously provided versions.
// Monetary scaling is handled in game.js processPendingEvents.
// These functions return the calculated changes/state, which game.js then applies.

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
                // Add other protections if implemented (e.g., cover_crop tech)
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
    const dailyWaterLoss = 2; // Base farm reserve loss per day
    let heatProtection = 1.0;
    if (techs.includes('greenhouse')) heatProtection = 0.6;
    if (techs.includes('silvopasture')) heatProtection *= 0.85;
    newWaterReserve = Math.max(0, newWaterReserve - (dailyWaterLoss * heatProtection));
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            if (cell.crop.id !== 'empty') {
                // Apply increased water use within cell
                cell.applyEnvironmentalEffect('water-decrease', dailyWaterLoss * 1.5, heatProtection);
                // Apply yield damage based on heat sensitivity
                const crop = cell.crop; // Assumes cell.crop has full data
                const heatSensitivityFactor = crop.heatSensitivity || 1.0;
                const heatDamageMagnitude = 2.0; // Base damage factor
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
                // Young plants are more vulnerable
                const growthProtectionFactor = Math.min(1, cell.growthProgress / 50); // More protection as it grows
                const frostDamageBase = 5.0; // Base yield damage %
                const effectiveDamage = frostDamageBase * (1 - growthProtectionFactor);
                cell.applyEnvironmentalEffect('yield-damage', effectiveDamage, frostProtection);
            }
        }
    }
    const message = event.message || "Frost reported! Crops, especially young ones, may have suffered yield damage.";
    return { message };
}

export function applyMarketEvent(event, marketPrices, allCropsData) {
    const newMarketPrices = { ...marketPrices };
    const cropId = event.cropId;
    const currentPriceFactor = newMarketPrices[cropId] || 1.0;
    let message = event.message || "Market conditions changed.";
    if (event.direction === 'increase') {
        newMarketPrices[cropId] = Math.min(2.5, currentPriceFactor * (1 + (event.changePercent / 100)));
    } else if (event.direction === 'decrease') {
        newMarketPrices[cropId] = Math.max(0.4, currentPriceFactor * (1 - (event.changePercent / 100)));
    } else if (event.direction === 'opportunity') {
        // Opportunities apply a temporary boost - maybe handle this differently?
        // For now, treat like increase but with duration. Duration needs handling in game.js or here.
        // Let's assume game.js handles the temporary nature for now.
        newMarketPrices[cropId] = Math.min(3.0, currentPriceFactor * (1 + (event.changePercent / 100)));
    }
     // Update message if not fully descriptive
     if (!message.includes('%')) {
         const newPricePercent = Math.round(newMarketPrices[cropId] * 100);
         message += ` ${cropId} price factor now ${newPricePercent}%.`;
     }
    return { marketPrices: newMarketPrices, message };
}

// Returns potential changes; game.js applies them and scales costs
export function applyPolicyEvent(event, balance) {
    // Returns the *base* balance change; scaling happens in game.js
    return { newBalance: balance + (event.balanceChange || 0), message: event.message, balanceChange: event.balanceChange || 0 };
}

// Returns potential changes; game.js applies them and scales costs
export function applyTechnologyEvent(event, balance, researchedTechs = []) {
    let newBalance = balance;
    let message = event.message || "Technology event occurred.";
    // Return base amount change for grant/setback; game.js applies/scales
    switch (event.subType) {
        case 'innovation_grant': newBalance += event.amount; break;
        case 'research_breakthrough': /* Effect handled elsewhere */ break;
        case 'technology_setback': newBalance -= event.amount; break; // Pass base amount back
    }
    // Return base amount for grant/setback cost
    const balanceChange = event.subType === 'innovation_grant' ? event.amount : (event.subType === 'technology_setback' ? -event.amount : 0);
    return { newBalance, message, balanceChange };
}
