class MapElites extends Binning {
    constructor(gameInstance) {
        super(
            gameInstance,
            gameInstance.config.mapelites_threshold,
            gameInstance.config.mapelites_range_decay,
            gameInstance.config.mapelites_height_bins,
            gameInstance.config.mapelites_bin_selection_pressure
        );
        this.history = new History(this.game);
        for (let i = 0; i < this.num_bins; i++) {
            let bin = this.bins[i];
            bin.enabled = true;
            bin.genepool = new GenePool(this.game);
        }
    }

    _isBinEligible(bin) {
        return bin.enabled && !bin.genepool.isEmpty();
    }

    selectFittingBin(walker) {
        return this.findBinForFeature(walker.mean_head_height);
    }

    addWalker(walker) {
        let bin = this.selectFittingBin(walker);
        if (bin) {
            let is_highscore_in_bin_genepool = bin.genepool.addWalker(walker);
            if (is_highscore_in_bin_genepool) {
                this.history.addWalker(walker, true);
                return true;
            }
        }
        return false;
    }

    createRandomWalker() {
        return new Walker(this.game);
    }

    createMutatedWalker() {
        let eligible_bins = this.getEligibleBins();
        let selected_bin = this.selectBinWeighted(eligible_bins);
        if (selected_bin) {
            return selected_bin.genepool.createMutatedWalker();
        }
        return this.createRandomWalker();
    }
}
