// In-memory stats storage
// Tracks wins, losses, and matches played per player name
const playerStats = {};

function getPlayerStats() {
    return playerStats;
}

function recordMatchResult(winner, loser, matchType) {
    if (!winner || !loser) return;

    // Initialize if needed
    if (!playerStats[winner]) {
        playerStats[winner] = { wins: 0, losses: 0, matches: 0, amountOwed: 0 };
    }
    if (!playerStats[loser]) {
        playerStats[loser] = { wins: 0, losses: 0, matches: 0, amountOwed: 0 };
    }

    // Calculate tariff: 20 DH * number of frames in the match
    const numFrames = parseInt(matchType);
    const tariff = isNaN(numFrames) ? 20 : numFrames * 20; // FRAME_UNIQUE = 20, BO3 = 60, BO5 = 100, BO7 = 140

    playerStats[winner].wins++;
    playerStats[winner].matches++;

    playerStats[loser].losses++;
    playerStats[loser].matches++;
    playerStats[loser].amountOwed += tariff;
}

function clearAllStats() {
    for (const key of Object.keys(playerStats)) {
        delete playerStats[key];
    }
}

module.exports = {
    getPlayerStats,
    recordMatchResult,
    clearAllStats
};
