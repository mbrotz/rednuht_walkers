config = {
    time_step: 60,
    simulation_fps: 60,
    render_fps: 60,
    velocity_iterations: 8,
    position_iterations: 3,
    max_floor_tiles: 200,

    mutation_chance: 1,
    mutation_amount: 0.05,

    camera_start_x: 0,
    camera_start_y: 280,
    camera_max_zoom_factor: 130,

    walkers_origin_x: 0.425,

    population_size: 40,
    history_size: 40,

    mapelites_height_bins: 60,
    mapelites_threshold: 0.2,
    mapelites_range_decay: 0.98,
    mapelites_bin_selection_pressure: 5.0,

    genepool_threshold: 0.25,
    genepool_range_decay: 0.98,
    genepool_tiers: 60,
    genepool_tier_capacity: 2,
    genepool_tier_selection_pressure: 10.0,
    genepool_gene_mutation_chance: 1.0,
    genepool_gene_mutation_strength: 0.05,

    pressure_line_starting_offset: 1.75,
    pressure_line_base_speed: 0.001,
    pressure_line_acceleration: 0.000001,
    max_steps_without_improvement: 240,
    head_floor_collision_kills: true,
};

globals = {
    selectedMapElitesBin: -1,
};

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

function createFloor() {
    let body_def = new b2.BodyDef();
    let body = globals.world.CreateBody(body_def);
    let fix_def = new b2.FixtureDef();
    fix_def.friction = 0.8;
    fix_def.shape = new b2.ChainShape();
    let edges = [
        new b2.Vec2(-3.5, -0.16),
        new b2.Vec2(2.5, -0.16)
    ];
    for(let k = 2; k < config.max_floor_tiles; k++) {
        let ratio = k/config.max_floor_tiles;
        edges.push(new b2.Vec2(edges[edges.length-1].x + 1,-0.16));
    }
    globals.max_floor_x = edges[edges.length-1].x;
    fix_def.shape.CreateChain(edges, edges.length);
    let floorFixtureInstance = body.CreateFixture(fix_def);
    floorFixtureInstance.SetUserData({ isFloor: true });
    return body;
}

gameInit = function() {
    globals.world = new b2.World(new b2.Vec2(0, -10));
    globals.world.SetContactListener(new HeadFloorContactListener());
    globals.floor = createFloor();

    globals.population = new Population(config);
    globals.mapelites = new MapElites(config);
    globals.genepool = null;
    globals.history = globals.mapelites.history;

    drawInit();
    interfaceSetup();

    setQuote();
    setInterval(setQuote, 60000);

    globals.simulation_interval = setInterval(simulationStep, Math.round(1000/config.simulation_fps));
    if (config.render_fps > 0) {
        globals.render_interval = setInterval(drawFrame, Math.round(1000/config.render_fps));
    }

    globals.population.initPopulation();
    updateWalkerCount();
    updatePopulationList();
}

simulationStep = function() {
    globals.population.simulationStep();
    globals.world.Step(1/config.time_step, config.velocity_iterations, config.position_iterations);
    globals.world.ClearForces();
    updateWalkerCount();
    updatePopulationList();
    updateHistoryList();
}

