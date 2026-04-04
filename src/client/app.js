// const socket = new WebSocket(`ws://${window.location.host}`);
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const socket = new WebSocket(`${protocol}://${window.location.host}`);

let myRole = null;
let myRoleImage = null;
let currentTurn = 'X';
let gameActive = false;
let boardImages = Array(9).fill(null);

// ... (gabyImages and whamImages remain the same)

function getRandomImage(role) {
    const images = role === 'O' ? gabyImages : whamImages;
    const folder = role === 'O' ? 'Faces_Gaby' : 'Faces_Wham';
    const randomImg = images[Math.floor(Math.random() * images.length)];
    return `assets/images/${folder}/${randomImg}`;
}

// ... (lobby, waiting, game definitions)

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

// ... (other cases)

function updateSymbolDisplay(el, role) {
    const imgPath = (role === myRole && myRoleImage) ? myRoleImage : getRandomImage(role);
    el.innerHTML = `<img src="${imgPath}" alt="${role}" class="badge-img">`;
    el.className = `badge ${role.toLowerCase()}`;
}

function updateTurnDisplay() {
    // L'image du tour peut changer, c'est dynamique
    const imgPath = getRandomImage(currentTurn);
    currentTurnEl.innerHTML = `<img src="${imgPath}" alt="${currentTurn}" class="badge-img">`;
    currentTurnEl.className = `badge ${currentTurn.toLowerCase()}${currentTurn === myRole ? ' current' : ''}`;
}

// ... (updateBoard remains the same)

// ... (highlightWinningCells remains the same)

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
    const code = joinCodeInput.value.trim();
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
