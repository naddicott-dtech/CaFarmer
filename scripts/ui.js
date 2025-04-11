/**
 * California Climate Farmer - UI Manager (Truly Complete - Uncollapsed)
 */

import { crops, getCropById } from './crops.js';
import { formatCurrency } from './utils.js';
import { checkTechPrerequisites } from './technology.js';

export class UIManager {
    // --- CONSTRUCTOR ---
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('farm-grid');
        if (!this.canvas) {
            console.error("Fatal Error: Farm grid canvas element not found! UI cannot initialize.");
            throw new Error("Farm grid canvas not found!");
        }
        this.ctx = this.canvas.getContext('2d');

        // State properties
        this.selectedCell = null;
        this.selectedCells = [];
        this.selectionMode = 'single';
        this.lastAction = null;
        this.isBulkActionInProgress = false;
        this.isResearchModalOpen = false;
        this.isMarketModalOpen = false;
        this.cellSize = 40; // Default, will be recalculated

        // Initialize UI components in order
        this.setupCanvasSize();
        this.setupDashboard();
        this.setupEventListeners(); // This calls methods defined below
        this.updateLegend();
        this.updateTechList();

        // Dashboard update timer
        this.dashboardUpdateTimer = setInterval(() => {
            if (this.game && !this.game.paused && document.body.classList.contains('dashboard-visible')) {
                this.updateDashboard();
            }
        }, 5000);

        console.log("UIManager initialized.");
    }

    // --- SETUP METHODS ---

    setupCanvasSize() {
        const calculateSize = () => {
            const container = this.canvas.parentElement;
            if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
                console.warn("Canvas container not ready for size calculation.");
                return;
            }
            const width = container.clientWidth;
            const height = Math.max(container.clientHeight, 100);
            this.canvas.width = width;
            this.canvas.height = height;

             if (this.game.gridSize && this.game.gridSize > 0) {
                 this.cellSize = Math.min(width / this.game.gridSize, height / this.game.gridSize) * 0.95;
             } else {
                 console.warn("Grid size not available during canvas size calculation.");
                 this.cellSize = 40;
             }
             console.log(`Canvas resized: ${width}x${height}, CellSize: ${this.cellSize}`);
            this.render();
        };
        calculateSize();
        window.addEventListener('resize', calculateSize);
    }

    setupDashboard() {
        if (document.getElementById('farm-dashboard')) return;

        const dashboardContainer = document.createElement('div');
        dashboardContainer.id = 'farm-dashboard';
        dashboardContainer.className = 'farm-dashboard';

        const sidebar = document.querySelector('.sidebar');
        if (sidebar?.parentNode) {
            sidebar.parentNode.insertBefore(dashboardContainer, sidebar);
        } else {
            console.error("Sidebar not found for dashboard insertion.");
            document.body.appendChild(dashboardContainer);
        }

        dashboardContainer.innerHTML = `
            <div class="dashboard-header"><h2>Farm Dashboard</h2><button id="refresh-dashboard" class="btn">Refresh</button></div>
            <div class="dashboard-grid">
                <div class="dashboard-card"><h3>Water Status</h3><div id="water-chart" class="dashboard-chart"><div class="no-data">N/A</div></div><div class="dashboard-stat">Average: <span id="avg-water">0</span>%</div></div>
                <div class="dashboard-card"><h3>Soil Health</h3><div id="soil-chart" class="dashboard-chart"><div class="no-data">N/A</div></div><div class="dashboard-stat">Average: <span id="avg-soil">0</span>%</div></div>
                <div class="dashboard-card"><h3>Crop Distribution</h3><div id="crop-distribution" class="dashboard-chart"><div class="no-data">N/A</div></div></div>
                <div class="dashboard-card"><h3>Growth Stages</h3><div id="growth-chart" class="dashboard-chart"><div class="no-data">N/A</div></div></div>
            </div>
            <div class="dashboard-row">
                <div class="dashboard-card wide"><h3>Financial Summary</h3><div class="financial-stats"><div class="financial-stat"><span>Daily Overhead:</span><span id="daily-expenses">$0</span></div><div class="financial-stat"><span>Ready Income:</span><span id="projected-income">$0</span></div><div class="financial-stat"><span>Potential Income:</span><span id="season-income">$0</span></div></div></div>
            </div>`;

        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.updateDashboard());
        }

        if (!document.getElementById('dashboard-styles')) {
            this.addDashboardStyles();
        }
    }

    addDashboardStyles() {
        const style = document.createElement('style');
        style.id = 'dashboard-styles';
        style.textContent = `
            .farm-dashboard { display: none; } .dashboard-visible .farm-dashboard { display: block; } .farm-dashboard { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 1rem; margin-bottom: 1rem; overflow: auto; } .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; } .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; } .dashboard-row { display: flex; gap: 1rem; margin-bottom: 1rem; } .dashboard-card { background: #f9f9f9; border-radius: 6px; padding: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); } .dashboard-card h3 { margin-top: 0; margin-bottom: 0.5rem; font-size: 1.1rem; color: var(--dark-color); } .dashboard-card.wide { flex: 1; } .dashboard-chart { height: 150px; margin: 0.5rem 0; background: #f0f0f0; border-radius: 4px; position: relative; overflow: hidden; } .dashboard-stat { font-size: 0.9rem; color: #555; text-align: center; margin-top: 0.5rem; } .dashboard-stat span { font-weight: bold; color: var(--text-color); } .no-data { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #999; font-style: italic; } .chart-bar { position: absolute; bottom: 0; background: var(--bar-color, #2a9d8f); transition: height 0.3s ease; border-top-left-radius: 3px; border-top-right-radius: 3px;} .bar-label { position: absolute; transform: translateX(-50%); font-size: 0.7rem; color: #666; bottom: 2px; text-align: center; z-index: 1; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;} .financial-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-top: 0.5rem; } .financial-stat { padding: 0.8rem; background: #e9ecef; border-radius: 4px; text-align: center; } .financial-stat span:first-child { display: block; font-size: 0.8rem; color: #6c757d; margin-bottom: 0.3rem; } .financial-stat span:last-child { font-size: 1.1rem; font-weight: bold; color: #212529; } @media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } .dashboard-row { flex-direction: column; } .financial-stats { grid-template-columns: 1fr; } .dashboard-chart { height: 120px; } } .row-selectors, .column-selectors { position: absolute; display: flex; z-index: 50; } .row-selectors { flex-direction: column; left: 5px; top: 50%; transform: translateY(-50%); } .column-selectors { flex-direction: row; top: 5px; left: 50%; transform: translateX(-50%); } .selector-btn { background: rgba(42, 157, 143, 0.7); color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 1px; border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: bold; border: none; line-height: 1; } .selector-btn:hover { background: rgba(42, 157, 143, 1); } .selector-btn.active { background: var(--danger-color); } .bulk-action-panel { display: none; position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); background: white; padding: 0.8rem; border-radius: 6px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); z-index: 100; } .bulk-action-panel.visible { display: block; } .bulk-action-panel h3 { margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem; } .bulk-action-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; } #bulk-plant-options { display: none; margin-top: 0.5rem; } #bulk-plant-options .crop-selection { max-height: 100px; overflow-y: auto; margin-bottom: 0.5rem; border: 1px solid #eee; padding: 0.3rem;} #bulk-plant-options .crop-option label { font-size: 0.9rem; } .hotkey-info { position: absolute; bottom: 5px; right: 5px; background: rgba(255, 255, 255, 0.8); padding: 0.4rem; border-radius: 4px; font-size: 0.75rem; z-index: 50; } .hotkey-item { margin-bottom: 0.15rem; } .hotkey-key { background: #e9ecef; border: 1px solid #ced4da; border-radius: 3px; padding: 0 4px; font-family: monospace; display: inline-block; min-width: 16px; text-align: center; }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Canvas click
        this.canvas.addEventListener('click', (e) => {
            if (this.isBulkActionInProgress) return;
            const { row, col } = this._getCanvasClickCoords(e);
            if (row !== -1) {
                 if (this.selectionMode === 'single') this.selectCell(row, col);
                 else this.toggleCellInSelection(row, col);
            } else {
                 this.clearSelection(); this.closeBulkActionPanel();
            }
        });
        // Canvas mousemove for tooltip
        this.canvas.addEventListener('mousemove', (e) => {
            const { row, col } = this._getCanvasClickCoords(e);
             if (row !== -1) this.showTooltip(e.clientX, e.clientY, row, col);
             else this.hideTooltip();
        });
        this.canvas.addEventListener('mouseout', () => this.hideTooltip());

        // Standard Buttons
        document.getElementById('pause-btn')?.addEventListener('click', () => this.game.togglePause());
        document.getElementById('help-btn')?.addEventListener('click', () => { const helpModal = document.getElementById('help-modal'); if(helpModal) helpModal.style.display = 'flex'; });
        document.getElementById('research-btn')?.addEventListener('click', () => { this.showResearchModal(); this.isResearchModalOpen = true; });
        document.getElementById('market-btn')?.addEventListener('click', () => { this.showMarketModal(); this.isMarketModalOpen = true; });

        // Modal Closes
        document.querySelectorAll('.modal .close').forEach(btn => btn.addEventListener('click', (e) => this._closeModal(e.target.closest('.modal'))));
        window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) this._closeModal(e.target); });

        // Controls
        document.getElementById('overlay-select')?.addEventListener('change', (e) => { this.game.currentOverlay = e.target.value; this.updateLegend(); this.render(); });
        // Ensure game.setSpeed exists or use game.speed directly if needed
        document.getElementById('speed-slider')?.addEventListener('input', (e) => {
             const newSpeed = parseInt(e.target.value);
             if(typeof this.game.setSpeed === 'function') {
                 this.game.setSpeed(newSpeed);
             } else {
                  this.game.speed = newSpeed; // Fallback if no setter
                  if (this.game.speed > 0) { this.game.updateInterval = 1000 / this.game.speed; }
             }
             const speedValue = document.getElementById('speed-value');
             if(speedValue) speedValue.textContent = `${this.game.speed}x`;
        });


        // Cell Info Panel Actions
         document.getElementById('close-cell-info')?.addEventListener('click', () => { document.getElementById('cell-info').style.display = 'none'; this.selectedCell = null; this.render(); });
         document.getElementById('irrigate-btn')?.addEventListener('click', () => this._handleCellAction('irrigate', this.game.irrigateCell));
         document.getElementById('fertilize-btn')?.addEventListener('click', () => this._handleCellAction('fertilize', this.game.fertilizeCell));
         document.getElementById('harvest-btn')?.addEventListener('click', () => this._handleCellAction('harvest', this.game.harvestCell));
         // Plant button listener is added dynamically in showCellInfo

         // Add other listeners
         this.addToggleDashboardButton();
         this.setupHotkeys();
         this.setupRowColumnSelectors();
    }

    addToggleDashboardButton() {
        const btnGroup = document.querySelector('header .btn-group');
        if (!document.getElementById('dashboard-btn') && btnGroup) {
            const dashboardBtn = document.createElement('button');
            dashboardBtn.id = 'dashboard-btn';
            dashboardBtn.className = 'btn secondary';
            dashboardBtn.textContent = 'Dashboard';
            btnGroup.appendChild(dashboardBtn);
            dashboardBtn.addEventListener('click', () => {
                const dashboardVisible = document.body.classList.toggle('dashboard-visible');
                 if (dashboardVisible) { this.updateDashboard(); }
            });
            console.log("Dashboard toggle button added.");
        } else if (document.getElementById('dashboard-btn')) { console.log("Dashboard toggle button already exists."); }
         else { console.error("Could not find header button group to add dashboard toggle button."); }
    }

    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (this.isResearchModalOpen || this.isMarketModalOpen || document.querySelector('.modal:not(#help-modal)[style*="display: flex"]')) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            if (e.key === 'Escape') { this.clearSelection(); this.closeBulkActionPanel(); const cellInfoPanel = document.getElementById('cell-info'); if(cellInfoPanel) cellInfoPanel.style.display = 'none'; this.selectedCell = null; this.render(); document.querySelectorAll('.modal:not(#help-modal)').forEach(modal => this._closeModal(modal)); return; }
            let actionTaken = false;
            switch(e.key.toLowerCase()) {
                case 'r': this.repeatLastAction(); actionTaken = true; break;
                case 'i': if (this.selectionMode === 'single' && this.selectedCell) { this._handleCellAction('irrigate', this.game.irrigateCell); } else if (this.selectedCells.length > 0) { this.bulkIrrigate(); } actionTaken = true; break;
                case 'f': if (this.selectionMode === 'single' && this.selectedCell) { this._handleCellAction('fertilize', this.game.fertilizeCell); } else if (this.selectedCells.length > 0) { this.bulkFertilize(); } actionTaken = true; break;
                case 'h': if (this.selectionMode === 'single' && this.selectedCell) { this._handleCellAction('harvest', this.game.harvestCell); } else if (this.selectedCells.length > 0) { this.bulkHarvest(); } actionTaken = true; break;
                case 'd': const dashboardVisible = document.body.classList.toggle('dashboard-visible'); if (dashboardVisible) { this.updateDashboard(); } actionTaken = true; break;
                case 'm': this.toggleSelectionMode(); actionTaken = true; break;
            }
            if (actionTaken && ['r', 'i', 'f', 'h', 'd', 'm'].includes(e.key.toLowerCase())) { e.preventDefault(); }
        });
        console.log("Hotkey listeners set up.");
        if (!document.querySelector('.hotkey-info')) { this.addHotkeyInfoPanel(); }
    }

    addHotkeyInfoPanel() {
        const hotkeyPanel = document.createElement('div'); hotkeyPanel.className = 'hotkey-info';
        hotkeyPanel.innerHTML = `<div class="hotkey-item"><span class="hotkey-key">R</span> Repeat</div><div class="hotkey-item"><span class="hotkey-key">I</span> Irrigate</div><div class="hotkey-item"><span class="hotkey-key">F</span> Fertilize</div><div class="hotkey-item"><span class="hotkey-key">H</span> Harvest</div><div class="hotkey-item"><span class="hotkey-key">M</span> Sel. Mode</div><div class="hotkey-item"><span class="hotkey-key">D</span> Dashboard</div><div class="hotkey-item"><span class="hotkey-key">Esc</span> Clear/Close</div>`;
         const gridContainer = document.querySelector('.farm-grid-container');
         if (gridContainer) { gridContainer.appendChild(hotkeyPanel); console.log("Hotkey info panel added."); }
         else { console.error("Cannot find grid container to append hotkey info panel."); }
    }

    setupRowColumnSelectors() {
        const gridContainer = document.querySelector('.farm-grid-container'); if (!gridContainer) { console.error("Grid container not found for selectors."); return; } if (gridContainer.querySelector('.row-selectors')) return;
        const rowSelectors = document.createElement('div'); rowSelectors.className = 'row-selectors'; const columnSelectors = document.createElement('div'); columnSelectors.className = 'column-selectors';
        for (let i = 0; i < this.game.gridSize; i++) { const rowBtn = document.createElement('button'); rowBtn.className = 'selector-btn row-selector'; rowBtn.textContent = (i + 1).toString(); rowBtn.dataset.row = i; rowBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectRow(i); }); rowSelectors.appendChild(rowBtn); const colBtn = document.createElement('button'); colBtn.className = 'selector-btn col-selector'; colBtn.textContent = String.fromCharCode(65 + i); colBtn.dataset.col = i; colBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectColumn(i); }); columnSelectors.appendChild(colBtn); }
        const selectAllBtn = document.createElement('button'); selectAllBtn.className = 'selector-btn select-all'; selectAllBtn.textContent = '✓'; selectAllBtn.title = 'Select All'; selectAllBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectAll(); }); columnSelectors.appendChild(selectAllBtn);
        gridContainer.appendChild(rowSelectors); gridContainer.appendChild(columnSelectors); console.log("Row/Column selectors added.");
        this.createBulkActionPanel();
    }

    createBulkActionPanel() {
        const gridContainer = document.querySelector('.farm-grid-container'); if (!gridContainer || document.getElementById('bulk-action-panel')) return;
        const bulkPanel = document.createElement('div'); bulkPanel.className = 'bulk-action-panel'; bulkPanel.id = 'bulk-action-panel';
        bulkPanel.innerHTML = `<h3>Bulk Actions (<span id="selected-count">0</span>)</h3><div class="bulk-action-buttons"><button id="bulk-irrigate" class="btn">Irrigate</button><button id="bulk-fertilize" class="btn">Fertilize</button><button id="bulk-harvest" class="btn">Harvest</button><button id="bulk-plant" class="btn">Plant...</button><button id="clear-selection" class="btn secondary">Clear</button></div><div id="bulk-plant-options"><div class="crop-selection"><div id="bulk-crop-options"></div><button id="bulk-plant-selected" class="btn">Plant Crop</button></div></div>`;
        gridContainer.appendChild(bulkPanel); console.log("Bulk action panel created.");
        document.getElementById('bulk-irrigate')?.addEventListener('click', () => this.bulkIrrigate()); document.getElementById('bulk-fertilize')?.addEventListener('click', () => this.bulkFertilize()); document.getElementById('bulk-harvest')?.addEventListener('click', () => this.bulkHarvest()); document.getElementById('bulk-plant')?.addEventListener('click', () => this.showBulkPlantOptions()); document.getElementById('clear-selection')?.addEventListener('click', () => { this.clearSelection(); this.closeBulkActionPanel(); }); document.getElementById('bulk-plant-selected')?.addEventListener('click', () => this.bulkPlant());
    }

    // --- UI Update Methods ---
    updateHUD() {
         const balanceEl = document.getElementById('balance'); if(balanceEl) balanceEl.textContent = formatCurrency(this.game.balance);
         const farmValEl = document.getElementById('farm-value'); if(farmValEl) farmValEl.textContent = formatCurrency(this.game.farmValue);
         const farmHealthEl = document.getElementById('farm-health'); if(farmHealthEl) farmHealthEl.textContent = this.game.farmHealth.toFixed(0);
         const waterResEl = document.getElementById('water-reserve'); if(waterResEl) waterResEl.textContent = this.game.waterReserve.toFixed(0);
         const dateDispEl = document.getElementById('date-display'); if(dateDispEl) dateDispEl.textContent = `${this.game.season}, Year ${this.game.year} (Day ${this.game.dayOfYear})`;
         const yearDispEl = document.getElementById('year-display'); if(yearDispEl) yearDispEl.textContent = this.game.year;
         const seasonDispEl = document.getElementById('season-display'); if(seasonDispEl) seasonDispEl.textContent = this.game.season;
         const pauseBtn = document.getElementById('pause-btn'); if (pauseBtn) pauseBtn.textContent = this.game.paused ? 'Resume' : 'Pause';
    }

    updateEventsList() {
        const eventsContainer = document.getElementById('events-container'); if (!eventsContainer) return; eventsContainer.innerHTML = '';
        const recentEvents = this.game.events.slice(-15);
        recentEvents.forEach(event => {
            let formattedMessage = event.message;
            if (typeof formattedMessage === 'string' && formattedMessage.includes('$')) {
                formattedMessage = formattedMessage.replace(/\$(\d+(\.\d+)?)/g, (match, p1) => {
                    try { return typeof formatCurrency === 'function' ? formatCurrency(Number(p1)) : match; }
                    catch (e) { console.error("Error formatting currency:", e); return match; }
                });
            }
            const eventDiv = document.createElement('div'); eventDiv.className = `event ${event.isAlert ? 'alert' : ''}`;
            eventDiv.innerHTML = `<div class="event-date">${event.date || `Yr ${event.year}, Day ${event.day}`}</div><div>${formattedMessage}</div>`;
            eventsContainer.appendChild(eventDiv);
        });
        eventsContainer.scrollTop = eventsContainer.scrollHeight;
    }

    updateLegend() {
        const legend = document.getElementById('grid-legend'); if(!legend) return; legend.innerHTML = ''; let legendItems = [];
        switch (this.game.currentOverlay) {
            case 'crop': legendItems = crops.filter(c => c.id !== 'empty').map(crop => ({ color: crop.color, label: crop.name })); break;
            case 'water': legendItems = [{ color: '#ff6666', label: 'Low (0-33%)' }, { color: '#ffcc66', label: 'Medium (34-66%)' }, { color: '#66cc66', label: 'High (67-100%)' }]; break;
            case 'soil': legendItems = [{ color: '#cc9966', label: 'Poor (0-33%)' }, { color: '#aa8855', label: 'Average (34-66%)' }, { color: '#886644', label: 'Good (67-100%)' }]; break;
            case 'yield': legendItems = [{ color: '#ffaaaa', label: 'Low (<50%)' }, { color: '#ffffaa', label: 'Medium (50-100%)' }, { color: '#aaffaa', label: 'High (>100%)' }]; break;
            default: legend.innerHTML = '<div>Select Overlay</div>'; return;
        }
        legendItems.forEach(item => { legend.innerHTML += `<div class="legend-item"><div class="legend-color" style="background-color: ${item.color}"></div><span>${item.label}</span></div>`; });
    }

    updateTechList() {
        const techContainer = document.getElementById('tech-container'); if (!techContainer) return; techContainer.innerHTML = '';
        const researchedTechs = this.game.technologies.filter(t => t.researched);
        if (researchedTechs.length === 0) { techContainer.innerHTML = '<p>No tech researched.</p>'; return; }
        const ul = document.createElement('ul');
        researchedTechs.forEach(tech => { const li = document.createElement('li'); li.textContent = tech.name; li.title = tech.description; ul.appendChild(li); });
        techContainer.appendChild(ul);
    }

    updateDashboard() {
        if (!document.body.classList.contains('dashboard-visible') || !this.game) return;
        let totalWater = 0, totalSoil = 0, plotsWithCrops = 0, projectedIncome = 0, potentialIncome = 0; let cropCounts = {}; let growthStages = { 'early': 0, 'middle': 0, 'late': 0, 'ready': 0 };
        const totalCells = this.game.gridSize * this.game.gridSize; if (totalCells === 0) return;
        for (let row = 0; row < this.game.gridSize; row++) { for (let col = 0; col < this.game.gridSize; col++) { const cell = this.game.grid[row][col]; totalWater += cell.waterLevel; totalSoil += cell.soilHealth; if (cell.crop.id !== 'empty') { cropCounts[cell.crop.id] = (cropCounts[cell.crop.id] || 0) + 1; plotsWithCrops++; const marketPriceFactor = this.game.marketPrices[cell.crop.id] || 1.0; const currentPotentialValue = cell.crop.harvestValue * (cell.expectedYield / 100) * marketPriceFactor; potentialIncome += currentPotentialValue; if (cell.harvestReady) { growthStages.ready++; projectedIncome += currentPotentialValue; } else { if (cell.growthProgress >= 67) growthStages.late++; else if (cell.growthProgress >= 34) growthStages.middle++; else growthStages.early++; } } } }
        const avgWater = totalCells > 0 ? (totalWater / totalCells).toFixed(1) : 0; const avgSoil = totalCells > 0 ? (totalSoil / totalCells).toFixed(1) : 0;
        const avgWaterEl = document.getElementById('avg-water'); const avgSoilEl = document.getElementById('avg-soil'); if(avgWaterEl) avgWaterEl.textContent = avgWater; if(avgSoilEl) avgSoilEl.textContent = avgSoil;
        this.updateWaterChart(avgWater); this.updateSoilChart(avgSoil); this.updateCropChart(cropCounts, totalCells); this.updateGrowthChart(growthStages, plotsWithCrops); this.updateFinancialSummary(projectedIncome, potentialIncome);
    }

    // --- Chart Update Methods ---
    updateWaterChart(avgWater) { this._updateSingleBarChart('water-chart', avgWater); }
    updateSoilChart(avgSoil) { this._updateSingleBarChart('soil-chart', avgSoil, ['#cc9966', '#aa8855', '#886644']); }
    _updateSingleBarChart(chartId, value, colors = ['#ff6666', '#ffcc66', '#66cc66']) {
         const chart = document.getElementById(chartId); if (!chart) return; chart.innerHTML = ''; const barHeight = Math.min(100, Math.max(0, value)) * 1.5; let barColor = colors[2]; if (value < 33) barColor = colors[0]; else if (value < 67) barColor = colors[1]; const bar = document.createElement('div'); bar.className = 'chart-bar'; bar.style.setProperty('--bar-width', '50%'); bar.style.setProperty('--bar-color', barColor); bar.style.height = `${barHeight}px`; bar.style.left = '25%'; chart.appendChild(bar);
    }
    updateCropChart(cropCounts, totalCells) {
         const chart = document.getElementById('crop-distribution'); if (!chart) return; chart.innerHTML = ''; const emptyCells = totalCells - Object.values(cropCounts).reduce((sum, count) => sum + count, 0); if (emptyCells >= 0) cropCounts['empty'] = emptyCells; const cropIds = Object.keys(cropCounts); if (cropIds.length === 0) { chart.innerHTML = '<div class="no-data">No Plots</div>'; return; } const barWidth = 100 / cropIds.length; cropIds.forEach((cropId, index) => { const count = cropCounts[cropId]; const percentage = totalCells > 0 ? (count / totalCells) * 100 : 0; const barHeight = Math.min(100, percentage) * 1.5; const cropData = getCropById(cropId); const barColor = cropData?.color || '#cccccc'; const bar = document.createElement('div'); bar.className = 'chart-bar'; bar.style.setProperty('--bar-width', `${barWidth}%`); bar.style.setProperty('--bar-color', barColor); bar.style.height = `${barHeight}px`; bar.style.left = `${index * barWidth}%`; bar.title = `${cropData?.name || 'Unknown'}: ${count} (${percentage.toFixed(1)}%)`; chart.appendChild(bar); const label = document.createElement('div'); label.className = 'bar-label'; label.textContent = cropData?.name?.substring(0, 3) || '???'; label.style.left = `${index * barWidth + barWidth / 2}%`; chart.appendChild(label); });
     }
     updateGrowthChart(growthStages, plotsWithCrops) {
          const chart = document.getElementById('growth-chart'); if (!chart) return; chart.innerHTML = ''; if (plotsWithCrops === 0) { chart.innerHTML = '<div class="no-data">No Crops</div>'; return; } const stages = Object.keys(growthStages); const barWidth = 100 / stages.length; const colors = { 'early': '#ccffcc', 'middle': '#66cc66', 'late': '#339933', 'ready': '#e76f51' }; stages.forEach((stage, index) => { const count = growthStages[stage]; const percentage = plotsWithCrops > 0 ? (count / plotsWithCrops) * 100 : 0; const barHeight = Math.min(100, percentage) * 1.5; const barColor = colors[stage] || '#cccccc'; const bar = document.createElement('div'); bar.className = 'chart-bar'; bar.style.setProperty('--bar-width', `${barWidth}%`); bar.style.setProperty('--bar-color', barColor); bar.style.height = `${barHeight}px`; bar.style.left = `${index * barWidth}%`; bar.title = `${stage}: ${count} (${percentage.toFixed(1)}%)`; chart.appendChild(bar); const label = document.createElement('div'); label.className = 'bar-label'; label.textContent = stage.charAt(0).toUpperCase() + stage.slice(1); label.style.left = `${index * barWidth + barWidth / 2}%`; chart.appendChild(label); });
      }
     updateFinancialSummary(projectedIncome, potentialIncome) {
        const dailyExpense = this.game.dailyOverheadCost; const dailyExpEl = document.getElementById('daily-expenses'); const potentialIncEl = document.getElementById('season-income'); const projectedIncEl = document.getElementById('projected-income'); if (dailyExpEl) dailyExpEl.textContent = formatCurrency(dailyExpense); if (potentialIncEl) potentialIncEl.textContent = formatCurrency(potentialIncome); if (projectedIncEl) projectedIncEl.textContent = formatCurrency(projectedIncome);
     }


    // --- DISPLAY METHODS ---
    showCellInfo(row, col) {
        const cell = this.game.grid[row][col]; const cellInfo = document.getElementById('cell-info'); const cellDetails = document.getElementById('cell-details'); const cropOptions = document.getElementById('crop-options'); if(!cellInfo || !cellDetails || !cropOptions) return;
        cellDetails.innerHTML = `<div class="stat"><span>Plot:</span><span class="stat-value">${String.fromCharCode(65 + col)}${row + 1}</span></div> <div class="stat"><span>Crop:</span><span class="stat-value">${cell.crop.name}</span></div> <div class="stat"><span>Water:</span><span class="stat-value">${cell.waterLevel.toFixed(0)}%</span></div> <div class="stat"><span>Soil:</span><span class="stat-value">${cell.soilHealth.toFixed(0)}%</span></div>`;
        if (cell.crop.id !== 'empty') {
            cellDetails.innerHTML += `<div class="stat"><span>Growth:</span><span class="stat-value">${Math.floor(cell.growthProgress)}%</span></div> <div class="progress-bar" title="Growth Progress"><div class="progress-fill" style="width: ${cell.growthProgress}%; background-color: ${cell.harvestReady ? 'var(--danger-color)' : 'var(--success-color)'};"></div></div> <div class="stat"><span>Expected Yield:</span><span class="stat-value">${cell.expectedYield.toFixed(0)}%</span></div>`;
            cropOptions.innerHTML = ''; cropOptions.style.display = 'none';
        } else {
            cropOptions.innerHTML = '<h3>Plant Crop</h3>';
            crops.forEach(crop => { if (crop.id !== 'empty') { const costToPlant = formatCurrency(Math.round(crop.basePrice * this.game.plantingCostFactor)); cropOptions.innerHTML += `<div class="crop-option"><input type="radio" id="crop-${crop.id}-${row}-${col}" name="crop-select-${row}-${col}" value="${crop.id}"><label for="crop-${crop.id}-${row}-${col}">${crop.name} (${costToPlant})</label></div>`; } });
            cropOptions.innerHTML += `<button id="plant-btn-${row}-${col}" class="btn">Plant</button>`;
            const plantBtn = document.getElementById(`plant-btn-${row}-${col}`);
            if (plantBtn) {
                const newPlantBtn = plantBtn.cloneNode(true); plantBtn.parentNode.replaceChild(newPlantBtn, plantBtn);
                newPlantBtn.addEventListener('click', () => { const selectedCrop = document.querySelector(`input[name="crop-select-${row}-${col}"]:checked`); if (selectedCrop) { const cropId = selectedCrop.value; const success = this.game.plantCrop(row, col, cropId); if (success) { this.lastAction = { type: 'plant', params: { row, col, cropId } }; this.showCellInfo(row, col); this.updateHUD(); } } });
            }
            cropOptions.style.display = 'block';
        }
        const irrigateBtn = document.getElementById('irrigate-btn'); const fertilizeBtn = document.getElementById('fertilize-btn'); const harvestBtn = document.getElementById('harvest-btn');
        if(irrigateBtn) irrigateBtn.disabled = cell.irrigated || cell.crop.id === 'empty'; if(fertilizeBtn) fertilizeBtn.disabled = cell.fertilized || cell.crop.id === 'empty'; if(harvestBtn) harvestBtn.disabled = !cell.harvestReady;
        cellInfo.style.display = 'block';
    }

    showTooltip(x, y, row, col) {
        const tooltip = document.getElementById('tooltip'); if (!tooltip) return; const cell = this.game.grid[row][col];
        let content = `<div><strong>Plot: ${String.fromCharCode(65 + col)}${row + 1}</strong></div><div>Crop: ${cell.crop.name}</div><div>Water: ${cell.waterLevel.toFixed(0)}%</div><div>Soil: ${cell.soilHealth.toFixed(0)}%</div>`;
        if (cell.crop.id !== 'empty') { content += `<div>Growth: ${Math.floor(cell.growthProgress)}%</div><div>Yield: ${cell.expectedYield.toFixed(0)}%</div>`; if (cell.harvestReady) { content += `<div style="color: var(--danger-color); font-weight: bold;">Ready to Harvest!</div>`; } } else { content += `<div>Empty Plot</div>`; }
        tooltip.innerHTML = content; const tooltipRect = tooltip.getBoundingClientRect(); let left = x + 15; let top = y + 15;
        if (left + tooltipRect.width > window.innerWidth) { left = x - tooltipRect.width - 15; } if (top + tooltipRect.height > window.innerHeight) { top = y - tooltipRect.height - 15; }
        tooltip.style.left = `${left}px`; tooltip.style.top = `${top}px`; tooltip.style.visibility = 'visible'; tooltip.style.opacity = '1';
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip'); if(tooltip) { tooltip.style.visibility = 'hidden'; tooltip.style.opacity = '0'; }
    }

    showResearchModal() {
        const researchOptions = document.getElementById('research-options'); if (!researchOptions) return; researchOptions.innerHTML = '';
        this.game.technologies.forEach(tech => {
            const prereqsMet = checkTechPrerequisites(tech, this.game.researchedTechs);
            const techCost = this.game.getTechnologyCost ? this.game.getTechnologyCost(tech.id) : tech.cost;
            const canAfford = this.game.balance >= techCost;
            const isAvailable = prereqsMet && canAfford;
            let statusClass = ''; let statusText = '';
            if (tech.researched) { statusClass = 'researched'; statusText = '<span class="badge success">Researched</span>'; }
            else if (!prereqsMet) { statusClass = 'unavailable'; statusText = '<span class="badge warning">Requires Prereqs</span>'; }
            else if (!canAfford) { statusClass = 'unavailable'; statusText = '<span class="badge danger">Cannot Afford</span>'; }
            else { statusClass = 'available'; }
            const prereqNames = tech.prerequisites.map(pId => { const prereqTech = this.game.technologies.find(t => t.id === pId); return prereqTech ? prereqTech.name : pId; }).join(', ');
            researchOptions.innerHTML += `<div class="tech-item ${statusClass}" data-tech-id="${tech.id}" title="${tech.description}"><div class="tech-name">${tech.name} ${statusText}</div><div class="tech-cost">Cost: ${formatCurrency(techCost)}</div>${prereqNames.length > 0 ? `<div class="tech-prereq">Requires: ${prereqNames}</div>` : ''}</div>`;
        });
        researchOptions.onclick = (event) => {
            const techItem = event.target.closest('.tech-item');
            if (techItem && techItem.classList.contains('available') && !techItem.classList.contains('researched')) {
                const techId = techItem.dataset.techId; console.log(`[UI] Attempting research via click: ${techId}`); const success = this.game.researchTechnology(techId);
                if (success) { this._closeModal(document.getElementById('research-modal')); this.updateTechList(); this.updateHUD(); }
                else { this.showResearchModal(); }
            }
        };
        const researchModal = document.getElementById('research-modal'); if (researchModal) researchModal.style.display = 'flex';
    }

    showMarketModal() {
        const marketInfo = document.getElementById('market-info'); if (!marketInfo) return;
        marketInfo.innerHTML = `<p>Current market prices (relative to base):</p><div class="market-prices">${crops.filter(c => c.id !== 'empty').map(crop => `<div class="stat"><span>${crop.name}:</span><span class="stat-value">${Math.round((this.game.marketPrices[crop.id] || 1.0) * 100)}%</span></div>`).join('')}</div>`;
        const marketModal = document.getElementById('market-modal'); if(marketModal) marketModal.style.display = 'flex';
    }

    // --- RENDERING ---
    render() {
        if (!this.ctx || !this.game?.grid || this.cellSize <= 0 || this.game.gridSize <= 0) { console.warn(`Render skipped due to invalid state: ctx=${!!this.ctx}, grid=${!!this.game?.grid}, cellSize=${this.cellSize}, gridSize=${this.game?.gridSize}`); if (this.ctx && this.canvas) { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.ctx.fillStyle = '#ccc'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); this.ctx.fillStyle = '#000'; this.ctx.font = '16px Arial'; this.ctx.textAlign = 'center'; this.ctx.fillText('Loading Grid...', this.canvas.width / 2, this.canvas.height / 2); } return; }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); const gridWidth = this.cellSize * this.game.gridSize; const gridHeight = this.cellSize * this.game.gridSize; if (gridWidth <= 0 || gridHeight <= 0) return;
        const offsetX = (this.canvas.width - gridWidth) / 2; const offsetY = (this.canvas.height - gridHeight) / 2;
        for (let row = 0; row < this.game.gridSize; row++) { for (let col = 0; col < this.game.gridSize; col++) { const x = offsetX + col * this.cellSize; const y = offsetY + row * this.cellSize; this.drawCell(x, y, row, col); } }
        this._updateSelectorPositions(offsetX, offsetY);
    }

    drawCell(x, y, row, col) {
        const cell = this.game.grid[row][col]; let fillColor;
        switch (this.game.currentOverlay) { case 'crop': fillColor = cell.crop.color; break; case 'water': if (cell.waterLevel < 33) fillColor = '#ff6666'; else if (cell.waterLevel < 67) fillColor = '#ffcc66'; else fillColor = '#66cc66'; break; case 'soil': if (cell.soilHealth < 33) fillColor = '#cc9966'; else if (cell.soilHealth < 67) fillColor = '#aa8855'; else fillColor = '#886644'; break; case 'yield': if (cell.crop.id === 'empty') fillColor = '#e9e9e9'; else if (cell.expectedYield < 50) fillColor = '#ffaaaa'; else if (cell.expectedYield <= 100) fillColor = '#ffffaa'; else fillColor = '#aaffaa'; break; default: fillColor = cell.crop.color || '#ffffff'; }
        this.ctx.fillStyle = fillColor; this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        const isSingleSelected = this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col; const isMultiSelected = this.selectedCells.some(sc => sc.row === row && sc.col === col);
        if (isSingleSelected) { this.ctx.strokeStyle = 'blue'; this.ctx.lineWidth = 3; } else if (isMultiSelected) { this.ctx.strokeStyle = 'orange'; this.ctx.lineWidth = 2; } else { this.ctx.strokeStyle = '#ccc'; this.ctx.lineWidth = 0.5; } this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
        if (cell.crop.id !== 'empty') { this.ctx.fillStyle = '#000'; this.ctx.font = `${Math.max(8, this.cellSize * 0.3)}px Arial`; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillText(cell.crop.name.charAt(0).toUpperCase(), x + this.cellSize / 2, y + this.cellSize / 2); if (cell.harvestReady) { this.ctx.fillStyle = 'rgba(255, 0, 255, 0.8)'; this.ctx.beginPath(); const radius = Math.max(2, this.cellSize * 0.1); this.ctx.arc(x + this.cellSize - radius - 2, y + radius + 2, radius, 0, Math.PI * 2); this.ctx.fill(); } }
    }

    // --- HELPER METHODS ---
    _getCanvasClickCoords(event) {
        if (!this.canvas || !this.game || this.cellSize <= 0 || this.game.gridSize <= 0) { console.warn(`_getCanvasClickCoords called with invalid state: cellSize=${this.cellSize}, gridSize=${this.game?.gridSize}`); return { row: -1, col: -1 }; }
        const rect = this.canvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const gridWidth = this.cellSize * this.game.gridSize; const gridHeight = this.cellSize * this.game.gridSize; const offsetX = (this.canvas.width - gridWidth) / 2; const offsetY = (this.canvas.height - gridHeight) / 2; if (isNaN(offsetX) || isNaN(offsetY)) { console.warn(`_getCanvasClickCoords calculated NaN offset: canvasW=${this.canvas.width}, canvasH=${this.canvas.height}, gridW=${gridWidth}, gridH=${gridHeight}`); return { row: -1, col: -1 }; }
        if (x < offsetX || x > offsetX + gridWidth || y < offsetY || y > offsetY + gridHeight) { return { row: -1, col: -1 }; } const col = Math.floor((x - offsetX) / this.cellSize); const row = Math.floor((y - offsetY) / this.cellSize); if (row >= 0 && row < this.game.gridSize && col >= 0 && col < this.game.gridSize) { return { row, col }; } else { return { row: -1, col: -1 }; }
    }

    _closeModal(modalElement) {
        if (modalElement) { modalElement.style.display = 'none'; if (modalElement.id === 'research-modal') this.isResearchModalOpen = false; if (modalElement.id === 'market-modal') this.isMarketModalOpen = false; }
    }

    _handleCellAction(actionType, gameMethod) {
         if (this.selectedCell && typeof gameMethod === 'function') {
             const result = gameMethod.call(this.game, this.selectedCell.row, this.selectedCell.col);
             if ((typeof result === 'boolean' && result) || (typeof result === 'object' && result.success)) {
                 this.lastAction = { type: actionType, params: { row: this.selectedCell.row, col: this.selectedCell.col } };
                 this.showCellInfo(this.selectedCell.row, this.selectedCell.col);
                 if (actionType === 'harvest' || actionType === 'plant') { this.updateHUD(); }
             }
         } else if (!this.selectedCell) { console.warn("No cell selected for action:", actionType); }
           else { console.error("Game method for action", actionType, "is not valid."); }
    }

    _updateSelectorPositions(offsetX, offsetY) {
        const rowSelectors = this.canvas.parentElement?.querySelector('.row-selectors');
        const colSelectors = this.canvas.parentElement?.querySelector('.column-selectors');
        if (!rowSelectors || !colSelectors || this.cellSize <= 0 || this.game.gridSize <= 0) return; // Guard clause
        const gridHeight = this.cellSize * this.game.gridSize; const gridWidth = this.cellSize * this.game.gridSize;
        rowSelectors.style.left = `${offsetX - 25}px`; rowSelectors.style.top = `${offsetY + gridHeight / 2}px`;
        colSelectors.style.top = `${offsetY - 25}px`; colSelectors.style.left = `${offsetX + gridWidth / 2}px`;
    }

    // --- SELECTION & BULK ACTION METHODS ---
    selectCell(row, col) { if (this.selectionMode !== 'single') { this.clearSelection(); this.selectionMode = 'single'; } this.selectedCell = { row, col }; this.showCellInfo(row, col); this.closeBulkActionPanel(); this.render(); }
    toggleCellInSelection(row, col) { if (this.selectionMode !== 'multi') { this.clearSelection(); this.selectionMode = 'multi'; } const cellIndex = this.selectedCells.findIndex(cell => cell.row === row && cell.col === col); if (cellIndex >= 0) { this.selectedCells.splice(cellIndex, 1); } else { this.selectedCells.push({ row, col }); } this.updateBulkActionPanel(); this.render(); }
    selectRow(row) { this.clearSelection(); this.selectionMode = 'multi'; for (let col = 0; col < this.game.gridSize; col++) { this.selectedCells.push({ row, col }); } this.showBulkActionPanel(); this.render(); }
    selectColumn(col) { this.clearSelection(); this.selectionMode = 'multi'; for (let row = 0; row < this.game.gridSize; row++) { this.selectedCells.push({ row, col }); } this.showBulkActionPanel(); this.render(); }
    selectAll() { this.clearSelection(); this.selectionMode = 'multi'; for (let row = 0; row < this.game.gridSize; row++) { for (let col = 0; col < this.game.gridSize; col++) { this.selectedCells.push({ row, col }); } } this.showBulkActionPanel(); this.render(); console.log("All cells selected."); }
    clearSelection() { this.selectedCell = null; this.selectedCells = []; this.render(); }
    toggleSelectionMode() { if (this.selectionMode === 'single') { this.selectionMode = 'multi'; if (this.selectedCell) { this.selectedCells = [{ ...this.selectedCell }]; this.selectedCell = null; this.showBulkActionPanel(); } } else { this.selectionMode = 'single'; this.clearSelection(); this.closeBulkActionPanel(); } this.render(); }
    showBulkActionPanel() { const panel = document.getElementById('bulk-action-panel'); if (panel) { panel.classList.add('visible'); const countSpan = document.getElementById('selected-count'); if (countSpan) countSpan.textContent = this.selectedCells.length; } }
    closeBulkActionPanel() { const panel = document.getElementById('bulk-action-panel'); if (panel) { panel.classList.remove('visible'); const plantOptions = document.getElementById('bulk-plant-options'); if (plantOptions) plantOptions.style.display = 'none'; } }
    updateBulkActionPanel() { const countSpan = document.getElementById('selected-count'); if (countSpan) countSpan.textContent = this.selectedCells.length; if (this.selectedCells.length > 0) { this.showBulkActionPanel(); } else { this.closeBulkActionPanel(); } }
    showBulkPlantOptions() { const options = document.getElementById('bulk-plant-options'); const cropOptionsDiv = document.getElementById('bulk-crop-options'); if (!options || !cropOptionsDiv) return; options.style.display = 'block'; cropOptionsDiv.innerHTML = ''; crops.forEach(crop => { if (crop.id !== 'empty') { const costToPlant = formatCurrency(Math.round(crop.basePrice * this.game.plantingCostFactor)); cropOptionsDiv.innerHTML += `<div class="crop-option"><input type="radio" id="bulk-crop-${crop.id}" name="bulk-crop-select" value="${crop.id}"><label for="bulk-crop-${crop.id}">${crop.name} (${costToPlant})</label></div>`; } }); }
    
    _performBulkAction(actionType, gameMethod, eventVerb) {
        console.log(`[UI Debug] Performing bulk action: ${actionType}`);
        if (this.selectedCells.length === 0 || this.isBulkActionInProgress) {
             console.log(`[UI Debug] Bulk action ${actionType} aborted (No selection or already in progress).`);
             return; // Exit early
        }

        let successCount = 0;
        let costTotal = 0;
        let incomeTotal = 0;
        this.isBulkActionInProgress = true; // Lock UI during processing

        // Log balance BEFORE the loop starts
        console.log(`[UI Debug] Balance BEFORE bulk ${actionType}: ${formatCurrency(this.game.balance)}`);
        console.log(`[UI Debug] Starting loop for ${this.selectedCells.length} cells.`);

        // Create a temporary copy of selected cells in case the original array is modified during iteration (unlikely here but safer)
        const cellsToProcess = [...this.selectedCells];

        for (const cellCoord of cellsToProcess) {
            console.log(`[UI Debug] Attempting ${actionType} on cell: (${cellCoord.row}, ${cellCoord.col})`);

            // Ensure gameMethod exists before calling
            if (typeof gameMethod !== 'function') {
                 console.error(`[UI Debug] Error: gameMethod for action ${actionType} is not a function on game object.`);
                 continue; // Skip this cell if method is invalid
            }

            // Call the actual game logic method (e.g., game.irrigateCell, game.harvestCell)
            const result = gameMethod.call(this.game, cellCoord.row, cellCoord.col);
            console.log(`[UI Debug] Result for cell (${cellCoord.row},${cellCoord.col}):`, JSON.stringify(result)); // Log the result object

            // Process the result
            if (typeof result === 'boolean' && result) { // Simple success
                successCount++;
                // Estimate cost if not returned (less accurate but provides some feedback)
                 if (actionType === 'irrigate') costTotal += this.game.irrigationCost;
                 if (actionType === 'fertilize') costTotal += this.game.fertilizeCost;
                 console.log(`[UI Debug] Simple success on cell (${cellCoord.row},${cellCoord.col})`);
            } else if (typeof result === 'object' && result.success) { // Object with success property
                 console.log(`[UI Debug] Success on cell (${cellCoord.row},${cellCoord.col}), Income: ${result.income || 0}, Cost: ${result.cost || 0}`);
                successCount++;
                if (result.cost) costTotal += Number(result.cost) || 0; // Ensure cost is numeric
                if (result.income) incomeTotal += Number(result.income) || 0; // Ensure income is numeric
            } else { // Action failed or cell was ineligible
                 console.log(`[UI Debug] Action failed or ineligible for cell (${cellCoord.row},${cellCoord.col}). Reason:`, result?.reason || 'N/A');
            }
        } // End of loop

        console.log(`[UI Debug] Loop finished. Success count: ${successCount}, Total Income (from results): ${incomeTotal}, Total Cost (from results): ${costTotal}`);

        // Log balance AFTER the loop finishes (reflects changes made *inside* game methods)
        console.log(`[UI Debug] Balance AFTER bulk ${actionType} loop: ${formatCurrency(this.game.balance)}`);

        this.isBulkActionInProgress = false; // Unlock UI

        // Add summary event and update UI if any action succeeded
        if (successCount > 0) {
            console.log(`[UI Debug] Action successful for ${successCount} plots. Adding event and ensuring final HUD update.`);
            // Set last action (important: use a copy of the cells used in *this* action)
            this.lastAction = { type: `bulk${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`, params: { cells: cellsToProcess } };

            // Build event message
            let eventMsg = `Bulk ${eventVerb} ${successCount} plots.`;
             if (costTotal > 0) { // Use cost calculated from results if available
                 eventMsg += ` Total cost: ${formatCurrency(costTotal)}.`;
             } else if (actionType === 'irrigate' && successCount > 0) { // Fallback estimate for irrigate
                 eventMsg += ` Total cost approx: ${formatCurrency(successCount * this.game.irrigationCost)}.`;
             } else if (actionType === 'fertilize' && successCount > 0) { // Fallback estimate for fertilize
                 eventMsg += ` Total cost approx: ${formatCurrency(successCount * this.game.fertilizeCost)}.`;
             }
            // Add income specifically for harvest
            if (incomeTotal > 0 && actionType === 'harvest') {
                eventMsg += ` Total income: ${formatCurrency(incomeTotal)}.`;
            }

            // Add event to game log and update UI event list
            if (typeof this.game.addEvent === 'function') {
                 this.game.addEvent(eventMsg); // Let game handle adding to its list
                 this.updateEventsList(); // Tell UI to refresh the list display
            } else { console.warn("game.addEvent method not found"); }

            // Final HUD update AFTER all processing
            this.updateHUD();
             console.log(`[UI Debug] Balance immediately AFTER final updateHUD() call: ${formatCurrency(this.game.balance)}`);
        } else {
            // Log failure case
            console.log(`[UI Debug] No successful actions. Adding 'no eligible plots' event.`);
            if (typeof this.game.addEvent === 'function') {
                 this.game.addEvent(`Bulk ${eventVerb}: No eligible plots found in selection.`, true);
                 this.updateEventsList(); // Update list even on failure message
            }
        }

        this.render(); // Final grid render
    } // End _performBulkAction
    
    bulkIrrigate() { this._performBulkAction('irrigate', this.game.irrigateCell, 'irrigate'); }
    bulkFertilize() { this._performBulkAction('fertilize', this.game.fertilizeCell, 'fertilize'); }
    bulkHarvest() { this._performBulkAction('harvest', this.game.harvestCell, 'harvest'); }
    bulkPlant() { if (this.selectedCells.length === 0 || this.isBulkActionInProgress) return; const selectedCropInput = document.querySelector('input[name="bulk-crop-select"]:checked'); if (!selectedCropInput) { this.game.addEvent('No crop selected for bulk planting.', true); return; } const cropId = selectedCropInput.value; const crop = getCropById(cropId); if (!crop) { this.game.addEvent(`Invalid crop ID selected: ${cropId}`, true); return; } let successCount = 0; let costTotal = 0; this.isBulkActionInProgress = true; for (const cellCoord of this.selectedCells) { const plantingCost = Math.round(crop.basePrice * this.game.plantingCostFactor); if (this.game.plantCrop(cellCoord.row, cellCoord.col, cropId)) { successCount++; costTotal += plantingCost; } } this.isBulkActionInProgress = false; if (successCount > 0) { this.lastAction = { type: 'bulkPlant', params: { cells: [...this.selectedCells], cropId: cropId } }; this.game.addEvent(`Bulk planted ${successCount} plots with ${crop.name}. Cost: ${formatCurrency(costTotal)}.`); this.updateHUD(); } else { this.game.addEvent(`Bulk plant ${crop.name}: No empty/affordable plots in selection.`, true); } this.closeBulkActionPanel(); this.render(); }
    repeatLastAction() { if (!this.lastAction || this.isBulkActionInProgress) { if (!this.lastAction) this.game.addEvent('No previous action to repeat.', true); return; } console.log("Repeating last action:", this.lastAction); try { switch (this.lastAction.type) { case 'irrigate': if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) { this.game.irrigateCell(this.lastAction.params.row, this.lastAction.params.col); } break; case 'fertilize': if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) { this.game.fertilizeCell(this.lastAction.params.row, this.lastAction.params.col); } break; case 'harvest': if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) { this.game.harvestCell(this.lastAction.params.row, this.lastAction.params.col); this.updateHUD(); } break; case 'plant': if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined && this.lastAction.params?.cropId) { this.game.plantCrop(this.lastAction.params.row, this.lastAction.params.col, this.lastAction.params.cropId); this.updateHUD(); } break; case 'bulkIrrigate': if (this.lastAction.params?.cells?.length > 0) { this.selectedCells = [...this.lastAction.params.cells]; this.selectionMode = 'multi'; this.bulkIrrigate(); } break; case 'bulkFertilize': if (this.lastAction.params?.cells?.length > 0) { this.selectedCells = [...this.lastAction.params.cells]; this.selectionMode = 'multi'; this.bulkFertilize(); } break; case 'bulkHarvest': if (this.lastAction.params?.cells?.length > 0) { this.selectedCells = [...this.lastAction.params.cells]; this.selectionMode = 'multi'; this.bulkHarvest(); } break; case 'bulkPlant': if (this.lastAction.params?.cells?.length > 0 && this.lastAction.params?.cropId) { this.selectedCells = [...this.lastAction.params.cells]; this.selectionMode = 'multi'; const cropRadio = document.querySelector(`input[name="bulk-crop-select"][value="${this.lastAction.params.cropId}"]`); if (cropRadio) { cropRadio.checked = true; this.bulkPlant(); } else { this.showBulkActionPanel(); this.showBulkPlantOptions(); const radioToSelect = document.getElementById(`bulk-crop-${this.lastAction.params.cropId}`); if(radioToSelect) radioToSelect.checked = true; this.game.addEvent(`Select crop again to repeat bulk plant ${getCropById(this.lastAction.params.cropId)?.name || ''}.`, true) } } break; default: console.warn("Unknown last action type:", this.lastAction.type); this.game.addEvent('Could not repeat last action.', true); break; } } catch (error) { console.error("Error repeating last action:", error); this.game.addEvent('Error trying to repeat action.', true); } this.render(); }

    // --- Advisor/Message Methods ---
    showGameMessage(title, message, type = 'info') { if(typeof this.game.addEvent === 'function') this.game.addEvent(message, type === 'danger' || type === 'warning'); }
    showAdvisorPopup(title, text) { const advisorPlaceholder = document.querySelector('.advisor-placeholder'); if (advisorPlaceholder) { const header = advisorPlaceholder.querySelector('h3'); advisorPlaceholder.innerHTML = ''; if(header) advisorPlaceholder.appendChild(header); const p = document.createElement('p'); p.innerHTML = `<strong>${title}:</strong> ${text}`; advisorPlaceholder.appendChild(p); } else { console.log(`ADVISOR [${title}]: ${text}`); } }

} // End of UIManager class
