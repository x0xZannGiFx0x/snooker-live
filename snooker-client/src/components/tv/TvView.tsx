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
            <div className="tv-layout" style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '2vw'
            }}>

                {/* Main Score Board */}
                <div className="scoreboard-container flex-center" style={{
                    flexWrap: 'nowrap',
                    width: '100%',
                    maxWidth: '1800px',
                    gap: '4vw',
                    margin: '0 auto'
                }}>
                    <div className={`player-card ${gameState.activePlayer === 0 ? 'active' : ''}`} style={{
                        flex: 1,
                        minWidth: '0',
                        padding: '2vw',
                        borderRadius: '20px'
                    }}>
                        <div className="player-name" style={{ fontSize: '3.5vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gameState.players[0]}</div>
                        <div className="player-score" style={{ fontSize: '12vw', lineHeight: '1' }}>{gameState.scores[0]}</div>
                        {gameState.matchType && gameState.matchType !== 'FRAME_UNIQUE' && gameState.framesWon && (
                            <div className="frames-won" style={{ fontSize: '2vw' }}>
                                Frames: {gameState.framesWon[0]}
                            </div>
                        )}
                        <div className="player-best-break" style={{ fontSize: '1.5vw' }}>Highest: {gameState.bestBreaks[0]}</div>
                    </div>

                    <div className="vs-divider flex-col" style={{ gap: '1vh' }}>
                        <div className="vs-circle" style={{ width: '6vw', height: '6vw', fontSize: '2vw' }}>VS</div>
                        {gameState.matchType && gameState.matchType !== 'FRAME_UNIQUE' && (
                            <div className="match-type-badge" style={{ fontSize: '1.2vw' }}>BO{gameState.matchType}</div>
                        )}
                    </div>

                    <div className={`player-card ${gameState.activePlayer === 1 ? 'active' : ''}`} style={{
                        flex: 1,
                        minWidth: '0',
                        padding: '2vw',
                        borderRadius: '20px'
                    }}>
                        <div className="player-name" style={{ fontSize: '3.5vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gameState.players[1]}</div>
                        <div className="player-score" style={{ fontSize: '12vw', lineHeight: '1' }}>{gameState.scores[1]}</div>
                        {gameState.matchType && gameState.matchType !== 'FRAME_UNIQUE' && gameState.framesWon && (
                            <div className="frames-won" style={{ fontSize: '2vw' }}>
                                Frames: {gameState.framesWon[1]}
                            </div>
                        )}
                        <div className="player-best-break" style={{ fontSize: '1.5vw' }}>Highest: {gameState.bestBreaks[1]}</div>
                    </div>
                </div>

            </div>

            {/* Enhanced Independent Timer Overlay - Responsive positioning */}
            {gameState.matchStartTime && !gameState.isWaitingForMatch && (
                <div className="timer-overlay" style={{ position: 'absolute', top: '2vw', right: '2vw', background: 'rgba(0,0,0,0.8)', border: '2px solid rgba(255,255,255,0.1)', color: '#f1c40f', padding: '0.5vw 1.5vw', borderRadius: '12px', fontFamily: 'monospace', fontSize: '3.5vw', fontWeight: 'bold', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 10 }}>
                    {minutes}:{seconds}
                </div>
            )}

            {/* Display Player Queue seamlessly */}
            {gameState.queue && gameState.queue.length > 0 && (
                <div style={{ position: 'absolute', bottom: '12vh', right: '2vw', background: 'rgba(0,0,0,0.8)', border: '2px solid rgba(255,255,255,0.1)', padding: '1vw 1.5vw', borderRadius: '12px', zIndex: 5, textAlign: 'left', maxWidth: '20vw' }}>
                    <h3 style={{ margin: '0 0 0.5vw 0', color: '#2ecc71', fontSize: '1.2vw', textTransform: 'uppercase', letterSpacing: '2px' }}>SUIVANTS</h3>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {gameState.queue.slice(0, 3).map((player: string, index: number) => (
                            <li key={index} style={{ color: 'white', fontSize: '1.2vw', marginBottom: '0.4vw', display: 'flex', alignItems: 'center', gap: '0.8vw' }}>
                                <span style={{ background: '#e74c3c', color: 'white', fontWeight: 'bold', width: '1.8vw', height: '1.8vw', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.9vw' }}>
                                    {index + 1}
                                </span>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Current Break Overlay perfectly centered */}
            {gameState.currentBreak > 0 && !gameState.lastFrameWinner && (
                <div className={`break-overlay ${isCentury ? 'century-glow' : isHalfCentury ? 'half-century-glow' : ''}`}>
                    <div className="break-label" style={{ fontSize: '2vw' }}>Break</div>
                    <div className="break-value" style={{ fontSize: '8vw' }}>{gameState.currentBreak}</div>
                </div>
            )}

            {/* Frame Winner Overlay - Persists until manual reset/new match */}
            {gameState.lastFrameWinner && (
                <div className="break-overlay century-glow" style={{ zIndex: 100, background: 'rgba(0,0,0,0.9)' }}>
                    <div className="break-label" style={{ fontSize: '3vw', marginBottom: '1vh' }}>
                        {gameState.lastFrameWinner === 'Draw' ? 'Match Nul' : 'Victoire'}
                    </div>
                    <div className="break-value" style={{ fontSize: '10vw', textShadow: '0 0 30px rgba(255,255,255,0.8)' }}>
                        {gameState.lastFrameWinner !== 'Draw' ? gameState.lastFrameWinner : ''}
                    </div>
                    <div className="break-badge" style={{ fontSize: '1.5vw' }}>MATCH TERMINÉ 🎉</div>
                </div>
            )}

            {/* Phase info footer - Responsive height */}
            <div className="tv-footer-container" style={{ height: '8vh' }}>
                <div className="footer-stat">
                    <span className="stat-label" style={{ fontSize: '1vw' }}>Phase</span>
                    <span className="stat-value" style={{ fontSize: '1.5vw' }}>{gameState.phase}</span>
                </div>
                <div className="footer-stat">
                    <span className="stat-label" style={{ fontSize: '1vw' }}>Reds</span>
                    <span className="stat-value text-red" style={{ fontSize: '1.5vw' }}>{gameState.remainingReds}</span>
                </div>
            </div>
        </div>
    );
}
