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
        if (difficulty === 'easy') return this.makeMoveEasy(board);
        else if (difficulty === 'medium') return this.makeMoveMedium(board);
        else return this.makeMoveHard(board);
    }

    // Độ dễ: chỉ chặn thắng và chọn ngẫu nhiên gần người chơi
    makeMoveEasy(board) {
        const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);

        // 1. Thắng ngay
        for (const idx of empty) {
            board[idx] = 'O';
            if (getWinCombo(board)) {
                board[idx] = null;
                return idx;
            }
            board[idx] = null;
        }

        // 2. Chặn thắng người chơi
        for (const idx of empty) {
            board[idx] = 'X';
            if (getWinCombo(board)) {
                board[idx] = null;
                return idx;
            }
            board[idx] = null;
        }

        // 3. Ưu tiên đánh gần người chơi
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

        // 4. Random
        return empty[Math.floor(Math.random() * empty.length)];
    }

    // Độ trung bình: đánh giá công thủ, ưu tiên tạo thế mở, nhận diện double threats đơn giản
    makeMoveMedium(board) {
        const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);

        // 1. Thắng ngay
        for (const idx of empty) {
            board[idx] = 'O';
            if (getWinCombo(board)) {
                board[idx] = null;
                return idx;
            }
            board[idx] = null;
        }

        // 2. Chặn thắng người chơi
        for (const idx of empty) {
            board[idx] = 'X';
            if (getWinCombo(board)) {
                board[idx] = null;
                return idx;
            }
            board[idx] = null;
        }

        // 3. Ưu tiên nước đi tạo ra nhiều hơn 1 threat (double threat)
        let doubleThreatMoves = [];
        for (const idx of empty) {
            let threats = 0;
            for (let len = WIN_LENGTH - 2; len <= WIN_LENGTH - 1; len++) {
                threats += this.countPotentialLines(board, idx, 'O', len);
            }
            if (threats >= 2) doubleThreatMoves.push(idx);
        }
        if (doubleThreatMoves.length > 0) {
            return doubleThreatMoves[Math.floor(Math.random() * doubleThreatMoves.length)];
        }

        // 4. Đánh giá công/thủ, ưu tiên công
        let bestScore = -Infinity;
        let bestMoves = [];
        for (const idx of empty) {
            board[idx] = 'O';
            const aiScore = this.evaluateComprehensive(board, idx, 'O');
            board[idx] = null;
            board[idx] = 'X';
            const playerScore = this.evaluateComprehensive(board, idx, 'X');
            board[idx] = null;
            const score = aiScore * 1.1 + playerScore * 0.9;
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

        // 5. Ưu tiên gần người chơi
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

        // 6. Random
        return empty[Math.floor(Math.random() * empty.length)];
    }

    // Độ khó: nhận diện double threats, ưu tiên phòng thủ chủ động, đánh giá sâu hơn
    makeMoveHard(board) {
        const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);

        // 1. Thắng ngay
        for (const idx of empty) {
            board[idx] = 'O';
            if (getWinCombo(board)) {
                board[idx] = null;
                return idx;
            }
            board[idx] = null;
        }

        // 2. Chặn thắng người chơi
        for (const idx of empty) {
            board[idx] = 'X';
            if (getWinCombo(board)) {
                board[idx] = null;
                return idx;
            }
            board[idx] = null;
        }

        // 3. Phòng thủ chủ động: chặn double threats của người chơi
        let playerDoubleThreats = [];
        for (const idx of empty) {
            let threats = 0;
            for (let len = WIN_LENGTH - 2; len <= WIN_LENGTH - 1; len++) {
                threats += this.countPotentialLines(board, idx, 'X', len);
            }
            if (threats >= 2) playerDoubleThreats.push(idx);
        }
        if (playerDoubleThreats.length > 0) {
            return playerDoubleThreats[Math.floor(Math.random() * playerDoubleThreats.length)];
        }

        // 4. Tạo double threats cho AI
        let aiDoubleThreats = [];
        for (const idx of empty) {
            let threats = 0;
            for (let len = WIN_LENGTH - 2; len <= WIN_LENGTH - 1; len++) {
                threats += this.countPotentialLines(board, idx, 'O', len);
            }
            if (threats >= 2) aiDoubleThreats.push(idx);
        }
        if (aiDoubleThreats.length > 0) {
            return aiDoubleThreats[Math.floor(Math.random() * aiDoubleThreats.length)];
        }

        // 5. Đánh giá công/thủ sâu hơn, ưu tiên công mạnh
        let bestScore = -Infinity;
        let bestMoves = [];
        for (const idx of empty) {
            board[idx] = 'O';
            const aiScore = this.evaluateComprehensive(board, idx, 'O');
            board[idx] = null;
            board[idx] = 'X';
            const playerScore = this.evaluateComprehensive(board, idx, 'X');
            board[idx] = null;
            // Tăng trọng số công, giảm thủ
            const score = aiScore * 1.25 + playerScore * 0.8;
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

        // 6. Ưu tiên gần người chơi
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

        // 7. Random cuối cùng
        return empty[Math.floor(Math.random() * empty.length)];
    }

    evaluateComprehensive(board, idx, player) {
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
            // Tính điểm: ưu tiên chuỗi mở (block=0), chuỗi dài
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
    const directions = [
        {dx: 1, dy: 0},
        {dx: 0, dy: 1},
        {dx: 1, dy: 1},
        {dx: 1, dy: -1},
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