// ==========================================
// MULTIPLAYER ONLINE - FIREBASE
// ==========================================

let currentRoomId = null;
let myPlayer = null; // 'X' ou 'O'
let roomRef = null;
let gameRef = null;

// Elementos do DOM - Lobby
const backToMenuBtn = document.getElementById('backToMenuBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');

// Elementos do DOM - Waiting
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');

// Elementos do DOM - Game
const playerIndicator = document.getElementById('playerIndicator');
const onlineBadge = document.getElementById('onlineBadge');

// ==========================================
// INICIALIZAÇÃO
// ==========================================
function initOnline() {
    backToMenuBtn.addEventListener('click', () => showScreen(menuScreen));
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', () => joinRoom(roomCodeInput.value.toUpperCase()));
    leaveRoomBtn.addEventListener('click', leaveRoom);
    copyCodeBtn.addEventListener('click', copyRoomCode);
    
    // Enter para entrar na sala
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoom(roomCodeInput.value.toUpperCase());
        }
    });
    
    // Formata input para maiúsculas
    roomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
}

// ==========================================
// CRIAR SALA
// ==========================================
function createRoom() {
    const roomId = generateRoomCode();
    currentRoomId = roomId;
    myPlayer = 'X';
    
    const roomData = {
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        players: {
            X: true,
            O: false
        },
        game: {
            board: ['', '', '', '', '', '', '', '', ''],
            currentPlayer: 'X',
            status: 'waiting' // waiting, playing, finished
        }
    };
    
    database.ref(`rooms/${roomId}`).set(roomData)
        .then(() => {
            roomCodeDisplay.textContent = roomId;
            showScreen(waitingScreen);
            listenToRoom();
        })
        .catch(error => {
            console.error('Erro ao criar sala:', error);
            alert('Erro ao criar sala. Tente novamente.');
        });
}

// ==========================================
// ENTRAR NA SALA
// ==========================================
function joinRoom(roomId) {
    if (!roomId || roomId.length !== 6) {
        alert('Digite um código de sala válido (6 caracteres)');
        return;
    }
    
    const roomRef = database.ref(`rooms/${roomId}`);
    
    roomRef.once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert('Sala não encontrada!');
                return;
            }
            
            const room = snapshot.val();
            
            if (room.players.O) {
                alert('Sala cheia!');
                return;
            }
            
            // Entra como jogador O
            currentRoomId = roomId;
            myPlayer = 'O';
            
            return roomRef.update({
                'players/O': true,
                'game/status': 'playing'
            });
        })
        .then(() => {
            if (currentRoomId) {
                startOnlineGame();
            }
        })
        .catch(error => {
            console.error('Erro ao entrar na sala:', error);
            alert('Erro ao entrar na sala. Tente novamente.');
        });
}

// ==========================================
// OUVIR MUDANÇAS NA SALA
// ==========================================
function listenToRoom() {
    if (!currentRoomId) return;
    
    roomRef = database.ref(`rooms/${currentRoomId}`);
    
    roomRef.on('value', snapshot => {
        if (!snapshot.exists()) {
            // Sala foi deletada
            alert('A sala foi encerrada.');
            leaveRoom();
            return;
        }
        
        const room = snapshot.val();
        
        // Verifica se o outro jogador entrou
        if (room.players.X && room.players.O && room.game.status === 'playing') {
            if (waitingScreen.classList.contains('hidden') === false) {
                startOnlineGame();
            }
            
            // Atualiza o estado do jogo
            updateGameFromFirebase(room.game);
        }
    });
}

// ==========================================
// INICIAR JOGO ONLINE
// ==========================================
function startOnlineGame() {
    isOnlineGame = true;
    vsComputer = false;
    
    // Esconde botões de modo local
    modeBtn.style.display = 'none';
    difficultyBtn.style.display = 'none';
    
    // Mostra indicadores online
    onlineBadge.style.display = 'inline-block';
    playerIndicator.style.display = 'inline-block';
    playerIndicator.textContent = `Você é: ${myPlayer}`;
    playerIndicator.className = `player-indicator ${myPlayer.toLowerCase()}`;
    
    showScreen(gameScreen);
    listenToRoom();
    
    // Inicializa o jogo
    restartGame();
    updateOnlineStatus();
}

// ==========================================
// ATUALIZAR JOGO DO FIREBASE
// ==========================================
function updateGameFromFirebase(gameState) {
    if (!gameState) return;
    
    const newBoard = gameState.board || ['', '', '', '', '', '', '', '', ''];
    const newCurrentPlayer = gameState.currentPlayer || 'X';
    
    // Verifica se houve mudança no tabuleiro
    let boardChanged = false;
    newBoard.forEach((value, index) => {
        if (value !== board[index]) {
            boardChanged = true;
            if (value) {
                applyMove(index, value);
            }
        }
    });
    
    board = [...newBoard];
    currentPlayer = newCurrentPlayer;
    
    // Só verifica resultado se houve mudança no tabuleiro
    if (boardChanged) {
        const result = checkWinner(board);
        
        if (result) {
            statusDisplay.textContent = messages.winner(result.winner);
            statusDisplay.classList.add('winner');
            gameActive = false;
            
            result.cells.forEach(index => {
                cells[index].classList.add('winner-cell');
            });
            
            // Atualiza placar apenas se a jogada foi do OUTRO jogador
            // (evita contar duas vezes)
            if (result.winner !== myPlayer) {
                score[result.winner.toLowerCase()]++;
                updateScoreDisplay();
            }
        } else if (!board.includes('')) {
            statusDisplay.textContent = messages.draw();
            statusDisplay.classList.add('draw');
            gameActive = false;
            
            // Apenas um jogador (X) incrementa o empate para evitar duplicação
            if (myPlayer === 'X') {
                score.empate++;
                updateScoreDisplay();
            }
        } else {
            gameActive = true;
            updateOnlineStatus();
        }
    } else {
        // Apenas atualiza o status se não houve mudança no tabuleiro
        if (gameActive) {
            updateOnlineStatus();
        }
    }
}

// ==========================================
// ENVIAR JOGADA
// ==========================================
function sendMove(index) {
    if (!currentRoomId || !gameActive) return;
    
    // Aplica a jogada localmente primeiro
    applyMove(index, myPlayer);
    
    const newBoard = [...board];
    newBoard[index] = myPlayer;
    board = newBoard;
    
    const nextPlayer = myPlayer === 'X' ? 'O' : 'X';
    
    // Verifica se ganhou
    const result = checkWinner(board);
    if (result) {
        statusDisplay.textContent = messages.winner(result.winner);
        statusDisplay.classList.add('winner');
        gameActive = false;
        
        result.cells.forEach(idx => {
            cells[idx].classList.add('winner-cell');
        });
        
        // Atualiza placar local (só quem fez a jogada vencedora)
        score[result.winner.toLowerCase()]++;
        updateScoreDisplay();
    } else if (!board.includes('')) {
        statusDisplay.textContent = messages.draw();
        statusDisplay.classList.add('draw');
        gameActive = false;
        
        // Jogador O incrementa empate (X incrementa no updateGameFromFirebase)
        if (myPlayer === 'O') {
            score.empate++;
            updateScoreDisplay();
        }
    } else {
        currentPlayer = nextPlayer;
        updateOnlineStatus();
    }
    
    // Envia para o Firebase
    database.ref(`rooms/${currentRoomId}/game`).update({
        board: newBoard,
        currentPlayer: nextPlayer
    }).catch(error => {
        console.error('Erro ao enviar jogada:', error);
    });
}

// ==========================================
// REINICIAR JOGO ONLINE
// ==========================================
restartBtn.addEventListener('click', () => {
    if (isOnlineGame && currentRoomId) {
        database.ref(`rooms/${currentRoomId}/game`).update({
            board: ['', '', '', '', '', '', '', '', ''],
            currentPlayer: 'X',
            status: 'playing'
        });
    }
});

// ==========================================
// SAIR DA SALA
// ==========================================
function leaveRoom() {
    if (roomRef) {
        roomRef.off();
    }
    
    if (currentRoomId) {
        // Remove a sala ou marca jogador como ausente
        if (myPlayer === 'X') {
            // Criador sai - deleta a sala
            database.ref(`rooms/${currentRoomId}`).remove();
        } else {
            // Jogador O sai
            database.ref(`rooms/${currentRoomId}/players/O`).set(false);
            database.ref(`rooms/${currentRoomId}/game/status`).set('waiting');
        }
    }
    
    currentRoomId = null;
    myPlayer = null;
    roomRef = null;
    isOnlineGame = false;
    
    roomCodeInput.value = '';
    showScreen(menuScreen);
}

// ==========================================
// UTILITÁRIOS
// ==========================================
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function copyRoomCode() {
    navigator.clipboard.writeText(currentRoomId)
        .then(() => {
            copyCodeBtn.textContent = '✓ Copiado!';
            setTimeout(() => {
                copyCodeBtn.textContent = '📋 Copiar';
            }, 2000);
        })
        .catch(() => {
            // Fallback para navegadores antigos
            const textArea = document.createElement('textarea');
            textArea.value = currentRoomId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            copyCodeBtn.textContent = '✓ Copiado!';
            setTimeout(() => {
                copyCodeBtn.textContent = '📋 Copiar';
            }, 2000);
        });
}

// Inicializa o módulo online
initOnline();
