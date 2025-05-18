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
  "From primordial soup to… well, *this*."
];

printNames = function(walkers) {
  var name_list = document.getElementById("name_list");
  name_list.innerHTML = "";
  for(var k = 0; k < walkers.length; k++) {
    var tr = document.createElement("TR");
    var td = document.createElement("TD");
    td.className = "name";
    td.appendChild(document.createTextNode(walkers[k].name));
    tr.appendChild(td);

    td = document.createElement("TD");
    td.className = "score";
    // Use the unified fitness_score
    td.appendChild(document.createTextNode(walkers[k].fitness_score.toFixed(2)));
    tr.appendChild(td);
    name_list.appendChild(tr);
  }
}

printChampion = function(walker) {
  var champ_list = document.getElementById("champ_list"); 
  var tr = document.createElement("TR");

  var tdId = document.createElement("TD");
  tdId.className = "generation"; 
  tdId.appendChild(document.createTextNode(walker.id)); 
  tr.appendChild(tdId);

  var tdName = document.createElement("TD");
  tdName.className = "name";
  tdName.appendChild(document.createTextNode(walker.name));
  tr.appendChild(tdName);

  var tdScore = document.createElement("TD");
  tdScore.className = "score";
  // Use the unified fitness_score (which is its final score upon elimination)
  tdScore.appendChild(document.createTextNode(walker.fitness_score.toFixed(2)));
  tr.appendChild(tdScore);

  if (champ_list.firstChild) {
    champ_list.insertBefore(tr, champ_list.firstChild);
  } else {
    champ_list.appendChild(tr);
  }

  while (champ_list.rows.length > config.population_size) { 
    champ_list.removeChild(champ_list.rows[champ_list.rows.length - 1]);
  }
}

updateWalkerTotalCount = function(number) { 
  document.getElementById("gen_number").innerHTML = number;
}

updatePoolStatsDisplay = function() {
  var champPoolSizeEl = document.getElementById("champ_pool_size_display");
  var champPoolAvgScoreEl = document.getElementById("champ_pool_avg_score_display");
  var driftPoolSizeEl = document.getElementById("drift_pool_size_display");
  var driftPoolAvgScoreEl = document.getElementById("drift_pool_avg_score_display");

  var champPoolSize = globals.champion_genomes.length;
  var champTotalScore = 0;
  for (var i = 0; i < champPoolSize; i++) {
    champTotalScore += globals.champion_genomes[i].score;
  }
  var champAvgScore = champPoolSize > 0 ? (champTotalScore / champPoolSize) : 0;

  var driftPoolSize = globals.drift_genomes.length;
  var driftTotalScore = 0;
  for (var i = 0; i < driftPoolSize; i++) {
    driftTotalScore += globals.drift_genomes[i].score;
  }
  var driftAvgScore = driftPoolSize > 0 ? (driftTotalScore / driftPoolSize) : 0;

  if (champPoolSizeEl) champPoolSizeEl.innerHTML = champPoolSize;
  if (champPoolAvgScoreEl) champPoolAvgScoreEl.innerHTML = champAvgScore.toFixed(2);
  if (driftPoolSizeEl) driftPoolSizeEl.innerHTML = driftPoolSize;
  if (driftPoolAvgScoreEl) driftPoolAvgScoreEl.innerHTML = driftAvgScore.toFixed(2);
}

setQuote = function() {
  var quoteEl = document.getElementById("page_quote");
  if (quoteEl) {
    quoteEl.innerHTML = '"'+quotes[Math.floor(Math.random() * quotes.length)]+'"';
  }
}

function setupSelectControl(elementId, configProperty, isFloat) {
  var selectElement = document.getElementById(elementId);
  if (selectElement) {
    // Ensure configProperty is lowercase if it's coming from an older mixed-case setup
    var lowerCaseConfigProperty = configProperty.toLowerCase();

    for (var k = 0; k < selectElement.options.length; k++) {
      var optionValue = isFloat ? parseFloat(selectElement.options[k].value) : parseInt(selectElement.options[k].value);
      // Access config with lowercase key
      var configValue = isFloat ? parseFloat(config[lowerCaseConfigProperty]) : parseInt(config[lowerCaseConfigProperty]);
      
      if (config[lowerCaseConfigProperty] === undefined && config[configProperty] !== undefined) { // Fallback for existing mixed-case properties not yet fully transitioned
        configValue = isFloat ? parseFloat(config[configProperty]) : parseInt(config[configProperty]);
      }


      if (isFloat ? Math.abs(optionValue - configValue) < 0.0001 : optionValue === configValue) {
        selectElement.options[k].selected = true;
        break;
      }
    }
    selectElement.onchange = function() {
      var newValue = isFloat ? parseFloat(this.value) : parseInt(this.value);
      // Set config with lowercase key
      config[lowerCaseConfigProperty] = newValue;
      if (config[configProperty] !== undefined && lowerCaseConfigProperty !== configProperty) { // If mixed case existed, update it too for safety or remove old
          config[configProperty] = newValue; 
      }


      var poolsMayHaveChanged = false;
      var changedProperty = lowerCaseConfigProperty; // Use lowercase for comparison

      if (changedProperty === "champion_pool_size") {
        while (globals.champion_genomes && globals.champion_genomes.length > newValue) {
                    globals.champion_genomes.pop(); 
                    poolsMayHaveChanged = true;
                  }
                } else if (changedProperty === "drift_pool_size") {
                  while (globals.drift_genomes && globals.drift_genomes.length > newValue) {
                    globals.drift_genomes.pop(); 
                    poolsMayHaveChanged = true;
                  }
                }
                if (poolsMayHaveChanged) {
                  updatePoolStatsDisplay(); 
                }
              };
            }
          }


          interfaceSetup = function() {
            setupSelectControl("mutation_chance", "mutation_chance", true);
            setupSelectControl("mutation_amount", "mutation_amount", true);
            setupSelectControl("motor_noise", "motor_noise", true);
  setupSelectControl("population_selection_pressure", "population_selection_pressure", false); 
  
  setupSelectControl("parent_from_population_chance", "parent_from_population_chance", true);
  setupSelectControl("parent_from_champion_pool_chance", "parent_from_champion_pool_chance", true);

  setupSelectControl("champion_pool_size", "champion_pool_size", false);
  setupSelectControl("drift_pool_size", "drift_pool_size", false);
  setupSelectControl("drift_range", "drift_range", true);
  
  var fps_sel = document.getElementById("draw_fps");
  if (fps_sel) {
    for(var k = 0; k < fps_sel.options.length; k++) {
      if(fps_sel.options[k].value == config.draw_fps) { // config.draw_fps is already lowercase
        fps_sel.options[k].selected = true;
        break;
      }
    }
    fps_sel.onchange = function() {
      setFps(parseInt(this.value)); 
    }
  }

  var simulation_fps_sel = document.getElementById("simulation_fps");
  if (simulation_fps_sel) {
    for(var k = 0; k < simulation_fps_sel.options.length; k++) {
      if(simulation_fps_sel.options[k].value == config.simulation_fps) { // config.simulation_fps is already lowercase
        simulation_fps_sel.options[k].selected = true;
        break;
      }
    }
    simulation_fps_sel.onchange = function() {
      setSimulationFps(parseInt(this.value)); 
    }
  }
}