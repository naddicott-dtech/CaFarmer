    processPendingEvents() {
        const activeEventsToday = this.pendingEvents.filter(event => event.day === this.day);
        const remainingEvents = this.pendingEvents.filter(event => event.day !== this.day);
        this.pendingEvents = remainingEvents;

        activeEventsToday.forEach(event => {
             if (!event || !event.type) {
                 this.logger.log(`ERROR: Processing invalid event object.`, 0);
                 console.error("Invalid event object:", event);
                 return;
             }

             this.logger.log(`-- Applying event: ${event.type} (${event.subType || event.severity || event.policyType || ''})`, 2);
            let result = {};
            let continueEvent = null;
            let logMsg = event.message;
            let logLvl = 3;

            // Determine log level
            if (event.isAlert) logLvl = 1;
            // --- PHASE 2: Adjust log levels for new/changed events ---
            if (event.type === 'frost' || (event.type === 'policy' && event.policyType !== 'policy_rebate') || event.type === 'technology') logLvl = 1;
            if (event.type === 'drought' || event.type === 'heatwave') {
                 if (event.severity === 'severe') logLvl = 1; else logLvl = 2;
            }
             if (event.type === 'weather' && event.subType === 'favorable') logLvl = 2; // INFO level for positive weather
            if (event.type === 'market' && (event.direction === 'opportunity' || Math.abs(event.changePercent || 0) > 25)) { logLvl = 1; }
            // -------------------------------------------------------

            let originalBalance = this.balance;

            try {
                 switch (event.type) {
                    case 'rain':
                        result = Events.applyRainEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                        this.waterReserve = result.waterReserve;
                        logMsg = result.message;
                        if (event.severity === 'heavy') logLvl = 2; else logLvl = 3;
                        break;
                    case 'drought':
                         result = Events.applyDroughtEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                         if (!result.skipped) {
                             this.waterReserve = result.waterReserve;
                             logMsg = result.message;
                             if (result.continueEvent) {
                                 continueEvent = { ...event, day: this.day + 1, duration: result.nextDuration, message: result.message };
                                 if (event.duration === result.nextDuration + 1) { this.logger.log(`Event Started: ${logMsg}`, logLvl); }
                                 else { this.logger.log(`Event Continues: ${logMsg}`, 3); }
                                 logMsg = null; // Don't log generic message again if continuing
                             } else {
                                 this.lastDroughtEndDay = this.day;
                                 this.addEvent(`The drought has ended.`); this.logger.log('Drought event ended.', logLvl);
                                 logMsg = null; // Don't log generic message if ended
                             }
                         } else { logMsg = null; }
                        break;
                    case 'heatwave':
                        result = Events.applyHeatwaveEvent(event, this.grid, this.waterReserve, this.researchedTechs);
                         if (!result.skipped) {
                            this.waterReserve = result.waterReserve;
                            logMsg = result.message;
                             if (result.continueEvent) {
                                continueEvent = { ...event, day: this.day + 1, duration: result.nextDuration, message: result.message };
                                if (event.duration === result.nextDuration + 1) { this.logger.log(`Event Started: ${logMsg}`, 1); }
                                else { this.logger.log(`Event Continues: ${logMsg}`, 3); }
                                logMsg = null;
                             } else {
                                 this.lastHeatwaveEndDay = this.day;
                                 this.addEvent(`The heatwave has ended.`); this.logger.log('Heatwave event ended.', 1);
                                 logMsg = null;
                             }
                         } else { logMsg = null; }
                        break;
                    case 'frost':
                         result = Events.applyFrostEvent(event, this.grid, this.researchedTechs);
                         logMsg = result.message;
                         this.lastFrostDay = this.day;
                        break;
                     // --- PHASE 2: Handle Favorable Weather ---
                     case 'weather': // Catch-all for weather sub-types if needed
                         if (event.subType === 'favorable') {
                             result = Events.applyFavorableWeatherEvent(event, this.grid, this.researchedTechs);
                             logMsg = result.message;
                             logLvl = 2; // Make it INFO level
                         } else {
                              this.logger.log(`Unknown weather subType processed: ${event.subType}`, 1);
                              logMsg = null;
                         }
                         break;
                     // ---------------------------------------
                    case 'market':
                         result = Events.applyMarketEvent(event, this.marketPrices, crops);
                        this.marketPrices = result.marketPrices;
                        logMsg = result.message;
                        // TODO: Implement temporary boost reset mechanism if needed.
                        break;
                    case 'policy':
                         result = Events.applyPolicyEvent(event, this.balance);
                         let finalCostPolicy = 0;
                         // Handle different policy types
                         if (event.policyType === 'water_restriction' && event.irrigationCostIncrease) {
                              // Apply irrigation cost modifier - HOW? Need a game state flag or modifier
                              // For now, we log it, but effect isn't applied yet. Needs mechanism.
                              this.logger.log(`Water restriction active: Irrigation costs increased by ${event.irrigationCostIncrease * 100}%`, 1);
                              logMsg = result.message; // Use message from event
                         } else if (result.balanceChange < 0 && event.baseCost) { // Handle 'new_regulations' cost scaling
                             const baseCostPolicy = Math.abs(event.baseCost);
                             const minCostPolicy = 500; const maxCostPolicy = 6000;
                             const scaleFactorPolicy = Math.min(1.8, Math.max(0.7, 1 + (originalBalance - 150000) / 300000));
                             finalCostPolicy = Math.round(Math.min(maxCostPolicy, Math.max(minCostPolicy, baseCostPolicy * scaleFactorPolicy)));
                             this.balance = originalBalance - finalCostPolicy; // Apply scaled cost
                             logMsg = `${event.message} Final Cost: ${formatCurrency(finalCostPolicy)}`;
                         } else if (result.balanceChange > 0) { // Handle subsidies and rebates
                             this.balance = originalBalance + result.balanceChange;
                             logMsg = result.message;
                             // Adjust log level for rebates if desired (make less prominent than subsidies)
                             if (event.policyType === 'policy_rebate') logLvl = 2;
                         } else {
                              // Should not happen for current policy events unless balanceChange is 0
                              this.balance = result.newBalance;
                              logMsg = result.message;
                         }
                         // Add balance change to log message if significant cost/gain
                         if (logLvl <= 1 && (finalCostPolicy > 0 || Math.abs(result.balanceChange) > 0)) {
                              if (logMsg && !logMsg.includes('(New Balance:')) { // Avoid double logging
                                 logMsg += ` (New Balance: ${formatCurrency(this.balance)})`;
                              }
                         }
                        break;
                    case 'technology':
                         result = Events.applyTechnologyEvent(event, this.balance, this.researchedTechs);
                         let finalCostTech = 0;
                         // Apply scaling ONLY to setbacks
                         if (event.subType === 'technology_setback' && result.balanceChange < 0) {
                              const baseCostTech = Math.abs(result.balanceChange); // Use the base amount passed back
                              const minCostTech = 800; const maxCostTech = 6000;
                              const scaleFactorTech = Math.min(1.6, Math.max(0.6, 1 + (originalBalance - 180000) / 250000));
                              finalCostTech = Math.round(Math.min(maxCostTech, Math.max(minCostTech, baseCostTech * scaleFactorTech)));
                              this.balance = originalBalance - finalCostTech; // Apply scaled cost
                              logMsg = `Technology setback! Equipment malfunction repair cost: ${formatCurrency(finalCostTech)}.`;
                         } else if (event.subType === 'innovation_grant' && result.balanceChange > 0) {
                              this.balance = originalBalance + result.balanceChange; // Apply grant amount
                              logMsg = result.message;
                         } else {
                             // Handle research breakthrough (no balance change here) or other future types
                             this.balance = result.newBalance;
                             logMsg = result.message;
                         }
                         // Add balance change to log message for grants/setbacks
                         if (logLvl <= 1) {
                             if(event.subType === 'innovation_grant' && result.balanceChange > 0) {
                                 if (logMsg && !logMsg.includes('(+$')) logMsg += ` (+${formatCurrency(result.balanceChange)})`;
                             }
                             if(event.subType === 'technology_setback') {
                                 if (logMsg && !logMsg.includes('(New Balance:')) logMsg += ` (New Balance: ${formatCurrency(this.balance)})`;
                             }
                         }
                        break;

                    default:
                         this.logger.log(`Unknown event type processed: ${event.type}`, 0);
                         logMsg = null;
                 }

                 if (logMsg) {
                     this.addEvent(logMsg, event.isAlert);
                     // Only log event result if message exists (prevents double logs for continuing events)
                     this.logger.log(`Event Result: ${logMsg}`, logLvl);
                 }

                 if (continueEvent) {
                     this.pendingEvents.push(continueEvent);
                     this.logger.log(`-- Event ${event.type} continues tomorrow (Day ${continueEvent.day}), duration left: ${continueEvent.duration}`, 2);
                 }
            } catch (error) {
                 this.logger.log(`ERROR applying event ${event.type} (${event.subType || event.policyType || ''}): ${error.message}`, 0);
                 console.error("Error during event processing:", event, error);
            }
        });
    } // END processPendingEvents
