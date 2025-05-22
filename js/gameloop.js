
let GameLoop = function() {
    this.__constructor.apply(this, arguments);
}

GameLoop.prototype.__constructor = function(config) {
    this.time_step = config.time_step;
    this.simulation_fps = config.simulation_fps;
    this.render_fps = config.render_fps;
    this.velocity_iterations = config.velocity_iterations;
    this.position_iterations = config.position_iterations;
    this.paused = (this.simulation_fps === 0);
    this.lastTimestamp = 0;
    this.simulationAccumulator = 0;
    this.renderAccumulator = 0;
    this.animationFrameId = null;
    this.recentStepDurations = [];
    this.avgStepDurationMs = (1.0 / this.time_step) * 1000; // Initial estimate

    // Derived constants
    this.PHYSICS_FIXED_DELTA_TIME_SECONDS = 1.0 / this.time_step;
    this.PHYSICS_FIXED_DELTA_TIME_MS = this.PHYSICS_FIXED_DELTA_TIME_SECONDS * 1000;

    // Max speed mode constants
    this.MAX_RECENT_STEP_DURATIONS = 10;


    // --- Integrated gameInit logic ---
    globals.world = new b2.World(new b2.Vec2(0, -10));
    globals.world.SetContactListener(new HeadFloorContactListener()); // HeadFloorContactListener is still in game.js
    globals.floor = this._createFloor(config);
    globals.population = new Population(config);
    globals.mapelites = new MapElites(config);
    // globals.genepool = null; // This global is now managed by Interface for display purposes
    globals.history = globals.mapelites.history; // Default global history

    drawInit(); // drawInit uses global config and sets up globals.camera, globals.sim_canvas etc.
    
    // Create and initialize the interface
    // 'this' (the GameLoop instance) is passed to Interface constructor
    globals.interface = new Interface(config, this); 

    // Initialize loop state (already done for most loop-specific vars)
    this.paused = (this.simulation_fps === 0); // Re-affirm based on current this.simulation_fps

    globals.population.initPopulation();
    globals.interface.updateWalkerCount(); // Use interface methods
    globals.interface.updatePopulationList(); // Use interface methods

    // Start the main loop if not initially paused or if rendering is on
    if (!this.paused || this.render_fps > 0) {
        this.animationFrameId = requestAnimationFrame(this._mainLoop.bind(this));
    }
}

GameLoop.prototype._createFloor = function(config) {
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

GameLoop.prototype._simulationStep = function() {
    const stepStartTime = performance.now();

    globals.population.simulationStep();
    globals.world.Step(this.PHYSICS_FIXED_DELTA_TIME_SECONDS, this.velocity_iterations, this.position_iterations);
    // globals.world.ClearForces(); // Box2D typically handles this

    // Use interface methods for UI updates
    if (globals.interface) {
        globals.interface.updateWalkerCount();
        globals.interface.updatePopulationList();
        globals.interface.updateHistoryList();
    }

    const stepEndTime = performance.now();
    this.recentStepDurations.push(stepEndTime - stepStartTime);
    if (this.recentStepDurations.length > this.MAX_RECENT_STEP_DURATIONS) {
        this.recentStepDurations.shift();
    }
    if (this.recentStepDurations.length > 0) {
        this.avgStepDurationMs = this.recentStepDurations.reduce((a, b) => a + b, 0) / this.recentStepDurations.length;
    }
}

GameLoop.prototype._mainLoop = function(currentTimestamp) {
    this.animationFrameId = requestAnimationFrame(this._mainLoop.bind(this));

    if (this.lastTimestamp === 0) { // First frame initialization
        this.lastTimestamp = currentTimestamp;
        return;
    }

    let deltaTimeMs = currentTimestamp - this.lastTimestamp;
    this.lastTimestamp = currentTimestamp;

    const MAX_DELTA_TIME_MS_CAP = 250;
    if (deltaTimeMs > MAX_DELTA_TIME_MS_CAP) {
        console.warn(`DeltaTime capped from ${deltaTimeMs.toFixed(2)}ms to ${MAX_DELTA_TIME_MS_CAP}ms`);
        deltaTimeMs = MAX_DELTA_TIME_MS_CAP;
    }

    if (!this.paused) {
        if (this.simulation_fps === -1) { // "Max Speed" mode
            const frameStartTime = performance.now();
            let stepsThisFrame = 0;
            const timeBudgetMs = deltaTimeMs * 0.95;

            while (true) {
                this._simulationStep();
                stepsThisFrame++;
                const elapsedInFrameProcessing = performance.now() - frameStartTime;
                if (elapsedInFrameProcessing + this.avgStepDurationMs >= timeBudgetMs) {
                    break;
                }
                if (this.avgStepDurationMs < 0.1 && elapsedInFrameProcessing >= timeBudgetMs) {
                     break;
                }
            }
            this.simulationAccumulator = 0;
        } else if (this.simulation_fps > 0) { // Target FPS mode
            this.simulationAccumulator += deltaTimeMs;
            let physicsStepsThisFrame = 0;
            const maxIter = Math.max(10, Math.ceil(this.simulation_fps / 15) + 5);

            while (this.simulationAccumulator >= this.PHYSICS_FIXED_DELTA_TIME_MS && physicsStepsThisFrame < maxIter) {
                this._simulationStep();
                this.simulationAccumulator -= this.PHYSICS_FIXED_DELTA_TIME_MS;
                physicsStepsThisFrame++;
            }
            if (physicsStepsThisFrame >= maxIter && this.simulationAccumulator >= this.PHYSICS_FIXED_DELTA_TIME_MS) {
                console.warn(`Max physics steps (${maxIter}) per frame reached in target FPS mode. Simulation might be falling behind target.`);
            }
        }
    } else { // this.paused is true
        this.simulationAccumulator = 0;
    }

    if (this.render_fps > 0) {
        const renderIntervalMs = 1000 / this.render_fps;
        this.renderAccumulator += deltaTimeMs;

        if (this.renderAccumulator >= renderIntervalMs) {
            drawFrame(); // drawFrame uses globals
            this.renderAccumulator %= renderIntervalMs;
        }
    }
}

GameLoop.prototype.setRenderFps = function(fps) {
    const oldRenderFps = this.render_fps;
    this.render_fps = fps;

    if (fps > 0 && oldRenderFps === 0) {
        this.renderAccumulator = 0;
        if (this.animationFrameId === null) {
            console.log("Restarting mainLoop due to render_fps change.");
            this.lastTimestamp = 0;
            this.simulationAccumulator = 0; // Reset sim accumulator too if loop was fully stopped
            this.animationFrameId = requestAnimationFrame(this._mainLoop.bind(this));
        }
    } else if (fps === 0 && this.simulation_fps === 0) { // Render off AND simulation paused
        if (this.animationFrameId !== null) {
            console.log("Stopping mainLoop completely (render and sim off).");
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}

GameLoop.prototype.setSimulationFps = function(fps) {
    const oldSimFps = this.simulation_fps;
    this.simulation_fps = fps;

    if (fps !== 0) { // Simulation is active
        if (this.paused || oldSimFps === 0) { // If it was paused or just starting from 0 FPS
            this.paused = false;
            this.lastTimestamp = 0;
            this.simulationAccumulator = 0;
            // this.renderAccumulator = 0; // Optional: reset render accumulator
            this.recentStepDurations = [];
            this.avgStepDurationMs = this.PHYSICS_FIXED_DELTA_TIME_MS;

            if (this.animationFrameId === null) {
                console.log("Restarting mainLoop due to simulation_fps change from 0/paused.");
                this.animationFrameId = requestAnimationFrame(this._mainLoop.bind(this));
            }
        }
    } else { // fps === 0, so PAUSE simulation
        this.paused = true;
        if (this.render_fps === 0 && this.animationFrameId !== null) { // Sim paused AND render off
            console.log("Stopping mainLoop completely (sim paused and render off).");
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}
