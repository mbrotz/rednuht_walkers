
let Interface = function() {
    this.__constructor.apply(this, arguments);
}

Interface.prototype.__constructor = function(config, gameInstance) {
    this.config = config;
    this.game = gameInstance; // The GameLoop instance

    // Cache DOM elements
    this.pageQuoteEl = document.getElementById("page_quote");
    this.totalWalkersCreatedEl = document.getElementById("total_walkers_created");
    this.populationListEl = document.getElementById("population_list");
    this.historyListEl = document.getElementById("history_list");

    this.mutationChanceSelectEl = document.getElementById("mutation_chance");
    this.mutationAmountSelectEl = document.getElementById("mutation_amount");
    this.renderFpsSelectEl = document.getElementById("render_fps");
    this.simulationFpsSelectEl = document.getElementById("simulation_fps");

    this.mapelitesCanvasEl = document.getElementById("mapelites_canvas");
    this.genepoolCanvasEl = document.getElementById("genepool_canvas"); // Though drawing is in draw.js, Interface might need to know about it

    // UI State
    this.lastPopulationUpdate = undefined;
    this.lastHistoryUpdate = undefined;
    this.lastWalkerCountUpdate = undefined;
    this.selectedMapElitesBin = -1;
    this.currentSelectedGenePool = null; // This will hold the genepool of the selected MAP-Elites bin

    this.quotes = [
        "It is not the strongest of the species that survives, nor the most intelligent; it is the one most adaptable to change.",
        "Man selects only for his own good: Nature only for that of the being which she tends.",
        "Endless forms most beautiful and most wonderful have been, and are being, evolved.",
        "The survival of the fittest.",
        "Nature's grand experiment, one generation at a time.",
        "From so simple a beginning, endless forms.",
        "Adapt, or become a fossil.",
        "The slow grind of natural selection.",
        "Evolution: the greatest tinkerer.",
        "Life finds a way, through variation and selection.",
        "Every creature a masterpiece of adaptation.",
        "The tapestry of life, woven by evolution's hand.",
        "Witnessing the dance of genes and environment.",
        "A struggle for existence, leading to perfection of structure.",
        "The origin of species, playing out before your eyes.",
        "One common ancestor, countless branching paths.",
        "Evolution: a story written in the language of DNA.",
        "Darwin's legacy: understanding life's unfolding.",
        "The beauty of evolution is in its imperfections and its progress.",
        "From primordial soup to... well, this."
    ];

    this._initializeUI();
    this.setQuote();
    setInterval(() => this.setQuote(), 60000);
};

Interface.prototype._initializeUI = function() {
    // Setup for config-based select controls
    this._setupSelectControl(this.mutationChanceSelectEl, "mutation_chance", true);
    this._setupSelectControl(this.mutationAmountSelectEl, "mutation_amount", true);


    // Setup for GameLoop FPS controls
    if (this.renderFpsSelectEl) {
        for (let k = 0; k < this.renderFpsSelectEl.options.length; k++) {
            if (parseInt(this.renderFpsSelectEl.options[k].value) === this.game.render_fps) {
                this.renderFpsSelectEl.options[k].selected = true;
                break;
            }
        }
        this.renderFpsSelectEl.onchange = () => {
            this.game.setRenderFps(parseInt(this.renderFpsSelectEl.value));
        };
    }

    if (this.simulationFpsSelectEl) {
        for (let k = 0; k < this.simulationFpsSelectEl.options.length; k++) {
            if (parseInt(this.simulationFpsSelectEl.options[k].value) === this.game.simulation_fps) {
                this.simulationFpsSelectEl.options[k].selected = true;
                break;
            }
        }
        this.simulationFpsSelectEl.onchange = () => {
            this.game.setSimulationFps(parseInt(this.simulationFpsSelectEl.value));
        };
    }
    
    if (this.mapelitesCanvasEl) {
        this.mapelitesCanvasEl.addEventListener('click', (e) => { 
            this.handleMapElitesClick(e); 
        });
        this.mapelitesCanvasEl.addEventListener('contextmenu', (e) => { 
            this.handleMapElitesRightClick(e); 
        });
    }

    // Global click listener to deselect MAP-Elites bin
    document.body.addEventListener('click', (event) => {
        if (this.selectedMapElitesBin !== -1) {
            const target = event.target;
            // Check if click is on mapelites_canvas itself
            if (this.mapelitesCanvasEl && (target === this.mapelitesCanvasEl || this.mapelitesCanvasEl.contains(target))) {
                return;
            }
            // Check if click is within other protected UI areas
            const protectedAreasIds = ['genepool_canvas', 'history_panel', 'population_panel', 'controls_settings_panel'];
            const protectedAreas = protectedAreasIds.map(id => document.getElementById(id));
            
            for (const area of protectedAreas) {
                if (area && (target === area || area.contains(target))) {
                    return;
                }
            }
            this.deselectMapElitesBin();
        }
    });
};

Interface.prototype._setupSelectControl = function(selectElement, configPropertyKey, isFloat) {
    if (selectElement) {
        // Use this.config for initial values and updates
        let configValueToMatch = this.config[configPropertyKey];

        for (let k = 0; k < selectElement.options.length; k++) {
            let optionValue = isFloat ? parseFloat(selectElement.options[k].value) : parseInt(selectElement.options[k].value);
            let currentConfigValue = isFloat ? parseFloat(configValueToMatch) : parseInt(configValueToMatch);

            if (isFloat ? Math.abs(optionValue - currentConfigValue) < 0.0001 : optionValue === currentConfigValue) {
                selectElement.options[k].selected = true;
                break;
            }
        }
        selectElement.onchange = () => {
            let newValue = isFloat ? parseFloat(selectElement.value) : parseInt(selectElement.value);
            this.config[configPropertyKey] = newValue;
            // Ensure original config object (if different casing) is also updated if necessary.
            // This handles cases where config might have inconsistent casing.
            // A more robust solution would be to normalize all config keys initially.
            const lowerCaseConfigProperty = configPropertyKey.toLowerCase();
            if (this.config[lowerCaseConfigProperty] !== undefined && lowerCaseConfigProperty !== configPropertyKey) {
                 this.config[lowerCaseConfigProperty] = newValue;
            }
            if (config[configPropertyKey.toLowerCase()] !== undefined) { // Update global config directly as well
                 config[configPropertyKey.toLowerCase()] = newValue;
            } else if (config[configPropertyKey] !== undefined) {
                 config[configPropertyKey] = newValue;
            }
        };
    }
};

Interface.prototype._updateNameList = function(nameListEl, walkerData, isHistory = false) {
    let tr = document.createElement("TR");
    let td = document.createElement("TD");
    td.className = "id";
    td.appendChild(document.createTextNode(walkerData.id));
    tr.appendChild(td);
    td = document.createElement("TD");
    td.className = "name";
    td.appendChild(document.createTextNode(walkerData.name));
    tr.appendChild(td);
    td = document.createElement("TD");
    td.className = "score";
    td.appendChild(document.createTextNode(walkerData.score.toFixed(2) + " (H: " + walkerData.mean_head_height.toFixed(2) + ", V: " + walkerData.mean_forward_velocity.toFixed(2) + ")"));
    tr.appendChild(td);
    if (isHistory === true) {
        if (nameListEl.firstChild) {
            nameListEl.insertBefore(tr, nameListEl.firstChild)
        } else {
            nameListEl.appendChild(tr);
        }
    } else {
        nameListEl.appendChild(tr);
    }
};

Interface.prototype.updatePopulationList = function(force = false) {
    let now = performance.now();
    if (force === true || this.lastPopulationUpdate === undefined || now - this.lastPopulationUpdate >= 500) {
        this.lastPopulationUpdate = now;
        if (this.populationListEl && globals.population) {
            this.populationListEl.innerHTML = "";
            for (let k = 0; k < globals.population.walkers.length; k++) {
                this._updateNameList(this.populationListEl, globals.population.walkers[k]);
            }
        }
    }
};

Interface.prototype.updateHistoryList = function(force = false) {
    let now = performance.now();
    if (force === true || this.lastHistoryUpdate === undefined || now - this.lastHistoryUpdate >= 500) {
        this.lastHistoryUpdate = now;
        // globals.history can point to different history objects based on selection
        if (this.historyListEl && globals.history) {
            this.historyListEl.innerHTML = "";
            for (let k = 0; k < globals.history.walkers.length; k++) {
                this._updateNameList(this.historyListEl, globals.history.walkers[k], true);
            }
        }
    }
};

Interface.prototype.updateWalkerCount = function() {
    let now = performance.now();
    if (this.lastWalkerCountUpdate === undefined || now - this.lastWalkerCountUpdate >= 500) {
        this.lastWalkerCountUpdate = now;
        if (this.totalWalkersCreatedEl && globals.population) {
            this.totalWalkersCreatedEl.innerHTML = globals.population.getTotalWalkersCreated();
        }
    }
};

Interface.prototype.setQuote = function() {
    if (this.pageQuoteEl) {
        this.pageQuoteEl.innerHTML = '"'+this.quotes[Math.floor(Math.random() * this.quotes.length)]+'"';
    }
};

Interface.prototype.deselectMapElitesBin = function() {
    if (this.selectedMapElitesBin === -1) return;
    this.selectedMapElitesBin = -1;
    this.currentSelectedGenePool = null; 
    if (globals.mapelites) { // Ensure mapelites is initialized
        globals.history = globals.mapelites.history; 
    }
    drawMapElites(); // Assumes drawMapElites is global
    drawGenePool();  // Assumes drawGenePool is global
    this.updateHistoryList(true); 
};

Interface.prototype._findClickedMapElitesBin = function(event) {
    if (!globals.mapelites || !globals.mapelites.bins || !this.mapelitesCanvasEl) {
        return null;
    }
    const threshold = globals.mapelites.threshold;
    const bins = globals.mapelites.bins;
    const canvas = this.mapelitesCanvasEl;
    const canvasWidth = canvas.width;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    for (let i = 0; i < bins.length; i++) {
        const bin = bins[i];
        const binRangeStart = bin.low - threshold; // Relative to the start of the plottable area
        const binRangeEnd = bin.high - threshold;  // Relative to the start of the plottable area
        
        // The plottable area itself is (1.0 - threshold) of the canvas width
        // So, the actual width of the plottable part of map elites is canvasWidth * (mapelites.range / (1 - threshold))
        // Or, more simply, the coordinates are scaled by canvasWidth / (total range represented, which is 1.0 - threshold)
        // For example, if threshold is 0.2, then bin.low/high are in [0.2, 1.0]. We map [0.2, 1.0] to [0, canvasWidth].
        // So, map (val - threshold) to canvas pixels.
        // Example: if bin.low = 0.2 (threshold), this is x=0. if bin.high = 1.0, this is x = canvasWidth.

        const startX = canvasWidth * binRangeStart; // Incorrect - this assumes the bin.low/high are already 0-1 scaled from threshold.
                                                   // bin.low/high are absolute head heights.
                                                   // The drawn range on canvas is from mapelites.threshold to 1.0
                                                   // The width of this range is (1.0 - mapelites.threshold)
                                                   // A position 'p' in [mapelites.threshold, 1.0] maps to pixel (p - mapelites.threshold) / (1.0 - mapelites.threshold) * canvasWidth
        
        // Correct calculation as per drawMapElites:
        // x_start = canvasWidth * (bin.low - threshold);  <-- this is what drawMapElites uses, so this is good.
        // x_end = canvasWidth * (bin.high - threshold);

        const xPixelStart = canvasWidth * (bin.low - threshold);
        const xPixelEnd = canvasWidth * (bin.high - threshold);


        if (clickX >= xPixelStart && clickX < xPixelEnd) {
            return bins[i];
        }
    }
    return null;
};

Interface.prototype.handleMapElitesClick = function(event) {
    if (!globals.mapelites || !globals.mapelites.bins || globals.mapelites.bins.length === 0) {
        return;
    }
    const bin = this._findClickedMapElitesBin(event);
    if (bin) {
        this.selectedMapElitesBin = bin.index;
        this.currentSelectedGenePool = bin.genepool;
        globals.history = bin.genepool.history; // Switch global history context
        drawMapElites();
        drawGenePool();
        this.updateHistoryList(true);
    }
};

Interface.prototype.handleMapElitesRightClick = function(event) {
    event.preventDefault();
    if (!globals.mapelites || !globals.mapelites.bins) return;

    const bin = this._findClickedMapElitesBin(event);
    if (bin) {
        bin.enabled = !bin.enabled;
        drawMapElites();
    }
};
