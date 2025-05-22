
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
    game: null,
    world: null,
    floor: null,
    population: null,
    mapelites: null,

    history: null,
    interface: null,

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
