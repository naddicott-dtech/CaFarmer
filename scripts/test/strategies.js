/**
 * California Climate Farmer - Test Strategies
 *
 * Implements automated farming strategies for headless testing.
 * Assigns a strategy function to game.strategyTick.
 */

import { crops, getCropById } from '../crops.js';
import { formatCurrency } from '../utils.js';
// Import tech helpers needed for DecisionRule
import { checkTechPrerequisites } from '../technology.js';

console.log('Test strategies module loaded');

// Main setup function called by TestHarness
export function setupTestStrategy(game, strategyId) {
    game.logger.log(`Setting up test strategy: ${strategyId}`, 1);
    game.logger.log(`Applying strategy: ${strategyId}`, 1);

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
        // --- ADDED DecisionRule ---
        case 'decision-rule':
            game.strategyTick = updateDecisionRuleStrategy;
            setupDecisionRuleInitial(game); // Use specific setup
            break;
        // --------------------------
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
    game.logger.log(`SETUP MONO: Calculated plant cost for ${cropId}: ${formatCurrency(plantCost)}`, 2);

    let plantedCount = 0;
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const balanceBeforePlant = game.balance;
            game.logger.log(`SETUP MONO: Attempting plant (${row},${col}), Bal Before: ${formatCurrency(balanceBeforePlant)}, Need: ${formatCurrency(plantCost)}`, 3);
            const plantSuccess = game.plantCrop(row, col, cropId);
            game.logger.log(`SETUP MONO: Planted (${row},${col}) -> Success: ${plantSuccess}, Bal After: ${formatCurrency(game.balance)}`, 3);

            if (plantSuccess) {
                plantedCount++;
            } else {
                if (balanceBeforePlant >= plantCost && game.grid[row][col].crop.id === 'empty') {
                    game.logger.log(`SETUP MONO WARNING: Planting failed at (${row},${col}) unexpectedly!`, 0);
                }
            }
        }
    }
    game.logger.log(`Monoculture Initial: Planted ${plantedCount} ${cropId} plots. Final Initial Balance: ${formatCurrency(game.balance)}`, 1);
}

function setupDiverseCropsInitial(game) {
    const cropIds = crops.filter(c => c.id !== 'empty').map(c => c.id);
    if (cropIds.length === 0) { game.logger.log("No crops defined (excluding empty)!", 0); return; }
    game.logger.log(`SETUP DIVERSE: Available crops: ${cropIds.join(', ')}`, 2);

    let counts = {};
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cropIndex = (row * 3 + col * 5) % cropIds.length;
            const cropId = cropIds[cropIndex];
            const cropToPlantData = getCropById(cropId);
            const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
            const balanceBeforePlantD = game.balance;
            game.logger.log(`SETUP DIVERSE: Attempting plant (${row},${col}) - ${cropId}, Bal Before: ${formatCurrency(balanceBeforePlantD)}, Need: ${formatCurrency(plantCost)}`, 3);
            const plantSuccessD = game.plantCrop(row, col, cropId);
            game.logger.log(`SETUP DIVERSE: Planted (${row},${col}) -> Success: ${plantSuccessD}, Bal After: ${formatCurrency(game.balance)}`, 3);

            if (plantSuccessD) {
                 counts[cropId] = (counts[cropId] || 0) + 1;
            } else {
                 if (balanceBeforePlantD >= plantCost && game.grid[row][col].crop.id === 'empty') {
                     game.logger.log(`SETUP DIVERSE WARNING: Planting ${cropId} failed at (${row},${col}) unexpectedly!`, 0);
                 }
            }
        }
    }
    game.logger.log(`Diverse Crops Initial: Planted ${JSON.stringify(counts)}. Final Initial Balance: ${formatCurrency(game.balance)}`, 1);
}

function setupTechFocusInitial(game) {
     game.logger.log(`Tech Focus Initial: Planting initial income crops.`, 2);
     const incomeCrop = 'lettuce';
     let plantedCount = 0;
     const cropToPlantData = getCropById(incomeCrop);
     const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
     game.logger.log(`SETUP TECH: Calculated plant cost for ${incomeCrop}: ${formatCurrency(plantCost)}`, 2);
     for (let row = 0; row < Math.ceil(game.gridSize / 2); row++) {
        for (let col = 0; col < Math.ceil(game.gridSize / 2); col++) {
             const balanceBefore = game.balance;
             game.logger.log(`SETUP TECH: Attempting plant (${row},${col}), Bal Before: ${formatCurrency(balanceBefore)}, Need: ${formatCurrency(plantCost)}`, 3);
             const success = game.plantCrop(row, col, incomeCrop);
             game.logger.log(`SETUP TECH: Planted (${row},${col}) -> Success: ${success}, Bal After: ${formatCurrency(game.balance)}`, 3);
             if (success) plantedCount++;
        }
     }
     game.logger.log(`Tech Focus Initial: Planted ${plantedCount} ${incomeCrop}. Initial Balance: ${formatCurrency(game.balance)}`, 1);
}

function setupWaterSavingInitial(game) {
     game.logger.log(`Water Saving Initial: Planting water-efficient crops.`, 2);
     let counts = {};
     const waterEfficient = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0).map(c => c.id);
     const targetCropsIds = waterEfficient.length > 0 ? waterEfficient : ['grapes', 'lettuce'];
     game.logger.log(`SETUP WATER: Target crops: ${targetCropsIds.join(', ')}`, 2);
     if (targetCropsIds.length === 0) { game.logger.log("No water efficient crops defined for setup!", 0); return; }

     for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
             const cropIndex = (row * game.gridSize + col) % targetCropsIds.length;
             const cropId = targetCropsIds[cropIndex];
             const cropToPlantData = getCropById(cropId);
             const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
             const balanceBefore = game.balance;
             game.logger.log(`SETUP WATER: Attempting plant (${row},${col}) - ${cropId}, Bal Before: ${formatCurrency(balanceBefore)}, Need: ${formatCurrency(plantCost)}`, 3);
             const success = game.plantCrop(row, col, cropId);
             game.logger.log(`SETUP WATER: Planted (${row},${col}) -> Success: ${success}, Bal After: ${formatCurrency(game.balance)}`, 3);
             if (success) counts[cropId] = (counts[cropId] || 0) + 1;
        }
     }
     game.logger.log(`Water Saving Initial: Planted ${JSON.stringify(counts)}. Initial Balance: ${formatCurrency(game.balance)}`, 1);
}

// --- ADDED DecisionRule Setup ---
function setupDecisionRuleInitial(game) {
    game.logger.log(`Decision Rule Initial: Planting a diverse mix.`, 2);
    // Use the same logic as diverse setup for initial planting
    setupDiverseCropsInitial(game); // Re-use diverse setup logic
    game.logger.log(`Decision Rule setup complete.`, 1);
}
// -------------------------------

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

     // Tech research logic
     if (game.year > 1 && game.day % 30 === 0) {
        const researchBuffer = 20000;
        const researchQueue = [
            { id: 'drip_irrigation', prereqs: [] },
            { id: 'soil_sensors', prereqs: [] },
            { id: 'precision_drones', prereqs: ['soil_sensors'] }
        ];
        for (const techInfo of researchQueue) {
             const tech = game.technologies.find(t => t.id === techInfo.id);
             if (tech && !tech.researched) {
                 const cost = tech.cost;
                 const prereqsMet = checkTechPrerequisites(tech, game.researchedTechs);
                 if (prereqsMet && game.balance >= (cost + researchBuffer)) {
                     if (game.researchTechnology(techInfo.id)) break;
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

     // Tech research logic
     if (game.year > 1 && game.day % 30 === 0) {
         const researchBuffer = 25000;
         const researchQueue = [
             { id: 'no_till_farming', prereqs: [] },
             { id: 'soil_sensors', prereqs: [] },
             { id: 'silvopasture', prereqs: ['no_till_farming'] }
         ];
         for (const techInfo of researchQueue) {
             const tech = game.technologies.find(t => t.id === techInfo.id);
             if (tech && !tech.researched) {
                 const cost = tech.cost;
                 const prereqsMet = checkTechPrerequisites(tech, game.researchedTechs);
                 if (prereqsMet && game.balance >= (cost + researchBuffer)) {
                     if (game.researchTechnology(techInfo.id)) break;
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

    // Harvest Loop (Every Tick)
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

    // Actions Loop (Every 5 Ticks)
    if (game.day % 5 === 0) {
        for (let row = 0; row < game.gridSize; row++) {
            for (let col = 0; col < game.gridSize; col++) {
                const cell = game.grid[row][col];
                if (cell.crop.id === 'empty') {
                    if (row < 5 && col < 5) {
                         if (game.balance >= incomeCropCost) {
                             if (game.plantCrop(row, col, incomeCrop)) planted++;
                         }
                    }
                } else if (!cell.harvestReady) {
                    if (!cell.irrigated && cell.waterLevel < 40) {
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

    // Research Loop (Every 10 Ticks)
     if (game.day % 10 === 0) {
         const researchQueue = ['soil_sensors', 'drip_irrigation', 'precision_drones', 'ai_irrigation', 'drought_resistant', 'no_till_farming', 'renewable_energy', 'greenhouse', 'silvopasture'];
         for (const techId of researchQueue) {
            const tech = game.technologies.find(t => t.id === techId);
            if (tech && !tech.researched) {
                 const cost = game.getTechnologyCost(techId);
                 const prereqsMet = checkTechPrerequisites(tech, game.researchedTechs);
                 if (prereqsMet && game.balance >= cost) { // Check affordability
                    if (game.researchTechnology(techId)) {
                        game.logger.log(`Tech Strategy researching: ${techId}`, 2);
                        break;
                    }
                 } else if (prereqsMet && game.balance < cost) {
                     game.logger.log(`Tech Strategy wants ${techId} ($${cost}) but cannot afford ($${game.balance})`, 3);
                     break;
                 }
            }
         }
     }
}

function updateWaterSavingStrategy(game) {
    if (game.day % 3 !== 0) return;

    const targetCropsData = crops.filter(c => c.id !== 'empty' && c.waterUse < 3.0);
    let targetCropsIds = targetCropsData.map(c => c.id);
    if (targetCropsIds.length === 0) targetCropsIds.push('lettuce');

    let harvestedCount = 0;
    let totalHarvestIncome = 0;
    let planted = 0, irrigated = 0;
    const irrigationCost = game.irrigationCost;

    // Harvest Loop
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

    // Planting / Action Loop
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
            else if (!cell.irrigated && cell.waterLevel < 35 && game.waterReserve > 20) {
                 if (game.balance >= irrigationCost) {
                     if (game.irrigateCell(row, col)) irrigated++;
                 }
            }
        }
    }
     if(planted || irrigated) {
         game.logger.log(`WaterSave Tick Actions: P:${planted}, I:${irrigated}. Bal: ${formatCurrency(game.balance)}`, 3);
     }

     // Research Loop (Check affordability)
     if (game.day % 30 === 0) {
         const researchQueue = [
             { id: 'drip_irrigation', prereqs: [] },
             { id: 'soil_sensors', prereqs: [] },
             { id: 'drought_resistant', prereqs: [] },
             { id: 'ai_irrigation', prereqs: ['drip_irrigation', 'soil_sensors'] }
         ];
         const researchBuffer = 10000;

         for (const techInfo of researchQueue) {
             const tech = game.technologies.find(t => t.id === techInfo.id);
             if (tech && !tech.researched) {
                 const cost = game.getTechnologyCost(techInfo.id);
                 const prereqsMet = checkTechPrerequisites(tech, game.researchedTechs);
                 if (prereqsMet && game.balance >= (cost + researchBuffer)) { // Check affordability
                    if (game.researchTechnology(techInfo.id)) {
                        game.logger.log(`WaterSave Strategy researched: ${techInfo.id}`, 2);
                        break;
                    }
                 } else if (prereqsMet && game.balance < (cost + researchBuffer)) {
                     game.logger.log(`WaterSave wants ${techInfo.id} ($${cost}) but cannot afford ($${game.balance} < $${cost + researchBuffer})`, 3);
                 }
             }
         }
     }
}

// --- ADDED DecisionRule Strategy ---
function updateDecisionRuleStrategy(game) {
    // Check actions less frequently than every tick
    if (game.day % 5 !== 0) return;

    let harvestedCount = 0;
    let totalHarvestIncome = 0;
    let planted = 0, irrigated = 0, fertilized = 0, researched = 0;

    const availableCrops = crops.filter(c => c.id !== 'empty');
    const availableCropIds = availableCrops.map(c => c.id);
    if (availableCropIds.length === 0) return; // Should not happen

    const irrigationCost = game.irrigationCost;
    const fertilizeCost = game.fertilizeCost;

    // --- Harvest Loop (Always highest priority) ---
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            if (game.grid[row][col].harvestReady) {
                const harvestResult = game.harvestCell(row, col);
                if (harvestResult.success) {
                    harvestedCount++;
                    totalHarvestIncome += harvestResult.income;
                }
                // Note: Plot is now empty for the next loop
            }
        }
    }
    if (harvestedCount > 0) {
        game.logger.log(`HARVEST SUMMARY: Harvested ${harvestedCount} plots for ${formatCurrency(totalHarvestIncome)}. New Bal: ${formatCurrency(game.balance)}`, 1);
    }

    // --- Action Loop (Planting, Irrigating, Fertilizing) ---
    for (let row = 0; row < game.gridSize; row++) {
        for (let col = 0; col < game.gridSize; col++) {
            const cell = game.grid[row][col];

            // 1. Plant if empty
            if (cell.crop.id === 'empty') {
                // Choose crop based on simple logic (e.g., market price > 1.0?)
                let bestCropId = null;
                let maxPriceFactor = 0.9; // Only plant if price is decent
                availableCropIds.forEach(id => {
                    if (game.marketPrices[id] > maxPriceFactor) {
                         maxPriceFactor = game.marketPrices[id];
                         bestCropId = id;
                    }
                });
                // Fallback to rotation if no prices are > 0.9
                if (!bestCropId) {
                    const cropIndex = (row * game.gridSize + col + Math.floor(game.day / 5)) % availableCropIds.length;
                    bestCropId = availableCropIds[cropIndex];
                }

                const cropToPlantData = getCropById(bestCropId);
                const plantCost = cropToPlantData ? Math.round(cropToPlantData.basePrice * game.plantingCostFactor) : Infinity;
                if (game.balance >= plantCost) {
                    if (game.plantCrop(row, col, bestCropId)) {
                        planted++;
                        game.logger.log(`DecisionRule planted ${bestCropId} at (${row},${col}) (Price Factor: ${maxPriceFactor.toFixed(2)})`, 3); // VERBOSE
                    }
                }
            }
            // 2. Irrigate if needed
            else if (!cell.harvestReady && !cell.irrigated && cell.waterLevel < 50 && game.waterReserve > 25) {
                if (game.balance >= irrigationCost) {
                    if (game.irrigateCell(row, col)) {
                        irrigated++;
                         game.logger.log(`DecisionRule irrigated (${row},${col})`, 3); // VERBOSE
                    }
                }
            }
            // 3. Fertilize if needed
            else if (!cell.harvestReady && !cell.fertilized && cell.soilHealth < 60) {
                 if (game.balance >= fertilizeCost) {
                     if (game.fertilizeCell(row, col)) {
                         fertilized++;
                          game.logger.log(`DecisionRule fertilized (${row},${col})`, 3); // VERBOSE
                     }
                 }
            }
        }
    }
     if(planted || irrigated || fertilized) {
         game.logger.log(`DecisionRule Tick Actions: P:${planted}, I:${irrigated}, F:${fertilized}. Bal: ${formatCurrency(game.balance)}`, 3); // VERBOSE
     }

    // --- Research Logic (Check every 30 days) ---
    if (game.day % 30 === 0) {
        const researchBuffer = 25000; // Keep a reasonable buffer
        const researchQueue = [
             { id: 'soil_sensors', category: 'efficiency' },
             { id: 'drip_irrigation', category: 'water' },
             { id: 'no_till_farming', category: 'soil' },
             { id: 'drought_resistant', category: 'water' },
             { id: 'precision_drones', category: 'efficiency' },
             { id: 'ai_irrigation', category: 'water' },
             { id: 'silvopasture', category: 'soil' },
             { id: 'renewable_energy', category: 'cost' },
             { id: 'greenhouse', category: 'protection' }
        ];

        for (const techInfo of researchQueue) {
             const tech = game.technologies.find(t => t.id === techInfo.id);
             if (tech && !tech.researched) {
                 const cost = game.getTechnologyCost(techInfo.id);
                 const prereqsMet = checkTechPrerequisites(tech, game.researchedTechs);

                 let shouldResearch = false;
                 if (prereqsMet && game.balance >= (cost + researchBuffer)) {
                    // Priority: Water tech if reserve < 40% OR drought probability high
                    if (techInfo.category === 'water' && (game.waterReserve < 40 || game.climate.droughtProbability > 0.15)) {
                        shouldResearch = true;
                    }
                    // Next: Soil tech if health < 50%
                    else if (techInfo.category === 'soil' && game.farmHealth < 50) {
                        shouldResearch = true;
                    }
                    // Default: Research others if conditions allow and no urgent need
                    else if (!shouldResearch && techInfo.category !== 'water' && techInfo.category !== 'soil') {
                        shouldResearch = true;
                    }
                 }

                 if (shouldResearch) {
                     if (game.researchTechnology(techInfo.id)) {
                         researched++;
                         game.logger.log(`DecisionRule researched: ${techInfo.id}`, 1); // INFO level
                         break; // Only one research action per check
                     }
                 } else if (prereqsMet && game.balance < (cost + researchBuffer)) {
                      game.logger.log(`DecisionRule wants ${techInfo.id} ($${cost}) but cannot afford ($${game.balance} < $${cost + researchBuffer})`, 3); // VERBOSE
                      // Consider breaking if it's a high-priority category? For now, continue checking cheaper options.
                 }
             }
        }
    }
    if (researched > 0) {
         game.logger.log(`DecisionRule Researched ${researched} tech(s) this cycle.`, 2); // DEBUG
    }
}
// -----------------------------------
