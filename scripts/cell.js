/**
 * California Climate Farmer - Cell Class
 * 
 * This file defines the Cell class, which represents a single grid cell in the farm.
 * Each cell tracks its crop, growth state, and environmental conditions.
 */

import { crops } from './crops.js';

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
        this.expectedYield = 0;
    }

    // Plant a new crop
    plant(newCrop) {
        this.crop = newCrop;
        this.growthProgress = 0;
        this.daysSincePlanting = 0;
        this.fertilized = false;
        this.irrigated = false;
        this.harvestReady = false;
        this.expectedYield = 100;
        return true;
    }

    // Apply irrigation
    irrigate(waterEfficiency = 1.0) {
        if (this.crop.id === 'empty') return false;
        if (this.irrigated) return false;
        
        this.irrigated = true;
        this.waterLevel = Math.min(100, this.waterLevel + 30 * waterEfficiency);
        return true;
    }

    // Apply fertilizer
    fertilize(fertilizerEfficiency = 1.0) {
        if (this.crop.id === 'empty') return false;
        if (this.fertilized) return false;
        
        this.fertilized = true;
        this.soilHealth = Math.min(100, this.soilHealth + 15 * fertilizerEfficiency);
        this.expectedYield = Math.min(150, this.expectedYield + 20 * fertilizerEfficiency);
        return true;
    }

    // Update cell for daily changes
    update(waterReserve, techs) {
        // Skip empty plots
        if (this.crop.id === 'empty') return;

        // Update growth
        this.daysSincePlanting++;
        
        // Calculate growth progress based on conditions
        const growthRate = this.calculateGrowthRate(waterReserve, techs);
        this.growthProgress += growthRate;

        // Check if ready for harvest
        if (this.growthProgress >= 100 && !this.harvestReady) {
            this.harvestReady = true;
            return 'harvest-ready'; // Return event
        }

        // Natural water level decrease
        const waterUseRate = this.crop.waterUse / 200; // Daily water use
        this.waterLevel = Math.max(0, this.waterLevel - waterUseRate * 100);

        // Water stress affects expected yield
        if (this.waterLevel < 30) {
            this.expectedYield = Math.max(10, this.expectedYield - 1);
        }

        // Soil health slowly degrades
        this.soilHealth = Math.max(10, this.soilHealth - 0.1);
    }

    // Calculate growth rate based on conditions
    calculateGrowthRate(waterReserve, techs) {
        // Base growth rate based on crop growth time
        const baseRate = 100 / this.crop.growthTime;
    
        // Get farm-wide water status
        const farmWaterFactor = waterReserve / 100;
        
        // Factors affecting growth
        let waterFactor = Math.pow(this.waterLevel / 100, this.crop.waterSensitivity);
        
        // Make farm water reserves have a significant impact
        if (waterReserve < 20) {
            // Exponential penalty for low water reserves
            const waterReservePenalty = Math.pow(farmWaterFactor, 1.5);
            waterFactor *= waterReservePenalty;
            
            // At 0% water reserve, growth is minimal
            if (waterReserve <= 5) {
                waterFactor *= 0.2; // severe penalty - only 20% of normal growth
            }
        }
        
        // Soil factor
        let soilFactor = Math.pow(this.soilHealth / 100, 0.8);
        let fertilizerFactor = this.fertilized ? 1.2 : 1.0;
    
        // Apply technology effects if provided
        if (techs) {
            if (techs.includes('drip_irrigation')) {
                waterFactor *= 1.1;
            }
        
            if (techs.includes('soil_sensors')) {
                soilFactor *= 1.1;
            }
        }
    
        // Calculate final growth rate
        return baseRate * waterFactor * soilFactor * fertilizerFactor;
    }

    // Harvest the cell
    harvest(waterReserve, marketPrice) {
        if (this.crop.id === 'empty') return 0;
        if (!this.harvestReady) return 0;
        
        // Calculate yield based on growing conditions
        let yieldPercentage = this.expectedYield / 100;
        
        // Apply water stress factor 
        const cellWaterFactor = this.waterLevel / 100;
        const farmWaterFactor = waterReserve / 100;
        
        // Combine cell and farm water factors, with farm having significant impact
        const combinedWaterFactor = cellWaterFactor * 0.7 + farmWaterFactor * 0.3;
        
        // Apply to yield with crop's water sensitivity
        yieldPercentage *= Math.pow(combinedWaterFactor, this.crop.waterSensitivity * 1.2);
        
        // Apply soil health factor
        const soilFactor = this.soilHealth / 100;
        yieldPercentage *= Math.pow(soilFactor, 0.8);
        
        // Calculate final harvest value
        const baseValue = this.crop.harvestValue;
        const harvestValue = Math.round(baseValue * yieldPercentage * marketPrice);
        
        // Preserve crop name for return value
        const result = {
            cropName: this.crop.name,
            value: harvestValue,
            yieldPercentage: Math.round(yieldPercentage * 100)
        };
        
        // Clear the cell
        this.crop = crops[0]; // Empty plot
        this.growthProgress = 0;
        this.daysSincePlanting = 0;
        this.fertilized = false;
        this.irrigated = false;
        this.harvestReady = false;
        this.expectedYield = 0;
        
        // Apply soil health impact from harvesting
        this.soilHealth = Math.max(10, this.soilHealth - 5);
        
        return result;
    }

    // Apply environmental effects (for events)
    applyEnvironmentalEffect(effect, magnitude, protection = 1.0) {
        switch (effect) {
            case 'water-increase':
                this.waterLevel = Math.min(100, this.waterLevel + magnitude);
                break;
            case 'water-decrease':
                this.waterLevel = Math.max(0, this.waterLevel - (magnitude * protection));
                break;
            case 'soil-damage':
                this.soilHealth = Math.max(10, this.soilHealth - (magnitude * protection));
                break;
            case 'soil-improve':
                this.soilHealth = Math.min(100, this.soilHealth + magnitude);
                break;
            case 'yield-damage':
                if (this.crop.id !== 'empty') {
                    this.expectedYield = Math.max(10, this.expectedYield - (magnitude * protection));
                }
                break;
            case 'growth-boost':
                if (this.crop.id !== 'empty') {
                    this.growthProgress = Math.min(100, this.growthProgress + magnitude);
                }
                break;
        }
    }
}
