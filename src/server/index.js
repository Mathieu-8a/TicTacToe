const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Game State Management
const games = new Map(); // code -> { players: [ws1, ws2], board: Array(9), turn: 0, winner: null, started: false, timeouts: [] }

// Helper: Generate a unique 6-character code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return games.has(code) ? generateCode() : code;
}

// Helper: Check for winner
function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diags
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], cells: line };
    }
  }
  return board.includes(null) ? null : { winner: 'draw' };
}

// AI logic: Minimax
function getBestMove(board, aiSymbol) {
  const playerSymbol = aiSymbol === 'X' ? 'O' : 'X';

  function minimax(currentBoard, depth, isMaximizing) {
    const result = checkWinner(currentBoard);
    if (result) {
      if (result.winner === aiSymbol) return 10 - depth;
      if (result.winner === playerSymbol) return depth - 10;
      if (result.winner === 'draw') return 0;
    }

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === null) {
          currentBoard[i] = aiSymbol;
          let score = minimax(currentBoard, depth + 1, false);
          currentBoard[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === null) {
          currentBoard[i] = playerSymbol;
          let score = minimax(currentBoard, depth + 1, true);
          currentBoard[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }

  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = aiSymbol;
      let score = minimax(board, 0, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

wss.on('connection', (ws) => {
  let playerCode = generateCode();
  games.set(playerCode, { 
    players: [ws], 
    board: Array(9).fill(null), 
    turn: 0, 
    winner: null, 
    started: false,
    rematchRequests: new Set()
  });
  ws.gameCode = playerCode;
  ws.role = 'X'; // Creator is X

  ws.send(JSON.stringify({ type: 'init', code: playerCode }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const game = games.get(ws.gameCode);

    if (data.type === 'start_solo') {
      const game = games.get(ws.gameCode);
      if (game && !game.started) {
        game.isSolo = true;
        game.started = true;
        ws.send(JSON.stringify({ 
          type: 'game_start', 
          role: ws.role,
          turn: 'X' 
        }));
      }
    }

    if (data.type === 'start_local') {
      const game = games.get(ws.gameCode);
      if (game && !game.started) {
        game.isLocal = true;
        game.started = true;
        ws.send(JSON.stringify({ 
          type: 'game_start', 
          role: 'X', // Local player is both, but we show X as primary
          isLocal: true,
          turn: 'X' 
        }));
      }
    }

    if (data.type === 'leave_game') {
      const oldGame = games.get(ws.gameCode);
      if (oldGame) {
        oldGame.players = oldGame.players.filter(p => p !== ws);
        if (oldGame.players.length > 0) {
          oldGame.players[0].send(JSON.stringify({ type: 'opponent_disconnected' }));
        } else {
          games.delete(ws.gameCode);
        }
      }
      
      // Assign new code for the lobby
      let newCode = generateCode();
      games.set(newCode, { 
        players: [ws], 
        board: Array(9).fill(null), 
        turn: 0, 
        winner: null, 
        started: false,
        rematchRequests: new Set()
      });
      ws.gameCode = newCode;
      ws.role = 'X';
      ws.send(JSON.stringify({ type: 'init', code: newCode }));
    }

    if (data.type === 'join') {
      const targetCode = data.code.toUpperCase();
      const targetGame = games.get(targetCode);

      if (targetGame && targetGame.players.length === 1) {
        // Clean up current individual session
        games.delete(ws.gameCode);
        
        // Join new game
        ws.gameCode = targetCode;
        ws.role = 'O'; // Joiner is O
        targetGame.players.push(ws);
        targetGame.started = true;
        
        targetGame.players.forEach(p => {
          p.send(JSON.stringify({ 
            type: 'game_start', 
            role: p.role,
            turn: 'X' 
          }));
        });
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Code invalide ou partie pleine' }));
      }
    }

    if (data.type === 'move' && game && game.started && !game.winner) {
      const currentSymbol = game.turn % 2 === 0 ? 'X' : 'O';
      // In local mode, we allow the single player to move for both X and O
      const canMove = game.isLocal || ws.role === currentSymbol;

      if (canMove && game.board[data.cell] === null) {
        // In local mode, we temporarily set the role to the current symbol for the board update
        const symbolToPlace = game.isLocal ? currentSymbol : ws.role;
        game.board[data.cell] = symbolToPlace;
        game.turn++;
        
        let result = checkWinner(game.board);
        if (result) {
          game.winner = result.winner;
          game.winningCells = result.cells;
        }

        const sendUpdate = () => {
          const payload = {
            type: 'game_update',
            board: game.board,
            currentTurn: game.turn % 2 === 0 ? 'X' : 'O',
            winner: game.winner,
            winningCells: game.winningCells
          };
          game.players.forEach(p => p.send(JSON.stringify(payload)));
        };

        sendUpdate();

        // Trigger AI move if Solo and game not finished
        if (game.isSolo && !game.winner) {
          setTimeout(() => {
            const aiSymbol = ws.role === 'X' ? 'O' : 'X';
            const aiMove = getBestMove(game.board, aiSymbol);
            if (aiMove !== -1) {
              game.board[aiMove] = aiSymbol;
              game.turn++;
              result = checkWinner(game.board);
              if (result) {
                game.winner = result.winner;
                game.winningCells = result.cells;
              }
              sendUpdate();
            }
          }, 500); // Small delay for better UX
        }
      }
    }

    if (data.type === 'rematch_request' && game && game.winner) {
      if (game.isSolo || game.isLocal) {
        game.board = Array(9).fill(null);
        game.turn = 0;
        game.winner = null;
        game.winningCells = null;
        ws.send(JSON.stringify({ 
          type: 'rematch_accepted',
          board: game.board
        }));
      } else {
        game.rematchRequests.add(ws.role);
        if (game.rematchRequests.size === 2) {
          game.board = Array(9).fill(null);
          game.turn = 0;
          game.winner = null;
          game.winningCells = null;
          game.rematchRequests.clear();
          
          game.players.forEach(p => p.send(JSON.stringify({ 
            type: 'rematch_accepted',
            board: game.board
          })));
        } else {
          game.players.find(p => p !== ws).send(JSON.stringify({ type: 'opponent_wants_rematch' }));
        }
      }
    }
  });

  ws.on('close', () => {
    const game = games.get(ws.gameCode);
    if (game) {
      game.players = game.players.filter(p => p !== ws);
      if (game.players.length === 0) {
        games.delete(ws.gameCode);
      } else {
        game.players[0].send(JSON.stringify({ type: 'opponent_disconnected' }));
        // In a real app, add 30s timeout here as per PRD
        setTimeout(() => {
          if (games.has(ws.gameCode) && games.get(ws.gameCode).players.length < 2) {
            games.delete(ws.gameCode);
          }
        }, 30000);
      }
    }
  });
});

app.use(express.static(path.join(__dirname, '../client')));

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
