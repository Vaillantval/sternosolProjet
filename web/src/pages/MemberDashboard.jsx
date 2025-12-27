import { useEffect, useState } from "react";

function MemberDashboard({ onNavigate, setPaymentInfo }) {
  const [groupe, setGroupe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  
  const userId = localStorage.getItem("userId");
  const userNom = localStorage.getItem("userNom") || "Membre";
  const userEmail = localStorage.getItem("userEmail") || "Email inconnu";

  useEffect(() => {
    if (!userId) {
        setLoading(false);
        return;
    }

    // On utilise une fonction asynchrone pour mieux gérer les erreurs et l'ordre
    const loadDashboardData = async () => {
        try {
            console.log("🔄 1. Récupération du groupe...");
            const groupRes = await fetch(`http://localhost:5000/api/user/group/${userId}`);
            const groupData = await groupRes.json();

            if (!groupData || groupData.error) {
                console.warn("⚠️ Pas de groupe trouvé.");
                return;
            }

            setGroupe(groupData);
            localStorage.setItem("groupeId", groupData.id);

            console.log("🔄 2. Récupération de l'historique...");
            // On ajoute un petit délai artificiel de 100ms pour éviter les conflits réseau
            await new Promise(r => setTimeout(r, 100));

            const payRes = await fetch(`http://localhost:5000/api/paiement/status/${userId}/${groupData.id}?t=${Date.now()}`);
            
            if (payRes.ok) {
                const payData = await payRes.json();
                console.log("✅ 3. Paiements reçus :", payData);
                
                if (Array.isArray(payData)) {
                    setPayments(payData);
                }
            } else {
                console.error("❌ Erreur serveur paiements");
            }

        } catch (error) {
            console.error("❌ Erreur critique dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    loadDashboardData();
  }, [userId]);

  // --- CALCULS ---
  const totalCotise = payments.reduce((acc, curr) => {
      // On accepte 'paid', 'validé' (sans accent ou avec), 'en_attente'
      if (['paid', 'validé', 'valide', 'en_attente'].includes(curr.status)) {
          return acc + (parseFloat(curr.amount) || 0);
      }
      return acc;
  }, 0);

  const lastPaidPeriod = payments.length > 0 ? Math.max(...payments.map(p => p.periodNumber)) : 0;
  const nextPeriod = lastPaidPeriod + 1;
  const isCycleComplete = groupe && nextPeriod > Number(groupe.frequence);

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

  const getStatusBadge = (status) => {
    // Normalisation pour éviter les soucis de casse ou d'accents
    const s = status ? status.toLowerCase() : "";
    if (s === 'paid' || s === 'validé' || s === 'valide') return <span className="badge badge-success">Validé</span>;
    if (s === 'en_attente') return <span className="badge badge-warning">En attente</span>;
    return <span className="badge badge-danger">{status}</span>;
  };

  if (loading) return <div className="page page-white"><p>Chargement...</p></div>;

  if (!groupe) return (
    <div className="page page-white">
        <div className="card" style={{textAlign:'center'}}>
            <h3>👋 Bienvenue</h3>
            <p>Vous n'avez pas de groupe.</p>
            <button className="btn-primary" onClick={() => onNavigate("member")}>Rejoindre un groupe</button>
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
                  <th>Méthode</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, index) => (
                  <tr key={index}>
                    <td><span className="period-tag">#{p.periodNumber}</span></td>
                    <td style={{color: '#64748b', fontSize: '0.9rem'}}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td style={{textTransform: 'capitalize'}}>
                        {p.method === 'stripe' ? '💳 Carte' : '💵 Espèces'}
                    </td>
                    <td><strong>{p.amount || groupe.montantParPeriode} $</strong></td>
                    <td>{getStatusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

export default MemberDashboard;