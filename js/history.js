
let History = function() {
    this.__constructor.apply(this, arguments);
}

History.prototype.__constructor = function(config) {
    this.history_size = config.history_size;
    this.history = [];
    this.record_score = 0.0;
}

History.prototype._maintainSize = function() {
    while (this.history.length > this.history_size) {
        this.history.shift();
    }
}

History.prototype.addGenome = function(genome, score) {
    if (score > this.record_score) {
        this.history.push({
            genome: JSON.stringify(genome),
            score: score,
        });
        this.record_score = score;
        this._maintainSize();
        return true;
    }
    return false;
}
