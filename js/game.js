config = {
  motor_noise: 0.0,
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
  // walker_health: 300, // Removed
  // fitness_criterium: 'score', // Removed
  // check_health: true, // Removed
  max_floor_tiles: 50,
  // min_body_delta: 1.4, // Removed
  // min_leg_delta: 0.4, // Removed
  // instadeath_delta: 0.4, // Removed
  population_size: 40,
  champion_pool_size: 5,
  population_selection_pressure: 3,
  drift_pool_size: 10,
  drift_range: 0.25,
  parent_from_population_chance: 0.25,
  parent_from_champion_pool_chance: 0.25,

  // New "Persistent Pursuit & Performance Metric" parameters
  max_reasonable_head_height: 2.2, // Optimal upright head Y position for normalization.
  min_posture_contribution: 0.3,   // Minimum multiplier from posture (0.0 to 1.0).
  pressure_line_starting_offset: 0.75, // How far behind the walker the pressure line starts.
  pressure_line_base_speed: 0.002,     // Per step, e.g., 0.002 units/step.
  pressure_line_acceleration_factor: 0.00001 // Per step^2, e.g., 0.00001 units/step^2.
};

globals = {};

gameInit = function() {
  interfaceSetup();

  globals.world = new b2.World(new b2.Vec2(0, -10));
  
  globals.walker_id_counter = 0;
  globals.champion_genomes = []; 
  globals.drift_genomes = [];   
  globals.last_record = 0;    

  globals.walkers = createPopulation(); 

  globals.floor = createFloor();
  drawInit();

  setQuote(); 
  setInterval(setQuote, 60000); 

  globals.simulation_interval = setInterval(simulationStep, Math.round(1000/config.simulation_fps));
  if(config.draw_fps > 0) { 
    globals.draw_interval = setInterval(drawFrame, Math.round(1000/config.draw_fps));
  }
  updatePoolStatsDisplay(); 
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
  var poolsChanged = false;
  for(var k = 0; k < config.population_size; k++) {
    if(!globals.walkers[k].is_eliminated) {
      globals.walkers[k].simulationStep(config.motor_noise);
    } else { 
      if(!globals.walkers[k].processed_after_elimination) { 
        var eliminatedWalker = globals.walkers[k];
        var eliminatedWalkerScore = eliminatedWalker.fitness_score; // Unified fitness_score
        var eliminatedWalkerGenome = JSON.parse(JSON.stringify(eliminatedWalker.genome));

        // Scores can be negative. last_record can also become negative.
        if(eliminatedWalkerScore > globals.last_record) {
          globals.last_record = eliminatedWalkerScore;
          printChampion(eliminatedWalker); 

          globals.champion_genomes.unshift({genome: eliminatedWalkerGenome, score: eliminatedWalkerScore});
          poolsChanged = true;
          while(globals.champion_genomes.length > config.champion_pool_size) {
            globals.champion_genomes.pop();
          }
        }

        // Drift pool logic might need care if last_record is negative or very small.
        // For now, assuming it handles it or the threshold is met appropriately.
        // If last_record is 0, threshold is 0. If last_record is positive, works as before.
        // If last_record is negative, (1-drift_range)*last_record will be less negative (closer to 0).
        // A score must be MORE positive (or less negative) than this threshold.
        if (config.drift_pool_size > 0 && // only if drift pool is enabled
            (globals.last_record > 0 || eliminatedWalkerScore > 0) && // ensure some positive progress for drift meaningfulness
            eliminatedWalkerScore >= (1 - config.drift_range) * globals.last_record) {
          
          globals.drift_genomes.unshift({genome: eliminatedWalkerGenome, score: eliminatedWalkerScore});
          poolsChanged = true;
          while (globals.drift_genomes.length > config.drift_pool_size) {
            globals.drift_genomes.pop();
          }
        }

        for(var l = 0; l < eliminatedWalker.bodies.length; l++) {
          if(eliminatedWalker.bodies[l]) {
            globals.world.DestroyBody(eliminatedWalker.bodies[l]);
            eliminatedWalker.bodies[l] = null;
          }
        }
        eliminatedWalker.processed_after_elimination = true; 

        replaceWalkerAtIndex(k);
      }
    }
  }
  printNames(globals.walkers); 
  if(poolsChanged) {
    updatePoolStatsDisplay();
  }
}

replaceWalkerAtIndex = function(index) {
  var parent_genome_object = pickParentGenome(); 
  var parent_genome;
  if(parent_genome_object && typeof parent_genome_object.genome !== 'undefined') {
    parent_genome = parent_genome_object.genome;
  } else {
    parent_genome = parent_genome_object; 
  }

  var new_genome = cloneAndMutate(parent_genome);

  globals.walker_id_counter++;
  var new_walker = new Walker(globals.world, new_genome);
  new_walker.id = globals.walker_id_counter;
  
  globals.walkers[index] = new_walker;
  updateWalkerTotalCount(globals.walker_id_counter);
}

pickParentGenome = function() {
  var parent_genome_entry = null; 

  if (Math.random() < config.parent_from_population_chance) {
    var living_walkers_indices = [];
    for(var i=0; i < globals.walkers.length; i++) {
      if(globals.walkers[i] && !globals.walkers[i].is_eliminated) { // Check for not eliminated
        living_walkers_indices.push(i);
      }
    }

    if (living_walkers_indices.length > 0) {
      var best_walker_in_tournament = null;
      for (var s = 0; s < config.population_selection_pressure; s++) {
        var random_living_index_in_array = Math.floor(Math.random() * living_walkers_indices.length);
        var candidate_walker_index = living_walkers_indices[random_living_index_in_array];
        var candidate_walker = globals.walkers[candidate_walker_index];

        if (!best_walker_in_tournament || candidate_walker.fitness_score > best_walker_in_tournament.fitness_score) { // Use fitness_score
          best_walker_in_tournament = candidate_walker;
        }
      }
      if (best_walker_in_tournament) {
        parent_genome_entry = best_walker_in_tournament.genome; 
      }
    }
  } else {
    if (Math.random() < config.parent_from_champion_pool_chance) {
      if (globals.champion_genomes.length > 0) {
        var randomIndex = Math.floor(Math.random() * globals.champion_genomes.length);
        parent_genome_entry = globals.champion_genomes[randomIndex]; 
      } else if (globals.drift_genomes.length > 0 && config.drift_pool_size > 0) { 
        var randomIndex = Math.floor(Math.random() * globals.drift_genomes.length);
        parent_genome_entry = globals.drift_genomes[randomIndex]; 
      }
    } else {
      if (globals.drift_genomes.length > 0 && config.drift_pool_size > 0) {
        var randomIndex = Math.floor(Math.random() * globals.drift_genomes.length);
        parent_genome_entry = globals.drift_genomes[randomIndex]; 
      } else if (globals.champion_genomes.length > 0) { 
        var randomIndex = Math.floor(Math.random() * globals.champion_genomes.length);
        parent_genome_entry = globals.champion_genomes[randomIndex]; 
      }
    }
  }

  if (!parent_genome_entry) {
    var tempWalker = new Walker(globals.world); 
    parent_genome_entry = tempWalker.genome; 
    for(var l = 0; l < tempWalker.bodies.length; l++) {
      if(tempWalker.bodies[l]) {
        globals.world.DestroyBody(tempWalker.bodies[l]);
      }
    }
  }
  var actual_genome_to_clone = (parent_genome_entry && typeof parent_genome_entry.genome !== 'undefined') ? parent_genome_entry.genome : parent_genome_entry;
  return JSON.parse(JSON.stringify(actual_genome_to_clone)); 
}

cloneAndMutate = function(parent_genome) {
  if (!parent_genome) {
    console.error("Attempted to clone a null or undefined genome. Creating a new random genome.");
    var tempWalker = new Walker(globals.world);
    var randomGenome = tempWalker.genome;
    for(var l = 0; l < tempWalker.bodies.length; l++) { 
      if(tempWalker.bodies[l]) globals.world.DestroyBody(tempWalker.bodies[l]);
    }
    return randomGenome; 
  }

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
}