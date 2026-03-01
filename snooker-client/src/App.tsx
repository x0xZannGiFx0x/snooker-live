import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import './App.css';

// Placeholders for views
import TvView from './components/tv/TvView';
import MobileRemote from './components/mobile/MobileRemote';

interface PlayerStat {
  wins: number;
  losses: number;
  matches: number;
  amountOwed: number;
  totalPaid?: number;
}

function Home() {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [matchType, setMatchType] = useState('FRAME_UNIQUE');
  const [stats, setStats] = useState<Record<string, PlayerStat>>({});
  const [showStats, setShowStats] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [nextPlayerName, setNextPlayerName] = useState('');

  const { gameState: tableState } = useSocket('TABLE1');

  const navigate = useNavigate();

  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

  const checkAdminStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/check`, { credentials: 'include' });
      if (res.ok) {
        setIsAdmin(true);
      }
    } catch (e) {
      console.error('Failed to check admin status', e);
    }
  };

  const fetchStats = async () => {
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
    checkAdminStatus();
  }, []);

  const location = useLocation();

  // Fullscreen toggle for TV & Remote view
  useEffect(() => {
    const isTv = location.pathname.includes('/tv/');
    const isRemote = location.pathname.includes('/remote/');
    if (isTv || isRemote) {
      document.body.classList.add('full-screen-app');
    } else {
      document.body.classList.remove('full-screen-app');
    }
  }, [location]);

  // Lobby Automation: Sync names from table state
  useEffect(() => {
    if (tableState?.players && tableState.players.length >= 2) {
      setPlayer1(tableState.players[0] || '');
      setPlayer2(tableState.players[1] || '');
    }
  }, [tableState?.players]);

  const clearStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) setStats({});
    } catch (e) {
      console.error('Failed to clear stats', e);
    }
  };

  const joinAsRemote = () => {
    // Only pass players if there is no active match to prevent resetting scores
    const isMatchActive = tableState && !tableState.isWaitingForMatch && !tableState.isMatchOver;
    const params = new URLSearchParams();
    if (!isMatchActive) {
      params.set('p1', player1);
      params.set('p2', player2);
      params.set('type', matchType);
      params.set('reset', 'true');
    }
    navigate(`/remote/TABLE1?${params.toString()}`);
  };

  const joinAsTv = () => {
    const isMatchActive = tableState && !tableState.isWaitingForMatch && !tableState.isMatchOver;
    const params = new URLSearchParams();
    if (!isMatchActive) {
      params.set('p1', player1);
      params.set('p2', player2);
      params.set('type', matchType);
    }
    navigate(`/tv/TABLE1?${params.toString()}`);
  };

  const loginAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
        credentials: 'include'
      });
      if (res.ok) {
        setIsAdmin(true);
        setShowAdminLogin(false);
        setAdminPassword('');
      } else {
        alert('Mot de passe incorrect');
      }
    } catch (e) {
      console.error('Failed to log in', e);
    }
  };

  const logoutAdmin = async () => {
    try {
      await fetch(`${API_URL}/api/admin/logout`, { method: 'POST', credentials: 'include' });
      setIsAdmin(false);
    } catch (e) {
      console.error(e);
    }
  };

  const markPaid = async (playerName: string) => {
    if (!confirm(`Confirmer que ${playerName} a payé ?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/stats/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
        credentials: 'include'
      });
      if (res.ok) {
        fetchStats();
      } else {
        alert('Erreur: impossible de marquer payé');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const archiveDailyReports = async () => {
    if (!confirm('Voulez-vous vraiment archiver la journée ? Cela remettra toutes les statistiques (victoires, défaites) et fermera la session du jour !')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/daily-archive`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        alert('Journée archivée avec succès !');
        fetchStats();
      } else {
        alert('Erreur lors de l’archivage.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addNextPlayerContext = async () => {
    if (!nextPlayerName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: 'TABLE1', playerName: nextPlayerName })
      });
      if (res.ok) {
        setNextPlayerName('');
      } else {
        alert('Erreur lors de l’ajout du joueur.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeQueuePlayer = async (index: number) => {
    try {
      const res = await fetch(`${API_URL}/api/queue/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: 'TABLE1', index })
      });
      if (!res.ok) alert('Erreur lors de la suppression.');
    } catch (e) {
      console.error(e);
    }
  };

  const editQueuePlayer = async (index: number) => {
    const currentName = tableState?.queue?.[index] || '';
    const newName = prompt('Entrez le nouveau nom:', currentName);
    if (!newName || newName === currentName) return;
    try {
      const res = await fetch(`${API_URL}/api/queue/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: 'TABLE1', index, newName })
      });
      if (!res.ok) alert('Erreur lors de la modification.');
    } catch (e) {
      console.error(e);
    }
  };

  const statEntries = Object.entries(stats);
  const totalOwed = statEntries.reduce((sum, [, s]) => sum + s.amountOwed, 0);
  const totalMatchesPlayed = Math.floor(statEntries.reduce((sum, [, s]) => sum + s.matches, 0) / 2);
  const calculatedTotalEarnings = totalMatchesPlayed * 20;

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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: tableState?.queue?.length ? '#2ecc71' : 'var(--color-text-muted)', fontWeight: tableState?.queue?.length ? 'bold' : 'normal' }}>
              {tableState?.queue?.length ? '👤 JOUEUR SUIVANT' : 'PLAYER 2'}
            </label>
            <input type="text" value={player2} onChange={e => setPlayer2(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: tableState?.queue?.length ? '1px solid #2ecc71' : '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 'var(--radius-sm)' }}
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
            {tableState && !tableState.isWaitingForMatch && !tableState.isMatchOver ? '📱 Resume Active Match' : '📱 Launch Mobile Remote'}
          </button>

          <button onClick={joinAsTv}
            style={{ padding: '1rem', background: 'transparent', border: '2px solid var(--color-text-main)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', borderRadius: 'var(--radius-full)' }}>
            📺 Launch TV Display
          </button>
        </div>
      </div>

      {/* Queue Selection Section */}
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#3498db', textAlign: 'center' }}>👤 AJOUTER LE JOUEUR SUIVANT</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>NOM DU JOUEUR</label>
            <input
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 'var(--radius-sm)' }}
              value={nextPlayerName}
              onChange={e => setNextPlayerName(e.target.value)}
              placeholder="Ex: Ahmed"
            />
          </div>
          <button className="btn-launch" style={{ padding: '1rem', borderRadius: 'var(--radius-full)', fontWeight: 'bold' }} onClick={addNextPlayerContext}>
            ➕ Ajouter à la File
          </button>
        </div>

        {tableState?.queue && (tableState.queue as string[]).length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)', textAlign: 'center', letterSpacing: '1px' }}>FILE D'ATTENTE ({(tableState.queue as string[]).length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(tableState.queue as string[]).map((name: string, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--color-accent-green)', fontWeight: 'bold', fontSize: '1.1rem' }}>{idx + 1}.</span>
                    <span style={{ fontWeight: '500' }}>{name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => editQueuePlayer(idx)} style={{ background: 'rgba(52, 152, 219, 0.1)', border: 'none', color: '#3498db', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                    <button onClick={() => removeQueuePlayer(idx)} style={{ background: 'rgba(231, 76, 60, 0.1)', border: 'none', color: '#e74c3c', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>📊 Statistiques <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({statEntries.length} joueurs)</span></h2>
          <button onClick={() => { setShowStats(!showStats); if (!showStats) fetchStats(); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            {showStats ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        {showStats && isAdmin && statEntries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(46, 204, 113, 0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#2ecc71', opacity: 0.8, textTransform: 'uppercase' }}>Revenus Totaux</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2ecc71' }}>
                {calculatedTotalEarnings} DH
              </div>
            </div>
            <div style={{ background: 'rgba(241, 196, 15, 0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(241, 196, 15, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#f1c40f', opacity: 0.8, textTransform: 'uppercase' }}>À Encaisser</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f1c40f' }}>{totalOwed} DH</div>
            </div>
            <div style={{ background: 'rgba(52, 152, 219, 0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#3498db', opacity: 0.8, textTransform: 'uppercase' }}>Matchs Joués</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>
                {Math.floor(statEntries.reduce((sum, [, s]) => sum + s.matches, 0) / 2)}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase' }}>Paiements</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                <span style={{ color: '#2ecc71' }}>{statEntries.filter(([, s]) => s.losses > 0 && s.amountOwed === 0).length} PAID</span>
                <span style={{ margin: '0 0.5rem', opacity: 0.3 }}>|</span>
                <span style={{ color: '#e74c3c' }}>{statEntries.filter(([, s]) => s.amountOwed > 0).length} Dus</span>
              </div>
            </div>
          </div>
        )}

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
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: '#f1c40f' }}>Tarif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statEntries as [string, PlayerStat][]).map(([name, s]) => (
                      <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 'bold' }}>{name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{s.matches} match{s.matches > 1 ? 's' : ''}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#2ecc71', fontWeight: 'bold' }}>{s.wins}</td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#e74c3c', fontWeight: 'bold' }}>{s.losses}</td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                          {s.losses > 0 ? (
                            s.amountOwed === 0 ? (
                              <span style={{ background: '#2ecc71', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>PAID</span>
                            ) : (
                              <span style={{ background: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>DUE</span>
                            )
                          ) : null}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: s.amountOwed > 0 ? '#f1c40f' : '#2ecc71', fontWeight: 'bold' }}>
                          <div style={{ fontSize: s.amountOwed > 0 ? '1rem' : '0.85rem' }}>{s.amountOwed > 0 ? `${s.amountOwed} DH` : `✓ ${s.totalPaid || 0} DH`}</div>
                          {isAdmin && s.amountOwed > 0 && (
                            <button onClick={() => markPaid(name)}
                              style={{ display: 'block', marginTop: '0.25rem', width: '100%', padding: '0.25rem', background: '#2ecc71', border: 'none', color: 'black', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
                              ✓ Marquer Payé
                            </button>
                          )}
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

            {statEntries.length > 0 && isAdmin && (
              <button onClick={clearStats}
                style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)', color: '#e74c3c', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>
                🗑️ Effacer toutes les statistiques
              </button>
            )}

            {/* Admin Login Toggle */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              {isAdmin ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button onClick={archiveDailyReports} style={{ width: '100%', padding: '0.75rem', background: '#e67e22', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>
                    🌅 Archiver la Journée (New Day)
                  </button>
                  <button onClick={logoutAdmin} style={{ width: '100%', padding: '0.5rem', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)' }}>Déconnexion Admin</button>
                </div>
              ) : (
                <>
                  {!showAdminLogin ? (
                    <button onClick={() => setShowAdminLogin(true)} style={{ width: '100%', padding: '0.5rem', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)' }}>Mode Admin (Gestion des paiements)</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        placeholder="Mot de passe"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loginAdmin()}
                        style={{ flex: 1, padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                      />
                      <button onClick={loginAdmin} style={{ padding: '0.5rem 1rem', background: 'var(--color-accent-green)', color: 'black', fontWeight: 'bold', borderRadius: 'var(--radius-sm)', border: 'none' }}>Login</button>
                    </div>
                  )}
                </>
              )}
            </div>
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
