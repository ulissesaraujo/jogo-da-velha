// ==========================================
// ESTADO DO JOGO
// ==========================================
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let vsComputer = false;
let isOnlineGame = false;
let difficulty = 'impossivel';
const humanPlayer = 'X';
const computerPlayer = 'O';

// Placar
let score = { x: 0, o: 0, empate: 0 };

// Combinações vencedoras
const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // colunas
    [0, 4, 8], [2, 4, 6]             // diagonais
];

// ==========================================
// ELEMENTOS DO DOM
// ==========================================
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');
const modeBtn = document.getElementById('modeBtn');
const difficultyBtn = document.getElementById('difficultyBtn');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const scoreDraw = document.getElementById('scoreDraw');
const resetScoreBtn = document.getElementById('resetScoreBtn');

// Telas
const menuScreen = document.getElementById('menuScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const waitingScreen = document.getElementById('waitingScreen');
const gameScreen = document.getElementById('gameScreen');

// Botões de navegação
const localModeBtn = document.getElementById('localModeBtn');
const onlineModeBtn = document.getElementById('onlineModeBtn');
const exitGameBtn = document.getElementById('exitGameBtn');

// Mensagens
const messages = {
    turn: (player) => `Vez do jogador: ${player}`,
    winner: (player) => `🎉 Jogador ${player} venceu!`,
    draw: () => `😐 Empate!`,
    yourTurn: () => `🎯 Sua vez!`,
    waitingTurn: () => `⏳ Vez do oponente...`,
    waiting: () => `Aguardando jogador...`
};

// ==========================================
// NAVEGAÇÃO ENTRE TELAS
// ==========================================
function showScreen(screen) {
    [menuScreen, lobbyScreen, waitingScreen, gameScreen].forEach(s => {
        s.classList.add('hidden');
    });
    screen.classList.remove('hidden');
}

function startLocalGame() {
    isOnlineGame = false;
    vsComputer = false;
    
    // Mostra botões de modo local
    modeBtn.style.display = 'inline-block';
    modeBtn.textContent = 'Modo: 2 Jogadores 👥';
    difficultyBtn.style.display = 'none';
    
    document.getElementById('onlineBadge').style.display = 'none';
    document.getElementById('playerIndicator').style.display = 'none';
    
    showScreen(gameScreen);
    restartGame();
}

function exitToMenu() {
    if (isOnlineGame && typeof leaveRoom === 'function') {
        leaveRoom();
    }
    isOnlineGame = false;
    showScreen(menuScreen);
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
function initGame() {
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
    
    restartBtn.addEventListener('click', restartGame);
    modeBtn.addEventListener('click', toggleMode);
    difficultyBtn.addEventListener('click', toggleDifficulty);
    resetScoreBtn.addEventListener('click', resetScore);
    
    localModeBtn.addEventListener('click', startLocalGame);
    onlineModeBtn.addEventListener('click', () => showScreen(lobbyScreen));
    exitGameBtn.addEventListener('click', exitToMenu);
    
    updateScoreDisplay();
}

// ==========================================
// LÓGICA DO JOGO
// ==========================================
function handleCellClick(event) {
    const cell = event.target;
    const index = parseInt(cell.getAttribute('data-index'));

    // Ignora se a célula já está ocupada ou o jogo acabou
    if (board[index] !== '' || !gameActive) {
        return;
    }

    // Se é jogo online, verifica se é a vez do jogador
    if (isOnlineGame) {
        if (currentPlayer !== myPlayer) {
            return; // Não é sua vez
        }
        // Envia jogada para o Firebase
        sendMove(index);
        return;
    }

    // Jogo local
    makeMove(cell, index);
    checkResult();
}

function makeMove(cell, index) {
    board[index] = currentPlayer;
    cell.textContent = currentPlayer;
    cell.classList.add('taken', currentPlayer.toLowerCase());
}

// Função para aplicar jogada (usada pelo online.js)
function applyMove(index, player) {
    const cell = cells[index];
    board[index] = player;
    cell.textContent = player;
    cell.classList.add('taken', player.toLowerCase());
}

function checkWinner(boardState) {
    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            return { winner: boardState[a], cells: combination };
        }
    }
    return null;
}

function getEmptyCells(boardState) {
    return boardState.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
}

function checkResult() {
    const result = checkWinner(board);

    if (result) {
        statusDisplay.textContent = messages.winner(result.winner);
        statusDisplay.classList.add('winner');
        gameActive = false;

        score[result.winner.toLowerCase()]++;
        updateScoreDisplay();

        result.cells.forEach(index => {
            cells[index].classList.add('winner-cell');
        });
        return true;
    }

    if (!board.includes('')) {
        statusDisplay.textContent = messages.draw();
        statusDisplay.classList.add('draw');
        gameActive = false;
        
        score.empate++;
        updateScoreDisplay();
        return true;
    }

    // Continua o jogo
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    
    if (isOnlineGame) {
        updateOnlineStatus();
    } else {
        statusDisplay.textContent = messages.turn(currentPlayer);
        
        if (vsComputer && currentPlayer === computerPlayer) {
            computerMove();
        }
    }
    
    return false;
}

function updateOnlineStatus() {
    if (currentPlayer === myPlayer) {
        statusDisplay.textContent = messages.yourTurn();
        statusDisplay.classList.add('your-turn');
        statusDisplay.classList.remove('waiting-turn');
    } else {
        statusDisplay.textContent = messages.waitingTurn();
        statusDisplay.classList.add('waiting-turn');
        statusDisplay.classList.remove('your-turn');
    }
}

// ==========================================
// PLACAR
// ==========================================
function updateScoreDisplay() {
    scoreX.textContent = score.x;
    scoreO.textContent = score.o;
    scoreDraw.textContent = score.empate;
}

function resetScore() {
    score = { x: 0, o: 0, empate: 0 };
    updateScoreDisplay();
}

// ==========================================
// REINICIAR JOGO
// ==========================================
function restartGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;

    statusDisplay.classList.remove('winner', 'draw', 'your-turn', 'waiting-turn');
    
    if (isOnlineGame) {
        updateOnlineStatus();
    } else {
        statusDisplay.textContent = messages.turn(currentPlayer);
    }

    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o', 'winner-cell');
    });
}

// Função para reiniciar jogo online (chamada pelo online.js)
function restartOnlineGame(gameState) {
    board = gameState.board || ['', '', '', '', '', '', '', '', ''];
    currentPlayer = gameState.currentPlayer || 'X';
    gameActive = true;

    statusDisplay.classList.remove('winner', 'draw', 'your-turn', 'waiting-turn');
    updateOnlineStatus();

    cells.forEach((cell, index) => {
        cell.textContent = board[index];
        cell.classList.remove('taken', 'x', 'o', 'winner-cell');
        if (board[index]) {
            cell.classList.add('taken', board[index].toLowerCase());
        }
    });
}

// ==========================================
// MODO LOCAL - IA
// ==========================================
function toggleMode() {
    vsComputer = !vsComputer;
    modeBtn.textContent = vsComputer ? 'Modo: vs Computador 🤖' : 'Modo: 2 Jogadores 👥';
    difficultyBtn.style.display = vsComputer ? 'inline-block' : 'none';
    restartGame();
}

function toggleDifficulty() {
    const difficulties = ['facil', 'medio', 'impossivel'];
    const labels = { 'facil': 'Fácil 🟢', 'medio': 'Médio 🟡', 'impossivel': 'Impossível 🔴' };
    
    const currentIndex = difficulties.indexOf(difficulty);
    difficulty = difficulties[(currentIndex + 1) % difficulties.length];
    difficultyBtn.textContent = `Nível: ${labels[difficulty]}`;
    restartGame();
}

function minimax(boardState, depth, isMaximizing) {
    const result = checkWinner(boardState);
    
    if (result?.winner === computerPlayer) return 10 - depth;
    if (result?.winner === humanPlayer) return depth - 10;
    if (getEmptyCells(boardState).length === 0) return 0;
    
    if (isMaximizing) {
        let bestScore = -Infinity;
        for (const index of getEmptyCells(boardState)) {
            boardState[index] = computerPlayer;
            bestScore = Math.max(bestScore, minimax(boardState, depth + 1, false));
            boardState[index] = '';
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (const index of getEmptyCells(boardState)) {
            boardState[index] = humanPlayer;
            bestScore = Math.min(bestScore, minimax(boardState, depth + 1, true));
            boardState[index] = '';
        }
        return bestScore;
    }
}

function getBestMove() {
    const emptyCells = getEmptyCells(board);
    
    if (difficulty === 'facil') {
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    if (difficulty === 'medio' && Math.random() < 0.5) {
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    let bestScore = -Infinity;
    let bestMove = null;
    
    for (const index of emptyCells) {
        board[index] = computerPlayer;
        const score = minimax(board, 0, false);
        board[index] = '';
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = index;
        }
    }
    
    return bestMove;
}

function computerMove() {
    if (!gameActive || currentPlayer !== computerPlayer) return;
    
    setTimeout(() => {
        const move = getBestMove();
        if (move !== null) {
            makeMove(cells[move], move);
            checkResult();
        }
    }, 400);
}

// Inicia o jogo
initGame();
