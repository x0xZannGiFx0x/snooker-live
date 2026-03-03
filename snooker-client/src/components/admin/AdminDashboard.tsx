import { useState, useEffect } from 'react';

interface PlayerStat {
    wins: number;
    losses: number;
    matches: number;
    amountOwed: number;
    totalPaid?: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Record<string, PlayerStat>>({});
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [showAdminLogin, setShowAdminLogin] = useState(true);

    const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/api/stats`);
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error('Failed to fetch stats', e);
        }
    };

    const checkAdminStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/check`, { credentials: 'include' });
            if (res.ok) {
                setIsAdmin(true);
                setShowAdminLogin(false);
                fetchStats();
            }
        } catch (e) {
            console.error('Failed to check admin status', e);
        }
    };

    useEffect(() => {
        checkAdminStatus();
    }, []);

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
                fetchStats();
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
            setShowAdminLogin(true);
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

    const resetAllStats = async () => {
        if (!confirm('Voulez-vous vraiment réinitialiser toutes les statistiques ? Cette action est irréversible.')) return;
        try {
            const res = await fetch(`${API_URL}/api/stats`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                alert('Statistiques réinitialisées avec succès !');
                fetchStats();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Erreur (${res.status}): ${errorData.error || 'Impossible de réinitialiser.'}`);
            }
        } catch (e) {
            console.error(e);
            alert(`Erreur de connexion: ${e instanceof Error ? e.message : 'Erreur réseau'}`);
        }
    };

    const statEntries = Object.entries(stats);
    const totalOwed = statEntries.reduce((sum, [, s]) => sum + s.amountOwed, 0);
    const totalMatchesPlayed = Math.floor(statEntries.reduce((sum, [, s]) => sum + s.matches, 0) / 2);
    const calculatedTotalEarnings = totalMatchesPlayed * 20;

    if (showAdminLogin && !isAdmin) {
        return (
            <div className="app-container flex-center" style={{ minHeight: '100vh' }}>
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>🔐 Admin Login</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="password"
                            placeholder="Mot de passe"
                            value={adminPassword}
                            onChange={e => setAdminPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && loginAdmin()}
                            style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                        />
                        <button onClick={loginAdmin} style={{ padding: '1rem', background: 'var(--color-accent-green)', color: 'black', fontWeight: 'bold', borderRadius: 'var(--radius-full)', border: 'none' }}>Accéder au Panneau</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ padding: '1.5rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0 }}>🛡️ Panneau Administration</h1>
                    <button onClick={fetchStats} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>🔄 Rafraîchir</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(46, 204, 113, 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#2ecc71', opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}>REVENUS TOTAUX</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2ecc71', marginTop: '0.25rem' }}>{calculatedTotalEarnings} DH</div>
                    </div>
                    <div style={{ background: 'rgba(241, 196, 15, 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(241, 196, 15, 0.2)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#f1c40f', opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}>À ENCAISSER</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f1c40f', marginTop: '0.25rem' }}>{totalOwed} DH</div>
                    </div>
                    <div style={{ background: 'rgba(52, 152, 219, 0.1)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#3498db', opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}>MATCHS JOUÉS</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db', marginTop: '0.25rem' }}>{totalMatchesPlayed}</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 'bold' }}>PAIEMENTS</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                            <span style={{ color: '#2ecc71' }}>{statEntries.filter(([, s]) => s.losses > 0 && s.amountOwed === 0).length} PAID</span>
                            <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }}>|</span>
                            <span style={{ color: '#e74c3c' }}>{statEntries.filter(([, s]) => s.amountOwed > 0).length} Dus</span>
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 0.5fr 1fr 1.5fr', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        <div>Joueur</div>
                        <div style={{ textAlign: 'center', color: '#2ecc71' }}>V</div>
                        <div style={{ textAlign: 'center', color: '#e74c3c' }}>D</div>
                        <div style={{ textAlign: 'center' }}>Status</div>
                        <div style={{ textAlign: 'right', color: '#f1c40f' }}>Tarif</div>
                    </div>
                    {statEntries.map(([name, s]) => (
                        <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 0.5fr 1fr 1.5fr', alignItems: 'center', padding: '1.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{s.matches} match{s.matches > 1 ? 's' : ''}</div>
                            </div>
                            <div style={{ textAlign: 'center', color: '#2ecc71', fontWeight: 'bold' }}>{s.wins}</div>
                            <div style={{ textAlign: 'center', color: '#e74c3c', fontWeight: 'bold' }}>{s.losses}</div>
                            <div style={{ textAlign: 'center' }}>
                                {s.amountOwed > 0 ? (
                                    <span style={{ background: '#e74c3c', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold' }}>DUE</span>
                                ) : (
                                    s.losses > 0 && <span style={{ background: '#2ecc71', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold' }}>PAID</span>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {s.amountOwed > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <span style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: '1.1rem' }}>{s.amountOwed} DH</span>
                                        <button onClick={() => markPaid(name)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#2ecc71', color: 'black', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>✓ Marquer Payé</button>
                                    </div>
                                ) : (
                                    <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.9rem' }}>✓ 0 DH</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button onClick={archiveDailyReports} style={{ width: '100%', padding: '1rem', background: '#e67e22', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer' }}>
                        🌅 Archiver la Journée (Nouvelle Session)
                    </button>
                    <button onClick={resetAllStats} style={{ width: '100%', padding: '1rem', background: '#c0392b', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer' }}>
                        🗑️ Réinitialiser toutes les statistiques
                    </button>
                    <button onClick={logoutAdmin} style={{ background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Déconnexion Admin</button>
                </div>
            </div>
        </div>
    );
}
