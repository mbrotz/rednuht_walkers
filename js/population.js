class Population {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.population_size = this.game.config.population_size;
        this.walkers = [];
        this.next_walker_id = 1;
    }

    getNextWalkerId() {
        return this.next_walker_id++;
    }

    getTotalWalkersCreated() {
        return this.next_walker_id - 1;
    }

    initPopulation() {
        while (this.walkers.length < this.population_size) {
            let walker = this.game.mapelites.createRandomWalker();
            walker.id = this.getNextWalkerId();
            this.walkers.push(walker);
        }
    }

    simulationStep() {
        for (let k = 0; k < this.walkers.length; k++) {
            let walker = this.walkers[k];
            if (walker.is_eliminated) {
                this.game.mapelites.addWalker(walker);
                walker.destroyBody();
                walker = this.game.mapelites.createMutatedWalker()
                walker.id = this.getNextWalkerId();
                this.walkers[k] = walker;
            }
            walker.simulationStep();
        }
    }
}

class History {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.history_size = this.game.config.history_size;
        this.walkers = [];
        this.record_score = 0.0;
        this.record_holder = null;
    }

    maintainSize() {
        while (this.walkers.length > this.history_size) {
            this.walkers.shift();
        }
    }

    addWalker(walker, allow_non_highscore = false) {
        let is_highscore = walker.score > this.record_score;
        if (is_highscore || allow_non_highscore === true) {
            let entry = walker.toEntry();
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
            this.maintainSize();
            return is_highscore;
        }
        return false;
    }
}

class Binning {
    constructor(gameInstance, threshold, range_decay, num_bins, selection_pressure) {
        this.game = gameInstance;
        this.threshold = threshold;
        this.range_decay = range_decay;
        this.num_bins = num_bins;
        this.selection_pressure = selection_pressure;
        this.bins = [];
        this.range = 1.0 - this.threshold;
        this._initializeBins();
    }

    _initializeBins() {
        if (this.num_bins === 0) return;
        let current_range_factor = 1.0;
        for (let i = 0; i < this.num_bins; i++) {
            this.bins.push({
                index: i,
                range_factor: current_range_factor,
                range: 0.0,
                low: 0.0,
                high: 0.0,
            });
            current_range_factor *= this.range_decay;
        }
        let range_factor_sum = 0.0;
        for (let i = 0; i < this.num_bins; i++) {
            range_factor_sum += this.bins[i].range_factor;
        }
        if (range_factor_sum > 0) {
            for (let i = 0; i < this.num_bins; i++) {
                this.bins[i].range = this.bins[i].range_factor / range_factor_sum;
            }
        } else {
             for (let i = 0; i < this.num_bins; i++) {
                this.bins[i].range = 1.0 / this.num_bins;
            }
        }
        let current_feature_value = this.threshold;
        for (let i = 0; i < this.num_bins; i++) {
            let bin = this.bins[i];
            bin.low = current_feature_value;
            current_feature_value += this.range * bin.range;
            bin.high = current_feature_value;
        }
        this.bins[this.bins.length -1].high = 1.0;
        this.bins[this.bins.length - 1].range = 1.0 - this.bins[this.bins.length -1].low;
    }

    _isBinEligible(bin) {
        throw new Error("Method '_isBinEligible()' must be implemented by subclasses.");
    }

    getEligibleBins() {
        let result = [];
        for (let i = 0; i < this.bins.length; i++) {
            let bin = this.bins[i];
            if (this._isBinEligible(bin)) {
                result.push({
                    index: i,
                    bin: bin,
                });
            }
        }
        if (result.length <= 1) {
            return result;
        }
        let rank_increment = 1.0 / (result.length - 1) * Math.max(0.0, this.selection_pressure - 1.0);
        let rank_sum = 0.0;
        for (let i = 0; i < result.length; i++) {
            let rank = 1.0 + rank_increment * i;
            result[i].rank = rank;
            rank_sum += rank;
        }
        if (rank_sum > 0) {
            for (let i = 0; i < result.length; i++) {
                result[i].weight = result[i].rank / rank_sum;
            }
        } else {
            for (let i = 0; i < result.length; i++) {
                result[i].weight = 1.0 / result.length;
            }
        }
        return result;
    }

    selectBinUniform(eligible_bins) {
        if (eligible_bins.length == 0) {
            return null;
        }
        if (eligible_bins.length == 1) {
            return eligible_bins[0].bin;
        }
        let selected_bin_index_in_eligible_array = Math.floor(Math.random() * eligible_bins.length);
        return eligible_bins[selected_bin_index_in_eligible_array].bin;
    }

    selectBinWeighted(eligible_bins) {
        if (eligible_bins.length == 0) {
            return null;
        }
        if (eligible_bins.length == 1) {
            return eligible_bins[0].bin;
        }
        let random_value = Math.random();
        let sum = 0.0;
        for (let i = 0; i < eligible_bins.length; i++) {
            let weight = eligible_bins[i].weight;
            if (random_value >= sum && random_value < sum + weight) {
                return eligible_bins[i].bin;
            }
            sum += weight;
        }
        return eligible_bins[eligible_bins.length - 1].bin;
    }

    findBinForFeature(feature_value) {
        if (this.num_bins === 0) {
            return null;
        }
        if (feature_value < this.threshold || feature_value > 1.0) {
            return null;
        }
        for (let i = 0; i < this.num_bins - 1; i++) {
            const bin = this.bins[i];
            if (feature_value >= bin.low && feature_value < bin.high) {
                return bin;
            }
        }
        return this.bins[this.bins.length - 1];
    }
}