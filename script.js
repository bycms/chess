

document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.querySelector('.chessboard');
    const startGameButton = document.getElementById('startGame');
    const resetGameButton = document.getElementById('resetGame');
    const gameLogs = document.getElementById('gameLogs');
    let model_one = "Qwen/Qwen2.5-7B-Instruct";
    let model_two = "SeedLLM/Seed-Rice-7B";
    let history = [];

    // Initialize the chessboard with pieces
    let boardState = [
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
    ];

    // Initialize the chessboard UI
    function initializeChessboard() {
        chessboard.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const square = document.createElement('div');
                square.dataset.row = i;
                square.dataset.col = j;
                // Alternate colors for the chessboard
                if ((i + j) % 2 === 0) {
                    square.classList.add('light');
                } else {
                    square.classList.add('dark');
                }
                square.textContent = boardState[i][j];
                chessboard.appendChild(square);
            }
        }
    }

    initializeChessboard();

    startGameButton.addEventListener('click', startGame);
    resetGameButton.addEventListener('click', resetGame);

    function startGame() {
        // Clear logs
        gameLogs.innerHTML = '';
        // Reset board state to initial setup
        boardState = [
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
        ];
        initializeChessboard();
        // Start the game by making the first move
        makeMove(model_one);
    }

    function resetGame() {
        // Clear logs
        gameLogs.innerHTML = '';
        // Reset board state to initial setup
        boardState = [
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
        ];
        initializeChessboard();
    }

    async function makeMove(model) {
        // Convert the board state to a format the AI can understand
        const boardDescription = describeBoardState(boardState);
        const move = await getMoveFromAI(model, boardDescription);
        if (move && isValidMove(move)) {
            const { from, to } = move;
            boardState[to.row][to.col] = boardState[from.row][from.col];
            boardState[from.row][from.col] = '';
            updateBoard();
            logMove(model, move);
            // Switch to the other model
            const nextModel = model === model_one ? model_two : model_one;
            setTimeout(() => makeMove(nextModel), 1000); // Simulate thinking time
        } else {
            console.error('Invalid move:', move);
            logMove(model, { from: null, to: null }, 'Invalid move');
            // Retry the move
            setTimeout(() => makeMove(model), 1000);
        }
    }

    async function getMoveFromAI(model, boardDescription) {
        const apiUrl = 'https://api.siliconflow.cn/v1/chat/completions';
        const apiKey = 'sk-tmyrvfoatzrzlmyfsvhbsvpplcoqfdscvnrogsbadkqkvqpf'; // Replace with your actual API key

        const prompt = `
You are playing chess. The current board state is:
${boardDescription}

Rules:
1. Pieces: R (Rook), N (Knight), B (Bishop), Q (Queen), K (King), P (Pawn). You are moving the ${model === model_two ? 'Upper-case' : 'Lower-case'} pieces.
2. Moves must follow standard chess rules. For exmaple, you may move a queen from [1,3] to [1,7]  (if empty between), but never to [2,8].
3. (IMPORTANT) Respond with your move exactly in the format "from [row,col] to [row,col]". For example, "from [1,2] to [3,4]". Please make sure you follow this format, or the compiler might not understand. 
4. You're given a limited time of 15 seconds to think.

${history.length ? `The past steps are as follows: ${history.join(",")}. What's your next move?` : `Take your first move of all.`}
`;

        const options = {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model === model_one ? 'Qwen/Qwen2.5-7B-Instruct' : 'SeedLLM/Seed-Rice-7B',
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                temperature: 0.7,
                max_token: 128,
                response_format: { type: 'text' }
            })
        };

        try {
            const response = await fetch(apiUrl, options);
            const data = await response.json();
            console.log(data);
            const moveText = data?.choices[0].message.content;
            console.log("<res>" + moveText + "</res>");
            const thinkText = data?.choices[0].message.reasoning_content;
            console.log("<think>" + thinkText + "</think>");
            return parseMove(moveText);
        } catch (error) {
            console.error('Error fetching move from AI:', error);
            return null;
        }
    }

    function describeBoardState(boardState) {
        // Convert the board state into a textual description
        let description = '';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = boardState[i][j];
                if (piece) {
                    description += `${piece} at [${i},${j}], `;
                }
            }
        }
        return description || 'Empty board';
    }

    function parseMove(moveText) {
        // Parse the AI's response into a move object
        const regex = /from \[(\d+),(\d+)\] to \[(\d+),(\d+)\]/;
        const match = moveText.match(regex);
        if (match) {
            return {
                from: { row: parseInt(match[1]), col: parseInt(match[2]) },
                to: { row: parseInt(match[3]), col: parseInt(match[4]) }
            };
        }
        return null;
    }

    function isValidMove(move) {
        const { from, to } = move;
        // Basic validation: Ensure the move is within the board and the "from" square has a piece
        if (
            from.row < 0 || from.row >= 8 || from.col < 0 || from.col >= 8 ||
            to.row < 0 || to.row >= 8 || to.col < 0 || to.col >= 8 ||
            !boardState[from.row][from.col]
        ) {
            return false;
        }
        // Add more advanced validation (e.g., piece movement rules) here if needed
        return true;
    }

    function updateBoard() {
        const squares = document.querySelectorAll('.chessboard div');
        squares.forEach(square => {
            const row = square.dataset.row;
            const col = square.dataset.col;
            square.textContent = boardState[row][col] || '';
        });
    }

    function logMove(model, move, message = '') {
        const logEntry = document.createElement('li');
        if (move.from && move.to) {
            logEntry.textContent = `${model} moved from ${move.from.row},${move.from.col} to ${move.to.row},${move.to.col}`;
        } else {
            logEntry.textContent = `${model} made an invalid move. ${message}`;
        }
        gameLogs.appendChild(logEntry);
        history.push(`${model} moved ${move.from} to ${move.to}`);
    }
});
