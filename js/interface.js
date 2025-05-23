class Interface {
    constructor(gameInstance) {
        this.game = gameInstance;

        this.pageQuoteEl = document.getElementById("page_quote");
        this.totalWalkersCreatedEl = document.getElementById("total_walkers_created");
        this.populationListEl = document.getElementById("population_list");
        this.historyListEl = document.getElementById("history_list");

        this.mutationChanceSelectEl = document.getElementById("mutation_chance");
        this.mutationAmountSelectEl = document.getElementById("mutation_stddev");
        this.renderFpsSelectEl = document.getElementById("render_fps");
        this.simulationFpsSelectEl = document.getElementById("simulation_fps");

        this.simCanvasEl = document.getElementById("sim_canvas");
        this.mapelitesCanvasEl = document.getElementById("mapelites_canvas");
        this.genepoolCanvasEl = document.getElementById("genepool_canvas");

        this.lastPopulationUpdate = undefined;
        this.lastHistoryUpdate = undefined;
        this.lastWalkerCountUpdate = undefined;
        this.selectedMapElitesBin = -1;
        this.currentSelectedGenePool = null;
        this.activeHistory = null;

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
    }

    initializeUI() {
        this.activeHistory = this.game.mapelites.history;

        this.setQuote();
        setInterval(() => this.setQuote(), 60000);

        this.setupSelectControl(this.mutationChanceSelectEl, "mutation_chance", true);
        this.setupSelectControl(this.mutationAmountSelectEl, "mutation_stddev", true);

        if (this.renderFpsSelectEl) {
            for (let k = 0; k < this.renderFpsSelectEl.options.length; k++) {
                if (parseInt(this.renderFpsSelectEl.options[k].value) === this.game.gameLoop.render_fps) {
                    this.renderFpsSelectEl.options[k].selected = true;
                    break;
                }
            }
            this.renderFpsSelectEl.onchange = () => {
                this.game.gameLoop.setRenderFps(parseInt(this.renderFpsSelectEl.value));
            };
        }

        if (this.simulationFpsSelectEl) {
            for (let k = 0; k < this.simulationFpsSelectEl.options.length; k++) {
                if (parseInt(this.simulationFpsSelectEl.options[k].value) === this.game.gameLoop.simulation_fps) {
                    this.simulationFpsSelectEl.options[k].selected = true;
                    break;
                }
            }
            this.simulationFpsSelectEl.onchange = () => {
                this.game.gameLoop.setSimulationFps(parseInt(this.simulationFpsSelectEl.value));
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

        document.body.addEventListener('click', (event) => {
            if (this.selectedMapElitesBin !== -1) {
                const target = event.target;

                if (this.mapelitesCanvasEl && (target === this.mapelitesCanvasEl || this.mapelitesCanvasEl.contains(target))) {
                    return;
                }

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

        this.updateUI();
    }

    updateUI() {
        this.updateWalkerCount();
        this.updatePopulationList();
        this.updateHistoryList();
    }

    setupSelectControl(selectElement, configPropertyKey, isFloat) {
        if (selectElement) {
            let configValueToMatch = this.game.config[configPropertyKey];
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
                this.game.config[configPropertyKey] = newValue;
                const lowerCaseConfigProperty = configPropertyKey.toLowerCase();
                if (this.game.config.hasOwnProperty(lowerCaseConfigProperty) && lowerCaseConfigProperty !== configPropertyKey) {
                     this.game.config[lowerCaseConfigProperty] = newValue;
                }
            };
        }
    }

    updateNameList(nameListEl, walkerData, isHistory = false) {
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
        td.appendChild(document.createTextNode(walkerData.score.toFixed(2) + " (H: " + walkerData.mean_head_height.toFixed(2) + ", D: " + walkerData.max_upper_torso_position.toFixed(2) + ")"));
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
    }

    updatePopulationList(force = false) {
        let now = performance.now();
        if (force === true || this.lastPopulationUpdate === undefined || now - this.lastPopulationUpdate >= 500) {
            this.lastPopulationUpdate = now;
            if (this.populationListEl && this.game.population) {
                this.populationListEl.innerHTML = "";
                for (let k = 0; k < this.game.population.walkers.length; k++) {
                    this.updateNameList(this.populationListEl, this.game.population.walkers[k]);
                }
            }
        }
    }

    updateHistoryList(force = false) {
        let now = performance.now();
        if (force === true || this.lastHistoryUpdate === undefined || now - this.lastHistoryUpdate >= 500) {
            this.lastHistoryUpdate = now;

            if (this.historyListEl && this.activeHistory) {
                this.historyListEl.innerHTML = "";
                for (let k = 0; k < this.activeHistory.walkers.length; k++) {
                    this.updateNameList(this.historyListEl, this.activeHistory.walkers[k], true);
                }
            }
        }
    }

    updateWalkerCount() {
        let now = performance.now();
        if (this.lastWalkerCountUpdate === undefined || now - this.lastWalkerCountUpdate >= 500) {
            this.lastWalkerCountUpdate = now;
            if (this.totalWalkersCreatedEl && this.game.population) {
                this.totalWalkersCreatedEl.innerHTML = this.game.population.getTotalWalkersCreated();
            }
        }
    }

    setQuote() {
        if (this.pageQuoteEl) {
            this.pageQuoteEl.innerHTML = '"'+this.quotes[Math.floor(Math.random() * this.quotes.length)]+'"';
        }
    }

    deselectMapElitesBin() {
        if (this.selectedMapElitesBin === -1) return;
        this.selectedMapElitesBin = -1;
        this.currentSelectedGenePool = null;
        if (this.game.mapelites) {
            this.activeHistory = this.game.mapelites.history;
        }
        if (this.game.renderer) {
            this.game.renderer.drawMapElites();
            this.game.renderer.drawGenePool();
        }
        this.updateHistoryList(true);
    }

    findClickedMapElitesBin(event) {
        if (!this.game.mapelites || !this.game.mapelites.bins || !this.mapelitesCanvasEl || this.game.mapelites.bins.length === 0) {
            return null;
        }
        const mapelites = this.game.mapelites;
        const threshold = mapelites.threshold;
        const mapElitesDisplayRange = mapelites.range;
        if (mapElitesDisplayRange <= 0) {
            return null;
        }
        const bins = mapelites.bins;
        const canvas = this.mapelitesCanvasEl;
        const canvasWidth = canvas.width;
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        for (let i = 0; i < bins.length; i++) {
            const bin = bins[i];
            const xPixelStart = canvasWidth * (bin.low - threshold) / mapElitesDisplayRange;
            const xPixelEnd = canvasWidth * (bin.high - threshold) / mapElitesDisplayRange;
            if (clickX >= xPixelStart && clickX < xPixelEnd) {
                return bins[i];
            }
        }
        return null;
    }

    handleMapElitesClick(event) {
        if (!this.game.mapelites || !this.game.mapelites.bins || this.game.mapelites.bins.length === 0) {
            return;
        }
        const bin = this.findClickedMapElitesBin(event);
        if (bin) {
            this.selectedMapElitesBin = bin.index;
            this.currentSelectedGenePool = bin.genepool;
            this.activeHistory = bin.genepool.history;
            if (this.game.renderer) {
                this.game.renderer.drawMapElites();
                this.game.renderer.drawGenePool();
            }
            this.updateHistoryList(true);
        }
    }

    handleMapElitesRightClick(event) {
        event.preventDefault();
        if (!this.game.mapelites || !this.game.mapelites.bins) return;

        const bin = this.findClickedMapElitesBin(event);
        if (bin) {
            bin.enabled = !bin.enabled;
            if (this.game.renderer) {
                this.game.renderer.drawMapElites();
            }
        }
    }
}
