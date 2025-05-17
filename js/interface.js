quotes = [
  "The Ministry of Silly Walks on steroids",
  "It's like watching other people QWOP",
  "Keep tumbling",
  "As seen on a negative comment on Reddit",
  "The Walking Sad",
  "The Walking Fad",
  "Army of QWOP",
  "Nice me-and-my-friends-leaving-the-bar-at-2am simulator!"
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
    td.appendChild(document.createTextNode(walkers[k][config.fitness_criterium].toFixed(2)));
    tr.appendChild(td);
    name_list.appendChild(tr);
  }
}

printChampion = function(walker) {
  var champ_list = document.getElementById("champ_list");
  var tr = document.createElement("TR");

  var cur_rows = champ_list.getElementsByTagName("TR");
  if(cur_rows.length >= config.population_size * 2) { 
    champ_list.removeChild(cur_rows[0]);
  }

  var td = document.createElement("TD");
  td.className = "generation"; 
  td.appendChild(document.createTextNode(walker.id)); 
  tr.appendChild(td);

  td = document.createElement("TD");
  td.className = "name";
  td.appendChild(document.createTextNode(walker.name));
  tr.appendChild(td);

  td = document.createElement("TD");
  td.className = "score";
  td.appendChild(document.createTextNode(walker[config.fitness_criterium].toFixed(2)));
  tr.appendChild(td);

  champ_list.appendChild(tr);
}

updateWalkerTotalCount = function(number) { 
  document.getElementById("gen_number").innerHTML = number;
}

setQuote = function() {
  document.getElementById("page_quote").innerHTML = '"'+quotes[Math.floor(Math.random() * quotes.length)]+'"';
}

// Helper function to set up a select element
function setupSelectControl(elementId, configProperty, isFloat) {
    var selectElement = document.getElementById(elementId);
    if (selectElement) {
        for (var k = 0; k < selectElement.options.length; k++) {
            var optionValue = isFloat ? parseFloat(selectElement.options[k].value) : parseInt(selectElement.options[k].value);
            var configValue = isFloat ? parseFloat(config[configProperty]) : parseInt(config[configProperty]);
             // Use a small epsilon for float comparison due to potential precision issues
            if (isFloat ? Math.abs(optionValue - configValue) < 0.0001 : optionValue === configValue) {
                selectElement.options[k].selected = true;
                break;
            }
        }
        selectElement.onchange = function() {
            config[configProperty] = isFloat ? parseFloat(this.value) : parseInt(this.value);
            // If a central `getInterfaceValues()` is called on major events, this direct update might be sufficient.
            // Otherwise, `getInterfaceValues()` would need to be called or this logic duplicated there.
        };
    }
}


interfaceSetup = function() {
  setupSelectControl("mutation_chance", "mutation_chance", true);
  setupSelectControl("mutation_amount", "mutation_amount", true);
  setupSelectControl("motor_noise", "motor_noise", true);
  setupSelectControl("selection_pressure", "selection_pressure", false);
  setupSelectControl("parent_from_champion_chance", "parent_from_champion_chance", true);
  setupSelectControl("champion_pool_size", "champion_pool_size", false);
  
  // FPS and Simulation Speed have special setter functions
  var fps_sel = document.getElementById("draw_fps");
  if (fps_sel) {
      for(var k = 0; k < fps_sel.options.length; k++) {
          if(fps_sel.options[k].value == config.draw_fps) {
              fps_sel.options[k].selected = true;
              break;
          }
      }
      fps_sel.onchange = function() {
          setFps(parseInt(this.value)); // Ensure FPS is int
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
          setSimulationFps(parseInt(this.value)); // Ensure FPS is int
      }
  }
}
