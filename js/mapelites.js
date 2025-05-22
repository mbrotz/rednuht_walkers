class MapElites {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.history = new History(this.game);
        this.threshold = this.game.config.mapelites_threshold;
        this.range = 1.0 - this.threshold;
        this.range_decay = this.game.config.mapelites_range_decay;
        this.bin_selection_pressure = this.game.config.mapelites_bin_selection_pressure;
        this.num_height_bins = this.game.config.mapelites_height_bins;
        this.bins = [];
        let current_range = this.range;
        for (let i = 0; i < this.num_height_bins; i++) {
            let bin = {
                index: i,
                enabled: true,
                range: current_range,
                low: 0.0,
                high: 0.0,
                genepool: new GenePool(this.game),
            };
            this.bins.push(bin);
            current_range *= this.range_decay;
        }
        let range_sum = 0.0;
        for (let i = 0; i < this.num_height_bins; i++) {
            range_sum += this.bins[i].range;
        }
        for (let i = 0; i < this.num_height_bins; i++) {
            this.bins[i].range /= range_sum;
        }
        let current_threshold = this.threshold;
        for (let i = 0; i < this.num_height_bins; i++) {
            let bin = this.bins[i];
            bin.low = current_threshold;
            current_threshold += this.range * bin.range;
            bin.high = current_threshold;
        }
    }

    selectFittingBin(walker) {
        if (walker.mean_head_height < this.threshold || walker.mean_head_height > 1.0) {
            return null;
        }
        if (this.bins.length === 0) {
            return null;
        }
        for (let i = 0; i < this.bins.length - 1; i++) {
            let bin = this.bins[i];
            if (walker.mean_head_height >= bin.low && walker.mean_head_height < bin.high) {
                return bin;
            }
        }
        return this.bins[this.bins.length - 1];
    }

    selectEligibleBins() {
        let result = []
        for (let i = 0; i < this.bins.length; i++) {
            let bin = this.bins[i];
            if (bin.enabled && !bin.genepool.isEmpty()) {
                result.push({
                    index: i,
                    bin: bin,
                });
            }
        }
        if (result.length <= 1) {
            return result;
        }
        let rank_increment = 1.0 / (result.length - 1) * Math.max(0.0, this.bin_selection_pressure - 1.0);
        let rank_sum = 0.0;
        for (let i = 0; i < result.length; i++) {
            let rank = 1.0 + rank_increment * i;
            result[i].rank = rank;
            rank_sum += rank;
        }
        for (let i = 0; i < result.length; i++) {
            result[i].weight = result[i].rank / rank_sum;
        }
        return result;
    }

    selectEligibleBinUniform(eligible_bins) {
        if (eligible_bins.length == 0) {
            return null;
        }
        if (eligible_bins.length == 1) {
            return eligible_bins[0].bin;
        }
        let selected_bin_index = Math.floor(Math.random() * eligible_bins.length);
        return eligible_bins[selected_bin_index].bin;
    }

    selectEligibleBinWeighted(eligible_bins) {
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
        return eligible_bins[eligible_bins.length-1].bin;
    }

    addWalker(walker) {
        let bin = this.selectFittingBin(walker);
        if (bin) {
            let is_highscore = bin.genepool.addWalker(walker);
            if (is_highscore) {
                this.history.addWalker(walker, true);
            }
            return is_highscore;
        }
        return false;
    }

    createRandomWalker() {
        return new Walker(this.game);
    }

    createMutatedWalker() {
        let eligible_bins = this.selectEligibleBins();
        let bin = this.selectEligibleBinWeighted(eligible_bins);
        if (bin) {
            return bin.genepool.createMutatedWalker();
        }
        return this.createRandomWalker();
    }
}
