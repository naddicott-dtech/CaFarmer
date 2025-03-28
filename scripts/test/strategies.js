/**
 * California Climate Farmer - Test Strategies
 *
 * Implements automated farming strategies for headless testing.
 * Assigns a strategy function to game.strategyTick.
 */

import { crops } from '../crops.js'; // Verify path is correct

console.log('Test strategies module loaded');

// Main setup function called by TestHarness
export function setupTestStrategy(game, strategyId) {
    console.log(`Setting up test strategy: ${strategyId}`);
    game.logger.log(`Applying strategy: ${strategyId}`, 1);

    // Assign the appropriate update function to the game's strategyTick hook
    switch (strategyId) {
        case 'monoculture':
            game.strategyTick = updateMonocultureStrategy;
            setupMonocultureInitial(game); // Perform initial planting etc.
            break;
        case 'diverse':
            game.strategyTick = updateDiverseCropsStrategy;
            setupDiverseCropsInitial(game);
            break;
        case 'tech-focus':
            game.strategyTick = updateTechFocusStrategy;
            setupTechFocusInitial(game);
            break;
        case 'water-saving':
            game.strategyTick = updateWaterSavingStrategy;
            setupWaterSavingInitial(game);
            break;
        case 'no-action':
            game.strategyTick = null; // No recurring action needed
            game.logger.log(`No action strategy applied - farm runs passively.`, 1);
            break;
        default:
            game.logger.log(`Unknown strategy ID: ${strategyId}. Applying no-action.`, 0);
            game.strategyTick = null;
    }
}

// --- Initial Setup Functions ---

function setupMonocultureInitial(game) {
    const cropId = 'corn';
    game.logger.log(`Monoculture Initial: Planting ${cropId} everywhere.`, 2);
    let plantedCount = 0;
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            // Use game's method - respects balance etc.
            if (game.plantCrop(row, col, cropId)) {
                plantedCount++;
            }
        }
    }
     game.logger.log(`Monoculture Initial: Planted ${plantedCount} ${cropId} plots. Initial Balance: $${game.balance.toLocaleString()}`, 1);
}

function setupDiverseCropsInitial(game) {
    game.logger.log(`Diverse Crops Initial: Planting various crops.`, 2);
    const cropIds = crops.filter(c => c.id !== 'empty').map(c => c.id);
    if (cropIds.length === 0) {
         game.logger.log("No crops defined (excluding empty)!", 0);
         return;
    }
    let counts = {};
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cropIndex = (row + col) % cropIds.length;
            const cropId = cropIds[cropIndex];
            if (game.plantCrop(row, col, cropId)) {
                counts[cropId] = (counts[cropId] || 0) + 1;
            }
        }
    }
     game.logger.log(`Diverse Crops Initial: Planted ${JSON.stringify(counts)}. Initial Balance: $${game.balance.toLocaleString()}`, 1);
}

function setupTechFocusInitial(game) {
     game.logger.log(`Tech Focus Initial: Planting initial income crops.`, 2);
     const incomeCrop = 'lettuce'; // Fast growing
     let plantedCount = 0;
     // Plant only a portion initially to save funds for research
     for (let row = 0; row < Math.ceil(game.gridSize / 2); row++) {
        for (let col = 0; col < Math.ceil(game.gridSize / 2); col++) {
             if (game.plantCrop(row, col, incomeCrop)) {
                 plantedCount++;
             }
        }
     }
     game.logger.log(`Tech Focus Initial: Planted ${plantedCount} ${incomeCrop}. Initial Balance: $${game.balance.toLocaleString()}`, 1);
}

function setupWaterSavingInitial(game) {
     game.logger.log(`Water Saving Initial: Planting water-efficient crops.`, 2);
     let counts = {};
     // Find crops with lower water use - refine this logic based on actual data needs
     const waterEfficient = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0).map(c => c.id);
     // Fallback if no crops match the criteria
     const targetCrops = waterEfficient.length > 0 ? waterEfficient : ['grapes', 'lettuce']; // grapes/lettuce as fallback

     if (targetCrops.length === 0) { game.logger.log("No water efficient crops defined for setup!", 0); return; }

     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
             const cropIndex = (row * game.gridSize + col) % targetCrops.length;
             const cropId = targetCrops[cropIndex];
             if (game.plantCrop(row, col, cropId)) {
                 counts[cropId] = (counts[cropId] || 0) + 1;
             }
        }
     }
     game.logger.log(`Water Saving Initial: Planted ${JSON.stringify(counts)}. Initial Balance: $${game.balance.toLocaleString()}`, 1);
}


// --- Strategy Update Functions (Called each tick via game.strategyTick) ---

function updateMonocultureStrategy(game) {
    const cropId = 'corn'; // The crop for this strategy

    // Only perform actions periodically (e.g., every 3 days) to reduce overhead/log spam
    if (game.day % 3 !== 0) return;

    let harvested = 0, planted = 0, irrigated = 0, fertilized = 0;

    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];

            // Harvest if ready
            if (cell.harvestReady) {
                if (game.harvestCell(row, col)) harvested++;
            }
            // Plant if empty (after potential harvest)
            // Check cell again in case harvest just happened
            const currentCellState = game.grid[row][col]; // Re-fetch cell state
            if (currentCellState.crop.id === 'empty') {
                if (game.plantCrop(row, col, cropId)) planted++;
            }
            // Irrigate if needed (and not empty)
            else if (!currentCellState.irrigated && currentCellState.waterLevel < 50) {
                if (game.irrigateCell(row, col)) irrigated++;
            }
            // Fertilize if needed (and not empty)
            else if (!currentCellState.fertilized && currentCellState.growthProgress > 10) { // Don't fertilize immediately
                if (game.fertilizeCell(row, col)) fertilized++;
            }
        }
    }
    if(harvested || planted || irrigated || fertilized)
     game.logger.log(`Mono Tick: H:${harvested}, P:${planted}, I:${irrigated}, F:${fertilized}`, 3); // Verbose log

     // Simple research goal
     if (game.day % 30 === 0) { // Check research funding monthly
        // *** FIX: Get cost from game.technologies or helper ***
        const dripCost = game.getTechnologyCost('drip_irrigation');
        const sensorsCost = game.getTechnologyCost('soil_sensors');
        const dronesCost = game.getTechnologyCost('precision_drones');

        if (!game.hasTechnology('drip_irrigation') && game.balance > dripCost * 1.2) {
            game.researchTechnology('drip_irrigation');
        } else if (!game.hasTechnology('soil_sensors') && game.balance > sensorsCost * 1.2) {
             // Research sensors as prerequisite for drones
             game.researchTechnology('soil_sensors');
        } else if (!game.hasTechnology('precision_drones') && game.hasTechnology('soil_sensors') && game.balance > dronesCost * 1.2) {
            game.researchTechnology('precision_drones');
        }
     }
}

function updateDiverseCropsStrategy(game) {
     if (game.day % 3 !== 0) return;

     const cropIds = crops.filter(c => c.id !== 'empty').map(c => c.id);
     if (cropIds.length === 0) return;
     let harvested = 0, planted = 0, irrigated = 0, fertilized = 0;

     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];

            if (cell.harvestReady) {
                if (game.harvestCell(row, col)) harvested++;
            }
            // Re-check state after potential harvest
            const currentCellState = game.grid[row][col];
            if (currentCellState.crop.id === 'empty') {
                // Rotate crop based on day and position
                const cropIndex = (row + col + Math.floor(game.day / 10)) % cropIds.length;
                const cropId = cropIds[cropIndex];
                if (game.plantCrop(row, col, cropId)) planted++;
            }
            else if (!currentCellState.irrigated && currentCellState.waterLevel < 60) { // Irrigate a bit more readily
                 if (game.irrigateCell(row, col)) irrigated++;
            }
            else if (!currentCellState.fertilized && currentCellState.growthProgress > 20) {
                 if (game.fertilizeCell(row, col)) fertilized++;
            }
        }
     }
      if(harvested || planted || irrigated || fertilized)
         game.logger.log(`Diverse Tick: H:${harvested}, P:${planted}, I:${irrigated}, F:${fertilized}`, 3);

     // Research goal: Soil health focus
     if (game.day % 30 === 0) {
         // *** FIX: Get costs from game ***
         const noTillCost = game.getTechnologyCost('no_till_farming');
         const sensorsCost = game.getTechnologyCost('soil_sensors');
         const silvoCost = game.getTechnologyCost('silvopasture');

         if (!game.hasTechnology('no_till_farming') && game.balance > noTillCost * 1.2) {
             game.researchTechnology('no_till_farming');
         } else if (!game.hasTechnology('soil_sensors') && game.balance > sensorsCost * 1.2) {
             game.researchTechnology('soil_sensors');
         } else if (!game.hasTechnology('silvopasture') && game.hasTechnology('no_till_farming') && game.balance > silvoCost * 1.2) {
             game.researchTechnology('silvopasture');
         }
     }
}

function updateTechFocusStrategy(game) {
    const incomeCrop = 'lettuce';

     // Basic farm management (less frequent to save compute?)
     if (game.day % 5 === 0) {
         let harvested = 0, planted = 0, irrigated = 0;
         for (let row = 0; row < game.gridSize; row++) {
            for (let col = 0; col < game.gridSize; col++) {
                const cell = game.grid[row][col];
                if (cell.harvestReady) {
                    if (game.harvestCell(row, col)) harvested++;
                }
                 // Re-check state after potential harvest
                 const currentCellState = game.grid[row][col];
                // Only replant in the designated income area
                if (currentCellState.crop.id === 'empty' && row < Math.ceil(game.gridSize / 2) && col < Math.ceil(game.gridSize / 2)) {
                    if (game.plantCrop(row, col, incomeCrop)) planted++;
                }
                // Minimal maintenance
                else if (currentCellState.crop.id !== 'empty' && !currentCellState.irrigated && currentCellState.waterLevel < 30) {
                     if(game.irrigateCell(row, col)) irrigated++;
                }
            }
         }
          if(harvested || planted || irrigated)
             game.logger.log(`Tech Tick: H:${harvested}, P:${planted}, I:${irrigated}`, 3);
     }


     // Aggressive research check (more frequent)
     if (game.day % 10 === 0) {
         const researchQueue = ['soil_sensors', 'drip_irrigation', 'precision_drones', 'ai_irrigation', 'drought_resistant', 'no_till_farming', 'renewable_energy', 'greenhouse', 'silvopasture'];
         for (const techId of researchQueue) {
            const tech = game.technologies.find(t => t.id === techId);
             // *** FIX: Use tech.cost if tech is found ***
            if (tech && !tech.researched && game.balance > tech.cost * 1.1) { // Lower threshold
                // Attempt research (will fail if prereqs not met)
                if (game.researchTechnology(techId)) {
                    game.logger.log(`Tech Strategy researching: ${techId}`, 2);
                    break; // Research only one per check cycle
                }
            }
         }
     }
}

function updateWaterSavingStrategy(game) {
    if (game.day % 3 !== 0) return;

     // Find crops with lower water use dynamically
     const waterEfficient = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0).map(c => c.id);
     const targetCrops = waterEfficient.length > 0 ? waterEfficient : ['grapes', 'lettuce']; // Fallback

     if (targetCrops.length === 0) return;
     let harvested = 0, planted = 0, irrigated = 0;

     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.harvestReady) {
                if (game.harvestCell(row, col)) harvested++;
            }
             // Re-check state after potential harvest
             const currentCellState = game.grid[row][col];
            if (currentCellState.crop.id === 'empty') {
                const cropIndex = (row * game.gridSize + col) % targetCrops.length;
                if (game.plantCrop(row, col, targetCrops[cropIndex])) planted++;
            }
            // Very conservative irrigation
            else if (!currentCellState.irrigated && currentCellState.waterLevel < 35 && game.waterReserve > 20) { // Only if reserve isn't critical
                 if (game.irrigateCell(row, col)) irrigated++;
            }
             // Less fertilization to save money for water tech
        }
     }
      if(harvested || planted || irrigated)
         game.logger.log(`WaterSave Tick: H:${harvested}, P:${planted}, I:${irrigated}`, 3);

     // Research: Water tech priority
     if (game.day % 30 === 0) {
         // *** FIX: Get costs from game ***
         const dripCost = game.getTechnologyCost('drip_irrigation');
         const sensorsCost = game.getTechnologyCost('soil_sensors');
         const droughtResCost = game.getTechnologyCost('drought_resistant');
         const aiIrrigationCost = game.getTechnologyCost('ai_irrigation');

         if (!game.hasTechnology('drip_irrigation') && game.balance > dripCost * 1.2) {
             game.researchTechnology('drip_irrigation');
         } else if (!game.hasTechnology('soil_sensors') && game.balance > sensorsCost * 1.2) { // Sensors help optimize
             game.researchTechnology('soil_sensors');
         } else if (!game.hasTechnology('drought_resistant') && game.balance > droughtResCost * 1.2) {
             game.researchTechnology('drought_resistant');
         } else if (!game.hasTechnology('ai_irrigation') && game.hasTechnology('drip_irrigation') && game.hasTechnology('soil_sensors') && game.balance > aiIrrigationCost * 1.2) {
             game.researchTechnology('ai_irrigation');
         }
     }
}
