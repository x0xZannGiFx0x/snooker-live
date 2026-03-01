const { db } = require('./firebaseConfig');

// If Firestore isn't connected, we can still fall back, but we'll assume it is for now.

async function getPlayerStats() {
    if (!db) return {};
    try {
        const snapshot = await db.collection('stats').get();
        const stats = {};
        snapshot.forEach(doc => {
            stats[doc.id] = doc.data();
        });
        return stats;
    } catch (err) {
        console.error('Error fetching stats:', err);
        return {};
    }
}

async function recordMatchResult(winner, loser, matchType) {
    if (!winner || !loser || !db) return;

    const tariff = parseInt(matchType) > 0 ? parseInt(matchType) * 20 : 20;

    const winnerRef = db.collection('stats').doc(winner);
    const loserRef = db.collection('stats').doc(loser);

    try {
        await db.runTransaction(async (t) => {
            const winnerDoc = await t.get(winnerRef);
            const loserDoc = await t.get(loserRef);

            const wData = winnerDoc.exists ? winnerDoc.data() : { wins: 0, losses: 0, matches: 0, amountOwed: 0, totalPaid: 0 };
            const lData = loserDoc.exists ? loserDoc.data() : { wins: 0, losses: 0, matches: 0, amountOwed: 0, totalPaid: 0 };

            wData.wins++;
            wData.matches++;

            lData.losses++;
            lData.matches++;
            lData.amountOwed += tariff;

            t.set(winnerRef, wData);
            t.set(loserRef, lData);
        });
        console.log(`Successfully recorded match to Firebase: ${winner} beat ${loser}`);
    } catch (err) {
        console.error('Error recording match result:', err);
    }
}

async function markPlayerPaid(playerName) {
    if (!db || !playerName) return false;
    try {
        const playerRef = db.collection('stats').doc(playerName);
        await db.runTransaction(async (t) => {
            const doc = await t.get(playerRef);
            if (!doc.exists) return;
            const data = doc.data();
            const owed = data.amountOwed || 0;
            const totalPaid = (data.totalPaid || 0) + owed;
            t.update(playerRef, { amountOwed: 0, totalPaid: totalPaid });
        });
        return true;
    } catch (err) {
        console.error('Error marking player paid:', err);
        return false;
    }
}

async function clearAllStats() {
    if (!db) return;
    try {
        const snapshot = await db.collection('stats').get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('All stats cleared from Firebase.');
    } catch (err) {
        console.error('Error clearing stats:', err);
    }
}

module.exports = {
    getPlayerStats,
    recordMatchResult,
    clearAllStats,
    markPlayerPaid
};
