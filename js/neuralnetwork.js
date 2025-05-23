
const NN_ANGLE_FACTOR = 0.2;

class NeuralNetwork {
    constructor(input_size, hidden_size, output_size, copy_from = null) {
        this.input_size = input_size;
        this.hidden_size = hidden_size;
        this.output_size = output_size;
        this.input = new Float32Array(input_size);
        this.hidden = new Float32Array(hidden_size);
        this.output = new Float32Array(output_size);
        if (copy_from) {
            this.input_hidden_weights = new Float32Array(copy_from.input_hidden_weights);
            this.hidden_output_weights = new Float32Array(copy_from.hidden_output_weights);
            this.hidden_biases = new Float32Array(copy_from.hidden_biases);
            this.output_biases = new Float32Array(copy_from.output_biases);
            this.angle = new Float32Array(copy_from.angle);
        } else {
            this.input_hidden_weights = new Float32Array(input_size * hidden_size);
            this.hidden_output_weights = new Float32Array(hidden_size * output_size);
            this.hidden_biases = new Float32Array(hidden_size);
            this.output_biases = new Float32Array(output_size);
            this.angle = new Float32Array(output_size);
            this.init();
        }
    }

    step() {
        this._forwardPass(this.input, this.hidden, this.input_hidden_weights, this.hidden_biases);
        this._forwardPass(this.hidden, this.output, this.hidden_output_weights, this.output_biases);
        this._anglePass(this.output, this.angle);
    }

    init() {
        this._initActivations(this.angle);
        this._initWeights(this.input_size, this.hidden_size, this.input_hidden_weights);
        this._initWeights(this.hidden_size, this.output_size, this.hidden_output_weights);
        this._initBiases(this.hidden_biases, 0.0);
        this._initBiases(this.output_biases, 0.0);
     }

    mutate(angle_probability, angle_stddev, weight_probability, weight_stddev, bias_probability, bias_stddev) {
        let attempts = 0, mutations = 0;
        while (attempts++ < 10 && mutations == 0) {
            mutations += this._mutateValues(this.angle, angle_probability, angle_stddev);
            mutations += this._mutateValues(this.input_hidden_weights, weight_probability, weight_stddev);
            mutations += this._mutateValues(this.hidden_output_weights, weight_probability, weight_stddev);
            mutations += this._mutateValues(this.hidden_biases, bias_probability, bias_stddev);
            mutations += this._mutateValues(this.output_biases, bias_probability, bias_stddev);
        }
        return mutations > 0;
    }

    copy() {
        return new NeuralNetwork(this.input_size, this.hidden_size, this.output_size, this);
    }

    _forwardPass(input, output, weights, biases) {
        for (let o = 0, w = 0; o < output.length; o++) {
            let sum = biases[o];
            for (let i = 0; i < input.length; i++, w++) {
                sum += input[i] * weights[w];
            }
            output[o] = sum / (1.0 + Math.abs(sum));
        }
    }

    _anglePass(output, angle) {
        for (let o = 0; o < output.length; o++) {
            let angle_value = angle[o] + (output[o] * NN_ANGLE_FACTOR);
            angle[o] = Math.max(-1, Math.min(1, angle_value));
        }
    }

    _initActivations(angle) {
        for (let a = 0; a < angle.length; a++)
            angle[a] = Math.random() * 2 - 1;
    }

    _initWeights(input_size, output_size, weights) {
        const stddev = Math.sqrt(2.0 / (input_size + output_size)) * 5;
        for (let w = 0; w < weights.length; w++)
            weights[w] = gaussianRandom(0, stddev);
    }

    _initBiases(biases, value) {
        for (let b = 0; b < biases.length; b++)
            biases[b] = value;
    }

    _mutateValues(values, probability, stddev) {
        let mutations = 0;
        for (let i = 0; i < values.length; i++) {
            if (Math.random() < probability) {
                values[i] += gaussianRandom(0, stddev);
                mutations++;
            }
        }
        return mutations;
    }
}
