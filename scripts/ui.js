/**
 * California Climate Farmer - UI Manager
 * 
 * This file handles UI rendering, updates, and event handling for the game interface.
 */

import { crops, getCropById } from './crops.js';

// UI Manager class
export class UIManager {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('farm-grid');
        this.ctx = this.canvas.getContext('2d');
        this.selectedCell = null;
        this.cellSize = 40;
        
        // Bulk selection tracking
        this.selectedCells = [];
        this.selectionMode = 'single'; // single, row, column, all
        this.isBulkActionInProgress = false;
        
        // Last Action Tracking for "Repeat Last Action"
        this.lastAction = null; // { type: 'plant'|'irrigate'|'fertilize'|'harvest', params: {...} }
        
        // Set up canvas and event listeners
        this.setupCanvasSize();
        this.setupEventListeners();
        
        // Track if modals are open
        this.isResearchModalOpen = false;
        this.isMarketModalOpen = false;
        
        // Initialize dashboard
        this.setupDashboard();
        
        // Create dashboard update timer
        this.dashboardUpdateTimer = setInterval(() => this.updateDashboard(), 5000);
    }
    
    // Set up canvas size and make it responsive
    setupCanvasSize() {
        const calculateSize = () => {
            const container = this.canvas.parentElement;
            const width = container.clientWidth;
            const height = container.clientHeight;
            this.canvas.width = width;
            this.canvas.height = height;
            this.cellSize = Math.min(width, height) / this.game.gridSize * 0.9;
            this.render();
        };

        // Set initial size
        calculateSize();

        // Update on resize
        window.addEventListener('resize', calculateSize);
    }
    
    // Set up dashboard components
    setupDashboard() {
        // Create dashboard container if it doesn't exist
        if (!document.getElementById('farm-dashboard')) {
            const dashboardContainer = document.createElement('div');
            dashboardContainer.id = 'farm-dashboard';
            dashboardContainer.className = 'farm-dashboard';
            
            // Insert dashboard after the grid but before the sidebar
            const sidebar = document.querySelector('.sidebar');
            sidebar.parentNode.insertBefore(dashboardContainer, sidebar);
            
            // Add dashboard content
            dashboardContainer.innerHTML = `
                <div class="dashboard-header">
                    <h2>Farm Dashboard</h2>
                    <button id="refresh-dashboard" class="btn">Refresh</button>
                </div>
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h3>Water Status</h3>
                        <div id="water-chart" class="dashboard-chart"></div>
                        <div class="dashboard-stat">Average: <span id="avg-water">0</span>%</div>
                    </div>
                    <div class="dashboard-card">
                        <h3>Soil Health</h3>
                        <div id="soil-chart" class="dashboard-chart"></div>
                        <div class="dashboard-stat">Average: <span id="avg-soil">0</span>%</div>
                    </div>
                    <div class="dashboard-card">
                        <h3>Crop Distribution</h3>
                        <div id="crop-distribution" class="dashboard-chart"></div>
                    </div>
                    <div class="dashboard-card">
                        <h3>Growth Stages</h3>
                        <div id="growth-chart" class="dashboard-chart"></div>
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
            document.getElementById('refresh-dashboard').addEventListener('click', () => {
                this.updateDashboard();
            });
            
            // Add CSS for dashboard
            this.addDashboardStyles();
        }
    }
    
    // Add CSS for dashboard
    addDashboardStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .farm-dashboard {
                display: none;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                padding: 1rem;
                margin-bottom: 1rem;
                overflow: auto;
            }
            
            .dashboard-visible .farm-dashboard {
                display: block;
            }
            
            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .dashboard-row {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .dashboard-card {
                background: #f9f9f9;
                border-radius: 6px;
                padding: 1rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .dashboard-card.wide {
                flex: 1;
            }
            
            .dashboard-chart {
                height: 180px;
                margin: 1rem 0;
                background: #f0f0f0;
                border-radius: 4px;
                position: relative;
                overflow: hidden;
            }
            
            .chart-bar {
                position: absolute;
                bottom: 0;
                width: var(--bar-width, 30px);
                background: var(--bar-color, #2a9d8f);
                transition: height 0.3s ease;
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .financial-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 1rem;
            }
            
            .financial-stat {
                padding: 1rem;
                background: #f0f0f0;
                border-radius: 4px;
                text-align: center;
            }
            
            .financial-stat span:first-child {
                display: block;
                font-size: 0.9rem;
                color: #666;
                margin-bottom: 0.5rem;
            }
            
            .financial-stat span:last-child {
                font-size: 1.2rem;
                font-weight: bold;
                color: #264653;
            }
            
            /* Row and column selectors */
            .row-selectors, .column-selectors {
                position: absolute;
                display: flex;
                z-index: 50;
            }
            
            .row-selectors {
                flex-direction: column;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .column-selectors {
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .selector-btn {
                background: rgba(42, 157, 143, 0.8);
                color: white;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 2px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                border: none;
            }
            
            .selector-btn:hover {
                background: rgba(42, 157, 143, 1);
            }
            
            .selector-btn.active {
                background: #e76f51;
            }
            
            /* Bulk action panel */
            .bulk-action-panel {
                display: none;
                position: absolute;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 1rem;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                z-index: 100;
            }
            
            .bulk-action-panel.visible {
                display: block;
            }
            
            .bulk-action-panel h3 {
                margin-top: 0;
                margin-bottom: 0.5rem;
            }
            
            .bulk-action-buttons {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }
            
            /* Hotkey info */
            .hotkey-info {
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(255, 255, 255, 0.8);
                padding: 0.5rem;
                border-radius: 4px;
                font-size: 0.8rem;
                z-index: 50;
            }
            
            .hotkey-item {
                margin-bottom: 0.25rem;
            }
            
            .hotkey-key {
                background: #f0f0f0;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 0 4px;
                font-family: monospace;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set up all event listeners for game UI
    setupEventListeners() {
        // Canvas click for cell selection
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate grid coordinates based on canvas offset
            const offsetX = (this.canvas.width - this.cellSize * this.game.gridSize) / 2;
            const offsetY = (this.canvas.height - this.cellSize * this.game.gridSize) / 2;

            const col = Math.floor((x - offsetX) / this.cellSize);
            const row = Math.floor((y - offsetY) / this.cellSize);

            if (row >= 0 && row < this.game.gridSize && col >= 0 && col < this.game.gridSize) {
                if (this.selectionMode === 'single') {
                    this.selectCell(row, col);
                } else if (this.selectionMode === 'multi') {
                    this.toggleCellInSelection(row, col);
                }
            }
        });

        // Mouse move for tooltips
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

        // Mouse out to hide tooltip
        this.canvas.addEventListener('mouseout', () => {
            this.hideTooltip();
        });

        // Pause button
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.game.togglePause();
        });

        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'flex';
        });

        // Close buttons for modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
                this.isResearchModalOpen = false;
                this.isMarketModalOpen = false;
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    if (modal.id === 'research-modal') this.isResearchModalOpen = false;
                    if (modal.id === 'market-modal') this.isMarketModalOpen = false;
                }
            });
        });

        // Overlay select change
        document.getElementById('overlay-select').addEventListener('change', (e) => {
            this.game.currentOverlay = e.target.value;
            this.updateLegend();
            this.render();
        });

        // Speed slider
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            this.game.speed = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = `${this.game.speed}x`;
            this.game.updateInterval = 1000 / this.game.speed;
        });

        // Cell info close button
        document.getElementById('close-cell-info').addEventListener('click', () => {
            document.getElementById('cell-info').style.display = 'none';
            this.selectedCell = null;
            this.render();
        });

        // Research button
        document.getElementById('research-btn').addEventListener('click', () => {
            this.showResearchModal();
            this.isResearchModalOpen = true;
        });

        // Market button
        document.getElementById('market-btn').addEventListener('click', () => {
            this.showMarketModal();
            this.isMarketModalOpen = true;
        });

        // Irrigate button
        document.getElementById('irrigate-btn').addEventListener('click', () => {
            if (this.selectedCell) {
                const result = this.game.irrigateCell(this.selectedCell.row, this.selectedCell.col);
                if (result) {
                    this.lastAction = { type: 'irrigate', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                }
            }
        });

        // Fertilize button
        document.getElementById('fertilize-btn').addEventListener('click', () => {
            if (this.selectedCell) {
                const result = this.game.fertilizeCell(this.selectedCell.row, this.selectedCell.col);
                if (result) {
                    this.lastAction = { type: 'fertilize', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                }
            }
        });

        // Harvest button
        document.getElementById('harvest-btn').addEventListener('click', () => {
            if (this.selectedCell) {
                const result = this.game.harvestCell(this.selectedCell.row, this.selectedCell.col);
                if (result.success) {
                    this.lastAction = { type: 'harvest', params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                }
            }
        });
        
        // Dashboard toggle button
        this.addToggleDashboardButton();
        
        // Add hotkey listeners
        this.setupHotkeys();
        
        // Create and add row/column selectors
        this.setupRowColumnSelectors();
    }
    
    // Add a button to toggle dashboard visibility
    addToggleDashboardButton() {
        const btnGroup = document.querySelector('header .btn-group');
        const dashboardBtn = document.createElement('button');
        dashboardBtn.id = 'dashboard-btn';
        dashboardBtn.className = 'btn secondary';
        dashboardBtn.textContent = 'Dashboard';
        btnGroup.appendChild(dashboardBtn);
        
        dashboardBtn.addEventListener('click', () => {
            document.body.classList.toggle('dashboard-visible');
            this.updateDashboard();
        });
    }
    
    // Setup hotkeys for common actions
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger hotkeys when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'r': // Repeat last action
                    this.repeatLastAction();
                    break;
                case 'i': // Irrigate mode
                    if (this.selectionMode === 'single' && this.selectedCell) {
                        this.game.irrigateCell(this.selectedCell.row, this.selectedCell.col);
                    } else if (this.selectedCells.length > 0) {
                        this.bulkIrrigate();
                    }
                    break;
                case 'f': // Fertilize mode
                    if (this.selectionMode === 'single' && this.selectedCell) {
                        this.game.fertilizeCell(this.selectedCell.row, this.selectedCell.col);
                    } else if (this.selectedCells.length > 0) {
                        this.bulkFertilize();
                    }
                    break;
                case 'h': // Harvest mode
                    if (this.selectionMode === 'single' && this.selectedCell) {
                        this.game.harvestCell(this.selectedCell.row, this.selectedCell.col);
                    } else if (this.selectedCells.length > 0) {
                        this.bulkHarvest();
                    }
                    break;
                case 'Escape': // Clear selection
                    this.clearSelection();
                    this.closeBulkActionPanel();
                    break;
                case 'd': // Toggle dashboard
                    document.body.classList.toggle('dashboard-visible');
                    this.updateDashboard();
                    break;
                case 'm': // Toggle selection mode between single and multi
                    this.toggleSelectionMode();
                    break;
            }
        });
        
        // Add hotkey info panel
        this.addHotkeyInfoPanel();
    }
    
    // Add info panel to show available hotkeys
    addHotkeyInfoPanel() {
        const hotkeyPanel = document.createElement('div');
        hotkeyPanel.className = 'hotkey-info';
        hotkeyPanel.innerHTML = `
            <div class="hotkey-item"><span class="hotkey-key">R</span> Repeat last action</div>
            <div class="hotkey-item"><span class="hotkey-key">I</span> Irrigate selected</div>
            <div class="hotkey-item"><span class="hotkey-key">F</span> Fertilize selected</div>
            <div class="hotkey-item"><span class="hotkey-key">H</span> Harvest selected</div>
            <div class="hotkey-item"><span class="hotkey-key">M</span> Toggle selection mode</div>
            <div class="hotkey-item"><span class="hotkey-key">D</span> Toggle dashboard</div>
            <div class="hotkey-item"><span class="hotkey-key">Esc</span> Clear selection</div>
        `;
        document.querySelector('.farm-grid-container').appendChild(hotkeyPanel);
    }
    
    // Set up row and column selectors for bulk selection
    setupRowColumnSelectors() {
        // Create row selectors container
        const rowSelectors = document.createElement('div');
        rowSelectors.className = 'row-selectors';
        
        // Create column selectors container
        const columnSelectors = document.createElement('div');
        columnSelectors.className = 'column-selectors';
        
        // Add selectors for each row and column
        for (let i = 0; i < this.game.gridSize; i++) {
            // Row selector
            const rowBtn = document.createElement('button');
            rowBtn.className = 'selector-btn row-selector';
            rowBtn.textContent = (i + 1).toString();
            rowBtn.dataset.row = i;
            rowBtn.addEventListener('click', () => this.selectRow(i));
            rowSelectors.appendChild(rowBtn);
            
            // Column selector
            const colBtn = document.createElement('button');
            colBtn.className = 'selector-btn col-selector';
            colBtn.textContent = String.fromCharCode(65 + i); // A, B, C, ...
            colBtn.dataset.col = i;
            colBtn.addEventListener('click', () => this.selectColumn(i));
            columnSelectors.appendChild(colBtn);
        }
        
        // Add "select all" button to column selectors
        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'selector-btn select-all';
        selectAllBtn.textContent = '✓';
        selectAllBtn.title = 'Select All';
        selectAllBtn.addEventListener('click', () => this.selectAll());
        columnSelectors.appendChild(selectAllBtn);
        
        // Add selectors to the farm grid container
        const gridContainer = document.querySelector('.farm-grid-container');
        gridContainer.appendChild(rowSelectors);
        gridContainer.appendChild(columnSelectors);
        
        // Create bulk action panel
        this.createBulkActionPanel();
    }
    
    // Create a panel for bulk actions
    createBulkActionPanel() {
        const bulkPanel = document.createElement('div');
        bulkPanel.className = 'bulk-action-panel';
        bulkPanel.id = 'bulk-action-panel';
        
        bulkPanel.innerHTML = `
            <h3>Bulk Actions (<span id="selected-count">0</span> selected)</h3>
            <div class="bulk-action-buttons">
                <button id="bulk-irrigate" class="btn">Irrigate All</button>
                <button id="bulk-fertilize" class="btn">Fertilize All</button>
                <button id="bulk-harvest" class="btn">Harvest Ready</button>
                <button id="bulk-plant" class="btn">Plant...</button>
                <button id="clear-selection" class="btn secondary">Clear Selection</button>
            </div>
            <div id="bulk-plant-options" style="display: none; margin-top: 0.5rem;">
                <div class="crop-selection">
                    <div id="bulk-crop-options"></div>
                    <button id="bulk-plant-selected" class="btn" style="margin-top: 0.5rem;">Plant Selected Crop</button>
                </div>
            </div>
        `;
        
        document.querySelector('.farm-grid-container').appendChild(bulkPanel);
        
        // Add event listeners for bulk action buttons
        document.getElementById('bulk-irrigate').addEventListener('click', () => this.bulkIrrigate());
        document.getElementById('bulk-fertilize').addEventListener('click', () => this.bulkFertilize());
        document.getElementById('bulk-harvest').addEventListener('click', () => this.bulkHarvest());
        document.getElementById('bulk-plant').addEventListener('click', () => this.showBulkPlantOptions());
        document.getElementById('clear-selection').addEventListener('click', () => {
            this.clearSelection();
            this.closeBulkActionPanel();
        });
        document.getElementById('bulk-plant-selected').addEventListener('click', () => this.bulkPlant());
    }
    
    // Show options for bulk planting
    showBulkPlantOptions() {
        const options = document.getElementById('bulk-plant-options');
        options.style.display = 'block';
        
        const cropOptions = document.getElementById('bulk-crop-options');
        cropOptions.innerHTML = '';
        
        crops.forEach(crop => {
            if (crop.id !== 'empty') {
                const costToPlant = crop.basePrice * 0.4;
                cropOptions.innerHTML += `
                    <div class="crop-option">
                        <input type="radio" id="bulk-crop-${crop.id}" name="bulk-crop-select" value="${crop.id}">
                        <label for="bulk-crop-${crop.id}">${crop.name} ($${costToPlant})</label>
                    </div>
                `;
            }
        });
    }
    
    // Update dashboard with farm data
    updateDashboard() {
        if (!document.body.classList.contains('dashboard-visible')) return;
        
        // Calculate water, soil, and crop statistics
        let totalWater = 0;
        let totalSoil = 0;
        let cropCounts = {};
        let growthStages = {
            'early': 0,      // 0-33%
            'middle': 0,     // 34-66%
            'late': 0,       // 67-99%
            'ready': 0       // 100%
        };
        let plotsWithCrops = 0;
        
        for (let row = 0; row < this.game.gridSize; row++) {
            for (let col = 0; col < this.game.gridSize; col++) {
                const cell = this.game.grid[row][col];
                
                totalWater += cell.waterLevel;
                totalSoil += cell.soilHealth;
                
                // Count crop types
                if (cell.crop.id !== 'empty') {
                    cropCounts[cell.crop.id] = (cropCounts[cell.crop.id] || 0) + 1;
                    plotsWithCrops++;
                    
                    // Determine growth stage
                    if (cell.harvestReady) {
                        growthStages.ready++;
                    } else if (cell.growthProgress >= 67) {
                        growthStages.late++;
                    } else if (cell.growthProgress >= 34) {
                        growthStages.middle++;
                    } else {
                        growthStages.early++;
                    }
                }
            }
        }
        
        const totalCells = this.game.gridSize * this.game.gridSize;
        const avgWater = totalCells > 0 ? (totalWater / totalCells).toFixed(1) : 0;
        const avgSoil = totalCells > 0 ? (totalSoil / totalCells).toFixed(1) : 0;
        
        // Update dashboard statistics
        document.getElementById('avg-water').textContent = avgWater;
        document.getElementById('avg-soil').textContent = avgSoil;
        
        // Update the water chart
        this.updateWaterChart(avgWater);
        
        // Update the soil chart
        this.updateSoilChart(avgSoil);
        
        // Update crop distribution chart
        this.updateCropChart(cropCounts, totalCells);
        
        // Update growth stages chart
        this.updateGrowthChart(growthStages, plotsWithCrops);
        
        // Update financial summary
        this.updateFinancialSummary();
    }
    
    // Update water status chart
    updateWaterChart(avgWater) {
        const waterChart = document.getElementById('water-chart');
        waterChart.innerHTML = '';
        
        const barHeight = avgWater * 1.8; // Scale to fit in chart (180px height)
        
        // Determine bar color based on water level
        let barColor = '#66cc66'; // Good
        if (avgWater < 33) {
            barColor = '#ff6666'; // Low
        } else if (avgWater < 67) {
            barColor = '#ffcc66'; // Medium
        }
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.setProperty('--bar-width', '50%');
        bar.style.setProperty('--bar-color', barColor);
        bar.style.height = `${barHeight}px`;
        bar.style.left = '25%';
        
        waterChart.appendChild(bar);
    }
    
    // Update soil health chart
    updateSoilChart(avgSoil) {
        const soilChart = document.getElementById('soil-chart');
        soilChart.innerHTML = '';
        
        const barHeight = avgSoil * 1.8; // Scale to fit in chart
        
        // Determine bar color based on soil health
        let barColor = '#886644'; // Good
        if (avgSoil < 33) {
            barColor = '#cc9966'; // Poor
        } else if (avgSoil < 67) {
            barColor = '#aa8855'; // Average
        }
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.setProperty('--bar-width', '50%');
        bar.style.setProperty('--bar-color', barColor);
        bar.style.height = `${barHeight}px`;
        bar.style.left = '25%';
        
        soilChart.appendChild(bar);
    }
    
    // Update crop distribution chart
    updateCropChart(cropCounts, totalCells) {
        const cropChart = document.getElementById('crop-distribution');
        cropChart.innerHTML = '';
        
        const emptyCells = totalCells - Object.values(cropCounts).reduce((sum, count) => sum + count, 0);
        
        // Add empty plots to the count
        if (emptyCells > 0) {
            cropCounts['empty'] = emptyCells;
        }
        
        // Create bars for each crop
        const cropIds = Object.keys(cropCounts);
        const barWidth = 100 / (cropIds.length || 1);
        
        cropIds.forEach((cropId, index) => {
            const count = cropCounts[cropId];
            const percentage = (count / totalCells) * 100;
            const barHeight = percentage * 1.8; // Scale to fit chart height
            
            const cropData = getCropById(cropId);
            const barColor = cropData.color;
            
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.setProperty('--bar-width', `${barWidth}%`);
            bar.style.setProperty('--bar-color', barColor);
            bar.style.height = `${barHeight}px`;
            bar.style.left = `${index * barWidth}%`;
            bar.title = `${cropData.name}: ${count} plots (${percentage.toFixed(1)}%)`;
            
            cropChart.appendChild(bar);
            
            // Add crop label
            const label = document.createElement('div');
            label.className = 'bar-label';
            label.textContent = cropId === 'empty' ? 'Empty' : cropData.name.substring(0, 3);
            label.style.left = `${index * barWidth + barWidth/2}%`;
            label.style.bottom = '0';
            cropChart.appendChild(label);
        });
    }
    
    // Update growth stages chart
    updateGrowthChart(growthStages, plotsWithCrops) {
        const growthChart = document.getElementById('growth-chart');
        growthChart.innerHTML = '';
        
        if (plotsWithCrops === 0) {
            growthChart.innerHTML = '<div class="no-data">No crops planted</div>';
            return;
        }
        
        const stages = Object.keys(growthStages);
        const barWidth = 100 / (stages.length || 1);
        
        stages.forEach((stage, index) => {
            const count = growthStages[stage];
            const percentage = (count / plotsWithCrops) * 100;
            const barHeight = percentage * 1.8; // Scale to fit chart height
            
            // Color based on growth stage
            let barColor;
            switch(stage) {
                case 'early': barColor = '#ccffcc'; break;
                case 'middle': barColor = '#66cc66'; break;
                case 'late': barColor = '#339933'; break;
                case 'ready': barColor = '#e76f51'; break;
                default: barColor = '#cccccc';
            }
            
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.setProperty('--bar-width', `${barWidth}%`);
            bar.style.setProperty('--bar-color', barColor);
            bar.style.height = `${barHeight}px`;
            bar.style.left = `${index * barWidth}%`;
            bar.title = `${stage}: ${count} plots (${percentage.toFixed(1)}%)`;
            
            growthChart.appendChild(bar);
            
            // Add stage label
            const label = document.createElement('div');
            label.className = 'bar-label';
            label.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);
            label.style.left = `${index * barWidth + barWidth/2}%`;
            label.style.bottom = '0';
            growthChart.appendChild(label);
        });
    }
    
    // Update financial summary
    updateFinancialSummary() {
        // Daily expenses (irrigation, fertilizer, overhead)
        const dailyOverhead = this.game.dailyOverhead;
        const avgIrrigationCost = this.game.irrigationCost * 0.3; // Estimate 30% of plots irrigated daily
        const avgFertilizerCost = this.game.fertilizeCost * 0.1; // Estimate 10% of plots fertilized daily
        const totalDailyExpense = dailyOverhead + avgIrrigationCost + avgFertilizerCost;
        
        // Project income based on current ready-to-harvest crops
        let projectedIncome = 0;
        let seasonIncome = 0; // Track income for current season
        
        // Count fully grown crops and their values
        for (let row = 0; row < this.game.gridSize; row++) {
            for (let col = 0; col < this.game.gridSize; col++) {
                const cell = this.game.grid[row][col];
                if (cell.crop.id !== 'empty') {
                    if (cell.harvestReady) {
                        // Estimate harvest value
                        const marketPriceFactor = this.game.marketPrices[cell.crop.id] || 1.0;
                        const estimatedValue = cell.crop.harvestValue * (cell.expectedYield / 100) * marketPriceFactor;
                        projectedIncome += estimatedValue;
                    }
                    
                    // Estimate season income for all growing crops
                    const progress = cell.growthProgress;
                    const daysToHarvest = cell.harvestReady ? 0 : (100 - progress) / 2; // Rough estimate
                    
                    if (daysToHarvest <= 90) { // Will be ready this season
                        const marketPriceFactor = this.game.marketPrices[cell.crop.id] || 1.0;
                        const estimatedValue = cell.crop.harvestValue * (cell.expectedYield / 100) * marketPriceFactor;
                        seasonIncome += estimatedValue;
                    }
                }
            }
        }
        
        // Update financial summary text
        document.getElementById('daily-expenses').textContent = `${totalDailyExpense.toFixed(0)}`;
        document.getElementById('season-income').textContent = `${seasonIncome.toFixed(0)}`;
        document.getElementById('projected-income').textContent = `${projectedIncome.toFixed(0)}`;
    }
    
    // Handle cell selection
    selectCell(row, col) {
        this.selectionMode = 'single';
        this.selectedCell = { row, col };
        this.selectedCells = []; // Clear multi-selection when making a single selection
        this.showCellInfo(row, col);
        this.render();
    }
    
    // Toggle a cell in the multi-selection
    toggleCellInSelection(row, col) {
        const cellIndex = this.selectedCells.findIndex(cell => cell.row === row && cell.col === col);
        
        if (cellIndex >= 0) {
            // Cell is already selected, remove it
            this.selectedCells.splice(cellIndex, 1);
        } else {
            // Cell is not selected, add it
            this.selectedCells.push({ row, col });
        }
        
        this.updateBulkActionPanel();
        this.render();
    }
    
    // Select a row
    selectRow(row) {
        this.selectionMode = 'multi';
        this.selectedCells = [];
        this.selectedCell = null;
        
        // Select all cells in the row
        for (let col = 0; col < this.game.gridSize; col++) {
            this.selectedCells.push({ row, col });
        }
        
        this.showBulkActionPanel();
        this.render();
    }
    
    // Select a column
    selectColumn(col) {
        this.selectionMode = 'multi';
        this.selectedCells = [];
        this.selectedCell = null;
        
        // Select all cells in the column
        for (let row = 0; row < this.game.gridSize; row++) {
            this.selectedCells.push({ row, col });
        }
        
        this.showBulkActionPanel();
        this.render();
    }
    
    // Select all cells
    selectAll() {
        this.selectionMode = 'multi';
        this.selectedCells = [];
        this.selectedCell = null;
        
        // Select all cells in the grid
        for (let row = 0; row < this.game.gridSize; row++) {
            for (let col = 0; col < this.game.gridSize; col++) {
                this.selectedCells.push({ row, col });
            }
        }
        
        this.showBulkActionPanel();
        this.render();
    }
    
    // Clear all selections
    clearSelection() {
        this.selectedCells = [];
        this.selectedCell = null;
        this.render();
    }
    
    // Toggle between single and multi-selection modes
    toggleSelectionMode() {
        if (this.selectionMode === 'single') {
            this.selectionMode = 'multi';
            if (this.selectedCell) {
                // Convert single selection to multi
                this.selectedCells = [{ ...this.selectedCell }];
                this.selectedCell = null;
                this.showBulkActionPanel();
            }
        } else {
            this.selectionMode = 'single';
            this.selectedCells = [];
            this.closeBulkActionPanel();
        }
        this.render();
    }
    
    // Show the bulk action panel
    showBulkActionPanel() {
        const panel = document.getElementById('bulk-action-panel');
        if (panel) {
            panel.classList.add('visible');
            document.getElementById('selected-count').textContent = this.selectedCells.length;
        }
    }
    
    // Close the bulk action panel
    closeBulkActionPanel() {
        const panel = document.getElementById('bulk-action-panel');
        if (panel) {
            panel.classList.remove('visible');
            document.getElementById('bulk-plant-options').style.display = 'none';
        }
    }
    
    // Update the bulk action panel
    updateBulkActionPanel() {
        document.getElementById('selected-count').textContent = this.selectedCells.length;
        
        if (this.selectedCells.length > 0) {
            this.showBulkActionPanel();
        } else {
            this.closeBulkActionPanel();
        }
    }
    
    // Perform bulk irrigation
    bulkIrrigate() {
        if (this.selectedCells.length === 0) return;
        
        let successCount = 0;
        this.isBulkActionInProgress = true;
        
        for (const cell of this.selectedCells) {
            if (this.game.irrigateCell(cell.row, cell.col)) {
                successCount++;
            }
        }
        
        this.isBulkActionInProgress = false;
        
        if (successCount > 0) {
            this.lastAction = { type: 'bulkIrrigate', params: { cells: [...this.selectedCells] } };
            this.game.addEvent(`Bulk irrigated ${successCount} plots.`);
        }
        
        this.render();
    }
    
    // Perform bulk fertilization
    bulkFertilize() {
        if (this.selectedCells.length === 0) return;
        
        let successCount = 0;
        this.isBulkActionInProgress = true;
        
        for (const cell of this.selectedCells) {
            if (this.game.fertilizeCell(cell.row, cell.col)) {
                successCount++;
            }
        }
        
        this.isBulkActionInProgress = false;
        
        if (successCount > 0) {
            this.lastAction = { type: 'bulkFertilize', params: { cells: [...this.selectedCells] } };
            this.game.addEvent(`Bulk fertilized ${successCount} plots.`);
        }
        
        this.render();
    }
    
    // Perform bulk harvesting of ready crops
    bulkHarvest() {
        if (this.selectedCells.length === 0) return;
        
        let successCount = 0;
        let totalIncome = 0;
        this.isBulkActionInProgress = true;
        
        for (const cell of this.selectedCells) {
            const result = this.game.harvestCell(cell.row, cell.col);
            if (result.success) {
                successCount++;
                totalIncome += result.income;
            }
        }
        
        this.isBulkActionInProgress = false;
        
        if (successCount > 0) {
            this.lastAction = { type: 'bulkHarvest', params: { cells: [...this.selectedCells] } };
            this.game.addEvent(`Bulk harvested ${successCount} plots for ${totalIncome.toFixed(0)}.`);
        }
        
        this.render();
    }
    
    // Perform bulk planting
    bulkPlant() {
        if (this.selectedCells.length === 0) return;
        
        const selectedCrop = document.querySelector('input[name="bulk-crop-select"]:checked');
        if (!selectedCrop) {
            this.game.addEvent('No crop selected for bulk planting.', true);
            return;
        }
        
        let successCount = 0;
        let costTotal = 0;
        this.isBulkActionInProgress = true;
        
        for (const cell of this.selectedCells) {
            // Get the crop cost before planting
            const cropId = selectedCrop.value;
            const crop = getCropById(cropId);
            const plantingCost = Math.round(crop.basePrice * this.game.plantingCostFactor);
            
            if (this.game.plantCrop(cell.row, cell.col, cropId)) {
                successCount++;
                costTotal += plantingCost;
            }
        }
        
        this.isBulkActionInProgress = false;
        
        if (successCount > 0) {
            this.lastAction = { 
                type: 'bulkPlant', 
                params: { 
                    cells: [...this.selectedCells], 
                    cropId: selectedCrop.value 
                } 
            };
            this.game.addEvent(`Bulk planted ${successCount} plots with ${getCropById(selectedCrop.value).name} for ${costTotal}.`);
        }
        
        document.getElementById('bulk-plant-options').style.display = 'none';
        this.render();
    }
    
    // Repeat the last action
    repeatLastAction() {
        if (!this.lastAction) {
            this.game.addEvent('No previous action to repeat.', true);
            return;
        }
        
        // Execute the appropriate action based on type
        switch (this.lastAction.type) {
            case 'irrigate':
                this.game.irrigateCell(this.lastAction.params.row, this.lastAction.params.col);
                break;
            case 'fertilize':
                this.game.fertilizeCell(this.lastAction.params.row, this.lastAction.params.col);
                break;
            case 'harvest':
                this.game.harvestCell(this.lastAction.params.row, this.lastAction.params.col);
                break;
            case 'plant':
                this.game.plantCrop(
                    this.lastAction.params.row, 
                    this.lastAction.params.col, 
                    this.lastAction.params.cropId
                );
                break;
            case 'bulkIrrigate':
                if (this.lastAction.params.cells && this.lastAction.params.cells.length > 0) {
                    this.selectedCells = [...this.lastAction.params.cells];
                    this.selectionMode = 'multi';
                    this.bulkIrrigate();
                }
                break;
            case 'bulkFertilize':
                if (this.lastAction.params.cells && this.lastAction.params.cells.length > 0) {
                    this.selectedCells = [...this.lastAction.params.cells];
                    this.selectionMode = 'multi';
                    this.bulkFertilize();
                }
                break;
            case 'bulkHarvest':
                if (this.lastAction.params.cells && this.lastAction.params.cells.length > 0) {
                    this.selectedCells = [...this.lastAction.params.cells];
                    this.selectionMode = 'multi';
                    this.bulkHarvest();
                }
                break;
            case 'bulkPlant':
                if (this.lastAction.params.cells && this.lastAction.params.cells.length > 0 && this.lastAction.params.cropId) {
                    this.selectedCells = [...this.lastAction.params.cells];
                    this.selectionMode = 'multi';
                    
                    // Set the crop selection radio button
                    const cropRadio = document.querySelector(`input[name="bulk-crop-select"][value="${this.lastAction.params.cropId}"]`);
                    if (cropRadio) {
                        cropRadio.checked = true;
                        this.bulkPlant();
                    }
                }
                break;
        }
        
        this.render();
    }
    
    // Show detailed cell information panel
    showCellInfo(row, col) {
        const cell = this.game.grid[row][col];
        const cellInfo = document.getElementById('cell-info');
        const cellDetails = document.getElementById('cell-details');
        const cropOptions = document.getElementById('crop-options');

        // Update cell details
        cellDetails.innerHTML = `
            <div class="stat">
                <span>Current Crop:</span>
                <span class="stat-value">${cell.crop.name}</span>
            </div>
            <div class="stat">
                <span>Water Level:</span>
                <span class="stat-value">${cell.waterLevel}%</span>
            </div>
            <div class="stat">
                <span>Soil Health:</span>
                <span class="stat-value">${cell.soilHealth}%</span>
            </div>
        `;

        if (cell.crop.id !== 'empty') {
            cellDetails.innerHTML += `
                <div class="stat">
                    <span>Growth Progress:</span>
                    <span class="stat-value">${Math.floor(cell.growthProgress)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${cell.growthProgress}%"></div>
                </div>
            `;
        }

        // Show crop planting options
        cropOptions.innerHTML = '';
        crops.forEach(crop => {
            if (crop.id !== 'empty') {
                const costToPlant = crop.basePrice * 0.4;
                cropOptions.innerHTML += `
                    <div class="crop-option">
                        <input type="radio" id="crop-${crop.id}" name="crop-select" value="${crop.id}">
                        <label for="crop-${crop.id}">${crop.name} (${costToPlant})</label>
                    </div>
                `;
            }
        });

        // Add plant button
        cropOptions.innerHTML += `
            <button id="plant-btn" class="btn">Plant Selected Crop</button>
        `;

        // Add event listener for plant button
        document.getElementById('plant-btn').addEventListener('click', () => {
            const selectedCrop = document.querySelector('input[name="crop-select"]:checked');
            if (selectedCrop) {
                const cropId = selectedCrop.value;
                const success = this.game.plantCrop(row, col, cropId);
                if (success) {
                    this.lastAction = { type: 'plant', params: { row, col, cropId } };
                }
            }
        });

        // Update buttons based on cell state
        document.getElementById('irrigate-btn').disabled = cell.irrigated;
        document.getElementById('fertilize-btn').disabled = cell.fertilized;
        document.getElementById('harvest-btn').disabled = !cell.harvestReady;

        // Show the panel
        cellInfo.style.display = 'block';
    }
    
    // Show tooltip on cell hover
    showTooltip(x, y, row, col) {
        const tooltip = document.getElementById('tooltip');
        const cell = this.game.grid[row][col];

        let content = `
            <div><strong>${cell.crop.name}</strong></div>
            <div>Water: ${cell.waterLevel}%</div>
            <div>Soil: ${cell.soilHealth}%</div>
        `;

        if (cell.crop.id !== 'empty') {
            content += `
                <div>Growth: ${Math.floor(cell.growthProgress)}%</div>
                <div>Expected Yield: ${cell.expectedYield}%</div>
            `;
        }

        tooltip.innerHTML = content;
        tooltip.style.left = (x + 10) + 'px';
        tooltip.style.top = (y + 10) + 'px';
        tooltip.style.visibility = 'visible';
    }
    
    // Hide tooltip
    hideTooltip() {
        document.getElementById('tooltip').style.visibility = 'hidden';
    }
    
    // Display research modal
    showResearchModal() {
        const researchOptions = document.getElementById('research-options');
        researchOptions.innerHTML = '';

        this.game.technologies.forEach(tech => {
            const available = this.game.checkTechPrerequisites(tech);
            const statusClass = tech.researched ? 'researched' : (available ? '' : 'unavailable');

            researchOptions.innerHTML += `
                <div class="tech-item ${statusClass}" data-tech-id="${tech.id}">
                    <div class="tech-name">${tech.name} ${tech.researched ? '<span class="badge success">Researched</span>' : ''}</div>
                    <div class="tech-desc">${tech.description}</div>
                    <div class="tech-cost">Cost: ${tech.cost}</div>
                    ${tech.prerequisites.length > 0 ? `<div class="tech-prereq">Prerequisites: ${tech.prerequisites.map(p => {
                        const prereqTech = this.game.technologies.find(t => t.id === p);
                        return prereqTech ? prereqTech.name : p;
                    }).join(', ')}</div>` : ''}
                </div>
            `;
        });

        // Add event listeners for research
        document.querySelectorAll('.tech-item:not(.researched):not(.unavailable)').forEach(item => {
            item.addEventListener('click', () => {
                const techId = item.dataset.techId;
                this.game.researchTechnology(techId);
            });
        });

        document.getElementById('research-modal').style.display = 'flex';
    }
    
    // Display market prices modal
    showMarketModal() {
        const marketInfo = document.getElementById('market-info');
        marketInfo.innerHTML = `
            <p>Current market prices (100% = base price):</p>
            <div class="market-prices">
                ${crops.filter(c => c.id !== 'empty').map(crop => `
                    <div class="stat">
                        <span>${crop.name}:</span>
                        <span class="stat-value">${Math.round(this.game.marketPrices[crop.id] * 100)}%</span>
                    </div>
                `).join('')}
            </div>
            <p>Market trends for next season:</p>
            <div class="market-trends">
                ${crops.filter(c => c.id !== 'empty').map(crop => {
                    const trend = Math.random() > 0.5 ? 'rising' : 'falling';
                    const trendClass = trend === 'rising' ? 'success' : 'danger';
                    return `
                        <div class="stat">
                            <span>${crop.name}:</span>
                            <span class="stat-value">
                                <span class="badge ${trendClass}">${trend}</span>
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        document.getElementById('market-modal').style.display = 'flex';
    }
    
    // Update game HUD with current values
    updateHUD() {
        document.getElementById('balance').textContent = this.game.balance.toLocaleString();
        document.getElementById('farm-value').textContent = this.game.farmValue.toLocaleString();
        document.getElementById('farm-health').textContent = this.game.farmHealth;
        document.getElementById('water-reserve').textContent = this.game.waterReserve;
        document.getElementById('date-display').textContent = `${this.game.season}, Year ${this.game.year}`;
        document.getElementById('year-display').textContent = this.game.year;
        document.getElementById('season-display').textContent = this.game.season;
    }
    
    // Update events list display
    updateEventsList() {
        const eventsContainer = document.getElementById('events-container');
        eventsContainer.innerHTML = '';

        this.game.events.forEach(event => {
            // Format any currency values in the message
            let formattedMessage = event.message;
            if (typeof formattedMessage === 'string' && formattedMessage.includes(')) {
                // Make sure dollar amounts are properly formatted
                formattedMessage = formattedMessage.replace(/\$(\d+)/g, (match, p1) => {
                    return ' + Number(p1).toLocaleString();
                });
            }

            eventsContainer.innerHTML += `
                <div class="event ${event.isAlert ? 'alert' : ''}">
                    <div class="event-date">${event.date}</div>
                    <div>${formattedMessage}</div>
                </div>
            `;
        });
    }
    
    // Update legend for current overlay
    updateLegend() {
        const legend = document.getElementById('grid-legend');
        legend.innerHTML = '';

        switch (this.game.currentOverlay) {
            case 'crop':
                crops.forEach(crop => {
                    if (crop.id !== 'empty') {
                        legend.innerHTML += `
                            <div class="legend-item">
                                <div class="legend-color" style="background-color: ${crop.color}"></div>
                                <span>${crop.name}</span>
                            </div>
                        `;
                    }
                });
                break;
            case 'water':
                legend.innerHTML += `
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #ff6666"></div>
                        <span>Low (0-33%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #ffcc66"></div>
                        <span>Medium (34-66%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #66cc66"></div>
                        <span>High (67-100%)</span>
                    </div>
                `;
                break;
            case 'soil':
                legend.innerHTML += `
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #cc9966"></div>
                        <span>Poor (0-33%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #aa8855"></div>
                        <span>Average (34-66%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #886644"></div>
                        <span>Good (67-100%)</span>
                    </div>
                `;
                break;
            case 'yield':
                legend.innerHTML += `
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #ffaaaa"></div>
                        <span>Low (0-50%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #ffffaa"></div>
                        <span>Medium (51-100%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #aaffaa"></div>
                        <span>High (>100%)</span>
                    </div>
                `;
                break;
        }
    }
    
    // Render the farm grid
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate offset to center the grid
        const offsetX = (this.canvas.width - this.cellSize * this.game.gridSize) / 2;
        const offsetY = (this.canvas.height - this.cellSize * this.game.gridSize) / 2;

        // Draw each cell
        for (let row = 0; row < this.game.gridSize; row++) {
            for (let col = 0; col < this.game.gridSize; col++) {
                const x = offsetX + col * this.cellSize;
                const y = offsetY + row * this.cellSize;

                this.drawCell(x, y, row, col);
            }
        }
    }
    
    // Draw a single cell
    drawCell(x, y, row, col) {
        const cell = this.game.grid[row][col];

        // Determine cell color based on overlay type
        let fillColor;

        switch (this.game.currentOverlay) {
            case 'crop':
                fillColor = cell.crop.color;
                break;
            case 'water':
                if (cell.waterLevel < 33) {
                    fillColor = '#ff6666'; // Low water - red
                } else if (cell.waterLevel < 67) {
                    fillColor = '#ffcc66'; // Medium water - orange
                } else {
                    fillColor = '#66cc66'; // High water - green
                }
                break;
            case 'soil':
                if (cell.soilHealth < 33) {
                    fillColor = '#cc9966'; // Poor soil - light brown
                } else if (cell.soilHealth < 67) {
                    fillColor = '#aa8855'; // Average soil - medium brown
                } else {
                    fillColor = '#886644'; // Good soil - dark brown
                }
                break;
            case 'yield':
                if (cell.crop.id === 'empty') {
                    fillColor = '#e9e9e9'; // Empty plot
                } else if (cell.expectedYield < 50) {
                    fillColor = '#ffaaaa'; // Low yield - light red
                } else if (cell.expectedYield < 100) {
                    fillColor = '#ffffaa'; // Medium yield - yellow
                } else {
                    fillColor = '#aaffaa'; // High yield - light green
                }
                break;
            default:
                fillColor = cell.crop.color;
        }

        // Draw cell background
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // Draw border (highlight if selected)
        if (this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
        } else if (this.selectedCells.some(cell => cell.row === row && cell.col === col)) {
            // Cell is part of multi-selection
            this.ctx.strokeStyle = '#e76f51';
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.strokeStyle = '#ccc';
            this.ctx.lineWidth = 0.5;
        }
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        // Draw crop icon or symbol if not empty
        if (cell.crop.id !== 'empty') {
            // Simple crop representation
            this.ctx.fillStyle = '#000';
            this.ctx.font = `${this.cellSize * 0.3}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(cell.crop.id.charAt(0).toUpperCase(), x + this.cellSize / 2, y + this.cellSize / 2);

            // Draw harvest indicator if ready
            if (cell.harvestReady) {
                this.ctx.fillStyle = '#f0f';
                this.ctx.beginPath();
                this.ctx.arc(x + this.cellSize - 5, y + 5, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
}
