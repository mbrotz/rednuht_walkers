var GenePool = function() {
    this.__constructor.apply(this, arguments);
}

GenePool.prototype.__constructor = function(config) {
    this.base_pool_threshold_percent = config.base_pool_threshold;
    this.num_broad_spectrum_tiers = config.num_broad_spectrum_tiers;
    this.num_elite_refinement_tiers = config.num_elite_refinement_tiers;
    this.capacity_per_tier = config.capacity_per_tier;

    this.total_tiers = this.num_broad_spectrum_tiers + this.num_elite_refinement_tiers;
    this.tiers = [];
    this.tier_actual_score_thresholds = new Array(this.total_tiers).fill(0);

    for (var i = 0; i < this.total_tiers; i++) {
        this.tiers.push([]);
    }
};

GenePool.prototype._calculate_tier_score_thresholds = function(current_record_score) {
    if (this.total_tiers === 0 || current_record_score <= 0) {
        this.tier_actual_score_thresholds.fill(0);
        return;
    }

    var current_threshold_percent = this.base_pool_threshold_percent;

    if (this.num_broad_spectrum_tiers > 0) {
        var score_range_for_broad = 1.0 - this.base_pool_threshold_percent;
        var increment_per_broad_tier = score_range_for_broad / this.num_broad_spectrum_tiers;

        for (var i = 0; i < this.num_broad_spectrum_tiers; i++) {
            this.tier_actual_score_thresholds[i] = current_record_score * current_threshold_percent;
            current_threshold_percent += increment_per_broad_tier;
        }
    } else {
        current_threshold_percent = this.base_pool_threshold_percent; 
    }

    for (var i = 0; i < this.num_elite_refinement_tiers; i++) {
        var tier_index = this.num_broad_spectrum_tiers + i;
        this.tier_actual_score_thresholds[tier_index] = current_record_score * current_threshold_percent;
        var remaining_gap_to_100_percent = 1.0 - current_threshold_percent;
        current_threshold_percent += remaining_gap_to_100_percent / 2.0;
    }
};

GenePool.prototype.addGenome = function(genome, score, current_record_score) {
    if (this.total_tiers === 0 || this.capacity_per_tier === 0) {
        return;
    }

    this._calculate_tier_score_thresholds(current_record_score);

    var added_to_tier = false;

    for (var i = this.total_tiers - 1; i >= 0; i--) {
        if (score >= this.tier_actual_score_thresholds[i]) {

            this.tiers[i].push({ genome: JSON.parse(JSON.stringify(genome)), score: score });
            added_to_tier = true;

            if (this.tiers[i].length > this.capacity_per_tier) {
                this.tiers[i].shift();
            }
            break;
        }
    }
};

GenePool.prototype.selectParentGenome = function() {
    if (this.total_tiers === 0 || this.capacity_per_tier === 0) {
        return null;
    }

    var eligible_tiers = [];
    var total_weight = 0;

    for (var i = 0; i < this.total_tiers; i++) {
        if (this.tiers[i].length > 0) {
            var weight = i + 1;
            eligible_tiers.push({ index: i, weight: weight, cumulative_weight: total_weight + weight });
            total_weight += weight;
        }
    }

    if (eligible_tiers.length === 0) {
        return null;
    }

    var random_draw = Math.random() * total_weight;
    var selected_tier_index = -1;

    for (var i = 0; i < eligible_tiers.length; i++) {
        if (random_draw < eligible_tiers[i].cumulative_weight) {
            selected_tier_index = eligible_tiers[i].index;
            break;
        }
    }

    if (selected_tier_index !== -1) {
        var chosen_tier_genomes = this.tiers[selected_tier_index];
        var random_genome_index_in_tier = Math.floor(Math.random() * chosen_tier_genomes.length);
        var selected_entry = chosen_tier_genomes[random_genome_index_in_tier];
        return JSON.parse(JSON.stringify(selected_entry.genome));
    }

    return null;
};