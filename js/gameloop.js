class GameLoop {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.time_step = this.game.config.time_step;
        this.simulation_fps = this.game.config.simulation_fps;
        this.render_fps = this.game.config.render_fps;
        this.velocity_iterations = this.game.config.velocity_iterations;
        this.position_iterations = this.game.config.position_iterations;

        this.paused = (this.simulation_fps === 0);
        this.lastTimestamp = 0;
        this.simulationAccumulator = 0;
        this.renderAccumulator = 0;
        this.animationFrameId = null;
        this.recentStepDurations = [];

        this.PHYSICS_FIXED_DELTA_TIME_SECONDS = 1.0 / this.time_step;
        this.PHYSICS_FIXED_DELTA_TIME_MS = this.PHYSICS_FIXED_DELTA_TIME_SECONDS * 1000;
        this.avgStepDurationMs = this.PHYSICS_FIXED_DELTA_TIME_MS;

        this.MAX_RECENT_STEP_DURATIONS = 10;

        this.isTabActive = !document.hidden;
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    handleVisibilityChange() {
        const becomingVisible = !document.hidden && !this.isTabActive;
        this.isTabActive = !document.hidden;
        if (becomingVisible) {
            this.lastTimestamp = performance.now();
            this.simulationAccumulator = 0;
            this.renderAccumulator = 0;
            if (this.animationFrameId === null && (this.simulation_fps !== 0 || this.render_fps > 0)) {
                this.startMainLoop();
            }
        }
    }

    startMainLoop() {
        if (!this.paused || this.render_fps > 0) {
            if (this.animationFrameId === null) {
                if (this.lastTimestamp === 0) {
                    this.lastTimestamp = performance.now();
                }
                this.simulationAccumulator = 0;
                this.renderAccumulator = 0;
                this.animationFrameId = requestAnimationFrame(this.mainLoop.bind(this));
            }
        }
    }

    simulationStepInternal() {
        const stepStartTime = performance.now();
        this.game.population.simulationStep();
        this.game.world.Step(this.PHYSICS_FIXED_DELTA_TIME_SECONDS, this.velocity_iterations, this.position_iterations);
        if (this.isTabActive && this.game.interface) {
            this.game.interface.updateUI();
        }
        const stepEndTime = performance.now();
        this.recentStepDurations.push(stepEndTime - stepStartTime);
        if (this.recentStepDurations.length > this.MAX_RECENT_STEP_DURATIONS) {
            this.recentStepDurations.shift();
        }
        if (this.recentStepDurations.length > 0) {
            this.avgStepDurationMs = this.recentStepDurations.reduce((a, b) => a + b, 0) / this.recentStepDurations.length;
        } else {
            this.avgStepDurationMs = this.PHYSICS_FIXED_DELTA_TIME_MS;
        }
    }

    mainLoop(currentTimestamp) {
        this.animationFrameId = requestAnimationFrame(this.mainLoop.bind(this));
        if (this.lastTimestamp === 0) {
            this.lastTimestamp = currentTimestamp;
            return;
        }
        let deltaTimeMs = currentTimestamp - this.lastTimestamp;
        this.lastTimestamp = currentTimestamp;
        const MAX_DELTA_TIME_MS_CAP = this.isTabActive ? 100 : 250;
        if (deltaTimeMs > MAX_DELTA_TIME_MS_CAP) {
            deltaTimeMs = MAX_DELTA_TIME_MS_CAP;
        }
        if (!this.paused) {
            if (this.simulation_fps === -1) {
                const frameStartTime = performance.now();
                let stepsThisFrame = 0;
                const timeBudgetMs = deltaTimeMs * 0.95;
                const MAX_STEPS_IN_ASAP_FRAME = 10;
                while (stepsThisFrame < MAX_STEPS_IN_ASAP_FRAME) {
                    this.simulationStepInternal();
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
            } else if (this.simulation_fps > 0) {
                this.simulationAccumulator += deltaTimeMs;
                let physicsStepsThisFrame = 0;
                const maxIter = Math.max(10, Math.ceil(this.simulation_fps / 15) + 5);
                while (this.simulationAccumulator >= this.PHYSICS_FIXED_DELTA_TIME_MS && physicsStepsThisFrame < maxIter) {
                    this.simulationStepInternal();
                    this.simulationAccumulator -= this.PHYSICS_FIXED_DELTA_TIME_MS;
                    physicsStepsThisFrame++;
                }
                if (physicsStepsThisFrame >= maxIter && this.simulationAccumulator >= this.PHYSICS_FIXED_DELTA_TIME_MS) {
                    this.simulationAccumulator = Math.min(this.simulationAccumulator, 3 * this.PHYSICS_FIXED_DELTA_TIME_MS);
                }
            }
        } else {
            this.simulationAccumulator = 0;
        }
        if (this.render_fps > 0 && this.isTabActive) {
            const renderIntervalMs = 1000 / this.render_fps;
            this.renderAccumulator += deltaTimeMs;
            if (this.renderAccumulator >= renderIntervalMs) {
                if (this.game.renderer) {
                    this.game.renderer.drawFrame();
                }
                this.renderAccumulator %= renderIntervalMs;
            }
        } else if (this.render_fps > 0 && !this.isTabActive) {
            this.renderAccumulator = 0;
        }
    }

    setRenderFps(fps) {
        const oldRenderFps = this.render_fps;
        this.render_fps = fps;
        this.game.config.render_fps = fps;
        if (fps > 0 && oldRenderFps === 0) {
            this.renderAccumulator = 0;
            if (this.animationFrameId === null) {
                this.startMainLoop();
            }
        } else if (fps === 0 && this.simulation_fps === 0) {
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null; 
            }
        }
    }

    setSimulationFps(fps) {
        const oldSimFps = this.simulation_fps;
        this.simulation_fps = fps;
        this.game.config.simulation_fps = fps;
        this.paused = (fps === 0); 
        if (fps !== 0 && oldSimFps === 0) {
            this.simulationAccumulator = 0;
            this.recentStepDurations = []; 
            this.avgStepDurationMs = this.PHYSICS_FIXED_DELTA_TIME_MS;
            if (this.animationFrameId === null) {
                this.startMainLoop();
            }
        } else if (fps === 0 && this.render_fps === 0) {
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null; 
            }
        }
    }
}
