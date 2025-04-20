class SequenceGame {
    constructor() {
        this.score = 0;
        this.sequence = [];
        this.currentPosition = 0;
        this.isShowingSequence = false;
        this.isAnimating = false;
        this.lastUpdateCheck = null;
        this.currentGuess = null;
        this.guessSequence = []; // Array to store complete sequence of guesses
        this.guessedNumbers = new Set(); // Track which numbers have been guessed

        // DOM Elements
        this.sequenceElement = document.getElementById('sequence');
        this.scoreElement = document.getElementById('score');
        this.messageElement = document.getElementById('message');
        this.submitButton = document.getElementById('submitGuess');
        this.clearButton = document.getElementById('clearGuess');
        this.newGameButton = document.getElementById('newGame');
        this.countdownElement = document.getElementById('countdown');
        this.numberButtons = document.querySelectorAll('.number-btn');
        this.actionButtons = document.querySelector('.action-buttons');
        this.guessContainer = document.querySelector('.guess-container');

        // Event Listeners
        this.submitButton.addEventListener('click', () => this.submitCompleteSequence());
        this.clearButton.addEventListener('click', () => this.clearGuess());
        this.newGameButton.addEventListener('click', () => this.startNewGame());
        
        // Add click handlers for number buttons
        this.numberButtons.forEach(button => {
            button.addEventListener('click', () => this.selectNumber(button));
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

    selectNumber(button) {
        if (this.isShowingSequence || this.isAnimating) return;
        
        const number = parseInt(button.getAttribute('data-number'));
        
        // Check if number was already guessed
        if (this.guessedNumbers.has(number)) {
            this.showMessage('You already picked this number!', false);
            return;
        }
        
        // Remove selected class from all buttons
        this.numberButtons.forEach(btn => btn.classList.remove('selected'));
        
        // Add selected class to clicked button
        button.classList.add('selected');
        
        // Store the selected number
        this.currentGuess = number;
        
        // Show action buttons when a number is selected
        this.actionButtons.classList.remove('hidden');
    }

    clearGuess() {
        this.currentGuess = null;
        this.numberButtons.forEach(btn => btn.classList.remove('selected'));
        this.actionButtons.classList.add('hidden');
    }

    disableGameControls() {
        this.numberButtons.forEach(btn => btn.disabled = true);
        this.actionButtons.classList.add('hidden');
    }

    enableGameControls() {
        this.numberButtons.forEach(btn => btn.disabled = false);
        this.actionButtons.classList.add('hidden');
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

    async displayNumber(number, animate = false) {
        this.sequenceElement.textContent = number;
        this.sequenceElement.setAttribute('data-number', number);
        this.sequenceElement.classList.remove('question-mark');
        
        if (animate) {
            this.isAnimating = true;
            this.sequenceElement.classList.add('racing');
            await new Promise(resolve => setTimeout(resolve, 1200));
            this.isAnimating = false;
        }
    }

    displayQuestionMark() {
        this.sequenceElement.textContent = '?';
        this.sequenceElement.removeAttribute('data-number');
        this.sequenceElement.classList.add('question-mark');
    }

    async showSequence() {
        this.isShowingSequence = true;
        this.disableGameControls();
        this.newGameButton.classList.add('hidden');
        
        // Clear any previous content
        this.sequenceElement.textContent = '';
        this.sequenceElement.classList.remove('question-mark');
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
        this.showMessage('Pick the winner', true);
        this.enableGameControls();
        this.isShowingSequence = false;
        this.currentPosition = 0;
    }

    showPositionMessage() {
        const positions = ['winner', '2nd place', '3rd place', '4th place', '5th place', 
                         '6th place', '7th place', '8th place', '9th place', '10th place'];
        this.showMessage(`Pick the ${positions[this.currentPosition]}`, true);
    }

    async submitCompleteSequence() {
        if (this.isShowingSequence || this.isAnimating) return;
        
        if (!this.currentGuess) {
            this.showMessage('Please select a number!', false);
            return;
        }

        // Add current guess to sequence
        this.guessSequence.push(this.currentGuess);
        this.guessedNumbers.add(this.currentGuess);

        // Disable the selected number button
        const selectedButton = document.querySelector(`.number-btn[data-number="${this.currentGuess}"]`);
        if (selectedButton) {
            selectedButton.classList.add('disabled');
            
            // Get button position
            const rect = selectedButton.getBoundingClientRect();
            const containerRect = this.guessContainer.getBoundingClientRect();
            
            // Create and animate the guessed number
            const guessedNumber = document.createElement('div');
            guessedNumber.className = 'guessed-number';
            guessedNumber.textContent = this.currentGuess;
            guessedNumber.setAttribute('data-number', this.currentGuess);
            guessedNumber.style.setProperty('--start-x', `${rect.left - containerRect.left}px`);
            guessedNumber.style.setProperty('--start-y', `${rect.top - containerRect.top}px`);
            guessedNumber.style.setProperty('--position', this.guessSequence.length);
            this.guessContainer.appendChild(guessedNumber);

            // Animate the number
            await new Promise(resolve => {
                guessedNumber.addEventListener('animationend', resolve, { once: true });
            });
        }

        // Clear current guess and update UI
        this.clearGuess();
        
        // If we have all 10 guesses, check the sequence
        if (this.guessSequence.length === 10) {
            await this.checkCompleteSequence();
        } else {
            this.showMessage(`Pick horse #${this.guessSequence.length + 1}`, true);
        }
    }

    async checkCompleteSequence() {
        let score = 0;
        const results = [];
        
        // Check each position
        for (let i = 0; i < this.sequence.length; i++) {
            if (this.guessSequence[i] === this.sequence[i]) {
                score += 10;
                results.push({ correct: true, position: i });
            } else {
                results.push({ correct: false, position: i });
            }
        }

        // Update score
        this.score += score;
        this.scoreElement.textContent = this.score;

        // Show results
        if (score === 100) {
            this.showMessage('Perfect! You got all positions correct!', true);
        } else {
            this.showMessage(`You scored ${score} points!`, true);
        }

        // Disable controls and show start button
        this.disableGameControls();
        this.newGameButton.classList.remove('hidden');
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
        this.guessSequence = [];
        this.guessedNumbers.clear();
        this.clearGuess();
        this.clearMessage();
        
        // Clear guess container and sequence
        this.guessContainer.innerHTML = '';
        this.sequenceElement.textContent = '';
        this.sequenceElement.classList.remove('question-mark');
        
        // Re-enable all number buttons
        this.numberButtons.forEach(button => {
            button.classList.remove('disabled');
        });
        
        // Start showing sequence
        await this.showSequence();
    }

    showMessage(text, isSuccess) {
        this.messageElement.textContent = text;
        this.messageElement.className = isSuccess ? 'success' : 'error';
        this.messageElement.classList.remove('hidden');
    }

    clearMessage() {
        this.messageElement.textContent = '';
        this.messageElement.className = 'hidden';
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new SequenceGame();
}); 
