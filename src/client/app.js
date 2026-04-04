const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const socket = new WebSocket(`${protocol}://${window.location.host}`);

let myRole = null;
let myRoleImage = null;
let currentTurn = 'X';
let gameActive = false;
let boardImages = Array(9).fill(null);

const gabyImages = [
    'Gaby_1.png', 'Gaby_2.png', 'Gaby_3.png', 'Gaby_4.png', 'Gaby_5.png',
    'Gaby_6.png', 'Gaby_7.png', 'Gaby_8.png', 'Gaby_9.png'
];

const whamImages = [
    'Wham_Crying Face.png', 'Wham_Face Holding Back Tears.png', 'Wham_Face with Tears of Joy.png',
    'Wham_Loudly Crying Face.png', 'Wham_Pensive Face.png', 'Wham_Pouting Face.png',
    'Wham_Rolling on the Floor Laughing.png', 'Wham_Smiling Face with Heart-Eyes.png',
    'Wham_Smiling Face with Smiling Eyes.png'
];

function getRandomImage(role) {
    const images = role === 'O' ? gabyImages : whamImages;
    const folder = role === 'O' ? 'Faces_Gaby' : 'Faces_Wham';
    const randomImg = images[Math.floor(Math.random() * images.length)];
    return `assets/images/${folder}/${randomImg}`;
}

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
            myRoleImage = getRandomImage(myRole);
            currentTurn = data.turn;
            updateSymbolDisplay(mySymbolEl, myRole);
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

function updateSymbolDisplay(el, role) {
    const imgPath = (role === myRole && myRoleImage) ? myRoleImage : getRandomImage(role);
    el.innerHTML = `<img src="${imgPath}" alt="${role}" class="badge-img">`;
    el.className = `badge ${role.toLowerCase()}`;
}

function updateTurnDisplay() {
    const imgPath = getRandomImage(currentTurn);
    currentTurnEl.innerHTML = `<img src="${imgPath}" alt="${currentTurn}" class="badge-img">`;
    currentTurnEl.className = `badge ${currentTurn.toLowerCase()}${currentTurn === myRole ? ' current' : ''}`;
}

function updateBoard(board) {
    cells.forEach((cell, i) => {
        const symbol = board[i];
        if (symbol && !boardImages[i]) {
            boardImages[i] = getRandomImage(symbol);
        } else if (!symbol) {
            boardImages[i] = null;
        }

        cell.innerHTML = boardImages[i] ? `<img src="${boardImages[i]}" class="cell-img">` : '';
        cell.className = 'cell'; 
        if (symbol) {
            cell.classList.add(symbol.toLowerCase());
        }
    });
}

function highlightWinningCells(winningCells) {
    winningCells.forEach(index => {
        cells[index].classList.add('winning');
    });
}

function resetGame(board) {
    boardImages = Array(9).fill(null);
    updateBoard(board);
    gameMessage.textContent = "";
    rematchBtn.classList.add('hidden');
    gameActive = true;
    currentTurn = 'X';
    updateTurnDisplay();
}

joinBtn.onclick = () => {
    const code = joinCodeInput.value.trim().toUpperCase();
    if (code.length === 6) {
        socket.send(JSON.stringify({ type: 'join', code }));
        showState('waiting');
    }
};

cells.forEach(cell => {
    cell.onclick = () => {
        if (!gameActive || currentTurn !== myRole || cell.innerHTML !== '') return;
        const index = cell.getAttribute('data-index');
        socket.send(JSON.stringify({ type: 'move', cell: parseInt(index) }));
    };
});

rematchBtn.onclick = () => {
    socket.send(JSON.stringify({ type: 'rematch_request' }));
    rematchBtn.classList.add('hidden');
    gameMessage.textContent = "En attente de l'adversaire...";
};
