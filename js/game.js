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
  selection_pressure: 2,
  // New Drift Pool and Parent Selection Configs
  drift_pool_size: 10,
  drift_range: 0.25, // Qualifies if score is >= (1 - drift_range) * record_score
  parent_from_population_chance: 0.25, // Chance to pick from active population
  parent_from_champion_pool_chance: 0.25, // If from pools, chance to pick from Champion Pool (else Drift)
};

globals = {};

gameInit = function() {
  interfaceSetup();

  globals.world = new b2.World(new b2.Vec2(0, -10));
  
  globals.walker_id_counter = 0;
  globals.champion_genomes = []; // Now stores {genome: Array, score: Number}
  globals.drift_genomes = [];   // Now stores {genome: Array, score: Number}
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
  updatePoolStatsDisplay(); // Initial display of pool stats
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
    if(globals.walkers[k].health > 0) {
      globals.walkers[k].simulationStep(config.motor_noise);
    } else { 
      if(!globals.walkers[k].is_dead) { 
        var deadWalker = globals.walkers[k];
        var deadWalkerScore = deadWalker[config.fitness_criterium];
        var deadWalkerGenome = JSON.parse(JSON.stringify(deadWalker.genome));

        // Record Check (Champion Pool)
        if(deadWalkerScore > globals.last_record) {
          globals.last_record = deadWalkerScore;
          printChampion(deadWalker); 

          globals.champion_genomes.push({genome: deadWalkerGenome, score: deadWalkerScore});
          poolsChanged = true;
          while(globals.champion_genomes.length > config.champion_pool_size) {
            globals.champion_genomes.shift(); 
          }
        }

        // Drift Pool Check
        if (config.drift_pool_size > 0 && globals.last_record > 0 &&
            deadWalkerScore >= (1 - config.drift_range) * globals.last_record) {
          
          globals.drift_genomes.push({genome: deadWalkerGenome, score: deadWalkerScore});
          poolsChanged = true;
          while (globals.drift_genomes.length > config.drift_pool_size) {
            globals.drift_genomes.shift();
          }
        }

        // Destroy Old Walker's bodies
        for(var l = 0; l < deadWalker.bodies.length; l++) {
          if(deadWalker.bodies[l]) {
            globals.world.DestroyBody(deadWalker.bodies[l]);
            deadWalker.bodies[l] = null;
          }
        }
        deadWalker.is_dead = true; 

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
  var parent_genome_object = pickParentGenome(); // This now returns an object {genome, score} or just genome
  var parent_genome;
  if(parent_genome_object && typeof parent_genome_object.genome !== 'undefined') {
    parent_genome = parent_genome_object.genome;
  } else {
    parent_genome = parent_genome_object; // Fallback for random genome if pickParent returns just genome
  }

  var new_genome = cloneAndMutate(parent_genome);

  globals.walker_id_counter++;
  var new_walker = new Walker(globals.world, new_genome);
  new_walker.id = globals.walker_id_counter;
  
  globals.walkers[index] = new_walker;
  updateWalkerTotalCount(globals.walker_id_counter);
}

pickParentGenome = function() {
  var parent_genome_entry = null; // Will store {genome, score} if from pool, or just genome if from active/random

  // Stage 1: Decide Source Type (Active Population vs. Pools)
  if (Math.random() < config.parent_from_population_chance) {
    // Pick from active pool using tournament selection
    var living_walkers_indices = [];
    for(var i=0; i < globals.walkers.length; i++) {
        if(globals.walkers[i] && globals.walkers[i].health > 0) { 
            living_walkers_indices.push(i);
        }
    }

    if (living_walkers_indices.length > 0) {
      var best_walker_in_tournament = null;
      for (var s = 0; s < config.selection_pressure; s++) {
        var random_living_index_in_array = Math.floor(Math.random() * living_walkers_indices.length);
        var candidate_walker_index = living_walkers_indices[random_living_index_in_array];
        var candidate_walker = globals.walkers[candidate_walker_index];

        if (!best_walker_in_tournament || candidate_walker[config.fitness_criterium] > best_walker_in_tournament[config.fitness_criterium]) {
          best_walker_in_tournament = candidate_walker;
        }
      }
      if (best_walker_in_tournament) {
        parent_genome_entry = best_walker_in_tournament.genome; // Directly the genome array
      }
    }
  } else {
    // Pick from Champion Pool or Drift Pool
    // Stage 2: Pool Selection (Champion Pool vs. Drift Pool)
    if (Math.random() < config.parent_from_champion_pool_chance) {
      // Try Champion Pool first
      if (globals.champion_genomes.length > 0) {
        var randomIndex = Math.floor(Math.random() * globals.champion_genomes.length);
        parent_genome_entry = globals.champion_genomes[randomIndex]; // This is {genome, score}
      } else if (globals.drift_genomes.length > 0 && config.drift_pool_size > 0) { 
        var randomIndex = Math.floor(Math.random() * globals.drift_genomes.length);
        parent_genome_entry = globals.drift_genomes[randomIndex]; // This is {genome, score}
      }
    } else {
      // Try Drift Pool first
      if (globals.drift_genomes.length > 0 && config.drift_pool_size > 0) {
        var randomIndex = Math.floor(Math.random() * globals.drift_genomes.length);
        parent_genome_entry = globals.drift_genomes[randomIndex]; // This is {genome, score}
      } else if (globals.champion_genomes.length > 0) { 
        var randomIndex = Math.floor(Math.random() * globals.champion_genomes.length);
        parent_genome_entry = globals.champion_genomes[randomIndex]; // This is {genome, score}
      }
    }
  }

  if (!parent_genome_entry) {
    var tempWalker = new Walker(globals.world); 
    parent_genome_entry = tempWalker.genome; // Directly the genome array
    for(var l = 0; l < tempWalker.bodies.length; l++) {
      if(tempWalker.bodies[l]) {
        globals.world.DestroyBody(tempWalker.bodies[l]);
      }
    }
  }
  // If parent_genome_entry is an object {genome, score}, return its genome for cloning.
  // If it's already just a genome (from active or random fallback), return it directly.
  var actual_genome_to_clone = (parent_genome_entry && typeof parent_genome_entry.genome !== 'undefined') ? parent_genome_entry.genome : parent_genome_entry;
  return JSON.parse(JSON.stringify(actual_genome_to_clone)); 
}

cloneAndMutate = function(parent_genome) {
  // Ensure parent_genome is not null or undefined before trying to clone
  if (!parent_genome) {
      console.error("Attempted to clone a null or undefined genome. Creating a new random genome.");
      var tempWalker = new Walker(globals.world);
      var randomGenome = tempWalker.genome;
       for(var l = 0; l < tempWalker.bodies.length; l++) { // Cleanup temp walker
          if(tempWalker.bodies[l]) globals.world.DestroyBody(tempWalker.bodies[l]);
       }
      return randomGenome; // Return a new random genome as a fallback
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
  config.mutation_chance = document.getElementById("mutation_chance").value;
  config.mutation_amount = document.getElementById("mutation_amount").value;
  config.motor_noise = parseFloat(document.getElementById("motor_noise").value);
}