/**
 * California Climate Farmer - Crop Definitions
 *
 * This file contains the data structures for all crop types in the game,
 * including their properties, growth parameters, and visual representation.
 */

// Exported crops data
export const crops = [
    {
        id: 'empty',            // Unique identifier
        name: 'Empty Plot',     // Display name
        color: '#cccccc',       // Neutral color (light grey)
        waterUse: 0,            // No active crop water use (evaporation handled in cell.update if needed)
        growthTime: 0,          // Not applicable
        harvestValue: 0,        // No harvest
        basePrice: 0,           // Cannot be planted explicitly (cost is 0)
        soilImpact: 0,          // Specific impact is zero; degradation/regen handled by empty plot logic
        fertilizerNeed: 0,      // Not applicable
        waterSensitivity: 0,    // Not applicable
        heatSensitivity: 0     // Not applicable
    },
    { // Corn: Keep value high
        id: 'corn', name: 'Corn', waterUse: 3.5, growthTime: 90, harvestValue: 160, color: '#ffd700',
        soilImpact: -2, fertilizerNeed: 80, basePrice: 75, waterSensitivity: 1.1, heatSensitivity: 0.8
    },
    { // Lettuce: Still valuable, slightly less extreme
        id: 'lettuce', name: 'Lettuce', waterUse: 1.5, growthTime: 40, harvestValue: 260, color: '#90ee90', // Was 280 (prev 300)
        soilImpact: -1, fertilizerNeed: 60, basePrice: 120, waterSensitivity: 1.2, heatSensitivity: 1.3
    },
    { // Almonds: Keep moderate value
        id: 'almonds', name: 'Almonds', waterUse: 4.5, growthTime: 240, harvestValue: 550, color: '#8b4513',
        soilImpact: -1, fertilizerNeed: 100, basePrice: 450, waterSensitivity: 0.9, heatSensitivity: 0.7
    },
    { // Strawberries: Still valuable, slightly less extreme
        id: 'strawberries', name: 'Strawberries', waterUse: 2.5, growthTime: 50, harvestValue: 420, color: '#ff6b6b', // Was 450 (prev 500)
        soilImpact: -2, fertilizerNeed: 90, basePrice: 300, waterSensitivity: 1.0, heatSensitivity: 1.1
    },
    { // Grapes: Keep higher value
        id: 'grapes', name: 'Grapes', waterUse: 3.0, growthTime: 180, harvestValue: 500, color: '#9370db',
        soilImpact: -1, fertilizerNeed: 75, basePrice: 350, waterSensitivity: 0.8, heatSensitivity: 0.9
    }
];

// Helper function to find crop by ID
export function getCropById(id) {
    return crops.find(crop => crop.id === id) || crops[0];
}
