import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import './TvView.css';

export default function TvView() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const [searchParams] = useSearchParams();
    const { gameState, connected, sendAction } = useSocket(roomCode || '');

    // Send configuration if we just joined from home with params
    useEffect(() => {
        if (connected && searchParams.has('p1') && searchParams.has('p2')) {
            sendAction('SET_MATCH_CONFIG', {
                players: [searchParams.get('p1'), searchParams.get('p2')],
                matchType: searchParams.get('type') || 'FRAME_UNIQUE'
            });
            // Clear params from URL so we don't keep sending them on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [connected, searchParams, sendAction]);

    // Timer state
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!gameState || !gameState.matchStartTime) return;
        const startTime = gameState.matchStartTime;
        const interval = setInterval(() => {
            setElapsed(Date.now() - startTime);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

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
        <div className="tv-app">
            <div className="tv-layout">

                {/* Main Score Board */}
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

            </div>

            {/* Timer Overlay */}
            {gameState.matchStartTime && (
                <div className="timer-overlay" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace' }}>
                    {minutes}:{seconds}
                </div>
            )}
            {/* Current Break Overlay perfectly centered over everything */}
            {gameState.currentBreak > 0 && !gameState.lastFrameWinner && (
                <div className={`break-overlay ${isCentury ? 'century-glow' : isHalfCentury ? 'half-century-glow' : ''}`}>
                    <div className="break-label">Break</div>
                    <div className="break-value">{gameState.currentBreak}</div>
                    {isCentury && <div className="break-badge">CENTURY BREAK 🔥</div>}
                    {isHalfCentury && <div className="break-badge">HALF CENTURY ⭐</div>}
                </div>
            )}

            {/* Frame Winner Overlay */}
            {gameState.lastFrameWinner && !gameState.isWaitingForMatch && (
                <div className="break-overlay century-glow">
                    <div className="break-label" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                        {gameState.lastFrameWinner === 'Draw' ? 'Match Nul' : 'Victoire'}
                    </div>
                    <div className="break-value" style={{ fontSize: '4rem' }}>
                        {gameState.lastFrameWinner !== 'Draw' ? gameState.lastFrameWinner : ''}
                    </div>
                    <div className="break-badge">FRAME TERMINÉE 🎉</div>
                </div>
            )}

            {/* Waiting for Next Match Overlay */}
            {gameState.isWaitingForMatch && (
                <div className="waiting-overlay">
                    <div className="waiting-content">
                        <div className="waiting-balls">
                            <span className="waiting-ball" style={{ background: '#e74c3c' }}></span>
                            <span className="waiting-ball" style={{ background: '#f1c40f' }}></span>
                            <span className="waiting-ball" style={{ background: '#2ecc71' }}></span>
                            <span className="waiting-ball" style={{ background: '#b35d1e' }}></span>
                            <span className="waiting-ball" style={{ background: '#3498db' }}></span>
                            <span className="waiting-ball" style={{ background: '#e84393' }}></span>
                            <span className="waiting-ball" style={{ background: '#222f3e' }}></span>
                        </div>
                        <div className="waiting-title">En attente du prochain match...</div>
                        <div className="waiting-subtitle">Configurez les joueurs sur la télécommande</div>
                    </div>
                </div>
            )}

            {/* Match Info Footer properly docked */}
            <div className="tv-footer-container">
                <div className="footer-stat">
                    <span className="stat-label">Phase</span>
                    <span className="stat-value">{gameState.phase}</span>
                </div>
                <div className="footer-stat">
                    <span className="stat-label">Reds Remaining</span>
                    <span className="stat-value text-red">{gameState.remainingReds}</span>
                </div>
            </div>
        </div>
    );
}
