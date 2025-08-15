/**
 * California Climate Farmer - UI Manager
 */

import { crops, getCropById } from './crops.js';
import { formatCurrency } from './utils.js';
import { checkTechPrerequisites } from './technology.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('farm-grid');
        if (!this.canvas) {
            throw new Error("Fatal Error: Farm grid canvas element not found!");
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

        this.setupCanvasSize();
        this.setupEventListeners();
        this.updateLegend();
        this.updateTechList();

        console.log("UIManager initialized.");
    }

    setupCanvasSize() {
        const calculateSize = () => {
            const container = this.canvas.parentElement;
            if (!container) return;

            // Fit canvas within container while maintaining aspect ratio
            const containerWidth = container.clientWidth - 60; // Subtract padding
            const containerHeight = container.clientHeight - 60;
            const size = Math.min(containerWidth, containerHeight, 700); // Max size

            this.canvas.width = size;
            this.canvas.height = size;
            this.cellSize = size / this.game.gridSize;

            this.render(); // Re-render after resize
        };
        calculateSize();
        window.addEventListener('resize', calculateSize);
    }

    setupEventListeners() {
        // Canvas click
        this.canvas.addEventListener('click', (e) => {
            const { row, col } = this._getCanvasClickCoords(e);
            if (row !== -1) this.selectCell(row, col);
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
        document.getElementById('help-btn')?.addEventListener('click', () => document.getElementById('help-modal').style.display = 'flex');
        document.getElementById('research-btn')?.addEventListener('click', () => { this.isResearchModalOpen = true; this.showResearchModal(); });
        document.getElementById('market-btn')?.addEventListener('click', () => { this.isMarketModalOpen = true; this.showMarketModal(); });

        // Modal Closes
        document.querySelectorAll('.modal .close').forEach(btn => btn.addEventListener('click', (e) => this._closeModal(e.target.closest('.modal'))));
        window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) this._closeModal(e.target); });

        // Controls
        document.getElementById('overlay-select')?.addEventListener('change', (e) => { this.game.currentOverlay = e.target.value; this.updateLegend(); this.render(); });
        document.getElementById('speed-slider')?.addEventListener('input', (e) => {
            this.game.speed = parseInt(e.target.value, 10);
            if (this.game.speed > 0) this.game.updateInterval = 1000 / this.game.speed;
            document.getElementById('speed-value').textContent = `${this.game.speed}x`;
        });

        // Cell Info Panel Actions
        document.getElementById('close-cell-info')?.addEventListener('click', () => { document.getElementById('cell-info').style.display = 'none'; this.selectedCell = null; this.render(); });
        document.getElementById('irrigate-btn')?.addEventListener('click', () => this._handleCellAction('irrigate', this.game.irrigateCell));
        document.getElementById('fertilize-btn')?.addEventListener('click', () => this._handleCellAction('fertilize', this.game.fertilizeCell));
        document.getElementById('harvest-btn')?.addEventListener('click', () => this._handleCellAction('harvest', this.game.harvestCell));

        this.setupRowColumnSelectors(); // Initialize headers
    }
    
    // --- [FIX] ---
    // This function creates the header elements.
    setupRowColumnSelectors() {
        const gridContainer = document.querySelector('.farm-grid-container');
        if (!gridContainer) return;

        let rowSelectors = gridContainer.querySelector('.row-selectors');
        if (!rowSelectors) {
            rowSelectors = document.createElement('div');
            rowSelectors.className = 'row-selectors';
            gridContainer.appendChild(rowSelectors);
        }
        rowSelectors.innerHTML = ''; // Clear existing

        let colSelectors = gridContainer.querySelector('.column-selectors');
        if (!colSelectors) {
            colSelectors = document.createElement('div');
            colSelectors.className = 'column-selectors';
            gridContainer.appendChild(colSelectors);
        }
        colSelectors.innerHTML = ''; // Clear existing

        for (let i = 0; i < this.game.gridSize; i++) {
            const rowBtn = document.createElement('button');
            rowBtn.className = 'selector-btn';
            rowBtn.textContent = i + 1;
            rowBtn.dataset.row = i;
            rowSelectors.appendChild(rowBtn);

            const colBtn = document.createElement('button');
            colBtn.className = 'selector-btn';
            colBtn.textContent = String.fromCharCode(65 + i);
            colBtn.dataset.col = i;
            colSelectors.appendChild(colBtn);
        }
    }
    
    // --- [FIX] ---
    // This new helper function aligns the headers with the canvas grid.
    _updateSelectorPositions(offsetX, offsetY) {
        const rowSelectors = document.querySelector('.row-selectors');
        const colSelectors = document.querySelector('.column-selectors');
        if (!rowSelectors || !colSelectors) return;

        const gridDimension = this.cellSize * this.game.gridSize;
        const buttonSize = 22;
        const margin = 5;

        // Position the vertical row selectors to the left of the grid
        rowSelectors.style.left = `${offsetX - buttonSize - margin}px`;
        rowSelectors.style.top = `${offsetY}px`;
        rowSelectors.style.height = `${gridDimension}px`;
        
        // Position the horizontal column selectors above the grid
        colSelectors.style.left = `${offsetX}px`;
        colSelectors.style.top = `${offsetY - buttonSize - margin}px`;
        colSelectors.style.width = `${gridDimension}px`;
    }


    updateHUD() {
        document.getElementById('balance').textContent = formatCurrency(this.game.balance);
        document.getElementById('farm-value').textContent = formatCurrency(this.game.farmValue);
        document.getElementById('farm-health').textContent = this.game.farmHealth.toFixed(0);
        document.getElementById('water-reserve').textContent = this.game.waterReserve.toFixed(0);
        document.getElementById('date-display').textContent = `${this.game.season}, Year ${this.game.year}`;
        document.getElementById('year-display').textContent = this.game.year;
        document.getElementById('season-display').textContent = this.game.season;
        document.getElementById('pause-btn').textContent = this.game.paused ? 'Resume' : 'Pause';
    }

    updateEventsList() {
        const container = document.getElementById('events-container');
        if (!container) return;
        container.innerHTML = this.game.events.map(event =>
            `<div class="event ${event.isAlert ? 'alert' : ''}">
                <div class="event-date">${event.date}</div>
                <div>${event.message}</div>
            </div>`
        ).join('');
        container.scrollTop = container.scrollHeight;
    }
    
    updateLegend() {
        const legend = document.getElementById('grid-legend');
        if (!legend) return;
        legend.innerHTML = '';
        let items = [];
        switch (this.game.currentOverlay) {
            case 'crop': items = crops.filter(c => c.id !== 'empty').map(c => ({ color: c.color, label: c.name })); break;
            case 'water': items = [{ color: '#ff6666', label: 'Low' }, { color: '#ffcc66', label: 'Med' }, { color: '#66cc66', label: 'High' }]; break;
            case 'soil': items = [{ color: '#cc9966', label: 'Poor' }, { color: '#aa8855', label: 'Avg' }, { color: '#886644', label: 'Good' }]; break;
            case 'yield': items = [{ color: '#ffaaaa', label: 'Low' }, { color: '#ffffaa', label: 'Med' }, { color: '#aaffaa', label: 'High' }]; break;
        }
        items.forEach(item => {
            legend.innerHTML += `<div class="legend-item"><div class="legend-color" style="background-color: ${item.color}"></div><span>${item.label}</span></div>`;
        });
    }

    updateTechList() {
        const container = document.getElementById('tech-container');
        if (!container) return;
        const researched = this.game.technologies.filter(t => t.researched);
        if (researched.length === 0) {
            container.innerHTML = '<p>None</p>';
            return;
        }
        container.innerHTML = `<ul>${researched.map(t => `<li title="${t.description}">${t.name}</li>`).join('')}</ul>`;
    }

    showCellInfo(row, col) {
        const cell = this.game.grid[row][col];
        const panel = document.getElementById('cell-info');
        const details = document.getElementById('cell-details');
        const cropOptions = document.getElementById('crop-options');
        if (!panel || !details || !cropOptions) return;

        details.innerHTML = `<div class="stat"><span>Plot:</span><span>${String.fromCharCode(65 + col)}${row + 1}</span></div>
                             <div class="stat"><span>Crop:</span><span>${cell.crop.name}</span></div>
                             <div class="stat"><span>Water:</span><span>${cell.waterLevel.toFixed(0)}%</span></div>
                             <div class="stat"><span>Soil:</span><span>${cell.soilHealth.toFixed(0)}%</span></div>`;

        if (cell.crop.id !== 'empty') {
            details.innerHTML += `<div class="stat"><span>Growth:</span><span>${Math.floor(cell.growthProgress)}%</span></div>
                                  <div class="stat"><span>Yield:</span><span>${cell.expectedYield.toFixed(0)}%</span></div>`;
            cropOptions.style.display = 'none';
        } else {
            cropOptions.innerHTML = '<h3>Plant Crop</h3>';
            crops.forEach(crop => {
                if (crop.id === 'empty') return;
                const cost = formatCurrency(Math.round(crop.basePrice * this.game.plantingCostFactor));
                cropOptions.innerHTML += `<div class="crop-option">
                    <input type="radio" id="crop-${crop.id}" name="crop-select" value="${crop.id}">
                    <label for="crop-${crop.id}">${crop.name} (${cost})</label>
                </div>`;
            });
            cropOptions.innerHTML += `<button id="plant-btn" class="btn">Plant</button>`;
            document.getElementById('plant-btn').onclick = () => {
                const selected = document.querySelector('input[name="crop-select"]:checked');
                if (selected) {
                    if (this.game.plantCrop(row, col, selected.value)) {
                         this.lastAction = { type: 'plant', params: { row, col, cropId: selected.value } };
                        this.showCellInfo(row, col); // Refresh panel
                    }
                }
            };
            cropOptions.style.display = 'block';
        }
        
        document.getElementById('irrigate-btn').disabled = cell.irrigated || cell.crop.id === 'empty';
        document.getElementById('fertilize-btn').disabled = cell.fertilized || cell.crop.id === 'empty';
        document.getElementById('harvest-btn').disabled = !cell.harvestReady;

        panel.style.display = 'block';
    }

    showTooltip(x, y, row, col) {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;
        const cell = this.game.grid[row][col];
        let content = `<strong>${String.fromCharCode(65 + col)}${row + 1}</strong>: ${cell.crop.name}`;
        if (cell.crop.id !== 'empty') {
            content += ` (${Math.floor(cell.growthProgress)}%)`;
            if (cell.harvestReady) content += ` - Ready!`;
        }
        tooltip.innerHTML = content;
        tooltip.style.left = `${x + 15}px`;
        tooltip.style.top = `${y + 15}px`;
        tooltip.style.visibility = 'visible';
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) tooltip.style.visibility = 'hidden';
    }

    showResearchModal() {
        const container = document.getElementById('research-options');
        if (!container) return;
        container.innerHTML = '';
        this.game.technologies.forEach(tech => {
            const prereqsMet = checkTechPrerequisites(tech, this.game.researchedTechs);
            const canAfford = this.game.balance >= tech.cost;
            let status = 'available';
            if (tech.researched) status = 'researched';
            else if (!prereqsMet || !canAfford) status = 'unavailable';

            const item = document.createElement('div');
            item.className = `tech-item ${status}`;
            item.innerHTML = `<div class="tech-name">${tech.name}</div>
                              <div class="tech-cost">${formatCurrency(tech.cost)}</div>
                              <div class="tech-desc">${tech.description}</div>`;
            if (status === 'available') {
                item.onclick = () => {
                    if (this.game.researchTechnology(tech.id)) {
                        this.updateTechList();
                        this._closeModal(document.getElementById('research-modal'));
                    }
                };
            }
            container.appendChild(item);
        });
    }

    showMarketModal() {
        const container = document.getElementById('market-info');
        if (!container) return;
        container.innerHTML = crops.filter(c => c.id !== 'empty').map(crop =>
            `<div class="stat">
                <span>${crop.name}:</span>
                <span class="stat-value">${Math.round((this.game.marketPrices[crop.id] || 1.0) * 100)}%</span>
            </div>`
        ).join('');
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.game.grid) return;

        // Calculate grid offsets to center it in the canvas
        const gridDimension = this.cellSize * this.game.gridSize;
        const offsetX = (this.canvas.width - gridDimension) / 2;
        const offsetY = (this.canvas.height - gridDimension) / 2;

        for (let row = 0; row < this.game.gridSize; row++) {
            for (let col = 0; col < this.game.gridSize; col++) {
                this.drawCell(offsetX + col * this.cellSize, offsetY + row * this.cellSize, row, col);
            }
        }
        
        // [FIX] Call the position update function every frame.
        this._updateSelectorPositions(offsetX, offsetY);
    }

    drawCell(x, y, row, col) {
        const cell = this.game.grid[row][col];
        let fillColor;
        switch (this.game.currentOverlay) {
            case 'water': fillColor = `rgba(30, 144, 255, ${cell.waterLevel / 100})`; break;
            case 'soil': fillColor = `rgba(139, 69, 19, ${cell.soilHealth / 100})`; break;
            case 'yield': fillColor = cell.crop.id === 'empty' ? '#ddd' : `rgba(144, 238, 144, ${cell.expectedYield / 120})`; break;
            default: fillColor = cell.crop.color;
        }
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // Selection highlight
        if (this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
            this.ctx.strokeStyle = 'yellow';
            this.ctx.lineWidth = 3;
        } else {
            this.ctx.strokeStyle = '#ccc';
            this.ctx.lineWidth = 1;
        }
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        // Crop icon/status
        if (cell.crop.id !== 'empty') {
            this.ctx.fillStyle = 'black';
            this.ctx.font = `${this.cellSize * 0.5}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(cell.crop.name.charAt(0), x + this.cellSize / 2, y + this.cellSize / 2);
            if(cell.harvestReady) {
              this.ctx.fillStyle = 'rgba(255,0,0,0.7)';
              this.ctx.beginPath();
              this.ctx.arc(x + this.cellSize - 8, y + 8, 5, 0, 2 * Math.PI);
              this.ctx.fill();
            }
        }
    }

    _getCanvasClickCoords(event) {
        const rect = this.canvas.getBoundingClientRect();
        const gridDimension = this.cellSize * this.game.gridSize;
        const offsetX = (this.canvas.width - gridDimension) / 2;
        const offsetY = (this.canvas.height - gridDimension) / 2;

        const x = event.clientX - rect.left - offsetX;
        const y = event.clientY - rect.top - offsetY;

        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        if (row >= 0 && row < this.game.gridSize && col >= 0 && col < this.game.gridSize) {
            return { row, col };
        }
        return { row: -1, col: -1 };
    }

    _closeModal(modal) {
        if (modal) modal.style.display = 'none';
        if (modal.id === 'research-modal') this.isResearchModalOpen = false;
        if (modal.id === 'market-modal') this.isMarketModalOpen = false;
    }

    _handleCellAction(actionType, gameMethod) {
        if (this.selectedCell) {
            const success = gameMethod.call(this.game, this.selectedCell.row, this.selectedCell.col);
            if (success) {
                this.lastAction = { type: actionType, params: { ...this.selectedCell } };
                this.showCellInfo(this.selectedCell.row, this.selectedCell.col); // Refresh panel
            }
        }
    }
}
