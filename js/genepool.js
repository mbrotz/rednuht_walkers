class GenePool extends Binning {
    constructor(gameInstance) {
        super(
            gameInstance,
            gameInstance.config.genepool_threshold,
            gameInstance.config.genepool_range_decay,
            gameInstance.config.genepool_bins,
            gameInstance.config.genepool_bin_selection_pressure
        );
        this.bin_capacity = this.game.config.genepool_bin_capacity;
        this.gene_mutation_chance = this.game.config.genepool_gene_mutation_chance;
        this.gene_mutation_strength = this.game.config.genepool_gene_mutation_strength;
        this.start_score = 0.0;
        this.num_walkers = 0;
        this.history = new History(this.game);
        for (let i = 0; i < this.num_bins; i++) {
            let bin = this.bins[i];
            bin.is_lowest = (i == 0);
            bin.is_highest = (i == this.num_bins - 1);
            bin.low_score = 0.0;
            bin.high_score = 0.0;
            bin.sum_score = 0.0;
            bin.mean_score = 0.0;
            bin.entries = [];
        }
    }

    _isBinEligible(bin) {
        return bin.entries.length > 0;
    }

    updateMean(bin_index, delta) {
        let bin = this.bins[bin_index];
        let count = bin.entries.length;
        if (count > 0) {
            bin.sum_score += delta;
            bin.mean_score = bin.sum_score / count;
        } else {
            bin.sum_score = 0;
            bin.mean_score = 0;
        }
    }

    findLowestPerformingEntry(bin_index) {
        let bin = this.bins[bin_index];
        if (bin.entries.length == 0) {
            return -1;
        }
        let entry = null;
        let index = -1;
        for (let i = 0; i < bin.entries.length; i++) {
            let e = bin.entries[i];
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

    removeLowestPerformingEntry(bin_index, min_score = undefined) {
        let index = this.findLowestPerformingEntry(bin_index);
        if (index >= 0) {
            let bin = this.bins[bin_index];
            let entry = bin.entries[index];
            if (min_score === undefined || entry.score <= min_score) {
                bin.entries.splice(index, 1);
                this.num_walkers--;
                this.updateMean(bin_index, -entry.score);
                return entry;
            }
        }
        return null;
    }

    findLowestHeadEntry(bin_index) {
        let bin = this.bins[bin_index];
        if (bin.entries.length == 0) {
            return -1;
        }
        let entry = null;
        let index = -1;
        for (let i = 0; i < bin.entries.length; i++) {
            let e = bin.entries[i];
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

    removeLowestHeadEntry(bin_index, min_head_height = undefined) {
        let index = this.findLowestHeadEntry(bin_index);
        if (index >= 0) {
            let bin = this.bins[bin_index];
            let entry = bin.entries[index];
            if (min_head_height === undefined || entry.mean_head_height <= min_head_height) {
                bin.entries.splice(index, 1);
                this.num_walkers--;
                this.updateMean(bin_index, -entry.score);
                return entry;
            }
        }
        return null;
    }

    removeOldestEntry(bin_index) {
        let bin = this.bins[bin_index];
        if (bin.entries.length > 0) {
            let entry = bin.entries.shift();
            this.num_walkers--;
            this.updateMean(bin_index, -entry.score);
            return entry;
        }
        return null;
    }

    adjustEntry(target_bin_index, entry) {
        if (target_bin_index < 0) {
            return -1;
        }
        for (let i = target_bin_index; i >= 0; i--) {
            let bin = this.bins[i];
            if (entry.score >= bin.low_score && entry.score < bin.high_score) {
                if (bin.entries.length < this.bin_capacity) {
                    bin.entries.push(entry);
                    this.num_walkers++;
                    this.updateMean(i, entry.score);
                    return i;
                }
                let replacable_entry_index = this.findLowestHeadEntry(i);
                if (replacable_entry_index !== -1) {
                    let replacable_entry = bin.entries[replacable_entry_index];
                    if (replacable_entry.score < entry.score) {
                        this.updateMean(i, -replacable_entry.score);
                        this.updateMean(i, entry.score);
                        bin.entries[replacable_entry_index] = entry;
                        return i;
                    }
                }
                return -1;
            }
        }
        return -1;
    }

    adjustEntries() {
        for (let i = 0; i < this.num_bins; i++) {
            let bin = this.bins[i];
            for (let j = bin.entries.length - 1; j >= 0; j--) {
                let entry_to_check = bin.entries[j];
                if (entry_to_check.score < bin.low_score) {
                    bin.entries.splice(j, 1);
                    this.num_walkers--;
                    this.updateMean(i, -entry_to_check.score);
                    this.adjustEntry(i - 1, entry_to_check);
                }
            }
        }
    }

    adjustBinScores() {
        this.start_score = this.threshold * this.history.record_score;
        for (let i = 0; i < this.num_bins; i++) {
            let bin = this.bins[i];
            bin.low_score = bin.low * this.history.record_score;
            bin.high_score = bin.high * this.history.record_score;
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
        for (let i = this.num_bins - 1; i >= 0; i--) {
            let bin = this.bins[i];
            if (walker.score >= bin.low_score) {
                if (bin.entries.length >= this.bin_capacity) {
                    //let removed_entry = this.removeLowestHeadEntry(i, walker.mean_head_height);
                    let removed_entry = this.removeLowestPerformingEntry(i, walker.score);
                    if (removed_entry === null) {
                        if (Math.random() < 0.25) {
                            this.removeOldestEntry(i);
                        } else {
                            return false;
                        }
                    }
                }
                bin.entries.push(this.entryFromWalker(walker));
                this.num_walkers++;
                this.updateMean(i, walker.score);
                return true;
            }
        }
        return false;
    }

    selectParentEntryUniform(selected_bin) {
        if (selected_bin === null || selected_bin.entries.length == 0) {
            return null;
        }
        if (selected_bin.entries.length == 1) {
            return selected_bin.entries[0];
        }
        let selected_entry_index = Math.floor(Math.random() * selected_bin.entries.length);
        return selected_bin.entries[selected_entry_index];
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
        if (this.num_walkers < 0 || this.num_walkers > this.num_bins * this.bin_capacity)
            console.error("invalid number of walkers");
        return this.num_walkers <= 0;
    }

    addWalker(walker) {
        if (this.num_bins === 0 || this.bin_capacity === 0) {
            return false;
        }
        let is_highscore = this.history.addWalker(walker);
        if (is_highscore) {
            this.adjustBinScores();
        }
        this.placeGenome(walker);
        return is_highscore;
    }

    selectParentGenome() {
        if (this.history.record_holder && Math.random() < 0.05)
            return JSON.parse(this.history.record_holder.genome);
        let eligible_bins = this.getEligibleBins();
        let selected_bin = this.selectBinWeighted(eligible_bins);
        let selected_parent_entry = this.selectParentEntryUniform(selected_bin);
        if (selected_parent_entry !== null)
            return JSON.parse(selected_parent_entry.genome);
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
