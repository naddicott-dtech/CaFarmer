/**
 * California Climate Farmer - Cell Class
 *
 * This file defines the Cell class, which represents a single grid cell in the farm.
 * Each cell tracks its crop, growth state, environmental conditions, and crop history.
 */

import { crops, getCropById } from './crops.js'; // Ensure getCropById is imported if needed here, or rely on game passing full crop data

// Define constants for empty plot soil dynamics
// ADJUSTMENT: Slightly reduce base degradation, slightly increase regen
const EMPTY_PLOT_SOIL_DEGRADATION_DRY = 0.015; // Was 0.02
const EMPTY_PLOT_SOIL_DEGRADATION_WET = 0.008; // Was 0.01 (less erosion when just wet)
const EMPTY_PLOT_SOIL_REGEN_BASE = 0.008; // Was 0.005

// Cell class definition
export class Cell {
    constructor() {
        this.crop = getCropById('empty'); // Use getter for consistency
        this.waterLevel = 80; // %
        this.soilHealth = 85; // % - Start slightly lower? Was 90.
        this.growthProgress = 0; // %
        this.daysSincePlanting = 0;
        this.fertilized = false; // Has fertilizer been applied this cycle?
        this.irrigated = false; // Has irrigation been applied today?
        this.harvestReady = false;
        this.expectedYield = 0; // Base yield % expectation before modifiers

        // Track crop history to implement monocropping penalties/benefits
        this.cropHistory = []; // Stores { id: 'cropId', duration: days }
        this.consecutivePlantings = 0; // Number of times same crop planted consecutively
        this.pestPressure = 5; // % factor reducing yield/growth (0-100 scale?) Start with a tiny base
    }

    // Plant a new crop
    plant(newCropData) { // Expect full crop data object
        if (!newCropData || newCropData.id === 'empty') return false;

        const previousCropId = this.crop.id;

        // Remember previous crop if not empty
        if (previousCropId !== 'empty') {
            this.cropHistory.push({
                id: previousCropId,
                duration: this.daysSincePlanting
            });
            if (this.cropHistory.length > 10) this.cropHistory.shift(); // Limit history size

            // Check for monocropping
            if (newCropData.id === previousCropId) {
                this.consecutivePlantings++;
                // Increase pest pressure more significantly for monocropping
                this.pestPressure = Math.min(80, this.pestPressure + 15 * this.consecutivePlantings); // Higher increase
            } else {
                // Crop rotation benefit
                this.consecutivePlantings = 0;
                this.pestPressure = Math.max(0, this.pestPressure - 40); // Stronger reduction for rotation
            }
        } else {
            // Planting on a previously empty plot resets consecutive count
            this.consecutivePlantings = 0;
            // Pest pressure might slowly decay on empty plots (handled in update)
        }

        // Set new crop and reset state
        this.crop = newCropData;
        this.growthProgress = 0;
        this.daysSincePlanting = 0;
        this.fertilized = false;
        this.irrigated = false;
        this.harvestReady = false;

        // Base yield expectation starts at 100%
        // ADJUSTMENT: Slightly soften initial penalties
        const monocropPenalty = this.consecutivePlantings * 4; // Was 5% per planting
        const pestPenalty = this.pestPressure / 2.5; // Was / 2 (max 32% penalty instead of 40%)

        this.expectedYield = Math.max(30, 100 - monocropPenalty - pestPenalty); // Floor at 30%

        return true;
    }

    // Apply irrigation
    irrigate(waterEfficiency = 1.0) {
        if (this.crop.id === 'empty' || this.irrigated) return false;
        this.irrigated = true; // Mark as irrigated for the day
        // Assume irrigation adds a fixed amount, modified by efficiency tech?
        // Or maybe it just tops up to a certain level? Let's use fixed amount.
        const irrigationAmount = 30 * waterEfficiency; // Base amount added
        this.waterLevel = Math.min(100, this.waterLevel + irrigationAmount);
        return true;
    }

    // Apply fertilizer
    fertilize(fertilizerEfficiency = 1.0) {
        if (this.crop.id === 'empty' || this.fertilized) return false;
        this.fertilized = true; // Mark as fertilized for this growth cycle

        // Effectiveness depends on soil health
        const soilFactor = 0.5 + (this.soilHealth / 200); // 50% effective at 0 soil, 100% at 100

        // Improves soil health slightly
        const soilBoost = 10 * fertilizerEfficiency * soilFactor; // Reduced boost? Was 15
        this.soilHealth = Math.min(100, this.soilHealth + soilBoost);

        // Boosts expected yield, impacted by soil and pests
        const yieldBoost = 15 * fertilizerEfficiency * soilFactor * (1 - (this.pestPressure / 150)); // Reduced boost? Was 20
        this.expectedYield = Math.min(150, this.expectedYield + yieldBoost); // Cap yield boost

        return true;
    }

    // Update cell for daily changes
    update(waterReserve, techs) { // techs is an array of researched tech IDs

        // Reset daily flags
        this.irrigated = false; // Can irrigate again tomorrow

        // --- Handle Empty Plot Soil Dynamics ---
        if (this.crop.id === 'empty') {
            let soilChange = EMPTY_PLOT_SOIL_REGEN_BASE; // Start with base regeneration

            // Apply No-Till effect if present (enhances regen slightly)
            if (techs && techs.includes('no_till_farming')) {
                 soilChange *= 1.2; // Small boost to regen with no-till
            }

            // Degradation factors
            if (waterReserve < 40 || this.waterLevel < 30) { // Dry conditions
                 let dryDegradation = EMPTY_PLOT_SOIL_DEGRADATION_DRY;
                 if (techs && techs.includes('no_till_farming')) dryDegradation *= 0.5; // No-till reduces dry degradation
                 soilChange -= dryDegradation;
            }
            if (this.waterLevel > 95) { // Wet conditions (erosion)
                 let wetDegradation = EMPTY_PLOT_SOIL_DEGRADATION_WET;
                 if (techs && techs.includes('no_till_farming')) wetDegradation *= 0.3; // No-till strongly reduces wet erosion
                 soilChange -= wetDegradation;
            }


            this.soilHealth = Math.max(10, Math.min(100, this.soilHealth + soilChange)); // Apply change, clamp 10-100
            this.waterLevel = Math.max(0, this.waterLevel - 0.05); // Slower passive water loss on empty plots
            // Decay pest pressure slowly on empty plots
            this.pestPressure = Math.max(0, this.pestPressure - 0.1);

            return; // Stop update for empty plot
        }

        // --- Handle Plot with Crop ---
        this.daysSincePlanting++;

        // Calculate growth progress
        const growthRate = this.calculateGrowthRate(waterReserve, techs);
        this.growthProgress += growthRate;
        this.growthProgress = Math.min(100, this.growthProgress); // Ensure progress doesn't exceed 100 before harvest check

        // Check if ready for harvest
        if (!this.harvestReady && this.growthProgress >= 100) {
            this.harvestReady = true;
            // Don't return yet, apply daily effects even on harvest day
        }

        // If already harvestReady, growth stops, but conditions still apply
        if (this.harvestReady) {
            // Potential yield degradation if left unharvested?
            // Example: Small daily yield loss if ready but not harvested
            this.expectedYield = Math.max(0, this.expectedYield - 0.1);
        }

        // Crop water consumption
        const baseWaterUsePerDay = this.crop.waterUse; // Assuming waterUse is scaled appropriately (e.g., % points per day)
        // Apply water efficiency tech
        let waterEfficiencyFactor = 1.0;
        if (techs && techs.includes('drip_irrigation')) waterEfficiencyFactor *= 0.8; // Drip reduces use
        if (techs && techs.includes('ai_irrigation')) waterEfficiencyFactor *= 0.9; // AI further reduces
        if (techs && techs.includes('drought_resistant')) waterEfficiencyFactor *= 0.95; // Resistant varieties slightly more efficient

        const actualWaterUse = baseWaterUsePerDay * waterEfficiencyFactor;
        this.waterLevel = Math.max(0, this.waterLevel - actualWaterUse);

        // Water stress affects expected yield (if not yet ready for harvest)
        if (this.waterLevel < 30 && !this.harvestReady) {
            const stressPenalty = 0.8 * (1 - (this.waterLevel / 30)); // Slightly less harsh penalty
            let droughtResistanceFactor = 1.0;
            if (techs && techs.includes('drought_resistant')) droughtResistanceFactor = 0.6; // Tech reduces penalty
            this.expectedYield = Math.max(10, this.expectedYield - (stressPenalty * droughtResistanceFactor));
        }

        // Soil degradation from farming
        let soilDegradation = 0.08; // Reduced base daily degradation
        if (this.consecutivePlantings > 0) {
            soilDegradation *= (1 + (this.consecutivePlantings * 0.25)); // Reduced penalty scaling
        }
        if (this.pestPressure > 50) {
            soilDegradation *= 1.15; // Reduced pest impact scaling
        }
        // Apply No-Till Farming tech effect
        if (techs && techs.includes('no_till_farming')) {
            soilDegradation *= 0.4; // Stronger reduction with no-till
        } else {
            // Increase degradation slightly without no-till?
             soilDegradation *= 1.1;
        }

        // Check for soil regen techs
        let soilRegen = 0;
        if (techs && techs.includes('no_till_farming')) soilRegen += 0.01; // Small base regen from no-till
        if (techs && techs.includes('silvopasture')) soilRegen += 0.01; // Regen from silvopasture

        // Apply net soil change
        this.soilHealth = Math.max(10, Math.min(100, this.soilHealth - soilDegradation + soilRegen));


        // Pest pressure dynamics
        if (this.soilHealth < 40 && Math.random() < 0.015) { // Lower chance
            this.pestPressure = Math.min(80, this.pestPressure + 1.5); // Slower increase
        }
        // Slow natural pest pressure decay if low
        if (this.pestPressure > 0 && this.pestPressure < 30 && !this.fertilized /* Pests might like fertilizer? */ ) {
             this.pestPressure = Math.max(0, this.pestPressure - 0.05); // Very slow decay
        }

        // Return status if needed by caller (e.g., for UI)
        if (this.harvestReady) return 'harvest-ready';
    }

    // Calculate growth rate based on conditions
    calculateGrowthRate(waterReserve, techs) {
        if (this.crop.id === 'empty' || this.harvestReady) return 0; // No growth if empty or ready

        // Base growth rate based on crop growth time
        const baseRate = (this.crop.growthTime > 0) ? (100 / this.crop.growthTime) : 0;
        if (baseRate <= 0) return 0;

        // Water factors
        const cellWaterFactor = this.waterLevel / 100;
        const farmWaterFactor = waterReserve / 100;
        let combinedWaterFactor = cellWaterFactor * 0.8 + farmWaterFactor * 0.2; // Cell level more important
        let waterMultiplier = Math.pow(Math.max(0, combinedWaterFactor), this.crop.waterSensitivity || 1.0); // Ensure base isn't negative
        if (techs && techs.includes('drought_resistant') && waterMultiplier < 0.8) { waterMultiplier = Math.max(waterMultiplier, 0.5); } // Min benefit under stress
        if (techs && techs.includes('ai_irrigation') && waterMultiplier < 1.0) { waterMultiplier *= 1.05; } // Small boost

        // Soil factor
        let soilMultiplier = 0.3 + (0.7 * Math.pow(this.soilHealth / 100, 0.8)); // Power curve, sensitive to low soil
        if (techs && techs.includes('soil_sensors')) { soilMultiplier *= 1.05; } // Small boost
         if (techs && techs.includes('no_till_farming')) { soilMultiplier *= 1.03; } // Tiny boost from no-till structure

        // Fertilizer factor
        const fertilizerMultiplier = this.fertilized ? 1.2 : 1.0; // Keep boost significant

        // Pest pressure reduces growth rate
        const pestMultiplier = 1 - (this.pestPressure / 250); // Reduced impact (was / 200)

        // Calculate final growth rate, ensuring it's not negative
        const finalRate = baseRate * waterMultiplier * soilMultiplier * fertilizerMultiplier * pestMultiplier;

        return Math.max(0, finalRate); // Growth rate cannot be negative
    }

    // Harvest the cell
    harvest(waterReserve, marketPriceFactor) {
        if (this.crop.id === 'empty') return { value: 0, cropName: 'Nothing', yieldPercentage: 0 };
        if (!this.harvestReady) return { value: 0, cropName: this.crop.name, yieldPercentage: 0 };

        // Start with the expected yield calculated during growth
        let finalYieldPercentage = this.expectedYield;

        // Clamp yield percentage (0% to 150%)
        finalYieldPercentage = Math.max(0, Math.min(150, finalYieldPercentage));

        // Calculate final harvest value
        const baseValue = this.crop.harvestValue || 0;
        const harvestValue = Math.round(baseValue * (finalYieldPercentage / 100) * marketPriceFactor);

        // Result object
        const result = {
            cropName: this.crop.name,
            value: harvestValue,
            yieldPercentage: Math.round(finalYieldPercentage)
        };

        // --- Apply Post-Harvest Soil Impact ---
        const harvestedCropId = this.crop.id;
        const harvestedCrop = getCropById(harvestedCropId); // Use getter
        const cropSoilImpact = harvestedCrop?.soilImpact || 0; // Use stored crop data
        const monocropFactor = 1 + (this.consecutivePlantings * 0.15); // Reduced penalty scaling
        // ADJUSTMENT: Reduce base harvest impact slightly
        const harvestImpact = (4 + Math.abs(cropSoilImpact)) * monocropFactor; // Was 5 + ...

        // Apply impact BEFORE resetting the cell state
        this.soilHealth = Math.max(10, this.soilHealth - harvestImpact);

        // --- Reset Cell State ---
        this.crop = getCropById('empty'); // Set to Empty Plot using getter
        this.growthProgress = 0;
        this.daysSincePlanting = 0;
        this.fertilized = false; // Reset fertilizer status
        this.irrigated = false; // Reset daily irrigation status
        this.harvestReady = false;
        this.expectedYield = 0;
        // Keep consecutivePlantings, pestPressure, cropHistory for next planting decision

        return result;
    }

    // Apply environmental effects (for events)
    applyEnvironmentalEffect(effect, magnitude, protectionFactor = 1.0) {
        // Ensure protectionFactor doesn't make things worse (e.g., negative protection)
        protectionFactor = Math.max(0, Math.min(1, protectionFactor)); // Clamp 0-1
        const effectiveMagnitude = magnitude * (1 - protectionFactor); // Protection reduces the magnitude

        switch (effect) {
            case 'water-increase':
                // Protection shouldn't reduce benefits of rain
                this.waterLevel = Math.min(100, this.waterLevel + magnitude);
                break;
            case 'water-decrease':
                this.waterLevel = Math.max(0, this.waterLevel - effectiveMagnitude);
                break;
            case 'soil-damage':
                this.soilHealth = Math.max(10, this.soilHealth - effectiveMagnitude);
                break;
            case 'soil-improve':
                // Protection shouldn't reduce benefits
                this.soilHealth = Math.min(100, this.soilHealth + magnitude);
                break;
            case 'yield-damage':
                if (this.crop.id !== 'empty') {
                    // Apply damage to expected yield
                    this.expectedYield = Math.max(0, this.expectedYield - effectiveMagnitude);
                }
                break;
            case 'growth-boost':
                if (this.crop.id !== 'empty' && !this.harvestReady) {
                    // Protection shouldn't reduce benefits
                    this.growthProgress = Math.min(100, this.growthProgress + magnitude);
                }
                break;
            case 'pest-increase':
                 // Protection reduces the increase
                 this.pestPressure = Math.min(80, this.pestPressure + effectiveMagnitude);
                break;
            case 'pest-decrease': // E.g., beneficial insects event
                // Protection shouldn't reduce benefits
                this.pestPressure = Math.max(0, this.pestPressure - magnitude);
                break;
        }
    }
} // End of Cell Class
