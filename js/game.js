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
  population_size: 20,
  mutation_chance: 0.1,
  mutation_amount: 0.5,
  walker_health: 300,
  fitness_criterium: 'score', // 'score' or 'max_distance'
  check_health: true,
  // elite_clones: 2, // Removed
  max_floor_tiles: 50,
  // round_length: 1200, // Removed
  min_body_delta: 1.4,
  min_leg_delta: 0.4,
  instadeath_delta: 0.4,
  champion_pool_size: 5, // Number of recent champions to keep
  parent_from_champion_chance: 0.3 // Probability to pick parent from champion pool
};

globals = {};

gameInit = function() {
  interfaceSetup();

  globals.world = new b2.World(new b2.Vec2(0, -10));
  
  globals.walker_id_counter = 0;
  globals.champion_genomes = []; // Store genomes of champions
  globals.last_record = 0; // Initialize last_record

  globals.walkers = createPopulation(); // Initial population

  globals.floor = createFloor();
  drawInit();

  globals.step_counter = 0; // Global step counter for motor control, not reset
  globals.simulation_interval = setInterval(simulationStep, Math.round(1000/config.simulation_fps));
  if(config.draw_fps > 0) { // Check draw_fps before starting draw interval
    globals.draw_interval = setInterval(drawFrame, Math.round(1000/config.draw_fps));
  }
}

simulationStep = function() {
  globals.world.Step(1/config.time_step, config.velocity_iterations, config.position_iterations);
  globals.world.ClearForces();
  populationSimulationStep();
  
  // step_counter is used by walkers for their motor functions
  if(typeof globals.step_counter == 'undefined') {
    globals.step_counter = 0;
  } else {
    globals.step_counter++;
  }

  // Removed generation timer bar update
  // Removed round end check
}

setSimulationFps = function(fps) {
  config.simulation_fps = fps;
  clearInterval(globals.simulation_interval);
  if(fps > 0) {
    globals.simulation_interval = setInterval(simulationStep, Math.round(1000/config.simulation_fps));
    if(globals.paused) { // Resume drawing if it was paused
      globals.paused = false;
      if(config.draw_fps > 0) {
        globals.draw_interval = setInterval(drawFrame, Math.round(1000/config.draw_fps));
      }
    }
  } else {
    // pause the drawing as well
    clearInterval(globals.draw_interval);
    globals.paused = true;
  }
}

createPopulation = function(initial_genomes) { // `initial_genomes` only used for very first population if needed
  setQuote();
  updateWalkerTotalCount(globals.walker_id_counter); // Update UI with total walkers created so far
  var walkers = [];
  for(var k = 0; k < config.population_size; k++) {
    globals.walker_id_counter++;
    let walker;
    if(initial_genomes && initial_genomes[k]) {
      walker = new Walker(globals.world, initial_genomes[k]);
    } else {
      walker = new Walker(globals.world); // Creates walker with random genome
    }
    walker.id = globals.walker_id_counter;
    // Removed is_elite logic
    walkers.push(walker);
  }
  return walkers;
}

populationSimulationStep = function() {
  // Removed dead_dudes counter
  for(var k = 0; k < config.population_size; k++) {
    if(globals.walkers[k].health > 0) {
      globals.walkers[k].simulationStep(config.motor_noise);
    } else { // Walker has died
      if(!globals.walkers[k].is_dead) { // Process death once
        // Record Check
        if(globals.walkers[k][config.fitness_criterium] > globals.last_record) {
          globals.last_record = globals.walkers[k][config.fitness_criterium];
          printChampion(globals.walkers[k]); // printChampion now uses walker.id

          // Add genome to champion pool
          globals.champion_genomes.push(JSON.parse(JSON.stringify(globals.walkers[k].genome)));
          if(globals.champion_genomes.length > config.champion_pool_size) {
            globals.champion_genomes.shift(); // Remove oldest champion genome
          }
        }

        // Destroy Old Walker's bodies
        for(var l = 0; l < globals.walkers[k].bodies.length; l++) {
          if(globals.walkers[k].bodies[l]) {
            globals.world.DestroyBody(globals.walkers[k].bodies[l]);
            globals.walkers[k].bodies[l] = null;
          }
        }
        globals.walkers[k].is_dead = true; // Mark as processed

        // Replace Walker
        replaceWalkerAtIndex(k);
      }
    }
  }
  printNames(globals.walkers); // Update UI list
  // Removed check for all dead_dudes to call nextGeneration
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

  // Decide source: Champion pool or Active pool
  if (Math.random() < config.parent_from_champion_chance && globals.champion_genomes.length > 0) {
    // Pick from champion pool
    var randomIndex = Math.floor(Math.random() * globals.champion_genomes.length);
    parent_genome_source = globals.champion_genomes[randomIndex];
  } else {
    // Pick from active pool (ensure there are living walkers to pick from)
    var living_walkers_indices = [];
    for(var i=0; i < globals.walkers.length; i++) {
        if(globals.walkers[i] && globals.walkers[i].health > 0) { // Check if walker exists and is alive
            living_walkers_indices.push(i);
        }
    }
    if (living_walkers_indices.length > 0) {
        var randomLivingIndex = living_walkers_indices[Math.floor(Math.random() * living_walkers_indices.length)];
        parent_genome_source = globals.walkers[randomLivingIndex].genome;
    }
  }

  // Fallback: if no parent genome could be selected (e.g., pools empty at very start or rare race condition)
  if (!parent_genome_source) {
    // Create a completely new random genome. We need a temporary walker instance to call its createGenome method.
    // This is a bit indirect but avoids making createGenome a static/global function directly.
    var tempWalker = new Walker(globals.world); // This creates a walker with a random genome
    parent_genome_source = tempWalker.genome;
    // Immediately destroy the temp walker bodies as they are not part of the simulation.
    for(var l = 0; l < tempWalker.bodies.length; l++) {
      if(tempWalker.bodies[l]) {
        globals.world.DestroyBody(tempWalker.bodies[l]);
      }
    }
  }
  return JSON.parse(JSON.stringify(parent_genome_source)); // Return a clone
}

cloneAndMutate = function(parent_genome) {
  // Deep clone the parent genome
  var new_genome = JSON.parse(JSON.stringify(parent_genome));

  for (var k = 0; k < new_genome.length; k++) {
    for (var g_prop in new_genome[k]) {
      if (new_genome[k].hasOwnProperty(g_prop)) {
        if (Math.random() < config.mutation_chance) {
          // Assuming all genome properties are numeric factors like cos_factor, time_factor, time_shift
          // The original 'target' logic is not applicable to the current genome structure.
          new_genome[k][g_prop] = new_genome[k][g_prop] * (1 + config.mutation_amount * (Math.random() * 2 - 1));
        }
      }
    }
  }
  return new_genome;
}

// DELETED: nextGeneration, killGeneration, createNewGenerationGenomes, pickParents (old version), copulate, mutateClones

getInterfaceValues = function() {
  // config.elite_clones = document.getElementById("elite_clones").value; // Removed
  config.mutation_chance = document.getElementById("mutation_chance").value;
  config.mutation_amount = document.getElementById("mutation_amount").value;
  config.motor_noise = parseFloat(document.getElementById("motor_noise").value);
  // config.round_length = document.getElementById("round_length").value; // Removed
  // Potentially add UI controls for champion_pool_size and parent_from_champion_chance here if added to HTML
}