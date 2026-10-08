// Estado do jogo
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let vsComputer = true; // true = jogar contra IA, false = dois jogadores
let difficulty = 'impossivel'; // 'facil', 'medio', 'impossivel'
const humanPlayer = 'X';
const computerPlayer = 'O';

// Placar
let score = {
    x: 0,
    o: 0,
    empate: 0
};

// Combinações vencedoras (índices do tabuleiro)
const winningCombinations = [
    [0, 1, 2], // linha superior
    [3, 4, 5], // linha do meio
    [6, 7, 8], // linha inferior
    [0, 3, 6], // coluna esquerda
    [1, 4, 7], // coluna do meio
    [2, 5, 8], // coluna direita
    [0, 4, 8], // diagonal principal
    [2, 4, 6]  // diagonal secundária
];

// Elementos do DOM
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');
const modeBtn = document.getElementById('modeBtn');
const difficultyBtn = document.getElementById('difficultyBtn');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const scoreDraw = document.getElementById('scoreDraw');
const resetScoreBtn = document.getElementById('resetScoreBtn');

// Mensagens
const messages = {
    turn: (player) => `Vez do jogador: ${player}`,
    winner: (player) => `🎉 Jogador ${player} venceu!`,
    draw: () => `😐 Empate!`
};

// Inicializa os event listeners
function initGame() {
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
    restartBtn.addEventListener('click', restartGame);
    modeBtn.addEventListener('click', toggleMode);
    difficultyBtn.addEventListener('click', toggleDifficulty);
    resetScoreBtn.addEventListener('click', resetScore);
    updateScoreDisplay();
}

// Atualiza o placar na tela
function updateScoreDisplay() {
    scoreX.textContent = score.x;
    scoreO.textContent = score.o;
    scoreDraw.textContent = score.empate;
}

// Reseta o placar
function resetScore() {
    score = { x: 0, o: 0, empate: 0 };
    updateScoreDisplay();
}

// Alterna entre jogar contra IA ou dois jogadores
function toggleMode() {
    vsComputer = !vsComputer;
    modeBtn.textContent = vsComputer ? 'Modo: vs Computador 🤖' : 'Modo: 2 Jogadores 👥';
    
    // Mostra/esconde botão de dificuldade
    difficultyBtn.style.display = vsComputer ? 'inline-block' : 'none';
    
    restartGame();
}

// Alterna dificuldade da IA
function toggleDifficulty() {
    const difficulties = ['facil', 'medio', 'impossivel'];
    const labels = {
        'facil': 'Fácil 🟢',
        'medio': 'Médio 🟡',
        'impossivel': 'Impossível 🔴'
    };
    
    const currentIndex = difficulties.indexOf(difficulty);
    const nextIndex = (currentIndex + 1) % difficulties.length;
    difficulty = difficulties[nextIndex];
    
    difficultyBtn.textContent = `Nível: ${labels[difficulty]}`;
    restartGame();
}

// Trata o clique em uma célula
function handleCellClick(event) {
    const cell = event.target;
    const index = parseInt(cell.getAttribute('data-index'));

    // Ignora se a célula já está ocupada ou o jogo acabou
    if (board[index] !== '' || !gameActive) {
        return;
    }

    // Faz a jogada
    makeMove(cell, index);

    // Verifica o resultado
    checkResult();
}

// Realiza uma jogada
function makeMove(cell, index) {
    board[index] = currentPlayer;
    cell.textContent = currentPlayer;
    cell.classList.add('taken', currentPlayer.toLowerCase());
}

// Verifica se há um vencedor (retorna o jogador vencedor ou null)
function checkWinner(boardState) {
    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            return boardState[a];
        }
    }
    return null;
}

// Retorna as posições vazias do tabuleiro
function getEmptyCells(boardState) {
    return boardState.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
}

// Algoritmo Minimax - a IA pensa em todas as jogadas possíveis
function minimax(boardState, depth, isMaximizing) {
    const winner = checkWinner(boardState);
    
    // Casos base: alguém ganhou ou empatou
    if (winner === computerPlayer) return 10 - depth; // IA venceu (prefere vitórias rápidas)
    if (winner === humanPlayer) return depth - 10;    // Humano venceu
    if (getEmptyCells(boardState).length === 0) return 0; // Empate
    
    if (isMaximizing) {
        // Turno da IA - quer maximizar o score
        let bestScore = -Infinity;
        for (const index of getEmptyCells(boardState)) {
            boardState[index] = computerPlayer;
            const score = minimax(boardState, depth + 1, false);
            boardState[index] = '';
            bestScore = Math.max(score, bestScore);
        }
        return bestScore;
    } else {
        // Turno do humano - quer minimizar o score
        let bestScore = Infinity;
        for (const index of getEmptyCells(boardState)) {
            boardState[index] = humanPlayer;
            const score = minimax(boardState, depth + 1, true);
            boardState[index] = '';
            bestScore = Math.min(score, bestScore);
        }
        return bestScore;
    }
}

// IA escolhe a melhor jogada baseada na dificuldade
function getBestMove() {
    const emptyCells = getEmptyCells(board);
    
    // Fácil: jogada aleatória
    if (difficulty === 'facil') {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        return emptyCells[randomIndex];
    }
    
    // Médio: 50% chance de jogada aleatória, 50% Minimax
    if (difficulty === 'medio') {
        if (Math.random() < 0.5) {
            const randomIndex = Math.floor(Math.random() * emptyCells.length);
            return emptyCells[randomIndex];
        }
    }
    
    // Impossível (ou 50% do Médio): Minimax puro
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

// Jogada da IA
function computerMove() {
    if (!gameActive || currentPlayer !== computerPlayer) return;
    
    // Pequeno delay para parecer que a IA está "pensando"
    setTimeout(() => {
        const move = getBestMove();
        if (move !== null) {
            const cell = cells[move];
            makeMove(cell, move);
            checkResult();
        }
    }, 400);
}

// Verifica se há um vencedor ou empate
function checkResult() {
    let roundWon = false;
    let winningCells = [];

    // Verifica cada combinação vencedora
    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningCells = combination;
            break;
        }
    }

    if (roundWon) {
        // Temos um vencedor!
        statusDisplay.textContent = messages.winner(currentPlayer);
        statusDisplay.classList.add('winner');
        gameActive = false;

        // Atualiza o placar
        score[currentPlayer.toLowerCase()]++;
        updateScoreDisplay();

        // Destaca as células vencedoras
        winningCells.forEach(index => {
            cells[index].classList.add('winner-cell');
        });
        return;
    }

    // Verifica empate (todas as células preenchidas)
    if (!board.includes('')) {
        statusDisplay.textContent = messages.draw();
        statusDisplay.classList.add('draw');
        gameActive = false;
        
        // Atualiza o placar
        score.empate++;
        updateScoreDisplay();
        return;
    }

    // Continua o jogo - troca de jogador
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusDisplay.textContent = messages.turn(currentPlayer);
    
    // Se for vez do computador, faz a jogada
    if (vsComputer && currentPlayer === computerPlayer) {
        computerMove();
    }
}

// Reinicia o jogo
function restartGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;

    // Limpa o status
    statusDisplay.textContent = messages.turn(currentPlayer);
    statusDisplay.classList.remove('winner', 'draw');

    // Limpa as células
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o', 'winner-cell');
    });
}

// Inicia o jogo quando a página carrega
initGame();
