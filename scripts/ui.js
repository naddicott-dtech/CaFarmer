/**
 * California Climate Farmer - UI Manager (Restored Missing Methods)
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
        this.cellSize = 40;

        // Initialize UI components
        this.setupCanvasSize();
        this.setupDashboard();
        this.setupEventListeners(); // This will now call methods that exist
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
        // ... (Implementation from previous step) ...
        const calculateSize = () => {
            const container = this.canvas.parentElement;
            if (!container || container.clientWidth === 0 || container.clientHeight === 0) { console.warn("Canvas container not ready for size calculation."); return; }
            const width = container.clientWidth; const height = Math.max(container.clientHeight, 100);
            this.canvas.width = width; this.canvas.height = height;
             if (this.game.gridSize && this.game.gridSize > 0) { this.cellSize = Math.min(width / this.game.gridSize, height / this.game.gridSize) * 0.95; }
             else { console.warn("Grid size not available during canvas size calculation."); this.cellSize = 40; }
             console.log(`Canvas resized: ${width}x${height}, CellSize: ${this.cellSize}`); this.render();
        };
        calculateSize(); window.addEventListener('resize', calculateSize);
    }

    setupDashboard() {
        // ... (Implementation from previous step) ...
        if (document.getElementById('farm-dashboard')) return; const dashboardContainer = document.createElement('div'); dashboardContainer.id = 'farm-dashboard'; dashboardContainer.className = 'farm-dashboard'; const sidebar = document.querySelector('.sidebar'); if (sidebar?.parentNode) { sidebar.parentNode.insertBefore(dashboardContainer, sidebar); } else { console.error("Sidebar not found for dashboard insertion."); document.body.appendChild(dashboardContainer); }
        dashboardContainer.innerHTML = `<div class="dashboard-header"><h2>Farm Dashboard</h2><button id="refresh-dashboard" class="btn">Refresh</button></div><div class="dashboard-grid"><div class="dashboard-card"><h3>Water Status</h3><div id="water-chart" class="dashboard-chart"><div class="no-data">N/A</div></div><div class="dashboard-stat">Average: <span id="avg-water">0</span>%</div></div><div class="dashboard-card"><h3>Soil Health</h3><div id="soil-chart" class="dashboard-chart"><div class="no-data">N/A</div></div><div class="dashboard-stat">Average: <span id="avg-soil">0</span>%</div></div><div class="dashboard-card"><h3>Crop Distribution</h3><div id="crop-distribution" class="dashboard-chart"><div class="no-data">N/A</div></div></div><div class="dashboard-card"><h3>Growth Stages</h3><div id="growth-chart" class="dashboard-chart"><div class="no-data">N/A</div></div></div></div><div class="dashboard-row"><div class="dashboard-card wide"><h3>Financial Summary</h3><div class="financial-stats"><div class="financial-stat"><span>Daily Overhead:</span><span id="daily-expenses">$0</span></div><div class="financial-stat"><span>Ready Income:</span><span id="projected-income">$0</span></div><div class="financial-stat"><span>Potential Income:</span><span id="season-income">$0</span></div></div></div></div>`;
        const refreshBtn = document.getElementById('refresh-dashboard'); if (refreshBtn) { refreshBtn.addEventListener('click', () => this.updateDashboard()); } if (!document.getElementById('dashboard-styles')) { this.addDashboardStyles(); }
    }

    addDashboardStyles() {
        // ... (Keep CSS content from previous step) ...
        const style = document.createElement('style'); style.id = 'dashboard-styles'; style.textContent = ` .farm-dashboard { display: none; } .dashboard-visible .farm-dashboard { display: block; } .farm-dashboard { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 1rem; margin-bottom: 1rem; overflow: auto; } .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; } .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; } .dashboard-row { display: flex; gap: 1rem; margin-bottom: 1rem; } .dashboard-card { background: #f9f9f9; border-radius: 6px; padding: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); } .dashboard-card h3 { margin-top: 0; margin-bottom: 0.5rem; font-size: 1.1rem; color: var(--dark-color); } .dashboard-card.wide { flex: 1; } .dashboard-chart { height: 150px; margin: 0.5rem 0; background: #f0f0f0; border-radius: 4px; position: relative; overflow: hidden; } .dashboard-stat { font-size: 0.9rem; color: #555; text-align: center; margin-top: 0.5rem; } .dashboard-stat span { font-weight: bold; color: var(--text-color); } .no-data { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #999; font-style: italic; } .chart-bar { position: absolute; bottom: 0; background: var(--bar-color, #2a9d8f); transition: height 0.3s ease; border-top-left-radius: 3px; border-top-right-radius: 3px;} .bar-label { position: absolute; transform: translateX(-50%); font-size: 0.7rem; color: #666; bottom: 2px; text-align: center; z-index: 1; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;} .financial-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-top: 0.5rem; } .financial-stat { padding: 0.8rem; background: #e9ecef; border-radius: 4px; text-align: center; } .financial-stat span:first-child { display: block; font-size: 0.8rem; color: #6c757d; margin-bottom: 0.3rem; } .financial-stat span:last-child { font-size: 1.1rem; font-weight: bold; color: #212529; } @media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } .dashboard-row { flex-direction: column; } .financial-stats { grid-template-columns: 1fr; } .dashboard-chart { height: 120px; } } .row-selectors, .column-selectors { position: absolute; display: flex; z-index: 50; } .row-selectors { flex-direction: column; left: 5px; top: 50%; transform: translateY(-50%); } .column-selectors { flex-direction: row; top: 5px; left: 50%; transform: translateX(-50%); } .selector-btn { background: rgba(42, 157, 143, 0.7); color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 1px; border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: bold; border: none; line-height: 1; } .selector-btn:hover { background: rgba(42, 157, 143, 1); } .selector-btn.active { background: var(--danger-color); } .bulk-action-panel { display: none; position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); background: white; padding: 0.8rem; border-radius: 6px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); z-index: 100; } .bulk-action-panel.visible { display: block; } .bulk-action-panel h3 { margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem; } .bulk-action-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; } #bulk-plant-options { display: none; margin-top: 0.5rem; } #bulk-plant-options .crop-selection { max-height: 100px; overflow-y: auto; margin-bottom: 0.5rem; border: 1px solid #eee; padding: 0.3rem;} #bulk-plant-options .crop-option label { font-size: 0.9rem; } .hotkey-info { position: absolute; bottom: 5px; right: 5px; background: rgba(255, 255, 255, 0.8); padding: 0.4rem; border-radius: 4px; font-size: 0.75rem; z-index: 50; } .hotkey-item { margin-bottom: 0.15rem; } .hotkey-key { background: #e9ecef; border: 1px solid #ced4da; border-radius: 3px; padding: 0 4px; font-family: monospace; display: inline-block; min-width: 16px; text-align: center; } `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // ... (Keep implementation from previous step, calls below should now work) ...
         // Canvas click
        this.canvas.addEventListener('click', (e) => { if (this.isBulkActionInProgress) return; const { row, col } = this._getCanvasClickCoords(e); if (row !== -1) { if (this.selectionMode === 'single') this.selectCell(row, col); else this.toggleCellInSelection(row, col); } else { this.clearSelection(); this.closeBulkActionPanel(); } });
        // Canvas mousemove for tooltip
        this.canvas.addEventListener('mousemove', (e) => { const { row, col } = this._getCanvasClickCoords(e); if (row !== -1) this.showTooltip(e.clientX, e.clientY, row, col); else this.hideTooltip(); });
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
        document.getElementById('speed-slider')?.addEventListener('input', (e) => { this.game.setSpeed(parseInt(e.target.value)); document.getElementById('speed-value').textContent = `${this.game.speed}x`; });
        // Cell Info Panel Actions
         document.getElementById('close-cell-info')?.addEventListener('click', () => { document.getElementById('cell-info').style.display = 'none'; this.selectedCell = null; this.render(); });
         document.getElementById('irrigate-btn')?.addEventListener('click', () => this._handleCellAction('irrigate', this.game.irrigateCell));
         document.getElementById('fertilize-btn')?.addEventListener('click', () => this._handleCellAction('fertilize', this.game.fertilizeCell));
         document.getElementById('harvest-btn')?.addEventListener('click', () => this._handleCellAction('harvest', this.game.harvestCell));
         // Add other listeners
         this.addToggleDashboardButton();
         this.setupHotkeys();
         this.setupRowColumnSelectors();
    }

    addToggleDashboardButton() {
        // ... (Implementation from previous step) ...
        const btnGroup = document.querySelector('header .btn-group'); if (!document.getElementById('dashboard-btn') && btnGroup) { const dashboardBtn = document.createElement('button'); dashboardBtn.id = 'dashboard-btn'; dashboardBtn.className = 'btn secondary'; dashboardBtn.textContent = 'Dashboard'; btnGroup.appendChild(dashboardBtn); dashboardBtn.addEventListener('click', () => { const dashboardVisible = document.body.classList.toggle('dashboard-visible'); if (dashboardVisible) { this.updateDashboard(); } }); console.log("Dashboard toggle button added."); } else if (document.getElementById('dashboard-btn')) { console.log("Dashboard toggle button already exists."); } else { console.error("Could not find header button group to add dashboard toggle button."); }
    }

    setupHotkeys() {
        // ... (Implementation from previous step) ...
        document.addEventListener('keydown', (e) => { if (this.isResearchModalOpen || this.isMarketModalOpen || document.querySelector('.modal:not(#help-modal)[style*="display: flex"]')) return; if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return; if (e.key === 'Escape') { this.clearSelection(); this.closeBulkActionPanel(); const cellInfoPanel = document.getElementById('cell-info'); if(cellInfoPanel) cellInfoPanel.style.display = 'none'; this.selectedCell = null; this.render(); document.querySelectorAll('.modal:not(#help-modal)').forEach(modal => this._closeModal(modal)); return; } let actionTaken = false; switch(e.key.toLowerCase()) { case 'r': this.repeatLastAction(); actionTaken = true; break; case 'i': if (this.selectionMode === 'single' && this.selectedCell) { this._handleCellAction('irrigate', this.game.irrigateCell); } else if (this.selectedCells.length > 0) { this.bulkIrrigate(); } actionTaken = true; break; case 'f': if (this.selectionMode === 'single' && this.selectedCell) { this._handleCellAction('fertilize', this.game.fertilizeCell); } else if (this.selectedCells.length > 0) { this.bulkFertilize(); } actionTaken = true; break; case 'h': if (this.selectionMode === 'single' && this.selectedCell) { this._handleCellAction('harvest', this.game.harvestCell); } else if (this.selectedCells.length > 0) { this.bulkHarvest(); } actionTaken = true; break; case 'd': const dashboardVisible = document.body.classList.toggle('dashboard-visible'); if (dashboardVisible) { this.updateDashboard(); } actionTaken = true; break; case 'm': this.toggleSelectionMode(); actionTaken = true; break; } if (actionTaken && ['r', 'i', 'f', 'h', 'd', 'm'].includes(e.key.toLowerCase())) { e.preventDefault(); } }); console.log("Hotkey listeners set up."); if (!document.querySelector('.hotkey-info')) { this.addHotkeyInfoPanel(); }
    }

    addHotkeyInfoPanel() {
        // ... (Implementation from previous step) ...
        const hotkeyPanel = document.createElement('div'); hotkeyPanel.className = 'hotkey-info'; hotkeyPanel.innerHTML = `<div class="hotkey-item"><span class="hotkey-key">R</span> Repeat</div><div class="hotkey-item"><span class="hotkey-key">I</span> Irrigate</div><div class="hotkey-item"><span class="hotkey-key">F</span> Fertilize</div><div class="hotkey-item"><span class="hotkey-key">H</span> Harvest</div><div class="hotkey-item"><span class="hotkey-key">M</span> Sel. Mode</div><div class="hotkey-item"><span class="hotkey-key">D</span> Dashboard</div><div class="hotkey-item"><span class="hotkey-key">Esc</span> Clear/Close</div>`; const gridContainer = document.querySelector('.farm-grid-container'); if (gridContainer) { gridContainer.appendChild(hotkeyPanel); console.log("Hotkey info panel added."); } else { console.error("Cannot find grid container to append hotkey info panel."); }
    }

    setupRowColumnSelectors() {
        // ... (Implementation from previous step) ...
        const gridContainer = document.querySelector('.farm-grid-container'); if (!gridContainer) { console.error("Grid container not found for selectors."); return; } if (gridContainer.querySelector('.row-selectors')) return; const rowSelectors = document.createElement('div'); rowSelectors.className = 'row-selectors'; const columnSelectors = document.createElement('div'); columnSelectors.className = 'column-selectors'; for (let i = 0; i < this.game.gridSize; i++) { const rowBtn = document.createElement('button'); rowBtn.className = 'selector-btn row-selector'; rowBtn.textContent = (i + 1).toString(); rowBtn.dataset.row = i; rowBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectRow(i); }); rowSelectors.appendChild(rowBtn); const colBtn = document.createElement('button'); colBtn.className = 'selector-btn col-selector'; colBtn.textContent = String.fromCharCode(65 + i); colBtn.dataset.col = i; colBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectColumn(i); }); columnSelectors.appendChild(colBtn); } const selectAllBtn = document.createElement('button'); selectAllBtn.className = 'selector-btn select-all'; selectAllBtn.textContent = '✓'; selectAllBtn.title = 'Select All'; selectAllBtn.addEventListener('click', (e) => { e.stopPropagation(); this.selectAll(); }); columnSelectors.appendChild(selectAllBtn); gridContainer.appendChild(rowSelectors); gridContainer.appendChild(columnSelectors); console.log("Row/Column selectors added."); this.createBulkActionPanel();
    }

    createBulkActionPanel() {
        // ... (Implementation from previous step) ...
        const gridContainer = document.querySelector('.farm-grid-container'); if (!gridContainer || document.getElementById('bulk-action-panel')) return; const bulkPanel = document.createElement('div'); bulkPanel.className = 'bulk-action-panel'; bulkPanel.id = 'bulk-action-panel'; bulkPanel.innerHTML = `<h3>Bulk Actions (<span id="selected-count">0</span>)</h3><div class="bulk-action-buttons"><button id="bulk-irrigate" class="btn">Irrigate</button><button id="bulk-fertilize" class="btn">Fertilize</button><button id="bulk-harvest" class="btn">Harvest</button><button id="bulk-plant" class="btn">Plant...</button><button id="clear-selection" class="btn secondary">Clear</button></div><div id="bulk-plant-options"><div class="crop-selection"><div id="bulk-crop-options"></div><button id="bulk-plant-selected" class="btn">Plant Crop</button></div></div>`; gridContainer.appendChild(bulkPanel); console.log("Bulk action panel created."); document.getElementById('bulk-irrigate')?.addEventListener('click', () => this.bulkIrrigate()); document.getElementById('bulk-fertilize')?.addEventListener('click', () => this.bulkFertilize()); document.getElementById('bulk-harvest')?.addEventListener('click', () => this.bulkHarvest()); document.getElementById('bulk-plant')?.addEventListener('click', () => this.showBulkPlantOptions()); document.getElementById('clear-selection')?.addEventListener('click', () => { this.clearSelection(); this.closeBulkActionPanel(); }); document.getElementById('bulk-plant-selected')?.addEventListener('click', () => this.bulkPlant());
    }

    // --- UI Update Methods ---
    updateHUD() { /* ... */ }
    updateEventsList() { /* ... */ }
    updateLegend() { /* ... */ }
    updateTechList() { /* ... */ }
    updateDashboard() { /* ... */ }

    // --- Chart Update Methods ---
    updateWaterChart(avgWater) { /* ... */ }
    updateSoilChart(avgSoil) { /* ... */ }
    _updateSingleBarChart(chartId, value, colors = ['#ff6666', '#ffcc66', '#66cc66']) { /* ... */ }
    updateCropChart(cropCounts, totalCells) { /* ... */ }
    updateGrowthChart(growthStages, plotsWithCrops) { /* ... */ }
    updateFinancialSummary(projectedIncome, potentialIncome) { /* ... */ }

    // --- DISPLAY METHODS ---
    showCellInfo(row, col) { /* ... */ }
    showTooltip(x, y, row, col) { /* ... */ }
    hideTooltip() { /* ... */ }
    showResearchModal() { /* ... */ }
    showMarketModal() { /* ... */ }

    // --- RENDERING ---
    render() { /* ... */ }
    drawCell(x, y, row, col) { /* ... */ }

    // --- HELPER METHODS ---
    _getCanvasClickCoords(event) { /* ... */ }
    _closeModal(modalElement) { /* ... */ }
    _handleCellAction(actionType, gameMethod) { /* ... */ }
    _updateSelectorPositions(offsetX, offsetY) { /* ... */ }

    // --- Advisor/Message Methods ---
    showGameMessage(title, message, type = 'info') { /* ... */ }
    showAdvisorPopup(title, text) { /* ... */ }

    // --- **** MISSING METHOD DEFINITIONS START **** ---

    selectCell(row, col) {
        if (this.selectionMode !== 'single') {
            this.clearSelection();
            this.selectionMode = 'single';
        }
        this.selectedCell = { row, col };
        this.showCellInfo(row, col);
        this.closeBulkActionPanel();
        this.render();
    }

    toggleCellInSelection(row, col) {
        if (this.selectionMode !== 'multi') {
            this.clearSelection();
            this.selectionMode = 'multi';
        }
        const cellIndex = this.selectedCells.findIndex(cell => cell.row === row && cell.col === col);
        if (cellIndex >= 0) {
            this.selectedCells.splice(cellIndex, 1);
        } else {
            this.selectedCells.push({ row, col });
        }
        this.updateBulkActionPanel();
        this.render();
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
        console.log("All cells selected.");
    }

    clearSelection() {
        this.selectedCell = null;
        this.selectedCells = [];
        this.render();
    }

    toggleSelectionMode() {
        if (this.selectionMode === 'single') {
            this.selectionMode = 'multi';
            if (this.selectedCell) {
                this.selectedCells = [{ ...this.selectedCell }];
                this.selectedCell = null;
                this.showBulkActionPanel();
            }
        } else {
            this.selectionMode = 'single';
            this.clearSelection();
            this.closeBulkActionPanel();
        }
        this.render();
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
             if (plantOptions) plantOptions.style.display = 'none';
        }
    }

    updateBulkActionPanel() {
        const countSpan = document.getElementById('selected-count');
        if (countSpan) countSpan.textContent = this.selectedCells.length;
        if (this.selectedCells.length > 0) {
            this.showBulkActionPanel();
        } else {
            this.closeBulkActionPanel();
        }
    }

    showBulkPlantOptions() {
        const options = document.getElementById('bulk-plant-options');
        const cropOptionsDiv = document.getElementById('bulk-crop-options');
        if (!options || !cropOptionsDiv) return;

        options.style.display = 'block';
        cropOptionsDiv.innerHTML = '';

        crops.forEach(crop => {
            if (crop.id !== 'empty') {
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

    _performBulkAction(actionType, gameMethod, eventVerb) {
        console.log(`[UI Debug] Performing bulk action: ${actionType}`);
        if (this.selectedCells.length === 0 || this.isBulkActionInProgress) return;

        let successCount = 0; let costTotal = 0; let incomeTotal = 0;
        this.isBulkActionInProgress = true;
        console.log(`[UI Debug] Starting loop for ${this.selectedCells.length} cells.`);

        for (const cellCoord of this.selectedCells) {
            console.log(`[UI Debug] Attempting ${actionType} on cell:`, cellCoord.row, cellCoord.col);
            if (typeof gameMethod !== 'function') { console.error(`[UI Debug] Error: gameMethod for action ${actionType} is not a function.`); continue; }
            const result = gameMethod.call(this.game, cellCoord.row, cellCoord.col);
            console.log(`[UI Debug] Result for cell (${cellCoord.row},${cellCoord.col}):`, result);

            if (typeof result === 'boolean' && result) {
                successCount++;
                if (actionType === 'irrigate') costTotal += this.game.irrigationCost;
                if (actionType === 'fertilize') costTotal += this.game.fertilizeCost;
            } else if (typeof result === 'object' && result.success) {
                console.log(`[UI Debug] Success on cell (${cellCoord.row},${cellCoord.col}), Income: ${result.income || 0}`);
                successCount++;
                if (result.cost) costTotal += result.cost;
                if (result.income) incomeTotal += result.income;
            } else {
                 console.log(`[UI Debug] Action failed or ineligible for cell (${cellCoord.row},${cellCoord.col}). Reason:`, result?.reason || 'N/A');
            }
        }
        console.log(`[UI Debug] Loop finished. Success count: ${successCount}, Total Income: ${incomeTotal}, Total Cost: ${costTotal}`);

        this.isBulkActionInProgress = false;

        if (successCount > 0) {
             console.log(`[UI Debug] Action successful for ${successCount} plots. Adding event and updating HUD.`);
             this.lastAction = { type: `bulk${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`, params: { cells: [...this.selectedCells] } };
             let eventMsg = `Bulk ${eventVerb} ${successCount} plots.`;
             if (costTotal > 0) eventMsg += ` Total cost: ${formatCurrency(costTotal)}.`;
             if (incomeTotal > 0 && actionType === 'harvest') { eventMsg += ` Total income: ${formatCurrency(incomeTotal)}.`; }
             if (typeof this.game.addEvent === 'function') { this.game.addEvent(eventMsg); } else { console.warn("game.addEvent method not found"); }
             this.updateHUD();
        } else {
             console.log(`[UI Debug] No successful actions. Adding 'no eligible plots' event.`);
             if (typeof this.game.addEvent === 'function') { this.game.addEvent(`Bulk ${eventVerb}: No eligible plots found in selection.`, true); }
        }
        this.render();
    }

    bulkIrrigate() { this._performBulkAction('irrigate', this.game.irrigateCell, 'irrigate'); }
    bulkFertilize() { this._performBulkAction('fertilize', this.game.fertilizeCell, 'fertilize'); }
    bulkHarvest() { this._performBulkAction('harvest', this.game.harvestCell, 'harvest'); }
    bulkPlant() {
         if (this.selectedCells.length === 0 || this.isBulkActionInProgress) return;
         const selectedCropInput = document.querySelector('input[name="bulk-crop-select"]:checked');
         if (!selectedCropInput) { this.game.addEvent('No crop selected for bulk planting.', true); return; }
         const cropId = selectedCropInput.value;
         const crop = getCropById(cropId);
         if (!crop) { this.game.addEvent(`Invalid crop ID selected: ${cropId}`, true); return; }
         let successCount = 0; let costTotal = 0; this.isBulkActionInProgress = true;
         for (const cellCoord of this.selectedCells) { const plantingCost = Math.round(crop.basePrice * this.game.plantingCostFactor); if (this.game.plantCrop(cellCoord.row, cellCoord.col, cropId)) { successCount++; costTotal += plantingCost; } }
         this.isBulkActionInProgress = false;
         if (successCount > 0) { this.lastAction = { type: 'bulkPlant', params: { cells: [...this.selectedCells], cropId: cropId } }; this.game.addEvent(`Bulk planted ${successCount} plots with ${crop.name}. Cost: ${formatCurrency(costTotal)}.`); this.updateHUD(); } else { this.game.addEvent(`Bulk plant ${crop.name}: No empty/affordable plots in selection.`, true); }
         this.closeBulkActionPanel(); this.render();
    }

    repeatLastAction() {
        if (!this.lastAction || this.isBulkActionInProgress) { if (!this.lastAction) this.game.addEvent('No previous action to repeat.', true); return; }
        console.log("Repeating last action:", this.lastAction);
        try {
            switch (this.lastAction.type) {
                case 'irrigate': if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) { this.game.irrigateCell(this.lastAction.params.row, this.lastAction.params.col); } break;
                case 'fertilize': if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) { this.game.fertilizeCell(this.lastAction.params.row, this.lastAction.params.col); } break;
                case 'harvest': if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined) { this.game.harvestCell(this.lastAction.params.row, this.lastAction.params.col); this.updateHUD(); } break;
                case 'plant': if (this.lastAction.params?.row !== undefined && this.lastAction.params?.col !== undefined && this.lastAction.params?.cropId) { this.game.plantCrop(this.lastAction.params.row, this.lastAction.params.col, this.lastAction.params.cropId); this.updateHUD(); } break;
                case 'bulkIrrigate': if (this.lastAction.params?.cells?.length > 0) { this.selectedCells = [...this.lastAction.params.cells]; this.selectionMode = 'multi'; this.bulkIrrigate(); } break;
                case 'bulkFertilize': if (this.lastAction.params?.cells?.length > 0) { this.selectedCells = [...this.lastAction.params.cells]; this.selectionMode = 'multi'; this.bulkFertilize(); } break;
                case 'bulkHarvest': if (this.lastAction.params?.cells?.length > 0) { this.selectedCells = [...this.lastAction.params.cells]; this.selectionMode = 'multi'; this.bulkHarvest(); } break;
                case 'bulkPlant':
                    if (this.lastAction.params?.cells?.length > 0 && this.lastAction.params?.cropId) {
                        this.selectedCells = [...this.lastAction.params.cells]; this.selectionMode = 'multi';
                        const cropRadio = document.querySelector(`input[name="bulk-crop-select"][value="${this.lastAction.params.cropId}"]`);
                        if (cropRadio) { cropRadio.checked = true; this.bulkPlant(); } else { this.showBulkActionPanel(); this.showBulkPlantOptions(); const radioToSelect = document.getElementById(`bulk-crop-${this.lastAction.params.cropId}`); if(radioToSelect) radioToSelect.checked = true; this.game.addEvent(`Select crop again to repeat bulk plant ${getCropById(this.lastAction.params.cropId)?.name || ''}.`, true) }
                    } break;
                default: console.warn("Unknown last action type:", this.lastAction.type); this.game.addEvent('Could not repeat last action.', true); break;
            }
        } catch (error) { console.error("Error repeating last action:", error); this.game.addEvent('Error trying to repeat action.', true); }
        this.render();
    }

    // --- **** MISSING METHOD DEFINITIONS END **** ---


} // End of UIManager class
