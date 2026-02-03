/**
 * BRAINROT SOUND ENGINE
 * Web Audio API synthesizer for all game sounds
 */

class BrainrotSoundEngine {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;
        this.volume = 0.3;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🔊 Sound engine ready!');
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    // Create oscillator with envelope
    playTone(frequency, duration, type = 'sine', attack = 0.01, decay = 0.1) {
        if (!this.enabled || !this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + attack);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }

    // SWIPE SOUNDS
    swipeRight() {
        // Ascending happy sound
        this.playTone(400, 0.15, 'sine');
        setTimeout(() => this.playTone(500, 0.15, 'sine'), 50);
        setTimeout(() => this.playTone(600, 0.2, 'triangle'), 100);
    }

    swipeLeft() {
        // Descending sound
        this.playTone(400, 0.15, 'sawtooth');
        setTimeout(() => this.playTone(300, 0.15, 'sawtooth'), 50);
        setTimeout(() => this.playTone(200, 0.2, 'sine'), 100);
    }

    // COMBO SOUNDS
    combo(level) {
        const baseFreq = 300 + (level * 50);
        for (let i = 0; i < Math.min(level, 5); i++) {
            setTimeout(() => {
                this.playTone(baseFreq + (i * 100), 0.1, 'square');
            }, i * 40);
        }
    }

    // CORRECT/WRONG
    correct() {
        this.playTone(523, 0.1, 'sine'); // C5
        setTimeout(() => this.playTone(659, 0.1, 'sine'), 80); // E5
        setTimeout(() => this.playTone(784, 0.15, 'sine'), 160); // G5
    }

    wrong() {
        this.playTone(200, 0.15, 'sawtooth');
        setTimeout(() => this.playTone(150, 0.2, 'sawtooth'), 100);
    }

    // LEVEL UP
    levelUp() {
        const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.08, 'square'), i * 50);
        });
    }

    // GAME OVER
    gameOver() {
        this.playTone(440, 0.3, 'sine');
        setTimeout(() => this.playTone(415, 0.3, 'sine'), 200);
        setTimeout(() => this.playTone(392, 0.3, 'sine'), 400);
        setTimeout(() => this.playTone(349, 0.5, 'sine'), 600);
    }

    // TICK (timer warning)
    tick() {
        this.playTone(800, 0.05, 'square');
    }

    // WHOOSH (card appearing)
    whoosh() {
        const osc = this.audioContext?.createOscillator();
        const gain = this.audioContext?.createGain();
        if (!osc || !gain) return;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(this.volume * 0.5, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    // GLITCH effect
    glitch() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playTone(100 + Math.random() * 500, 0.05, 'sawtooth');
            }, i * 30);
        }
    }

    // UI Click
    click() {
        this.playTone(600, 0.05, 'sine');
    }

    // FIRE effect for high combos
    fire() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playTone(200 + i * 100, 0.08, 'triangle');
            }, i * 30);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Global sound engine
const soundEngine = new BrainrotSoundEngine();

// Initialize on first user interaction
document.addEventListener('click', () => soundEngine.init(), { once: true });
document.addEventListener('touchstart', () => soundEngine.init(), { once: true });
