class SequenceGame {
    constructor() {
        this.score = 0;
        this.sequence = [];
        this.currentPosition = 0;
        this.isShowingSequence = false;
        this.isAnimating = false;
        this.lastUpdateCheck = null;

        // DOM Elements
        this.sequenceElement = document.getElementById('sequence');
        this.scoreElement = document.getElementById('score');
        this.messageElement = document.getElementById('message');
        this.guessInput = document.getElementById('userGuess');
        this.submitButton = document.getElementById('submitGuess');
        this.newGameButton = document.getElementById('newGame');
        this.countdownElement = document.getElementById('countdown');

        // Event Listeners
        this.submitButton.addEventListener('click', () => this.checkGuess());
        this.newGameButton.addEventListener('click', () => this.startNewGame());
        this.guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkGuess();
        });

        // Animation end listener
        this.sequenceElement.addEventListener('animationend', () => {
            this.sequenceElement.classList.remove('racing');
            this.isAnimating = false;
        });

        // Initialize game state
        this.disableGameControls();
        this.loadSequence();
    }

    async loadSequence() {
        try {
            console.log('Attempting to load sequences.json...');
            // Use XMLHttpRequest instead of fetch for local file access
            const data = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.overrideMimeType("application/json");
                xhr.open('GET', 'sequences.json', true);
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            resolve(data);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error(`Failed to load sequences.json: ${xhr.statusText}`));
                    }
                };
                xhr.onerror = function() {
                    reject(new Error('Failed to load sequences.json'));
                };
                xhr.send();
            });
            
            console.log('Successfully loaded JSON data:', data);
            
            // Get current date and find the most recent Saturday
            const now = new Date();
            console.log('Current date:', now.toISOString());
            const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
            const daysToLastSaturday = (currentDay + 1) % 7;
            const lastSaturday = new Date(now);
            lastSaturday.setDate(now.getDate() - daysToLastSaturday);
            lastSaturday.setHours(0, 0, 0, 0);
            console.log('Last Saturday:', lastSaturday.toISOString());

            // Format date as YYYY-MM-DD
            const dateString = lastSaturday.toISOString().split('T')[0];
            console.log('Looking for sequence for date:', dateString);

            // Find the sequence for this week
            const weeklySequence = data.weeklySequences.find(w => w.week === dateString);
            console.log('Found sequence:', weeklySequence);
            
            if (weeklySequence) {
                this.sequence = weeklySequence.sequence;
                console.log('Using weekly sequence:', this.sequence);
            } else {
                this.sequence = data.defaultSequence;
                console.log('Using default sequence:', this.sequence);
            }

            // Store last update check
            this.lastUpdateCheck = now;

            // Check if we need to update sequence (if it's been more than a day since last check)
            this.scheduleNextUpdate();

        } catch (error) {
            console.error('Detailed error loading sequence:', error);
            console.error('Error stack:', error.stack);
            // Fallback to default sequence
            this.sequence = Array.from({length: 10}, (_, i) => i + 1);
            console.log('Using fallback sequence:', this.sequence);
        }
    }

    scheduleNextUpdate() {
        if (!this.lastUpdateCheck) return;

        const now = new Date();
        const nextSaturday = new Date(now);
        nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
        nextSaturday.setHours(0, 0, 0, 0);

        const timeUntilUpdate = nextSaturday.getTime() - now.getTime();
        
        // Schedule next update
        setTimeout(() => this.loadSequence(), timeUntilUpdate);
        console.log('Next sequence update scheduled for:', nextSaturday);
    }

    async countdown() {
        const numberElement = this.countdownElement.querySelector('.countdown-number');
        const textElement = this.countdownElement.querySelector('.countdown-text');
        
        this.countdownElement.classList.add('visible');
        numberElement.textContent = "5";
        textElement.textContent = "SECONDS TO POST";
        await new Promise(resolve => setTimeout(resolve, 1000));

        for (let i = 5; i > 0; i--) {
            this.countdownElement.classList.add('flash');
            numberElement.textContent = i;
            textElement.textContent = i === 1 ? "SECOND TO POST" : "SECONDS TO POST";
            await new Promise(resolve => setTimeout(resolve, 900));
            this.countdownElement.classList.remove('flash');
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.countdownElement.classList.remove('visible');
    }

    disableGameControls() {
        this.guessInput.disabled = true;
        this.submitButton.disabled = true;
    }

    enableGameControls() {
        this.guessInput.disabled = false;
        this.submitButton.disabled = false;
        this.guessInput.focus();
    }

    async displayNumber(number, animate = false) {
        return new Promise(async (resolve) => {
            this.sequenceElement.textContent = number;
            this.sequenceElement.setAttribute('data-number', number);
            this.sequenceElement.classList.remove('question-mark');
            
            if (animate) {
                this.isAnimating = true;
                this.sequenceElement.classList.add('racing');
                // Wait for animation to complete
                await new Promise(r => setTimeout(r, 1200));
                resolve();
            } else {
                resolve();
            }
        });
    }

    displayQuestionMark() {
        this.sequenceElement.textContent = '?';
        this.sequenceElement.removeAttribute('data-number');
        this.sequenceElement.classList.add('question-mark');
    }

    async showSequence() {
        this.isShowingSequence = true;
        this.disableGameControls();
        this.newGameButton.disabled = true;
        
        // Clear any previous content
        this.sequenceElement.textContent = '';
        this.clearMessage();

        // Start with countdown
        await this.countdown();

        // Show each number racing across the screen
        for (let number of this.sequence) {
            await this.displayNumber(number, true);
            // Add a small gap between numbers
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Ready for guessing
        this.displayQuestionMark();
        this.showMessage('Now guess each number in sequence!', true);
        this.enableGameControls();
        this.newGameButton.disabled = false;
        this.isShowingSequence = false;
        this.currentPosition = 0;
    }

    async startNewGame() {
        // Check if we need to reload sequence
        if (!this.lastUpdateCheck || Date.now() - this.lastUpdateCheck.getTime() > 86400000) {
            await this.loadSequence();
        }

        // Reset game state
        this.score = 0;
        this.scoreElement.textContent = '0';
        this.currentPosition = 0;
        this.guessInput.value = '';
        
        // Start showing sequence
        await this.showSequence();
    }

    showMessage(text, isSuccess) {
        this.messageElement.textContent = text;
        this.messageElement.className = isSuccess ? 'success' : 'error';
    }

    clearMessage() {
        this.messageElement.textContent = '';
        this.messageElement.className = '';
    }

    async checkGuess() {
        if (this.isShowingSequence || this.isAnimating) return;
        
        const guess = parseInt(this.guessInput.value);
        
        if (isNaN(guess) || guess < 1 || guess > 10) {
            this.showMessage('Please enter a valid number between 1 and 10!', false);
            return;
        }

        if (guess === this.sequence[this.currentPosition]) {
            this.currentPosition++;
            this.updateScore(1);
            
            // Show the correct number racing across
            await this.displayNumber(guess, true);
            
            if (this.currentPosition >= this.sequence.length) {
                this.showMessage('Congratulations! You remembered the entire sequence!', true);
                this.disableGameControls();
            } else {
                this.displayQuestionMark();
                this.showMessage(`Correct! ${10 - this.currentPosition} numbers remaining`, true);
            }
            
            this.guessInput.value = '';
        } else {
            this.showMessage(`Wrong! Try again! You need number ${this.currentPosition + 1} in the sequence`, false);
            this.updateScore(-1);
        }
        
        this.guessInput.focus();
    }

    updateScore(increment) {
        this.score += increment;
        this.scoreElement.textContent = this.score;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new SequenceGame();
}); 