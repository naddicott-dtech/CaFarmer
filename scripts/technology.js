/**
 * California Climate Farmer - Technology Tree
 *
 * This file contains the technology tree definitions and related helper functions
 * for researching and applying technologies.
 */

// Exported technology tree data
export const technologies = [
    {
        id: 'drip_irrigation',
        name: 'Drip Irrigation',
        description: 'Reduces water usage by 20% and improves crop health',
        cost: 22000, // ADJUSTED: Was 25000
        researched: false,
        effects: {
            waterEfficiency: 1.2, // Represents 20% less water needed effectively
            cropHealth: 1.05 // Smaller health boost
        },
        prerequisites: []
    },
    {
        id: 'soil_sensors',
        name: 'Soil Sensors',
        description: 'Monitors soil health and water levels in real-time',
        cost: 12000, // ADJUSTED: Was 15000
        researched: false,
        effects: {
            soilInfo: true, // Enables UI display or better decisions
            waterEfficiency: 1.05 // Slight optimization
        },
        prerequisites: []
    },
    {
        id: 'greenhouse',
        name: 'Greenhouse Technology',
        description: 'Protects crops from extreme weather events',
        cost: 40000,
        researched: false,
        effects: {
            weatherProtection: 0.5, // Reduces impact of frost/heat by 50%
            pestResistance: 0.8 // Also reduces pest pressure somewhat
        },
        prerequisites: []
    },
    {
        id: 'ai_irrigation',
        name: 'AI-Driven Irrigation',
        description: 'Optimizes water use based on weather forecasts and crop needs',
        cost: 50000,
        researched: false,
        effects: {
            waterEfficiency: 1.15, // Further 15% optimization on top of drip/sensors
            cropHealth: 1.05
        },
        prerequisites: ['drip_irrigation', 'soil_sensors']
    },
    {
        id: 'drought_resistant',
        name: 'Drought-Resistant Varieties',
        description: 'Crop varieties that can thrive with less water',
        cost: 35000,
        researched: false,
        effects: {
            droughtResistance: 0.7, // Reduces impact of drought event by 30%
            waterEfficiency: 1.1 // Base passive water use slightly lower
        },
        prerequisites: []
    },
    {
        id: 'precision_drones',
        name: 'Precision Agriculture Drones',
        description: 'Monitor crops and apply fertilizer/pesticides precisely where needed',
        cost: 45000,
        researched: false,
        effects: {
            fertilizerEfficiency: 1.2, // Apply fertilizer more effectively (yield boost/less needed)
            pestControlEfficiency: 1.2, // Reduces pest pressure buildup?
            cropHealth: 1.05
        },
        prerequisites: ['soil_sensors']
    },
    {
        id: 'renewable_energy',
        name: 'Renewable Energy Systems',
        description: 'Solar and wind power to reduce energy costs (if modeled)',
        cost: 55000,
        researched: false,
        effects: {
            energyCostFactor: 0.7 // Reduces overhead/pumping costs if implemented
        },
        prerequisites: []
    },
    {
        id: 'no_till_farming',
        name: 'No-Till Farming',
        description: 'Improves soil health and reduces erosion',
        cost: 18000, // ADJUSTED: Was 20000
        researched: false,
        effects: {
            soilHealthRegen: 0.02, // Adds small passive soil health regen daily
            erosionReduction: 0.8 // Reduces erosion event impact
        },
        prerequisites: []
    },
    {
        id: 'silvopasture',
        name: 'Silvopasture',
        description: 'Integrating trees with pasture for shade and water retention',
        cost: 30000,
        researched: false,
        effects: {
            waterRetention: 1.1, // Improves cell water holding capacity slightly?
            heatResistance: 0.85, // Reduces heatwave impact by 15%
            soilHealthRegen: 0.01
        },
        prerequisites: ['no_till_farming'] // Requires no-till knowledge first?
    }
    // Consider adding Cover Crops as a researchable tech/practice
];

// Create a deep copy of the technology tree
export function createTechnologyTree() {
    // Ensure effects are copied properly if they are objects
    return JSON.parse(JSON.stringify(technologies));
}

// Check if prerequisites for a technology are met
export function checkTechPrerequisites(tech, researchedTechs) {
    if (!tech || tech.researched) return false; // Check if tech exists
    if (!tech.prerequisites || tech.prerequisites.length === 0) return true;

    return tech.prerequisites.every(prereqId => {
        return researchedTechs.includes(prereqId);
    });
}

// Get combined effect value for a particular effect from researched technologies
// MODIFIED: Needs the full tech definitions to apply effects correctly
export function getTechEffectValue(effectName, researchedTechs, allTechs, defaultValue = 1.0) {
    let value = defaultValue;
    // Define how effects combine (multiplicative for factors, additive for flat bonuses?)
    let additiveBonus = 0;

    allTechs.forEach(tech => {
        if (researchedTechs.includes(tech.id) && tech.effects && tech.effects[effectName] !== undefined) {
            const effectValue = tech.effects[effectName];

            // Apply effects based on name convention or type
            if (effectName.includes('Efficiency') || effectName.includes('Retention') || effectName.includes('Health') || effectName.includes('Factor')) {
                // Multiplicative factors (e.g., 1.2 means 20% better)
                value *= effectValue;
            } else if (effectName.includes('Resistance') || effectName.includes('Protection') || effectName.includes('Reduction')) {
                // Multiplicative reduction factors (e.g., 0.8 means 20% less impact)
                value *= effectValue;
            } else if (effectName.includes('Regen') || effectName.includes('Boost')) {
                 // Additive bonuses (e.g., flat soil regen rate)
                 additiveBonus += effectValue;
            } else if (typeof effectValue === 'boolean') {
                 // Boolean flags (like soilInfo) - handle specifically where needed
                 // For a generic getter, maybe return true if any tech provides it?
                 if(effectValue === true) value = true;
            }
            // Add more specific logic if needed for other effect types
        }
    });

     // Apply additive bonuses after multiplying factors
     if (typeof value === 'number') {
         value += additiveBonus;
     } else if (value === true && additiveBonus > 0) {
         // Handle combining boolean true with an additive bonus if that makes sense
         // For now, just return true if boolean flag was set
     }


    // Ensure value doesn't go below zero for factors/rates unless intended
    if (typeof value === 'number' && !effectName.includes('Cost') /* allow negative costs? */) {
         value = Math.max(0, value);
    }


    return value;
}
