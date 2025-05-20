
let MapElites = function() {
    this.__constructor.apply(this, arguments);
}

MapElites.prototype.__constructor = function(config) {
    this.history = new History(config);
    this.bin_selection_pressure = config.mapelites_bin_selection_pressure;
    this.num_height_bins = config.mapelites_height_bins;
    this.bin_size = 1.0 / this.num_height_bins;
    this.bins = [];
    for (let i = 0; i < this.num_height_bins; i++) {
        let bin = {
            index: i,
            low: i * this.bin_size,
            high: i * this.bin_size + this.bin_size,
            genepool: new GenePool(config),
        };
        this.bins.push(bin);
    }
    this.bins[this.bins.length-1].high = 1.0;
}

MapElites.prototype._selectFittingBin = function(walker) {
    if (walker.mean_head_height < 0.0 || walker.mean_head_height > 1.0) {
        return null;
    }
    let bin_index = Math.floor(walker.mean_head_height / this.bin_size);
    if (bin_index < 0 || bin_index >= this.bins.length) {
        console.error("invalid bin index");
        return null;
    }
    let bin = this.bins[bin_index];
    if (bin === null) {
        console.error("null bin: " + bin_index);
        return null;
    }
    if (walker.mean_head_height < bin.low || walker.mean_head_height > bin.high) {
        console.log("invalid bin range! bin " + bin.index + ", low: " + bin.low.toFixed(2) + ", high: " + bin.high.toFixed(2) + ", walker.mean_head_height: " + walker.mean_head_height);
        return null;
    }
    return bin;
}

MapElites.prototype._selectEligibleBins = function() {
    let result = []
    for (let i = 0; i < this.bins.length; i++) {
        let bin = this.bins[i];
        if (!bin.genepool.isEmpty()) {
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

MapElites.prototype._selectEligibleBinUniform = function(eligible_bins) {
    if (eligible_bins.length == 0) {
        return null;
    }
    if (eligible_bins.length == 1) {
        return eligible_bins[0].bin;
    }
    let selected_bin_index = Math.floor(Math.random() * eligible_bins.length);
    return eligible_bins[selected_bin_index].bin;
}

MapElites.prototype._selectEligibleBinWeighted = function(eligible_bins) {
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

MapElites.prototype.addWalker = function(walker) {
    let bin = this._selectFittingBin(walker);
    if (bin) {
        let is_highscore = bin.genepool.addWalker(walker);
        if (is_highscore) {
            this.history.addWalker(walker, true);
        }
        return is_highscore;
    }
    return false;
}

MapElites.prototype.createRandomWalker = function() {
    return new Walker(globals.world);
}

MapElites.prototype.createMutatedWalker = function() {
    let eligible_bins = this._selectEligibleBins();
    let bin = this._selectEligibleBinWeighted(eligible_bins);
    if (bin) {
        return bin.genepool.createMutatedWalker();
    }
    return this.createRandomWalker();
}
