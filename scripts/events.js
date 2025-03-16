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
    if (techs.includes('no_till_farming')
