/**
 * California Climate Farmer - UI Manager (Merged & Corrected)
 *
 * Handles UI rendering, updates, event handling, dashboard, and bulk actions.
 */

import { crops, getCropById } from './crops.js';
// *** Added import for currency formatting ***
import { formatCurrency } from './utils.js';

// UI Manager class
export class UIManager {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('farm-grid');
        this.ctx = this.canvas.getContext('2d');
        this.selectedCell = null; // For single selection
        this.cellSize = 40;

        // --- Properties from New Version ---
        this.selectedCells = []; // For multi/bulk selection
        this.selectionMode = 'single'; // 'single' or 'multi'
        this.isBulkActionInProgress = false; // Prevent conflicts
        this.lastAction = null; // { type: 'plant'|'irrigate'|..., params: {...} } for repeat action
        this.isResearchModalOpen = false; // Track modal states to prevent hotkey conflicts if needed
        this.isMarketModalOpen = false;
        // --- End New Properties ---

        // Set up canvas and event listeners (using the enhanced setup)
        this.setupCanvasSize();
        this.setupDashboard(); // Call dashboard setup
        this.setupEventListeners(); // Call enhanced event listeners setup

        // Create dashboard update timer
        this.dashboardUpdateTimer = setInterval(() => this.updateDashboard(), 5000); // Check every 5 seconds
    }

    // Set up canvas size and make it responsive (from original)
    setupCanvasSize() {
        const calculateSize = () => {
            const container = this.canvas.parentElement;
            // Ensure container exists and has dimensions
            if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
                console.warn("Canvas container not ready or has no dimensions yet.");
                // Maybe add a small delay and retry? For now, just log.
                // setTimeout(calculateSize, 100);
                return;
            }
            const width = container.clientWidth;
            // Use a fixed aspect ratio or available height, ensure height isn't zero
            const height = Math.max(container.clientHeight, width * (9/16)); // Example: maintain 16:9 aspect or use clientHeight
            this.canvas.width = width;
            this.canvas.height = height;
            // Ensure gridsize is valid before calculating cell size
             if (this.game.gridSize && this.game.gridSize > 0) {
                 this.cellSize = Math.min(width / this.game.gridSize, height / this.game.gridSize) * 0.9; // Adjust multiplier as needed
             } else {
                 console.warn("Grid size not available yet for cell calculation.");
                 this.cellSize = 40; // Default fallback
             }
            this.render(); // Render after size calculation
        };

        // Set initial size
        calculateSize();

        // Update on resize
        window.addEventListener('resize', calculateSize);
    }

    // --- NEW: Setup Dashboard ---
    setupDashboard() {
        // Create dashboard container if it doesn't exist
        if (!document.getElementById('farm-dashboard')) {
            const dashboardContainer = document.createElement('div');
            dashboardContainer.id = 'farm-dashboard';
            dashboardContainer.className = 'farm-dashboard'; // Initially hidden via CSS

            // Insert dashboard before the sidebar
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.parentNode) {
                 sidebar.parentNode.insertBefore(dashboardContainer, sidebar);
            } else {
                console.error("Sidebar not found for dashboard insertion.");
                document.body.appendChild(dashboardContainer); // Fallback append
            }


            // Add dashboard content
            dashboardContainer.innerHTML = `
                <div class="dashboard-header">
                    <h2>Farm Dashboard</h2>
                    <button id="refresh-dashboard" class="btn">Refresh</button>
                </div>
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h3>Water Status</h3>
                        <div id="water-chart" class="dashboard-chart"><div class="no-data">Loading...</div></div>
                        <div class="dashboard-stat">Average: <span id="avg-water">0</span>%</div>
                    </div>
                    <div class="dashboard-card">
                        <h3>Soil Health</h3>
                        <div id="soil-chart" class="dashboard-chart"><div class="no-data">Loading...</div></div>
                        <div class="dashboard-stat">Average: <span id="avg-soil">0</span>%</div>
                    </div>
                    <div class="dashboard-card">
                        <h3>Crop Distribution</h3>
                        <div id="crop-distribution" class="dashboard-chart"><div class="no-data">Loading...</div></div>
                    </div>
                    <div class="dashboard-card">
                        <h3>Growth Stages</h3>
                        <div id="growth-chart" class="dashboard-chart"><div class="no-data">Loading...</div></div>
                    </div>
                </div>
                <div class="dashboard-row">
                    <div class="dashboard-card wide">
                        <h3>Financial Summary</h3>
                        <div class="financial-stats">
                            <div class="financial-stat">
                                <span>Daily Expenses:</span>
                                <span id="daily-expenses">$0</span>
                            </div>
                            <div class="financial-stat">
                                <span>Season Income:</span>
                                <span id="season-income">$0</span>
                            </div>
                            <div class="financial-stat">
                                <span>Projected Income:</span>
                                <span id="projected-income">$0</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add event listener for refresh button
            const refreshBtn = document.getElementById('refresh-dashboard');
             if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.updateDashboard();
                });
             } else {
                 console.error("Refresh dashboard button not found");
             }

            // Add CSS for dashboard - Ensure this is only added once
            if (!document.getElementById('dashboard-styles')) {
                this.addDashboardStyles();
            }
        }
    }

    // --- NEW: Add CSS for dashboard ---
    addDashboardStyles() {
        const style = document.createElement('style');
        style.id = 'dashboard-styles'; // Add ID to prevent duplication
        style.textContent = `
            /* Dashboard visibility */
            .farm-dashboard { display: none; }
            .dashboard-visible .farm-dashboard { display: block; }

            /* Dashboard layout */
            .farm-dashboard {
                background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                padding: 1rem; margin-bottom: 1rem; overflow: auto;
            }
            .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
            .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
            .dashboard-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
            .dashboard-card { background: #f9f9f9; border-radius: 6px; padding: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); }
            .dashboard-card h3 { margin-top: 0; margin-bottom: 0.5rem; font-size: 1.1rem; color: var(--dark-color); }
            .dashboard-card.wide { flex: 1; }
            .dashboard-chart { height: 150px; margin: 0.5rem 0; background: #f0f0f0; border-radius: 4px; position: relative; overflow: hidden; }
            .dashboard-stat { font-size: 0.9rem; color: #555; text-align: center; margin-top: 0.5rem; }
            .dashboard-stat span { font-weight: bold; color: var(--text-color); }

            /* Chart specific styles */
            .no-data { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #999; font-style: italic; }
            .chart-bar { position: absolute; bottom: 0; background: var(--bar-color, #2a9d8f); transition: height 0.3s ease; border-top-left-radius: 3px; border-top-right-radius: 3px;}
            .bar-label { position: absolute; transform: translateX(-50%); font-size: 0.7rem; color: #666; bottom: 2px; text-align: center; z-index: 1; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}

             /* Financial stats */
            .financial-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-top: 0.5rem; }
            .financial-stat { padding: 0.8rem; background: #e9ecef; border-radius: 4px; text-align: center; }
            .financial-stat span:first-child { display: block; font-size: 0.8rem; color: #6c757d; margin-bottom: 0.3rem; }
            .financial-stat span:last-child { font-size: 1.1rem; font-weight: bold; color: #212529; }

            /* Responsive dashboard adjustments */
            @media (max-width: 768px) {
                .dashboard-grid { grid-template-columns: 1fr; }
                .dashboard-row { flex-direction: column; }
                .financial-stats { grid-template-columns: 1fr; }
                .dashboard-chart { height: 120px; }
            }
        `;
        document.head.appendChild(style);
    }


    // Set up all event listeners (Enhanced version merging old & new)
    setupEventListeners() {
        // Canvas click for cell selection (Handles selectionMode)
        this.canvas.addEventListener('click', (e) => {
            if (this.isBulkActionInProgress) return; // Prevent clicks during bulk action

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const offsetX = (this.canvas.width - this.cellSize * this.game.gridSize) / 2;
            const offsetY = (this.canvas.height - this.cellSize * this.game.gridSize) / 2;

            const col = Math.floor((x - offsetX) / this.cellSize);
            const row = Math.floor((y - offsetY) / this.cellSize);

            if (row >= 0 && row < this.game.gridSize && col >= 0 && col < this.game.gridSize) {
                if (this.selectionMode === 'single') {
                    this.selectCell(row, col); // Handles showing cell info
                } else if (this.selectionMode === 'multi') {
                    this.toggleCellInSelection(row, col); // Handles updating bulk panel
                }
            } else {
                // Click outside grid - clear selection?
                this.clearSelection();
                this.closeBulkActionPanel();
            }
        });

        // Mouse move for tooltips (from original)
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const offsetX = (this.canvas.width - this.cellSize * this.game.gridSize) / 2;
            const offsetY = (this.canvas.height - this.cellSize * this.game.gridSize) / 2;
            const col = Math.floor((x - offsetX) / this.cellSize);
            const row = Math.floor((y - offsetY) / this.cellSize);

            if (row >= 0 && row < this.game.gridSize && col >= 0 && col < this.game.gridSize) {
                this.showTooltip(e.clientX, e.clientY, row, col);
            } else {
                this.hideTooltip();
            }
        });

        // Mouse out to hide tooltip (from original)
        this.canvas.addEventListener('mouseout', () => {
            this.hideTooltip();
        });

        // --- Standard Buttons (from original) ---
        const pauseBtn = document.getElementById('pause-btn');
        if(pauseBtn) pauseBtn.addEventListener('click', () => this.game.togglePause());

        const helpBtn = document.getElementById('help-btn');
        if(helpBtn) helpBtn.addEventListener('click', () => {
            const helpModal = document.getElementById('help-modal');
            if(helpModal) helpModal.style.display = 'flex';
        });

        const researchBtn = document.getElementById('research-btn');
         if (researchBtn) researchBtn.addEventListener('click', () => {
             this.showResearchModal();
             this.isResearchModalOpen = true; // Track state
         });

        const marketBtn = document.getElementById('market-btn');
         if (marketBtn) marketBtn.addEventListener('click', () => {
             this.showMarketModal();
             this.isMarketModalOpen = true; // Track state
         });


        // Close buttons for modals (from original, added flag resets)
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    if (modal.id === 'research-modal') this.isResearchModalOpen = false;
                    if (modal.id === 'market-modal') this.isMarketModalOpen = false;
                }
            });
        });

        // Close modal when clicking outside (from original, added flag resets)
        window.addEventListener('click', (e) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    if (modal.id === 'research-modal') this.isResearchModalOpen = false;
                    if (modal.id === 'market-modal') this.isMarketModalOpen = false;
                }
            });
        });

        // Overlay select change (from original)
        const overlaySelect = document.getElementById('overlay-select');
        if(overlaySelect) overlaySelect.addEventListener('change', (e) => {
            this.game.currentOverlay = e.target.value;
            this.updateLegend();
            this.render();
        });

        // Speed slider (from original)
        const speedSlider = document.getElementById('speed-slider');
        if(speedSlider) speedSlider.addEventListener('input', (e) => {
            this.game.speed = parseInt(e.target.value);
            const speedValue = document.getElementById('speed-value');
            if(speedValue) speedValue.textContent = `${this.game.speed}x`;
            // Ensure updateInterval calculation is safe
            if (this.game.speed > 0) {
                this.game.updateInterval = 1000 / this.game.speed;
            }
        });

        // --- Cell Info Panel Buttons (Actions + LastAction tracking) ---
        const cellInfoPanel = document.getElementById('cell-info');
        if(cellInfoPanel) {
            const closeBtn = document.getElementById('close-cell-info');
            if(closeBtn) closeBtn.addEventListener('click', () => {
                cellInfoPanel.style.display = 'none';
                this.selectedCell = null;
                this.render();
            });

            const irrigateBtn = document.getElementById('irrigate-btn');
            if(irrigateBtn) irrigateBtn.addEventListener('click', () => {
                if (this.selectedCell) {
                    const result = this.game.irrigateCell(this.selectedCell.row, this.selectedCell.col);
                    // Only set lastAction if successful to avoid repeating failed actions
                    if (result) { // Assuming game method returns truthy on success
                        this.lastAction = { type: 'irrigate', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                        this.showCellInfo(this.selectedCell.row, this.selectedCell.col); // Refresh panel
                    }
                }
            });

            const fertilizeBtn = document.getElementById('fertilize-btn');
             if(fertilizeBtn) fertilizeBtn.addEventListener('click', () => {
                 if (this.selectedCell) {
                     const result = this.game.fertilizeCell(this.selectedCell.row, this.selectedCell.col);
                     if (result) {
                         this.lastAction = { type: 'fertilize', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                         this.showCellInfo(this.selectedCell.row, this.selectedCell.col); // Refresh panel
                     }
                 }
             });

            const harvestBtn = document.getElementById('harvest-btn');
            if(harvestBtn) harvestBtn.addEventListener('click', () => {
                if (this.selectedCell) {
                    const result = this.game.harvestCell(this.selectedCell.row, this.selectedCell.col);
                    // Harvest method returns object {success: bool, ...}
                    if (result.success) {
                        this.lastAction = { type: 'harvest', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                        // Cell info panel likely closes automatically on harvest if plot becomes empty
                         // If not, uncomment next line:
                        // this.showCellInfo(this.selectedCell.row, this.selectedCell.col); // Refresh panel
                        this.updateHUD(); // Update HUD immediately after harvest income
                    }
                }
            });
            // Note: The plant button listener is added dynamically within showCellInfo
        }


        // --- NEW Event Listeners ---
        this.addToggleDashboardButton(); // Add dashboard toggle
        this.setupHotkeys(); // Add hotkeys
        this.setupRowColumnSelectors(); // Add row/col selectors and bulk panel
    }

    // --- NEW: Add Dashboard Toggle Button ---
    addToggleDashboardButton() {
        const btnGroup = document.querySelector('header .btn-group');
        if (!document.getElementById('dashboard-btn') && btnGroup) { // Prevent duplicates
            const dashboardBtn = document.createElement('button');
            dashboardBtn.id = 'dashboard-btn';
            dashboardBtn.className = 'btn secondary';
            dashboardBtn.textContent = 'Dashboard';
            btnGroup.appendChild(dashboardBtn);

            dashboardBtn.addEventListener('click', () => {
                const dashboardVisible = document.body.classList.toggle('dashboard-visible');
                 if (dashboardVisible) {
                    this.updateDashboard(); // Update when shown
                 }
            });
        }
    }

    // --- NEW: Setup Hotkeys ---
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger hotkeys if a modal is open or typing in input
            if (this.isResearchModalOpen || this.isMarketModalOpen || document.querySelector('.modal:not(#help-modal)[style*="display: flex"]')) return; // Check active modals
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            // Allow Escape even in modals
            if (e.key === 'Escape') {
                 this.clearSelection();
                 this.closeBulkActionPanel();
                 // Also close cell info panel
                 const cellInfoPanel = document.getElementById('cell-info');
                 if(cellInfoPanel) cellInfoPanel.style.display = 'none';
                 this.selectedCell = null;
                 this.render();
                 // We might want Escape to close other modals too, handled by generic listener
                 return; // Prevent further processing if escape clears things
             }

            let actionTaken = false;
            switch(e.key.toLowerCase()) { // Use lowercase for case-insensitivity
                case 'r': // Repeat last action
                    this.repeatLastAction();
                    actionTaken = true;
                    break;
                case 'i': // Irrigate selected
                    if (this.selectionMode === 'single' && this.selectedCell) {
                        if (this.game.irrigateCell(this.selectedCell.row, this.selectedCell.col)) {
                             this.lastAction = { type: 'irrigate', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                             this.showCellInfo(this.selectedCell.row, this.selectedCell.col); // Refresh panel
                         }
                         actionTaken = true;
                    } else if (this.selectedCells.length > 0) {
                        this.bulkIrrigate();
                        actionTaken = true;
                    }
                    break;
                case 'f': // Fertilize selected
                    if (this.selectionMode === 'single' && this.selectedCell) {
                        if (this.game.fertilizeCell(this.selectedCell.row, this.selectedCell.col)) {
                             this.lastAction = { type: 'fertilize', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                             this.showCellInfo(this.selectedCell.row, this.selectedCell.col); // Refresh panel
                        }
                         actionTaken = true;
                    } else if (this.selectedCells.length > 0) {
                        this.bulkFertilize();
                        actionTaken = true;
                    }
                    break;
                case 'h': // Harvest selected
                    if (this.selectionMode === 'single' && this.selectedCell) {
                         const result = this.game.harvestCell(this.selectedCell.row, this.selectedCell.col);
                         if (result.success) {
                             this.lastAction = { type: 'harvest', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                             this.updateHUD(); // Update HUD immediately
                         }
                         actionTaken = true;
                    } else if (this.selectedCells.length > 0) {
                        this.bulkHarvest();
                        actionTaken = true;
                    }
                    break;
                case 'd': // Toggle dashboard
                    const dashboardVisible = document.body.classList.toggle('dashboard-visible');
                    if (dashboardVisible) { this.updateDashboard(); }
                    actionTaken = true;
                    break;
                case 'm': // Toggle selection mode
                    this.toggleSelectionMode();
                    actionTaken = true;
                    break;
                // Add cases for planting specific crops? e.g., '1' for first crop, etc. (More advanced)
            }

            // Prevent default browser behavior for keys used by the game
            if (actionTaken && ['r', 'i', 'f', 'h', 'd', 'm'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        });

        // Add hotkey info panel if it doesn't exist
        if (!document.querySelector('.hotkey-info')) {
             this.addHotkeyInfoPanel();
        }
    }

    // --- NEW: Add Hotkey Info Panel ---
    addHotkeyInfoPanel() {
        const hotkeyPanel = document.createElement('div');
        hotkeyPanel.className = 'hotkey-info';
        hotkeyPanel.innerHTML = `
            <div class="hotkey-item"><span class="hotkey-key">R</span> Repeat</div>
            <div class="hotkey-item"><span class="hotkey-key">I</span> Irrigate</div>
            <div class="hotkey-item"><span class="hotkey-key">F</span> Fertilize</div>
            <div class="hotkey-item"><span class="hotkey-key">H</span> Harvest</div>
            <div class="hotkey-item"><span class="hotkey-key">M</span> Toggle Select Mode</div>
            <div class="hotkey-item"><span class="hotkey-key">D</span> Toggle Dashboard</div>
            <div class="hotkey-item"><span class="hotkey-key">Esc</span> Clear/Close</div>
        `;
         const gridContainer = document.querySelector('.farm-grid-container');
         if (gridContainer) {
             gridContainer.appendChild(hotkeyPanel);
         } else {
             console.error("Cannot find grid container to append hotkey info panel.");
         }
    }

    // --- NEW: Setup Row/Column Selectors ---
    setupRowColumnSelectors() {
        const gridContainer = document.querySelector('.farm-grid-container');
        if (!gridContainer) {
             console.error("Grid container not found for selectors.");
             return;
        }
        // Prevent adding multiple times
        if (gridContainer.querySelector('.row-selectors')) return;

        const rowSelectors = document.createElement('div');
        rowSelectors.className = 'row-selectors';
        const columnSelectors = document.createElement('div');
        columnSelectors.className = 'column-selectors';

        for (let i = 0; i < this.game.gridSize; i++) {
            const rowBtn = document.createElement('button');
            rowBtn.className = 'selector-btn row-selector';
            rowBtn.textContent = (i + 1).toString();
            rowBtn.dataset.row = i;
            rowBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectRow(i); });
            rowSelectors.appendChild(rowBtn);

            const colBtn = document.createElement('button');
            colBtn.className = 'selector-btn col-selector';
            colBtn.textContent = String.fromCharCode(65 + i);
            colBtn.dataset.col = i;
            colBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectColumn(i); });
            columnSelectors.appendChild(colBtn);
        }

        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'selector-btn select-all';
        selectAllBtn.textContent = '✓';
        selectAllBtn.title = 'Select All';
        selectAllBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectAll(); });
        columnSelectors.appendChild(selectAllBtn);

        gridContainer.appendChild(rowSelectors);
        gridContainer.appendChild(columnSelectors);

        this.createBulkActionPanel(); // Create panel after selectors
    }

    // --- NEW: Create Bulk Action Panel ---
    createBulkActionPanel() {
         const gridContainer = document.querySelector('.farm-grid-container');
         if (!gridContainer || document.getElementById('bulk-action-panel')) return; // Don't recreate

        const bulkPanel = document.createElement('div');
        bulkPanel.className = 'bulk-action-panel'; // Hidden by default via CSS
        bulkPanel.id = 'bulk-action-panel';

        bulkPanel.innerHTML = `
            <h3>Bulk Actions (<span id="selected-count">0</span> selected)</h3>
            <div class="bulk-action-buttons">
                <button id="bulk-irrigate" class="btn">Irrigate</button>
                <button id="bulk-fertilize" class="btn">Fertilize</button>
                <button id="bulk-harvest" class="btn">Harvest</button>
                <button id="bulk-plant" class="btn">Plant...</button>
                <button id="clear-selection" class="btn secondary">Clear</button>
            </div>
            <div id="bulk-plant-options" style="display: none; margin-top: 0.5rem;">
                <div class="crop-selection">
                    <div id="bulk-crop-options"></div>
                    <button id="bulk-plant-selected" class="btn" style="margin-top: 0.5rem;">Plant Crop</button>
                </div>
            </div>
        `;

        gridContainer.appendChild(bulkPanel);

        // Add listeners using event delegation or direct attachment
        document.getElementById('bulk-irrigate')?.addEventListener('click', () => this.bulkIrrigate());
        document.getElementById('bulk-fertilize')?.addEventListener('click', () => this.bulkFertilize());
        document.getElementById('bulk-harvest')?.addEventListener('click', () => this.bulkHarvest());
        document.getElementById('bulk-plant')?.addEventListener('click', () => this.showBulkPlantOptions());
        document.getElementById('clear-selection')?.addEventListener('click', () => {
            this.clearSelection();
            this.closeBulkActionPanel();
        });
        document.getElementById('bulk-plant-selected')?.addEventListener('click', () => this.bulkPlant());
    }

    // --- NEW: Show Bulk Plant Options ---
    showBulkPlantOptions() {
        const options = document.getElementById('bulk-plant-options');
        const cropOptionsDiv = document.getElementById('bulk-crop-options');
        if (!options || !cropOptionsDiv) return;

        options.style.display = 'block';
        cropOptionsDiv.innerHTML = ''; // Clear previous

        crops.forEach(crop => {
            if (crop.id !== 'empty') {
                // Use formatCurrency for display
                const costToPlant = formatCurrency(Math.round(crop.basePrice * this.game.plantingCostFactor));
                cropOptionsDiv.innerHTML += `
                    <div class="crop-option">
                        <input type="radio" id="bulk-crop-${crop.id}" name="bulk-crop-select" value="${crop.id}">
                        <label for="bulk-crop-${crop.id}">${crop.name} (${costToPlant})</label>
                    </div>
                `;
            }
        });
    }

     // --- NEW: Update Dashboard ---
    updateDashboard() {
        if (!document.body.classList.contains('dashboard-visible')) return;

        let totalWater = 0, totalSoil = 0, plotsWithCrops = 0, projectedIncome = 0, seasonIncome = 0;
        let cropCounts = {};
        let growthStages = { 'early': 0, 'middle': 0, 'late': 0, 'ready': 0 };
        const totalCells = this.game.gridSize * this.game.gridSize;
        if (totalCells === 0) return; // Avoid division by zero

        for (let row = 0; row < this.game.gridSize; row++) {
            for (let col = 0; col < this.game.gridSize; col++) {
                const cell = this.game.grid[row][col];
                totalWater += cell.waterLevel;
                totalSoil += cell.soilHealth;

                if (cell.crop.id !== 'empty') {
                    cropCounts[cell.crop.id] = (cropCounts[cell.crop.id] || 0) + 1;
                    plotsWithCrops++;

                    const marketPriceFactor = this.game.marketPrices[cell.crop.id] || 1.0;
                    const potentialValue = cell.crop.harvestValue * (cell.expectedYield / 100) * marketPriceFactor;

                    if (cell.harvestReady) {
                        growthStages.ready++;
                        projectedIncome += potentialValue;
                        seasonIncome += potentialValue; // Count if ready now
                    } else {
                        if (cell.growthProgress >= 67) growthStages.late++;
                        else if (cell.growthProgress >= 34) growthStages.middle++;
                        else growthStages.early++;

                        // Estimate if harvestable this season (simplified)
                        // const daysToReady = Math.max(0, (100 - cell.growthProgress) * (cell.crop.growthTime / 100));
                        // const daysLeftInSeason = 90 - (this.game.day % 90); // Approx days left
                        // if (daysToReady <= daysLeftInSeason) {
                           // Season income projection is complex, maybe just use potential value of *all* crops?
                           seasonIncome += potentialValue;
                        // }
                    }
                }
            }
        }

        const avgWater = (totalWater / totalCells).toFixed(1);
        const avgSoil = (totalSoil / totalCells).toFixed(1);

        document.getElementById('avg-water').textContent = avgWater;
        document.getElementById('avg-soil').textContent = avgSoil;
        this.updateWaterChart(avgWater);
        this.updateSoilChart(avgSoil);
        this.updateCropChart(cropCounts, totalCells);
        this.updateGrowthChart(growthStages, plotsWithCrops);
        this.updateFinancialSummary(projectedIncome, seasonIncome); // Pass calculated values
    }

    // --- NEW: Chart Update Functions (Simplified structure) ---
    updateWaterChart(avgWater) { this._updateSingleBarChart('water-chart', avgWater); }
    updateSoilChart(avgSoil) { this._updateSingleBarChart('soil-chart', avgSoil, ['#cc9966', '#aa8855', '#886644']); } // Brown tones

    _updateSingleBarChart(chartId, value, colors = ['#ff6666', '#ffcc66', '#66cc66']) {
        const chart = document.getElementById(chartId);
        if (!chart) return;
        chart.innerHTML = ''; // Clear previous
        const barHeight = Math.min(100, Math.max(0, value)) * 1.5; // Scale to 150px max height
        let barColor = colors[2]; // High/Good color
        if (value < 33) barColor = colors[0]; // Low
        else if (value < 67) barColor = colors[1]; // Medium

        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.setProperty('--bar-width', '50%');
        bar.style.setProperty('--bar-color', barColor);
        bar.style.height = `${barHeight}px`;
        bar.style.left = '25%';
        chart.appendChild(bar);
    }

    updateCropChart(cropCounts, totalCells) {
        const chart = document.getElementById('crop-distribution');
        if (!chart) return;
        chart.innerHTML = '';
        const emptyCells = totalCells - Object.values(cropCounts).reduce((sum, count) => sum + count, 0);
        if (emptyCells > 0) cropCounts['empty'] = emptyCells;

        const cropIds = Object.keys(cropCounts);
        if (cropIds.length === 0) { chart.innerHTML = '<div class="no-data">No Plots</div>'; return; }
        const barWidth = 100 / cropIds.length;

        cropIds.forEach((cropId, index) => {
            const count = cropCounts[cropId];
            const percentage = (count / totalCells) * 100;
            const barHeight = Math.min(100, percentage) * 1.5; // Scale to 150px height
            const cropData = getCropById(cropId); // Includes 'empty' plot type
            const barColor = cropData?.color || '#cccccc'; // Fallback color

            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.setProperty('--bar-width', `${barWidth}%`);
            bar.style.setProperty('--bar-color', barColor);
            bar.style.height = `${barHeight}px`;
            bar.style.left = `${index * barWidth}%`;
            bar.title = `${cropData?.name || 'Unknown'}: ${count} (${percentage.toFixed(1)}%)`;
            chart.appendChild(bar);

            const label = document.createElement('div');
            label.className = 'bar-label';
            label.textContent = cropData?.name?.substring(0, 3) || '???';
            label.style.left = `${index * barWidth + barWidth / 2}%`;
            chart.appendChild(label);
        });
    }

     updateGrowthChart(growthStages, plotsWithCrops) {
         const chart = document.getElementById('growth-chart');
         if (!chart) return;
         chart.innerHTML = '';
         if (plotsWithCrops === 0) { chart.innerHTML = '<div class="no-data">No Crops</div>'; return; }

         const stages = Object.keys(growthStages);
         const barWidth = 100 / stages.length;
         const colors = { 'early': '#ccffcc', 'middle': '#66cc66', 'late': '#339933', 'ready': '#e76f51' };

         stages.forEach((stage, index) => {
             const count = growthStages[stage];
             const percentage = (count / plotsWithCrops) * 100;
             const barHeight = Math.min(100, percentage) * 1.5;
             const barColor = colors[stage] || '#cccccc';

             const bar = document.createElement('div');
             bar.className = 'chart-bar';
             bar.style.setProperty('--bar-width', `${barWidth}%`);
             bar.style.setProperty('--bar-color', barColor);
             bar.style.height = `${barHeight}px`;
             bar.style.left = `${index * barWidth}%`;
             bar.title = `${stage}: ${count} (${percentage.toFixed(1)}%)`;
             chart.appendChild(bar);

             const label = document.createElement('div');
             label.className = 'bar-label';
             label.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);
             label.style.left = `${index * barWidth + barWidth / 2}%`;
             chart.appendChild(label);
         });
     }

    // --- NEW: Update Financial Summary ---
    updateFinancialSummary(projectedIncome, seasonIncome) {
        // Recalculate daily expenses based on current costs
        const dailyExpense = this.game.dailyOverheadCost + (this.game.calculateInterest() / 360); // Simplified daily interest

        document.getElementById('daily-expenses').textContent = formatCurrency(dailyExpense);
        document.getElementById('season-income').textContent = formatCurrency(seasonIncome);
        document.getElementById('projected-income').textContent = formatCurrency(projectedIncome);
    }

    // --- Bulk Selection and Action Methods (NEW) ---

    // Handle single cell selection
    selectCell(row, col) {
        if (this.selectionMode !== 'single') { // Switch to single mode if needed
            this.clearSelection();
            this.selectionMode = 'single';
        }
        this.selectedCell = { row, col };
        this.showCellInfo(row, col); // Show info panel for the single cell
        this.closeBulkActionPanel(); // Ensure bulk panel is closed
        this.render(); // Re-render to show selection highlight
    }

    // Toggle a cell in the multi-selection
    toggleCellInSelection(row, col) {
        if (this.selectionMode !== 'multi') { // Switch to multi mode
            this.clearSelection(); // Clear single selection
            this.selectionMode = 'multi';
        }
        const cellIndex = this.selectedCells.findIndex(cell => cell.row === row && cell.col === col);
        if (cellIndex >= 0) {
            this.selectedCells.splice(cellIndex, 1); // Remove if already selected
        } else {
            this.selectedCells.push({ row, col }); // Add if not selected
        }
        this.updateBulkActionPanel(); // Update count and visibility
        this.render(); // Re-render to show selection highlights
    }

     selectRow(row) {
         this.clearSelection();
         this.selectionMode = 'multi';
         for (let col = 0; col < this.game.gridSize; col++) {
             this.selectedCells.push({ row, col });
         }
         this.showBulkActionPanel();
         this.render();
     }

     selectColumn(col) {
         this.clearSelection();
         this.selectionMode = 'multi';
         for (let row = 0; row < this.game.gridSize; row++) {
             this.selectedCells.push({ row, col });
         }
         this.showBulkActionPanel();
         this.render();
     }

     selectAll() {
         this.clearSelection();
         this.selectionMode = 'multi';
         for (let row = 0; row < this.game.gridSize; row++) {
             for (let col = 0; col < this.game.gridSize; col++) {
                 this.selectedCells.push({ row, col });
             }
         }
         this.showBulkActionPanel();
         this.render();
     }

    clearSelection() {
        this.selectedCell = null;
        this.selectedCells = [];
        // Don't hide bulk panel here, let closeBulkActionPanel handle it if called
        this.render(); // Re-render to remove highlights
    }

    toggleSelectionMode() {
        if (this.selectionMode === 'single') {
            this.selectionMode = 'multi';
            if (this.selectedCell) { // Convert single to multi
                this.selectedCells = [{ ...this.selectedCell }];
                this.selectedCell = null;
                this.showBulkActionPanel();
            }
            // Maybe add visual feedback about mode change?
        } else {
            this.selectionMode = 'single';
            this.clearSelection(); // Clear bulk selection when switching back
            this.closeBulkActionPanel();
        }
        this.render(); // Update potential highlights or feedback
    }

    showBulkActionPanel() {
        const panel = document.getElementById('bulk-action-panel');
        if (panel) {
            panel.classList.add('visible');
            const countSpan = document.getElementById('selected-count');
            if (countSpan) countSpan.textContent = this.selectedCells.length;
        }
    }

    closeBulkActionPanel() {
        const panel = document.getElementById('bulk-action-panel');
        if (panel) {
            panel.classList.remove('visible');
            const plantOptions = document.getElementById('bulk-plant-options');
             if (plantOptions) plantOptions.style.display = 'none'; // Hide plant options too
        }
    }

     updateBulkActionPanel() { // Called when multi-selection changes
         const countSpan = document.getElementById('selected-count');
         if (countSpan) countSpan.textContent = this.selectedCells.length;

         if (this.selectedCells.length > 0) {
             this.showBulkActionPanel();
         } else {
             this.closeBulkActionPanel();
         }
     }

    // --- Bulk Action Implementations ---
    _performBulkAction(actionType, gameMethod, eventVerb) {
        if (this.selectedCells.length === 0 || this.isBulkActionInProgress) return;

        let successCount = 0;
        let costTotal = 0; // For actions with cost
        let incomeTotal = 0; // For harvest
        this.isBulkActionInProgress = true; // Lock UI

        for (const cellCoord of this.selectedCells) {
            const result = gameMethod.call(this.game, cellCoord.row, cellCoord.col);
             // Handle different return types: boolean, or object with success/cost/income
            if (typeof result === 'boolean' && result) {
                successCount++;
                 if (actionType === 'irrigate') costTotal += this.game.irrigationCost; // Approx cost
                 if (actionType === 'fertilize') costTotal += this.game.fertilizeCost; // Approx cost
            } else if (typeof result === 'object' && result.success) {
                successCount++;
                if (result.cost) costTotal += result.cost;
                if (result.income) incomeTotal += result.income;
            }
        }

        this.isBulkActionInProgress = false; // Unlock UI

        if (successCount > 0) {
             // Construct a generic last action object for potential repeat
             this.lastAction = { type: `bulk${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`, params: { cells: [...this.selectedCells] } };

             let eventMsg = `Bulk ${eventVerb} ${successCount} plots.`;
             if (costTotal > 0) eventMsg += ` Total cost: ${formatCurrency(costTotal)}.`;
             if (incomeTotal > 0) eventMsg += ` Total income: ${formatCurrency(incomeTotal)}.`;
             this.game.addEvent(eventMsg);
             this.updateHUD(); // Update HUD after bulk actions affecting balance
        } else {
             this.game.addEvent(`Bulk ${eventVerb}: No eligible plots found in selection.`, true); // Minor alert
        }

        this.render(); // Re-render grid
    }

    bulkIrrigate() { this._performBulkAction('irrigate', this.game.irrigateCell, 'irrigate'); }
    bulkFertilize() { this._performBulkAction('fertilize', this.game.fertilizeCell, 'fertilize'); }
    bulkHarvest() { this._performBulkAction('harvest', this.game.harvestCell, 'harvest'); }

    bulkPlant() {
        if (this.selectedCells.length === 0 || this.isBulkActionInProgress) return;
        const selectedCropInput = document.querySelector('input[name="bulk-crop-select"]:checked');
        if (!selectedCropInput) {
            this.game.addEvent('No crop selected for bulk planting.', true);
            return;
        }
        const cropId = selectedCropInput.value;
        const crop = getCropById(cropId);
        if (!crop) {
            this.game.addEvent(`Invalid crop ID selected: ${cropId}`, true);
            return;
        }

        let successCount = 0;
        let costTotal = 0;
        this.isBulkActionInProgress = true;

        for (const cellCoord of this.selectedCells) {
            // Calculate cost *before* attempting plant, as balance changes
             const plantingCost = Math.round(crop.basePrice * this.game.plantingCostFactor);
             if (this.game.plantCrop(cellCoord.row, cellCoord.col, cropId)) {
                successCount++;
                costTotal += plantingCost; // Sum actual cost incurred
            }
        }

        this.isBulkActionInProgress = false;

        if (successCount > 0) {
            this.lastAction = { type: 'bulkPlant', params: { cells: [...this.selectedCells], cropId: cropId } };
            this.game.addEvent(`Bulk planted ${successCount} plots with ${crop.name}. Cost: ${formatCurrency(costTotal)}.`);
            this.updateHUD();
        } else {
            this.game.addEvent(`Bulk plant ${crop.name}: No empty/affordable plots in selection.`, true);
        }

        this.closeBulkActionPanel(); // Hide options after planting
        this.render();
    }

    // --- Repeat Last Action ---
    repeatLastAction() {
        if (!this.lastAction || this.isBulkActionInProgress) {
            if (!this.lastAction) this.game.addEvent('No previous action to repeat.', true);
            return;
        }

        console.log("Repeating last action:", this.lastAction); // Debug log

        // Execute the appropriate action based on type
        // Ensure parameters are valid before calling game methods
        try {
            switch (this.lastAction.type) {
                case 'irrigate':
                    if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) {
                        this.game.irrigateCell(this.lastAction.params.row, this.lastAction.params.col);
                    }
                    break;
                case 'fertilize':
                     if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) {
                        this.game.fertilizeCell(this.lastAction.params.row, this.lastAction.params.col);
                     }
                    break;
                case 'harvest':
                     if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) {
                        this.game.harvestCell(this.lastAction.params.row, this.lastAction.params.col);
                        this.updateHUD(); // Update HUD after harvest
                     }
                    break;
                case 'plant':
                    if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined && this.lastAction.params?.cropId) {
                        this.game.plantCrop(
                            this.lastAction.params.row,
                            this.lastAction.params.col,
                            this.lastAction.params.cropId
                        );
                         this.updateHUD(); // Update HUD after plant cost
                    }
                    break;
                 // --- Repeat Bulk Actions ---
                 case 'bulkIrrigate':
                     if (this.lastAction.params?.cells?.length > 0) {
                         this.selectedCells = [...this.lastAction.params.cells]; // Reselect
                         this.selectionMode = 'multi'; // Ensure mode
                         this.bulkIrrigate();
                     }
                     break;
                 case 'bulkFertilize':
                     if (this.lastAction.params?.cells?.length > 0) {
                         this.selectedCells = [...this.lastAction.params.cells];
                         this.selectionMode = 'multi';
                         this.bulkFertilize();
                     }
                     break;
                 case 'bulkHarvest':
                      if (this.lastAction.params?.cells?.length > 0) {
                         this.selectedCells = [...this.lastAction.params.cells];
                         this.selectionMode = 'multi';
                         this.bulkHarvest();
                      }
                     break;
                 case 'bulkPlant':
                     if (this.lastAction.params?.cells?.length > 0 && this.lastAction.params?.cropId) {
                         this.selectedCells = [...this.lastAction.params.cells];
                         this.selectionMode = 'multi';
                         // Need to re-select the radio button conceptually for bulkPlant logic
                         const cropRadio = document.querySelector(`input[name="bulk-crop-select"][value="${this.lastAction.params.cropId}"]`);
                         if (cropRadio) {
                             cropRadio.checked = true; // Set the state
                             this.bulkPlant(); // Execute
                         } else {
                              // If panel isn't open/radio doesn't exist, maybe just show options?
                              this.showBulkActionPanel();
                              this.showBulkPlantOptions();
                              // Find and check the radio button after options are shown
                              const radioToSelect = document.getElementById(`bulk-crop-${this.lastAction.params.cropId}`);
                              if(radioToSelect) radioToSelect.checked = true;
                              this.game.addEvent(`Select crop again to repeat bulk plant ${getCropById(this.lastAction.params.cropId)?.name || ''}.`, true)
                         }
                     }
                     break;
                default:
                     console.warn("Unknown last action type:", this.lastAction.type);
                     this.game.addEvent('Could not repeat last action.', true);
                     break;
            }
        } catch (error) {
            console.error("Error repeating last action:", error);
            this.game.addEvent('Error trying to repeat action.', true);
        }

        this.render(); // Re-render after action
    }


    // --- Original Methods (Potentially with minor corrections) ---

    // Show detailed cell information panel
    showCellInfo(row, col) {
        const cell = this.game.grid[row][col];
        const cellInfo = document.getElementById('cell-info');
        const cellDetails = document.getElementById('cell-details');
        const cropOptions = document.getElementById('crop-options');
        if(!cellInfo || !cellDetails || !cropOptions) return; // Guard clauses

        // Update cell details
        cellDetails.innerHTML = `
            <div class="stat">
                <span>Plot:</span>
                <span class="stat-value">${String.fromCharCode(65 + col)}${row + 1}</span>
            </div>
            <div class="stat">
                <span>Crop:</span>
                <span class="stat-value">${cell.crop.name}</span>
            </div>
            <div class="stat">
                <span>Water:</span>
                <span class="stat-value">${cell.waterLevel.toFixed(0)}%</span>
            </div>
            <div class="stat">
                <span>Soil:</span>
                <span class="stat-value">${cell.soilHealth.toFixed(0)}%</span>
            </div>
        `;

        if (cell.crop.id !== 'empty') {
            cellDetails.innerHTML += `
                <div class="stat">
                    <span>Growth:</span>
                    <span class="stat-value">${Math.floor(cell.growthProgress)}%</span>
                </div>
                <div class="progress-bar" title="Growth Progress">
                    <div class="progress-fill" style="width: ${cell.growthProgress}%; background-color: ${cell.harvestReady ? 'var(--danger-color)' : 'var(--success-color)'};"></div>
                </div>
                 <div class="stat">
                    <span>Expected Yield:</span>
                    <span class="stat-value">${cell.expectedYield.toFixed(0)}%</span>
                </div>
            `;
        } else {
             // Only show planting options if the plot is empty
             cropOptions.innerHTML = '<h3>Plant Crop</h3>'; // Add header
             crops.forEach(crop => {
                 if (crop.id !== 'empty') {
                     // Use formatCurrency
                     const costToPlant = formatCurrency(Math.round(crop.basePrice * this.game.plantingCostFactor));
                     cropOptions.innerHTML += `
                         <div class="crop-option">
                             <input type="radio" id="crop-${crop.id}-${row}-${col}" name="crop-select-${row}-${col}" value="${crop.id}">
                             <label for="crop-${crop.id}-${row}-${col}">${crop.name} (${costToPlant})</label>
                         </div>
                     `;
                 }
             });
             cropOptions.innerHTML += `<button id="plant-btn-${row}-${col}" class="btn">Plant</button>`;

             // Add event listener for the specific plant button
             // Remove previous listener if exists to prevent duplicates (might need better handling)
             const plantBtn = document.getElementById(`plant-btn-${row}-${col}`);
             if (plantBtn) {
                 // Clone and replace to remove old listeners safely
                 const newPlantBtn = plantBtn.cloneNode(true);
                 plantBtn.parentNode.replaceChild(newPlantBtn, plantBtn);
                 newPlantBtn.addEventListener('click', () => {
                     const selectedCrop = document.querySelector(`input[name="crop-select-${row}-${col}"]:checked`);
                     if (selectedCrop) {
                         const cropId = selectedCrop.value;
                         const success = this.game.plantCrop(row, col, cropId);
                         if (success) {
                             this.lastAction = { type: 'plant', params: { row, col, cropId } };
                             // Re-show info which will now not have planting options
                             this.showCellInfo(row, col);
                             this.updateHUD(); // Update balance
                         }
                     }
                 });
             }
             cropOptions.style.display = 'block'; // Make sure options are visible
        }

        // If crop is present, hide planting options
        if (cell.crop.id !== 'empty') {
            cropOptions.innerHTML = ''; // Clear planting options
             cropOptions.style.display = 'none';
        }

        // Update buttons based on cell state
        const irrigateBtn = document.getElementById('irrigate-btn');
        const fertilizeBtn = document.getElementById('fertilize-btn');
        const harvestBtn = document.getElementById('harvest-btn');
        if(irrigateBtn) irrigateBtn.disabled = cell.irrigated || cell.crop.id === 'empty';
        if(fertilizeBtn) fertilizeBtn.disabled = cell.fertilized || cell.crop.id === 'empty';
        if(harvestBtn) harvestBtn.disabled = !cell.harvestReady;

        cellInfo.style.display = 'block'; // Show the panel
    }


    // Show tooltip on cell hover (Original)
    showTooltip(x, y, row, col) {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;
        const cell = this.game.grid[row][col];

        let content = `
            <div><strong>Plot: ${String.fromCharCode(65 + col)}${row + 1}</strong></div>
            <div>Crop: ${cell.crop.name}</div>
            <div>Water: ${cell.waterLevel.toFixed(0)}%</div>
            <div>Soil: ${cell.soilHealth.toFixed(0)}%</div>
        `;

        if (cell.crop.id !== 'empty') {
            content += `
                <div>Growth: ${Math.floor(cell.growthProgress)}%</div>
                <div>Yield: ${cell.expectedYield.toFixed(0)}%</div>
            `;
            if (cell.harvestReady) {
                 content += `<div style="color: var(--danger-color); font-weight: bold;">Ready to Harvest!</div>`;
            }
        } else {
             content += `<div>Empty Plot</div>`;
        }


        tooltip.innerHTML = content;
        // Position tooltip relative to mouse, avoiding screen edges
        const tooltipRect = tooltip.getBoundingClientRect();
        let left = x + 15;
        let top = y + 15;
        if (left + tooltipRect.width > window.innerWidth) {
            left = x - tooltipRect.width - 15;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = y - tooltipRect.height - 15;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.visibility = 'visible';
        tooltip.style.opacity = '1';
    }

    // Hide tooltip (Original)
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if(tooltip) {
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        }
    }

    // Display research modal (Original, with corrections)
    showResearchModal() {
        const researchOptions = document.getElementById('research-options');
        if(!researchOptions) return;
        researchOptions.innerHTML = ''; // Clear previous

        this.game.technologies.forEach(tech => {
            // Use game method to check prerequisites AND affordability
            // This assumes game has a method like `canResearch(techId)`
            // Or we check both here. Let's check both for clarity.
            const canAfford = this.game.balance >= this.game.getTechnologyCost(tech.id);
            const prereqsMet = this.game.checkTechPrerequisites(tech); // Assumes this only checks tech tree links
            const available = prereqsMet && canAfford;

            let statusClass = '';
            let statusText = '';
            if (tech.researched) {
                statusClass = 'researched';
                statusText = '<span class="badge success">Researched</span>';
            } else if (!prereqsMet) {
                statusClass = 'unavailable';
                statusText = '<span class="badge warning">Prereqs Not Met</span>';
            } else if (!canAfford) {
                 statusClass = 'unavailable'; // Also unavailable if cannot afford
                 statusText = '<span class="badge danger">Cannot Afford</span>';
            }


            researchOptions.innerHTML += `
                <div class="tech-item ${statusClass}" data-tech-id="${tech.id}" title="${tech.description}">
                    <div class="tech-name">${tech.name} ${statusText}</div>
                    <div class="tech-cost">Cost: ${formatCurrency(this.game.getTechnologyCost(tech.id))}</div>
                    ${tech.prerequisites.length > 0 ? `<div class="tech-prereq">Requires: ${tech.prerequisites.map(p => this.game.getTechnologyName(p) || p).join(', ')}</div>` : ''}
                </div>
            `;
        });

        // Add event listeners for research (only to available items)
        document.querySelectorAll('.tech-item:not(.researched):not(.unavailable)').forEach(item => {
            // Remove old listener before adding new one if needed, or use delegation
             const techId = item.dataset.techId;
             item.addEventListener('click', () => {
                 console.log(`Attempting research: ${techId}`);
                 const success = this.game.researchTechnology(techId);
                 if(success) {
                     // Close modal and refresh HUD/Tech List on success
                     const researchModal = document.getElementById('research-modal');
                     if (researchModal) researchModal.style.display = 'none';
                     this.isResearchModalOpen = false;
                     this.updateTechList(); // Add this function if needed
                     this.updateHUD();
                 } else {
                     // Optionally provide feedback if research fails (e.g., already researching)
                     // Game method should handle logging/events for failure reason
                     this.showResearchModal(); // Refresh modal state on failure
                 }
             }, { once: true }); // Use once to simplify listener management if appropriate
        });

        const researchModal = document.getElementById('research-modal');
        if (researchModal) researchModal.style.display = 'flex';
    }

    // Display market prices modal (Original, ensure formatting)
    showMarketModal() {
        const marketInfo = document.getElementById('market-info');
        if (!marketInfo) return;

        marketInfo.innerHTML = `
            <p>Current market prices (relative to base):</p>
            <div class="market-prices">
                ${crops.filter(c => c.id !== 'empty').map(crop => `
                    <div class="stat">
                        <span>${crop.name}:</span>
                        <span class="stat-value">${Math.round((this.game.marketPrices[crop.id] || 1.0) * 100)}%</span>
                    </div>
                `).join('')}
            </div>
            <!-- Removed trend prediction as it wasn't tied to game logic -->
            <!-- <p>Market trends for next season:</p> ... -->
        `;

        const marketModal = document.getElementById('market-modal');
        if(marketModal) marketModal.style.display = 'flex';
    }

    // Update game HUD with current values (Original, ensure formatting)
    updateHUD() {
        document.getElementById('balance').textContent = formatCurrency(this.game.balance);
        document.getElementById('farm-value').textContent = formatCurrency(this.game.farmValue);
        document.getElementById('farm-health').textContent = this.game.farmHealth.toFixed(0);
        document.getElementById('water-reserve').textContent = this.game.waterReserve.toFixed(0);
        // Date display might need adjustment based on game properties
        document.getElementById('date-display').textContent = `${this.game.season}, Year ${this.game.year} (Day ${this.game.dayOfYear})`;
        document.getElementById('year-display').textContent = this.game.year;
        document.getElementById('season-display').textContent = this.game.season;
         // Update pause button text
         const pauseBtn = document.getElementById('pause-btn');
         if (pauseBtn) pauseBtn.textContent = this.game.paused ? 'Resume' : 'Pause';
    }

    // Update events list display (Corrected version from previous step)
    updateEventsList() {
        const eventsContainer = document.getElementById('events-container');
        if (!eventsContainer) return;
        eventsContainer.innerHTML = ''; // Clear previous events

        // Display a limited number of recent events? e.g., last 10
        const recentEvents = this.game.events.slice(-10); // Adjust number as needed

        recentEvents.forEach(event => {
            let formattedMessage = event.message;
            if (typeof formattedMessage === 'string' && formattedMessage.includes('$')) {
                 // Use formatCurrency utility
                 formattedMessage = formattedMessage.replace(/\$(\d+(\.\d+)?)/g, (match, p1) => {
                    try {
                         // Check if formatCurrency is available (imported)
                         if (typeof formatCurrency === 'function') {
                            return formatCurrency(Number(p1));
                         }
                         return match; // Fallback
                    } catch (e) {
                         console.error("Error formatting currency in event message:", e);
                         return match; // Return original match on error
                    }
                });
            }

            const eventDiv = document.createElement('div');
            eventDiv.className = `event ${event.isAlert ? 'alert' : ''}`;
            eventDiv.innerHTML = `
                <div class="event-date">${event.date || `Year ${event.year}, Day ${event.day}`}</div>
                <div>${formattedMessage}</div>
            `;
            // Prepend new events to the top? Or append and scroll. Let's append.
            eventsContainer.appendChild(eventDiv);
        });

        // Scroll to the bottom of the events container
        eventsContainer.scrollTop = eventsContainer.scrollHeight;
    }


    // Update legend for current overlay (Original)
    updateLegend() {
        const legend = document.getElementById('grid-legend');
        if(!legend) return;
        legend.innerHTML = ''; // Clear previous

        let legendItems = [];
        switch (this.game.currentOverlay) {
            case 'crop':
                legendItems = crops.filter(c => c.id !== 'empty').map(crop => ({ color: crop.color, label: crop.name }));
                break;
            case 'water':
                legendItems = [
                    { color: '#ff6666', label: 'Low (0-33%)' },
                    { color: '#ffcc66', label: 'Medium (34-66%)' },
                    { color: '#66cc66', label: 'High (67-100%)' }
                ];
                break;
            case 'soil':
                 legendItems = [
                    { color: '#cc9966', label: 'Poor (0-33%)' },
                    { color: '#aa8855', label: 'Average (34-66%)' },
                    { color: '#886644', label: 'Good (67-100%)' }
                ];
                break;
            case 'yield':
                 legendItems = [
                    { color: '#ffaaaa', label: 'Low (<50%)' }, // Adjusted label
                    { color: '#ffffaa', label: 'Medium (50-100%)' }, // Adjusted label
                    { color: '#aaffaa', label: 'High (>100%)' }
                ];
                break;
             default:
                 legend.innerHTML = '<div>Select Overlay</div>'; // Default message
                 return;
        }

         legendItems.forEach(item => {
            legend.innerHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${item.color}"></div>
                    <span>${item.label}</span>
                </div>
            `;
        });
    }

    // Render the farm grid (Enhanced with multi-select highlight)
    render() {
        if (!this.ctx) return; // Ensure context is available

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate offset to center the grid
        const gridWidth = this.cellSize * this.game.gridSize;
        const gridHeight = this.cellSize * this.game.gridSize;
        if (gridWidth <= 0 || gridHeight <= 0) return; // Don't render if grid size is invalid

        const offsetX = (this.canvas.width - gridWidth) / 2;
        const offsetY = (this.canvas.height - gridHeight) / 2;

        // Draw each cell
        for (let row = 0; row < this.game.gridSize; row++) {
            for (let col = 0; col < this.game.gridSize; col++) {
                const x = offsetX + col * this.cellSize;
                const y = offsetY + row * this.cellSize;
                this.drawCell(x, y, row, col);
            }
        }
    }

    // Draw a single cell (Enhanced with multi-select highlight)
    drawCell(x, y, row, col) {
        const cell = this.game.grid[row][col];
        let fillColor;

        // Determine fill color based on overlay
        switch (this.game.currentOverlay) {
            // ... (keep existing overlay logic from original) ...
             case 'crop': fillColor = cell.crop.color; break;
             case 'water':
                 if (cell.waterLevel < 33) fillColor = '#ff6666';
                 else if (cell.waterLevel < 67) fillColor = '#ffcc66';
                 else fillColor = '#66cc66';
                 break;
             case 'soil':
                 if (cell.soilHealth < 33) fillColor = '#cc9966';
                 else if (cell.soilHealth < 67) fillColor = '#aa8855';
                 else fillColor = '#886644';
                 break;
            case 'yield':
                if (cell.crop.id === 'empty') fillColor = '#e9e9e9';
                else if (cell.expectedYield < 50) fillColor = '#ffaaaa';
                else if (cell.expectedYield <= 100) fillColor = '#ffffaa'; // Include 100 in medium
                else fillColor = '#aaffaa';
                break;
            default: fillColor = cell.crop.color || '#ffffff'; // Default/fallback
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // Draw border (Highlight single or multi-selection)
        const isSingleSelected = this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col;
        const isMultiSelected = this.selectedCells.some(sc => sc.row === row && sc.col === col);

        if (isSingleSelected) {
            this.ctx.strokeStyle = 'blue'; // Single selection color
            this.ctx.lineWidth = 3;
        } else if (isMultiSelected) {
            this.ctx.strokeStyle = 'orange'; // Multi-selection color
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.strokeStyle = '#ccc'; // Default border
            this.ctx.lineWidth = 0.5;
        }
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        // Draw crop icon/symbol
        if (cell.crop.id !== 'empty') {
            this.ctx.fillStyle = '#000';
            this.ctx.font = `${Math.max(8, this.cellSize * 0.3)}px Arial`; // Ensure minimum font size
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // Use a simple letter or symbol
            this.ctx.fillText(cell.crop.name.charAt(0).toUpperCase(), x + this.cellSize / 2, y + this.cellSize / 2);

            // Draw harvest indicator if ready
            if (cell.harvestReady) {
                this.ctx.fillStyle = 'rgba(255, 0, 255, 0.8)'; // Bright magenta, slightly transparent
                this.ctx.beginPath();
                const radius = Math.max(2, this.cellSize * 0.1);
                this.ctx.arc(x + this.cellSize - radius - 2, y + radius + 2, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Optional: Draw small water/soil indicator bars within the cell? (Could get cluttered)
        }
    }

    // --- NEW: Helper to update Tech List in Sidebar ---
    updateTechList() {
        const techContainer = document.getElementById('tech-container');
        if (!techContainer) return;

        techContainer.innerHTML = ''; // Clear previous list
        const researchedTechs = this.game.technologies.filter(t => t.researched);

        if (researchedTechs.length === 0) {
            techContainer.innerHTML = '<p>No technologies researched yet.</p>';
            return;
        }

        const ul = document.createElement('ul');
        researchedTechs.forEach(tech => {
            const li = document.createElement('li');
            li.textContent = tech.name;
            li.title = tech.description; // Add tooltip
            ul.appendChild(li);
        });
        techContainer.appendChild(ul);
    }

     // --- NEW: Display popup message (can be used by Advisor or game events) ---
     showGameMessage(title, message, type = 'info') { // type: 'info', 'success', 'warning', 'danger'
         // This could create a temporary notification element on the screen
         // For simplicity now, let's just add it to the events list
         this.game.addEvent(message, type === 'danger' || type === 'warning');
     }

      // --- NEW: Advisor Popup (Placeholder, could be a dedicated modal) ---
      showAdvisorPopup(title, text) {
         // For now, use the placeholder div in the sidebar
         const advisorPlaceholder = document.querySelector('.advisor-placeholder');
         if (advisorPlaceholder) {
             const header = advisorPlaceholder.querySelector('h3');
             advisorPlaceholder.innerHTML = ''; // Clear previous
             if(header) advisorPlaceholder.appendChild(header);

             const p = document.createElement('p');
             p.innerHTML = `<strong>${title}:</strong> ${text}`; // Use innerHTML if text contains simple formatting
             advisorPlaceholder.appendChild(p);
         } else {
             // Fallback: use a simple alert or log
             console.log(`ADVISOR [${title}]: ${text}`);
             // alert(`Advisor: ${title}\n\n${text}`);
         }
     }
}
