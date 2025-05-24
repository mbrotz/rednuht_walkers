
const NN_ANGLE_FACTOR = 0.2;
const NN_INIT_FACTOR = 1;

class Layer {
    constructor(input_size, output_size, copy_from = null) {
        this.input_size = input_size;
        this.output_size = output_size;
        this.output = new Float32Array(output_size);
        if (copy_from) {
            this.weights = new Float32Array(copy_from.weights);
            this.biases = new Float32Array(copy_from.biases);
        } else {
            this.weights = new Float32Array(input_size * output_size);
            this.biases = new Float32Array(output_size);
            this.init();
        }
    }

    getNumParams() {
        return this.weights.length + this.biases.length;
    }

    getParams(params, offset) {
        params.set(this.weights, offset);
        offset += this.weights.length;
        params.set(this.biases, offset);
        offset += this.biases.length;
        return offset;
    }

    step(input) {
        Layer.forwardPass(input, this.output, this.weights, this.biases);
    }

    init() {
        Layer.initWeights(this.input_size, this.output_size, this.weights);
        Layer.initBiases(this.biases, 0.0);
    }

    mutate(weight_probability, weight_stddev, bias_probability, bias_stddev) {
        let mutations = 0;
        mutations += NeuralNetwork.mutateValues(this.weights, weight_probability, weight_stddev);
        mutations += NeuralNetwork.mutateValues(this.biases, bias_probability, bias_stddev);
        return mutations;
    }

    copy() {
        return new Layer(this.input_size, this.output_size, this);
    }

    static forwardPass(input, output, weights, biases) {
        for (let o = 0, w = 0; o < output.length; o++) {
            let sum = biases[o];
            for (let i = 0; i < input.length; i++, w++) {
                sum += input[i] * weights[w];
            }
            output[o] = sum / (1.0 + Math.abs(sum));
        }
    }

    static initWeights(input_size, output_size, weights) {
        const stddev = Math.sqrt(2.0 / (input_size + output_size)) * NN_INIT_FACTOR;
        for (let i = 0; i < weights.length; i++)
            weights[i] = gaussianRandom(0, stddev);
    }

    static initBiases(biases, value) {
        for (let i = 0; i < biases.length; i++)
            biases[i] = value;
    }
}

class NeuralNetwork {
    constructor(input_size, hidden_size, output_size, copy_from = null) {
        this.input_size = input_size;
        this.hidden_size = Array.isArray(hidden_size) ? hidden_size : (hidden_size > 0 ? [hidden_size] : []);
        this.output_size = output_size;
        this.input = new Float32Array(input_size);
        if (copy_from) {
            this.layers = NeuralNetwork.copyLayers(copy_from);
            this.angle = new Float32Array(copy_from.angle);
        } else {
            this.layers = NeuralNetwork.createLayers(input_size, this.hidden_size, output_size);
            this.angle = new Float32Array(output_size);
            this.init();
        }
        this.output = this.layers[this.layers.length-1].output;
    }

    getNumParams() {
        let sum = 0;
        for (let i = 0; i < this.layers.length; i++) {
            sum += this.layers[i].getNumParams();
        }
        sum += this.angle.length;
        return sum;
    }

    getParams() {
        let num_params = this.getNumParams();
        let params = new Float32Array(num_params);
        let offset = 0;
        for (let i = 0; i < this.layers.length; i++) {
            offset = this.layers[i].getParams(params, offset);
        }
        params.set(this.angle, offset);
        return params;
    }

    step() {
        NeuralNetwork.forwardPass(this.input, this.layers);
        NeuralNetwork.anglePass(this.output, this.angle);
    }

    init() {
        NeuralNetwork.initLayers(this.layers);
        NeuralNetwork.initAngles(this.angle);
    }

    mutate(angle_probability, angle_stddev, weight_probability, weight_stddev, bias_probability, bias_stddev) {
        let attempts = 0, mutations = 0;
        while (attempts++ < 10 && mutations == 0) {
            mutations += NeuralNetwork.mutateLayers(this.layers, weight_probability, weight_stddev, bias_probability, bias_stddev);
            mutations += NeuralNetwork.mutateValues(this.angle, angle_probability, angle_stddev);
        }
        if (mutations == 0)
            console.warn("Failed to mutate neural network.");
        return mutations > 0;
    }

    copy() {
        return new NeuralNetwork(this.input_size, this.hidden_size, this.output_size, this);
    }

    static forwardPass(input, layers) {
        let layer_input = input;
        for (let i = 0; i < layers.length; i++) {
            let layer = layers[i];
            layer.step(layer_input);
            layer_input = layer.output;
        }
    }

    static anglePass(output, angle) {
        for (let o = 0; o < output.length; o++) {
            let angle_value = angle[o] + (output[o] * NN_ANGLE_FACTOR);
            angle[o] = Math.max(-1, Math.min(1, angle_value));
        }
    }

    static initLayers(layers) {
        for (let i = 0; i < layers.length; i++)
            layers[i].init();
    }

    static initAngles(angle) {
        for (let a = 0; a < angle.length; a++)
            angle[a] = Math.random() * 2 - 1;
    }

    static mutateLayers(layers, weight_probability, weight_stddev, bias_probability, bias_stddev) {
        let mutations = 0;
        for (let i = 0; i < layers.length; i++)
            mutations += layers[i].mutate(weight_probability, weight_stddev, bias_probability, bias_stddev);
        return mutations;
    }

    static mutateValues(values, probability, stddev) {
        let mutations = 0;
        for (let i = 0; i < values.length; i++) {
            if (Math.random() < probability) {
                values[i] += gaussianRandom(0, stddev);
                mutations++;
            }
        }
        return mutations;
    }

    static createLayers(input_size, hidden_size, output_size) {
        let layers = [];
        let layer_input_size = input_size;
        for (let i = 0; i < hidden_size.length; i++) {
            let layer_output_size = hidden_size[i];
            layers.push(new Layer(layer_input_size, layer_output_size));
            layer_input_size = layer_output_size;
        }
        layers.push(new Layer(layer_input_size, output_size));
        return layers;
    }

    static copyLayers(copy_from) {
        let layers = [];
        for (let i = 0; i < copy_from.layers.length; i++) {
            let layer = copy_from.layers[i];
            layers.push(new Layer(layer.input_size, layer.output_size, layer));
        }
        return layers;
    }
}
