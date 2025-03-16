/**
 * California Climate Farmer - Events System
 * 
 * This file handles the generation, scheduling, and application of game events
 * such as weather, market fluctuations, policies, etc.
 */

import { getCropById } from './crops.js';
import { getTechEffectValue } from './technology.js';

// Event generation probability config
export const EVENT_PROBABILITIES = {
    rainfall: 0.4,
    drought: 0.05, // Base probability, will be affected by climate change
    heatwave: 0.08, // Base probability, will be affected by climate change
    market: 0.2,
    policy: 0.1,
    technology: 0.15
};

// Generate a random event based on current conditions
export function generateRandomEvent(climate, day) {
    const eventTypes = [
        { type: 'rainfall', probability: EVENT_PROBABILITIES.rainfall },
        { type: 'drought', probability: climate.droughtProbability * 0.5 }, // Reduced by 50%
        { type: 'heatwave', probability: climate.heatwaveProbability * 0.7 }, // Reduced by 30%
        { type: 'market', probability: EVENT_PROBABILITIES.market },
        { type: 'policy', probability: EVENT_PROBABILITIES.policy },
        { type: 'technology', probability: EVENT_PROBABILITIES.technology }
    ];

    // Normalize probabilities
    let totalProb = 0;
    eventTypes.forEach(e => totalProb += e.probability);
    eventTypes.forEach(e => e.probability /= totalProb);

    // Cumulative probability
    let cumProb = 0;
    for (let i = 0; i < eventTypes.length; i++) {
        eventTypes[i].cumulativeProb = cumProb + eventTypes[i].probability;
        cumProb = eventTypes[i].cumulativeProb;
    }

    // Select event type
    const rand = Math.random();
    let selectedType = eventTypes[0].type;

    for (let i = 0; i < eventTypes.length; i++) {
        if (rand <= eventTypes[i].cumulativeProb) {
            selectedType = eventTypes[i].type;
            break;
        }
    }

    // Generate the specific event
    switch (selectedType) {
        case 'rainfall':
            return scheduleRain(day);
        case 'drought':
            return scheduleDrought(day, climate.droughtProbability);
        case 'heatwave':
            return scheduleHeatwave(day);
        case 'market':
            return scheduleMarketEvent(day);
        case 'policy':
            return schedulePolicyEvent(day);
        case 'technology':
            return scheduleTechnologyEvent(day);
        default:
            return null;
    }
}

// Schedule a rain event
export function scheduleRain(day) {
    const intensity = Math.random() < 0.3 ? 'heavy' : 'moderate';
    
    return {
        type: 'rain',
        intensity,
        day: day + Math.floor(Math.random() * 10),
        message: `Weather forecast: ${intensity} rain expected soon.`
    };
}

// Schedule a drought event
export function scheduleDrought(day, baseProbability) {
    // Make duration more reasonable - between 3-10 days
    const duration = Math.floor(3 + Math.random() * 7);
    
    return {
        type: 'drought',
        duration,
        severity: Math.min(0.7, 0.3 + (baseProbability * 2)), // Reduce max severity
        day: day + Math.floor(Math.random() * 10),
        message: 'Climate alert: Drought conditions forming in the region.',
        isAlert: true
    };
}

// Schedule a heatwave event
export function scheduleHeatwave(day) {
    // Heatwaves are shorter but more intense than droughts
    const duration = Math.floor(2 + Math.random() * 4); // 2-5 days
    
    return {
        type: 'heatwave',
        duration,
        day: day + Math.floor(Math.random() * 5), // More immediate than drought
        message: 'Weather forecast: Extreme heat expected soon.',
        isAlert: true
    };
}

// Schedule a frost event
export function scheduleFrost(day) {
    return {
        type: 'frost',
        day: day + Math.floor(Math.random() * 10),
        message: 'Weather forecast: Frost conditions expected soon.'
    };
}

// Schedule a market event
export function scheduleMarketEvent(day) {
    const events = [
        { name: 'Price Surge', effect: 'increase', magnitude: 1.5 },
        { name: 'Market Crash', effect: 'decrease', magnitude: 0.6 },
        { name: 'Export Opportunity', effect: 'increase', magnitude: 1.3 },
        { name: 'Trade Tariff', effect: 'decrease', magnitude: 0.8 }
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    // Note: The actual crop ID is determined when the event is processed based on available crops
    
    return {
        type: 'market',
        eventName: event.name,
        effect: event.effect,
        magnitude: event.magnitude,
        day: day + Math.floor(Math.random() * 10),
        message: `Market news: ${event.name} expected to affect crop prices.`
    };
}

// Schedule a policy event
export function schedulePolicyEvent(day) {
    const events = [
        { name: 'Water Restriction', effect: 'water_cost', magnitude: 1.5 },
        { name: 'Environmental Subsidy', effect: 'subsidy', magnitude: 5000 },
        { name: 'New Regulations', effect: 'compliance_cost', magnitude: 3000 },
        { name: 'Tax Break', effect: 'tax_refund', magnitude: 4000 }
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    
    return {
        type: 'policy',
        policyName: event.name,
        effect: event.effect,
        magnitude: event.magnitude,
        day: day + Math.floor(Math.random() * 20),
        message: `Policy update: New ${event.name} policy being considered by local government.`
    };
}

// Schedule a technology event
export function scheduleTechnologyEvent(day) {
    const events = [
        { name: 'Research Breakthrough', effect: 'research_discount', magnitude: 0.7 },
        { name: 'Innovation Grant', effect: 'research_bonus', magnitude: 10000 },
        { name: 'Climate Tech Expo', effect: 'research_options', magnitude: 2 }
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    
    return {
        type: 'technology',
        techName: event.name,
        effect: event.effect,
        magnitude: event.magnitude,
        day: day + Math.floor(Math.random() * 15),
        message: `Technology news: ${event.name} event announced.`
    };
}

// Apply rain event to a grid of cells
export function applyRainEvent(event, grid, waterReserve, techs) {
    const isHeavy = event.intensity === 'heavy';
    const result = {
        message: '',
        waterReserve: waterReserve
    };

    // Increase water levels for all cells
    grid.forEach(row => {
        row.forEach(cell => {
            // Increased water from rain
            const waterIncrease = isHeavy ? 30 : 15;
            cell.waterLevel = Math.min(100, cell.waterLevel + waterIncrease);

            // Heavy rain affects soil (erosion) if no erosion protection
            if (isHeavy && !techs.includes('no_till_farming')) {
                cell.soilHealth = Math.max(10, cell.soilHealth - 5);
            }
        });
    });

    // Increase water reserve
    result.waterReserve = Math.min(100, waterReserve + (isHeavy ? 20 : 10));

    // Create result message
    result.message = isHeavy
        ? 'Heavy rainfall has increased water levels but may have caused soil erosion.'
        : 'Moderate rainfall has increased water levels across your farm.';

    // Additional message for technology impact
    if (techs.includes('no_till_farming') && isHeavy) {
        result.message += ' No-till farming practices have prevented erosion from heavy rain.';
    }
    
    return result;
}

// Apply drought event to a grid of cells
export function applyDroughtEvent(event, grid, waterReserve, techs) {
    // Skip drought effects if water reserve is already too low
    if (waterReserve <= 5) {
        return {
            message: 'Water reserves too low to process drought event.',
            waterReserve: waterReserve,
            skipped: true
        };
    }

    // Use the event's severity if available, otherwise calculate it
    const severity = event.severity || 0.5;

    // Apply drought resistance technology if available
    let protection = 1.0;
    if (techs.includes('drought_resistant')) {
        protection = getTechEffectValue('droughtResistance', techs, 1.0);
    }

    // Reduce water levels gradually
    grid.forEach(row => {
        row.forEach(cell => {
            // Reduce water decrease to be very gradual - only 2% per day 
            const waterDecrease = Math.round(2 * severity * protection);
            cell.waterLevel = Math.max(0, cell.waterLevel - waterDecrease);

            // Very minimal impact on expected yield
            if (cell.crop.id !== 'empty') {
                const yieldImpact = Math.round(1 * severity * protection);
                cell.expectedYield = Math.max(10, cell.expectedYield - yieldImpact);
            }
        });
    });

    // Decrease water reserve very gradually (only 3% per day maximum)
    const waterReserveDecrease = Math.min(3, Math.round(3 * severity * protection));
    const newWaterReserve = Math.max(0, waterReserve - waterReserveDecrease);

    // Create result message
    let message = 'Drought conditions affecting your farm. Water levels are dropping slowly.';

    // If protection technology is active
    if (protection < 1.0) {
        message += ' Your drought-resistant varieties are helping mitigate the impact.';
    }

    return {
        message,
        waterReserve: newWaterReserve,
        continueEvent: event.duration > 1 && newWaterReserve > 10,
        nextDuration: event.duration - 1,
        severity: severity
    };
}

// Apply heatwave event to a grid of cells
export function applyHeatwaveEvent(event, grid, waterReserve, techs) {
    // Skip heatwave effects if water reserve is already too low
    if (waterReserve <= 5) {
        return {
            message: 'Water reserves too low to process heatwave event.',
            waterReserve: waterReserve,
            skipped: true
        };
    }

    // Apply heat resistance technology if available
    let protection = 1.0;
    if (techs.includes('silvopasture')) {
        protection = getTechEffectValue('heatResistance', techs, 1.0);
    } else if (techs.includes('greenhouse')) {
        protection = getTechEffectValue('weatherProtection', techs, 1.0);
    }

    // Heatwaves primarily damage crops based on heat sensitivity
    // and increase water evaporation as a secondary effect
    grid.forEach(row => {
        row.forEach(cell => {
            // Water evaporation is modest - just 1% per day
            const waterLoss = Math.round(1 * protection); 
            cell.waterLevel = Math.max(0, cell.waterLevel - waterLoss);

            // The main impact of heatwaves is on crop health/yield
            if (cell.crop.id !== 'empty') {
                // Use the crop's specific heat sensitivity - reduced impact to 3% per day max
                const heatImpact = Math.round(3 * cell.crop.heatSensitivity * protection);
                cell.expectedYield = Math.max(10, cell.expectedYield - heatImpact);
            }
        });
    });

    // Even more modest impact on water reserve - maximum 2% per day
    const waterReserveDecrease = Math.min(2, Math.round(2 * protection));
    const newWaterReserve = Math.max(0, waterReserve - waterReserveDecrease);

    // Create result message
    let message = 'Heatwave conditions! Crops are experiencing heat stress and growth is slowed.';

    // If protection technology is active
    if (protection < 1.0) {
        if (techs.includes('silvopasture')) {
            message += ' Your silvopasture technique is providing shade and reducing heat damage.';
        } else if (techs.includes('greenhouse')) {
            message += ' Your greenhouse technology is providing climate control against the heat.';
        }
    }

    return {
        message,
        waterReserve: newWaterReserve,
        continueEvent: event.duration > 1 && newWaterReserve > 10,
        nextDuration: event.duration - 1
    };
}

// Apply frost event to a grid of cells
export function applyFrostEvent(event, grid, techs) {
    // Apply greenhouse protection if available
    let protection = 1.0;
    if (techs.includes('greenhouse')) {
        protection = getTechEffectValue('weatherProtection', techs, 1.0);
    }
    
    // Apply frost damage to cells
    grid.forEach(row => {
        row.forEach(cell => {
            if (cell.crop.id !== 'empty') {
                // Frost damage based on growth stage (young plants more vulnerable)
                const frostDamage = cell.growthProgress < 50 ? 30 : 15;
                
                // Apply protection
                const yieldImpact = Math.round(frostDamage * protection);
                cell.expectedYield = Math.max(10, cell.expectedYield - yieldImpact);
            }
        });
    });
    
    // Create result message
    let message = 'Frost has affected your crops! Young plants are particularly vulnerable.';

    // If greenhouse technology is active
    if (techs.includes('greenhouse')) {
        message += ' Your greenhouse technology has reduced the frost damage.';
    }
    
    return { message };
}

// Apply market event to market prices
export function applyMarketEvent(event, marketPrices, crops) {
    // Select a random crop if not specified in the event
    const cropId = event.cropId || crops.find(c => c.id !== 'empty').id;
    const crop = getCropById(cropId);
    
    if (!crop || crop.id === 'empty') return { message: 'Market event failed to process.' };
    
    // Clone the market prices to avoid direct mutation
    const newMarketPrices = { ...marketPrices };
    
    // Apply market effect
    if (event.effect === 'increase') {
        newMarketPrices[crop.id] *= event.magnitude;
    } else {
        newMarketPrices[crop.id] *= event.magnitude;
    }
    
    // Clamp to reasonable range
    newMarketPrices[crop.id] = Math.max(0.5, Math.min(2.5, newMarketPrices[crop.id]));
    
    const direction = event.effect === 'increase' ? 'risen' : 'fallen';
    const percentChange = Math.round(Math.abs(1 - event.magnitude) * 100);
    
    return {
        message: `Market update: ${crop.name} prices have ${direction} by ${percentChange}%.`,
        marketPrices: newMarketPrices,
        affectedCrop: crop.id
    };
}

// Apply policy event
export function applyPolicyEvent(event, balance) {
    let message = '';
    let balanceChange = 0;
    
    switch (event.effect) {
        case 'water_cost':
            message = `Water restriction policy enacted. Irrigation costs have increased by ${Math.round((event.magnitude - 1) * 100)}%.`;
            break;
        case 'subsidy':
            balanceChange = event.magnitude;
            message = `You received a $${event.magnitude.toLocaleString()} environmental subsidy!`;
            break;
        case 'compliance_cost':
            balanceChange = -event.magnitude;
            message = `New regulations have cost you $${event.magnitude.toLocaleString()} in compliance expenses.`;
            break;
        case 'tax_refund':
            balanceChange = event.magnitude;
            message = `You received a $${event.magnitude.toLocaleString()} agricultural tax refund!`;
            break;
    }
    
    return {
        message,
        balanceChange,
        newBalance: balance + balanceChange
    };
}

// Apply technology event
export function applyTechnologyEvent(event, balance) {
    let message = '';
    let balanceChange = 0;
    
    switch (event.effect) {
        case 'research_discount':
            message = `Research breakthrough! Technology costs reduced by ${Math.round((1 - event.magnitude) * 100)}% for the next month.`;
            break;
        case 'research_bonus':
            balanceChange = event.magnitude;
            message = `You received a $${event.magnitude.toLocaleString()} innovation grant for farm research!`;
            break;
        case 'research_options':
            message = `Climate tech expo: New research opportunities may become available soon.`;
            break;
    }
    
    return {
        message,
        balanceChange,
        newBalance: balance + balanceChange
    };
}
