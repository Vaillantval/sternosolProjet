import { useState, useEffect } from "react";

function AdminDashboard({ onNavigate }) {
  const [groupe, setGroupe] = useState(null);
  const [payments, setPayments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ collected: 0, pending: 0, distributed: 0 });

  const userEmail = localStorage.getItem("userEmail");
  const adminName = localStorage.getItem("userNom") || "Administrateur"; 

  useEffect(() => {
    if (userEmail) loadAdminData();
  }, [userEmail]);

  const loadAdminData = async () => {
    try {
      const groupRes = await fetch("http://localhost:5000/api/groupes");
      const groupData = await groupRes.json();
      const myGroup = groupData.find(g => g.createdBy === userEmail);
      
      if (!myGroup) { setLoading(false); return; }
      setGroupe(myGroup);

      const membersRes = await fetch(`http://localhost:5000/api/paiement/members/${myGroup.id}`);
      const membersData = await membersRes.json();
      
      const payRes = await fetch("http://localhost:5000/api/paiement/all");
      const payData = await payRes.json();
      
      if (Array.isArray(payData)) {
          setPayments(payData);
          calculateStats(payData);
          
          if (Array.isArray(membersData)) {
              const enrichedParticipants = membersData.map(member => {
                  const memberPayments = payData.filter(p => p.userId === member.id && p.groupeId === myGroup.id);
                  const cotisations = memberPayments.filter(p => 
                      (p.status === 'paid' || p.status === 'validé') && p.periodNumber !== 999
                  ).length;
                  const aRecuLePot = memberPayments.some(p => p.status === 'transféré');
                  return { ...member, cotisations, aRecuLePot };
              });
              setParticipants(enrichedParticipants);
          }
      }
    } catch (err) {
      console.error("Erreur chargement admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
      const collected = data
        .filter(p => (p.status === 'paid' || p.status === 'validé') && p.periodNumber !== 999)
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      const pending = data.filter(p => p.status === 'en_attente').length;
      const distributed = data
        .filter(p => p.status === 'transféré')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      setStats({ collected, pending, distributed });
  };

  const handleValidation = async (paymentId, newStatus) => {
    if (!window.confirm(`Passer ce reçu en statut : ${newStatus} ?`)) return;
    await apiUpdateStatus(paymentId, newStatus);
  };

  const handlePayout = async (user) => {
      const potAmount = groupe.frequence * groupe.montantParPeriode;
      if (!window.confirm(`CONFIRMATION : Verser le pot de ${potAmount}$ à ${user.nom} ?`)) return;
      try {
          const res = await fetch("http://localhost:5000/api/paiement/payout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, groupeId: groupe.id, amount: potAmount })
          });
          if (res.ok) { alert("✅ Virement enregistré !"); loadAdminData(); }
          else { const err = await res.json(); alert("Erreur : " + err.error); }
      } catch (err) { console.error(err); }
  };

  const handleCorrection = async (paymentId, currentStatus) => {
      let targetStatus = "";
      let message = "";
      if (currentStatus === 'validé' || currentStatus === 'rejeté') {
          targetStatus = 'en_attente'; message = "Annuler la décision et remettre en attente ?";
      }
      if (currentStatus === 'transféré') {
          targetStatus = 'annulé'; message = "⚠️ ANNULER ce virement ? Le membre pourra être payé à nouveau.";
      }
      if (targetStatus && window.confirm(`↩️ ${message}`)) await apiUpdateStatus(paymentId, targetStatus);
  };

  const apiUpdateStatus = async (paymentId, status) => {
      try {
        const res = await fetch("http://localhost:5000/api/paiement/update-status", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, status })
        });
        if (res.ok) loadAdminData();
      } catch (err) { console.error(err); }
  };

  if (loading) return <div className="page page-white"><p>Chargement...</p></div>;
  if (!groupe) return <div className="page page-white"><p>Aucun groupe trouvé.</p></div>;

  const potTotal = groupe.frequence * groupe.montantParPeriode;

  return (
    <div className="page page-white">
      
      {/* EN-TÊTE */}
      <header className="dashboard-header" style={{
          background: 'white', padding: '20px 30px', borderRadius: '12px', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '30px', borderLeft: '5px solid #b91c1c'
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
            <div>
                <h2 style={{color: '#1e293b', margin:0}}>🛡️ Espace Administration</h2>
                <div style={{display:'flex', gap:'20px', marginTop:'10px', color:'#64748b', fontSize:'0.95rem'}}>
                    <span>👤 Admin : <strong>{adminName}</strong></span>
                    <span>📂 Sol : <strong style={{color:'#2563eb'}}>{groupe.nomSol}</strong></span>
                    <span>🔄 Fréquence : <strong>{groupe.frequence} tours</strong></span>
                    <span>💵 Cotisation : <strong>{groupe.montantParPeriode}$</strong></span>
                    <span>💰 <strong>Pot Total : {potTotal}$</strong></span>
                </div>
            </div>
            <button className="btn-secondary" onClick={() => onNavigate("accueil")} style={{width:'auto', color:'#ef4444', borderColor:'#ef4444'}}>
                Déconnexion
            </button>
        </div>
      </header>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
            <span className="stat-icon" style={{background:'#fee2e2', color:'#b91c1c'}}>⚠️</span>
            <div className="stat-info"><h4>En Attente</h4><p>{stats.pending}</p></div>
        </div>
        <div className="stat-card">
            <span className="stat-icon" style={{background:'#dcfce7', color:'#166534'}}>📥</span>
            <div className="stat-info"><h4>Cotisations Reçues</h4><p>{stats.collected.toFixed(2)} $</p></div>
        </div>
        <div className="stat-card">
            <span className="stat-icon" style={{background:'#e0f2fe', color:'#2563eb'}}>📤</span>
            <div className="stat-info"><h4>Pots Versés</h4><p>{stats.distributed.toFixed(2)} $</p></div>
        </div>
      </div>

      <div className="dashboard-content-vertical">

        {/* --- SECTION CENTRALE --- */}
        <div className="admin-row" style={{gap: '40px'}}>
            
            {/* 1. VALIDATION */}
            <div className="card history-card card-validation">
                <h3>1️⃣ Validation Reçus (Entrées)</h3>
                <p className="subtitle">Contributions hors-ligne à vérifier.</p>
                <table className="history-table">
                    <thead><tr><th>Membre</th><th>Preuve</th><th>Actions</th></tr></thead>
                    <tbody>
                        {payments.filter(p => p.status === 'en_attente').length === 0 ? (
                            <tr><td colSpan="3" style={{textAlign:'center', color:'#999', padding:'20px'}}>Rien à valider.</td></tr>
                        ) : (
                            payments.filter(p => p.status === 'en_attente').map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{fontWeight:'bold'}}>{p.nom} {p.prenom}</div>
                                        <div style={{fontSize:'0.8rem'}}>{p.email}</div>
                                        <strong style={{color:'#166534'}}>+{p.amount} $</strong>
                                    </td>
                                    <td>
                                        {p.filePath ? <a href={`http://localhost:5000/uploads/${p.filePath}`} target="_blank" rel="noreferrer" className="link-receipt">📄 Voir</a> : "-"}
                                    </td>
                                    <td>
                                        <button className="btn-admin-small btn-validate" onClick={() => handleValidation(p.id, 'validé')}>✅</button>
                                        <button className="btn-admin-small btn-reject" onClick={() => handleValidation(p.id, 'rejeté')}>❌</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 2. LISTE MEMBRES & POT */}
            <div className="card history-card card-transfer">
                <h3>2️⃣ Gestion des Bénéficiaires</h3>
                <p className="subtitle">Liste de tous les membres ({participants.length}) et versement du Pot.</p>
                <table className="history-table">
                    <thead><tr><th>Membre</th><th>Progression</th><th>Action</th></tr></thead>
                    <tbody>
                        {participants.length === 0 ? (
                            <tr><td colSpan="3" style={{textAlign:'center', padding:'20px'}}>Aucun membre inscrit.</td></tr>
                        ) : (
                            participants.map(user => {
                                const progress = (user.cotisations / groupe.frequence) * 100;
                                const canReceivePot = user.cotisations > 0 && !user.aRecuLePot;

                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{fontWeight:'bold'}}>{user.nom} {user.prenom}</div>
                                            <div style={{fontSize:'0.8rem', color:'#64748b'}}>{user.email}</div>
                                        </td>
                                        <td style={{verticalAlign:'middle'}}>
                                            <div style={{fontSize:'0.85rem', marginBottom:'4px'}}>
                                                {user.cotisations} / {groupe.frequence} tours
                                            </div>
                                            <div style={{width:'100%', background:'#e2e8f0', height:'6px', borderRadius:'3px'}}>
                                                <div style={{width: `${Math.min(progress, 100)}%`, background: user.aRecuLePot ? '#10b981' : '#2563eb', height:'100%', borderRadius:'3px'}}></div>
                                            </div>
                                        </td>
                                        <td>
                                            {user.aRecuLePot ? (
                                                <span className="badge badge-success">✅ Payé</span>
                                            ) : (
                                                <button 
                                                    className="btn-admin-small btn-transfer" 
                                                    onClick={() => handlePayout(user)}
                                                    disabled={!canReceivePot}
                                                    style={{opacity: canReceivePot ? 1 : 0.5, cursor: canReceivePot ? 'pointer' : 'not-allowed'}}
                                                    title={!canReceivePot ? "Doit cotiser au moins 1 fois" : "Verser le pot"}
                                                >
                                                    💸 Verser
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

        </div> 

        {/* 3. HISTORIQUE GLOBAL (Source de vérité) */}
        <div className="card history-card">
            <h3>3️⃣ Historique des Transactions</h3>
            <p className="subtitle">Journal complet (Trié par date et heure).</p>
            <table className="history-table">
                <thead><tr><th>Date & Heure</th><th>Type</th><th>Membre / Détail</th><th>Montant</th><th>Statut</th><th>Correction</th></tr></thead>
                <tbody>
                    {payments.map(p => {
                        const isPayout = p.status === 'transféré' || p.status === 'annulé';
                        const isCancelled = p.status === 'annulé';
                        
                        // 🔥 DATE FORMAT : 25/12/2025 14:30
                        const formattedDate = new Date(p.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        });

                        return (
                            <tr key={p.id} style={{
                                background: isPayout ? '#eff6ff' : 'transparent', 
                                opacity: isCancelled ? 0.6 : 1,
                                textDecoration: isCancelled ? 'line-through' : 'none'
                            }}>
                                <td>{formattedDate}</td>
                                <td>
                                    {isPayout 
                                        ? <span className="badge" style={{background: isCancelled ? '#94a3b8' : '#2563eb', color:'white'}}>SORTIE</span> 
                                        : <span className="badge" style={{background:'#f1f5f9', color:'#333'}}>ENTRÉE</span>
                                    }
                                </td>
                                <td>
                                    <strong>{p.nom} {p.prenom}</strong>
                                    <div style={{fontSize:'0.8rem', color:'#666'}}>{p.email}</div>
                                </td>
                                <td>
                                    <strong style={{color: isPayout ? '#ef4444' : '#10b981', fontSize:'1rem'}}>
                                        {isPayout ? '-' : '+'}{p.amount} $
                                    </strong>
                                </td>
                                <td>
                                    {p.status === 'validé' && <span className="badge badge-success">Validé</span>}
                                    {p.status === 'en_attente' && <span className="badge badge-warning">En attente</span>}
                                    {p.status === 'rejeté' && <span className="badge badge-danger">Rejeté</span>}
                                    {p.status === 'transféré' && <span style={{color:'#2563eb', fontWeight:'bold'}}>Transféré</span>}
                                    {p.status === 'annulé' && <span className="badge" style={{background:'#94a3b8', color:'white'}}>Annulé</span>}
                                    {p.status === 'paid' && <span className="badge badge-success">Stripe OK</span>}
                                </td>
                                <td>
                                    {p.status !== 'annulé' && p.status !== 'paid' && (
                                        <button className="btn-admin-small btn-undo" onClick={() => handleCorrection(p.id, p.status)} title="Annuler">
                                            ↩️
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;