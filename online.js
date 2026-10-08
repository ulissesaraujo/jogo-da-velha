// ==========================================
// MULTIPLAYER ONLINE - FIREBASE
// ==========================================

let currentRoomId = null;
let myPlayer = null; // 'X' ou 'O'
let roomRef = null;
let gameRef = null;
let lastProcessedBoard = null; // Evita processar o mesmo estado duas vezes

// Elementos do DOM - Lobby
const backToMenuBtn = document.getElementById('backToMenuBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomsList = document.getElementById('roomsList');

// Listener das salas disponíveis
let roomsListenerRef = null;

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
    backToMenuBtn.addEventListener('click', () => {
        stopListeningToRooms();
        showScreen(menuScreen);
    });
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
    
    // Quando entrar no lobby, começa a listar salas
    const originalShowScreen = showScreen;
    window.showScreen = function(screen) {
        originalShowScreen(screen);
        if (screen === lobbyScreen) {
            startListeningToRooms();
        } else {
            stopListeningToRooms();
        }
    };
}

// ==========================================
// LISTAR SALAS DISPONÍVEIS
// ==========================================
function startListeningToRooms() {
    roomsListenerRef = database.ref('rooms');
    
    roomsListenerRef.on('value', snapshot => {
        const rooms = snapshot.val();
        renderRoomsList(rooms);
    });
}

function stopListeningToRooms() {
    if (roomsListenerRef) {
        roomsListenerRef.off();
        roomsListenerRef = null;
    }
}

function renderRoomsList(rooms) {
    if (!rooms) {
        roomsList.innerHTML = '<div class="no-rooms">Nenhuma sala disponível. Crie uma!</div>';
        return;
    }
    
    // Filtra apenas salas aguardando jogador
    const availableRooms = Object.entries(rooms).filter(([id, room]) => {
        return room.players && room.players.X && !room.players.O && room.game?.status === 'waiting';
    });
    
    if (availableRooms.length === 0) {
        roomsList.innerHTML = '<div class="no-rooms">Nenhuma sala disponível. Crie uma!</div>';
        return;
    }
    
    roomsList.innerHTML = availableRooms.map(([roomId, room]) => `
        <div class="room-item" onclick="joinRoom('${roomId}')">
            <span class="room-code">${roomId}</span>
            <span class="room-status">Aguardando</span>
        </div>
    `).join('');
}

// ==========================================
// CRIAR SALA
// ==========================================
function createRoom() {
    const roomId = generateRoomCode();
    currentRoomId = roomId;
    myPlayer = 'X';
    
    // Reseta o placar para nova sala
    resetScore();
    
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
            
            // Reseta o placar para nova sala
            resetScore();
            
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
    lastProcessedBoard = null; // Reset ao iniciar jogo
    
    // Esconde botões de modo local
    modeBtn.style.display = 'none';
    difficultyBtn.style.display = 'none';
    
    // Mostra indicadores online
    onlineBadge.style.display = 'inline-block';
    playerIndicator.style.display = 'inline-block';
    playerIndicator.textContent = `Você é: ${myPlayer}`;
    playerIndicator.className = `player-indicator ${myPlayer.toLowerCase()}`;
    
    showScreen(gameScreen);
    
    // Só chama listenToRoom se ainda não estiver ouvindo (jogador O)
    if (!roomRef) {
        listenToRoom();
    }
    
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
    const boardKey = newBoard.join(',');
    
    // Detecta se o jogo foi reiniciado (tabuleiro vazio e era diferente antes)
    const isReset = boardKey === ',,,,,,,,' && lastProcessedBoard && lastProcessedBoard !== ',,,,,,,,';
    
    // Evita processar o mesmo estado duas vezes (exceto reset)
    if (boardKey === lastProcessedBoard && !isReset) {
        return;
    }
    lastProcessedBoard = boardKey;
    
    // Se foi reiniciado, limpa o tabuleiro visual
    if (isReset) {
        cells.forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('taken', 'x', 'o', 'winner-cell');
        });
        board = ['', '', '', '', '', '', '', '', ''];
        currentPlayer = 'X';
        gameActive = true;
        statusDisplay.classList.remove('winner', 'draw', 'your-turn', 'waiting-turn');
        updateOnlineStatus();
        return;
    }
    
    // Atualiza o tabuleiro visual
    newBoard.forEach((value, index) => {
        const cell = cells[index];
        if (value && !cell.classList.contains('taken')) {
            cell.textContent = value;
            cell.classList.add('taken', value.toLowerCase());
        }
    });
    
    board = [...newBoard];
    currentPlayer = newCurrentPlayer;
    
    // Verifica resultado
    const result = checkWinner(board);
    
    if (result) {
        if (gameActive) { // Só processa se o jogo ainda estava ativo
            statusDisplay.textContent = messages.winner(result.winner);
            statusDisplay.classList.add('winner');
            gameActive = false;
            
            result.cells.forEach(index => {
                cells[index].classList.add('winner-cell');
            });
            
            // Atualiza placar
            score[result.winner.toLowerCase()]++;
            updateScoreDisplay();
        }
    } else if (!board.includes('')) {
        if (gameActive) { // Só processa se o jogo ainda estava ativo
            statusDisplay.textContent = messages.draw();
            statusDisplay.classList.add('draw');
            gameActive = false;
            
            score.empate++;
            updateScoreDisplay();
        }
    } else {
        gameActive = true;
        updateOnlineStatus();
    }
}

// ==========================================
// ENVIAR JOGADA
// ==========================================
function sendMove(index) {
    if (!currentRoomId || !gameActive) return;
    
    const newBoard = [...board];
    newBoard[index] = myPlayer;
    
    // Atualiza o lastProcessedBoard para evitar que o callback do Firebase processe de novo
    lastProcessedBoard = newBoard.join(',');
    
    // Aplica a jogada localmente
    applyMove(index, myPlayer);
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
        
        // Atualiza placar local
        score[result.winner.toLowerCase()]++;
        updateScoreDisplay();
    } else if (!board.includes('')) {
        statusDisplay.textContent = messages.draw();
        statusDisplay.classList.add('draw');
        gameActive = false;
        
        score.empate++;
        updateScoreDisplay();
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
        lastProcessedBoard = null; // Reset para permitir processar novo jogo
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
    lastProcessedBoard = null;
    
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
