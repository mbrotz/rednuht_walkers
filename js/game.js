config = {
  motor_noise: 0.05,
  time_step: 60,
  simulation_fps: 60,
  draw_fps: 60,
  velocity_iterations: 8,
  position_iterations: 3,
  max_zoom_factor: 130,
  min_motor_speed: -2,
  max_motor_speed: 2,
  mutation_chance: 0.1,
  mutation_amount: 0.5,
  walker_health: 300,
  fitness_criterium: 'score', // 'score' or 'max_distance'
  check_health: true,
  max_floor_tiles: 50,
  min_body_delta: 1.4,
  min_leg_delta: 0.4,
  instadeath_delta: 0.4,
  population_size: 40,
  champion_pool_size: 5, 
  drift_pool_size: 10,
  drift_range: 0.25,
  parent_from_population_selection_pressure: 3,
  parent_from_population_chance: 0.25,
  parent_from_champion_pool_chance: 0.25,
};

globals = {};

gameInit = function() {
  interfaceSetup();

  globals.world = new b2.World(new b2.Vec2(0, -10));
  
  globals.walker_id_counter = 0;
  globals.champion_genomes = []; // Store genomes of champions
  globals.drift_genomes = [];   // Store genomes for the drift pool
  globals.last_record = 0;    // Initialize last_record

  globals.walkers = createPopulation(); // Initial population

  globals.floor = createFloor();
  drawInit();

  setQuote(); // Set initial quote
  setInterval(setQuote, 60000); // Change quote every minute

  globals.simulation_interval = setInterval(simulationStep, Math.round(1000/config.simulation_fps));
  if(config.draw_fps > 0) { 
    globals.draw_interval = setInterval(drawFrame, Math.round(1000/config.draw_fps));
  }
}

simulationStep = function() {
  globals.world.Step(1/config.time_step, config.velocity_iterations, config.position_iterations);
  globals.world.ClearForces();
  populationSimulationStep();
}

setSimulationFps = function(fps) {
  config.simulation_fps = fps;
  clearInterval(globals.simulation_interval);
  if(fps > 0) {
    globals.simulation_interval = setInterval(simulationStep, Math.round(1000/config.simulation_fps));
    if(globals.paused) { 
      globals.paused = false;
      if(config.draw_fps > 0) {
        globals.draw_interval = setInterval(drawFrame, Math.round(1000/config.draw_fps));
      }
    }
  } else {
    clearInterval(globals.draw_interval);
    globals.paused = true;
  }
}

createPopulation = function(initial_genomes) { 
  // setQuote(); // Moved to gameInit to allow interval setting
  updateWalkerTotalCount(globals.walker_id_counter); 
  var walkers = [];
  for(var k = 0; k < config.population_size; k++) {
    globals.walker_id_counter++;
    let walker;
    if(initial_genomes && initial_genomes[k]) {
      walker = new Walker(globals.world, initial_genomes[k]);
    } else {
      walker = new Walker(globals.world); 
    }
    walker.id = globals.walker_id_counter;
    walkers.push(walker);
  }
  return walkers;
}

populationSimulationStep = function() {
  for(var k = 0; k < config.population_size; k++) {
    if(globals.walkers[k].health > 0) {
      globals.walkers[k].simulationStep(config.motor_noise);
    } else { 
      if(!globals.walkers[k].is_dead) { 
        // Record Check (Champion Pool)
        if(globals.walkers[k][config.fitness_criterium] > globals.last_record) {
          globals.last_record = globals.walkers[k][config.fitness_criterium];
          printChampion(globals.walkers[k]); 

          globals.champion_genomes.push(JSON.parse(JSON.stringify(globals.walkers[k].genome)));
          while(globals.champion_genomes.length > config.champion_pool_size) {
            globals.champion_genomes.shift(); 
          }
        }

        // Drift Pool Check
        // Qualifies if score is within drift_range of the current record and drift pool is enabled
        if (config.drift_pool_size > 0 && globals.last_record > 0 &&
            globals.walkers[k][config.fitness_criterium] >= (1 - config.drift_range) * globals.last_record) {
          
          globals.drift_genomes.push(JSON.parse(JSON.stringify(globals.walkers[k].genome)));
          while (globals.drift_genomes.length > config.drift_pool_size) {
            globals.drift_genomes.shift();
          }
        }

        // Destroy Old Walker's bodies
        for(var l = 0; l < globals.walkers[k].bodies.length; l++) {
          if(globals.walkers[k].bodies[l]) {
            globals.world.DestroyBody(globals.walkers[k].bodies[l]);
            globals.walkers[k].bodies[l] = null;
          }
        }
        globals.walkers[k].is_dead = true; 

        replaceWalkerAtIndex(k);
      }
    }
  }
  printNames(globals.walkers); 
}

replaceWalkerAtIndex = function(index) {
  var parent_genome = pickParentGenome();
  var new_genome = cloneAndMutate(parent_genome);

  globals.walker_id_counter++;
  var new_walker = new Walker(globals.world, new_genome);
  new_walker.id = globals.walker_id_counter;
  
  globals.walkers[index] = new_walker;
  updateWalkerTotalCount(globals.walker_id_counter);
}

pickParentGenome = function() {
  var parent_genome_source = null;
  var chosen_walker = null; 

  // Stage 1: Decide Source Type (Active Population vs. Pools)
  if (Math.random() < config.parent_from_population_chance) {
    // Pick from active pool using tournament selection
    var living_walkers_indices = [];
    for(var i=0; i < globals.walkers.length; i++) {
        if(globals.walkers[i] && globals.walkers[i].health > 0) { // Consider only living walkers
            living_walkers_indices.push(i);
        }
    }

    if (living_walkers_indices.length > 0) {
      var best_walker_in_tournament = null;
      for (var s = 0; s < config.parent_from_population_selection_pressure; s++) {
        var random_living_index_in_array = Math.floor(Math.random() * living_walkers_indices.length);
        var candidate_walker_index = living_walkers_indices[random_living_index_in_array];
        var candidate_walker = globals.walkers[candidate_walker_index];

        if (!best_walker_in_tournament || candidate_walker[config.fitness_criterium] > best_walker_in_tournament[config.fitness_criterium]) {
          best_walker_in_tournament = candidate_walker;
        }
      }
      if (best_walker_in_tournament) {
        parent_genome_source = best_walker_in_tournament.genome;
        // console.log("Picked from Active Pool (Tournament Winner)");
      }
    }
  } else {
    // Pick from Champion Pool or Drift Pool
    // Stage 2: Pool Selection (Champion Pool vs. Drift Pool)
    if (Math.random() < config.parent_from_champion_pool_chance) {
      // Try Champion Pool first
      if (globals.champion_genomes.length > 0) {
        var randomIndex = Math.floor(Math.random() * globals.champion_genomes.length);
        parent_genome_source = globals.champion_genomes[randomIndex];
        // console.log("Picked from Champion Pool");
      } else if (globals.drift_genomes.length > 0 && config.drift_pool_size > 0) { // Fallback to Drift Pool
        var randomIndex = Math.floor(Math.random() * globals.drift_genomes.length);
        parent_genome_source = globals.drift_genomes[randomIndex];
        // console.log("Picked from Drift Pool (fallback from empty Champion)");
      }
    } else {
      // Try Drift Pool first
      if (globals.drift_genomes.length > 0 && config.drift_pool_size > 0) {
        var randomIndex = Math.floor(Math.random() * globals.drift_genomes.length);
        parent_genome_source = globals.drift_genomes[randomIndex];
        // console.log("Picked from Drift Pool");
      } else if (globals.champion_genomes.length > 0) { // Fallback to Champion Pool
        var randomIndex = Math.floor(Math.random() * globals.champion_genomes.length);
        parent_genome_source = globals.champion_genomes[randomIndex];
        // console.log("Picked from Champion Pool (fallback from empty Drift)");
      }
    }
  }

  // Fallback: if no parent genome could be selected from any preferred source
  if (!parent_genome_source) {
    // console.log("Fallback: Creating random genome as no suitable parent found.");
    var tempWalker = new Walker(globals.world); 
    parent_genome_source = tempWalker.genome;
    // Clean up temporary walker bodies
    for(var l = 0; l < tempWalker.bodies.length; l++) {
      if(tempWalker.bodies[l]) {
        globals.world.DestroyBody(tempWalker.bodies[l]);
      }
    }
  }
  return JSON.parse(JSON.stringify(parent_genome_source)); 
}

cloneAndMutate = function(parent_genome) {
  var new_genome = JSON.parse(JSON.stringify(parent_genome));
  for (var k = 0; k < new_genome.length; k++) {
    for (var g_prop in new_genome[k]) {
      if (new_genome[k].hasOwnProperty(g_prop)) {
        if (Math.random() < config.mutation_chance) {
          new_genome[k][g_prop] = new_genome[k][g_prop] * (1 + config.mutation_amount * (Math.random() * 2 - 1));
        }
      }
    }
  }
  return new_genome;
}

getInterfaceValues = function() {
  // This function is largely superseded by direct updates in interface.js for new controls
  // Kept for existing controls not managed by setupSelectControl or if other settings are added here later.
  config.mutation_chance = document.getElementById("mutation_chance").value;
  config.mutation_amount = document.getElementById("mutation_amount").value;
  config.motor_noise = parseFloat(document.getElementById("motor_noise").value);
}