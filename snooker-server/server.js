const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createRoom, getRoom, joinRoom, leaveRoom } = require('./src/roomManager');
const { createGame, handleAction } = require('./src/gameMachine');
const { getPlayerStats, recordMatchResult, clearAllStats } = require('./src/statsManager');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// REST API for stats
app.get('/api/stats', (req, res) => {
    res.json(getPlayerStats());
});

app.delete('/api/stats', (req, res) => {
    clearAllStats();
    res.json({ success: true });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        let room = getRoom(roomCode);
        if (!room) {
            room = createRoom(roomCode);
            room.gameState = createGame();
        }
        joinRoom(roomCode, socket.id);

        // Send current state to the joined client
        socket.emit('game_state_update', room.gameState);
        console.log(`User ${socket.id} joined room ${roomCode}`);
    });

    socket.on('game_action', ({ roomCode, action, payload }) => {
        console.log(`[ACTION] Room: ${roomCode}, Action: ${action}, Payload:`, payload);
        const room = getRoom(roomCode);
        if (room) {
            try {
                const prevState = room.gameState;
                room.gameState = handleAction(room.gameState, action, payload);

                // If match just ended, record the result
                if (action === 'END_FRAME' && room.gameState.isMatchOver && room.gameState.matchWinner) {
                    const winnerName = room.gameState.matchWinner;
                    const loserName = prevState.players.find(p => p !== winnerName) || '';
                    if (winnerName && loserName) {
                        recordMatchResult(winnerName.trim(), loserName.trim(), room.gameState.matchType);
                        console.log(`[STATS] Match recorded: ${winnerName} beat ${loserName}`);
                    }
                }

                io.to(roomCode).emit('game_state_update', room.gameState);
            } catch (err) {
                console.error(`[ERROR] processing action ${action}:`, err);
            }
        }
    });

    socket.on('disconnect', () => {
        // Logic to handle cleanup of user from rooms can be implemented here if needed.
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.io server listening on *:${PORT}`);
});
