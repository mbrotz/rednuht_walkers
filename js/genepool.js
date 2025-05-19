
function gaussianRandom(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdev + mean;
}

var GenePool = function() {
    this.__constructor.apply(this, arguments);
}

GenePool.prototype.__constructor = function(config) {
    this.threshold = config.genepool_threshold;
    this.range = 1.0 - config.genepool_threshold;
    this.num_tiers = config.genepool_tiers;
    this.tier_capacity = config.genepool_tier_capacity;
    this.range_decay = config.genepool_range_decay;
    this.selection_pressure = config.genepool_selection_pressure;
    
    this.start_score = 0.0;
    this.current_record_score = 0.0;
    this.tiers = [];
    
    var current_range = this.range;
    for (var i = 0; i < this.num_tiers; i++) {
        this.tiers.push({
            index: i,
            is_lowest: i == 0,
            is_highest: i == this.num_tiers - 1,
            range: current_range,
            low: 0.0,
            high: 0.0,
            low_score: 0.0,
            high_score: 0.0,
            sum_score: 0.0,
            mean_score: 0.0,
            entries: [],
        });
        current_range *= this.range_decay;
    }
    var range_sum = 0.0;
    for (var i = 0; i < this.num_tiers; i++) {
        range_sum += this.tiers[i].range;
    }
    for (var i = 0; i < this.num_tiers; i++) {
        this.tiers[i].range /= range_sum;
    }
    var current_threshold = this.threshold;
    for (var i = 0; i < this.num_tiers; i++) {
        let tier = this.tiers[i];
        tier.low = current_threshold;
        current_threshold += this.range * tier.range;
        tier.high = current_threshold;
    }
    this.tiers[this.num_tiers-1].high = 1.0;
};

GenePool.prototype._update_mean = function(tier_index, delta) {
    let tier = this.tiers[tier_index];
    let count = tier.entries.length;
    if (count > 0) {
        tier.sum_score += delta;
        tier.mean_score = tier.sum_score / count;
    } else {
        tier.sum_score = 0;
        tier.mean_score = 0;
    }
}

GenePool.prototype._find_lowest_performing_entry = function(tier_index) {
    let tier = this.tiers[tier_index];
    if (tier.entries.length == 0) {
        return -1;
    }
    var entry = null;
    var index = -1;
    for (var i = 0; i < tier.entries.length; i++) {
        let e = tier.entries[i];
        if (entry === null || e.score < entry.score) {
            entry = e;
            index = i;
        }
    }
    if (entry === null) {
        return -1;
    }
    return index;
}

GenePool.prototype._remove_lowest_performing_entry = function(tier_index, min_score = undefined) {
    let index = this._find_lowest_performing_entry(tier_index);
    if (index >= 0) {
        let tier = this.tiers[tier_index];
        let entry = tier.entries[index];
        if (min_score === undefined || entry.score <= min_score) {
            tier.entries.splice(index, 1);
            this._update_mean(tier_index, -entry.score);
            return entry;
        }
    }
    return null;
}

GenePool.prototype._remove_oldest_entry = function(tier_index) {
    let tier = this.tiers[tier_index];
    if (tier.entries.length > 0) {
        let entry = tier.entries.shift();
        this._update_mean(tier_index, -entry.score);
        return entry;
    }
    return null;
}

GenePool.prototype._adjust_entry = function(tier_index, entry) {
    if (tier_index < 0) {
        return -1;
    }
    for (var i = tier_index; i >= 0; i--) {
        let tier = this.tiers[i];
        if (entry.score >= tier.low_score && entry.score < tier.high_score) {
            if (tier.entries.length < this.tier_capacity) {
                tier.entries.push(entry);
                this._update_mean(i, entry.score);
                return i;
            }
            let replacable_entry_index = this._find_lowest_performing_entry(i);
            let replacable_entry = tier.entries[replacable_entry_index];
            if (replacable_entry.score < entry.score) {
                tier.entries.splice(replacable_entry_index, 1);
                this._update_mean(i, -replacable_entry.score);
                tier.entries.push(entry);
                this._update_mean(i, entry.score);
                return i;
            }
            return -1;
        }
    }
    return -1;
}

GenePool.prototype._adjust_entries = function() {
    for (var i = 0; i < this.num_tiers; i++) {
        let tier = this.tiers[i];
        for (var j = tier.entries.length-1; j >= 0; j--) {
            let removed_entry = tier.entries[j];
            if (removed_entry.score < tier.low_score) {
                tier.entries.splice(j, 1);
                this._update_mean(i, -removed_entry.score);
                this._adjust_entry(i - 1, removed_entry);
            }
        }
    }
}

GenePool.prototype._adjust_tiers = function(score) {
    if (score <= 0.0 || this.current_record_score >= score) {
        return;
    }
    this.start_score = this.threshold * score;
    this.current_record_score = score;
    for (var i = 0; i < this.num_tiers; i++) {
        let tier = this.tiers[i];
        tier.low_score = tier.low * score;
        tier.high_score = tier.high * score;
    }
    this._adjust_entries();
};

GenePool.prototype._place_genome = function(genome, score) {
    var next_tier = null;
    for (var i = this.num_tiers - 1; i >= 0; i--) {
        let tier = this.tiers[i];
        if (score >= tier.low_score) {
            if (tier.entries.length >= this.tier_capacity) {
                if (tier.is_highest || (next_tier && next_tier.entries.length < this.tier_capacity)) {
                    let removed_entry = this._remove_lowest_performing_entry(i, score);
                    if (removed_entry === null)
                        return -1;
                } else {
                    this._remove_oldest_entry(i);
                }
            }
            tier.entries.push({ genome: JSON.stringify(genome), score: score });
            this._update_mean(i, score);
            return i;
        }
        next_tier = tier;
    }
    return -1;
}

GenePool.prototype.addGenome = function(genome, score) {
    if (this.num_tiers === 0 || this.tier_capacity === 0) {
        return -1;
    }
    this._adjust_tiers(score);
    return this._place_genome(genome, score);
};

GenePool.prototype._selectEligibleTiers = function() {
    let result = [];
    for (var i = 0; i < this.num_tiers; i++) {
        if (this.tiers[i].entries.length > 0) {
            result.push({index: i, tier: this.tiers[i]});
        }
    }
    if (result.length <= 1) {
        return result;
    }
    let rank_increment = 1.0 / (result.length - 1) * Math.max(0.0, this.selection_pressure - 1.0);
    var rank_sum = 0.0;
    for (var i = 0; i < result.length; i++) {
        let rank = 1.0 + rank_increment * i;
        result[i].rank = rank;
        rank_sum += rank;
    }
    for (var i = 0; i < result.length; i++) {
        result[i].weight = result[i].rank / rank_sum;
    }
    return result;
}

GenePool.prototype._selectParentEntryUniform = function(selected_tier) {
    if (selected_tier === null || selected_tier.entries.length == 0) {
        return null;
    }
    if (selected_tier.entries.length == 1) {
        return selected_tier.entries[0];
    }
    let selected_entry_index = Math.floor(Math.random() * selected_tier.entries.length); 
    return selected_tier.entries[selected_entry_index];
}

GenePool.prototype._selectEligibleTierUniform = function(eligible_tiers) {
    if (eligible_tiers.length == 0) {
        return null;
    }
    if (eligible_tiers.length == 1) {
        return eligible_tiers[0].tier;
    }
    let selected_tier_index = Math.floor(Math.random() * eligible_tiers.length);
    return eligible_tiers[selected_tier_index].tier;
}

GenePool.prototype._selectEligibleTierWeighted = function(eligible_tiers) {
    if (eligible_tiers.length == 0) {
        return null;
    }
    if (eligible_tiers.length == 1) {
        return eligible_tiers[0].tier;
    }
    let random_value = Math.random();
    var sum = 0.0;
    for (var i = 0; i < eligible_tiers.length; i++) {
        let weight = eligible_tiers[i].weight;
        if (random_value >= sum && random_value < sum + weight) {
            return eligible_tiers[i].tier;
        }
        sum += weight;
    }
    return eligible_tiers[eligible_tiers.length-1].tier;
}

GenePool.prototype.selectParentGenome = function() {
    if (this.num_tiers === 0 || this.tier_capacity === 0) {
        return null;
    }
    let eligible_tiers = this._selectEligibleTiers();
    let selected_tier = this._selectEligibleTierWeighted(eligible_tiers);
    let selected_parent = this._selectParentEntryUniform(selected_tier);
    if (selected_parent !== null)
        return JSON.parse(selected_parent.genome);
    return null;
};
