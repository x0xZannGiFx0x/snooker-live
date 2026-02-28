const rooms = new Map();

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
        if (room.sockets.length === 0) {
            // Optional: Delete empty rooms after a timeout
            // rooms.delete(roomId);
        }
    }
}

module.exports = {
    createRoom,
    getRoom,
    joinRoom,
    leaveRoom
};
