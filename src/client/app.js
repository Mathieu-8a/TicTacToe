// const socket = new WebSocket(`ws://${window.location.host}`);
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const socket = new WebSocket(`${protocol}://${window.location.host}`);

let myRole = null;
let currentTurn = 'X';
let gameActive = false;

const lobby = document.getElementById('lobby');
const waiting = document.getElementById('waiting');
const game = document.getElementById('game');
const myCodeEl = document.getElementById('my-code');
const joinCodeInput = document.getElementById('join-code');
const joinBtn = document.getElementById('join-btn');
const mySymbolEl = document.getElementById('my-symbol');
const currentTurnEl = document.getElementById('current-turn');
const cells = document.querySelectorAll('.cell');
const gameMessage = document.getElementById('game-message');
const rematchBtn = document.getElementById('rematch-btn');

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'init':
            myCodeEl.textContent = data.code;
            break;
        
        case 'game_start':
            myRole = data.role;
            currentTurn = data.turn;
            mySymbolEl.textContent = myRole;
            mySymbolEl.className = `badge ${myRole.toLowerCase()}`;
            updateTurnDisplay();
            showState('game');
            gameActive = true;
            break;

        case 'game_update':
            updateBoard(data.board);
            currentTurn = data.currentTurn;
            updateTurnDisplay();
            
            if (data.winner) {
                gameActive = false;
                if (data.winner === 'draw') {
                    gameMessage.textContent = "Match nul !";
                } else {
                    gameMessage.textContent = data.winner === myRole ? "Vous avez gagné !" : "Vous avez perdu !";
                    highlightWinningCells(data.winningCells);
                }
                rematchBtn.classList.remove('hidden');
            }
            break;

        case 'opponent_wants_rematch':
            gameMessage.textContent = "L'adversaire veut rejouer...";
            break;

        case 'rematch_accepted':
            resetGame(data.board);
            break;

        case 'opponent_disconnected':
            gameMessage.textContent = "Adversaire déconnecté.";
            gameActive = false;
            break;

        case 'error':
            alert(data.message);
            break;
    }
};

function showState(state) {
    [lobby, waiting, game].forEach(el => el.classList.add('hidden'));
    document.getElementById(state).classList.remove('hidden');
}

function updateTurnDisplay() {
    currentTurnEl.textContent = currentTurn;
    currentTurnEl.className = `badge ${currentTurn.toLowerCase()}${currentTurn === myRole ? ' current' : ''}`;
}

function updateBoard(board) {
    cells.forEach((cell, i) => {
        cell.textContent = board[i] || '';
        // Correction ici : on vide les classes avant de remettre 'cell' et la classe du symbole
        cell.className = 'cell'; 
        if (board[i]) {
            cell.classList.add(board[i].toLowerCase());
        }
    });
}

function highlightWinningCells(winningCells) {
    winningCells.forEach(index => {
        cells[index].classList.add('winning');
    });
}

function resetGame(board) {
    updateBoard(board);
    gameMessage.textContent = "";
    rematchBtn.classList.add('hidden');
    gameActive = true;
    currentTurn = 'X';
    currentTurnEl.textContent = currentTurn;
}

joinBtn.onclick = () => {
    const code = joinCodeInput.value.trim();
    if (code.length === 6) {
        socket.send(JSON.stringify({ type: 'join', code }));
        showState('waiting');
    }
};

cells.forEach(cell => {
    cell.onclick = () => {
        if (!gameActive || currentTurn !== myRole || cell.textContent !== '') return;
        const index = cell.getAttribute('data-index');
        socket.send(JSON.stringify({ type: 'move', cell: parseInt(index) }));
    };
});

rematchBtn.onclick = () => {
    socket.send(JSON.stringify({ type: 'rematch_request' }));
    rematchBtn.classList.add('hidden');
    gameMessage.textContent = "En attente de l'adversaire...";
};
