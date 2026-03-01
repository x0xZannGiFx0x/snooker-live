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

            {/* Enhanced Independent Timer Overlay */}
            {gameState.matchStartTime && !gameState.isWaitingForMatch && (
                <div className="timer-overlay" style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'rgba(0,0,0,0.8)', border: '2px solid rgba(255,255,255,0.1)', color: '#f1c40f', padding: '1rem 2.5rem', borderRadius: '12px', fontFamily: 'monospace', fontSize: '3rem', fontWeight: 'bold', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 10 }}>
                    {minutes}:{seconds}
                </div>
            )}

            {/* Display Player Queue seamlessly */}
            {gameState.queue && gameState.queue.length > 0 && (
                <div style={{ position: 'absolute', bottom: '100px', right: '2rem', background: 'rgba(0,0,0,0.8)', border: '2px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px', zIndex: 5, textAlign: 'left' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#2ecc71', fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>A Venir (File d'attente)</h3>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {gameState.queue.map((player: string, index: number) => (
                            <li key={index} style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ background: '#e74c3c', color: 'white', fontWeight: 'bold', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                                    {index + 1}
                                </span>
                                {player}
                            </li>
                        ))}
                    </ul>
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
