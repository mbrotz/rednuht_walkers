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
    genepool_range_decay: 0.95,
    genepool_bins: 60,
    genepool_bin_capacity: 4,
    genepool_bin_selection_pressure: 5.0,
    genepool_gene_mutation_chance: 1.0,
    genepool_gene_mutation_strength: 0.05,

    pressure_line_starting_offset: 1.75,
    pressure_line_base_speed: 0.001,
    pressure_line_acceleration: 0.0000025,
    head_floor_collision_kills: true,
};

function gaussianRandom(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdev + mean;
}

class HeadFloorContactListener extends b2.ContactListener {
    constructor(floor_contact_kills) {
        super();
        this.floor_contact_kills = floor_contact_kills;
    }

    BeginContact(contact) {
        let userDataA = contact.GetFixtureA().GetUserData();
        let userDataB = contact.GetFixtureB().GetUserData();
        if (userDataA && userDataB) {
            let walker = null;
            if (userDataA.isHead && userDataB.isFloor) {
                walker = userDataA.walker;
            } else if (userDataA.isFloor && userDataB.isHead) {
                walker = userDataB.walker;
            }
            if (walker !== null) {
                if (this.floor_contact_kills) {
                    walker.is_eliminated = true;
                }
                if (!walker.head_floor_contact) {
                    walker.head_floor_contact = true;
                    walker.head_floor_contact_at_step = walker.local_step_count;
                    walker.head_floor_contact_torso_x = walker.getTorsoPosition();
                }
            }
        }
    }
}

class Game {
    constructor(config) {
        this.config = config;
        this.createWorld();
        this.createFloor();
        this.createMapElites();
        this.createPopulation();
        this.createInterface();
        this.createRenderer();
        this.createGameLoop();
    }

    createWorld() {
        this.world = new b2.World(new b2.Vec2(0, -10));
        this.world.SetContactListener(new HeadFloorContactListener(this.config.head_floor_collision_kills));
    }

    createFloor() {
        let body_def = new b2.BodyDef();
        let body = this.world.CreateBody(body_def);
        let fix_def = new b2.FixtureDef();
        fix_def.friction = 0.8;
        fix_def.shape = new b2.ChainShape();
        let edges = [
            new b2.Vec2(-3.5, -0.16),
            new b2.Vec2(2.5, -0.16)
        ];
        for(let k = 2; k < this.config.max_floor_tiles; k++) {
            edges.push(new b2.Vec2(edges[edges.length-1].x + 1,-0.16));
        }
        this.max_floor_x = edges[edges.length-1].x;
        fix_def.shape.CreateChain(edges, edges.length);
        let floorFixtureInstance = body.CreateFixture(fix_def);
        floorFixtureInstance.SetUserData({ isFloor: true });
        this.floor = body;
    }

    createInterface() {
        this.interface = new Interface(this);
    }

    createMapElites() {
        this.mapelites = new MapElites(this);
    }

    createPopulation() {
        this.population = new Population(this);
    }

    createRenderer() {
        this.renderer = new Renderer(this);
    }

    createGameLoop() {
        this.gameLoop = new GameLoop(this);
    }

    start() {
        this.population.initPopulation();
        this.interface.initializeUI();
        this.gameLoop.startMainLoop();
    }
}
