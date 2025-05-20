
let Population = function() {
    this.__constructor.apply(this, arguments);
}

Population.prototype.__constructor = function(config) {
    this.population_size = config.population_size;
    this.walkers = [];
    this.next_walker_id = 1;
}

Population.prototype.getNextWalkerId = function() {
    return this.next_walker_id++;
}

Population.prototype.getTotalWalkersCreated = function() {
    return this.next_walker_id - 1;
}

Population.prototype.initPopulation = function() {
    while (this.walkers.length < this.population_size) {
        let walker = globals.genepool.createRandomWalker();
        walker.id = this.getNextWalkerId();
        this.walkers.push(walker);
    }
}

Population.prototype.simulationStep = function() {
    for (let k = 0; k < this.walkers.length; k++) {
        let walker = this.walkers[k];
        if (walker.is_eliminated) {
            globals.genepool.addWalker(walker);
            globals.history.addWalker(walker);
            walker.destroyBody();
            walker = globals.genepool.createMutatedWalker()
            walker.id = this.getNextWalkerId();
            this.walkers[k] = walker;
        }
        walker.simulationStep();
    }
}

// -----------------------------------------------------------------------

let History = function() {
    this.__constructor.apply(this, arguments);
}

History.prototype.__constructor = function(config) {
    this.history_size = config.history_size;
    this.walkers = [];
    this.record_score = 0.0;
}

History.prototype._maintainSize = function() {
    while (this.walkers.length > this.history_size) {
        this.walkers.shift();
    }
}

History.prototype.addWalker = function(walker) {
    if (walker.score > this.record_score) {
        this.walkers.push({
            id: walker.id,
            name: walker.name,
            score: walker.score,
            mean_head_height: walker.mean_head_height,
            mean_forward_velocity: walker.mean_forward_velocity,
            genome: JSON.stringify(walker.genome),
        });
        this.record_score = walker.score;
        this._maintainSize();
        return true;
    }
    return false;
}
