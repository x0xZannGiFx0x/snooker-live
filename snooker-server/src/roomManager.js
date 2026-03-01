const { db } = require('./firebaseConfig');

const rooms = new Map();

async function initRooms() {
    if (!db) return;
    try {
        const snapshot = await db.collection('rooms').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            rooms.set(doc.id, {
                id: doc.id,
                sockets: [],
                gameState: data.gameState
            });
        });
        console.log(`Loaded ${snapshot.size} active rooms from Firebase.`);
    } catch (err) {
        console.error('Failed to load rooms from Firebase:', err);
    }
}

function createRoom(roomId) {
    const room = {
        id: roomId,
        sockets: [],
        gameState: null
    };
    rooms.set(roomId, room);
    return room;
}

function getRoom(roomId) {
    return rooms.get(roomId);
}

function joinRoom(roomId, socketId) {
    const room = rooms.get(roomId);
    if (room && !room.sockets.includes(socketId)) {
        room.sockets.push(socketId);
    }
}

function leaveRoom(roomId, socketId) {
    const room = rooms.get(roomId);
    if (room) {
        room.sockets = room.sockets.filter(id => id !== socketId);
    }
}

async function persistGameState(roomId, gameState) {
    if (!db) return;
    try {
        await db.collection('rooms').doc(roomId).set({
            gameState,
            lastUpdated: new Date().toISOString()
        });
    } catch (err) {
        console.error(`Failed to persist room ${roomId}:`, err);
    }
}

module.exports = {
    initRooms,
    createRoom,
    getRoom,
    joinRoom,
    leaveRoom,
    persistGameState
};
