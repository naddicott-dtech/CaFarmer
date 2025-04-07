/**
 * California Climate Farmer - Crop Definitions
 *
 * This file contains the data structures for all crop types in the game,
 * including their properties, growth parameters, and visual representation.
 */

// Exported crops data
export const crops = [
    {
        id: 'empty', name: 'Empty Plot', waterUse: 0, growthTime: 0, harvestValue: 0, color: '#e9e9e9',
        soilImpact: 0, fertilizerNeed: 0, basePrice: 0, waterSensitivity: 0, heatSensitivity: 0
    },
    { // Corn: Slightly increase harvest value
        id: 'corn', name: 'Corn', waterUse: 3.5, growthTime: 90, harvestValue: 90, color: '#ffd700', // Was 75
        soilImpact: -2, fertilizerNeed: 80, basePrice: 75, waterSensitivity: 1.1, heatSensitivity: 0.8
    },
    { // Lettuce: Faster growth, higher value
        id: 'lettuce', name: 'Lettuce', waterUse: 1.5, growthTime: 45, harvestValue: 150, color: '#90ee90', // Was 50 days, 120 value
        soilImpact: -1, fertilizerNeed: 60, basePrice: 120, waterSensitivity: 1.2, heatSensitivity: 1.3
    },
    { // Almonds: Increase value slightly to reflect high setup/water costs
        id: 'almonds', name: 'Almonds', waterUse: 4.5, growthTime: 240, harvestValue: 480, color: '#8b4513', // Was 450
        soilImpact: -1, fertilizerNeed: 100, basePrice: 450, waterSensitivity: 0.9, heatSensitivity: 0.7
    },
    { // Strawberries: Slightly faster, slightly higher value
        id: 'strawberries', name: 'Strawberries', waterUse: 2.5, growthTime: 55, harvestValue: 330, color: '#ff6b6b', // Was 60 days, 300 value
        soilImpact: -2, fertilizerNeed: 90, basePrice: 300, waterSensitivity: 1.0, heatSensitivity: 1.1
    },
    { // Grapes: Slightly increase value
        id: 'grapes', name: 'Grapes', waterUse: 3.0, growthTime: 180, harvestValue: 375, color: '#9370db', // Was 350
        soilImpact: -1, fertilizerNeed: 75, basePrice: 350, waterSensitivity: 0.8, heatSensitivity: 0.9
    }
    // Add more crops based on research later
];

// Helper function to find crop by ID
export function getCropById(id) {
    return crops.find(crop => crop.id === id) || crops[0]; // Default to empty plot if not found
}
