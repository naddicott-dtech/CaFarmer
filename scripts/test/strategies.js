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
    const cropId = 'corn';
    if (game.day % 3 !== 0) return;

    let harvested = 0, planted = 0, irrigated = 0, fertilized = 0;
    const irrigationCost = game.irrigationCost; // Get costs once
    const fertilizeCost = game.fertilizeCost;
    const plantCost = Math.round(game.getCropById(cropId).basePrice * game.plantingCostFactor); // Approx plant cost

    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];

            if (cell.harvestReady) {
                if (game.harvestCell(row, col)) harvested++;
            }
            const currentCellState = game.grid[row][col]; // Re-fetch state
            if (currentCellState.crop.id === 'empty') {
                // *** ADD BALANCE CHECK ***
                if (game.balance >= plantCost) {
                     if (game.plantCrop(row, col, cropId)) planted++;
                }
            }
            else if (!currentCellState.irrigated && currentCellState.waterLevel < 50) {
                // *** ADD BALANCE CHECK ***
                if (game.balance >= irrigationCost) {
                    if (game.irrigateCell(row, col)) irrigated++;
                }
            }
            else if (!currentCellState.fertilized && currentCellState.growthProgress > 10) {
                // *** ADD BALANCE CHECK ***
                 if (game.balance >= fertilizeCost) {
                    if (game.fertilizeCell(row, col)) fertilized++;
                 }
            }
        }
    }
    if(harvested || planted || irrigated || fertilized) {
        // *** CHANGE LOG LEVEL HERE ***
        game.logger.log(`Mono Tick: H:${harvested}, P:${planted}, I:${irrigated}, F:${fertilized}`, 3); // Changed to 3 (VRB)
    }

     // Research goal check
     if (game.day % 30 === 0) {
        const dripCost = game.getTechnologyCost('drip_irrigation');
        const sensorsCost = game.getTechnologyCost('soil_sensors');
        const dronesCost = game.getTechnologyCost('precision_drones');

         // *** ADD BALANCE CHECKS BEFORE ATTEMPTING RESEARCH ***
        if (!game.hasTechnology('drip_irrigation') && game.balance >= dripCost) { // Check exact cost now
            game.researchTechnology('drip_irrigation');
        } else if (!game.hasTechnology('soil_sensors') && game.balance >= sensorsCost) {
             game.researchTechnology('soil_sensors');
        } else if (!game.hasTechnology('precision_drones') && game.hasTechnology('soil_sensors') && game.balance >= dronesCost) {
            game.researchTechnology('precision_drones');
        }
     }
}

function updateDiverseCropsStrategy(game) {
     if (game.day % 3 !== 0) return;

     const cropIds = crops.filter(c => c.id !== 'empty').map(c => c.id);
     if (cropIds.length === 0) return;
     let harvested = 0, planted = 0, irrigated = 0, fertilized = 0;
     const irrigationCost = game.irrigationCost;
     const fertilizeCost = game.fertilizeCost;
     // Estimate average planting cost? Or check per crop? Check per crop is safer.

     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];

            if (cell.harvestReady) {
                if (game.harvestCell(row, col)) harvested++;
            }
            const currentCellState = game.grid[row][col];
            if (currentCellState.crop.id === 'empty') {
                const cropIndex = (row + col + Math.floor(game.day / 10)) % cropIds.length;
                const cropId = cropIds[cropIndex];
                 const cropToPlant = game.getCropById(cropId);
                 const plantCost = Math.round(cropToPlant.basePrice * game.plantingCostFactor);
                 // *** ADD BALANCE CHECK ***
                 if (game.balance >= plantCost) {
                    if (game.plantCrop(row, col, cropId)) planted++;
                 }
            }
            else if (!currentCellState.irrigated && currentCellState.waterLevel < 60) {
                 // *** ADD BALANCE CHECK ***
                 if (game.balance >= irrigationCost) {
                    if (game.irrigateCell(row, col)) irrigated++;
                 }
            }
            else if (!currentCellState.fertilized && currentCellState.growthProgress > 20) {
                 // *** ADD BALANCE CHECK ***
                 if (game.balance >= fertilizeCost) {
                    if (game.fertilizeCell(row, col)) fertilized++;
                 }
            }
        }
     }
      if(harvested || planted || irrigated || fertilized) {
         // *** CHANGE LOG LEVEL HERE ***
         game.logger.log(`Diverse Tick: H:${harvested}, P:${planted}, I:${irrigated}, F:${fertilized}`, 3); // Changed to 3 (VRB)
      }

     // Research goal: Soil health focus
     if (game.day % 30 === 0) {
         const noTillCost = game.getTechnologyCost('no_till_farming');
         const sensorsCost = game.getTechnologyCost('soil_sensors');
         const silvoCost = game.getTechnologyCost('silvopasture');

         // *** ADD BALANCE CHECKS ***
         if (!game.hasTechnology('no_till_farming') && game.balance >= noTillCost) {
             game.researchTechnology('no_till_farming');
         } else if (!game.hasTechnology('soil_sensors') && game.balance >= sensorsCost) {
             game.researchTechnology('soil_sensors');
         } else if (!game.hasTechnology('silvopasture') && game.hasTechnology('no_till_farming') && game.balance >= silvoCost) {
             game.researchTechnology('silvopasture');
         }
     }
}

function updateTechFocusStrategy(game) {
    const incomeCrop = 'lettuce';
    const incomeCropCost = Math.round(game.getCropById(incomeCrop).basePrice * game.plantingCostFactor);
    const irrigationCost = game.irrigationCost;


     // Basic farm management
     if (game.day % 5 === 0) {
         let harvested = 0, planted = 0, irrigated = 0;
         for (let row = 0; row < game.gridSize; row++) {
            for (let col = 0; col < game.gridSize; col++) {
                const cell = game.grid[row][col];
                if (cell.harvestReady) {
                    if (game.harvestCell(row, col)) harvested++;
                }
                 const currentCellState = game.grid[row][col];
                if (currentCellState.crop.id === 'empty' && row < Math.ceil(game.gridSize / 2) && col < Math.ceil(game.gridSize / 2)) {
                     // *** ADD BALANCE CHECK ***
                     if (game.balance >= incomeCropCost) {
                        if (game.plantCrop(row, col, incomeCrop)) planted++;
                     }
                }
                else if (currentCellState.crop.id !== 'empty' && !currentCellState.irrigated && currentCellState.waterLevel < 30) {
                     // *** ADD BALANCE CHECK ***
                     if (game.balance >= irrigationCost) {
                        if(game.irrigateCell(row, col)) irrigated++;
                     }
                }
            }
         }
          if(harvested || planted || irrigated) {
            // *** CHANGE LOG LEVEL HERE ***
             game.logger.log(`Tech Tick: H:${harvested}, P:${planted}, I:${irrigated}`, 3); // Changed to 3 (VRB)
          }
     }


     // Aggressive research check
     if (game.day % 10 === 0) {
         const researchQueue = ['soil_sensors', 'drip_irrigation', 'precision_drones', 'ai_irrigation', 'drought_resistant', 'no_till_farming', 'renewable_energy', 'greenhouse', 'silvopasture'];
         for (const techId of researchQueue) {
            const tech = game.technologies.find(t => t.id === techId);
            // *** ADD BALANCE CHECK (CHECKING EXACT COST) ***
            if (tech && !tech.researched && game.balance >= tech.cost) {
                if (game.researchTechnology(techId)) {
                    game.logger.log(`Tech Strategy researching: ${techId}`, 2); // Log successful research at DBG level
                    break;
                }
            }
         }
     }
}

function updateWaterSavingStrategy(game) {
    if (game.day % 3 !== 0) return;

     const targetCrops = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0).map(c => c.id);
     if (targetCrops.length === 0) targetCrops.push('lettuce'); // Fallback

     let harvested = 0, planted = 0, irrigated = 0;
     const irrigationCost = game.irrigationCost;

     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.harvestReady) {
                if (game.harvestCell(row, col)) harvested++;
            }
             const currentCellState = game.grid[row][col];
            if (currentCellState.crop.id === 'empty') {
                const cropIndex = (row * game.gridSize + col) % targetCrops.length;
                const cropId = targetCrops[cropIndex];
                const cropToPlant = game.getCropById(cropId);
                const plantCost = Math.round(cropToPlant.basePrice * game.plantingCostFactor);
                 // *** ADD BALANCE CHECK ***
                 if (game.balance >= plantCost) {
                    if (game.plantCrop(row, col, cropId)) planted++;
                 }
            }
            // Very conservative irrigation
            else if (!currentCellState.irrigated && currentCellState.waterLevel < 35 && game.waterReserve > 20) {
                 // *** ADD BALANCE CHECK ***
                 if (game.balance >= irrigationCost) {
                    if (game.irrigateCell(row, col)) irrigated++;
                 }
            }
        }
     }
      if(harvested || planted || irrigated) {
        // *** CHANGE LOG LEVEL HERE ***
         game.logger.log(`WaterSave Tick: H:${harvested}, P:${planted}, I:${irrigated}`, 3); // Changed to 3 (VRB)
      }

     // Research: Water tech priority
     if (game.day % 30 === 0) {
         const dripCost = game.getTechnologyCost('drip_irrigation');
         const sensorsCost = game.getTechnologyCost('soil_sensors');
         const droughtResCost = game.getTechnologyCost('drought_resistant');
         const aiIrrigationCost = game.getTechnologyCost('ai_irrigation');

         // *** ADD BALANCE CHECKS ***
         if (!game.hasTechnology('drip_irrigation') && game.balance >= dripCost) {
             game.researchTechnology('drip_irrigation');
         } else if (!game.hasTechnology('soil_sensors') && game.balance >= sensorsCost) {
             game.researchTechnology('soil_sensors');
         } else if (!game.hasTechnology('drought_resistant') && game.balance >= droughtResCost) {
             game.researchTechnology('drought_resistant');
         } else if (!game.hasTechnology('ai_irrigation') && game.hasTechnology('drip_irrigation') && game.hasTechnology('soil_sensors') && game.balance >= aiIrrigationCost) {
             game.researchTechnology('ai_irrigation');
         }
     }
}
