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
const btnStartRandom = document.getElementById('btn-start-random');
const btnStartCustom = document.getElementById('btn-start-custom');
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
const btnHint = document.getElementById('btn-hint');
const hintModal = document.getElementById('hint-modal');
const btnCloseHint = document.getElementById('btn-close-hint');
const hintModalBody = document.getElementById('hint-modal-body');
const inputH1 = document.getElementById('input-h1');
const inputH2 = document.getElementById('input-h2');
const inputH3 = document.getElementById('input-h3');

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
btnStartRandom.addEventListener('click', () => startNewGame(false));
btnStartCustom.addEventListener('click', () => startNewGame(true));
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

// Hint Modal Events
btnHint.addEventListener('click', showHint);
btnCloseHint.addEventListener('click', () => hintModal.classList.add('hidden'));
hintModal.addEventListener('click', (e) => {
    if (e.target === hintModal) hintModal.classList.add('hidden');
});

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
// - exactly 3 heaps
// - sizes in [2, 31]
// - no size divisible by m
// - at least two heaps > m
function generateHeaps(m) {
    const numHeaps = 3; // Exactly 3 heaps
    let newHeaps = [];
    
    // Generate at least two heaps > m
    for (let i = 0; i < 2; i++) {
        let size = 0;
        do {
            size = Math.floor(Math.random() * (31 - (m + 1) + 1)) + (m + 1); // [m + 1, 31]
        } while (size % m === 0);
        newHeaps.push(size);
    }
    
    // Generate remaining heaps
    for (let i = 2; i < numHeaps; i++) {
        let size = 0;
        do {
            size = Math.floor(Math.random() * (31 - 2 + 1)) + 2; // [2, 31]
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
function startNewGame(isCustom = false) {
    if (isCustom) {
        const h1 = parseInt(inputH1.value);
        const h2 = parseInt(inputH2.value);
        const h3 = parseInt(inputH3.value);
        
        if (isNaN(h1) || isNaN(h2) || isNaN(h3)) {
            alert('Please enter valid numbers for all heaps.');
            logMessage('Start failed: Invalid custom heap values (NaN).', 'system');
            return;
        }
        if (h1 < 1 || h1 > 31 || h2 < 1 || h2 > 31 || h3 < 1 || h3 > 31) {
            alert('Custom heap sizes must be between 1 and 31.');
            logMessage('Start failed: Custom sizes out of range [1, 31].', 'system');
            return;
        }
        if (h1 % primeModulus === 0 || h2 % primeModulus === 0 || h3 % primeModulus === 0) {
            alert(`Custom heap sizes cannot be divisible by the prime modulus m = ${primeModulus}.`);
            logMessage(`Start failed: Custom heap size is divisible by m = ${primeModulus}.`, 'system');
            return;
        }
        
        heaps = [h1, h2, h3];
    } else {
        heaps = generateHeaps(primeModulus);
    }

    gameState = 'playing';
    btnStartRandom.disabled = true;
    btnStartCustom.disabled = true;
    inputH1.disabled = true;
    inputH2.disabled = true;
    inputH3.disabled = true;
    btnRestart.disabled = false;
    
    // Disable setup UI options
    primeSelector.querySelectorAll('.btn-prime').forEach(btn => {
        if (!btn.classList.contains('active')) btn.style.opacity = 0.5;
    });
    turnSelector.querySelectorAll('.btn-toggle').forEach(btn => {
        if (!btn.classList.contains('active')) btn.style.opacity = 0.5;
    });

    logMessage(`New game started with prime modulus m = ${primeModulus} (${isCustom ? 'Custom Setup' : 'Random Setup'}).`, 'system');
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
    btnStartRandom.disabled = false;
    btnStartCustom.disabled = false;
    inputH1.disabled = false;
    inputH2.disabled = false;
    inputH3.disabled = false;
    btnRestart.disabled = true;
    btnHint.disabled = true;
    
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
        
        // Build 5 shelves for the heap visual container (each shelf always shows slots)
        let shelvesHtml = '';
        for (let k = 0; k < 5; k++) {
            const capacity = Math.pow(2, k);
            const isActive = (h & capacity) > 0;
            
            // Build the stone slots (filled or empty)
            let stonesHtml = '';
            for (let s = 0; s < capacity; s++) {
                stonesHtml += `<div class="stone ${isActive ? 'filled' : 'empty'}"></div>`;
            }
            
            shelvesHtml += `
                <div class="shelf-row ${isActive ? 'active' : ''}" data-level="${k}">
                    <div class="shelf-stones">${stonesHtml}</div>
                    <div class="shelf-line"></div>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="heap-header">
                <div class="heap-title">Heap ${index + 1}</div>
                <div class="heap-size">${h}</div>
            </div>
            <div class="heap-visual-container">
                ${shelvesHtml}
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

    // Toggle Hint Button
    if (gameState === 'playing' && currentTurn === 'player') {
        btnHint.disabled = false;
    } else {
        btnHint.disabled = true;
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

// Show Hint Modal for the Player
function showHint() {
    if (gameState !== 'playing' || currentTurn !== 'player') return;
    
    const P = calculateInvariant(heaps, primeModulus);
    let htmlContent = '';
    
    htmlContent += `
        <div style="margin-bottom: 1.5rem;">
            <p><strong>Current Invariant calculation:</strong></p>
            <div class="formula-box">
                P<sub>mod</sub> = &prod; h<sub>i</sub> (mod m)<br>
                P<sub>mod</sub> = ${heaps.join(' &times; ')} &equiv; ${heaps.reduce((p,h)=>p*h, 1)} &equiv; <strong>${P}</strong> (mod ${primeModulus})
            </div>
        </div>
    `;
    
    if (P === 1) {
        // Losing Position
        htmlContent += `
            <div style="border-left: 4px solid var(--color-secondary); padding-left: 1rem; margin-bottom: 1.5rem;">
                <h3 style="color: var(--color-secondary); margin-bottom: 0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> Losing Position (P-Position)</h3>
                <p>Because the multiplicative invariant <strong>P<sub>mod</sub> &equiv; 1 (mod ${primeModulus})</strong>, you are in a mathematically losing position.</p>
                <p>Under optimal play, any legal move you make will change the invariant to a value other than 1, allowing the AI to win on its next turn.</p>
                <p><strong>Strategy:</strong> Play a normal move and hope the AI makes an error. You can choose any of your legal moves (e.g. from the subtraction menu on your interactive heaps).</p>
            </div>
        `;
    } else {
        // Winning Position
        htmlContent += `
            <div style="border-left: 4px solid var(--color-success); padding-left: 1rem; margin-bottom: 1.5rem;">
                <h3 style="color: var(--color-success); margin-bottom: 0.5rem;"><i class="fa-solid fa-circle-check"></i> Winning Position (N-Position)</h3>
                <p>Because the multiplicative invariant <strong>P<sub>mod</sub> &equiv; ${P} &ne; 1 (mod ${primeModulus})</strong>, you are in a winning position!</p>
                <p>There is at least one winning move that can force the invariant <strong>P<sub>mod</sub> &equiv; 1 (mod ${primeModulus})</strong> for the AI's turn.</p>
            </div>
        `;
        
        let winningMoves = [];
        
        for (let i = 0; i < heaps.length; i++) {
            const h = heaps[i];
            if (h <= 1) continue;
            
            // Calculate product of other heaps
            let P_other = 1;
            let otherHeapsStr = [];
            for (let j = 0; j < heaps.length; j++) {
                if (i !== j) {
                    P_other = (P_other * (heaps[j] % primeModulus)) % primeModulus;
                    otherHeapsStr.push(heaps[j]);
                }
            }
            
            const targetMod = modInverse(P_other, primeModulus);
            
            let r_0 = (h - targetMod) % primeModulus;
            if (r_0 <= 0) r_0 += primeModulus;
            
            if (r_0 < h) {
                winningMoves.push({
                    heapIndex: i,
                    r: r_0,
                    h: h,
                    P_other: P_other,
                    otherHeapsStr: otherHeapsStr.join(' &times; '),
                    targetMod: targetMod,
                    newSize: h - r_0
                });
            }
        }
        
        if (winningMoves.length > 0) {
            htmlContent += `<p><strong>Recommended Winning Move(s):</strong></p>`;
            winningMoves.forEach(move => {
                htmlContent += `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem; margin-top: 0.75rem;">
                        <h4 style="color: var(--color-primary); font-family: var(--font-header); font-size: 0.95rem; margin-bottom: 0.5rem;">
                            👉 Reduce Heap ${move.heapIndex + 1} by ${move.r} (Size ${move.h} &rarr; ${move.newSize})
                        </h4>
                        <div style="font-size: 0.85rem; line-height: 1.5; color: var(--color-text-muted);">
                            <p><strong>Step-by-step Math:</strong></p>
                            <ol style="margin-left: 1.2rem; margin-top: 0.25rem;">
                                <li>Product of all other heaps: <strong>P<sub>-${move.heapIndex + 1}</sub> = ${move.otherHeapsStr} &equiv; ${move.P_other} (mod ${primeModulus})</strong>.</li>
                                <li>To make the total product 1, we want the new size of Heap ${move.heapIndex + 1} (let's call it h'<sub>${move.heapIndex + 1}</sub>) to satisfy:<br>
                                    <span style="font-family: monospace; color: var(--color-text);">h'<sub>${move.heapIndex + 1}</sub> &times; P<sub>-${move.heapIndex + 1}</sub> &equiv; 1 (mod ${primeModulus})</span> &rArr; 
                                    <span style="font-family: monospace; color: var(--color-text);">h'<sub>${move.heapIndex + 1}</sub> &times; ${move.P_other} &equiv; 1 (mod ${primeModulus})</span>.
                                </li>
                                <li>The modular inverse of ${move.P_other} mod ${primeModulus} is <strong>${move.targetMod}</strong> (since ${move.P_other} &times; ${move.targetMod} = ${move.P_other * move.targetMod} &equiv; 1 mod ${primeModulus}). So we want <span style="font-family: monospace; color: var(--color-text);">h'<sub>${move.heapIndex + 1}</sub> &equiv; ${move.targetMod} (mod ${primeModulus})</span>.</li>
                                <li>Subtracting <strong>r = ${move.r}</strong> gives a new size of <strong>h'<sub>${move.heapIndex + 1}</sub> = ${move.newSize}</strong>, which is:
                                    <ul style="margin-left: 1.2rem; margin-top: 0.15rem;">
                                        <li>Not divisible by ${primeModulus} (${move.newSize} &equiv; ${move.targetMod} &not;&equiv; 0 mod ${primeModulus}).</li>
                                        <li>Satisfies the subtraction bound: 1 &le; ${move.r} &lt; ${primeModulus}.</li>
                                        <li>Leaves the new total invariant product: <span style="font-family: monospace; color: var(--color-text);">${move.newSize} &times; ${move.P_other} = ${move.newSize * move.P_other} &equiv; <strong>1 (mod ${primeModulus})</strong></span>.</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                    </div>
                `;
            });
        } else {
            htmlContent += `<p style="color: var(--color-secondary);">No legal winning moves found.</p>`;
        }
    }
    
    hintModalBody.innerHTML = htmlContent;
    hintModal.classList.remove('hidden');
}
