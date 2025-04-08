/**
 * California Climate Farmer - Test Strategies
 *
 * Implements automated farming strategies for headless testing.
 * Assigns a strategy function to game.strategyTick.
 */

import { crops, getCropById } from '../crops.js';
import { formatCurrency } from '../utils.js';

console.log('Test strategies module loaded');

// Main setup function called by TestHarness
export function setupTestStrategy(game, strategyId) {
    // Use logger for setup message
    game.logger.log(`Setting up test strategy: ${strategyId}`, 1); // INFO level
    game.logger.log(`Applying strategy: ${strategyId}`, 1); // INFO level

    // Assign the appropriate update function to the game's strategyTick hook
    switch (strategyId) {
        case 'monoculture':
            game.strategyTick = updateMonocultureStrategy;
            setupMonocultureInitial(game);
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
            game.strategyTick = null;
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
    const cropToPlantData = getCropById(cropId);
    const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
    // Log setup info at DEBUG level
    game.logger.log(`SETUP MONO: Calculated plant cost for ${cropId}: ${formatCurrency(plantCost)}`, 2);

    let plantedCount = 0;
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const balanceBeforePlant = game.balance;
            // *** CHANGE: Use game logger at VERBOSE level (3) ***
            game.logger.log(`SETUP MONO: Attempting plant (${row},${col}), Bal Before: ${formatCurrency(balanceBeforePlant)}, Need: ${formatCurrency(plantCost)}`, 3);
            const plantSuccess = game.plantCrop(row, col, cropId);
            game.logger.log(`SETUP MONO: Planted (${row},${col}) -> Success: ${plantSuccess}, Bal After: ${formatCurrency(game.balance)}`, 3);
            // *** END CHANGE ***

            if (plantSuccess) {
                plantedCount++;
            } else {
                if (balanceBeforePlant >= plantCost && game.grid[row][col].crop.id === 'empty') {
                    // Use logger for warnings too
                    game.logger.log(`SETUP MONO WARNING: Planting failed at (${row},${col}) unexpectedly!`, 0);
                }
            }
        }
    }
    // Log summary at INFO level
    game.logger.log(`Monoculture Initial: Planted ${plantedCount} ${cropId} plots. Final Initial Balance: ${formatCurrency(game.balance)}`, 1);
}

function setupDiverseCropsInitial(game) {
    const cropIds = crops.filter(c => c.id !== 'empty').map(c => c.id);
    if (cropIds.length === 0) { game.logger.log("No crops defined (excluding empty)!", 0); return; }

    let counts = {};

    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cropIndex = (row * 3 + col * 5 + Math.floor(game.day / 10)) % cropIds.length;
            const cropId = cropIds[cropIndex];
            const cropToPlantData = getCropById(cropId);
            const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;

            const balanceBeforePlantD = game.balance;
            // *** CHANGE: Use game logger at VERBOSE level (3) ***
            game.logger.log(`SETUP DIVERSE: Attempting plant (${row},${col}) - ${cropId}, Bal Before: ${formatCurrency(balanceBeforePlantD)}, Need: ${formatCurrency(plantCost)}`, 3);
            const plantSuccessD = game.plantCrop(row, col, cropId);
            game.logger.log(`SETUP DIVERSE: Planted (${row},${col}) -> Success: ${plantSuccessD}, Bal After: ${formatCurrency(game.balance)}`, 3);
            // *** END CHANGE ***

            if (plantSuccessD) {
                 counts[cropId] = (counts[cropId] || 0) + 1;
            } else {
                 if (balanceBeforePlantD >= plantCost && game.grid[row][col].crop.id === 'empty') {
                     game.logger.log(`SETUP DIVERSE WARNING: Planting ${cropId} failed at (${row},${col}) unexpectedly!`, 0);
                 }
            }
        }
    }
    // Log summary at INFO level
    game.logger.log(`Diverse Crops Initial: Planted ${JSON.stringify(counts)}. Final Initial Balance: ${formatCurrency(game.balance)}`, 1);
}

function setupTechFocusInitial(game) {
     game.logger.log(`Tech Focus Initial: Planting initial income crops.`, 2);
     const incomeCrop = 'lettuce';
     let plantedCount = 0;
     const cropToPlantData = getCropById(incomeCrop); // Get data once
     const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
     for (let row = 0; row < Math.ceil(game.gridSize / 2); row++) {
        for (let col = 0; col < Math.ceil(game.gridSize / 2); col++) {
             const balanceBefore = game.balance;
             // Log planting attempts at VERBOSE level
             game.logger.log(`SETUP TECH: Attempting plant (${row},${col}), Bal Before: ${formatCurrency(balanceBefore)}, Need: ${formatCurrency(plantCost)}`, 3);
             const success = game.plantCrop(row, col, incomeCrop);
             game.logger.log(`SETUP TECH: Planted (${row},${col}) -> Success: ${success}, Bal After: ${formatCurrency(game.balance)}`, 3);
             if (success) plantedCount++;
        }
     }
     game.logger.log(`Tech Focus Initial: Planted ${plantedCount} ${incomeCrop}. Initial Balance: ${formatCurrency(game.balance)}`, 1); // INFO level summary
}

function setupWaterSavingInitial(game) {
     game.logger.log(`Water Saving Initial: Planting water-efficient crops.`, 2);
     let counts = {};
     const waterEfficient = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0).map(c => c.id);
     const targetCropsIds = waterEfficient.length > 0 ? waterEfficient : ['grapes', 'lettuce'];
     if (targetCropsIds.length === 0) { game.logger.log("No water efficient crops defined for setup!", 0); return; }
     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
             const cropIndex = (row * game.gridSize + col) % targetCropsIds.length;
             const cropId = targetCropsIds[cropIndex];
             const cropToPlantData = getCropById(cropId);
             const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
             const balanceBefore = game.balance;
             // Log planting attempts at VERBOSE level
             game.logger.log(`SETUP WATER: Attempting plant (${row},${col}) - ${cropId}, Bal Before: ${formatCurrency(balanceBefore)}, Need: ${formatCurrency(plantCost)}`, 3);
             const success = game.plantCrop(row, col, cropId);
             game.logger.log(`SETUP WATER: Planted (${row},${col}) -> Success: ${success}, Bal After: ${formatCurrency(game.balance)}`, 3);
             if (success) counts[cropId] = (counts[cropId] || 0) + 1;
        }
     }
     game.logger.log(`Water Saving Initial: Planted ${JSON.stringify(counts)}. Initial Balance: ${formatCurrency(game.balance)}`, 1); // INFO level summary
}


// --- Strategy Update Functions (Called each tick via game.strategyTick) ---

function updateMonocultureStrategy(game) {
    const cropId = 'corn';
    if (game.day % 5 !== 0) return;

    let harvestedCount = 0;
    let totalHarvestIncome = 0;
    let planted = 0, irrigated = 0, fertilized = 0;
    const irrigationCost = game.irrigationCost;
    const fertilizeCost = game.fertilizeCost;
    const cropToPlantData = getCropById(cropId);
    const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;

    // Harvest Loop
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.harvestReady) {
                const harvestResult = game.harvestCell(row, col);
                if (harvestResult.success) {
                    harvestedCount++;
                    totalHarvestIncome += harvestResult.income;
                } else {
                    game.logger.log(`Harvest FAILED: (${row},${col}), Reason: ${harvestResult.reason}`, 1);
                }
            }
        }
    }
    if (harvestedCount > 0) {
         game.logger.log(`HARVEST SUMMARY: Harvested ${harvestedCount} plots for ${formatCurrency(totalHarvestIncome)}. New Bal: ${formatCurrency(game.balance)}`, 1);
    }

    // Planting / Action Loop
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.crop.id === 'empty') {
                if (game.balance >= plantCost) {
                    if (game.plantCrop(row, col, cropId)) planted++;
                }
            } else if (!cell.harvestReady) {
                if (!cell.irrigated && cell.waterLevel < 50) {
                    if (game.balance >= irrigationCost) {
                        if (game.irrigateCell(row, col)) irrigated++;
                    }
                }
                if (!cell.fertilized && cell.growthProgress > 25 && cell.growthProgress < 75) {
                     if (game.balance >= fertilizeCost) {
                         if (game.fertilizeCell(row, col)) fertilized++;
                     }
                }
            }
        }
    }
    if(planted || irrigated || fertilized) {
        game.logger.log(`Mono Tick Actions: P:${planted}, I:${irrigated}, F:${fertilized}. Bal: ${formatCurrency(game.balance)}`, 3);
    }

     // Tech research logic - only after Year 1
     if (game.year > 1 && game.day % 30 === 0) {
        const researchBuffer = 20000; // Keep buffer for basic strategies
        const researchQueue = [
            { id: 'drip_irrigation', prereqs: [] },
            { id: 'soil_sensors', prereqs: [] },
            { id: 'precision_drones', prereqs: ['soil_sensors'] }
        ];

        for (const techInfo of researchQueue) {
             const tech = game.technologies.find(t => t.id === techInfo.id);
             if (tech && !tech.researched) {
                 const cost = tech.cost;
                 const prereqsMet = techInfo.prereqs.every(p => game.hasTechnology(p));
                 // Check prerequisites AND affordability (with buffer)
                 if (prereqsMet && game.balance >= (cost + researchBuffer)) {
                     if (game.researchTechnology(techInfo.id)) {
                         break; // Only research one tech per check
                     }
                 }
             }
        }
     }
}

function updateDiverseCropsStrategy(game) {
     if (game.day % 5 !== 0) return;

     const cropIds = crops.filter(c => c.id !== 'empty').map(c => c.id);
     if (cropIds.length === 0) return;

     let harvestedCount = 0;
     let totalHarvestIncome = 0;
     let planted = 0, irrigated = 0, fertilized = 0;
     const irrigationCost = game.irrigationCost;
     const fertilizeCost = game.fertilizeCost;

     // Harvest Loop
     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.harvestReady) {
                 const harvestResult = game.harvestCell(row, col);
                 if (harvestResult.success) {
                     harvestedCount++;
                     totalHarvestIncome += harvestResult.income;
                 } else {
                     game.logger.log(`Harvest FAILED: (${row},${col}), Reason: ${harvestResult.reason}`, 1);
                 }
            }
        }
     }
     if (harvestedCount > 0) {
         game.logger.log(`HARVEST SUMMARY: Harvested ${harvestedCount} plots for ${formatCurrency(totalHarvestIncome)}. New Bal: ${formatCurrency(game.balance)}`, 1);
     }

     // Planting / Action Loop
     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.crop.id === 'empty') {
                const cropIndex = (row * 3 + col * 5 + Math.floor(game.day / 10)) % cropIds.length;
                const cropId = cropIds[cropIndex];
                const cropToPlantData = getCropById(cropId);
                const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
                if (game.balance >= plantCost) {
                    if (game.plantCrop(row, col, cropId)) planted++;
                }
            } else if (!cell.harvestReady) {
                if (!cell.irrigated && cell.waterLevel < 60) {
                     if (game.balance >= irrigationCost) {
                         if (game.irrigateCell(row, col)) irrigated++;
                     }
                }
                else if (!cell.fertilized && cell.growthProgress > 25 && cell.growthProgress < 75) {
                     if (game.balance >= fertilizeCost) {
                         if (game.fertilizeCell(row, col)) fertilized++;
                     }
                }
            }
        }
     }
      if(planted || irrigated || fertilized) {
         game.logger.log(`Diverse Tick Actions: P:${planted}, I:${irrigated}, F:${fertilized}. Bal: ${formatCurrency(game.balance)}`, 3);
      }

     // Tech research logic - only after Year 1
     if (game.year > 1 && game.day % 30 === 0) {
         const researchBuffer = 25000; // Keep buffer for basic strategies
         const researchQueue = [
             { id: 'no_till_farming', prereqs: [] },
             { id: 'soil_sensors', prereqs: [] },
             { id: 'silvopasture', prereqs: ['no_till_farming'] } // Example prereq
         ];

         for (const techInfo of researchQueue) {
             const tech = game.technologies.find(t => t.id === techInfo.id);
             if (tech && !tech.researched) {
                 const cost = tech.cost;
                 const prereqsMet = techInfo.prereqs.every(p => game.hasTechnology(p));
                  // Check prerequisites AND affordability (with buffer)
                 if (prereqsMet && game.balance >= (cost + researchBuffer)) {
                     if (game.researchTechnology(techInfo.id)) {
                         break; // Only research one tech per check
                     }
                 }
             }
         }
     }
}

function updateTechFocusStrategy(game) {
    const incomeCrop = 'lettuce';
    const incomeCropData = getCropById(incomeCrop);
    const incomeCropCost = incomeCropData ? Math.round(incomeCropData.basePrice * game.plantingCostFactor) : Infinity;
    const irrigationCost = game.irrigationCost;

    let harvestedCount = 0;
    let totalHarvestIncome = 0;
    let planted = 0, irrigated = 0;

    // --- Harvest Loop --- (Run every tick for responsiveness)
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            if (game.grid[row][col].harvestReady) {
                const harvestResult = game.harvestCell(row, col);
                if (harvestResult.success) {
                    harvestedCount++;
                    totalHarvestIncome += harvestResult.income;
                }
            }
        }
    }
    if (harvestedCount > 0) {
        game.logger.log(`HARVEST SUMMARY: Harvested ${harvestedCount} plots for ${formatCurrency(totalHarvestIncome)}. New Bal: ${formatCurrency(game.balance)}`, 1);
    }

    // --- Actions Loop --- (Run less frequently)
    if (game.day % 5 === 0) {
        for (let row = 0; row < game.gridSize; row++) {
            for (let col = 0; col < game.gridSize; col++) {
                const cell = game.grid[row][col];
                if (cell.crop.id === 'empty') {
                    // Plant only first 25 plots
                    if (row < 5 && col < 5) {
                         if (game.balance >= incomeCropCost) {
                             if (game.plantCrop(row, col, incomeCrop)) planted++;
                         }
                    }
                } else if (!cell.harvestReady) { // Only irrigate existing crops
                    if (!cell.irrigated && cell.waterLevel < 40) { // Water more aggressively
                         if (game.balance >= irrigationCost) {
                             if (game.irrigateCell(row, col)) irrigated++;
                         }
                    }
                }
            }
        }
        if (planted || irrigated) {
            game.logger.log(`Tech Tick Actions: P:${planted}, I:${irrigated}. Bal: ${formatCurrency(game.balance)}`, 3);
        }
    }

    // --- Research Loop --- (Run frequently but check affordability)
     if (game.day % 10 === 0) { // Check research opportunities often
         const researchQueue = [ // Prioritized list
             'soil_sensors', 'drip_irrigation', 'precision_drones',
             'ai_irrigation', 'drought_resistant', 'no_till_farming',
             'renewable_energy', 'greenhouse', 'silvopasture'
         ];
         for (const techId of researchQueue) {
            const tech = game.technologies.find(t => t.id === techId);
            if (tech && !tech.researched) {
                 const cost = game.getTechnologyCost(techId); // Use helper function
                 const prereqsMet = checkTechPrerequisites(tech, game.researchedTechs); // Use helper

                 // *** CHANGE: Check balance >= cost ***
                 if (prereqsMet && game.balance >= cost) {
                    if (game.researchTechnology(techId)) {
                        game.logger.log(`Tech Strategy researched: ${techId}`, 2); // DEBUG level
                        break; // Research only one tech per check cycle
                    }
                 } else if (prereqsMet && game.balance < cost) {
                     // Optional: Log that we want the tech but can't afford it yet
                     game.logger.log(`Tech Strategy wants ${techId} ($${cost}) but cannot afford ($${game.balance})`, 3); // VERBOSE
                     break; // Don't check further down the list if we can't afford this one
                 }
                 // *** END CHANGE ***
            }
         }
     }
}


function updateWaterSavingStrategy(game) {
    if (game.day % 3 !== 0) return; // Check less often

    const targetCropsData = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0);
    let targetCropsIds = targetCropsData.map(c => c.id);
    if (targetCropsIds.length === 0) targetCropsIds.push('lettuce'); // Fallback

    let harvestedCount = 0;
    let totalHarvestIncome = 0;
    let planted = 0, irrigated = 0;
    const irrigationCost = game.irrigationCost;

    // --- Harvest Loop ---
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            if (game.grid[row][col].harvestReady) {
                const harvestResult = game.harvestCell(row, col);
                if (harvestResult.success) {
                    harvestedCount++;
                    totalHarvestIncome += harvestResult.income;
                }
            }
        }
    }
    if (harvestedCount > 0) {
        game.logger.log(`HARVEST SUMMARY: Harvested ${harvestedCount} plots for ${formatCurrency(totalHarvestIncome)}. New Bal: ${formatCurrency(game.balance)}`, 1);
    }

    // --- Planting / Action Loop ---
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.crop.id === 'empty') {
                const cropIndex = (row * game.gridSize + col) % targetCropsIds.length;
                const cropId = targetCropsIds[cropIndex];
                const cropToPlantData = getCropById(cropId);
                const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
                 if (game.balance >= plantCost) {
                     if (game.plantCrop(row, col, cropId)) planted++;
                 }
            }
            else if (!cell.irrigated && cell.waterLevel < 35 && game.waterReserve > 20) { // Keep water threshold tight
                 if (game.balance >= irrigationCost) {
                     if (game.irrigateCell(row, col)) irrigated++;
                 }
            }
        }
    }
     if(planted || irrigated) {
         game.logger.log(`WaterSave Tick Actions: P:${planted}, I:${irrigated}. Bal: ${formatCurrency(game.balance)}`, 3);
     }

    // --- Research Loop --- (Check affordability)
     if (game.day % 30 === 0) { // Check less frequently
         const researchQueue = [
             { id: 'drip_irrigation', prereqs: [] },
             { id: 'soil_sensors', prereqs: [] },
             { id: 'drought_resistant', prereqs: [] },
             { id: 'ai_irrigation', prereqs: ['drip_irrigation', 'soil_sensors'] }
         ];
         const researchBuffer = 10000; // Smaller buffer maybe?

         for (const techInfo of researchQueue) {
             const tech = game.technologies.find(t => t.id === techInfo.id);
             if (tech && !tech.researched) {
                 const cost = game.getTechnologyCost(techInfo.id);
                 const prereqsMet = checkTechPrerequisites(tech, game.researchedTechs);

                 // *** CHANGE: Check balance >= cost (with buffer) ***
                 if (prereqsMet && game.balance >= (cost + researchBuffer)) {
                    if (game.researchTechnology(techInfo.id)) {
                        game.logger.log(`WaterSave Strategy researched: ${techInfo.id}`, 2);
                        break; // Only one per check
                    }
                 } else if (prereqsMet && game.balance < (cost + researchBuffer)) {
                     game.logger.log(`WaterSave wants ${techInfo.id} ($${cost}) but cannot afford ($${game.balance} < $${cost + researchBuffer})`, 3);
                     // Don't necessarily break, maybe a cheaper tech is available later
                 }
                 // *** END CHANGE ***
             }
         }
     }
}
