config = {
    time_step: 60,
    simulation_fps: 60,
    render_fps: 60,
    velocity_iterations: 8,
    position_iterations: 3,
    max_zoom_factor: 130,
    max_floor_tiles: 200,

    mutation_chance: 1,
    mutation_amount: 0.05,
    motor_noise: 0.0,

    population_size: 40,
    history_size: 40,

    genepool_threshold: 0.25,
    genepool_range_decay: 0.9,
    genepool_tiers: 40,
    genepool_tier_capacity: 10,
    genepool_tier_selection_pressure: 10.0,
    genepool_gene_mutation_chance: 1.0,
    genepool_gene_mutation_strength: 0.05,

    max_reasonable_head_height: 1.5,
    pressure_line_starting_offset: 1.75,
    pressure_line_base_speed: 0.001,
    pressure_line_acceleration: 0.000001,
    max_steps_without_improvement: 240,
    head_floor_collision_kills: false,
};

globals = {};

function gaussianRandom(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdev + mean;
}

function HeadFloorContactListener() {}
HeadFloorContactListener.prototype = new b2.ContactListener();
HeadFloorContactListener.prototype.constructor = HeadFloorContactListener;

HeadFloorContactListener.prototype.BeginContact = function(contact) {
    if (config.head_floor_collision_kills) {
        let userDataA = contact.GetFixtureA().GetUserData();
        let userDataB = contact.GetFixtureB().GetUserData();
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

    globals.history = new History(config);
    globals.genepool = new GenePool(config);

    globals.walkers = createPopulation();
    globals.floor = createFloor();

    drawInit();

    setQuote();
    setInterval(setQuote, 60000);

    globals.simulation_interval = setInterval(simulationStep, Math.round(1000/config.simulation_fps));
    if (config.render_fps > 0) {
        globals.draw_interval = setInterval(drawFrame, Math.round(1000/config.render_fps));
    }
}

createPopulation = function(initial_genomes) {
    updateWalkerTotalCount(globals.walker_id_counter);
    let walkers = [];
    for (let k = 0; k < config.population_size; k++) {
        let walker = globals.genepool.createRandomWalker();
        walker.id = ++globals.walker_id_counter;
        walkers.push(walker);
    }
    return walkers;
}

simulationStep = function() {
    globals.world.Step(1/config.time_step, config.velocity_iterations, config.position_iterations);
    globals.world.ClearForces();
    updatePopulation();
    updatePopulationList(globals.walkers);
}

updatePopulation = function() {
    for (let k = 0; k < globals.walkers.length; k++) {
        let walker = globals.walkers[k];
        if (walker.is_eliminated) {
            globals.genepool.addGenome(walker.genome, walker.fitness_score);
            if (globals.history.addGenome(walker.genome, walker.fitness_score)) {
                updateHistoryList(walker);
            }
            walker.destroyBody();
            replaceWalkerAtIndex(k);
            continue;
        }
        walker.simulationStep(config.motor_noise);
    }
}

replaceWalkerAtIndex = function(index) {
    let walker = globals.genepool.createMutatedWalker();
    walker.id = ++globals.walker_id_counter;
    globals.walkers[index] = walker;
    updateWalkerTotalCount(globals.walker_id_counter);
}
