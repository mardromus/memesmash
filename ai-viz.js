/**
 * Real Neural Network for Meme Classification
 * Uses actual machine learning with brain.js-style implementation
 */

class RealNeuralNetwork {
    constructor() {
        // Network architecture: input -> hidden -> output
        this.inputSize = 10;
        this.hiddenSize = 16;
        this.outputSize = 2; // [dank, normie]

        // Initialize weights with Xavier initialization
        this.weightsIH = this.initWeights(this.inputSize, this.hiddenSize);
        this.weightsHO = this.initWeights(this.hiddenSize, this.outputSize);
        this.biasH = new Array(this.hiddenSize).fill(0).map(() => Math.random() * 0.2 - 0.1);
        this.biasO = new Array(this.outputSize).fill(0).map(() => Math.random() * 0.2 - 0.1);

        // Training data from user swipes
        this.trainingData = [];
        this.learningRate = 0.1;
        this.trained = false;
    }

    initWeights(rows, cols) {
        const scale = Math.sqrt(2.0 / (rows + cols));
        return Array(rows).fill(0).map(() =>
            Array(cols).fill(0).map(() => (Math.random() * 2 - 1) * scale)
        );
    }

    // Activation functions
    sigmoid(x) {
        return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
    }

    sigmoidDerivative(x) {
        return x * (1 - x);
    }

    relu(x) {
        return Math.max(0, x);
    }

    softmax(arr) {
        const max = Math.max(...arr);
        const exps = arr.map(x => Math.exp(x - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(x => x / sum);
    }

    // Extract features from meme data
    extractFeatures(meme) {
        const upvotes = meme.upvotes || 0;
        const titleLength = (meme.title || '').length;
        const hasEmoji = /[\u{1F600}-\u{1F64F}]/u.test(meme.title) ? 1 : 0;
        const hasCaps = (meme.title || '').toUpperCase() === meme.title ? 1 : 0;
        const wordCount = (meme.title || '').split(' ').length;

        // Normalize features
        return [
            Math.min(upvotes / 100000, 1),           // Normalized upvotes
            Math.min(titleLength / 100, 1),          // Title length
            hasEmoji,                                  // Has emoji
            hasCaps ? 1 : 0,                          // All caps
            Math.min(wordCount / 20, 1),             // Word count
            upvotes > 50000 ? 1 : 0,                 // High upvotes flag
            upvotes > 30000 ? 1 : 0,                 // Medium upvotes flag
            titleLength < 20 ? 1 : 0,                // Short title
            (meme.title || '').includes('🅱') ? 1 : 0, // Has B emoji
            Math.random() * 0.1                       // Noise for regularization
        ];
    }

    // Forward pass
    forward(inputs) {
        // Input to hidden
        this.hiddenOutputs = [];
        for (let i = 0; i < this.hiddenSize; i++) {
            let sum = this.biasH[i];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.weightsIH[j][i];
            }
            this.hiddenOutputs.push(this.sigmoid(sum));
        }

        // Hidden to output
        this.outputs = [];
        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.biasO[i];
            for (let j = 0; j < this.hiddenSize; j++) {
                sum += this.hiddenOutputs[j] * this.weightsHO[j][i];
            }
            this.outputs.push(sum);
        }

        return this.softmax(this.outputs);
    }

    // Backpropagation
    backward(inputs, targets) {
        const outputs = this.forward(inputs);

        // Output layer errors
        const outputErrors = [];
        for (let i = 0; i < this.outputSize; i++) {
            outputErrors.push(targets[i] - outputs[i]);
        }

        // Hidden layer errors
        const hiddenErrors = [];
        for (let i = 0; i < this.hiddenSize; i++) {
            let error = 0;
            for (let j = 0; j < this.outputSize; j++) {
                error += outputErrors[j] * this.weightsHO[i][j];
            }
            hiddenErrors.push(error * this.sigmoidDerivative(this.hiddenOutputs[i]));
        }

        // Update weights: hidden to output
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.outputSize; j++) {
                this.weightsHO[i][j] += this.learningRate * outputErrors[j] * this.hiddenOutputs[i];
            }
        }

        // Update biases: output
        for (let i = 0; i < this.outputSize; i++) {
            this.biasO[i] += this.learningRate * outputErrors[i];
        }

        // Update weights: input to hidden
        for (let i = 0; i < this.inputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                this.weightsIH[i][j] += this.learningRate * hiddenErrors[j] * inputs[i];
            }
        }

        // Update biases: hidden
        for (let i = 0; i < this.hiddenSize; i++) {
            this.biasH[i] += this.learningRate * hiddenErrors[i];
        }

        return outputs;
    }

    // Train on user's swipe
    train(meme, userChoice) {
        const features = this.extractFeatures(meme);
        const targets = userChoice === 'dank' ? [1, 0] : [0, 1];

        // Store training sample
        this.trainingData.push({ features, targets });

        // Train on this sample multiple times
        for (let i = 0; i < 5; i++) {
            this.backward(features, targets);
        }

        // Also retrain on recent samples
        const recentSamples = this.trainingData.slice(-10);
        for (const sample of recentSamples) {
            this.backward(sample.features, sample.targets);
        }

        this.trained = true;
    }

    // Predict dankness
    predict(meme) {
        const features = this.extractFeatures(meme);
        const outputs = this.forward(features);
        return {
            dank: outputs[0],
            normie: outputs[1],
            prediction: outputs[0] > outputs[1] ? 'dank' : 'normie',
            confidence: Math.max(outputs[0], outputs[1])
        };
    }

    // Get network state for visualization
    getNetworkState() {
        return {
            hiddenActivations: this.hiddenOutputs || new Array(this.hiddenSize).fill(0),
            outputActivations: this.outputs ? this.softmax(this.outputs) : [0.5, 0.5],
            weights: {
                ih: this.weightsIH,
                ho: this.weightsHO
            }
        };
    }
}

// Advanced Neural Network Visualizer
class NeuralViz {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn('Neural canvas not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.connections = [];
        this.particles = [];
        this.activations = [];

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initNetwork();
        this.animate();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
        this.initNetwork();
    }

    initNetwork() {
        const layers = [10, 16, 2]; // Match real network architecture
        const layerSpacing = this.width / (layers.length + 1);

        this.nodes = [];
        this.connections = [];

        layers.forEach((nodeCount, layerIndex) => {
            const x = layerSpacing * (layerIndex + 1);
            const nodeSpacing = this.height / (Math.min(nodeCount, 8) + 1);
            const displayCount = Math.min(nodeCount, 8);

            for (let i = 0; i < displayCount; i++) {
                const y = nodeSpacing * (i + 1);
                this.nodes.push({
                    x,
                    y,
                    layer: layerIndex,
                    index: i,
                    radius: layerIndex === 2 ? 6 : 4,
                    activation: 0,
                    targetActivation: 0,
                    hue: layerIndex === 0 ? 180 : (layerIndex === 1 ? 280 : 120)
                });
            }
        });

        // Create connections
        let nodeIndex = 0;
        for (let l = 0; l < layers.length - 1; l++) {
            const currentCount = Math.min(layers[l], 8);
            const nextCount = Math.min(layers[l + 1], 8);
            const currentStart = nodeIndex;
            const nextStart = nodeIndex + currentCount;

            for (let i = 0; i < currentCount; i++) {
                for (let j = 0; j < nextCount; j++) {
                    if (Math.random() > 0.3) { // Show 70% of connections
                        this.connections.push({
                            from: currentStart + i,
                            to: nextStart + j,
                            weight: Math.random(),
                            signal: 0
                        });
                    }
                }
            }
            nodeIndex += currentCount;
        }
    }

    updateFromNetwork(networkState, prediction) {
        if (!networkState) return;

        // Update hidden layer activations
        const hiddenNodes = this.nodes.filter(n => n.layer === 1);
        hiddenNodes.forEach((node, i) => {
            if (networkState.hiddenActivations[i] !== undefined) {
                node.targetActivation = networkState.hiddenActivations[i];
            }
        });

        // Update output layer
        const outputNodes = this.nodes.filter(n => n.layer === 2);
        if (networkState.outputActivations) {
            outputNodes[0].targetActivation = networkState.outputActivations[0];
            outputNodes[1].targetActivation = networkState.outputActivations[1];
        }

        // Activate input layer based on prediction
        const inputNodes = this.nodes.filter(n => n.layer === 0);
        inputNodes.forEach((node, i) => {
            node.targetActivation = Math.random() * 0.5 + 0.3;
        });

        // Fire signals through connections
        this.connections.forEach(conn => {
            conn.signal = Math.random() > 0.5 ? 1 : 0;
            setTimeout(() => conn.signal = 0, 300);
        });

        // Spawn particles based on confidence
        this.spawnParticles(prediction.confidence, prediction.prediction === 'dank');
    }

    spawnParticles(intensity, isDank) {
        const count = Math.floor(intensity * 20);
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: this.height,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -Math.random() * 4 - 2,
                    life: 1,
                    hue: isDank ? 120 : 0,
                    size: Math.random() * 3 + 1
                });
            }, Math.random() * 200);
        }
    }

    animate() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw connections
        this.connections.forEach(conn => {
            const from = this.nodes[conn.from];
            const to = this.nodes[conn.to];
            if (!from || !to) return;

            const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
            const alpha = 0.1 + conn.signal * 0.6 + (from.activation * 0.2);
            gradient.addColorStop(0, `hsla(${from.hue}, 100%, 50%, ${alpha})`);
            gradient.addColorStop(1, `hsla(${to.hue}, 100%, 50%, ${alpha * 0.5})`);

            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 0.5 + conn.signal * 2 + from.activation;
            this.ctx.stroke();
        });

        // Draw nodes
        this.nodes.forEach(node => {
            node.activation += (node.targetActivation - node.activation) * 0.15;

            const glowRadius = node.radius + node.activation * 15;
            const gradient = this.ctx.createRadialGradient(
                node.x, node.y, 0,
                node.x, node.y, glowRadius
            );
            const alpha = 0.2 + node.activation * 0.8;
            gradient.addColorStop(0, `hsla(${node.hue}, 100%, 60%, ${alpha})`);
            gradient.addColorStop(0.5, `hsla(${node.hue}, 100%, 50%, ${alpha * 0.3})`);
            gradient.addColorStop(1, 'transparent');

            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Core node
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${node.hue}, 100%, ${40 + node.activation * 40}%, 1)`;
            this.ctx.fill();
            this.ctx.strokeStyle = `hsla(${node.hue}, 100%, 80%, ${0.5 + node.activation * 0.5})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });

        // Draw particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // Gravity
            p.life -= 0.02;

            if (p.life <= 0) return false;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life})`;
            this.ctx.fill();

            return true;
        });

        // Draw labels for output nodes
        const outputNodes = this.nodes.filter(n => n.layer === 2);
        if (outputNodes.length >= 2) {
            this.ctx.font = '10px Orbitron, sans-serif';
            this.ctx.fillStyle = '#00ff88';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('DANK', outputNodes[0].x + 15, outputNodes[0].y + 4);
            this.ctx.fillStyle = '#ff3333';
            this.ctx.fillText('NORMIE', outputNodes[1].x + 15, outputNodes[1].y + 4);
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Export
window.RealNeuralNetwork = RealNeuralNetwork;
window.NeuralViz = NeuralViz;
