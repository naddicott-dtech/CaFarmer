/**
 * California Climate Farmer - Cell Class
 *
 * This file defines the Cell class, which represents a single grid cell in the farm.
 * Each cell tracks its crop, growth state, environmental conditions, and crop history.
 */

import { crops } from './crops.js';

// Define constants for empty plot soil dynamics
const EMPTY_PLOT_SOIL_DEGRADATION_DRY = 0.02; // Per day in dry conditions (Summer/low water)
const EMPTY_PLOT_SOIL_DEGRADATION_WET = 0.01; // Per day in wet conditions (erosion)
const EMPTY_PLOT_SOIL_REGEN_BASE = 0.005; // Base regen per day (e.g., microbial activity)

// Cell class definition
export class Cell {
    constructor() {
        this.crop = crops[0]; // Empty plot by default
        this.waterLevel = 80;
        this.soilHealth = 90;
        this.growthProgress = 0;
        this.daysSincePlanting = 0;
        this.fertilized = false;
        this.irrigated = false;
        this.harvestReady = false;
        this.expectedYield = 0; // Base yield expectation before modifiers

        // Track crop history to implement monocropping penalties
        this.cropHistory = [];
        this.consecutivePlantings = 0;
        this.pestPressure = 0; // % likelihood or severity factor
    }

    // Plant a new crop
    plant(newCrop) {
        if (!newCrop || newCrop.id === 'empty') return false; // Should not happen if called correctly

        // Remember previous crop if not empty
        if (this.crop.id !== 'empty') {
            this.cropHistory.push({
                id: this.crop.id,
                duration: this.daysSincePlanting
            });

            // Keep history at reasonable size
            if (this.cropHistory.length > 10) {
                this.cropHistory.shift();
            }

            // Check if planting the same crop again
            if (newCrop.id === this.crop.id) {
                this.consecutivePlantings++;
                // Increase pest pressure for monocropping
                this.pestPressure = Math.min(80, this.pestPressure + 10 * this.consecutivePlantings);
            } else {
                // Reset consecutive plantings when changing crops
                this.consecutivePlantings = 0;
                // Crop rotation benefit: reduce pest pressure
                this.pestPressure = Math.max(0, this.pestPressure - 30);
            }
        } else {
            // Planting on a previously empty plot
            this.consecutivePlantings = 0; // Ensure reset
            // Reduce any lingering pest pressure slightly? Maybe not needed.
        }

        this.crop = newCrop;
        this.growthProgress = 0;
        this.daysSincePlanting = 0;
        this.fertilized = false;
        this.irrigated = false;
        this.harvestReady = false;

        // Base yield expectation starts at 100%
        // Reduced by initial pest pressure and consecutive plantings penalty
        const monocropPenalty = this.consecutivePlantings * 5; // 5% penalty per consecutive planting
        const pestPenalty = this.pestPressure / 2; // Up to 40% penalty from high pest pressure

        this.expectedYield = Math.max(40, 100 - monocropPenalty - pestPenalty);

        return true;
    }

    // Apply irrigation
    irrigate(waterEfficiency = 1.0) {
        if (this.crop.id === 'empty') return false;
        // Allow re-irrigation if needed? For now, only once per day.
        if (this.irrigated) return false;

        this.irrigated = true; // Mark as irrigated for the day
        // Irrigation amount could be a parameter
        this.waterLevel = Math.min(100, this.waterLevel + 30 * waterEfficiency);
        return true;
    }

    // Apply fertilizer
    fertilize(fertilizerEfficiency = 1.0) {
        if (this.crop.id === 'empty') return false;
        // Allow re-fertilization? For now, only once per growth cycle.
        if (this.fertilized) return false;

        this.fertilized = true; // Mark as fertilized for this growth cycle

        // Fertilizer effectiveness reduced on depleted soils
        const soilFactor = 0.5 + (this.soilHealth / 200); // 50% effective at 0 soil, 100% at 100

        // Fertilizer improves soil health slightly
        // Use named range/parameter? For now, hardcoded.
        const soilBoost = 15 * fertilizerEfficiency * soilFactor;
        this.soilHealth = Math.min(100, this.soilHealth + soilBoost);

        // Yield boost from fertilizer also affected by soil health and pest pressure
        const yieldBoost = 20 * fertilizerEfficiency * soilFactor * (1 - (this.pestPressure / 150)); // Pest impact capped
        this.expectedYield = Math.min(150, this.expectedYield + yieldBoost); // Cap yield boost

        return true;
    }

    // Update cell for daily changes
    update(waterReserve, techs) { // techs is an array of researched tech IDs

        // Reset daily flags
        this.irrigated = false; // Can irrigate again tomorrow

        // --- Handle Empty Plot Soil Dynamics ---
        if (this.crop.id === 'empty') {
            // Apply natural soil changes to empty plots
            let soilChange = EMPTY_PLOT_SOIL_REGEN_BASE; // Start with base regeneration
            // More degradation in dry conditions/summer or if water level is low
            if (waterReserve < 40 || this.waterLevel < 30) {
                 soilChange -= EMPTY_PLOT_SOIL_DEGRADATION_DRY;
            }
            // Add slight erosion if water level is very high (e.g., > 95) - simulate runoff
            if (this.waterLevel > 95) {
                 soilChange -= EMPTY_PLOT_SOIL_DEGRADATION_WET;
            }

            // Apply No-Till Farming tech effect if researched (reduces degradation)
            if (techs && techs.includes('no_till_farming')) {
                 if(soilChange < 0) { // Only reduce degradation, not enhance regen
                     soilChange *= 0.5; // Halve the degradation rate
                 }
            }

            this.soilHealth = Math.max(10, Math.min(100, this.soilHealth + soilChange));
            // Water level in empty plots might slowly evaporate or seep?
            this.waterLevel = Math.max(0, this.waterLevel - 0.1); // Very slow passive water loss

            return; // Stop update for empty plot
        }

        // --- Handle Plot with Crop ---
        this.daysSincePlanting++;

        // Calculate growth progress based on conditions
        const growthRate = this.calculateGrowthRate(waterReserve, techs);
        this.growthProgress += growthRate;

        // Check if ready for harvest
        if (!this.harvestReady && this.growthProgress >= 100) {
            this.harvestReady = true;
            this.growthProgress = 100; // Cap progress at 100
            return 'harvest-ready'; // Return event string
        }

        // If harvestReady, growth stops, but conditions still apply
        if (this.harvestReady) {
            // Maybe slight degradation of yield if left unharvested too long? Add later if needed.
        }

        // Crop water consumption
        const baseWaterUse = (this.crop.waterUse / 200) * 100; // Convert factor to % point loss per day
        // Water use might be affected by growth stage? Simplified for now.
        // Apply water efficiency tech
        const waterEfficiencyFactor = techs && techs.includes('drip_irrigation') ? 0.8 : 1.0; // Drip irrigation reduces use by 20%
        const actualWaterUse = baseWaterUse * waterEfficiencyFactor;
        this.waterLevel = Math.max(0, this.waterLevel - actualWaterUse);

        // Water stress affects expected yield (if not yet ready for harvest)
        if (this.waterLevel < 30 && !this.harvestReady) {
            // Reduce expected yield slightly each day under stress
             const stressPenalty = 1 * (1 - (this.waterLevel / 30)); // More penalty the lower the water
            this.expectedYield = Math.max(10, this.expectedYield - stressPenalty);
        }

        // Base soil degradation rate from farming
        let soilDegradation = 0.1; // Base daily degradation from farming activity
        // Increase degradation with consecutive plantings of the same crop
        if (this.consecutivePlantings > 0) {
            soilDegradation *= (1 + (this.consecutivePlantings * 0.3));
        }
        // High pest pressure accelerates soil degradation
        if (this.pestPressure > 50) { // Threshold for significant impact
            soilDegradation *= 1.2;
        }

        // Apply No-Till Farming tech effect
        if (techs && techs.includes('no_till_farming')) {
            soilDegradation *= 0.5; // Reduced degradation with no-till
        }

        this.soilHealth = Math.max(10, this.soilHealth - soilDegradation);

        // Very depleted soil increases pest pressure chance
        if (this.soilHealth < 40 && Math.random() < 0.02) {
            this.pestPressure = Math.min(80, this.pestPressure + 2);
        }

        // Pests might decrease slightly naturally over time if pressure is low? Add later.
    }

    // Calculate growth rate based on conditions
    calculateGrowthRate(waterReserve, techs) {
        // Base growth rate based on crop growth time
        const baseRate = 100 / this.crop.growthTime;
        if (baseRate <= 0) return 0; // Avoid division by zero for invalid growth times

        // Water factors
        const cellWaterFactor = this.waterLevel / 100;
        const farmWaterFactor = waterReserve / 100;
        // Weighted average, farm reserve has less direct impact than cell level
        let combinedWaterFactor = cellWaterFactor * 0.8 + farmWaterFactor * 0.2;
        // Apply crop's water sensitivity exponent
        let waterMultiplier = Math.pow(combinedWaterFactor, this.crop.waterSensitivity || 1.0);
        // Tech: Drought-resistant varieties improve multiplier under stress
        if (techs && techs.includes('drought_resistant') && waterMultiplier < 0.8) {
            waterMultiplier = Math.max(waterMultiplier, 0.5); // Ensure it doesn't make things worse, provides minimum benefit
        }
         // Tech: AI Irrigation provides a small boost if water isn't perfect
         if (techs && techs.includes('ai_irrigation') && waterMultiplier < 1.0) {
             waterMultiplier *= 1.05; // Small 5% boost
         }


        // Soil factor - make soil health impactful
        // *** FIX: Change const to let ***
        let soilMultiplier = 0.3 + (0.7 * Math.pow(this.soilHealth / 100, 0.8)); // Power curve for soil impact
        // Tech: Soil Sensors provide slight optimization boost
        if (techs && techs.includes('soil_sensors')) {
            soilMultiplier *= 1.05; // Small 5% boost
        }

        // Fertilizer factor
        const fertilizerMultiplier = this.fertilized ? 1.2 : 1.0;

        // Pest pressure reduces growth rate
        const pestMultiplier = 1 - (this.pestPressure / 200); // Max 40% reduction at 80 pest pressure

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

        // Apply final modifiers at harvest time (e.g., last-minute events - not implemented here yet)

        // Clamp yield percentage
        finalYieldPercentage = Math.max(0, Math.min(150, finalYieldPercentage)); // Yield can be > 100% with boosts

        // Calculate final harvest value
        const baseValue = this.crop.harvestValue || 0;
        const harvestValue = Math.round(baseValue * (finalYieldPercentage / 100) * marketPriceFactor);

        // Result object
        const result = {
            cropName: this.crop.name,
            value: harvestValue,
            yieldPercentage: Math.round(finalYieldPercentage)
        };

        // --- Reset Cell State ---
        const harvestedCropId = this.crop.id; // Store before resetting
        const harvestedCrop = crops.find(c => c.id === harvestedCropId); // Get full crop data for impact

        // Apply soil health impact from harvesting the specific crop
        const cropSoilImpact = harvestedCrop?.soilImpact || 0; // Use stored crop data
        const monocropFactor = 1 + (this.consecutivePlantings * 0.2);
        const harvestImpact = (5 + Math.abs(cropSoilImpact)) * monocropFactor; // Base + Crop Impact, modified by monocropping

        // Apply impact BEFORE resetting the cell
        this.soilHealth = Math.max(10, this.soilHealth - harvestImpact);

        // Now reset the cell
        this.crop = crops[0]; // Set to Empty Plot
        this.growthProgress = 0;
        this.daysSincePlanting = 0;
        this.fertilized = false; // Reset fertilizer status
        this.irrigated = false; // Reset daily irrigation status
        this.harvestReady = false;
        this.expectedYield = 0;
        // Keep consecutivePlantings (used when planting next crop)
        // Keep pestPressure (let it decay or change with next planting)
        // Keep cropHistory

        return result;
    }

    // Apply environmental effects (for events)
    applyEnvironmentalEffect(effect, magnitude, protectionFactor = 1.0) {
        const effectiveMagnitude = magnitude * protectionFactor;

        switch (effect) {
            case 'water-increase':
                this.waterLevel = Math.min(100, this.waterLevel + magnitude); // Protection shouldn't reduce benefits
                break;
            case 'water-decrease':
                this.waterLevel = Math.max(0, this.waterLevel - effectiveMagnitude);
                break;
            case 'soil-damage':
                this.soilHealth = Math.max(10, this.soilHealth - effectiveMagnitude);
                break;
            case 'soil-improve':
                this.soilHealth = Math.min(100, this.soilHealth + magnitude); // Protection shouldn't reduce benefits
                break;
            case 'yield-damage':
                if (this.crop.id !== 'empty') {
                    // Apply damage to expected yield, more impact closer to harvest? For now, simple reduction.
                    this.expectedYield = Math.max(0, this.expectedYield - effectiveMagnitude);
                }
                break;
            case 'growth-boost': // Less common, maybe from ideal weather?
                if (this.crop.id !== 'empty' && !this.harvestReady) {
                    this.growthProgress = Math.min(100, this.growthProgress + magnitude);
                }
                break;
            case 'pest-increase':
                 // Protection factor could represent IPM or resistant strains
                 this.pestPressure = Math.min(80, this.pestPressure + effectiveMagnitude);
                break;
            case 'pest-decrease': // E.g., beneficial insects event
                this.pestPressure = Math.max(0, this.pestPressure - magnitude); // Protection shouldn't reduce benefits
                break;
        }
    }
}
