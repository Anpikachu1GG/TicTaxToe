const BOARD_SIZE = 20;
const WIN_LENGTH = 5;
let scoreX = 0;
let scoreO = 0;
let difficulty = 'hard';

class Game {
    constructor() {
        this.board = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
        this.currentPlayer = 'X';
    }

    startGame() {
        this.board.fill(null);
        this.currentPlayer = 'X';
    }

    makeMove(index) {
        if (!this.board[index]) {
            this.board[index] = this.currentPlayer;
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            return true;
        }
        return false;
    }

    checkWinner() {
        return getWinCombo(this.board) ? this.board[getWinCombo(this.board)[0]] : null;
    }

    isBoardFull() {
        return this.board.every(cell => cell);
    }
}

class AI {
    makeMove(board) {
        const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);

        // 1. Ưu tiên thắng ngay nếu có thể
        for (const idx of empty) {
            board[idx] = 'O';
            if (getWinCombo(board)) {
                board[idx] = null;
                return idx;
            }
            board[idx] = null;
        }

        // 2. Ưu tiên chặn thắng của người chơi
        for (const idx of empty) {
            board[idx] = 'X';
            if (getWinCombo(board)) {
                board[idx] = null;
                return idx;
            }
            board[idx] = null;
        }

        // 3. Đánh giá công thủ toàn diện: 
        // - Ưu tiên nước đi giúp AI tạo chuỗi dài nhất và đồng thời chặn chuỗi dài nhất của người chơi.
        // - Ưu tiên nước đi mở (hai đầu đều trống) hơn nước bị chặn một đầu.
        let bestScore = -Infinity;
        let bestMoves = [];
        for (const idx of empty) {
            // Đánh thử cho AI
            board[idx] = 'O';
            const aiScore = this.evaluateComprehensive(board, idx, 'O');
            board[idx] = null;
            // Đánh thử cho người chơi
            board[idx] = 'X';
            const playerScore = this.evaluateComprehensive(board, idx, 'X');
            board[idx] = null;
            // Trọng số: công mạnh hơn thủ một chút
            const score = aiScore * 1.15 + playerScore;
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [idx];
            } else if (score === bestScore) {
                bestMoves.push(idx);
            }
        }
        if (bestMoves.length > 0 && bestScore > 0) {
            return bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }

        // 4. Tìm nước đi tạo ra nhiều hơn một hướng 4 hoặc 3 liên tiếp (bẫy chéo)
        let bestTrapScore = -1;
        let trapMoves = [];
        for (const idx of empty) {
            let trapScore = 0;
            for (let len = WIN_LENGTH - 2; len <= WIN_LENGTH - 1; len++) {
                trapScore += this.countPotentialLines(board, idx, 'O', len);
            }
            if (trapScore > bestTrapScore) {
                bestTrapScore = trapScore;
                trapMoves = [idx];
            } else if (trapScore === bestTrapScore && trapScore > 0) {
                trapMoves.push(idx);
            }
        }
        if (trapMoves.length > 0 && bestTrapScore > 0) {
            return trapMoves[Math.floor(Math.random() * trapMoves.length)];
        }

        // 5. Ưu tiên đánh gần nước X nhất
        const playerMoves = board
            .map((v, i) => v === 'X' ? i : null)
            .filter(i => i !== null);

        if (playerMoves.length > 0) {
            let candidate = [];
            for (const idx of playerMoves) {
                const x = idx % BOARD_SIZE;
                const y = Math.floor(idx / BOARD_SIZE);
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (
                            nx >= 0 && nx < BOARD_SIZE &&
                            ny >= 0 && ny < BOARD_SIZE
                        ) {
                            const nidx = ny * BOARD_SIZE + nx;
                            if (!board[nidx]) candidate.push(nidx);
                        }
                    }
                }
            }
            candidate = [...new Set(candidate)].filter(i => !board[i]);
            if (candidate.length > 0) {
                return candidate[Math.floor(Math.random() * candidate.length)];
            }
        }

        // 6. Nếu không có nước nào ưu tiên, random
        return empty[Math.floor(Math.random() * empty.length)];
    }

    evaluateComprehensive(board, idx, player) {
        // Đánh giá điểm công/thủ cho một nước đi: 
        // - Dài chuỗi càng lớn điểm càng cao
        // - Chuỗi mở (hai đầu trống) điểm cao hơn chuỗi bị chặn một đầu
        const directions = [
            {dx: 1, dy: 0},
            {dx: 0, dy: 1},
            {dx: 1, dy: 1},
            {dx: 1, dy: -1},
        ];
        let score = 0;
        const x = idx % BOARD_SIZE;
        const y = Math.floor(idx / BOARD_SIZE);
        for (const {dx, dy} of directions) {
            let count = 1;
            let block = 0;
            // Đếm về 1 phía
            for (let step = 1; step < WIN_LENGTH; step++) {
                const nx = x + dx * step;
                const ny = y + dy * step;
                if (
                    nx < 0 || nx >= BOARD_SIZE ||
                    ny < 0 || ny >= BOARD_SIZE
                ) {
                    block++;
                    break;
                }
                const nidx = ny * BOARD_SIZE + nx;
                if (board[nidx] === player) count++;
                else if (board[nidx]) {
                    block++;
                    break;
                } else break;
            }
            // Đếm về phía ngược lại
            for (let step = 1; step < WIN_LENGTH; step++) {
                const nx = x - dx * step;
                const ny = y - dy * step;
                if (
                    nx < 0 || nx >= BOARD_SIZE ||
                    ny < 0 || ny >= BOARD_SIZE
                ) {
                    block++;
                    break;
                }
                const nidx = ny * BOARD_SIZE + nx;
                if (board[nidx] === player) count++;
                else if (board[nidx]) {
                    block++;
                    break;
                } else break;
            }
            // Tính điểm: chuỗi càng dài càng nhiều điểm, chuỗi mở (block=0) điểm cao nhất
            if (count >= WIN_LENGTH) score += 10000;
            else if (count === WIN_LENGTH - 1 && block === 0) score += 5000;
            else if (count === WIN_LENGTH - 1 && block === 1) score += 1000;
            else if (count === WIN_LENGTH - 2 && block === 0) score += 500;
            else if (count === WIN_LENGTH - 2 && block === 1) score += 100;
            else if (count === WIN_LENGTH - 3 && block === 0) score += 50;
            else if (count === WIN_LENGTH - 3 && block === 1) score += 10;
            else if (count === 2 && block === 0) score += 5;
        }
        return score;
    }

    countPotentialLines(board, idx, player, length) {
        // Đếm số hướng mà nếu đánh vào idx sẽ tạo ra chuỗi 'length' liên tiếp cho player
        const directions = [
            {dx: 1, dy: 0},
            {dx: 0, dy: 1},
            {dx: 1, dy: 1},
            {dx: 1, dy: -1},
        ];
        let count = 0;
        const x = idx % BOARD_SIZE;
        const y = Math.floor(idx / BOARD_SIZE);
        for (const {dx, dy} of directions) {
            let total = 1;
            // Đếm về 1 phía
            for (let step = 1; step < length; step++) {
                const nx = x + dx * step;
                const ny = y + dy * step;
                if (
                    nx < 0 || nx >= BOARD_SIZE ||
                    ny < 0 || ny >= BOARD_SIZE
                ) break;
                const nidx = ny * BOARD_SIZE + nx;
                if (board[nidx] === player) total++;
                else break;
            }
            // Đếm về phía ngược lại
            for (let step = 1; step < length; step++) {
                const nx = x - dx * step;
                const ny = y - dy * step;
                if (
                    nx < 0 || nx >= BOARD_SIZE ||
                    ny < 0 || ny >= BOARD_SIZE
                ) break;
                const nidx = ny * BOARD_SIZE + nx;
                if (board[nidx] === player) total++;
                else break;
            }
            if (total >= length) count++;
        }
        return count;
    }
}

function updateBoard(board, winCombo, lastMoveIdx) {
    const cells = document.querySelectorAll('.cell');
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        cells[i].textContent = board[i] || '';
        cells[i].classList.remove('win-cell');
        cells[i].classList.remove('last-move');
        cells[i].classList.remove('x-move');
        cells[i].classList.remove('o-move');
        if (board[i] === 'X') {
            cells[i].classList.add('x-move');
        } else if (board[i] === 'O') {
            cells[i].classList.add('o-move');
        }
    }
    if (winCombo) {
        winCombo.forEach(idx => {
            cells[idx].classList.add('win-cell');
        });
    }
    if (typeof lastMoveIdx === 'number') {
        cells[lastMoveIdx].classList.add('last-move');
    }
}

function showMessage(msg) {
    document.getElementById('message').textContent = msg;
}

function updateScore() {
    document.getElementById('score-x').textContent = scoreX;
    document.getElementById('score-o').textContent = scoreO;
}

const game = new Game();
const ai = new AI();

function getWinCombo(board) {
    // Kiểm tra tất cả các hướng cho mỗi ô
    const directions = [
        {dx: 1, dy: 0},   // ngang
        {dx: 0, dy: 1},   // dọc
        {dx: 1, dy: 1},   // chéo xuôi
        {dx: 1, dy: -1},  // chéo ngược
    ];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const idx = y * BOARD_SIZE + x;
            const player = board[idx];
            if (!player) continue;
            for (const {dx, dy} of directions) {
                let win = true;
                let combo = [];
                for (let k = 0; k < WIN_LENGTH; k++) {
                    const nx = x + dx * k;
                    const ny = y + dy * k;
                    if (
                        nx < 0 || nx >= BOARD_SIZE ||
                        ny < 0 || ny >= BOARD_SIZE
                    ) {
                        win = false;
                        break;
                    }
                    const nidx = ny * BOARD_SIZE + nx;
                    if (board[nidx] !== player) {
                        win = false;
                        break;
                    }
                    combo.push(nidx);
                }
                if (win) return combo;
            }
        }
    }
    return null;
}

let lastMoveIdx = null;

function startGame() {
    game.startGame();
    lastMoveIdx = null;
    updateBoard(game.board, undefined, lastMoveIdx);
    showMessage("Lên đi con gà!");
}

function endGame(winner) {
    if (winner === 'X') {
        scoreX++;
        updateScore();
        showMessage("Bạn thắng!");
    } else if (winner === 'O') {
        scoreO++;
        updateScore();
        showMessage("AI thắng!");
    } else {
        showMessage("Hòa!");
    }
}

function handleUserMove(index) {
    if (game.checkWinner() || game.isBoardFull()) return;
    if (game.board[index]) return;
    if (game.makeMove(index)) {
        lastMoveIdx = index;
        const winCombo = getWinCombo(game.board);
        updateBoard(game.board, winCombo, lastMoveIdx);
        if (winCombo) {
            endGame('X');
            return;
        }
        if (game.isBoardFull()) {
            endGame(null);
            return;
        }
        showMessage("AI is thinking...");
        setTimeout(() => {
            if (game.checkWinner() || game.isBoardFull()) return;
            const aiMove = ai.makeMove([...game.board]);
            if (aiMove !== -1 && !game.board[aiMove]) {
                game.makeMove(aiMove);
                lastMoveIdx = aiMove;
                const aiWinCombo = getWinCombo(game.board);
                updateBoard(game.board, aiWinCombo, lastMoveIdx);
                if (aiWinCombo) {
                    endGame('O');
                    return;
                }
                if (game.isBoardFull()) {
                    endGame(null);
                    return;
                }
            }
            showMessage("Your turn!");
        }, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    startGame();
    updateScore();
    document.querySelectorAll('.cell').forEach((cell, index) => {
        cell.addEventListener('click', () => handleUserMove(index));
    });
    document.getElementById('restart').addEventListener('click', () => {
        startGame();
    });
    document.getElementById('difficulty').addEventListener('change', (e) => {
        difficulty = e.target.value;
        startGame();
    });
});