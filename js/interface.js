quotes = [
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

setRenderFps = function(fps) {
    config.render_fps = fps;
    if (globals.render_interval)
        clearInterval(globals.render_interval);
    if (fps > 0 && config.simulation_fps > 0) {
        globals.render_interval = setInterval(drawFrame, Math.round(1000/config.render_fps));
    }
}

setSimulationFps = function(fps) {
    config.simulation_fps = fps;
    clearInterval(globals.simulation_interval);
    if (fps > 0) {
        globals.simulation_interval = setInterval(simulationStep, Math.round(1000/config.simulation_fps));
        if (globals.paused) {
            globals.paused = false;
            if (config.render_fps > 0) {
                globals.render_interval = setInterval(drawFrame, Math.round(1000/config.render_fps));
            }
        }
    } else {
        clearInterval(globals.render_interval);
        globals.paused = true;
    }
}

updateNameList = function(name_list, walker, is_history = false) {
    let tr = document.createElement("TR");
    let td = document.createElement("TD");
    td.className = "id";
    td.appendChild(document.createTextNode(walker.id));
    tr.appendChild(td);
    td = document.createElement("TD");
    td.className = "name";
    td.appendChild(document.createTextNode(walker.name));
    tr.appendChild(td);
    td = document.createElement("TD");
    td.className = "score";
    td.appendChild(document.createTextNode(walker.score.toFixed(2) + " (H: " + walker.mean_head_height.toFixed(2) + ", V: " + walker.mean_forward_velocity.toFixed(2) + ")"));
    tr.appendChild(td);
    if (is_history === true) {
        if (name_list.firstChild) {
            name_list.insertBefore(tr, name_list.firstChild)
        } else {
            name_list.appendChild(tr);
        }
    } else {
        name_list.appendChild(tr);
    }
}

updatePopulationList = function(force = false) {
    let ms = +Date.now();
    if (force === true || globals.last_population_update === undefined || ms - globals.last_population_update >= 500) {
        globals.last_population_update = ms;
        let population_list = document.getElementById("population_list");
        population_list.innerHTML = "";
        for (let k = 0; k < globals.population.walkers.length; k++) {
            updateNameList(population_list, globals.population.walkers[k]);
        }
    }
}

updateHistoryList = function(force = false) {
    let ms = +Date.now();
    if (force === true || globals.last_history_update === undefined || ms - globals.last_history_update >= 500) {
        globals.last_history_update = ms;
        let history_list = document.getElementById("history_list");
        history_list.innerHTML = "";
        for (let k = 0; k < globals.history.walkers.length; k++) {
            updateNameList(history_list, globals.history.walkers[k], true);
        }
    }
}

updateWalkerCount = function() {
    let ms = +Date.now();
    if (globals.last_walker_count_update === undefined || ms - globals.last_walker_count_update >= 500) {
        globals.last_walker_count_update = ms;
        document.getElementById("total_walkers_created").innerHTML = globals.population.getTotalWalkersCreated();
    }
}

setQuote = function() {
    let quoteEl = document.getElementById("page_quote");
    if (quoteEl) {
        quoteEl.innerHTML = '"'+quotes[Math.floor(Math.random() * quotes.length)]+'"';
    }
}

function setupSelectControl(elementId, configProperty, isFloat) {
    let selectElement = document.getElementById(elementId);
    if (selectElement) {
        let lowerCaseConfigProperty = configProperty.toLowerCase();

        for (let k = 0; k < selectElement.options.length; k++) {
            let optionValue = isFloat ? parseFloat(selectElement.options[k].value) : parseInt(selectElement.options[k].value);
            let configValue = isFloat ? parseFloat(config[lowerCaseConfigProperty]) : parseInt(config[lowerCaseConfigProperty]);

            if (config[lowerCaseConfigProperty] === undefined && config[configProperty] !== undefined) {
                configValue = isFloat ? parseFloat(config[configProperty]) : parseInt(config[configProperty]);
            }

            if (isFloat ? Math.abs(optionValue - configValue) < 0.0001 : optionValue === configValue) {
                selectElement.options[k].selected = true;
                break;
            }
        }
        selectElement.onchange = function() {
            let newValue = isFloat ? parseFloat(this.value) : parseInt(this.value);
            config[lowerCaseConfigProperty] = newValue;
            if (config[configProperty] !== undefined && lowerCaseConfigProperty !== configProperty) {
                config[configProperty] = newValue;
            }

        };
    }
}

interfaceSetup = function() {
    setupSelectControl("mutation_chance", "mutation_chance", true);
    setupSelectControl("mutation_amount", "mutation_amount", true);
    setupSelectControl("motor_noise", "motor_noise", true);

    let render_fps_sel = document.getElementById("render_fps");
    if (render_fps_sel) {
        for (let k = 0; k < render_fps_sel.options.length; k++) {
            if (render_fps_sel.options[k].value == config.render_fps) {
                render_fps_sel.options[k].selected = true;
                break;
            }
        }
        render_fps_sel.onchange = function() {
            setRenderFps(parseInt(this.value));
        }
    }

    let simulation_fps_sel = document.getElementById("simulation_fps");
    if (simulation_fps_sel) {
        for (let k = 0; k < simulation_fps_sel.options.length; k++) {
            if (simulation_fps_sel.options[k].value == config.simulation_fps) {
                simulation_fps_sel.options[k].selected = true;
                break;
            }
        }
        simulation_fps_sel.onchange = function() {
            setSimulationFps(parseInt(this.value));
        }
    }
    
    if (globals.mapelites_canvas) {
        globals.mapelites_canvas.addEventListener('click', function(e) { 
            handleMapElitesClick(e); 
        });
        globals.mapelites_canvas.addEventListener('contextmenu', function(e) { 
            handleMapElitesRightClick(e); 
        });
    }

    document.body.addEventListener('click', function(event) {
        if (globals.selectedMapElitesBin !== -1) {
            const target = event.target;
            if (globals.mapelites_canvas && (target === globals.mapelites_canvas || globals.mapelites_canvas.contains(target))) {
                return;
            }
            const protectedAreas = [
                globals.genepool_canvas,
                document.getElementById('history_panel'),
                document.getElementById('population_panel'),
                document.getElementById('controls_settings_panel'),
            ];
            for (const area of protectedAreas) {
                if (area && (target === area || area.contains(target))) {
                    return;
                }
            }
            deselectMapElitesBin();
        }
    });
}

function deselectMapElitesBin() {
    if (globals.selectedMapElitesBin === -1) return;
    globals.selectedMapElitesBin = -1;
    globals.genepool = null; 
    globals.history = globals.mapelites.history; 
    drawMapElites();
    drawGenePool();
    updateHistoryList(true); 
}

function findClickedMapElitesBin(event) {
    const bins = globals.mapelites.bins;
    const canvas = globals.mapelites_canvas;
    const canvasWidth = canvas.width;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    for (let i = 0; i < bins.length; i++) {
        const bin = bins[i];
        const startX = canvasWidth * bin.low;
        const endX = canvasWidth * bin.high;
        if (clickX >= startX && clickX < endX) {
            return bins[i];
        }
    }
    return null;
}

function handleMapElitesClick(event) {
    if (!globals.mapelites || !globals.mapelites.bins || globals.mapelites.bins.length === 0) {
        return;
    }
    const bin = findClickedMapElitesBin(event);
    if (bin) {
        globals.selectedMapElitesBin = bin.index;
        globals.genepool = bin.genepool;
        globals.history = bin.genepool.history;
        drawMapElites();
        drawGenePool();
        updateHistoryList(true);
    }
}

function handleMapElitesRightClick(event) {
    event.preventDefault(); // Prevent browser context menu
    const bin = findClickedMapElitesBin(event);
    if (bin) {
        bin.enabled = !bin.enabled;
        drawMapElites();
    }
}