import { useState, useEffect } from "react";

function MemberDashboard({ onNavigate, setPaymentInfo }) {
  // 1. Configuration de l'URL (Local ou Production)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [groupe, setGroupe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  
  const userId = localStorage.getItem("userId");
  const userNom = localStorage.getItem("userNom") || "Membre";
  const userEmail = localStorage.getItem("userEmail") || "Email inconnu";

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const loadDashboardData = async () => {
        try {
            // 2. Utilisation de API_URL
            const groupRes = await fetch(`${API_URL}/api/user/group/${userId}`);
            const groupData = await groupRes.json();

            if (!groupData || groupData.error) return;

            setGroupe(groupData);
            localStorage.setItem("groupeId", groupData.id);

            // Petit délai pour la fluidité UX
            await new Promise(r => setTimeout(r, 100));

            const payRes = await fetch(`${API_URL}/api/paiement/status/${userId}/${groupData.id}?t=${Date.now()}`);
            if (payRes.ok) {
                const payData = await payRes.json();
                if (Array.isArray(payData)) setPayments(payData);
            }
        } catch (error) {
            console.error("Erreur dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    loadDashboardData();
  }, [userId]);

  // --- CALCULS INTELLIGENTS (Gestion des Annulations) ---

  // 1. Filtrer les "vraies" cotisations (On ignore les pots reçus et les annulés)
  const validContributions = payments.filter(p => 
      p.periodNumber !== 999 && // Pas le pot reçu
      p.status !== 'annulé' && 
      p.status !== 'rejeté'
  );

  // 2. Calcul du total cotisé (Argent sorti de la poche)
  const totalCotise = validContributions.reduce((acc, curr) => {
      if (['paid', 'validé', 'valide', 'en_attente'].includes(curr.status)) {
          return acc + (parseFloat(curr.amount) || 0);
      }
      return acc;
  }, 0);

  // 3. Logique de progression (Tours payés)
  // On prend le max des périodes valides.
  const lastPaidPeriod = validContributions.length > 0 
      ? Math.max(...validContributions.map(p => p.periodNumber)) 
      : 0;
      
  const nextPeriod = lastPaidPeriod + 1;
  const isCycleComplete = groupe && nextPeriod > Number(groupe.frequence);

  // 4. Vérifier si j'ai reçu le pot (statut transféré actif)
  const myPayout = payments.find(p => p.periodNumber === 999 && p.status === 'transféré');

  // --- HANDLERS ---
  const handlePaymentNavigation = (type) => {
    if (setPaymentInfo && groupe) {
      setPaymentInfo({
        amount: groupe.montantParPeriode,
        groupeId: groupe.id,
        userId: userId,
        periodNumber: nextPeriod,
        returnTo: "memberDashboard"
      });
    }
    if (type === "stripe") onNavigate("paiementStripe");
    else onNavigate("paiement");
  };

  const getStatusBadge = (p) => {
    // Cas spécial : Pot reçu (Période 999)
    if (p.periodNumber === 999) {
        if (p.status === 'transféré') return <span className="badge" style={{background:'#2563eb', color:'white'}}>Reçu 💰</span>;
        if (p.status === 'annulé') return <span className="badge" style={{background:'#94a3b8', color:'white'}}>Annulé</span>;
    }

    const s = p.status ? p.status.toLowerCase() : "";
    if (s === 'paid' || s === 'validé' || s === 'valide') return <span className="badge badge-success">Validé</span>;
    if (s === 'en_attente') return <span className="badge badge-warning">En attente</span>;
    if (s === 'rejeté') return <span className="badge badge-danger">Rejeté</span>;
    if (s === 'annulé') return <span className="badge" style={{background:'#ccc'}}>Annulé</span>;
    
    return <span className="badge">{p.status}</span>;
  };

  if (loading) return <div className="page page-white"><p>Chargement...</p></div>;

  if (!groupe) return (
    <div className="page page-white">
        <div className="card" style={{textAlign:'center'}}>
            <h3>👋 Bienvenue</h3>
            <p>Vous n'avez pas de groupe.</p>
            <button className="btn-primary" onClick={() => onNavigate("memberView")}>Rejoindre un groupe</button>
        </div>
    </div>
  );

  return (
    <div className="page page-white">
      
      <header className="dashboard-header">
        <div>
          <h2>Tableau de Bord</h2>
          <p className="subtitle">Membre du Sol : <strong>{groupe.nomSol}</strong></p>
        </div>
      </header>

      {/* STATS GRID */}
      <div className="stats-grid">
        <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div className="stat-info">
                <h4>Montant / Tour</h4>
                <p>{groupe.montantParPeriode} $</p>
            </div>
        </div>
        <div className="stat-card">
            <span className="stat-icon">📈</span>
            <div className="stat-info">
                <h4>Total Cotisé</h4>
                <p>{totalCotise.toFixed(2)} $</p>
            </div>
        </div>
        <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div className="stat-info">
                <h4>Progression</h4>
                <p>{lastPaidPeriod} / {groupe.frequence} Tours</p>
            </div>
        </div>
      </div>

      <div className="dashboard-content">
        
        {/* COLONNE GAUCHE */}
        <div className="left-column">
            <div className="card profile-card">
                <h3>👤 Mon Profil</h3>
                <div className="profile-details">
                    <div className="profile-row">
                        <span className="profile-label">Nom</span>
                        <span className="profile-value">{userNom}</span>
                    </div>
                    <div className="profile-row">
                        <span className="profile-label">Email</span>
                        <span className="profile-value">{userEmail}</span>
                    </div>
                </div>
                <hr className="divider"/>
                <button className="btn-logout" onClick={() => onNavigate("accueil")}>
                   Déconnexion
                </button>
            </div>

            <div className="card action-card">
              <h3>⚡ Statut du Compte</h3>

              {/* Message Spécial si on a reçu le pot */}
              {myPayout && (
                  <div style={{marginBottom:'20px', padding:'15px', background:'#eff6ff', borderRadius:'8px', border:'1px solid #bfdbfe'}}>
                      <h4 style={{color:'#1e40af', margin:0}}>🏆 Vous avez reçu votre lot !</h4>
                      <p style={{fontSize:'0.9rem', color:'#1e3a8a', margin:'5px 0 0 0'}}>
                          Virement de <strong>{myPayout.amount}$</strong> effectué le {new Date(myPayout.createdAt).toLocaleDateString()}.
                      </p>
                  </div>
              )}

              {isCycleComplete ? (
                <div style={{textAlign: 'center', padding: '20px'}}>
                    <div style={{fontSize: '3rem', marginBottom: '10px'}}>🎉</div>
                    <h4 style={{color: '#166534', marginBottom: '10px'}}>Cycle Terminé !</h4>
                    <p style={{color: '#475569'}}>Félicitations, vous avez payé la totalité de vos {groupe.frequence} tours.</p>
                    <div className="badge badge-success" style={{marginTop: '15px', fontSize:'1rem', padding:'10px 20px'}}>
                        ✅ Compte à jour
                    </div>
                </div>
              ) : (
                <>
                  <p>Contribution pour la période <strong>#{nextPeriod}</strong>.</p>
                  {!showPaymentChoice ? (
                    <button className="btn-primary" onClick={() => setShowPaymentChoice(true)}>
                      💳 Payer {groupe.montantParPeriode} $
                    </button>
                  ) : (
                    <div className="payment-options">
                      <p className="payment-label">Choisissez une méthode :</p>
                      <button onClick={() => handlePaymentNavigation("stripe")} className="btn-stripe">
                        💳 Carte Bancaire (Stripe)
                      </button>
                      <button onClick={() => handlePaymentNavigation("offline")} className="btn-offline">
                        💵 Espèces (Offline)
                      </button>
                      <button onClick={() => setShowPaymentChoice(false)} className="btn-cancel">
                        Annuler
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
        </div>

        {/* COLONNE DROITE : Historique */}
        <div className="card history-card">
          <h3>📜 Historique des transactions</h3>
          {payments.length === 0 ? (
            <div className="empty-state">
                <p>Aucune transaction enregistrée.</p>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Date</th>
                  <th>Détail</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, index) => {
                    // Si c'est annulé, on l'affiche un peu effacé pour pas faire peur
                    const isCancelled = p.status === 'annulé';
                    const isPot = p.periodNumber === 999;

                    return (
                        <tr key={index} style={{
                            opacity: isCancelled ? 0.5 : 1, 
                            background: isPot && !isCancelled ? '#f0f9ff' : 'transparent',
                            textDecoration: isCancelled ? 'line-through' : 'none'
                        }}>
                            <td>
                                {isPot ? (
                                    <span className="badge" style={{background:'#2563eb', color:'white'}}>POT</span>
                                ) : (
                                    <span className="period-tag">#{p.periodNumber}</span>
                                )}
                            </td>
                            <td style={{color: '#64748b', fontSize: '0.9rem'}}>
                                {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td style={{textTransform: 'capitalize', fontSize:'0.9rem'}}>
                                {isPot ? 'Réception Lot' : (p.method === 'stripe' ? '💳 Carte' : '💵 Espèces')}
                            </td>
                            <td>
                                <strong style={{color: isPot && !isCancelled ? '#2563eb' : 'inherit'}}>
                                    {isPot ? '+' : ''}{p.amount || groupe.montantParPeriode} $
                                </strong>
                            </td>
                            <td>{getStatusBadge(p)}</td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

export default MemberDashboard;