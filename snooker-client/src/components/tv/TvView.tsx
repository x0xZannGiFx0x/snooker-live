import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import './TvView.css';

export default function TvView() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { gameState, connected, sendAction } = useSocket(roomCode || '');

    // Send configuration if we just joined from home with params
    useEffect(() => {
        if (connected && searchParams.has('p1') && searchParams.has('p2')) {
            sendAction('SET_MATCH_CONFIG', {
                players: [searchParams.get('p1'), searchParams.get('p2')],
                matchType: searchParams.get('type') || 'FRAME_UNIQUE'
            });
            // Clear params from URL so we don't keep sending them on refresh
            setSearchParams({}, { replace: true });
        }
    }, [connected, searchParams, sendAction, setSearchParams]);

    // Timer state decoupled from gameState re-renders
    const [currentTime, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const elapsed = gameState?.matchStartTime && !gameState.isWaitingForMatch ? currentTime - gameState.matchStartTime : 0;

    if (!connected || !gameState) {
        return (
            <div className="tv-app flex-center">
                <h1 className="connecting-text">WAITING FOR MATCH (ROOM {roomCode})...</h1>
            </div>
        );
    }

    // Animation logic for high breaks
    const isCentury = gameState.currentBreak >= 100;
    const isHalfCentury = gameState.currentBreak >= 50 && gameState.currentBreak < 100;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');

    return (
        <div className="tv-app" style={{ overflow: 'hidden' }}>
            <div className="tv-layout centered-layout">
                {/* Scoreboard Area */}
                <div className="scoreboard-container flex-center">
                    <div className={`player-card ${gameState.activePlayer === 0 ? 'active' : ''}`}>
                        <div className="player-name">{gameState.players[0]}</div>
                        <div className="player-score">{gameState.scores[0]}</div>
                        {gameState.matchType && gameState.matchType !== 'FRAME_UNIQUE' && gameState.framesWon && (
                            <div className="frames-won">
                                Frames: {gameState.framesWon[0]}
                            </div>
                        )}
                        <div className="player-best-break">Highest: {gameState.bestBreaks[0]}</div>
                    </div>

                    <div className="vs-divider flex-col">
                        <div className="vs-circle">VS</div>
                        {gameState.matchType && gameState.matchType !== 'FRAME_UNIQUE' && (
                            <div className="match-type-badge">BO{gameState.matchType}</div>
                        )}
                    </div>

                    <div className={`player-card ${gameState.activePlayer === 1 ? 'active' : ''}`}>
                        <div className="player-name">{gameState.players[1]}</div>
                        <div className="player-score">{gameState.scores[1]}</div>
                        {gameState.matchType && gameState.matchType !== 'FRAME_UNIQUE' && gameState.framesWon && (
                            <div className="frames-won">
                                Frames: {gameState.framesWon[1]}
                            </div>
                        )}
                        <div className="player-best-break">Highest: {gameState.bestBreaks[1]}</div>
                    </div>
                </div>

                {/* Overlays (Centred when active) */}
                {gameState.currentBreak > 0 && !gameState.lastFrameWinner && (
                    <div className={`break-overlay ${isCentury ? 'century-glow' : isHalfCentury ? 'half-century-glow' : ''}`}>
                        <div className="break-label">Break</div>
                        <div className="break-value">{gameState.currentBreak}</div>
                    </div>
                )}

                {gameState.lastFrameWinner && !gameState.isMatchOver && (
                    <div className="break-overlay winner-overlay century-glow">
                        <div className="break-label">
                            {gameState.lastFrameWinner === 'Draw' ? 'Match Nul' : 'Victoire'}
                        </div>
                        <div className="break-value">
                            {gameState.lastFrameWinner !== 'Draw' ? gameState.lastFrameWinner : ''}
                        </div>
                        <div className="break-badge">FIN DE FRAME 🎉</div>
                    </div>
                )}

                {/* Final Match Victory Overlay */}
                {gameState.isMatchOver && gameState.matchWinner && (
                    <div className="break-overlay winner-overlay century-glow">
                        <div className="break-label">Victoire</div>
                        <div className="break-value">
                            {gameState.matchWinner}
                        </div>
                        <div className="break-badge">MATCH TERMINÉ 🎉</div>
                    </div>
                )}
            </div>

            {/* Enhanced Footer: Timer and Queue in one line */}
            <div className="tv-footer-container">
                <div className="footer-left">
                    <div className="footer-stat">
                        <span className="stat-label">Phase</span>
                        <span className="stat-value">{gameState.phase}</span>
                    </div>
                    <div className="footer-stat">
                        <span className="stat-label">Reds</span>
                        <span className="stat-value text-red">{gameState.remainingReds}</span>
                    </div>
                </div>

                <div className="footer-center">
                    {gameState.queue && gameState.queue.length > 0 && (
                        <div className="footer-queue">
                            <span className="queue-label">SUIVANTS:</span>
                            <div className="queue-list">
                                {gameState.queue.map((player: string, index: number) => (
                                    <span key={index} className="queue-item">
                                        <span className="queue-num">{index + 1}.</span> {player}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="footer-right">
                    {gameState.matchStartTime && !gameState.isWaitingForMatch && (
                        <div className="footer-timer">
                            ⏱ {minutes}:{seconds}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
