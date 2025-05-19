var GenePool = function() {
    this.__constructor.apply(this, arguments);
}

GenePool.prototype.__constructor = function(config) {
    this.base_pool_threshold = config.base_pool_threshold;
    this.num_broad_spectrum_tiers = config.num_broad_spectrum_tiers;
    this.num_elite_refinement_tiers = config.num_elite_refinement_tiers;
    this.capacity_per_tier = config.capacity_per_tier;

    this.total_tiers = this.num_broad_spectrum_tiers + this.num_elite_refinement_tiers;
    this.tiers = []; // Stores [{genome, score}, ...] for each tier
    this.tier_actual_score_thresholds = new Array(this.total_tiers).fill(0); // Stores lower absolute score bound for each tier
    this.tier_actual_upper_score_thresholds = new Array(this.total_tiers).fill(0); // Stores upper absolute score bound for each tier

    // New properties for visualization and average score tracking
    this.tiers_sum_scores = new Array(this.total_tiers).fill(0);
    this.tiers_average_scores = new Array(this.total_tiers).fill(0);
    
    this.current_record_score = 0.0;

    for (var i = 0; i < this.total_tiers; i++) {
        this.tiers.push([]);
    }
};

GenePool.prototype._update_tier_average = function(tier, sum_delta) {
    let count = this.tiers[tier].length;
    if (count > 0) {
        this.tiers_sum_scores[tier] += sum_delta;
        this.tiers_average_scores[tier] = this.tiers_sum_scores[tier] / count;
    } else {
        this.tiers_sum_scores[tier] = 0;
        this.tiers_average_scores[tier] = 0;
    }
}

GenePool.prototype._place_genome = function(genome, score) {
    for (var i = this.total_tiers - 1; i >= 0; i--) {
        if (score >= this.tier_actual_score_thresholds[i]) {
            this.tiers[i].push({ genome: JSON.parse(JSON.stringify(genome)), score: score });
            this._update_tier_average(i, score);
            if (this.tiers[i].length > this.capacity_per_tier) {
                var removed_entry = this.tiers[i].shift(); 
                this._update_tier_average(i, -removed_entry.score);
            }
            return i;
        }
    }
    return -1;
}

GenePool.prototype._remove_lowest_performing_entry = function(tier) {
    let entries = this.tiers[tier];
    if (entries.length == 0) {
        return;
    }
    var entry = null;
    var index = -1;
    for (var i = 0; i < entries.length; i++) {
        let e = entries[i];
        if (entry === null || e.score < entry.score) {
            entry = e;
            index = i;
        }
    }
    if (entry === null) {
        return;
    }
    entries.splice(index, 1);
    this._update_tier_average(tier, -entry.score);
}

GenePool.prototype._place_entry = function(tier, entry) {
    if (tier < 0) {
        return -1;
    }
    for (var i = tier; i >= 0; i--) {
        if (entry.score >= this.tier_actual_score_thresholds[i] && entry.score < this.tier_actual_upper_score_thresholds[i]) {
            if (entry.score >= this.tiers_average_scores[i]) {
                this.tiers[i].push(entry);
                this._update_tier_average(i, entry.score);
                if (this.tiers[i].length > this.capacity_per_tier) {
                    this._remove_lowest_performing_entry(i);
                }           
                return i;
            }
            return -1;
        }
    }
    return -1;
}

GenePool.prototype._adjust_tiers = function() {
    for (var i = 0; i < this.total_tiers; i++) {
        let threshold = this.tier_actual_score_thresholds[i];
        let entries = this.tiers[i];
        for (var j = entries.length-1; j >= 0; j--) {
            let removed_entry = entries[j];
            if (removed_entry.score < threshold) {
                entries.splice(j, 1);
                this._update_tier_average(i, -removed_entry.score);
                this._place_entry(i - 1, removed_entry);
            }
        }
    }
}

GenePool.prototype._update_thresholds = function(score) {
    if (score <= 0.0 || this.current_record_score >= score) {
        return;
    }
    
    this.current_record_score = score;
    
    var elite_tier_threshold = this.base_pool_threshold;
    var elite_tier_gap = 1.0 - elite_tier_threshold;
    
    if (this.num_broad_spectrum_tiers > 0) {
        let broad_range = 1.0 - this.base_pool_threshold;
        let per_tier_increment = broad_range / this.num_broad_spectrum_tiers;
        var last_threshold;
        for (var i = 0; i < this.num_broad_spectrum_tiers; i++) {
            last_threshold = this.base_pool_threshold + per_tier_increment * i;
            this.tier_actual_score_thresholds[i] = last_threshold * score;
        }
        elite_tier_gap = (1.0 - last_threshold) / 2.0;
        elite_tier_threshold = last_threshold + elite_tier_gap;
    }
    
    if (this.num_elite_refinement_tiers > 0) {
        for (var i = 0; i < this.num_elite_refinement_tiers; i++) {
            this.tier_actual_score_thresholds[this.num_broad_spectrum_tiers + i] = elite_tier_threshold * score;
            elite_tier_gap *= 0.5;
            elite_tier_threshold += elite_tier_gap;
        }
    }

    for (var i = 0; i < this.total_tiers - 1; i++) {
        this.tier_actual_upper_score_thresholds[i] = this.tier_actual_score_thresholds[i+1];
    }
    this.tier_actual_upper_score_thresholds[this.total_tiers - 1] = score;
    
    this._adjust_tiers();
};

GenePool.prototype.addGenome = function(genome, score) {
    if (this.total_tiers === 0 || this.capacity_per_tier === 0) {
        return -1;
    }
    this._update_thresholds(score);
    return this._place_genome(genome, score);
};

GenePool.prototype.selectParentGenome = function() {
    if (this.total_tiers === 0 || this.capacity_per_tier === 0) {
        return null;
    }

    var eligible_tiers = [];

    for (var i = 0; i < this.total_tiers; i++) {
        if (this.tiers[i].length > 0) { 
            eligible_tiers.push(i);
        }
    }

    if (eligible_tiers.length === 0) {
        return null; // No genomes in any tier
    }
    
    var selected_tier_index = eligible_tiers[Math.floor(Math.random() * eligible_tiers.length)];
    var chosen_tier_genomes = this.tiers[selected_tier_index];
    var random_genome_index_in_tier = Math.floor(Math.random() * chosen_tier_genomes.length); 
    var selected_entry = chosen_tier_genomes[random_genome_index_in_tier];
    return JSON.parse(JSON.stringify(selected_entry.genome));
};

// New method to get data for visualization
GenePool.prototype.getVisualizationData = function() {
    let current_record_score = this.current_record_score;
    var viz_output = {
        base_pool_start_score: (this.total_tiers > 0 && current_record_score > 0) ? (current_record_score * this.base_pool_threshold) : 0,
        current_record_score: current_record_score,
        tier_details: []
    };

    if (this.total_tiers === 0) {
        return viz_output; // Return with empty tier_details if no tiers configured
    }
    
    for (var i = 0; i < this.total_tiers; i++) {
        var lower_abs = this.tier_actual_score_thresholds[i];
        var upper_abs = this.tier_actual_upper_score_thresholds[i];

        // If a tier's calculated range is invalid (e.g. lower > upper due to record score changes and empty tiers),
        // make its width zero for visualization purposes by setting upper = lower.
        if (lower_abs > upper_abs) {
             upper_abs = lower_abs;
        }
        
        viz_output.tier_details.push({
            lower_bound_abs_score: lower_abs,
            upper_bound_abs_score: upper_abs,
            average_score_in_tier: this.tiers_average_scores[i],
            genome_count_in_tier: this.tiers[i].length,
        });
    }
    return viz_output;
};