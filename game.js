        // game.js

        // Test harness for running automated tests
        class TestHarness {
            constructor() {
                this.tests = [
                    { id: 'monoculture', name: 'Monoculture Strategy', running: false, complete: false },
                    { id: 'diverse', name: 'Diverse Crops Strategy', running: false, complete: false },
                    { id: 'tech-focus', name: 'Technology Focus Strategy', running: false, complete: false },
                    { id: 'water-saving', name: 'Water Conservation Strategy', running: false, complete: false },
                    { id: 'no-action', name: 'No Action Strategy', running: false, complete: false }
                ];

                this.activeGame = null;
                this.selectedTests = [];
                this.currentTestIndex = -1;
            }

            selectAllTests() {
                this.selectedTests = this.tests.map(test => test.id);
            }

            selectTest(testId) {
                if (!this.selectedTests.includes(testId)) {
                    this.selectedTests.push(testId);
                }
            }

            deselectTest(testId) {
                this.selectedTests = this.selectedTests.filter(id => id !== testId);
            }

            startNextTest() {
                this.currentTestIndex++;

                if (this.currentTestIndex >= this.selectedTests.length) {
                    console.log('All tests completed!');
                    return false;
                }

                const testId = this.selectedTests[this.currentTestIndex];
                const test = this.tests.find(t => t.id === testId);

                if (test) {
                    console.log(`Starting test: ${test.name}`);
                    test.running = true;

                    // Clean up previous game instance if exists
                    if (this.activeGame) {
                        // Nothing to cleanup for now
                    }

                    // Create new game with test settings
                    this.activeGame = new CaliforniaClimateFarmer({
                        testMode: true,
                        testStrategy: testId,
                        debugMode: true,
                        testEndYear: 50,
                        autoTerminate: true,
                        nextTestCallback: () => this.startNextTest()
                    });

                    // Start the game
                    this.activeGame.start();

                    return true;
                }

                return false;
            }

            runSelectedTests() {
                this.currentTestIndex = -1;

                // Reset test status
                this.tests.forEach(test => {
                    test.running = false;
                    test.complete = false;
                });

                // Start the first test
                return this.startNextTest();
            }
        }

        // Game Core - Simulation Engine
        class CaliforniaClimateFarmer {
            constructor(options = {}) {
                // Test mode flags
                this.testMode = options.testMode || false;
                this.testStrategy = options.testStrategy || null;
                this.debugMode = options.debugMode || false;
                this.testEndYear = options.testEndYear || 50;
                this.autoTerminate = options.autoTerminate || false;
                this.nextTestCallback = options.nextTestCallback || null;

                // Test performance metrics
                this.testMetrics = {
                    startBalance: 100000,
                    highestBalance: 100000,
                    lowestBalance: 100000,
                    harvestCount: 0,
                    totalHarvestValue: 0,
                    climateEvents: {
                        drought: 0,
                        heatwave: 0,
                        frost: 0,
                        rain: 0
                    },
                    techResearched: []
                };

                // Farm dimensions
                this.gridSize = 10;
                this.cellSize = 40;

                // Base game state
                this.day = 1;
                this.year = 1;
                this.season = 'Spring';
                this.seasonDay = 1;
                this.balance = 100000;
                this.farmValue = 250000;
                this.farmHealth = 85;
                this.waterReserve = 75;
                this.paused = false;
                this.speed = 5;
                this.currentOverlay = 'crop';

                // Debug logging - store just the most recent logs
                this.debugLogs = [];
                this.maxDebugLogs = 100; // only keep the last 100 logs

                // Game grid
                this.grid = [];

                // Technology/Research
                this.technologies = [];
                this.researchPoints = 0;

                // Events
                this.events = [];
                this.pendingEvents = [];

                // Market prices
                this.marketPrices = {};

                // Climate parameters
                this.climate = {
                    avgTemp: 70,
                    rainfall: 20,
                    droughtProbability: 0.05,
                    floodProbability: 0.03,
                    heatwaveProbability: 0.08
                };

                // Crops data
                this.crops = [
                    {
                        id: 'empty',
                        name: 'Empty Plot',
                        waterUse: 0,
                        growthTime: 0,
                        harvestValue: 0,
                        color: '#e9e9e9',
                        soilImpact: 0,
                        fertilizerNeed: 0,
                        basePrice: 0,
                        waterSensitivity: 0,
                        heatSensitivity: 0
                    },
                    {
                        id: 'corn',
                        name: 'Corn',
                        waterUse: 3.5,
                        growthTime: 90,
                        harvestValue: 75,
                        color: '#ffd700',
                        soilImpact: -2,
                        fertilizerNeed: 80,
                        basePrice: 75,
                        waterSensitivity: 1.1,
                        heatSensitivity: 0.8
                    },
                    {
                        id: 'lettuce',
                        name: 'Lettuce',
                        waterUse: 1.5,
                        growthTime: 60,
                        harvestValue: 120,
                        color: '#90ee90',
                        soilImpact: -1,
                        fertilizerNeed: 60,
                        basePrice: 120,
                        waterSensitivity: 1.2,
                        heatSensitivity: 1.3
                    },
                    {
                        id: 'almonds',
                        name: 'Almonds',
                        waterUse: 4.5,
                        growthTime: 240,
                        harvestValue: 450,
                        color: '#8b4513',
                        soilImpact: -1,
                        fertilizerNeed: 100,
                        basePrice: 450,
                        waterSensitivity: 0.9,
                        heatSensitivity: 0.7
                    },
                    {
                        id: 'strawberries',
                        name: 'Strawberries',
                        waterUse: 2.5,
                        growthTime: 70,
                        harvestValue: 300,
                        color: '#ff6b6b',
                        soilImpact: -2,
                        fertilizerNeed: 90,
                        basePrice: 300,
                        waterSensitivity: 1.0,
                        heatSensitivity: 1.1
                    },
                    {
                        id: 'grapes',
                        name: 'Grapes',
                        waterUse: 3.0,
                        growthTime: 180,
                        harvestValue: 350,
                        color: '#9370db',
                        soilImpact: -1,
                        fertilizerNeed: 75,
                        basePrice: 350,
                        waterSensitivity: 0.8,
                        heatSensitivity: 0.9
                    }
                ];

                // Initialize technology tree
                this.initTechnologies();

                // Initialize the farm grid
                this.initializeGrid();

                // Initialize market prices
                this.updateMarketPrices();

                // Set up the game loop
                this.lastUpdateTime = 0;
                this.updateInterval = 1000 / this.speed;

                // UI Elements
                this.canvas = document.getElementById('farm-grid');
                this.ctx = this.canvas.getContext('2d');
                this.setupCanvasSize();
                this.selectedCell = null;

                // Set up event listeners
                this.setupEventListeners();

                // Start the game loop
                this.start();
            }

            initializeGrid() {
                for (let row = 0; row < this.gridSize; row++) {
                    this.grid[row] = [];
                    for (let col = 0; col < this.gridSize; col++) {
                        this.grid[row][col] = {
                            crop: this.crops[0], // Empty plot
                            waterLevel: 80,
                            soilHealth: 90,
                            growthProgress: 0,
                            daysSincePlanting: 0,
                            fertilized: false,
                            irrigated: false,
                            harvestReady: false,
                            expectedYield: 0
                        };
                    }
                }
            }

            initTechnologies() {
                this.technologies = [
                    {
                        id: 'drip_irrigation',
                        name: 'Drip Irrigation',
                        description: 'Reduces water usage by 20% and improves crop health',
                        cost: 25000,
                        researched: false,
                        effects: {
                            waterEfficiency: 1.2,
                            cropHealth: 1.1
                        },
                        prerequisites: []
                    },
                    {
                        id: 'soil_sensors',
                        name: 'Soil Sensors',
                        description: 'Monitors soil health and water levels in real-time',
                        cost: 15000,
                        researched: false,
                        effects: {
                            soilInfo: true,
                            waterEfficiency: 1.1
                        },
                        prerequisites: []
                    },
                    {
                        id: 'greenhouse',
                        name: 'Greenhouse Technology',
                        description: 'Protects crops from extreme weather events',
                        cost: 40000,
                        researched: false,
                        effects: {
                            weatherProtection: 0.5
                        },
                        prerequisites: []
                    },
                    {
                        id: 'ai_irrigation',
                        name: 'AI-Driven Irrigation',
                        description: 'Optimizes water use based on weather forecasts and crop needs',
                        cost: 50000,
                        researched: false,
                        effects: {
                            waterEfficiency: 1.5,
                            cropHealth: 1.2
                        },
                        prerequisites: ['drip_irrigation', 'soil_sensors']
                    },
                    {
                        id: 'drought_resistant',
                        name: 'Drought-Resistant Varieties',
                        description: 'Crop varieties that can thrive with less water',
                        cost: 35000,
                        researched: false,
                        effects: {
                            droughtResistance: 0.6,
                            waterEfficiency: 1.3
                        },
                        prerequisites: []
                    },
                    {
                        id: 'precision_drones',
                        name: 'Precision Agriculture Drones',
                        description: 'Monitor crops and apply fertilizer/pesticides precisely where needed',
                        cost: 45000,
                        researched: false,
                        effects: {
                            fertilizerEfficiency: 1.4,
                            cropHealth: 1.15
                        },
                        prerequisites: ['soil_sensors']
                    },
                    {
                        id: 'renewable_energy',
                        name: 'Renewable Energy Systems',
                        description: 'Solar and wind power to reduce energy costs',
                        cost: 55000,
                        researched: false,
                        effects: {
                            energyCost: 0.7
                        },
                        prerequisites: []
                    },
                    {
                        id: 'no_till_farming',
                        name: 'No-Till Farming',
                        description: 'Improves soil health and reduces erosion',
                        cost: 20000,
                        researched: false,
                        effects: {
                            soilHealth: 1.2,
                            erosionReduction: 0.7
                        },
                        prerequisites: []
                    },
                    {
                        id: 'silvopasture',
                        name: 'Silvopasture',
                        description: 'Integrating trees with pasture for shade and water retention',
                        cost: 30000,
                        researched: false,
                        effects: {
                            waterRetention: 1.2,
                            heatResistance: 0.8
                        },
                        prerequisites: ['no_till_farming']
                    }
                ];
            }

            setupCanvasSize() {
                const calculateSize = () => {
                    const container = this.canvas.parentElement;
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    this.canvas.width = width;
                    this.canvas.height = height;
                    this.cellSize = Math.min(width, height) / this.gridSize * 0.9;
                    this.render();
                };

                // Set initial size
                calculateSize();

                // Update on resize
                window.addEventListener('resize', calculateSize);
            }

            setupEventListeners() {
                // Canvas click for cell selection
                this.canvas.addEventListener('click', (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    // Calculate grid coordinates based on canvas offset
                    const offsetX = (this.canvas.width - this.cellSize * this.gridSize) / 2;
                    const offsetY = (this.canvas.height - this.cellSize * this.gridSize) / 2;

                    const col = Math.floor((x - offsetX) / this.cellSize);
                    const row = Math.floor((y - offsetY) / this.cellSize);

                    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
                        this.selectCell(row, col);
                    }
                });

                // Mouse move for tooltips
                this.canvas.addEventListener('mousemove', (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const offsetX = (this.canvas.width - this.cellSize * this.gridSize) / 2;
                    const offsetY = (this.canvas.height - this.cellSize * this.gridSize) / 2;

                    const col = Math.floor((x - offsetX) / this.cellSize);
                    const row = Math.floor((y - offsetY) / this.cellSize);

                    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
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
                    this.togglePause();
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
                    });
                });

                // Close modal when clicking outside
                window.addEventListener('click', (e) => {
                    document.querySelectorAll('.modal').forEach(modal => {
                        if (e.target === modal) {
                            modal.style.display = 'none';
                        }
                    });
                });

                // Overlay select change
                document.getElementById('overlay-select').addEventListener('change', (e) => {
                    this.currentOverlay = e.target.value;
                    this.updateLegend();
                    this.render();
                });

                // Speed slider
                document.getElementById('speed-slider').addEventListener('input', (e) => {
                    this.speed = parseInt(e.target.value);
                    document.getElementById('speed-value').textContent = `${this.speed}x`;
                    this.updateInterval = 1000 / this.speed;
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
                });

                // Market button
                document.getElementById('market-btn').addEventListener('click', () => {
                    this.showMarketModal();
                });

                // Irrigate button
                document.getElementById('irrigate-btn').addEventListener('click', () => {
                    if (this.selectedCell) {
                        this.irrigateCell(this.selectedCell.row, this.selectedCell.col);
                    }
                });

                // Fertilize button
                document.getElementById('fertilize-btn').addEventListener('click', () => {
                    if (this.selectedCell) {
                        this.fertilizeCell(this.selectedCell.row, this.selectedCell.col);
                    }
                });

                // Harvest button
                document.getElementById('harvest-btn').addEventListener('click', () => {
                    if (this.selectedCell) {
                        this.harvestCell(this.selectedCell.row, this.selectedCell.col);
                    }
                });
            }

            selectCell(row, col) {
                this.selectedCell = { row, col };
                this.showCellInfo(row, col);
                this.render();
            }

            showCellInfo(row, col) {
                const cell = this.grid[row][col];
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
                this.crops.forEach(crop => {
                    if (crop.id !== 'empty') {
                        const costToPlant = crop.basePrice * 0.4;
                        cropOptions.innerHTML += `
                            <div class="crop-option">
                                <input type="radio" id="crop-${crop.id}" name="crop-select" value="${crop.id}">
                                <label for="crop-${crop.id}">${crop.name} ($${costToPlant})</label>
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
                        this.plantCrop(row, col, selectedCrop.value);
                    }
                });

                // Update buttons based on cell state
                document.getElementById('irrigate-btn').disabled = cell.irrigated;
                document.getElementById('fertilize-btn').disabled = cell.fertilized;
                document.getElementById('harvest-btn').disabled = !cell.harvestReady;

                // Show the panel
                cellInfo.style.display = 'block';
            }

            plantCrop(row, col, cropId) {
                const cell = this.grid[row][col];
                const newCrop = this.crops.find(c => c.id === cropId);

                if (!newCrop) return;

                const plantingCost = newCrop.basePrice * 0.4;

                if (this.balance < plantingCost) {
                    this.addEvent(`Cannot afford to plant ${newCrop.name}. Cost: $${plantingCost}`, true);
                    return;
                }

                // Deduct cost
                this.balance -= plantingCost;

                // Update cell
                cell.crop = newCrop;
                cell.growthProgress = 0;
                cell.daysSincePlanting = 0;
                cell.fertilized = false;
                cell.irrigated = false;
                cell.harvestReady = false;
                cell.expectedYield = 100;

                // Update UI
                this.updateHUD();
                this.showCellInfo(row, col);
                this.render();

                this.addEvent(`Planted ${newCrop.name} at row ${row+1}, column ${col+1}. Cost: $${plantingCost}`);
            }

            irrigateCell(row, col) {
                const cell = this.grid[row][col];

                if (cell.crop.id === 'empty') {
                    if (!this.testMode) this.addEvent('Cannot irrigate an empty plot.', true);
                    return false;
                }

                if (cell.irrigated) {
                    if (!this.testMode) this.addEvent('This plot is already irrigated.', true);
                    return false;
                }

                const irrigationCost = 200;

                if (this.balance < irrigationCost) {
                    if (!this.testMode) this.addEvent(`Cannot afford irrigation. Cost: ${irrigationCost}`, true);
                    return false;
                }

                // Apply irrigation
                this.balance -= irrigationCost;
                cell.irrigated = true;
                cell.waterLevel = Math.min(100, cell.waterLevel + 30);

                // Apply tech effects
                if (this.hasTechnology('drip_irrigation')) {
                    cell.waterLevel = Math.min(100, cell.waterLevel + 10);
                }

                if (this.hasTechnology('ai_irrigation')) {
                    cell.waterLevel = Math.min(100, cell.waterLevel + 15);
                    cell.expectedYield = Math.min(150, cell.expectedYield + 10);
                }

                // Update UI
                this.updateHUD();
                if (!this.testMode) this.showCellInfo(row, col);
                this.render();

                if (!this.testMode) this.addEvent(`Irrigated plot at row ${row+1}, column ${col+1}. Cost: ${irrigationCost}`);

                return true;
            }

            fertilizeCell(row, col) {
                const cell = this.grid[row][col];

                if (cell.crop.id === 'empty') {
                    if (!this.testMode) this.addEvent('Cannot fertilize an empty plot.', true);
                    return false;
                }

                if (cell.fertilized) {
                    if (!this.testMode) this.addEvent('This plot is already fertilized.', true);
                    return false;
                }

                const fertilizeCost = 300;

                if (this.balance < fertilizeCost) {
                    if (!this.testMode) this.addEvent(`Cannot afford fertilizer. Cost: ${fertilizeCost}`, true);
                    return false;
                }

                // Apply fertilizer
                this.balance -= fertilizeCost;
                cell.fertilized = true;
                cell.soilHealth = Math.min(100, cell.soilHealth + 15);
                cell.expectedYield = Math.min(150, cell.expectedYield + 20);

                // Apply tech effects
                if (this.hasTechnology('precision_drones')) {
                    cell.soilHealth = Math.min(100, cell.soilHealth + 10);
                    cell.expectedYield = Math.min(150, cell.expectedYield + 15);
                }

                // Update UI
                this.updateHUD();
                if (!this.testMode) this.showCellInfo(row, col);
                this.render();

                if (!this.testMode) this.addEvent(`Fertilized plot at row ${row+1}, column ${col+1}. Cost: ${fertilizeCost}`);

                return true;
            }

            harvestCell(row, col) {
                const cell = this.grid[row][col];
                const cropName = cell.crop.name; // Save crop name before clearing cell

                if (cell.crop.id === 'empty') {
                    if (!this.testMode) this.addEvent('Nothing to harvest in this plot.', true);
                    return false;
                }

                if (!cell.harvestReady) {
                    if (!this.testMode) this.addEvent('Crop is not ready for harvest yet.', true);
                    return false;
                }

                // Calculate yield based on growing conditions
                let yieldPercentage = cell.expectedYield / 100;

                // Apply water stress factor
                const waterFactor = cell.waterLevel / 100;
                yieldPercentage *= Math.pow(waterFactor, cell.crop.waterSensitivity);

                // Apply soil health factor
                const soilFactor = cell.soilHealth / 100;
                yieldPercentage *= Math.pow(soilFactor, 0.8);

                // Calculate final harvest value
                const baseValue = cell.crop.harvestValue;
                const marketPrice = this.marketPrices[cell.crop.id] || 1.0;
                const harvestValue = Math.round(baseValue * yieldPercentage * marketPrice);

                // Add to balance
                this.balance += harvestValue;

                // Clear the cell
                cell.crop = this.crops[0]; // Empty plot
                cell.growthProgress = 0;
                cell.daysSincePlanting = 0;
                cell.fertilized = false;
                cell.irrigated = false;
                cell.harvestReady = false;
                cell.expectedYield = 0;

                // Apply soil health impact from harvesting
                cell.soilHealth = Math.max(10, cell.soilHealth - 5);

                // Update UI
                this.updateHUD();
                if (!this.testMode) this.showCellInfo(row, col);
                this.render();

                if (!this.testMode) {
                    this.addEvent(`Harvested ${cropName} for ${harvestValue}. Yield: ${Math.round(yieldPercentage * 100)}%`);
                }

                return true;
            }

            updateLegend() {
                const legend = document.getElementById('grid-legend');
                legend.innerHTML = '';

                switch (this.currentOverlay) {
                    case 'crop':
                        this.crops.forEach(crop => {
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

            showTooltip(x, y, row, col) {
                const tooltip = document.getElementById('tooltip');
                const cell = this.grid[row][col];

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

            hideTooltip() {
                document.getElementById('tooltip').style.visibility = 'hidden';
            }

            showResearchModal() {
                const researchOptions = document.getElementById('research-options');
                researchOptions.innerHTML = '';

                this.technologies.forEach(tech => {
                    const available = this.checkTechPrerequisites(tech);
                    const statusClass = tech.researched ? 'researched' : (available ? '' : 'unavailable');

                    researchOptions.innerHTML += `
                        <div class="tech-item ${statusClass}" data-tech-id="${tech.id}">
                            <div class="tech-name">${tech.name} ${tech.researched ? '<span class="badge success">Researched</span>' : ''}</div>
                            <div class="tech-desc">${tech.description}</div>
                            <div class="tech-cost">Cost: $${tech.cost}</div>
                            ${tech.prerequisites.length > 0 ? `<div class="tech-prereq">Prerequisites: ${tech.prerequisites.map(p => {
                                const prereqTech = this.technologies.find(t => t.id === p);
                                return prereqTech ? prereqTech.name : p;
                            }).join(', ')}</div>` : ''}
                        </div>
                    `;
                });

                // Add event listeners for research
                document.querySelectorAll('.tech-item:not(.researched):not(.unavailable)').forEach(item => {
                    item.addEventListener('click', () => {
                        const techId = item.dataset.techId;
                        this.researchTechnology(techId);
                    });
                });

                document.getElementById('research-modal').style.display = 'flex';
            }

            checkTechPrerequisites(tech) {
                if (tech.researched) return false;

                if (tech.prerequisites.length === 0) return true;

                return tech.prerequisites.every(prereqId => {
                    const prereqTech = this.technologies.find(t => t.id === prereqId);
                    return prereqTech && prereqTech.researched;
                });
            }

            researchTechnology(techId) {
                const tech = this.technologies.find(t => t.id === techId);
                if (!tech || tech.researched) return false;

                if (!this.checkTechPrerequisites(tech)) {
                    if (!this.testMode) this.addEvent(`Cannot research ${tech.name} - prerequisites not met.`, true);
                    else this.debugLog(`Research failed: ${tech.name} - prerequisites not met`, 0);
                    return false;
                }

                if (this.balance < tech.cost) {
                    if (!this.testMode) this.addEvent(`Cannot afford to research ${tech.name}. Cost: ${tech.cost}`, true);
                    else this.debugLog(`Research failed: Cannot afford ${tech.name}. Cost: ${tech.cost}, Balance: ${this.balance}`, 0);
                    return false;
                }

                // Deduct cost
                this.balance -= tech.cost;

                // Mark as researched
                tech.researched = true;

                // Apply immediate effects
                this.applyTechnologyEffects(tech);

                // Update UI
                this.updateHUD();
                if (!this.testMode) this.showResearchModal();

                // Log the research success
                if (!this.testMode) this.addEvent(`Researched ${tech.name} for ${tech.cost}`);
                else this.debugLog(`Successfully researched: ${tech.name} for ${tech.cost}`, 1);

                return true;
            }

            applyTechnologyEffects(tech) {
                // Apply farm-wide effects
                if (tech.effects.waterEfficiency) {
                    // This will be applied in daily updates
                }

                if (tech.effects.soilHealth) {
                    // Apply soil health boost
                    for (let row = 0; row < this.gridSize; row++) {
                        for (let col = 0; col < this.gridSize; col++) {
                            this.grid[row][col].soilHealth = Math.min(100,
                                this.grid[row][col].soilHealth * tech.effects.soilHealth);
                        }
                    }
                }

                // Update UI
                this.render();
            }

            hasTechnology(techId) {
                const tech = this.technologies.find(t => t.id === techId);
                return tech && tech.researched;
            }

            getTechEffectValue(effectName, defaultValue = 1.0) {
                let value = defaultValue;

                this.technologies.forEach(tech => {
                    if (tech.researched && tech.effects[effectName]) {
                        if (effectName.includes('Efficiency') || effectName.includes('Retention')) {
                            // Multiplicative effects
                            value *= tech.effects[effectName];
                        } else if (effectName.includes('Resistance') || effectName.includes('Protection')) {
                            // Reduction effects (lower is better)
                            value *= tech.effects[effectName];
                        }
                    }
                });

                return value;
            }

            showMarketModal() {
                const marketInfo = document.getElementById('market-info');
                marketInfo.innerHTML = `
                    <p>Current market prices (100% = base price):</p>
                    <div class="market-prices">
                        ${this.crops.filter(c => c.id !== 'empty').map(crop => `
                            <div class="stat">
                                <span>${crop.name}:</span>
                                <span class="stat-value">${Math.round(this.marketPrices[crop.id] * 100)}%</span>
                            </div>
                        `).join('')}
                    </div>
                    <p>Market trends for next season:</p>
                    <div class="market-trends">
                        ${this.crops.filter(c => c.id !== 'empty').map(crop => {
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

            updateMarketPrices() {
                // Initialize prices
                this.crops.forEach(crop => {
                    if (crop.id !== 'empty') {
                        // Start with a random price between 80% and 120% of base
                        this.marketPrices[crop.id] = 0.8 + Math.random() * 0.4;
                    }
                });
            }

            fluctuateMarketPrices() {
                // Fluctuate prices slightly each season
                this.crops.forEach(crop => {
                    if (crop.id !== 'empty') {
                        // Small random change: -10% to +10%
                        const change = 0.9 + Math.random() * 0.2;
                        this.marketPrices[crop.id] *= change;

                        // Keep within reasonable bounds
                        this.marketPrices[crop.id] = Math.max(0.5, Math.min(2.0, this.marketPrices[crop.id]));
                    }
                });
            }

            addEvent(message, isAlert = false) {
                const event = {
                    date: `${this.season}, Year ${this.year}`,
                    message,
                    isAlert
                };

                this.events.unshift(event);

                // Keep only the most recent 20 events
                if (this.events.length > 20) {
                    this.events.pop();
                }

                // Update UI
                this.updateEventsList();
            }

            updateEventsList() {
                const eventsContainer = document.getElementById('events-container');
                eventsContainer.innerHTML = '';

                this.events.forEach(event => {
                    // Format any currency values in the message
                    let formattedMessage = event.message;
                    if (typeof formattedMessage === 'string' && formattedMessage.includes('$')) {
                        // Make sure dollar amounts are properly formatted
                        formattedMessage = formattedMessage.replace(/\$(\d+)/g, (match, p1) => {
                            return '$' + Number(p1).toLocaleString();
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

            updateHUD() {
                document.getElementById('balance').textContent = this.balance.toLocaleString();
                document.getElementById('farm-value').textContent = this.farmValue.toLocaleString();
                document.getElementById('farm-health').textContent = this.farmHealth;
                document.getElementById('water-reserve').textContent = this.waterReserve;
                document.getElementById('date-display').textContent = `${this.season}, Year ${this.year}`;
                document.getElementById('year-display').textContent = this.year;
                document.getElementById('season-display').textContent = this.season;
            }

            togglePause() {
                this.paused = !this.paused;
                document.getElementById('pause-btn').textContent = this.paused ? 'Resume' : 'Pause';
            }

            start() {
                this.lastUpdateTime = performance.now();
                this.updateLegend();
                this.render();

                // Initialize test mode if active
                if (this.testMode) {
                    this.setupTestMode();
                }

                this.gameLoop();
            }

            // Debug logging with log levels: 0=ERROR, 1=INFO, 2=DEBUG, 3=VERBOSE
            debugLog(message, level = 1) {
                // Only log messages at or below the current verbosity level
                const verbosityLevel = this.testMode ? 2 : 1; // Default to INFO in normal mode, DEBUG in test mode

                if (level > verbosityLevel) return;

                // Format message with proper currency formatting
                let formattedMessage = message;
                if (typeof message === 'string' && message.includes('$')) {
                    // Make sure dollar amounts are properly formatted
                    formattedMessage = formattedMessage.replace(/\$(\d+)/g, (match, p1) => {
                        return '$' + Number(p1).toLocaleString();
                    });
                }

                const logMessage = `[Year ${this.year}, ${this.season}] ${formattedMessage}`;

                // Limit stored logs to prevent memory issues
                this.debugLogs.push(logMessage);
                if (this.debugLogs.length > this.maxDebugLogs) {
                    this.debugLogs.shift(); // Remove oldest log
                }

                if (this.debugMode) {
                    // Only log to console for important messages or in test mode
                    if (level <= 1 || this.testMode) {
                        console.log(logMessage);
                    }
                    this.updateDebugPanel();
                }

                // Track test metrics
                if (this.testMode) {
                    // Update balance tracking
                    if (this.balance > this.testMetrics.highestBalance) {
                        this.testMetrics.highestBalance = this.balance;
                    }
                    if (this.balance < this.testMetrics.lowestBalance) {
                        this.testMetrics.lowestBalance = this.balance;
                    }
                }
            }

            updateDebugPanel() {
                const debugPanel = document.getElementById('debug-panel');
                const debugContent = document.getElementById('debug-content');

                // Show panel if not already visible
                debugPanel.style.display = 'block';

                // Add test metrics display to the top
                let content = '';

                if (this.testMode) {
                    content += `<div style="margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">`;
                    content += `<strong>Test: ${this.testStrategy}</strong> | Year ${this.year} | ${this.balance.toLocaleString()}<br>`;
                    content += `Strategy: ${this.testStrategy} | Farm Health: ${this.farmHealth}%<br>`;
                    content += `</div>`;
                }

                // Show logs
                const logs = this.debugLogs.slice(-50); // Just show the most recent 50
                content += logs.join('<br>');

                debugContent.innerHTML = content;

                // Scroll to bottom
                debugContent.scrollTop = debugContent.scrollHeight;
            }

            setupTestMode() {
                this.debugLog(`Starting test: ${this.testStrategy}`);
                this.debugLog(`Initial balance: ${this.balance}`);

                // Set game to max speed for tests
                this.speed = 10;
                this.updateInterval = 1000 / this.speed;

                // Initial test setup based on strategy
                switch (this.testStrategy) {
                    case 'monoculture':
                        this.setupMonocultureTest();
                        break;
                    case 'diverse':
                        this.setupDiverseCropsTest();
                        break;
                    case 'tech-focus':
                        this.setupTechFocusTest();
                        break;
                    case 'water-saving':
                        this.setupWaterSavingTest();
                        break;
                    case 'no-action':
                        // No action needed, just let the simulation run
                        this.debugLog(`No action strategy - letting farm run without intervention`);
                        break;
                    default:
                        this.debugLog(`Unknown test strategy: ${this.testStrategy}`);
                }
            }

            setupMonocultureTest() {
                // Plant the same crop in all cells
                const cropId = 'corn'; // Using corn for monoculture
                this.debugLog(`Monoculture test - planting ${cropId} in all plots (${this.gridSize}x${this.gridSize} grid)`);

                let plantCount = 0;

                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        if (this.plantCropForTest(row, col, cropId)) {
                            plantCount++;
                        }
                    }
                }

                this.debugLog(`Successfully planted ${plantCount} ${cropId} plots`);
            }

            setupDiverseCropsTest() {
                this.debugLog(`Diverse crops test - planting different crops`);

                // Get crop IDs excluding 'empty'
                const cropIds = this.crops.filter(c => c.id !== 'empty').map(c => c.id);

                // Plant different crops in a pattern
                let cropCounts = {};

                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        // Use a pattern for diversity
                        const cropIndex = (row + col) % cropIds.length;
                        const cropId = cropIds[cropIndex];

                        if (this.plantCropForTest(row, col, cropId)) {
                            cropCounts[cropId] = (cropCounts[cropId] || 0) + 1;
                        }
                    }
                }

                // Log summary of planted crops
                const plantSummary = Object.entries(cropCounts)
                    .map(([crop, count]) => `${crop}: ${count}`)
                    .join(', ');

                this.debugLog(`Planted crop distribution: ${plantSummary}`);
            }

            setupTechFocusTest() {
                this.debugLog(`Technology focus test - prioritizing research`);

                // Plant some crops to generate income
                let plantCount = 0;
                const cropId = 'lettuce'; // Fast growing crop for quick returns

                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        if (row < 5 && col < 5) { // Plant in half the farm for initial income
                            if (this.plantCropForTest(row, col, cropId)) {
                                plantCount++;
                            }
                        }
                    }
                }

                this.debugLog(`Planted ${plantCount} ${cropId} plots for initial income`);
                // Research will be handled in the test update
            }

            setupWaterSavingTest() {
                this.debugLog(`Water conservation test - focusing on water efficient crops and tech`);

                // Plant drought-resistant crops
                let grapesCount = 0;
                let almondsCount = 0;

                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        // Alternating pattern of water-efficient crops
                        const cropId = (row + col) % 2 === 0 ? 'grapes' : 'almonds';

                        if (this.plantCropForTest(row, col, cropId)) {
                            if (cropId === 'grapes') grapesCount++;
                            else almondsCount++;
                        }
                    }
                }

                this.debugLog(`Planted ${grapesCount} grape and ${almondsCount} almond plots`);
                // Water tech will be prioritized in the test update
            }

            plantCropForTest(row, col, cropId) {
                const cell = this.grid[row][col];
                const newCrop = this.crops.find(c => c.id === cropId);

                if (!newCrop) return false;

                const plantingCost = newCrop.basePrice * 0.4;

                if (this.balance < plantingCost) {
                    this.debugLog(`Cannot afford to plant ${newCrop.name} (${plantingCost}). Current balance: ${this.balance}`, 0); // Log as ERROR level
                    return false;
                }

                // Deduct cost
                this.balance -= plantingCost;

                // Update cell
                cell.crop = newCrop;
                cell.growthProgress = 0;
                cell.daysSincePlanting = 0;
                cell.fertilized = false;
                cell.irrigated = false;
                cell.harvestReady = false;
                cell.expectedYield = 100;

                // Update UI
                this.updateHUD();
                this.render();

                return true; // Successfully planted
            }

            runTestUpdate() {
                // This is called every day in test mode

                // Check if we should terminate the test
                if (this.autoTerminate && (this.year >= this.testEndYear || this.balance <= 0)) {
                    this.debugLog(`Test termination condition met. Year: ${this.year}, Balance: ${this.balance}`);
                    this.terminateTest();
                    return;
                }

                // Run strategy-specific test logic
                switch (this.testStrategy) {
                    case 'monoculture':
                        this.updateMonocultureTest();
                        break;
                    case 'diverse':
                        this.updateDiverseCropsTest();
                        break;
                    case 'tech-focus':
                        this.updateTechFocusTest();
                        break;
                    case 'water-saving':
                        this.updateWaterSavingTest();
                        break;
                    case 'no-action':
                        // No action needed
                        break;
                }

                // Log key metrics once per year
                if (this.day % 360 === 0) {
                    this.logYearEndMetrics();
                }
            }

            logYearEndMetrics() {
                // Compute farm metrics for logging
                let cropCounts = {};
                let harvestReadyCount = 0;
                let totalWaterLevel = 0;
                let totalSoilHealth = 0;
                let emptyPlots = 0;

                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        if (cell.crop.id === 'empty') {
                            emptyPlots++;
                        } else {
                            cropCounts[cell.crop.id] = (cropCounts[cell.crop.id] || 0) + 1;
                            if (cell.harvestReady) harvestReadyCount++;
                        }

                        totalWaterLevel += cell.waterLevel;
                        totalSoilHealth += cell.soilHealth;
                    }
                }

                const cropDistribution = Object.entries(cropCounts)
                    .map(([crop, count]) => `${crop}: ${count}`)
                    .join(', ');

                const avgWaterLevel = totalWaterLevel / (this.gridSize * this.gridSize);
                const avgSoilHealth = totalSoilHealth / (this.gridSize * this.gridSize);

                // Research progress
                const researchedTechs = this.technologies.filter(t => t.researched).map(t => t.id).join(', ');

                // More compact summary format
                this.debugLog(`==== YEAR ${this.year} SUMMARY ====`);
                this.debugLog(`Financial: ${this.balance.toLocaleString()} | Farm Value: ${this.farmValue.toLocaleString()}`);
                this.debugLog(`Health Metrics: Farm ${this.farmHealth}% | Water ${this.waterReserve}% | Soil ${avgSoilHealth.toFixed(1)}%`);
                this.debugLog(`Crops: ${cropDistribution} | Empty: ${emptyPlots} | Ready: ${harvestReadyCount}`);
                this.debugLog(`Tech: ${researchedTechs || 'None'}`);
                this.debugLog(`========================`);

                // Log more detailed stats to browser console only
                if (this.debugMode) {
                    console.log(`YEAR ${this.year} DETAILED STATS:`, {
                        balance: this.balance,
                        farmValue: this.farmValue,
                        farmHealth: this.farmHealth,
                        waterReserve: this.waterReserve,
                        cropDistribution: cropCounts,
                        emptyPlots,
                        harvestReady: harvestReadyCount,
                        avgWaterLevel,
                        avgSoilHealth,
                        researchedTechs: this.technologies.filter(t => t.researched).map(t => t.id)
                    });
                }
            }

            updateMonocultureTest() {
                // Track farming activities for batch logging
                let harvested = 0;
                let planted = 0;
                let irrigated = 0;
                let fertilized = 0;

                // Handle all crops that are ready for harvest
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        // Harvest ready crops
                        if (cell.harvestReady) {
                            this.harvestCell(row, col);
                            harvested++;
                        }

                        // Replant if empty
                        if (cell.crop.id === 'empty') {
                            if (this.plantCropForTest(row, col, 'corn')) {
                                planted++;
                            }
                        }

                        // Irrigate if water level is low
                        if (cell.crop.id !== 'empty' && !cell.irrigated && cell.waterLevel < 50) {
                            if (this.irrigateCell(row, col)) {
                                irrigated++;
                            }
                        }

                        // Fertilize if not already fertilized
                        if (cell.crop.id !== 'empty' && !cell.fertilized) {
                            if (this.fertilizeCell(row, col)) {
                                fertilized++;
                            }
                        }
                    }
                }

                // Log farming activities once per day (only if something happened)
                if (harvested > 0 || planted > 0 || irrigated > 0 || fertilized > 0) {
                    this.debugLog(`Daily activities: Harvested ${harvested}, Planted ${planted}, Irrigated ${irrigated}, Fertilized ${fertilized}`, 2);
                }

                // Research water-related tech if we can afford it
                if (!this.hasTechnology('drip_irrigation') && this.balance > 30000) {
                    this.researchTechnology('drip_irrigation');
                }
            }

            updateDiverseCropsTest() {
                // Track farming activities for batch logging
                let harvested = 0;
                let planted = {};
                let irrigated = 0;
                let fertilized = 0;

                // Handle all crops
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        // Harvest ready crops
                        if (cell.harvestReady) {
                            this.harvestCell(row, col);
                            harvested++;
                        }

                        // Replant if empty with a diverse selection
                        if (cell.crop.id === 'empty') {
                            const cropIds = this.crops.filter(c => c.id !== 'empty').map(c => c.id);
                            const cropIndex = (row + col + this.day) % cropIds.length;
                            const cropId = cropIds[cropIndex];

                            if (this.plantCropForTest(row, col, cropId)) {
                                planted[cropId] = (planted[cropId] || 0) + 1;
                            }
                        }

                        // Irrigate if water level is low
                        if (cell.crop.id !== 'empty' && !cell.irrigated && cell.waterLevel < 60) {
                            if (this.irrigateCell(row, col)) {
                                irrigated++;
                            }
                        }

                        // Fertilize if not already fertilized
                        if (cell.crop.id !== 'empty' && !cell.fertilized) {
                            if (this.fertilizeCell(row, col)) {
                                fertilized++;
                            }
                        }
                    }
                }

                // Log farming activities once per day (only if something significant happened)
                if (harvested > 0 || Object.keys(planted).length > 0) {
                    const plantSummary = Object.entries(planted)
                        .map(([crop, count]) => `${crop}: ${count}`)
                        .join(', ');

                    this.debugLog(`Daily activities: Harvested ${harvested}, Planted [${plantSummary}], Irrigated ${irrigated}, Fertilized ${fertilized}`, 2);
                }

                // Research soil-related tech
                if (!this.hasTechnology('no_till_farming') && this.balance > 25000) {
                    this.researchTechnology('no_till_farming');
                } else if (!this.hasTechnology('soil_sensors') && this.balance > 20000) {
                    this.researchTechnology('soil_sensors');
                }
            }

            updateTechFocusTest() {
                // Basic farm management to keep income flowing
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        // Harvest ready crops
                        if (cell.harvestReady) {
                            this.harvestCell(row, col);
                        }

                        // Only plant in part of the farm to save money for research
                        if (cell.crop.id === 'empty' && row < 5 && col < 5) {
                            this.plantCropForTest(row, col, 'lettuce');
                        }

                        // Basic maintenance
                        if (cell.crop.id !== 'empty') {
                            if (!cell.irrigated && cell.waterLevel < 40) {
                                this.irrigateCell(row, col);
                            }

                            if (!cell.fertilized && this.balance > 5000) {
                                this.fertilizeCell(row, col);
                            }
                        }
                    }
                }

                // Aggressive technology research
                // Define research priority queue
                const researchQueue = [
                    'soil_sensors',
                    'drip_irrigation',
                    'drought_resistant',
                    'ai_irrigation',
                    'precision_drones',
                    'no_till_farming',
                    'renewable_energy',
                    'greenhouse',
                    'silvopasture'
                ];

                // Try to research the next technology in the queue
                for (const techId of researchQueue) {
                    const tech = this.technologies.find(t => t.id === techId);

                    if (tech && !tech.researched && this.balance > tech.cost * 1.2) {
                        // Check if prerequisites are met
                        if (this.checkTechPrerequisites(tech)) {
                            this.researchTechnology(techId);
                            break; // Only research one tech per update
                        }
                    }
                }
            }

            updateWaterSavingTest() {
                // Focus on water conservation
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        // Harvest ready crops
                        if (cell.harvestReady) {
                            this.harvestCell(row, col);
                        }

                        // Replant with water-efficient crops
                        if (cell.crop.id === 'empty') {
                            // Choose water-efficient crops
                            const cropId = (row + col) % 2 === 0 ? 'grapes' : 'almonds';
                            this.plantCropForTest(row, col, cropId);
                        }

                        // Careful irrigation - only irrigate when very necessary
                        if (cell.crop.id !== 'empty' && !cell.irrigated && cell.waterLevel < 30) {
                            this.irrigateCell(row, col);
                        }

                        // Selective fertilizing
                        if (cell.crop.id !== 'empty' && !cell.fertilized &&
                            cell.growthProgress > 30 && this.balance > 10000) {
                            this.fertilizeCell(row, col);
                        }
                    }
                }

                // Research water technologies first
                if (!this.hasTechnology('drip_irrigation') && this.balance > 30000) {
                    this.researchTechnology('drip_irrigation');
                } else if (!this.hasTechnology('drought_resistant') && this.balance > 40000) {
                    this.researchTechnology('drought_resistant');
                } else if (!this.hasTechnology('soil_sensors') && this.balance > 20000) {
                    this.researchTechnology('soil_sensors');
                } else if (!this.hasTechnology('ai_irrigation') && this.balance > 55000) {
                    this.researchTechnology('ai_irrigation');
                }
            }

            terminateTest() {
                // Calculate final statistics
                let cropCounts = {};
                let totalWaterLevel = 0;
                let totalSoilHealth = 0;
                let emptyPlots = 0;

                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        if (cell.crop.id === 'empty') {
                            emptyPlots++;
                        } else {
                            cropCounts[cell.crop.id] = (cropCounts[cell.crop.id] || 0) + 1;
                        }

                        totalWaterLevel += cell.waterLevel;
                        totalSoilHealth += cell.soilHealth;
                    }
                }

                const cropDistribution = Object.entries(cropCounts)
                    .map(([crop, count]) => `${crop}: ${count}`)
                    .join(', ');

                const avgWaterLevel = totalWaterLevel / (this.gridSize * this.gridSize);
                const avgSoilHealth = totalSoilHealth / (this.gridSize * this.gridSize);

                // Research progress
                const researchedTechs = this.technologies.filter(t => t.researched).map(t => t.id).join(', ');
                const techCount = this.technologies.filter(t => t.researched).length;

                // Calculate test outcome
                let outcome = "Unknown";
                if (this.balance <= 0) {
                    outcome = "BANKRUPTCY";
                } else if (this.year >= this.testEndYear) {
                    outcome = "SUCCESS";
                }

                // Clear debug panel for final summary
                this.debugLogs = [];

                // Print final test summary
                this.debugLog(`========== TEST COMPLETE: ${this.testStrategy} (${outcome}) ==========`);
                this.debugLog(`Duration: ${this.year} years`);
                this.debugLog(`Final Balance: ${this.balance.toLocaleString()}`);
                this.debugLog(`Final Farm Value: ${this.farmValue.toLocaleString()}`);
                this.debugLog(`Farm Health: ${this.farmHealth}%`);
                this.debugLog(`Technologies Researched: ${techCount} (${researchedTechs || 'None'})`);
                this.debugLog(`Final Crop Distribution: ${cropDistribution || 'Empty Farm'}`);
                this.debugLog(`Average Water: ${avgWaterLevel.toFixed(1)}% | Soil: ${avgSoilHealth.toFixed(1)}%`);
                this.debugLog(`=====================================================`);

                // Log test result to console as an object for easier analysis
                console.log(`Test Complete: ${this.testStrategy}`, {
                    outcome,
                    years: this.year,
                    balance: this.balance,
                    farmValue: this.farmValue,
                    farmHealth: this.farmHealth,
                    researchedTechs: this.technologies.filter(t => t.researched).map(t => t.id),
                    crops: cropCounts,
                    avgWaterLevel,
                    avgSoilHealth
                });

                // Pause the simulation
                this.paused = true;

                // Update debug panel
                this.updateDebugPanel();

                // Call next test if callback provided
                if (this.nextTestCallback) {
                    setTimeout(() => this.nextTestCallback(), 1000);
                }
            }

            gameLoop(timestamp = 0) {
                // Calculate elapsed time
                const elapsed = timestamp - this.lastUpdateTime;

                // Update game state if enough time has passed and game isn't paused
                if (!this.paused && elapsed > this.updateInterval) {
                    this.update();
                    this.lastUpdateTime = timestamp;
                }

                // Schedule next frame
                requestAnimationFrame(this.gameLoop.bind(this));
            }

            update() {
                // Advance day
                this.day++;
                this.seasonDay++;

                // Update crop growth and conditions
                this.updateFarm();

                // Check for season change (every 90 days)
                if (this.seasonDay > 90) {
                    this.seasonDay = 1;
                    this.advanceSeason();
                }

                // Check for year change
                if (this.day > 360) {
                    this.day = 1;
                    this.advanceYear();
                }

                // Process any pending events
                this.processPendingEvents();

                // Update farm health based on overall conditions
                this.calculateFarmHealth();

                // Update HUD
                this.updateHUD();

                // Generate random events occasionally
                if (Math.random() < 0.01) {
                    this.generateRandomEvent();
                }

                // Run test mode update if active
                if (this.testMode) {
                    this.runTestUpdate();
                }
            }

            updateFarm() {
                // Update each cell based on daily changes
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        // Skip empty plots
                        if (cell.crop.id === 'empty') continue;

                        // Update crop growth
                        cell.daysSincePlanting++;

                        // Calculate growth progress
                        const growthRate = this.calculateGrowthRate(cell);
                        cell.growthProgress += growthRate;

                        // Check if ready for harvest
                        if (cell.growthProgress >= 100 && !cell.harvestReady) {
                            cell.harvestReady = true;
                            this.addEvent(`${cell.crop.name} at row ${row+1}, column ${col+1} is ready for harvest!`);
                        }

                        // Natural water level decrease
                        const waterUseRate = cell.crop.waterUse / 200; // Daily water use
                        cell.waterLevel = Math.max(0, cell.waterLevel - waterUseRate * 100);

                        // Water stress affects expected yield
                        if (cell.waterLevel < 30) {
                            cell.expectedYield = Math.max(10, cell.expectedYield - 1);
                        }

                        // Soil health slowly degrades
                        cell.soilHealth = Math.max(10, cell.soilHealth - 0.1);
                    }
                }

                // Render updated state
                this.render();
            }

            calculateGrowthRate(cell) {
                // Base growth rate based on crop growth time
                const baseRate = 100 / cell.crop.growthTime;

                // Factors affecting growth
                let waterFactor = Math.pow(cell.waterLevel / 100, cell.crop.waterSensitivity);
                let soilFactor = Math.pow(cell.soilHealth / 100, 0.8);
                let fertilizerFactor = cell.fertilized ? 1.2 : 1.0;

                // Apply technology effects
                if (this.hasTechnology('drip_irrigation')) {
                    waterFactor *= 1.1;
                }

                if (this.hasTechnology('soil_sensors')) {
                    soilFactor *= 1.1;
                }

                // Calculate final growth rate
                return baseRate * waterFactor * soilFactor * fertilizerFactor;
            }

            advanceSeason() {
                // Rotate seasons
                const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
                const currentIndex = seasons.indexOf(this.season);
                this.season = seasons[(currentIndex + 1) % 4];

                this.addEvent(`Season changed to ${this.season}`);

                // Fluctuate market prices
                this.fluctuateMarketPrices();

                // Season-specific events
                switch (this.season) {
                    case 'Summer':
                        if (Math.random() < 0.3) {
                            this.scheduleDrought();
                        }
                        break;
                    case 'Winter':
                        if (Math.random() < 0.3) {
                            this.scheduleFrost();
                        }
                        break;
                    case 'Spring':
                        if (Math.random() < 0.3) {
                            this.scheduleRain();
                        }
                        break;
                }

                // Apply technology effects
                if (this.hasTechnology('greenhouse') && (this.season === 'Winter' || this.season === 'Summer')) {
                    this.addEvent('Greenhouse technology is protecting crops from seasonal extremes.');
                }
            }

            advanceYear() {
                this.year++;

                // Interest on bank balance (if positive)
                if (this.balance > 0) {
                    const interest = Math.floor(this.balance * 0.05);
                    this.balance += interest;
                    this.addEvent(`Earned $${interest} in interest on your positive balance.`);
                }

                // Calculate annual farm value
                this.calculateFarmValue();

                // Climate change effect - increase drought probability slightly each year
                this.climate.droughtProbability += 0.005;
                this.climate.heatwaveProbability += 0.005;

                this.addEvent(`Happy New Year! You've completed Year ${this.year-1} of your farm.`);

                // Year milestone events
                if (this.year % 5 === 0) {
                    this.addEvent(`Farm milestone: ${this.year} years of operation!`);

                    // Bonus for long-term play
                    const bonus = this.year * 1000;
                    this.balance += bonus;
                    this.addEvent(`Received $${bonus} government subsidy for sustainable farming.`);
                }
            }

            calculateFarmValue() {
                // Base value
                let value = 250000;

                // Add value for developed plots
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        if (cell.crop.id !== 'empty') {
                            // Value from crops
                            value += cell.crop.basePrice * (cell.growthProgress / 100) * 20;
                        }

                        // Value from soil health
                        value += cell.soilHealth * 100;
                    }
                }

                // Value from technologies
                this.technologies.forEach(tech => {
                    if (tech.researched) {
                        value += tech.cost * 1.5;
                    }
                });

                this.farmValue = Math.round(value);
            }

            calculateFarmHealth() {
                // Average soil health
                let totalSoilHealth = 0;
                let plotCount = 0;

                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        totalSoilHealth += this.grid[row][col].soilHealth;
                        plotCount++;
                    }
                }

                const avgSoilHealth = totalSoilHealth / plotCount;

                // Water reserve factor
                const waterFactor = this.waterReserve / 100;

                // Calculate overall health
                this.farmHealth = Math.round((avgSoilHealth * 0.7 + waterFactor * 30));

                // Clamp to valid range
                this.farmHealth = Math.max(0, Math.min(100, this.farmHealth));
            }

        generateRandomEvent() {
            const eventTypes = [
                { type: 'rainfall', probability: 0.4 },
                { type: 'drought', probability: this.climate.droughtProbability * 0.5 }, // Reduced by 50%
                { type: 'heatwave', probability: this.climate.heatwaveProbability * 0.7 }, // Reduced by 30%
                { type: 'market', probability: 0.2 },
                { type: 'policy', probability: 0.1 },
                { type: 'technology', probability: 0.15 }
            ];
        
            // Rest of the function remains the same
            let totalProb = 0;
            eventTypes.forEach(e => totalProb += e.probability);
        
            // Normalize probabilities
            eventTypes.forEach(e => e.probability /= totalProb);
        
            // Cumulative probability
            let cumProb = 0;
            for (let i = 0; i < eventTypes.length; i++) {
                eventTypes[i].cumulativeProb = cumProb + eventTypes[i].probability;
                cumProb = eventTypes[i].cumulativeProb;
            }
        
            // Select event type
            const rand = Math.random();
            let selectedType = eventTypes[0].type;
        
            for (let i = 0; i < eventTypes.length; i++) {
                if (rand <= eventTypes[i].cumulativeProb) {
                    selectedType = eventTypes[i].type;
                    break;
                }
            }
        
            // Generate the specific event
            switch (selectedType) {
                case 'rainfall':
                    this.scheduleRain();
                    break;
                case 'drought':
                    this.scheduleDrought();
                    break;
                case 'heatwave':
                    this.scheduleHeatwave();
                    break;
                case 'market':
                    this.scheduleMarketEvent();
                    break;
                case 'policy':
                    this.schedulePolicyEvent();
                    break;
                case 'technology':
                    this.scheduleTechnologyEvent();
                    break;
            }
        }
                
            scheduleRain() {
                const intensity = Math.random() < 0.3 ? 'heavy' : 'moderate';

                this.pendingEvents.push({
                    type: 'rain',
                    intensity,
                    day: this.day + Math.floor(Math.random() * 10)
                });

                this.addEvent(`Weather forecast: ${intensity} rain expected soon.`);
            }

        // Create drought events with appropriate severity and duration
        scheduleDrought() {
            // Make duration more reasonable - between 3-10 days instead of 10-30
            const duration = Math.floor(3 + Math.random() * 7);
        
            this.pendingEvents.push({
                type: 'drought',
                duration,
                severity: Math.min(0.7, 0.3 + (this.climate.droughtProbability * 2)), // Reduce max severity
                day: this.day + Math.floor(Math.random() * 10)
            });
        
            this.addEvent(`Climate alert: Drought conditions forming in the region.`, true);
        }

            scheduleHeatwave() {
                const duration = Math.floor(5 + Math.random() * 10);

                this.pendingEvents.push({
                    type: 'heatwave',
                    duration,
                    day: this.day + Math.floor(Math.random() * 10)
                });

                this.addEvent(`Weather forecast: Extreme heat expected soon.`, true);
            }

            scheduleFrost() {
                this.pendingEvents.push({
                    type: 'frost',
                    day: this.day + Math.floor(Math.random() * 10)
                });

                this.addEvent(`Weather forecast: Frost conditions expected soon.`);
            }

            scheduleMarketEvent() {
                const events = [
                    { name: 'Price Surge', effect: 'increase', magnitude: 1.5 },
                    { name: 'Market Crash', effect: 'decrease', magnitude: 0.6 },
                    { name: 'Export Opportunity', effect: 'increase', magnitude: 1.3 },
                    { name: 'Trade Tariff', effect: 'decrease', magnitude: 0.8 }
                ];

                const event = events[Math.floor(Math.random() * events.length)];
                const crop = this.crops[1 + Math.floor(Math.random() * (this.crops.length - 1))];

                this.pendingEvents.push({
                    type: 'market',
                    cropId: crop.id,
                    effect: event.effect,
                    magnitude: event.magnitude,
                    day: this.day + Math.floor(Math.random() * 10)
                });

                const direction = event.effect === 'increase' ? 'rising' : 'falling';
                this.addEvent(`Market news: ${event.name} expected to affect ${crop.name} prices. Prices ${direction}.`);
            }

            schedulePolicyEvent() {
                const events = [
                    { name: 'Water Restriction', effect: 'water_cost', magnitude: 1.5 },
                    { name: 'Environmental Subsidy', effect: 'subsidy', magnitude: 5000 },
                    { name: 'New Regulations', effect: 'compliance_cost', magnitude: 3000 },
                    { name: 'Tax Break', effect: 'tax_refund', magnitude: 4000 }
                ];

                const event = events[Math.floor(Math.random() * events.length)];

                this.pendingEvents.push({
                    type: 'policy',
                    policyName: event.name,
                    effect: event.effect,
                    magnitude: event.magnitude,
                    day: this.day + Math.floor(Math.random() * 20)
                });

                this.addEvent(`Policy update: New ${event.name} policy being considered by local government.`);
            }

            scheduleTechnologyEvent() {
                const events = [
                    { name: 'Research Breakthrough', effect: 'research_discount', magnitude: 0.7 },
                    { name: 'Innovation Grant', effect: 'research_bonus', magnitude: 10000 },
                    { name: 'Climate Tech Expo', effect: 'research_options', magnitude: 2 }
                ];

                const event = events[Math.floor(Math.random() * events.length)];

                this.pendingEvents.push({
                    type: 'technology',
                    techName: event.name,
                    effect: event.effect,
                    magnitude: event.magnitude,
                    day: this.day + Math.floor(Math.random() * 15)
                });

                this.addEvent(`Technology news: ${event.name} event announced.`);
            }

        processPendingEvents() {
            // Process any events that should occur today
            const activeEvents = this.pendingEvents.filter(event => event.day === this.day);
        
            activeEvents.forEach(event => {
                switch (event.type) {
                    case 'rain':
                        this.applyRainEvent(event);
                        break;
                    case 'drought':
                        this.applyDroughtEvent(event);
                        break;
                    case 'heatwave':
                        this.applyHeatwaveEvent(event);
                        break;
                    case 'frost':
                        this.applyFrostEvent(event);
                        break;
                    case 'market':
                        this.applyMarketEvent(event);
                        break;
                    case 'policy':
                        this.applyPolicyEvent(event);
                        break;
                    case 'technology':
                        this.applyTechnologyEvent(event);
                        break;
                }
            });
        
            // Remove processed events
            this.pendingEvents = this.pendingEvents.filter(event => event.day !== this.day);
        }

        // Add this function to handle rain events
        applyRainEvent(event) {
            const isHeavy = event.intensity === 'heavy';
        
            // Increase water levels
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    const cell = this.grid[row][col];
        
                    // Increased water from rain
                    const waterIncrease = isHeavy ? 30 : 15;
                    cell.waterLevel = Math.min(100, cell.waterLevel + waterIncrease);
        
                    // Heavy rain affects soil (erosion)
                    if (isHeavy && !this.hasTechnology('no_till_farming')) {
                        cell.soilHealth = Math.max(10, cell.soilHealth - 5);
                    }
                }
            }
        
            // Increase water reserve
            this.waterReserve = Math.min(100, this.waterReserve + (isHeavy ? 20 : 10));
        
            // Track climate events in test metrics
            if (this.testMode) {
                this.testMetrics.climateEvents.rain++;
                this.debugLog(`${isHeavy ? 'Heavy' : 'Moderate'} rain has increased water levels. Water reserve: ${this.waterReserve}%`);
            } else {
                const message = isHeavy
                    ? 'Heavy rainfall has increased water levels but may have caused soil erosion.'
                    : 'Moderate rainfall has increased water levels across your farm.';
                
                this.addEvent(message);
            }
        
            // Apply technology effects
            if (this.hasTechnology('no_till_farming') && isHeavy) {
                this.addEvent('No-till farming practices have prevented erosion from heavy rain.');
            }
        }
        
        // Also make sure to add the function to handle heatwave events
        applyHeatwaveEvent(event) {
            // Apply heat resistance technology if available
            let protection = 1.0;
            if (this.hasTechnology('silvopasture')) {
                protection = this.getTechEffectValue('heatResistance', 1.0);
            }
        
            // Impact on crops and water levels
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    const cell = this.grid[row][col];
        
                    // Increase water evaporation
                    const waterLoss = Math.round(10 * protection);
                    cell.waterLevel = Math.max(0, cell.waterLevel - waterLoss);
        
                    // Impact on expected yield based on crop heat sensitivity
                    if (cell.crop.id !== 'empty') {
                        const heatImpact = Math.round(10 * cell.crop.heatSensitivity * protection);
                        cell.expectedYield = Math.max(10, cell.expectedYield - heatImpact);
                    }
                }
            }
        
            // Decrease water reserve
            this.waterReserve = Math.max(0, this.waterReserve - Math.round(10 * protection));
        
            // Track climate events in test metrics
            if (this.testMode) {
                this.testMetrics.climateEvents.heatwave++;
                this.debugLog(`Heatwave event - Water reserve: ${this.waterReserve}%, impact reduced: ${protection < 1.0}`);
            } else {
                this.addEvent(`Heatwave conditions! Increased water evaporation and stress on crops.`, true);
        
                // If protection technology is active
                if (protection < 1.0) {
                    this.addEvent(`Your silvopasture technique is providing shade and reducing heat damage.`);
                }
            }
        
            // Schedule heatwave to continue
            if (event.duration > 1) {
                // Check if this event already exists to prevent duplication
                const nextDay = this.day + 1;
                const existingEventIndex = this.pendingEvents.findIndex(e => 
                    e.type === 'heatwave' && e.day === nextDay);
                
                // Only add the next day's event if it doesn't already exist
                if (existingEventIndex === -1) {
                    this.pendingEvents.push({
                        ...event,
                        day: nextDay,
                        duration: event.duration - 1
                    });
                }
            } else if (!this.testMode) {
                this.addEvent(`The heatwave has ended.`);
            }
        }
                
        applyDroughtEvent(event) {
            // Skip drought effects if water reserve is already too low
            if (this.waterReserve <= 5) {
                if (this.testMode) {
                    this.debugLog("Drought event skipped - water reserves already critically low", 0);
                }
                return; // Skip processing this drought entirely
            }
        
            // Use the event's severity if available, otherwise calculate it
            const severity = event.severity || Math.min(0.7, 0.3 + (this.climate.droughtProbability * 2));
        
            // Apply drought resistance technology if available
            let protection = 1.0;
            if (this.hasTechnology('drought_resistant')) {
                protection = this.getTechEffectValue('droughtResistance', 1.0);
            }
        
            // Reduce water levels - MUCH more gradually
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    const cell = this.grid[row][col];
        
                    // Reduce water decrease to be very gradual - only 2% per day 
                    const waterDecrease = Math.round(2 * severity * protection);
                    cell.waterLevel = Math.max(0, cell.waterLevel - waterDecrease);
        
                    // Very minimal impact on expected yield
                    if (cell.crop.id !== 'empty') {
                        const yieldImpact = Math.round(1 * severity * protection);
                        cell.expectedYield = Math.max(10, cell.expectedYield - yieldImpact);
                    }
                }
            }
        
            // Decrease water reserve VERY gradually (only 3% per day maximum)
            const waterReserveDecrease = Math.min(3, Math.round(3 * severity * protection));
            this.waterReserve = Math.max(0, this.waterReserve - waterReserveDecrease);
        
            // Track climate events in test metrics
            if (this.testMode) {
                this.testMetrics.climateEvents.drought++;
                this.debugLog(`Drought event (severity: ${severity.toFixed(2)}) - Water reserve: ${this.waterReserve}%`);
            } else {
                this.addEvent(`Drought conditions affecting your farm. Water levels are dropping slowly.`, true);
        
                // If protection technology is active
                if (protection < 1.0) {
                    this.addEvent(`Your drought-resistant varieties are helping mitigate the impact.`);
                }
            }
        
            // Schedule drought to continue only if water reserve isn't too low
            if (event.duration > 1 && this.waterReserve > 10) {
                // Check if this event already exists in the pending events to avoid duplication
                const nextDay = this.day + 1;
                const existingEventIndex = this.pendingEvents.findIndex(e => 
                    e.type === 'drought' && e.day === nextDay);
                
                // Only add the next day's event if it doesn't already exist
                if (existingEventIndex === -1) {
                    this.pendingEvents.push({
                        type: 'drought',
                        duration: event.duration - 1,
                        severity: severity, // Keep the same severity for continuity
                        day: nextDay
                    });
                }
            } else if (!this.testMode) {
                this.addEvent(`The drought has ended.`);
            }
        }

            applyFrostEvent(event) {
                // Frost impact
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.grid[row][col];

                        if (cell.crop.id !== 'empty') {
                            // Frost damage based on growth stage (young plants more vulnerable)
                            const frostDamage = cell.growthProgress < 50 ? 30 : 15;

                            // Apply greenhouse protection if available
                            let protection = 1.0;
                            if (this.hasTechnology('greenhouse')) {
                                protection = this.getTechEffectValue('weatherProtection', 1.0);
                            }

                            // Impact on expected yield
                            const yieldImpact = Math.round(frostDamage * protection);
                            cell.expectedYield = Math.max(10, cell.expectedYield - yieldImpact);
                        }
                    }
                }

                this.addEvent(`Frost has affected your crops! Young plants are particularly vulnerable.`, true);

                // If greenhouse technology is active
                if (this.hasTechnology('greenhouse')) {
                    this.addEvent(`Your greenhouse technology has reduced the frost damage.`);
                }
            }

            applyMarketEvent(event) {
                const crop = this.crops.find(c => c.id === event.cropId);
                if (!crop) return;

                // Apply market effect
                if (event.effect === 'increase') {
                    this.marketPrices[crop.id] *= event.magnitude;
                } else {
                    this.marketPrices[crop.id] *= event.magnitude;
                }

                // Clamp to reasonable range
                this.marketPrices[crop.id] = Math.max(0.5, Math.min(2.5, this.marketPrices[crop.id]));

                const direction = event.effect === 'increase' ? 'risen' : 'fallen';
                const percentChange = Math.round(Math.abs(1 - event.magnitude) * 100);

                this.addEvent(`Market update: ${crop.name} prices have ${direction} by ${percentChange}%.`);
            }

            applyPolicyEvent(event) {
                switch (event.effect) {
                    case 'water_cost':
                        this.addEvent(`Water restriction policy enacted. Irrigation costs have increased by ${Math.round((event.magnitude - 1) * 100)}%.`, true);
                        break;
                    case 'subsidy':
                        this.balance += event.magnitude;
                        this.addEvent(`You received a $${event.magnitude} environmental subsidy!`);
                        break;
                    case 'compliance_cost':
                        this.balance -= event.magnitude;
                        this.addEvent(`New regulations have cost you $${event.magnitude} in compliance expenses.`, true);
                        break;
                    case 'tax_refund':
                        this.balance += event.magnitude;
                        this.addEvent(`You received a $${event.magnitude} agricultural tax refund!`);
                        break;
                }

                // Update HUD after policy effects
                this.updateHUD();
            }

            applyTechnologyEvent(event) {
                switch (event.effect) {
                    case 'research_discount':
                        this.addEvent(`Research breakthrough! Technology costs reduced by ${Math.round((1 - event.magnitude) * 100)}% for the next month.`);
                        // This would require updating the research modal to show discounted prices
                        break;
                    case 'research_bonus':
                        this.balance += event.magnitude;
                        this.addEvent(`You received a $${event.magnitude} innovation grant for farm research!`);
                        break;
                    case 'research_options':
                        this.addEvent(`Climate tech expo: New research opportunities may become available soon.`);
                        break;
                }

                // Update HUD after technology effects
                this.updateHUD();
            }

            render() {
                // Clear the canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                // Calculate offset to center the grid
                const offsetX = (this.canvas.width - this.cellSize * this.gridSize) / 2;
                const offsetY = (this.canvas.height - this.cellSize * this.gridSize) / 2;

                // Draw each cell
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const x = offsetX + col * this.cellSize;
                        const y = offsetY + row * this.cellSize;

                        this.drawCell(x, y, row, col);
                    }
                }
            }

            drawCell(x, y, row, col) {
                const cell = this.grid[row][col];

                // Determine cell color based on overlay type
                let fillColor;

                switch (this.currentOverlay) {
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

        // Create test harness
        const testHarness = new TestHarness();

        // Initialize splash screen controls
        document.addEventListener('DOMContentLoaded', () => {
            const splashScreen = document.getElementById('splash-screen');
            const regularGameBtn = document.getElementById('regular-game-btn');
            const testModeBtn = document.getElementById('test-mode-btn');
            const testOptions = document.getElementById('test-options');
            const runSelectedTestsBtn = document.getElementById('run-selected-tests-btn');
            const testAll = document.getElementById('test-all');

            // Show test options when Test Mode button is clicked
            testModeBtn.addEventListener('click', () => {
                testOptions.style.display = 'block';
            });

            // Handle test selection
            document.querySelectorAll('.test-list input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const testId = e.target.id.replace('test-', '');

                    if (testId === 'all') {
                        // When "Run All Tests" is toggled, update all other checkboxes
                        const isChecked = e.target.checked;
                        document.querySelectorAll('.test-list input[type="checkbox"]:not(#test-all)').forEach(cb => {
                            cb.checked = isChecked;
                            cb.disabled = isChecked;
                        });
                    } else {
                        // Individual test selection
                        if (e.target.checked) {
                            testHarness.selectTest(testId);
                        } else {
                            testHarness.deselectTest(testId);
                        }
                    }
                });
            });

            // Start regular game
            regularGameBtn.addEventListener('click', () => {
                splashScreen.style.display = 'none';
                startRegularGame();
            });

            // Run selected tests
            runSelectedTestsBtn.addEventListener('click', () => {
                if (testAll.checked) {
                    testHarness.selectAllTests();
                }

                if (testHarness.selectedTests.length === 0) {
                    alert('Please select at least one test to run.');
                    return;
                }

                splashScreen.style.display = 'none';
                testHarness.runSelectedTests();
            });
        });

        function startRegularGame() {
            // Initialize the game normally
            const game = new CaliforniaClimateFarmer();
            game.start();
        }
