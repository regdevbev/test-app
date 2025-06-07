const gameState = {
  board: [],
  currentPlayer: 'red',
  selected: null, // {row,col}
  validMoves: [],
  isGameOver: false
};

const BOARD_SIZE = 8;

function setupBoard() {
  gameState.board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowArr = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      let piece = null;
      if (row < 3 && (row + col) % 2 === 1) {
        piece = { player: 'black', isKing: false };
      } else if (row > 4 && (row + col) % 2 === 1) {
        piece = { player: 'red', isKing: false };
      }
      rowArr.push(piece);
    }
    gameState.board.push(rowArr);
  }
  gameState.currentPlayer = 'red';
  gameState.selected = null;
  gameState.validMoves = [];
  gameState.isGameOver = false;
}

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
      square.dataset.row = row;
      square.dataset.col = col;
      if (gameState.validMoves.some(m => m.row === row && m.col === col)) {
        square.classList.add('highlight');
      }
      const piece = gameState.board[row][col];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('piece');
        pieceEl.classList.add(piece.player === 'red' ? 'red-piece' : 'black-piece');
        if (piece.isKing) pieceEl.classList.add('king');
        square.appendChild(pieceEl);
      }
      boardEl.appendChild(square);
    }
  }
  const status = document.getElementById('status-panel');
  if (gameState.isGameOver) {
    status.textContent = `${gameState.currentPlayer === 'red' ? 'Black' : 'Red'} Wins!`;
  } else {
    status.textContent = `${capitalize(gameState.currentPlayer)}'s Turn`;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getPiece(row, col) {
  if (!inBounds(row, col)) return null;
  return gameState.board[row][col];
}

function calculateMovesForPiece(row, col, mustJumpOnly = false) {
  const piece = getPiece(row, col);
  if (!piece || piece.player !== gameState.currentPlayer) return [];
  const directions = [];
  if (piece.player === 'red' || piece.isKing) directions.push([-1, -1], [-1, 1]);
  if (piece.player === 'black' || piece.isKing) directions.push([1, -1], [1, 1]);
  const moves = [];
  for (const [dr, dc] of directions) {
    const r1 = row + dr;
    const c1 = col + dc;
    const r2 = row + dr * 2;
    const c2 = col + dc * 2;
    if (inBounds(r1, c1) && !getPiece(r1, c1) && !mustJumpOnly) {
      moves.push({ row: r1, col: c1, jump: false });
    }
    if (inBounds(r2, c2) && getPiece(r1, c1) && getPiece(r1, c1).player !== piece.player && !getPiece(r2, c2)) {
      moves.push({ row: r2, col: c2, jump: true, capRow: r1, capCol: c1 });
    }
  }
  return moves;
}

function findAllJumpMoves() {
  const jumps = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = getPiece(r, c);
      if (piece && piece.player === gameState.currentPlayer) {
        const ms = calculateMovesForPiece(r, c, true).filter(m => m.jump);
        if (ms.length) jumps.push({ row: r, col: c, moves: ms });
      }
    }
  }
  return jumps;
}

function handleSquareClick(e) {
  if (gameState.isGameOver) return;
  const square = e.target.closest('.square');
  if (!square) return;
  const row = parseInt(square.dataset.row);
  const col = parseInt(square.dataset.col);
  if (isNaN(row) || isNaN(col)) return;

  // if clicking on own piece
  const piece = getPiece(row, col);
  if (piece && piece.player === gameState.currentPlayer) {
    const jumps = findAllJumpMoves();
    if (jumps.length) {
      const jumpData = jumps.find(j => j.row === row && j.col === col);
      gameState.selected = { row, col };
      gameState.validMoves = jumpData ? jumpData.moves : [];
    } else {
      gameState.selected = { row, col };
      gameState.validMoves = calculateMovesForPiece(row, col);
    }
    renderBoard();
    return;
  }

  // if selecting a valid move
  if (gameState.selected) {
    const move = gameState.validMoves.find(m => m.row === row && m.col === col);
    if (move) {
      movePiece(gameState.selected.row, gameState.selected.col, move);
    }
  }
}

function movePiece(fromRow, fromCol, move) {
  const piece = getPiece(fromRow, fromCol);
  gameState.board[fromRow][fromCol] = null;
  gameState.board[move.row][move.col] = piece;
  if (move.jump) {
    gameState.board[move.capRow][move.capCol] = null;
  }
  // kinging
  if ((piece.player === 'red' && move.row === 0) || (piece.player === 'black' && move.row === BOARD_SIZE - 1)) {
    piece.isKing = true;
  }

  // multi-jump
  gameState.selected = { row: move.row, col: move.col };
  const furtherJumps = calculateMovesForPiece(move.row, move.col, true).filter(m => m.jump);
  if (move.jump && furtherJumps.length) {
    gameState.validMoves = furtherJumps;
    renderBoard();
    return; // same player's turn
  }

  // switch turn
  gameState.selected = null;
  gameState.validMoves = [];
  gameState.currentPlayer = gameState.currentPlayer === 'red' ? 'black' : 'red';

  checkForWin();
  renderBoard();
}

function checkForWin() {
  let redPieces = 0;
  let blackPieces = 0;
  let redMoves = 0;
  let blackMoves = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = getPiece(r, c);
      if (piece) {
        const moves = calculateMovesForPiece(r, c);
        if (piece.player === 'red') {
          redPieces++;
          redMoves += moves.length;
        } else {
          blackPieces++;
          blackMoves += moves.length;
        }
      }
    }
  }
  if (redPieces === 0 || redMoves === 0) {
    gameState.isGameOver = true;
    gameState.currentPlayer = 'red'; // winner is black
  }
  if (blackPieces === 0 || blackMoves === 0) {
    gameState.isGameOver = true;
    gameState.currentPlayer = 'black'; // winner is red
  }
}

document.getElementById('board').addEventListener('click', handleSquareClick);
document.getElementById('reset-button').addEventListener('click', () => {
  setupBoard();
  renderBoard();
});

setupBoard();
renderBoard();
