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
  max_floor_tiles: 50,
  population_size: 40,
  champion_pool_size: 5,
  population_selection_pressure: 3,
  drift_pool_size: 10,
  drift_range: 0.25,
  parent_from_population_chance: 0.25,
  parent_from_champion_pool_chance: 0.25,
  max_reasonable_head_height: 2.2,
  pressure_line_starting_offset: 0.75,
  pressure_line_base_speed: 0.005,
  pressure_line_acceleration_factor: 0.0,
  max_steps_without_improvement: 240,
  head_floor_collision_kills: false,
};

globals = {};

function HeadFloorContactListener() {}
HeadFloorContactListener.prototype = new b2.ContactListener();
HeadFloorContactListener.prototype.constructor = HeadFloorContactListener;

HeadFloorContactListener.prototype.BeginContact = function(contact) {
    if (config.head_floor_collision_kills) {
      var userDataA = contact.GetFixtureA().GetUserData();
      var userDataB = contact.GetFixtureB().GetUserData();
      if (userDataA && userDataB) {
          if (userDataA.isHead && userDataB.isFloor) {
              userDataA.walker.is_eliminated = true;
          } else if (userDataA.isFloor && userDataB.isHead) {
              userDataB.walker.is_eliminated = true;
          }
      }
    }
};

gameInit = function() {
  interfaceSetup();

  globals.world = new b2.World(new b2.Vec2(0, -10));
  globals.world.SetContactListener(new HeadFloorContactListener());
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
    if (config.draw_fps > 0) {
      simulationSingleStep();
    } else {
      for (var i = 0; i < 10; i++) {
        simulationSingleStep();
      }
    }
}

simulationSingleStep = function() {
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
        var eliminatedWalkerScore = eliminatedWalker.fitness_score; 
        var eliminatedWalkerGenome = JSON.parse(JSON.stringify(eliminatedWalker.genome));

        if(eliminatedWalkerScore > globals.last_record) {
          globals.last_record = eliminatedWalkerScore;
          printChampion(eliminatedWalker); 

          globals.champion_genomes.unshift({genome: eliminatedWalkerGenome, score: eliminatedWalkerScore});
          poolsChanged = true;
          while(globals.champion_genomes.length > config.champion_pool_size) {
            globals.champion_genomes.pop();
          }
        }

        if (config.drift_pool_size > 0 && 
            (globals.last_record > 0 || eliminatedWalkerScore > 0) && 
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
      if(globals.walkers[i] && !globals.walkers[i].is_eliminated) { 
        living_walkers_indices.push(i);
      }
    }

    if (living_walkers_indices.length > 0) {
      var best_walker_in_tournament = null;
      for (var s = 0; s < config.population_selection_pressure; s++) {
        var random_living_index_in_array = Math.floor(Math.random() * living_walkers_indices.length);
        var candidate_walker_index = living_walkers_indices[random_living_index_in_array];
        var candidate_walker = globals.walkers[candidate_walker_index];

        if (!best_walker_in_tournament || candidate_walker.fitness_score > best_walker_in_tournament.fitness_score) { 
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
  var mutated = false;
  while (!mutated) {
    for (var k = 0; k < new_genome.length; k++) {
      for (var g_prop in new_genome[k]) {
        if (new_genome[k].hasOwnProperty(g_prop)) {
          if (Math.random() < config.mutation_chance) {
            new_genome[k][g_prop] = new_genome[k][g_prop] * (1 + config.mutation_amount * (Math.random() * 2 - 1));
            mutated = true;
          }
        }
      }
    }
  }
  return new_genome;
}
