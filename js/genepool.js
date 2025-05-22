class GenePool {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.threshold = this.game.config.genepool_threshold;
        this.range_decay = this.game.config.genepool_range_decay;
        this.range = 1.0 - this.threshold;
        this.num_tiers = this.game.config.genepool_tiers;
        this.tier_capacity = this.game.config.genepool_tier_capacity;
        this.tier_selection_pressure = this.game.config.genepool_tier_selection_pressure;
        this.gene_mutation_chance = this.game.config.genepool_gene_mutation_chance;
        this.gene_mutation_strength = this.game.config.genepool_gene_mutation_strength;
        this.start_score = 0.0;
        this.num_walkers = 0;
        this.tiers = [];
        this.history = new History(this.game);

        let current_range = this.range;
        for (let i = 0; i < this.num_tiers; i++) {
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
        let range_sum = 0.0;
        for (let i = 0; i < this.num_tiers; i++) {
            range_sum += this.tiers[i].range;
        }
        for (let i = 0; i < this.num_tiers; i++) {
            this.tiers[i].range /= range_sum;
        }
        let current_threshold = this.threshold;
        for (let i = 0; i < this.num_tiers; i++) {
            let tier = this.tiers[i];
            tier.low = current_threshold;
            current_threshold += this.range * tier.range;
            tier.high = current_threshold;
        }
    }

    updateMean(tier_index, delta) {
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

    findLowestPerformingEntry(tier_index) {
        let tier = this.tiers[tier_index];
        if (tier.entries.length == 0) {
            return -1;
        }
        let entry = null;
        let index = -1;
        for (let i = 0; i < tier.entries.length; i++) {
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

    removeLowestPerformingEntry(tier_index, min_score = undefined) {
        let index = this.findLowestPerformingEntry(tier_index);
        if (index >= 0) {
            let tier = this.tiers[tier_index];
            let entry = tier.entries[index];
            if (min_score === undefined || entry.score <= min_score) {
                tier.entries.splice(index, 1);
                this.num_walkers--;
                this.updateMean(tier_index, -entry.score);
                return entry;
            }
        }
        return null;
    }

    findLowestHeadEntry(tier_index) {
        let tier = this.tiers[tier_index];
        if (tier.entries.length == 0) {
            return -1;
        }
        let entry = null;
        let index = -1;
        for (let i = 0; i < tier.entries.length; i++) {
            let e = tier.entries[i];
            if (entry === null || e.mean_head_height < entry.mean_head_height) {
                entry = e;
                index = i;
            }
        }
        if (entry === null) {
            return -1;
        }
        return index;
    }

    removeLowestHeadEntry(tier_index, min_head_height = undefined) {
        let index = this.findLowestHeadEntry(tier_index);
        if (index >= 0) {
            let tier = this.tiers[tier_index];
            let entry = tier.entries[index];
            if (min_head_height === undefined || entry.mean_head_height <= min_head_height) {
                tier.entries.splice(index, 1);
                this.num_walkers--;
                this.updateMean(tier_index, -entry.score);
                return entry;
            }
        }
        return null;
    }

    removeOldestEntry(tier_index) {
        let tier = this.tiers[tier_index];
        if (tier.entries.length > 0) {
            let entry = tier.entries.shift();
            this.num_walkers--;
            this.updateMean(tier_index, -entry.score);
            return entry;
        }
        return null;
    }

    adjustEntry(tier_index, entry) {
        if (tier_index < 0) {
            return -1;
        }
        for (let i = tier_index; i >= 0; i--) {
            let tier = this.tiers[i];
            if (entry.score >= tier.low_score && entry.score < tier.high_score) {
                if (tier.entries.length < this.tier_capacity) {
                    tier.entries.push(entry);
                    this.num_walkers++;
                    this.updateMean(i, entry.score);
                    return i;
                }
                let replacable_entry_index = this.findLowestHeadEntry(i);
                let replacable_entry = tier.entries[replacable_entry_index];
                if (replacable_entry.score < entry.score) {
                    this.updateMean(i, -replacable_entry.score);
                    this.updateMean(i, entry.score);
                    tier.entries[replacable_entry_index] = entry;
                    return i;
                }
                return -1;
            }
        }
        return -1;
    }

    adjustEntries() {
        for (let i = 0; i < this.num_tiers; i++) {
            let tier = this.tiers[i];
            for (let j = tier.entries.length-1; j >= 0; j--) {
                let removed_entry = tier.entries[j];
                if (removed_entry.score < tier.low_score) {
                    tier.entries.splice(j, 1);
                    this.num_walkers--;
                    this.updateMean(i, -removed_entry.score);
                    this.adjustEntry(i - 1, removed_entry);
                }
            }
        }
    }

    adjustTiers() {
        this.start_score = this.threshold * this.history.record_score;
        for (let i = 0; i < this.num_tiers; i++) {
            let tier = this.tiers[i];
            tier.low_score = tier.low * this.history.record_score;
            tier.high_score = tier.high * this.history.record_score;
        }
        this.adjustEntries();
    }

    entryFromWalker(walker) {
        return {
            genome: JSON.stringify(walker.genome),
            score: walker.score,
            mean_head_height: walker.mean_head_height,
        };
    }

    placeGenome(walker) {
        for (let i = this.num_tiers - 1; i >= 0; i--) {
            let tier = this.tiers[i];
            if (walker.score >= tier.low_score) {
                if (tier.entries.length >= this.tier_capacity) {
                    let removed_entry = this.removeLowestHeadEntry(i, walker.mean_head_height);
                    if (removed_entry === null) {
                        if (Math.random() < 0.25)
                            this.removeLowestHeadEntry(i);
                        else
                            return false;
                    }
                }
                tier.entries.push(this.entryFromWalker(walker));
                this.num_walkers++;
                this.updateMean(i, walker.score);
                return true;
            }
        }
        return false;
    }

    selectEligibleTiers() {
        let result = [];
        for (let i = 0; i < this.num_tiers; i++) {
            if (this.tiers[i].entries.length > 0) {
                result.push({
                    index: i,
                    tier: this.tiers[i],
                });
            }
        }
        if (result.length <= 1) {
            return result;
        }
        let rank_increment = 1.0 / (result.length - 1) * Math.max(0.0, this.tier_selection_pressure - 1.0);
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

    selectEligibleTierUniform(eligible_tiers) {
        if (eligible_tiers.length == 0) {
            return null;
        }
        if (eligible_tiers.length == 1) {
            return eligible_tiers[0].tier;
        }
        let selected_tier_index = Math.floor(Math.random() * eligible_tiers.length);
        return eligible_tiers[selected_tier_index].tier;
    }

    selectEligibleTierWeighted(eligible_tiers) {
        if (eligible_tiers.length == 0) {
            return null;
        }
        if (eligible_tiers.length == 1) {
            return eligible_tiers[0].tier;
        }
        let random_value = Math.random();
        let sum = 0.0;
        for (let i = 0; i < eligible_tiers.length; i++) {
            let weight = eligible_tiers[i].weight;
            if (random_value >= sum && random_value < sum + weight) {
                return eligible_tiers[i].tier;
            }
            sum += weight;
        }
        return eligible_tiers[eligible_tiers.length-1].tier;
    }

    selectParentEntryUniform(selected_tier) {
        if (selected_tier === null || selected_tier.entries.length == 0) {
            return null;
        }
        if (selected_tier.entries.length == 1) {
            return selected_tier.entries[0];
        }
        let selected_entry_index = Math.floor(Math.random() * selected_tier.entries.length);
        return selected_tier.entries[selected_entry_index];
    }

    mutateGenome(genome) {
        let mutated = false;
        while (!mutated) {
            for (let k = 0; k < genome.length; k++) {
                for (let g_prop in genome[k]) {
                    if (genome[k].hasOwnProperty(g_prop)) {
                        if (Math.random() < this.gene_mutation_chance) {
                            genome[k][g_prop] = genome[k][g_prop] * gaussianRandom(1, this.gene_mutation_strength);
                            mutated = true;
                        }
                    }
                }
            }
        }
        return genome;
    }

    isEmpty() {
        if (this.num_walkers < 0 || this.num_walkers > this.num_tiers * this.tier_capacity)
            console.error("invalid number of walkers");
        return this.num_walkers <= 0;
    }

    addWalker(walker) {
        if (this.num_tiers === 0 || this.tier_capacity === 0) {
            return false;
        }
        let is_highscore = this.history.addWalker(walker);
        if (is_highscore) {
            this.adjustTiers();
        }
        this.placeGenome(walker);
        return is_highscore;
    }

    selectParentGenome() {
        if (this.history.record_holder && Math.random() < 0.05)
            return JSON.parse(this.history.record_holder.genome);
        let eligible_tiers = this.selectEligibleTiers();
        let selected_tier = this.selectEligibleTierWeighted(eligible_tiers);
        let selected_parent = this.selectParentEntryUniform(selected_tier);
        if (selected_parent !== null)
            return JSON.parse(selected_parent.genome);
        return null;
    }

    createRandomWalker() {
        return new Walker(this.game);
    }

    createMutatedWalker() {
        let genome = this.selectParentGenome();
        if (genome) {
            return new Walker(this.game, this.mutateGenome(genome));
        }
        return this.createRandomWalker();
    }
}
