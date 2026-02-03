/**
 * MEME BRAINROT ARENA - Main Game Logic
 * With real neural network learning and theme support
 */

// Theme Management
class ThemeManager {
    constructor() {
        this.toggle = document.getElementById('theme-toggle');
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateIcon();

        if (this.toggle) {
            this.toggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateIcon();
    }

    updateIcon() {
        if (this.toggle) {
            this.toggle.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
        }
    }
}

// Initialize theme
const themeManager = new ThemeManager();

// =========================================
// USERNAME GENERATOR - Cool random gamer tags
// =========================================
class UsernameGenerator {
    constructor() {
        this.prefixes = [
            'Sigma', 'Based', 'Dank', 'Cursed', 'Blessed', 'Mega', 'Ultra',
            'Dark', 'Chaos', 'Giga', 'Hyper', 'Neo', 'Cyber', 'Astral',
            'Void', 'Shadow', 'Cosmic', 'Epic', 'Legendary', 'Mythic',
            'Turbo', 'Alpha', 'Omega', 'Prime', 'Elite', 'Quantum'
        ];

        this.cores = [
            'Brain', 'Meme', 'Vibe', 'Rot', 'Lord', 'King', 'Chad',
            'Wizard', 'Ninja', 'Slayer', 'Hunter', 'Master', 'Sage',
            'Beast', 'Wolf', 'Dragon', 'Phoenix', 'Goat', 'Legend',
            'Gamer', 'Demon', 'Angel', 'Ghost', 'Reaper', 'Sensei'
        ];

        this.suffixes = [
            '420', '69', '9000', 'X', 'XD', 'Pro', 'God', 'Boss',
            '777', '999', 'Max', 'Ultra', 'Prime', 'Elite', 'King',
            'Jr', 'Sr', 'III', 'IV', 'V', 'OG', 'TTV', 'YT'
        ];
    }

    generate() {
        const usePrefix = Math.random() > 0.3;
        const useSuffix = Math.random() > 0.4;

        const prefix = usePrefix ? this.prefixes[Math.floor(Math.random() * this.prefixes.length)] : '';
        const core = this.cores[Math.floor(Math.random() * this.cores.length)];
        const suffix = useSuffix ? this.suffixes[Math.floor(Math.random() * this.suffixes.length)] : '';

        return `${prefix}${core}${suffix}`.substring(0, 15);
    }
}

// =========================================
// LEADERBOARD SYSTEM - Simulated Global
// =========================================
// =========================================
// LEADERBOARD SYSTEM - Firebase Real-Time
// =========================================
class RealTimeLeaderboard {
    constructor() {
        this.localEntries = [];
        this.initialized = false;

        // Wait for Firebase to be ready (it's loaded as module)
        this.checkFirebase();
    }

    checkFirebase() {
        if (window.firebaseArgs) {
            this.init(window.firebaseArgs);
        } else {
            console.log("Waiting for Firebase...");
            setTimeout(() => this.checkFirebase(), 500);
        }
    }

    init({ db, ref, onValue, query, orderByChild, limitToLast }) {
        this.db = db;
        this.scoresRef = ref(db, 'scores');
        this.initialized = true;
        this.listenForUpdates(onValue, query, orderByChild, limitToLast);
    }

    listenForUpdates(onValue, query, orderByChild, limitToLast) {
        // Query top 50 scores by score (Firebase sorts ascending)
        const topScoresQuery = query(
            this.scoresRef,
            orderByChild('score'),
            limitToLast(50)
        );

        onValue(topScoresQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Firebase returns object keys; convert to array
                const entries = Object.values(data);
                // Sort descending (highest first)
                this.localEntries = entries.sort((a, b) => b.score - a.score);
                console.log(`🔥 Leaderboard updated: ${this.localEntries.length} entries`);

                // If leaderboard modal is open, re-render it
                if (document.getElementById('leaderboard-modal')?.classList.contains('active')) {
                    // We need to access the game instance to rerender, strictly speaking
                    // But we can trigger a custom event or let the game logic handle it if polled
                    // Simplest hack: re-call render if game instance is global
                    if (window.game && window.game.renderLeaderboard) {
                        window.game.renderLeaderboard();
                    }
                }
            } else {
                this.localEntries = [];
            }
        });
    }

    addEntry(name, score) {
        if (score <= 0 || !this.initialized) return false;

        // Check if this user already has a higher score?
        // For simple arcade style, we just push every high score.
        // OR we can query if this user exists. For MVP, just push.

        try {
            const { push } = window.firebaseArgs;
            push(this.scoresRef, {
                name: name,
                score: score,
                date: new Date().toISOString()
            });
            console.log("🔥 Score pushed to Firebase!");
            return true;
        } catch (e) {
            console.error("Firebase push failed:", e);
            return false;
        }
    }

    getEntries() {
        if (!this.initialized) {
            return [{ name: "Connecting...", score: 0 }];
        }
        if (this.localEntries.length === 0) {
            return [{ name: "No scores yet...", score: 0 }];
        }
        return this.localEntries;
    }

    getGlobalEntries() {
        return this.getEntries();
    }

    clear() {
        // Disabled for global DB to prevent griefing
        console.warn("Clear disabled for global leaderboard");
    }
}

// Initialize systems
const usernameGen = new UsernameGenerator();
const leaderboard = new RealTimeLeaderboard();

class MemeGame {
    constructor() {
        // Game state
        this.state = 'menu';
        this.sensitiveEnabled = false;
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.memesJudged = 0;
        this.correctJudgments = 0;
        this.brainrot = 50;
        this.timeLeft = 60;
        this.timerInterval = null;

        // Difficulty
        this.difficulty = 1;
        this.baseTimePerMeme = 5000;
        this.currentTimeLimit = 5000;
        this.memeTimer = null;

        // Meme data
        this.memes = [];
        this.currentMeme = null;
        this.memeQueue = [];

        // Neural Network
        this.neuralNet = null;

        // High score
        this.highScore = parseInt(localStorage.getItem('brainrotHighScore') || '0');

        // Username
        this.username = localStorage.getItem('brainrotUsername') || usernameGen.generate();

        // DOM elements
        this.screens = {
            splash: document.getElementById('splash-screen'),
            game: document.getElementById('game-screen'),
            gameover: document.getElementById('gameover-screen')
        };

        this.elements = {
            score: document.getElementById('score'),
            combo: document.getElementById('combo'),
            timerBar: document.getElementById('timer-bar'),
            timerText: document.getElementById('timer-text'),
            brainrotFill: document.getElementById('brainrot-fill'),
            brainState: document.getElementById('brain-state'),
            memeCard: document.getElementById('meme-card'),
            memeImage: document.getElementById('meme-image'),
            memeTitle: document.getElementById('meme-title'),
            swipeLeft: document.getElementById('swipe-indicator-left'),
            swipeRight: document.getElementById('swipe-indicator-right'),
            floatingLabels: document.getElementById('floating-labels'),
            danknessBar: document.getElementById('dankness-bar'),
            normieBar: document.getElementById('normie-bar'),
            danknessValue: document.getElementById('dankness-value'),
            normieValue: document.getElementById('normie-value'),
            finalScore: document.getElementById('final-score'),
            maxComboDisplay: document.getElementById('max-combo'),
            memesJudgedDisplay: document.getElementById('memes-judged'),
            highScoreDisplay: document.getElementById('high-score'),
            verdict: document.getElementById('verdict'),
            finalBrain: document.getElementById('final-brain'),
            glitchOverlay: document.getElementById('glitch-overlay'),
            aiThoughts: document.getElementById('ai-thoughts')
        };

        // Swipe handling
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.swipeThreshold = 80;

        // Visualization
        this.neuralViz = null;

        // Sound
        this.soundEnabled = true;

        // AI Thoughts - weird phrases that rotate fast
        this.aiThoughts = [
            // Analysis phrases
            "Detecting pixel-level irony...",
            "Scanning for deep-fried essence...",
            "Quantifying brainrot vectors...",
            "Measuring serotonin impact...",
            "Analyzing cursed energy levels...",
            "Processing unhinged wavelengths...",
            "Calculating ratio probability...",
            "Detecting bottom text energy...",
            "Parsing compressed jpeg artifacts...",
            "Evaluating chaos coefficient...",
            // Weird observations
            "This meme hits different at 3am",
            "Skibidi toilet vibes detected",
            "Ohio level: concerning",
            "Sigma grindset energy: MAXIMUM",
            "Rizz factor: off the charts",
            "No cap detected. All fax.",
            "Gyatt readings are elevated",
            "Sussy baka probability: 74.2%",
            "This goes hard. May screenshot.",
            "Certified hood classic potential",
            // Technical nonsense
            "Recalibrating dank matrices...",
            "Fanum taxing neural weights...",
            "Mewing optimization in progress",
            "Edge detection: very edgy",
            "Running cope.exe subroutine...",
            "Initializing ratio protocols...",
            "Deploying based classifiers...",
            "Slay-factor analysis complete",
            "Compressing into JPEG: 🗿",
            "Memory: low (just like quality)",
            // Random observations
            "Bold move. Let's see.",
            "The council will decide...",
            "Your opinion: noted 📝",
            "Interesting. Very interesting.",
            "Adding to neural database...",
            "Cross-referencing with cursed_images.db",
            "Meme vintage: circa 2024",
            "Caption game: questionable",
            "Where humor. WHERE HUMOR???",
            "This is giving... something",
            // More chaotic
            "erm what the sigma",
            "real 🗣️🔥",
            "Lowkey valid tbh fr fr",
            "Processing delulu levels...",
            "Checking for unregistered rizz",
            "Aura points: recalculating",
            "NPC behavior scanning...",
            "Main character energy: maybe",
            "L + ratio + neural rejected",
            "W take or massive L?",
            // System-like
            "WARNING: maximum brainrot",
            "ALERT: meme is too powerful",
            "STATUS: neurons activated",
            "ERROR: too based to classify",
            "NOTICE: touch grass recommended",
            "CAUTION: chronically online",
        ];
        this.thoughtIndex = 0;
        this.thoughtInterval = null;

        // Initialize
        this.init();
    }

    async init() {
        try {
            await this.loadMemes();
            this.initNeuralNetwork();
            this.bindEvents();
            this.initNeuralViz();
            this.updateHighScoreDisplay();

            console.log('🧠 Game initialized!');
        } catch (error) {
            console.error('Init error:', error);
        }
    }

    async loadMemes() {
        try {
            const response = await fetch('db.json');
            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const memeData = data._default;

            // Load ALL memes into a master list
            this.allMemes = Object.values(memeData)
                .map(meme => ({
                    id: meme.id,
                    title: meme.title || 'Untitled',
                    image: meme.media,
                    thumbnail: meme.thumbnail?.thumbnail, // Capture thumbnail for NSFW check
                    upvotes: meme.ups || 0,
                    author: meme.author
                }))
                .filter(m => m.image && !['default', 'self'].includes(m.image)); // Only filter truly invalid images

            console.log(`📦 Loaded ${this.allMemes.length} total memes`);

            // Apply initial filter
            this.filterMemes();

        } catch (error) {
            console.error('Meme load error:', error);
            // Fallback
            this.allMemes = [
                { id: 1, title: 'Sample Meme 1', image: 'https://i.redd.it/7wgs4dkiihfz.png', upvotes: 87082 },
                { id: 2, title: 'Sample Meme 2', image: 'https://i.redd.it/65bzzioisir01.jpg', upvotes: 75251 }
            ];
            this.filterMemes();
        }
    }

    filterMemes() {
        if (this.sensitiveEnabled) {
            this.memes = [...this.allMemes];
        } else {
            this.memes = this.allMemes.filter(m =>
                !['nsfw', 'spoiler'].includes(m.thumbnail)
            );
        }

        console.log(`🔍 Filter active: ${this.memes.length} memes (Sensitive: ${this.sensitiveEnabled})`);

        // Only shuffle if playing or initializing
        this.shuffleMemes();
    }

    initNeuralNetwork() {
        try {
            if (typeof RealNeuralNetwork !== 'undefined') {
                this.neuralNet = new RealNeuralNetwork();
                console.log('🤖 Neural network ready');
            }
        } catch (error) {
            console.warn('Neural network unavailable:', error);
        }
    }

    shuffleMemes() {
        this.memeQueue = [...this.memes].sort(() => Math.random() - 0.5);
    }

    initNeuralViz() {
        try {
            if (typeof NeuralViz !== 'undefined') {
                this.neuralViz = new NeuralViz('neural-canvas');
            }
        } catch (error) {
            console.warn('Neural viz unavailable:', error);
        }
    }

    bindEvents() {
        // Buttons
        document.getElementById('start-btn')?.addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn')?.addEventListener('click', () => this.startGame());
        document.getElementById('home-btn')?.addEventListener('click', () => this.showScreen('splash'));

        // Sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle?.addEventListener('click', () => {
            if (typeof soundEngine !== 'undefined') {
                soundEngine.init(); // Initialize on first click
                const enabled = soundEngine.toggle();
                soundToggle.textContent = enabled ? '🔊' : '🔇';
                soundToggle.classList.toggle('muted', !enabled);
                if (enabled) soundEngine.click();
            }
        });

        // Username input
        const usernameInput = document.getElementById('username-input');
        if (usernameInput) {
            usernameInput.value = this.username;
            usernameInput.addEventListener('input', (e) => {
                this.username = e.target.value.trim() || 'Anonymous';
                localStorage.setItem('brainrotUsername', this.username);
            });
        }

        // Random name generator
        document.getElementById('random-name-btn')?.addEventListener('click', () => {
            this.username = usernameGen.generate();
            if (usernameInput) usernameInput.value = this.username;
            localStorage.setItem('brainrotUsername', this.username);
        });

        // Leaderboard modal
        const leaderboardModal = document.getElementById('leaderboard-modal');

        document.getElementById('leaderboard-btn')?.addEventListener('click', () => {
            this.renderLeaderboard();
            leaderboardModal?.classList.add('active');
        });

        document.getElementById('close-leaderboard')?.addEventListener('click', () => {
            leaderboardModal?.classList.remove('active');
        });

        // Close modal on backdrop click
        leaderboardModal?.addEventListener('click', (e) => {
            if (e.target === leaderboardModal) {
                leaderboardModal.classList.remove('active');
            }
        });

        // Sensitive Toggle
        const sensitiveToggle = document.getElementById('sensitive-toggle');
        if (sensitiveToggle) {
            sensitiveToggle.addEventListener('change', (e) => {
                this.sensitiveEnabled = e.target.checked;
                // Play sound
                if (typeof soundEngine !== 'undefined') soundEngine.click();

                // Refilter and reload
                this.filterMemes();

                // If in game, reload current card
                if (this.state === 'playing') {
                    this.loadNextMeme();
                }
            });
        }

        // Clear leaderboard
        document.getElementById('clear-leaderboard')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the leaderboard?')) {
                leaderboard.clear();
                this.renderLeaderboard();
            }
        });

        // Swipe events
        const card = this.elements.memeCard;
        if (card) {
            card.addEventListener('mousedown', (e) => this.startDrag(e.clientX));
            document.addEventListener('mousemove', (e) => this.drag(e.clientX));
            document.addEventListener('mouseup', () => this.endDrag());

            card.addEventListener('touchstart', (e) => {
                this.startDrag(e.touches[0].clientX);
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                if (this.isDragging) this.drag(e.touches[0].clientX);
            }, { passive: true });

            document.addEventListener('touchend', () => this.endDrag());
        }

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (this.state !== 'playing') return;
            if (e.key === 'ArrowLeft' || e.key === 'a') this.swipe('left');
            if (e.key === 'ArrowRight' || e.key === 'd') this.swipe('right');
        });
    }

    startDrag(x) {
        if (this.state !== 'playing') return;
        this.isDragging = true;
        this.startX = x;
        this.currentX = 0;
        if (this.elements.memeCard) {
            this.elements.memeCard.style.transition = 'none';
        }
    }

    drag(x) {
        if (!this.isDragging || !this.elements.memeCard) return;

        this.currentX = x - this.startX;
        const rotation = this.currentX * 0.03;
        const scale = 1 - Math.abs(this.currentX) * 0.0003;

        this.elements.memeCard.style.transform =
            `translateX(${this.currentX}px) rotate(${rotation}deg) scale(${Math.max(0.95, scale)})`;

        if (this.currentX < -40) {
            this.elements.swipeLeft?.classList.add('show');
            this.elements.swipeRight?.classList.remove('show');
            this.elements.memeCard.classList.add('swipe-left');
            this.elements.memeCard.classList.remove('swipe-right');
        } else if (this.currentX > 40) {
            this.elements.swipeRight?.classList.add('show');
            this.elements.swipeLeft?.classList.remove('show');
            this.elements.memeCard.classList.add('swipe-right');
            this.elements.memeCard.classList.remove('swipe-left');
        } else {
            this.elements.swipeLeft?.classList.remove('show');
            this.elements.swipeRight?.classList.remove('show');
            this.elements.memeCard.classList.remove('swipe-left', 'swipe-right');
        }
    }

    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;

        if (this.elements.memeCard) {
            this.elements.memeCard.style.transition = 'transform 0.3s ease';
        }

        if (Math.abs(this.currentX) > this.swipeThreshold) {
            this.swipe(this.currentX > 0 ? 'right' : 'left');
        } else {
            if (this.elements.memeCard) {
                this.elements.memeCard.style.transform = '';
            }
            this.elements.swipeLeft?.classList.remove('show');
            this.elements.swipeRight?.classList.remove('show');
            this.elements.memeCard?.classList.remove('swipe-left', 'swipe-right');
        }
    }

    swipe(direction) {
        if (!this.currentMeme || this.state !== 'playing') return;

        if (this.memeTimer) {
            clearTimeout(this.memeTimer);
            this.memeTimer = null;
        }

        // Animate out
        const offX = direction === 'right' ? 500 : -500;
        const rotation = direction === 'right' ? 30 : -30;
        if (this.elements.memeCard) {
            this.elements.memeCard.style.transition = 'transform 0.35s ease, opacity 0.25s ease';
            this.elements.memeCard.style.transform = `translateX(${offX}px) rotate(${rotation}deg)`;
            this.elements.memeCard.style.opacity = '0';
        }

        // Judge
        const isDank = this.currentMeme.upvotes > 40000;
        const swipedDank = direction === 'right';
        const correct = isDank === swipedDank;
        const userChoice = swipedDank ? 'dank' : 'normie';

        // Play swipe sound
        if (typeof soundEngine !== 'undefined') {
            direction === 'right' ? soundEngine.swipeRight() : soundEngine.swipeLeft();
        }

        // Train AI
        if (this.neuralNet) {
            this.neuralNet.train(this.currentMeme, userChoice);
        }

        // Update score
        if (correct) {
            this.correctJudgments++;
            const points = Math.round(100 * this.combo * (1 + this.difficulty * 0.15));
            this.score += points;
            this.combo = Math.min(this.combo + 1, 15);
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.brainrot = Math.min(100, this.brainrot + 2);

            this.showFloatingLabel(`+${points}`, 'positive');

            // Sound and effects for combos
            if (typeof soundEngine !== 'undefined') {
                soundEngine.correct();
            }

            if (this.combo >= 3) {
                this.showFloatingLabel(`${this.combo}x COMBO!`, 'combo');
                if (typeof soundEngine !== 'undefined') soundEngine.combo(this.combo);
                if (this.combo >= 5) {
                    this.screenShake();
                    if (typeof soundEngine !== 'undefined') soundEngine.fire();
                }
                if (this.combo >= 7) this.spawnConfetti();
            }

            if (this.correctJudgments % 5 === 0) {
                this.increaseDifficulty();
                if (typeof soundEngine !== 'undefined') soundEngine.levelUp();
            }
        } else {
            this.combo = 1;
            this.brainrot = Math.max(0, this.brainrot - 6);
            this.showFloatingLabel('WRONG!', 'negative');
            this.glitchEffect();
            if (typeof soundEngine !== 'undefined') soundEngine.wrong();
        }

        this.memesJudged++;
        this.updateDisplays();
        this.updateAIDisplay();

        this.elements.swipeLeft?.classList.remove('show');
        this.elements.swipeRight?.classList.remove('show');

        setTimeout(() => this.loadNextMeme(), 300);
    }

    increaseDifficulty() {
        this.difficulty = Math.min(this.difficulty + 1, 10);
        this.currentTimeLimit = Math.max(1500, this.baseTimePerMeme - (this.difficulty * 300));
        this.showFloatingLabel(`LEVEL ${this.difficulty}!`, 'combo');
    }

    updateAIDisplay() {
        if (!this.currentMeme) return;

        try {
            let vibeScore = 50; // 0 = trash, 50 = mid, 100 = fire

            if (this.neuralNet) {
                const prediction = this.neuralNet.predict(this.currentMeme);
                vibeScore = Math.round(prediction.dank * 100);
            }

            // Update gauge pointer position (0% = left, 100% = right)
            const gaugePointer = document.getElementById('gauge-pointer');
            if (gaugePointer) {
                gaugePointer.style.left = `${vibeScore}%`;
            }

            // Update emoji and verdict based on vibe
            const vibeEmoji = document.getElementById('vibe-emoji');
            const vibeVerdict = document.getElementById('vibe-verdict');

            let emoji = '🤔';
            let verdict = 'SCANNING...';
            let verdictClass = '';

            if (vibeScore >= 75) {
                emoji = '🔥';
                verdict = 'ABSOLUTELY FIRE';
                verdictClass = 'fire';
            } else if (vibeScore >= 60) {
                emoji = '😎';
                verdict = 'PRETTY VALID';
                verdictClass = 'fire';
            } else if (vibeScore >= 40) {
                emoji = '😐';
                verdict = 'MID AF';
                verdictClass = 'mid';
            } else if (vibeScore >= 20) {
                emoji = '😬';
                verdict = 'NOT IT CHIEF';
                verdictClass = 'trash';
            } else {
                emoji = '💀';
                verdict = 'CRINGE ALERT';
                verdictClass = 'trash';
            }

            if (vibeEmoji) {
                vibeEmoji.textContent = emoji;
                vibeEmoji.style.animation = 'none';
                vibeEmoji.offsetHeight; // Reflow
                vibeEmoji.style.animation = 'emoji-bounce 0.5s ease';
            }

            if (vibeVerdict) {
                vibeVerdict.textContent = verdict;
                vibeVerdict.className = 'vibe-verdict ' + verdictClass;
            }

            // Update aura based on vibe
            const auraOrb = document.getElementById('aura-orb');
            const auraText = document.getElementById('aura-text');

            const auras = [
                { min: 0, orb: '⬛', text: 'Void Energy', color: '#2d3436' },
                { min: 15, orb: '🔴', text: 'Cursed Aura', color: '#d63031' },
                { min: 30, orb: '🟠', text: 'Chaotic Vibes', color: '#e17055' },
                { min: 45, orb: '🟡', text: 'Neutral Zone', color: '#fdcb6e' },
                { min: 60, orb: '🟢', text: 'Based Energy', color: '#00b894' },
                { min: 75, orb: '🔵', text: 'Sigma Aura', color: '#0984e3' },
                { min: 90, orb: '🟣', text: 'God-Tier Vibes', color: '#6c5ce7' }
            ];

            let currentAura = auras[0];
            for (const aura of auras) {
                if (vibeScore >= aura.min) currentAura = aura;
            }

            if (auraOrb) auraOrb.textContent = currentAura.orb;
            if (auraText) {
                auraText.textContent = currentAura.text;
                auraText.style.color = currentAura.color;
            }

            // Update training count
            const trainCount = document.getElementById('train-count');
            if (trainCount && this.neuralNet) {
                trainCount.textContent = this.neuralNet.trainingData?.length || 0;
            }
        } catch (e) {
            console.warn('AI update error:', e);
        }
    }

    showFloatingLabel(text, type) {
        if (!this.elements.floatingLabels) return;

        const label = document.createElement('div');
        label.className = `floating-label ${type}`;
        label.textContent = text;
        label.style.left = `${40 + Math.random() * 20}%`;
        label.style.top = '35%';
        this.elements.floatingLabels.appendChild(label);

        setTimeout(() => label.remove(), 1000);
    }

    screenShake() {
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 400);
    }

    // Update AI thought display with rotating weird phrases
    updateAIThought() {
        if (!this.elements.aiThoughts) return;

        // Pick a semi-random phrase (weighted toward sequential for coherence)
        if (Math.random() > 0.3) {
            this.thoughtIndex = (this.thoughtIndex + 1) % this.aiThoughts.length;
        } else {
            this.thoughtIndex = Math.floor(Math.random() * this.aiThoughts.length);
        }

        this.elements.aiThoughts.textContent = this.aiThoughts[this.thoughtIndex];
        this.elements.aiThoughts.style.animation = 'none';
        this.elements.aiThoughts.offsetHeight; // Force reflow
        this.elements.aiThoughts.style.animation = 'thought-fade 0.3s ease';
    }

    // Start rotating AI thoughts
    startAIThoughts() {
        if (this.thoughtInterval) clearInterval(this.thoughtInterval);
        this.updateAIThought();
        this.thoughtInterval = setInterval(() => this.updateAIThought(), 400);
    }

    // Stop AI thoughts
    stopAIThoughts() {
        if (this.thoughtInterval) {
            clearInterval(this.thoughtInterval);
            this.thoughtInterval = null;
        }
        if (this.elements.aiThoughts) {
            this.elements.aiThoughts.textContent = "Neural network idle...";
        }
    }

    glitchEffect() {
        if (this.elements.glitchOverlay) {
            this.elements.glitchOverlay.classList.add('active');
            setTimeout(() => this.elements.glitchOverlay.classList.remove('active'), 150);
        }
        // Also update thought on glitch
        this.updateAIThought();
    }

    spawnConfetti() {
        const emojis = ['🔥', '💀', '🧠', '👑', '⭐', '🎉', '💯', '✨'];
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.top = '-40px';
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 2200);
            }, i * 35);
        }
    }

    updateDisplays() {
        if (this.elements.score) {
            this.elements.score.textContent = this.score.toLocaleString();
        }
        if (this.elements.combo) {
            this.elements.combo.textContent = `x${this.combo}`;
        }
        if (this.elements.brainrotFill) {
            this.elements.brainrotFill.style.width = `${this.brainrot}%`;
        }

        if (this.elements.brainState) {
            const states = ['🤓', '🧠', '😵', '🤯', '💀'];
            const index = Math.min(4, Math.floor(this.brainrot / 20));
            this.elements.brainState.textContent = states[index];
        }
    }

    loadNextMeme() {
        if (this.memeQueue.length === 0) {
            this.shuffleMemes();
        }

        this.currentMeme = this.memeQueue.pop();
        if (!this.currentMeme) return;

        // Reset card
        if (this.elements.memeCard) {
            this.elements.memeCard.style.transition = 'none';
            this.elements.memeCard.style.transform = 'translateX(0) rotate(0) scale(0.9)';
            this.elements.memeCard.style.opacity = '0';
            this.elements.memeCard.classList.remove('swipe-left', 'swipe-right');
        }

        if (this.elements.memeImage) {
            this.elements.memeImage.onload = () => {
                setTimeout(() => {
                    if (this.elements.memeCard) {
                        this.elements.memeCard.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                        this.elements.memeCard.style.transform = '';
                        this.elements.memeCard.style.opacity = '1';
                    }
                }, 50);
            };

            this.elements.memeImage.onerror = () => {
                if (this.currentMeme.thumbnail && this.currentMeme.thumbnail !== this.currentMeme.image) {
                    this.elements.memeImage.src = this.currentMeme.thumbnail;
                } else {
                    this.loadNextMeme();
                }
            };

            this.elements.memeImage.src = this.currentMeme.image;
        }

        if (this.elements.memeTitle) {
            this.elements.memeTitle.textContent = this.currentMeme.title;
        }

        this.updateAIDisplay();
        this.startMemeTimer();
    }

    startMemeTimer() {
        if (this.memeTimer) clearTimeout(this.memeTimer);

        if (this.memesJudged >= 3) {
            this.memeTimer = setTimeout(() => {
                if (this.state === 'playing') {
                    this.showFloatingLabel('TOO SLOW!', 'negative');
                    this.combo = 1;
                    this.brainrot = Math.max(0, this.brainrot - 4);
                    this.glitchEffect();
                    this.updateDisplays();
                    this.loadNextMeme();
                }
            }, this.currentTimeLimit);
        }
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.memesJudged = 0;
        this.correctJudgments = 0;
        this.brainrot = 50;
        this.timeLeft = 60;
        this.difficulty = 1;
        this.currentTimeLimit = this.baseTimePerMeme;

        this.initNeuralNetwork();
        this.shuffleMemes();
        this.updateDisplays();

        if (this.elements.timerBar) {
            this.elements.timerBar.style.width = '100%';
        }

        this.showScreen('game');
        this.startAIThoughts();
        this.loadNextMeme();
        this.startTimer();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            this.timeLeft--;

            if (this.elements.timerText) {
                this.elements.timerText.textContent = this.timeLeft;
            }
            if (this.elements.timerBar) {
                this.elements.timerBar.style.width = `${(this.timeLeft / 60) * 100}%`;
            }

            // Warning tick sound in last 10 seconds
            if (this.timeLeft <= 10 && typeof soundEngine !== 'undefined') {
                soundEngine.tick();
            }

            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    endGame() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.memeTimer) clearTimeout(this.memeTimer);
        this.stopAIThoughts();

        this.state = 'gameover';

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('brainrotHighScore', this.highScore.toString());
        }

        // Save to leaderboard
        leaderboard.addEntry(this.username, this.score);

        if (this.elements.finalScore) {
            this.elements.finalScore.textContent = this.score.toLocaleString();
        }
        if (this.elements.maxComboDisplay) {
            this.elements.maxComboDisplay.textContent = `x${this.maxCombo}`;
        }
        if (this.elements.memesJudgedDisplay) {
            this.elements.memesJudgedDisplay.textContent = this.memesJudged;
        }
        if (this.elements.highScoreDisplay) {
            this.elements.highScoreDisplay.textContent = this.highScore.toLocaleString();
        }

        // Play game over sound
        if (typeof soundEngine !== 'undefined') soundEngine.gameOver();

        // Verdict
        const accuracy = this.memesJudged > 0 ? this.correctJudgments / this.memesJudged : 0;
        let verdict = '';
        let brain = '🧠';

        if (this.brainrot >= 85) {
            brain = '💀';
            verdict = 'TERMINAL BRAINROT. The memes have consumed you completely. There is no return.';
        } else if (this.brainrot >= 70) {
            brain = '🤯';
            verdict = 'Severe brainrot detected. Your meme classification skills are concerningly accurate.';
        } else if (this.brainrot >= 50) {
            brain = '😵';
            verdict = 'Moderate brainrot. You walk the fine line between normie and dank.';
        } else if (this.brainrot >= 30) {
            brain = '🧠';
            verdict = 'Minimal brainrot. Your neural network needs more training data.';
        } else {
            brain = '🤓';
            verdict = 'Almost no brainrot. Are you even trying? Touch more memes.';
        }

        if (this.elements.finalBrain) {
            this.elements.finalBrain.textContent = brain;
        }
        if (this.elements.verdict) {
            this.elements.verdict.textContent = verdict;
        }

        this.renderGameoverLeaderboard();
        this.showScreen('gameover');
    }

    updateHighScoreDisplay() {
        if (this.elements.highScoreDisplay) {
            this.elements.highScoreDisplay.textContent = this.highScore.toLocaleString();
        }
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }

    renderLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        const empty = document.getElementById('leaderboard-empty');
        const entries = leaderboard.getEntries();

        if (!list || !empty) return;

        if (entries.length === 0) {
            list.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        list.style.display = 'flex';
        empty.style.display = 'none';

        list.innerHTML = entries.map((entry, index) => {
            const rank = index + 1;
            let rankClass = '';
            let rankDisplay = rank;
            let topClass = '';

            if (rank === 1) {
                rankClass = 'gold';
                rankDisplay = '🥇';
                topClass = 'top-1';
            } else if (rank === 2) {
                rankClass = 'silver';
                rankDisplay = '🥈';
                topClass = 'top-2';
            } else if (rank === 3) {
                rankClass = 'bronze';
                rankDisplay = '🥉';
                topClass = 'top-3';
            }

            const isCurrentUser = entry.name === this.username;
            const highlight = isCurrentUser ? 'style="border-color: var(--accent);"' : '';

            if (entry.name === "Connecting..." || entry.name === "No scores yet...") {
                return `
                    <div class="leaderboard-entry" style="justify-content: center; opacity: 0.7;">
                        <span class="entry-name" style="text-align: center;">${entry.name}</span>
                    </div>
                `;
            }

            return `
                <div class="leaderboard-entry ${topClass}" ${highlight}>
                    <span class="entry-rank ${rankClass}">${rankDisplay}</span>
                    <span class="entry-name">${entry.name}${isCurrentUser ? ' (you)' : ''}</span>
                    <span class="entry-score">${entry.score.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    }

    // Render leaderboard on game over screen
    renderGameoverLeaderboard() {
        const list = document.getElementById('gameover-leaderboard-list');
        if (!list) return;

        const entries = leaderboard.getEntries().slice(0, 5);

        if (entries.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No scores yet!</p>';
            return;
        }

        list.innerHTML = entries.map((entry, index) => {
            const rank = index + 1;
            let rankDisplay = rank;
            let rankClass = '';
            let topClass = '';

            if (rank === 1) { rankDisplay = '🥇'; rankClass = 'gold'; topClass = 'top-1'; }
            else if (rank === 2) { rankDisplay = '🥈'; rankClass = 'silver'; topClass = 'top-2'; }
            else if (rank === 3) { rankDisplay = '🥉'; rankClass = 'bronze'; topClass = 'top-3'; }

            const isCurrentUser = entry.name === this.username;

            return `
                <div class="leaderboard-entry ${topClass}" ${isCurrentUser ? 'style="border-color: var(--accent);"' : ''}>
                    <span class="entry-rank ${rankClass}">${rankDisplay}</span>
                    <span class="entry-name">${entry.name}${isCurrentUser ? ' (you)' : ''}</span>
                    <span class="entry-score">${entry.score.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    }

    // ========== ORACLE MODE ==========

    startOracle() {
        memeOracle.reset();
        this.updateOracleUI();
        document.getElementById('oracle-thinking').style.display = 'none';
        document.getElementById('oracle-result').style.display = 'none';
        document.querySelector('.oracle-question-box').style.display = 'block';
        document.querySelector('.oracle-buttons').style.display = 'flex';
        this.showScreen('oracle');
        if (typeof soundEngine !== 'undefined') soundEngine.click();
    }

    // Oracle methods removed per user request
    oracleAnswer() { return; }
    oracleResult() { return; }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Starting Meme Brainrot Arena...');
    window.game = new MemeGame();
});

// Ambient particles (subtle)
function createAmbientParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    setInterval(() => {
        if (document.hidden) return;

        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            font-size: ${8 + Math.random() * 10}px;
            left: ${Math.random() * 100}%;
            top: 100%;
            opacity: 0.3;
            pointer-events: none;
            z-index: -1;
            animation: ambient-rise ${8 + Math.random() * 6}s linear forwards;
        `;
        particle.textContent = ['✨', '⭐', '💫'][Math.floor(Math.random() * 3)];
        container.appendChild(particle);

        setTimeout(() => particle.remove(), 14000);
    }, 2500);
}

// Add animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ambient-rise {
        0% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
        100% { transform: translateY(-120vh) rotate(180deg); opacity: 0; }
    }
`;
document.head.appendChild(style);

createAmbientParticles();
