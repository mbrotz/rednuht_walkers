var GenePool = function() {
    this.__constructor.apply(this, arguments);
}

GenePool.prototype.__constructor = function(config) {
    this.base_pool_threshold = config.base_pool_threshold;
    this.num_broad_spectrum_tiers = config.num_broad_spectrum_tiers;
    this.num_elite_refinement_tiers = config.num_elite_refinement_tiers;
    this.num_total_tiers = this.num_broad_spectrum_tiers + this.num_elite_refinement_tiers;
    this.capacity_per_tier = config.capacity_per_tier;
    
    this.start_score = 0.0;
    this.current_record_score = 0.0;
    this.tiers = [];
    
    var index = 0;
    var elite_tier_threshold = this.base_pool_threshold;
    var elite_tier_gap = 1.0 - elite_tier_threshold;
    if (this.num_broad_spectrum_tiers > 0) {
        let broad_range = 1.0 - this.base_pool_threshold;
        let per_tier_increment = broad_range / this.num_broad_spectrum_tiers;
        var last_threshold;
        for (var i = 0; i < this.num_broad_spectrum_tiers; i++) {
            last_threshold = this.base_pool_threshold + per_tier_increment * i;
            this.tiers.push({
                index: index++,
                elite: false,
                low: last_threshold,
                high: 0.0,
                low_score: 0.0,
                high_score: 0.0,
                sum_score: 0.0,
                mean_score: 0.0,
                entries: [],
            });
        }
        elite_tier_gap = (1.0 - last_threshold) / 2.0;
        elite_tier_threshold = last_threshold + elite_tier_gap;
    }
    if (this.num_elite_refinement_tiers > 0) {
        for (var i = 0; i < this.num_elite_refinement_tiers; i++) {
            this.tiers.push({
                index: index++,
                elite: true,
                low: elite_tier_threshold,
                high: 0.0,
                low_score: 0.0,
                high_score: 0.0,
                sum_score: 0.0,
                mean_score: 0.0,
                entries: [],
            });
            elite_tier_gap *= 0.5;
            elite_tier_threshold += elite_tier_gap;
        }
    }
    if (this.num_total_tiers > 0) {
        for (var i = 0; i < this.num_total_tiers - 1; i++) {
            this.tiers[i].high = this.tiers[i+1].low;
        }
        this.tiers[this.num_total_tiers - 1].high = 1.0;
    }
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

GenePool.prototype._remove_lowest_performing_entry = function(tier_index) {
    let index = this._find_lowest_performing_entry(tier_index);
    if (index >= 0) {
        let tier = this.tiers[tier_index];
        let entry = tier.entries[index];
        tier.entries.splice(index, 1);
        this._update_mean(tier_index, -entry.score);
        return entry;
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
            if (tier.entries.length < this.capacity_per_tier) {
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
    for (var i = 0; i < this.num_total_tiers; i++) {
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
    this.start_score = this.base_pool_threshold * score;
    this.current_record_score = score;
    for (var i = 0; i < this.num_total_tiers; i++) {
        let tier = this.tiers[i];
        tier.low_score = tier.low * score;
        tier.high_score = tier.high * score;
    }
    this._adjust_entries();
};

GenePool.prototype._place_genome = function(genome, score) {
    for (var i = this.num_total_tiers - 1; i >= 0; i--) {
        let tier = this.tiers[i];
        if (score >= tier.low_score) {
            if (tier.entries.length >= this.capacity_per_tier) {
                //this._remove_lowest_performing_entry(i);
                this._remove_oldest_entry(i);
            }
            tier.entries.push({ genome: JSON.stringify(genome), score: score });
            this._update_mean(i, score);
            return i;
        }
    }
    return -1;
}

GenePool.prototype.addGenome = function(genome, score) {
    if (this.num_total_tiers === 0 || this.capacity_per_tier === 0) {
        return -1;
    }
    this._adjust_tiers(score);
    return this._place_genome(genome, score);
};

GenePool.prototype._selectParentEntry = function(eligible_tiers) {
    let selected_tier_index = eligible_tiers[Math.floor(Math.random() * eligible_tiers.length)];
    let selected_tier = this.tiers[selected_tier_index];
    let selected_entry_index = Math.floor(Math.random() * selected_tier.entries.length); 
    let selected_entry = selected_tier.entries[selected_entry_index];
    return selected_entry;
}

GenePool.prototype.selectParentGenome = function() {
    if (this.num_total_tiers === 0 || this.capacity_per_tier === 0) {
        return null;
    }
    let eligible_tiers = [];
    for (var i = 0; i < this.num_total_tiers; i++) {
        if (this.tiers[i].entries.length > 0) { 
            eligible_tiers.push(i);
        }
    }
    if (eligible_tiers.length === 0) {
        return null;
    }
    let parent1 = this._selectParentEntry(eligible_tiers);
    let parent2 = this._selectParentEntry(eligible_tiers);
    if (parent1.score > parent2.score)
        return JSON.parse(parent1.genome);
    return JSON.parse(parent2.genome);
};
