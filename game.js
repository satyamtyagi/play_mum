// Game State Variables
let primeModulus = 5;
let heaps = [];
let currentTurn = 'player'; // 'player' or 'ai'
let gameState = 'idle'; // 'idle', 'playing', 'ended'
let selectedHeapIndex = null;
let selectedSubtraction = null;

// DOM Elements
const primeSelector = document.getElementById('prime-selector');
const turnSelector = document.getElementById('turn-selector');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnRules = document.getElementById('btn-rules');
const rulesModal = document.getElementById('rules-modal');
const btnCloseRules = document.getElementById('btn-close-rules');
const heapsContainer = document.getElementById('heaps-container');
const turnDisplay = document.getElementById('turn-display');
const invariantDisplay = document.getElementById('invariant-display');
const positionStateDisplay = document.getElementById('position-state-display');
const gameLog = document.getElementById('game-log');
const movePanel = document.getElementById('move-panel');
const selectedHeapNumSpan = document.getElementById('selected-heap-num');
const subtractionChoicesDiv = document.getElementById('subtraction-choices');
const btnConfirmMove = document.getElementById('btn-confirm-move');
const btnCancelMove = document.getElementById('btn-cancel-move');

// --- Initialization & Event Listeners ---

// Prime Modulus Selector
primeSelector.addEventListener('click', (e) => {
    if (gameState === 'playing') return; // Disable changes during play
    const target = e.target.closest('.btn-prime');
    if (!target) return;

    primeSelector.querySelectorAll('.btn-prime').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    primeModulus = parseInt(target.getAttribute('data-val'));
    logMessage(`Modulus set to prime m = ${primeModulus}`, 'system');
});

// Turn Selector (Who goes first)
turnSelector.addEventListener('click', (e) => {
    if (gameState === 'playing') return;
    const target = e.target.closest('.btn-toggle');
    if (!target) return;

    turnSelector.querySelectorAll('.btn-toggle').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    currentTurn = target.getAttribute('data-val');
});

// Game Action Buttons
btnStart.addEventListener('click', startNewGame);
btnRestart.addEventListener('click', restartGame);

// Rules Modal Events
btnRules.addEventListener('click', () => rulesModal.classList.remove('hidden'));
btnCloseRules.addEventListener('click', () => rulesModal.classList.add('hidden'));
rulesModal.addEventListener('click', (e) => {
    if (e.target === rulesModal) rulesModal.classList.add('hidden');
});

// Move Panel Events
btnCancelMove.addEventListener('click', deselectHeap);
btnConfirmMove.addEventListener('click', executePlayerMove);

// --- Game Logic Functions ---

// Calculate modular inverse: finding x in (a * x) % m === 1
function modInverse(a, m) {
    a = ((a % m) + m) % m;
    for (let x = 1; x < m; x++) {
        if ((a * x) % m === 1) {
            return x;
        }
    }
    return 1;
}

// Calculate the multiplicative invariant P_mod = \prod h_i \pmod m
function calculateInvariant(heapList, m) {
    if (heapList.length === 0) return 0;
    let prod = 1;
    for (let h of heapList) {
        prod = (prod * (h % m)) % m;
    }
    return prod;
}

// Write message to live game log console
function logMessage(text, type = 'system') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${text}`;
    gameLog.appendChild(entry);
    gameLog.scrollTop = gameLog.scrollHeight;
}

// Initialize heaps under the specific constraints:
// - n in [2, 5]
// - sizes in [2, 50]
// - no size divisible by m
// - at least two heaps > m
function generateHeaps(m) {
    const numHeaps = Math.floor(Math.random() * 4) + 2; // 2 to 5 heaps
    let newHeaps = [];
    
    // Generate at least two heaps > m
    for (let i = 0; i < 2; i++) {
        let size = 0;
        do {
            size = Math.floor(Math.random() * (50 - (m + 1) + 1)) + (m + 1); // [m + 1, 50]
        } while (size % m === 0);
        newHeaps.push(size);
    }
    
    // Generate remaining heaps
    for (let i = 2; i < numHeaps; i++) {
        let size = 0;
        do {
            size = Math.floor(Math.random() * (50 - 2 + 1)) + 2; // [2, 50]
        } while (size % m === 0);
        newHeaps.push(size);
    }
    
    // Shuffle the heaps so the > m ones aren't always first
    for (let i = newHeaps.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newHeaps[i], newHeaps[j]] = [newHeaps[j], newHeaps[i]];
    }
    
    return newHeaps;
}

// Get list of legal subtraction amounts r for heap size h
function getLegalSubtractions(h, m) {
    let choices = [];
    if (h <= 1) return choices;
    
    for (let r = 1; r < m && r < h; r++) {
        const hPrime = h - r;
        if (hPrime % m !== 0) {
            choices.push(r);
        }
    }
    return choices;
}

// Start Game
function startNewGame() {
    gameState = 'playing';
    btnStart.disabled = true;
    btnRestart.disabled = false;
    
    // Disable setup UI options
    primeSelector.querySelectorAll('.btn-prime').forEach(btn => {
        if (!btn.classList.contains('active')) btn.style.opacity = 0.5;
    });
    turnSelector.querySelectorAll('.btn-toggle').forEach(btn => {
        if (!btn.classList.contains('active')) btn.style.opacity = 0.5;
    });

    heaps = generateHeaps(primeModulus);
    logMessage(`New game started with prime modulus m = ${primeModulus}.`, 'system');
    logMessage(`Initial heaps: [${heaps.join(', ')}]`, 'system');
    
    deselectHeap();
    updateUI();
    
    if (currentTurn === 'ai') {
        runAIMove();
    }
}

// Restart Game (Clean Reset)
function restartGame() {
    gameState = 'idle';
    heaps = [];
    selectedHeapIndex = null;
    selectedSubtraction = null;
    
    // Re-enable settings
    btnStart.disabled = false;
    btnRestart.disabled = true;
    
    primeSelector.querySelectorAll('.btn-prime').forEach(btn => {
        btn.style.opacity = 1;
    });
    turnSelector.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.style.opacity = 1;
    });
    
    // Reset indicators
    turnDisplay.textContent = 'Waiting to start';
    turnDisplay.className = 'stat-value';
    invariantDisplay.textContent = '--';
    positionStateDisplay.textContent = '--';
    positionStateDisplay.className = 'stat-value state-badge';
    
    movePanel.classList.add('hidden');
    
    heapsContainer.innerHTML = `
        <div class="empty-board-message">
            <i class="fa-solid fa-circle-question info-icon"></i>
            <p>Configure the game and press Start to initialize the heaps.</p>
        </div>
    `;
    
    logMessage('Game reset. You can adjust setup settings and start again.', 'system');
}

// Render Heaps on Game Board
function renderBoard() {
    heapsContainer.innerHTML = '';
    
    heaps.forEach((h, index) => {
        const card = document.createElement('div');
        card.className = `heap-card`;
        
        // Add styling for inactive/disabled heaps
        if (gameState !== 'playing') {
            card.classList.add('disabled');
        } else if (currentTurn === 'player') {
            if (h === 1) {
                card.classList.add('size-1');
            } else {
                card.classList.add('interactive');
            }
        }
        
        if (selectedHeapIndex === index) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <div class="heap-header">
                <div class="heap-title">Heap ${index + 1}</div>
                <div class="heap-size">${h}</div>
            </div>
            <div class="heap-visual-container">
                <div class="heap-visual-battery ${selectedHeapIndex === index ? 'glow' : ''}">
                    <div class="heap-visual-level" style="height: ${Math.min((h / 50) * 100, 100)}%;"></div>
                </div>
            </div>
        `;
        
        // Setup card click event
        card.addEventListener('click', () => {
            if (gameState !== 'playing' || currentTurn !== 'player' || h <= 1) return;
            selectHeap(index);
        });
        
        heapsContainer.appendChild(card);
    });
}

// Select Heap
function selectHeap(index) {
    selectedHeapIndex = index;
    selectedSubtraction = null;
    renderBoard();
    
    // Set up subtraction panel
    selectedHeapNumSpan.textContent = index + 1;
    subtractionChoicesDiv.innerHTML = '';
    btnConfirmMove.disabled = true;
    
    const h = heaps[index];
    const legalR = getLegalSubtractions(h, primeModulus);
    
    legalR.forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'btn-subtraction';
        btn.textContent = `-${r}`;
        btn.addEventListener('click', () => {
            subtractionChoicesDiv.querySelectorAll('.btn-subtraction').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSubtraction = r;
            btnConfirmMove.disabled = false;
        });
        subtractionChoicesDiv.appendChild(btn);
    });
    
    movePanel.classList.remove('hidden');
}

// Deselect Heap / Reset Panel
function deselectHeap() {
    selectedHeapIndex = null;
    selectedSubtraction = null;
    movePanel.classList.add('hidden');
    renderBoard();
}

// Update turn/invariant/winning display
function updateUI() {
    renderBoard();
    
    // Update Invariant Display
    const P = calculateInvariant(heaps, primeModulus);
    invariantDisplay.textContent = P;
    
    // Update Winning/Losing indicator
    const isLosing = (P === 1);
    if (gameState === 'ended') {
        positionStateDisplay.textContent = 'GAME OVER';
        positionStateDisplay.className = 'stat-value state-badge';
    } else {
        positionStateDisplay.textContent = isLosing ? 'Losing (P-Pos)' : 'Winning (N-Pos)';
        positionStateDisplay.className = `stat-value state-badge ${isLosing ? 'state-losing' : 'state-winning'}`;
    }
    
    // Update Turn display
    if (gameState === 'ended') {
        turnDisplay.textContent = 'Finished';
        turnDisplay.className = 'stat-value';
    } else if (currentTurn === 'player') {
        turnDisplay.innerHTML = `<span style="color: var(--color-primary); text-shadow: 0 0 8px var(--color-primary-glow);"><i class="fa-solid fa-user"></i> Player's Turn</span>`;
    } else {
        turnDisplay.innerHTML = `<span style="color: var(--color-secondary); text-shadow: 0 0 8px var(--color-secondary-glow);"><i class="fa-solid fa-microchip"></i> AI Thinking...</span>`;
    }
}

// Execute Player's Move
function executePlayerMove() {
    if (selectedHeapIndex === null || selectedSubtraction === null || gameState !== 'playing') return;
    
    const hIdx = selectedHeapIndex;
    const r = selectedSubtraction;
    const oldSize = heaps[hIdx];
    const newSize = oldSize - r;
    
    heaps[hIdx] = newSize;
    logMessage(`Player reduced Heap ${hIdx + 1} from ${oldSize} to ${newSize} (subtracted ${r}).`, 'player');
    
    deselectHeap();
    processTurnTransition();
}

// Process automatic consolidation and check game state between turns
function processTurnTransition() {
    // 1. Check Automatic Consolidation
    // "After each legal move, if all heaps satisfy h_i < p, replace the position by the single heap H = \prod h_i"
    const allLessThanM = heaps.every(h => h < primeModulus);
    
    if (allLessThanM && heaps.length > 1) {
        const product = heaps.reduce((prod, h) => prod * h, 1);
        logMessage(`Automatic Consolidation: All heaps are < m (${primeModulus}). Heaps [${heaps.join(', ')}] consolidated into a single heap of size ${product}.`, 'system');
        heaps = [product];
    }
    
    // 2. Check Game Over (all heaps size 1)
    const gameOver = heaps.every(h => h === 1);
    
    if (gameOver) {
        gameState = 'ended';
        updateUI();
        if (currentTurn === 'player') {
            // Player just moved, so it is now the AI's turn, but AI has no legal moves. Player wins!
            logMessage('All heaps reduced to 1. AI has no legal moves.', 'system');
            logMessage('Congratulations! YOU WIN!', 'win');
            alert('Congratulations! You win!');
        } else {
            // AI just moved, so it is now Player's turn, but Player has no legal moves. AI wins!
            logMessage('All heaps reduced to 1. Player has no legal moves.', 'system');
            logMessage('AI Wins. Better luck next time!', 'lose');
            alert('AI Wins! Try again.');
        }
        return;
    }
    
    // 3. Switch Turn
    currentTurn = (currentTurn === 'player') ? 'ai' : 'player';
    updateUI();
    
    // 4. Trigger AI Move if it's AI's turn
    if (gameState === 'playing' && currentTurn === 'ai') {
        runAIMove();
    }
}

// AI Player Strategy implementation
function runAIMove() {
    // Add artificial delay to simulate "thinking"
    setTimeout(() => {
        if (gameState !== 'playing' || currentTurn !== 'ai') return;
        
        let chosenMove = null; // { heapIndex, r }
        
        // Calculate multiplicative invariant P_mod
        const P = calculateInvariant(heaps, primeModulus);
        
        if (P !== 1) {
            // Winning position: AI can force P_mod \equiv 1
            // Search for a heap i that allows a move resulting in product mod m = 1
            for (let i = 0; i < heaps.length; i++) {
                const h = heaps[i];
                if (h <= 1) continue;
                
                // P_other = product of all other heaps mod m
                let P_other = 1;
                for (let j = 0; j < heaps.length; j++) {
                    if (i !== j) {
                        P_other = (P_other * (heaps[j] % primeModulus)) % primeModulus;
                    }
                }
                
                // We want: h'_i * P_other \equiv 1 (mod m)
                // => h'_i \equiv P_other^{-1} (mod m)
                const targetMod = modInverse(P_other, primeModulus);
                
                // We need subtraction r_0 in [1, m - 1] such that (h - r_0) \equiv targetMod (mod m)
                // => r_0 \equiv h - targetMod (mod m)
                let r_0 = (h - targetMod) % primeModulus;
                if (r_0 <= 0) r_0 += primeModulus; // Adjust to positive in range [1, m - 1]
                
                // Verify move legality constraints:
                // 1. 1 <= r_0 < m (guaranteed by modulo construction unless targetMod makes it 0, but P !== 1 prevents this)
                // 2. r_0 < h
                // 3. (h - r_0) % m !== 0 (which is targetMod !== 0, true since targetMod is modular inverse of non-zero)
                if (r_0 < h) {
                    chosenMove = { heapIndex: i, r: r_0 };
                    break; // Found winning move!
                }
            }
        }
        
        // If no winning move is found (should only happen if P === 1, i.e., losing position),
        // choose a random legal move
        if (chosenMove === null) {
            const allLegalMoves = [];
            for (let i = 0; i < heaps.length; i++) {
                const legalR = getLegalSubtractions(heaps[i], primeModulus);
                legalR.forEach(r => {
                    allLegalMoves.push({ heapIndex: i, r: r });
                });
            }
            
            if (allLegalMoves.length > 0) {
                const randomIdx = Math.floor(Math.random() * allLegalMoves.length);
                chosenMove = allLegalMoves[randomIdx];
            }
        }
        
        // Execute the chosen move
        if (chosenMove) {
            const hIdx = chosenMove.heapIndex;
            const r = chosenMove.r;
            const oldSize = heaps[hIdx];
            const newSize = oldSize - r;
            
            heaps[hIdx] = newSize;
            logMessage(`AI reduced Heap ${hIdx + 1} from ${oldSize} to ${newSize} (subtracted ${r}).`, 'ai');
            
            processTurnTransition();
        } else {
            // No moves available (should not happen unless heaps are all 1, which is caught earlier)
            logMessage('AI cannot find any legal moves!', 'system');
            gameState = 'ended';
            updateUI();
            logMessage('Congratulations! YOU WIN!', 'win');
            alert('Congratulations! You win!');
        }
        
    }, 1500); // 1.5 second artificial delay
}

// Write initial logs on startup
logMessage('Welcome to MuM: Multiplicative Modulo Nim!', 'system');
logMessage('Select a prime modulus m and click Start to begin.', 'system');
