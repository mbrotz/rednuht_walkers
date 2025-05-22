
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
        let walker = globals.mapelites.createRandomWalker();
        walker.id = this.getNextWalkerId();
        this.walkers.push(walker);
    }
}

Population.prototype.simulationStep = function() {
    for (let k = 0; k < this.walkers.length; k++) {
        let walker = this.walkers[k];
        if (walker.is_eliminated) {
            globals.mapelites.addWalker(walker);
            walker.destroyBody();
            walker = globals.mapelites.createMutatedWalker()
            walker.id = this.getNextWalkerId();
            this.walkers[k] = walker;
        }
        walker.simulationStep();
    }
}

let History = function() {
    this.__constructor.apply(this, arguments);
}

History.prototype.__constructor = function(config) {
    this.history_size = config.history_size;
    this.walkers = [];
    this.record_score = 0.0;
    this.record_holder = null;
}

History.prototype._maintainSize = function() {
    while (this.walkers.length > this.history_size) {
        this.walkers.shift();
    }
}

History.prototype.addWalker = function(walker, allow_non_highscore = false) {
    let is_highscore = walker.score > this.record_score;
    if (is_highscore || allow_non_highscore === true) {
        let entry = {
            id: walker.id,
            name: walker.name,
            score: walker.score,
            mean_head_height: walker.mean_head_height,
            mean_forward_velocity: walker.mean_forward_velocity,
            genome: JSON.stringify(walker.genome),
        };
        this.walkers.push(entry);
        if (is_highscore) {
            this.record_holder = entry;
            this.record_score = entry.score;
        } else {
            this.walkers.sort((a, b) => {
                if (a.score < b.score)
                    return -1;
                if (a.score > b.score)
                    return 1;
                if (a.mean_head_height < b.mean_head_height)
                    return -1;
                if (a.mean_head_height > b.mean_head_height)
                    return 1;
                if (a.mean_forward_velocity < b.mean_forward_velocity)
                    return -1;
                if (a.mean_forward_velocity > b.mean_forward_velocity)
                    return 1;
                return 0;
            });
        }
        this._maintainSize();
        return is_highscore;
    }
    return false;
}
