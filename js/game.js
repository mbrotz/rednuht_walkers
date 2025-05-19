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
    base_pool_threshold: 0.25,
    num_broad_spectrum_tiers: 20,
    num_elite_refinement_tiers: 5,
    capacity_per_tier: 10,
    record_history_display_limit: 40,
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

    globals.genepool = new GenePool(config);

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

        walker = new Walker(globals.world); 
        walker.id = globals.walker_id_counter;
        walkers.push(walker);
    }
    return walkers;
}

populationSimulationStep = function() {

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
                    while(globals.champion_genomes.length > config.record_history_display_limit) {
                        globals.champion_genomes.pop();
                    }
                }

                globals.genepool.addGenome(eliminatedWalkerGenome, eliminatedWalkerScore, globals.last_record);

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
    var parent_genome = globals.genepool.selectParentGenome();

    if (!parent_genome) {

        var tempWalker = new Walker(globals.world); 
        parent_genome = tempWalker.genome;

        for(var l = 0; l < tempWalker.bodies.length; l++) {
            if(tempWalker.bodies[l]) {
                globals.world.DestroyBody(tempWalker.bodies[l]);
            }
        }
    }

    return parent_genome; 
}

cloneAndMutate = function(parent_genome) {
    if (!parent_genome) {
        console.error("Attempted to clone a null or undefined genome. Creating a new random genome for mutation.");
        var tempWalker = new Walker(globals.world);
        var randomGenome = tempWalker.genome;
        for(var l = 0; l < tempWalker.bodies.length; l++) { 
            if(tempWalker.bodies[l]) globals.world.DestroyBody(tempWalker.bodies[l]);
        }
        parent_genome = randomGenome; 
    }

    var new_genome = JSON.parse(JSON.stringify(parent_genome));
    var mutated = false;

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

    if (config.mutation_chance > 0 && !mutated && new_genome.length > 0) {
        let attempts = 0;
        while(!mutated && attempts < new_genome.length * Object.keys(new_genome[0]).length * 2) {
            let gene_idx = Math.floor(Math.random() * new_genome.length);
            let props = Object.keys(new_genome[gene_idx]);
            if (props.length > 0) {
                let prop_idx = Math.floor(Math.random() * props.length);
                let g_prop_to_mutate = props[prop_idx];
                new_genome[gene_idx][g_prop_to_mutate] = new_genome[gene_idx][g_prop_to_mutate] * (1 + config.mutation_amount * (Math.random() * 2 - 1));
                mutated = true;
            }
            attempts++;
        }
    }

    return new_genome;
}