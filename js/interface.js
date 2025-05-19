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
  "From primordial soup to... well, *this*."
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

  // Use new config for limiting displayed record history
  while (champ_list.rows.length > config.record_history_display_limit) { 
    champ_list.removeChild(champ_list.rows[champ_list.rows.length - 1]);
  }
}

updateWalkerTotalCount = function(number) { 
  document.getElementById("gen_number").innerHTML = number;
}

// updatePoolStatsDisplay function is removed as its UI elements are gone.

setQuote = function() {
  var quoteEl = document.getElementById("page_quote");
  if (quoteEl) {
    quoteEl.innerHTML = '"'+quotes[Math.floor(Math.random() * quotes.length)]+'"';
  }
}

function setupSelectControl(elementId, configProperty, isFloat) {
  var selectElement = document.getElementById(elementId);
  if (selectElement) {
    var lowerCaseConfigProperty = configProperty.toLowerCase();

    for (var k = 0; k < selectElement.options.length; k++) {
      var optionValue = isFloat ? parseFloat(selectElement.options[k].value) : parseInt(selectElement.options[k].value);
      var configValue = isFloat ? parseFloat(config[lowerCaseConfigProperty]) : parseInt(config[lowerCaseConfigProperty]);
      
      if (config[lowerCaseConfigProperty] === undefined && config[configProperty] !== undefined) { 
        configValue = isFloat ? parseFloat(config[configProperty]) : parseInt(config[configProperty]);
      }

      if (isFloat ? Math.abs(optionValue - configValue) < 0.0001 : optionValue === configValue) {
        selectElement.options[k].selected = true;
        break;
      }
    }
    selectElement.onchange = function() {
      var newValue = isFloat ? parseFloat(this.value) : parseInt(this.value);
      config[lowerCaseConfigProperty] = newValue;
      if (config[configProperty] !== undefined && lowerCaseConfigProperty !== configProperty) {
          config[configProperty] = newValue; 
      }
      // Removed specific pool size update logic as those controls are gone.
      // The general mechanism of setupSelectControl is kept for remaining controls.
    };
  }
}


interfaceSetup = function() {
  setupSelectControl("mutation_chance", "mutation_chance", true);
  setupSelectControl("mutation_amount", "mutation_amount", true);
  setupSelectControl("motor_noise", "motor_noise", true);
  
  // Removed setupSelectControl calls for:
  // population_selection_pressure
  // parent_from_population_chance
  // parent_from_champion_pool_chance
  // champion_pool_size
  // drift_pool_size
  // drift_range
  
  var fps_sel = document.getElementById("draw_fps");
  if (fps_sel) {
    for(var k = 0; k < fps_sel.options.length; k++) {
      if(fps_sel.options[k].value == config.draw_fps) {
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
      if(simulation_fps_sel.options[k].value == config.simulation_fps) {
        simulation_fps_sel.options[k].selected = true;
        break;
      }
    }
    simulation_fps_sel.onchange = function() {
      setSimulationFps(parseInt(this.value)); 
    }
  }
}