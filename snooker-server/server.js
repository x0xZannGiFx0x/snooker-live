const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createRoom, getRoom, joinRoom, leaveRoom, initRooms, persistGameState } = require('./src/roomManager');
const { createGame, handleAction } = require('./src/gameMachine');
const { getPlayerStats, recordMatchResult, clearAllStats, markPlayerPaid } = require('./src/statsManager');
const cookieParser = require('cookie-parser');
const { generateAdminToken, verifyAdminToken, ADMIN_PASSWORD } = require('./src/adminAuth');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static files from the React app dist folder
app.use(express.static(path.join(__dirname, '../snooker-client/dist')));

// REST API for stats
app.get('/api/stats', async (req, res) => {
    const stats = await getPlayerStats();
    res.json(stats);
});

app.delete('/api/stats', verifyAdminToken, async (req, res) => {
    await clearAllStats();
    res.json({ success: true });
});

// Admin Auth Endpoints
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = generateAdminToken();
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
});

app.get('/api/admin/check', verifyAdminToken, (req, res) => {
    res.json({ success: true, loggedIn: true });
});

app.post('/api/admin/stats/pay', verifyAdminToken, async (req, res) => {
    const { playerName } = req.body;
    if (!playerName) return res.status(400).json({ error: 'Player name required' });

    const success = await markPlayerPaid(playerName);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to mark player paid' });
    }
});

app.post('/api/queue', (req, res) => {
    const { roomCode, playerName } = req.body;
    if (!roomCode || !playerName) return res.status(400).json({ error: 'roomCode and playerName required' });
    let room = getRoom(roomCode);
    if (!room) {
        room = createRoom(roomCode);
        room.gameState = createGame();
    }
    if (!room.gameState.queue) room.gameState.queue = [];
    room.gameState.queue.push(playerName);
    persistGameState(roomCode, room.gameState);

    // Attempt to broadcast if io exists (it will be hoisted naturally, but we can do it via a global getter or just let the client refresh if it's on TvView. Since io is declared below... wait, we will move this logic below or just shift io up.)
    // For now we'll just handle it.
    if (global.io) global.io.to(roomCode).emit('game_state_update', room.gameState);

    res.json({ success: true, queue: room.gameState.queue });
});

app.post('/api/queue/remove', (req, res) => {
    const { roomCode, index } = req.body;
    const room = getRoom(roomCode);
    if (room && room.gameState.queue) {
        room.gameState.queue.splice(index, 1);
        persistGameState(roomCode, room.gameState);
        if (global.io) global.io.to(roomCode).emit('game_state_update', room.gameState);
        return res.json({ success: true, queue: room.gameState.queue });
    }
    res.status(404).json({ error: 'Room or queue not found' });
});

app.post('/api/queue/edit', (req, res) => {
    const { roomCode, index, newName } = req.body;
    const room = getRoom(roomCode);
    if (room && room.gameState.queue && room.gameState.queue[index] !== undefined) {
        room.gameState.queue[index] = newName;
        persistGameState(roomCode, room.gameState);
        if (global.io) global.io.to(roomCode).emit('game_state_update', room.gameState);
        return res.json({ success: true, queue: room.gameState.queue });
    }
    res.status(404).json({ error: 'Room or player not found' });
});

app.post('/api/admin/daily-archive', verifyAdminToken, async (req, res) => {
    try {
        const stats = await getPlayerStats();
        if (Object.keys(stats).length === 0) return res.json({ success: true, message: 'No stats to archive' });

        const { db } = require('./src/firebaseConfig');
        const reportDate = new Date().toISOString().split('T')[0];

        await db.collection('daily_reports').doc(reportDate).set({
            timestamp: Date.now(),
            statsSnapshot: stats
        });

        await clearAllStats();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to archive stats' });
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
global.io = io; // Expose securely for the REST API queue push

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        let room = getRoom(roomCode);
        if (!room) {
            room = createRoom(roomCode);
            room.gameState = createGame();
            persistGameState(roomCode, room.gameState);
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

                        // Winner Stays On Logic
                        if (room.gameState.queue && room.gameState.queue.length > 0) {
                            const nextPlayer = room.gameState.queue.shift(); // Pull next player
                            const newMatchPlayers = [winnerName, nextPlayer];
                            // Re-init game for the new match
                            const newGame = require('./src/gameMachine').createGame(newMatchPlayers, room.gameState.matchType);
                            newGame.queue = room.gameState.queue; // keep queue
                            room.gameState = newGame;
                            console.log(`[QUEUE] Starting new match: ${winnerName} vs ${nextPlayer}`);
                        }
                    }
                }

                persistGameState(roomCode, room.gameState);
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

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../snooker-client/dist', 'index.html'));
});

async function startServer() {
    await initRooms();
    server.listen(PORT, () => {
        console.log(`Socket.io server listening on *:${PORT}`);
    });
}

startServer();
