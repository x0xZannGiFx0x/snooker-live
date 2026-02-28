import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Placeholders for views
import TvView from './components/tv/TvView';
import MobileRemote from './components/mobile/MobileRemote';

interface PlayerStat {
  wins: number;
  losses: number;
  matches: number;
  amountOwed: number;
}

function Home() {
  const [player1, setPlayer1] = useState('Player 1');
  const [player2, setPlayer2] = useState('Player 2');
  const [matchType, setMatchType] = useState('FRAME_UNIQUE');
  const [stats, setStats] = useState<Record<string, PlayerStat>>({});
  const [showStats, setShowStats] = useState(false);

  const navigate = useNavigate();

  const fetchStats = async () => {
    const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
    try {
      const res = await fetch(`${API_URL}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const clearStats = async () => {
    const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
    try {
      await fetch(`${API_URL}/api/stats`, { method: 'DELETE' });
      setStats({});
    } catch (e) {
      console.error('Failed to clear stats', e);
    }
  };

  const joinAsRemote = () => {
    const params = new URLSearchParams({ p1: player1, p2: player2, type: matchType, reset: 'true' });
    navigate(`/remote/TABLE1?${params.toString()}`);
  };

  const joinAsTv = () => {
    const params = new URLSearchParams({ p1: player1, p2: player2, type: matchType });
    navigate(`/tv/TABLE1?${params.toString()}`);
  };

  const statEntries = Object.entries(stats);
  const totalOwed = statEntries.reduce((sum, [, s]) => sum + s.amountOwed, 0);

  return (
    <div className="app-container" style={{ padding: '1.5rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>

      {/* Match Config */}
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'left' }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '2rem', textAlign: 'center' }}>🎱 Snooker Pro</h1>
        <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Configure and connect to the table.</p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>PLAYER 1</label>
            <input type="text" value={player1} onChange={e => setPlayer1(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>PLAYER 2</label>
            <input type="text" value={player2} onChange={e => setPlayer2(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>MATCH FORMAT</label>
          <select value={matchType} onChange={e => setMatchType(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
            <option value="FRAME_UNIQUE">1 Frame (Entraînement / Unique)</option>
            <option value="3">Best of 3 Frames</option>
            <option value="5">Best of 5 Frames</option>
            <option value="7">Best of 7 Frames</option>
          </select>
        </div>

        <div className="flex-col" style={{ gap: '1rem' }}>
          <button onClick={joinAsRemote}
            style={{ padding: '1rem', background: 'var(--color-accent-green)', color: 'black', fontWeight: 'bold', fontSize: '1.1rem', borderRadius: 'var(--radius-full)' }}>
            📱 Launch Mobile Remote
          </button>

          <button onClick={joinAsTv}
            style={{ padding: '1rem', background: 'transparent', border: '2px solid var(--color-text-main)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', borderRadius: 'var(--radius-full)' }}>
            📺 Launch TV Display
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>📊 Statistiques</h2>
          <button onClick={() => { setShowStats(!showStats); if (!showStats) fetchStats(); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            {showStats ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        {showStats && (
          <>
            {statEntries.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Aucune statistique disponible.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)' }}>Joueur</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#2ecc71' }}>V</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#e74c3c' }}>D</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)' }}>Total</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: '#f1c40f' }}>Tarif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statEntries.map(([name, s]) => (
                      <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>{name}</td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#2ecc71', fontWeight: 'bold' }}>{s.wins}</td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#e74c3c', fontWeight: 'bold' }}>{s.losses}</td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>{s.matches}</td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: s.amountOwed > 0 ? '#f1c40f' : '#2ecc71', fontWeight: 'bold' }}>
                          {s.amountOwed > 0 ? `${s.amountOwed} DH` : '0 DH'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalOwed > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(241, 196, 15, 0.1)', border: '1px solid rgba(241, 196, 15, 0.3)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>💰 Total à payer : {totalOwed} DH</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>20 DH par match perdu</span>
                  </div>
                )}
              </div>
            )}

            {statEntries.length > 0 && (
              <button onClick={clearStats}
                style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)', color: '#e74c3c', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>
                🗑️ Effacer toutes les statistiques
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/remote/:roomCode" element={<MobileRemote />} />
      <Route path="/tv/:roomCode" element={<TvView />} />
    </Routes>
  );
}

export default App;
