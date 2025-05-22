config = {
    time_step: 60, // Represents the desired physics steps per second for the fixed timestep
    simulation_fps: 60, // Can be a number, 0 for pause, or -1 for "max speed"
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
    paused: false, // Will be controlled by simulation_fps setting
    world: null,
    floor: null,
    population: null,
    mapelites: null,
    genepool: null,
    history: null,
    // render_interval and simulation_interval are no longer needed
};

// --- requestAnimationFrame Loop Variables ---
let lastTimestamp = 0;
let simulationAccumulator = 0;
let renderAccumulator = 0;
let animationFrameId = null;

const PHYSICS_FIXED_DELTA_TIME_SECONDS = 1.0 / config.time_step; // e.g., 1/60 seconds
const PHYSICS_FIXED_DELTA_TIME_MS = PHYSICS_FIXED_DELTA_TIME_SECONDS * 1000; // e.g., 16.666 ms

// For "Max Speed" mode step timing
let recentStepDurations = [];
const MAX_RECENT_STEP_DURATIONS = 10;
let avgStepDurationMs = PHYSICS_FIXED_DELTA_TIME_MS; // Initial estimate


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
    interfaceSetup(); // This will set initial globals.paused based on config.simulation_fps

    setQuote();
    setInterval(setQuote, 60000); // Quote interval can remain

    // Initialize loop state
    lastTimestamp = 0;
    simulationAccumulator = 0;
    renderAccumulator = 0;
    globals.paused = (config.simulation_fps === 0); // Set initial pause state

    // Start the main loop if not initially paused
    if (!globals.paused || config.render_fps > 0) { // Start if sim active OR rendering is on
        animationFrameId = requestAnimationFrame(mainLoop);
    }


    globals.population.initPopulation();
    updateWalkerCount();
    updatePopulationList();
}

simulationStep = function() {
    const stepStartTime = performance.now();

    globals.population.simulationStep();
    globals.world.Step(PHYSICS_FIXED_DELTA_TIME_SECONDS, config.velocity_iterations, config.position_iterations);
    // globals.world.ClearForces(); // Box2D typically handles this or it's done before applying new forces.

    updateWalkerCount();
    updatePopulationList();
    updateHistoryList();

    const stepEndTime = performance.now();
    recentStepDurations.push(stepEndTime - stepStartTime);
    if (recentStepDurations.length > MAX_RECENT_STEP_DURATIONS) {
        recentStepDurations.shift();
    }
    if (recentStepDurations.length > 0) {
        avgStepDurationMs = recentStepDurations.reduce((a, b) => a + b, 0) / recentStepDurations.length;
    }
}

function mainLoop(currentTimestamp) {
    animationFrameId = requestAnimationFrame(mainLoop);

    if (lastTimestamp === 0) { // First frame initialization
        lastTimestamp = currentTimestamp;
        return;
    }

    let deltaTimeMs = currentTimestamp - lastTimestamp;
    lastTimestamp = currentTimestamp;

    // Cap deltaTime to prevent "spiral of death" on long tab inactivations
    const MAX_DELTA_TIME_MS_CAP = 250; // Max 1/4 second to process
    if (deltaTimeMs > MAX_DELTA_TIME_MS_CAP) {
        console.warn(`DeltaTime capped from ${deltaTimeMs.toFixed(2)}ms to ${MAX_DELTA_TIME_MS_CAP}ms`);
        deltaTimeMs = MAX_DELTA_TIME_MS_CAP;
    }

    // --- Simulation Logic ---
    if (!globals.paused) {
        if (config.simulation_fps === -1) { // "Max Speed" mode
            const frameStartTime = performance.now();
            let stepsThisFrame = 0;
            // Try to use about 95% of the frame time for simulation to leave buffer
            const timeBudgetMs = deltaTimeMs * 0.95;

            while (true) {
                simulationStep();
                stepsThisFrame++;
                const elapsedInFrameProcessing = performance.now() - frameStartTime;
                if (elapsedInFrameProcessing + avgStepDurationMs >= timeBudgetMs) {
                    // If estimated next step exceeds budget, stop
                    break;
                }
                // Safety break if avgStepDurationMs is somehow 0 or too small
                if (avgStepDurationMs < 0.1 && elapsedInFrameProcessing >= timeBudgetMs) {
                     break;
                }
            }
            // console.log(`Max Speed: ${stepsThisFrame} steps.`);
            simulationAccumulator = 0; // Not used in this mode

        } else if (config.simulation_fps > 0) { // Target FPS mode
            simulationAccumulator += deltaTimeMs;
            let physicsStepsThisFrame = 0;
            // Safety cap: Max physics steps to prevent freezing if sim_fps is high & machine is slow
            const maxIter = Math.max(10, Math.ceil(config.simulation_fps / 15) + 5); // Heuristic cap

            while (simulationAccumulator >= PHYSICS_FIXED_DELTA_TIME_MS && physicsStepsThisFrame < maxIter) {
                simulationStep();
                simulationAccumulator -= PHYSICS_FIXED_DELTA_TIME_MS;
                physicsStepsThisFrame++;
            }
            if (physicsStepsThisFrame >= maxIter && simulationAccumulator >= PHYSICS_FIXED_DELTA_TIME_MS) {
                console.warn(`Max physics steps (${maxIter}) per frame reached in target FPS mode. Simulation might be falling behind target.`);
                // Optionally clamp accumulator to prevent it from growing indefinitely if system can't keep up
                // simulationAccumulator = PHYSICS_FIXED_DELTA_TIME_MS;
            }
        }
        // If config.simulation_fps is 0, it's handled by globals.paused (no simulation steps).
    } else { // globals.paused is true
        simulationAccumulator = 0; // Reset accumulator when paused
    }

    // --- Rendering Logic ---
    if (config.render_fps > 0) {
        const renderIntervalMs = 1000 / config.render_fps;
        renderAccumulator += deltaTimeMs;

        if (renderAccumulator >= renderIntervalMs) {
            drawFrame();
            renderAccumulator %= renderIntervalMs; // Or just subtract renderIntervalMs
        }
    }
}
