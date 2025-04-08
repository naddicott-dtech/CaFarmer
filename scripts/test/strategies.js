/**
 * California Climate Farmer - Test Strategies
 *
 * Implements automated farming strategies for headless testing.
 * Assigns a strategy function to game.strategyTick.
 */

// *** FIX: Import getCropById directly ***
import { crops, getCropById } from '../crops.js'; // Verify path is correct
import { formatCurrency } from '../utils.js';

console.log('Test strategies module loaded');

// Main setup function called by TestHarness
export function setupTestStrategy(game, strategyId) {
    console.log(`Setting up test strategy: ${strategyId}`);
    game.logger.log(`Applying strategy: ${strategyId}`, 1);

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

// --- Initial Setup Functions --- (No changes needed here)
function setupMonocultureInitial(game) {
    const cropId = 'corn';
    game.logger.log(`Monoculture Initial: Planting ${cropId} everywhere.`, 2);
    let plantedCount = 0;
    const cropToPlantData = getCropById(cropId); // Get data once
    const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
    console.log(`SETUP MONO: Calculated plant cost for ${cropId}: ${formatCurrency(plantCost)}`); // Log calculated cost

    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            // *** DETAILED LOGGING ADDED HERE ***
            const balanceBeforePlant = game.balance;
            console.log(`SETUP MONO: Attempting plant (${row},${col}), Bal Before: ${formatCurrency(balanceBeforePlant)}, Need: ${formatCurrency(plantCost)}`);
            const plantSuccess = game.plantCrop(row, col, cropId); // Call the game's planting function
            console.log(`SETUP MONO: Planted (${row},${col}) -> Success: ${plantSuccess}, Bal After: ${formatCurrency(game.balance)}`);
             // *** END DETAILED LOGGING ***

            if (plantSuccess) {
                plantedCount++;
            } else {
                // Add a warning if planting failed when expected to succeed
                if (balanceBeforePlant >= plantCost && game.grid[row][col].crop.id === 'empty') {
                    console.warn(`SETUP MONO: Planting failed at (${row},${col}) unexpectedly!`);
                }
            }
        }
    }
    // Log the final count and balance
    game.logger.log(`Monoculture Initial: Planted ${plantedCount} ${cropId} plots. Final Initial Balance: ${formatCurrency(game.balance)}`, 1);
}

function setupDiverseCropsInitial(game) {
    game.logger.log(`Diverse Crops Initial: Planting various crops.`, 2);
    const cropIds = crops.filter(c => c.id !== 'empty').map(c => c.id);
    if (cropIds.length === 0) { game.logger.log("No crops defined (excluding empty)!", 0); return; }

    let counts = {}; // To track how many of each were actually planted

    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cropIndex = (row * 3 + col * 5 + Math.floor(game.day / 10)) % cropIds.length; // Use same pattern as strategy
            const cropId = cropIds[cropIndex];
            const cropToPlantData = getCropById(cropId);
            const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;

            // *** DETAILED LOGGING ADDED HERE ***
            const balanceBeforePlantD = game.balance;
            console.log(`SETUP DIVERSE: Attempting plant (${row},${col}) - ${cropId}, Bal Before: ${formatCurrency(balanceBeforePlantD)}, Need: ${formatCurrency(plantCost)}`);
            const plantSuccessD = game.plantCrop(row, col, cropId); // Call the game's planting function
            console.log(`SETUP DIVERSE: Planted (${row},${col}) -> Success: ${plantSuccessD}, Bal After: ${formatCurrency(game.balance)}`);
            // *** END DETAILED LOGGING ***

            if (plantSuccessD) {
                 counts[cropId] = (counts[cropId] || 0) + 1;
            } else {
                // Add a warning if planting failed unexpectedly
                 if (balanceBeforePlantD >= plantCost && game.grid[row][col].crop.id === 'empty') {
                     console.warn(`SETUP DIVERSE: Planting ${cropId} failed at (${row},${col}) unexpectedly!`);
                 }
            }
        }
    }
    // Log the final counts and balance
    game.logger.log(`Diverse Crops Initial: Planted ${JSON.stringify(counts)}. Final Initial Balance: ${formatCurrency(game.balance)}`, 1);
}

function setupTechFocusInitial(game) { /* ... as in Response #16 ... */
     game.logger.log(`Tech Focus Initial: Planting initial income crops.`, 2);
     const incomeCrop = 'lettuce';
     let plantedCount = 0;
     for (let row = 0; row < Math.ceil(game.gridSize / 2); row++) {
        for (let col = 0; col < Math.ceil(game.gridSize / 2); col++) { if (game.plantCrop(row, col, incomeCrop)) plantedCount++; }
     }
     game.logger.log(`Tech Focus Initial: Planted ${plantedCount} ${incomeCrop}. Initial Balance: $${game.balance.toLocaleString()}`, 1);
}

function setupWaterSavingInitial(game) { /* ... as in Response #16 ... */
     game.logger.log(`Water Saving Initial: Planting water-efficient crops.`, 2);
     let counts = {};
     const waterEfficient = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0).map(c => c.id);
     const targetCrops = waterEfficient.length > 0 ? waterEfficient : ['grapes', 'lettuce'];
     if (targetCrops.length === 0) { game.logger.log("No water efficient crops defined for setup!", 0); return; }
     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
             const cropIndex = (row * game.gridSize + col) % targetCrops.length;
             const cropId = targetCrops[cropIndex];
             if (game.plantCrop(row, col, cropId)) counts[cropId] = (counts[cropId] || 0) + 1;
        }
     }
     game.logger.log(`Water Saving Initial: Planted ${JSON.stringify(counts)}. Initial Balance: $${game.balance.toLocaleString()}`, 1);
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

    // --- Harvest Loop ---
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.harvestReady) {
                const harvestResult = game.harvestCell(row, col); // Get result object
                if (harvestResult.success) {
                    harvestedCount++;
                    totalHarvestIncome += harvestResult.income;
                    // Individual success logs removed (or kept at VERBOSE in harvestCell)
                } else {
                    // Log failure at INFO level if needed
                    game.logger.log(`Harvest FAILED: (${row},${col}), Reason: ${harvestResult.reason}`, 1);
                }
            }
        }
    }
    // Log Aggregate Harvest for the Tick (if any happened)
    if (harvestedCount > 0) {
         game.logger.log(`HARVEST SUMMARY: Harvested ${harvestedCount} plots for ${formatCurrency(totalHarvestIncome)}. New Bal: ${formatCurrency(game.balance)}`, 1);
    }

    // --- Planting / Action Loop ---
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            // Skip actions on plots just harvested (now empty)
            if (cell.crop.id === 'empty') {
                 // Plant if Empty (and not just harvested)
                 // Need to ensure harvestCell sets crop to empty *before* this loop runs
                 // or check daysSincePlanting === 0? Let's assume harvestCell resets state okay.
                if (game.balance >= plantCost) {
                    if (game.plantCrop(row, col, cropId)) planted++;
                }
            } else if (!cell.harvestReady) { // Only apply actions to non-harvest-ready crops
                // Irrigate if needed
                if (!cell.irrigated && cell.waterLevel < 50) {
                    if (game.balance >= irrigationCost) {
                        if (game.irrigateCell(row, col)) irrigated++;
                    }
                }
                // Fertilize ONCE during mid-growth
                if (!cell.fertilized && cell.growthProgress > 25 && cell.growthProgress < 75) {
                     if (game.balance >= fertilizeCost) {
                         if (game.fertilizeCell(row, col)) fertilized++;
                     }
                }
            }
        }
    }

    // Log other actions summary (at VERBOSE level)
    if(planted || irrigated || fertilized) {
        game.logger.log(`Mono Tick Actions: P:${planted}, I:${irrigated}, F:${fertilized}. Bal: ${formatCurrency(game.balance)}`, 3);
    }

     // Tech research logic - only after Year 1
     if (game.year > 1 && game.day % 30 === 0) {
        const dripCost = game.getTechnologyCost('drip_irrigation');
        const sensorsCost = game.getTechnologyCost('soil_sensors');
        const dronesCost = game.getTechnologyCost('precision_drones');
        const researchBuffer = 20000;
        if (!game.hasTechnology('drip_irrigation') && game.balance >= (dripCost + researchBuffer)) {
            game.researchTechnology('drip_irrigation');
        } else if (!game.hasTechnology('soil_sensors') && game.balance >= (sensorsCost + researchBuffer)) {
            game.researchTechnology('soil_sensors');
        } else if (!game.hasTechnology('precision_drones') && game.hasTechnology('soil_sensors') && game.balance >= (dronesCost + researchBuffer)) {
            game.researchTechnology('precision_drones');
        }
     }
}

// --- updateDiverseCropsStrategy Function Replacement ---
function updateDiverseCropsStrategy(game) {
     if (game.day % 5 !== 0) return;

     const cropIds = crops.filter(c => c.id !== 'empty').map(c => c.id);
     if (cropIds.length === 0) return;

     let harvestedCount = 0;
     let totalHarvestIncome = 0;
     let planted = 0, irrigated = 0, fertilized = 0;
     const irrigationCost = game.irrigationCost;
     const fertilizeCost = game.fertilizeCost;

     // --- Harvest Loop ---
     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.harvestReady) {
                 const harvestResult = game.harvestCell(row, col); // Get result object
                 if (harvestResult.success) {
                     harvestedCount++;
                     totalHarvestIncome += harvestResult.income;
                 } else {
                     game.logger.log(`Harvest FAILED: (${row},${col}), Reason: ${harvestResult.reason}`, 1);
                 }
            }
        }
     }
     // Log Aggregate Harvest for the Tick
     if (harvestedCount > 0) {
         game.logger.log(`HARVEST SUMMARY: Harvested ${harvestedCount} plots for ${formatCurrency(totalHarvestIncome)}. New Bal: ${formatCurrency(game.balance)}`, 1);
     }

     // --- Planting / Action Loop ---
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
            } else if (!cell.harvestReady) { // Actions only if crop exists and not ready
                // Irrigate if needed
                if (!cell.irrigated && cell.waterLevel < 60) {
                     if (game.balance >= irrigationCost) {
                         if (game.irrigateCell(row, col)) irrigated++;
                     }
                }
                // Fertilize only once during mid-growth
                else if (!cell.fertilized && cell.growthProgress > 25 && cell.growthProgress < 75) {
                     if (game.balance >= fertilizeCost) {
                         if (game.fertilizeCell(row, col)) fertilized++;
                     }
                }
            }
        }
     }

      // Log other actions summary (at VERBOSE level)
      if(planted || irrigated || fertilized) {
         game.logger.log(`Diverse Tick Actions: P:${planted}, I:${irrigated}, F:${fertilized}. Bal: ${formatCurrency(game.balance)}`, 3);
      }

     // Tech research logic - only after Year 1
     if (game.year > 1 && game.day % 30 === 0) {
         const noTillCost = game.getTechnologyCost('no_till_farming');
         const sensorsCost = game.getTechnologyCost('soil_sensors');
         const silvoCost = game.getTechnologyCost('silvopasture');
         const researchBuffer = 25000;
         if (!game.hasTechnology('no_till_farming') && game.balance >= (noTillCost + researchBuffer)) {
             game.researchTechnology('no_till_farming');
         } else if (!game.hasTechnology('soil_sensors') && game.balance >= (sensorsCost + researchBuffer)) {
             game.researchTechnology('soil_sensors');
         } else if (!game.hasTechnology('silvopasture') && game.hasTechnology('no_till_farming') && game.balance >= (silvoCost + researchBuffer)) {
             game.researchTechnology('silvopasture');
         }
     }
}
function updateTechFocusStrategy(game) {
    const incomeCrop = 'lettuce';
    // *** FIX: Use imported getCropById ***
    const incomeCropData = getCropById(incomeCrop);
    const incomeCropCost = incomeCropData ? Math.round(incomeCropData.basePrice * game.plantingCostFactor) : Infinity;
    const irrigationCost = game.irrigationCost;
     if (game.day % 5 === 0) {
         let harvested = 0, planted = 0, irrigated = 0;
         for (let row = 0; row < game.gridSize; row++) {
            for (let col = 0; col < game.gridSize; col++) {
                const cell = game.grid[row][col];
                if (cell.harvestReady) { if (game.harvestCell(row, col)) harvested++; }
                 const currentCellState = game.grid[row][col];
                if (currentCellState.crop.id === 'empty' && row < Math.ceil(game.gridSize / 2) && col < Math.ceil(game.gridSize / 2)) {
                     if (game.balance >= incomeCropCost) { if (game.plantCrop(row, col, incomeCrop)) planted++; }
                }
                else if (currentCellState.crop.id !== 'empty' && !currentCellState.irrigated && currentCellState.waterLevel < 30) {
                     if (game.balance >= irrigationCost) { if(game.irrigateCell(row, col)) irrigated++; }
                }
            }
         }
          if(harvested || planted || irrigated) { game.logger.log(`Tech Tick: H:${harvested}, P:${planted}, I:${irrigated}`, 3); } // Verbose
     }
     if (game.day % 10 === 0) {
         const researchQueue = ['soil_sensors', 'drip_irrigation', 'precision_drones', 'ai_irrigation', 'drought_resistant', 'no_till_farming', 'renewable_energy', 'greenhouse', 'silvopasture'];
         for (const techId of researchQueue) {
            const tech = game.technologies.find(t => t.id === techId);
             // *** NO RESEARCH BUFFER - Just check cost ***
            if (tech && !tech.researched && game.balance >= tech.cost) {
                if (game.researchTechnology(techId)) { game.logger.log(`Tech Strategy researching: ${techId}`, 2); break; }
            }
         }
     }
}

function updateWaterSavingStrategy(game) {
    if (game.day % 3 !== 0) return;
     const targetCropsData = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0);
     let targetCropsIds = targetCropsData.map(c => c.id);
     if (targetCropsIds.length === 0) targetCropsIds.push('lettuce');
     let harvested = 0, planted = 0, irrigated = 0;
     const irrigationCost = game.irrigationCost;
     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];
            if (cell.harvestReady) { if (game.harvestCell(row, col)) harvested++; }
             const currentCellState = game.grid[row][col];
            if (currentCellState.crop.id === 'empty') {
                const cropIndex = (row * game.gridSize + col) % targetCropsIds.length;
                const cropId = targetCropsIds[cropIndex];
                // *** FIX: Use imported getCropById ***
                const cropToPlantData = getCropById(cropId);
                const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
                 if (game.balance >= plantCost) { if (game.plantCrop(row, col, cropId)) planted++; }
            }
            else if (!currentCellState.irrigated && currentCellState.waterLevel < 35 && game.waterReserve > 20) {
                 if (game.balance >= irrigationCost) { if (game.irrigateCell(row, col)) irrigated++; }
            }
        }
     }
      if(harvested || planted || irrigated) { game.logger.log(`WaterSave Tick: H:${harvested}, P:${planted}, I:${irrigated}`, 3); } // Verbose
     if (game.day % 30 === 0) {
         const dripCost = game.getTechnologyCost('drip_irrigation');
         const sensorsCost = game.getTechnologyCost('soil_sensors');
         const droughtResCost = game.getTechnologyCost('drought_resistant');
         const aiIrrigationCost = game.getTechnologyCost('ai_irrigation');
          // *** NO RESEARCH BUFFER - Just check cost ***
         if (!game.hasTechnology('drip_irrigation') && game.balance >= dripCost) { game.researchTechnology('drip_irrigation'); }
         else if (!game.hasTechnology('soil_sensors') && game.balance >= sensorsCost) { game.researchTechnology('soil_sensors'); }
         else if (!game.hasTechnology('drought_resistant') && game.balance >= droughtResCost) { game.researchTechnology('drought_resistant'); }
         else if (!game.hasTechnology('ai_irrigation') && game.hasTechnology('drip_irrigation') && game.hasTechnology('soil_sensors') && game.balance >= aiIrrigationCost) { game.researchTechnology('ai_irrigation'); }
     }
}
