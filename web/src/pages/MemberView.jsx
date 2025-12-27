import { useEffect, useState } from "react";

function MemberView({ onNavigate }) {
  // 1. Configuration de l'URL (Local ou Production)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  const userId = localStorage.getItem("userId");
  const userNom = localStorage.getItem("userNom") || "Membre";

  // Charger les groupes disponibles
  useEffect(() => {
    const load = async () => {
      try {
        // 2. Appel API avec URL dynamique
        const res = await fetch(`${API_URL}/api/groupes`);
        const data = await res.json();
        setGroupes(data);
      } catch (err) {
        console.error(err);
        alert("Impossible de charger les groupes. Vérifiez votre connexion.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Action : Participer au groupe
  const handleParticiper = async (groupe) => {
    if (!userId) { 
        alert("Utilisateur non identifié. Veuillez vous reconnecter."); 
        onNavigate("accueil");
        return; 
    }
    
    setJoiningId(groupe.id);

    try {
      // 3. Appel API avec URL dynamique
      const res = await fetch(`${API_URL}/api/participer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupeId: groupe.id })
      });
      
      const data = await res.json();
      
      if (!res.ok) { 
          throw new Error(data.error || "Erreur lors de la participation");
      }

      // Succès
      localStorage.setItem("groupeId", groupe.id);
      localStorage.setItem("groupeChoisi", JSON.stringify(groupe));
      
      alert(`Félicitations ! Vous avez rejoint "${groupe.nomSol}".`);
      
      // Redirection vers le Dashboard Membre
      onNavigate("memberDashboard");

    } catch (err) {
      console.error(err);
      alert(err.message || "Impossible de contacter le serveur.");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) return <div className="page page-white"><p>Chargement des offres...</p></div>;

  return (
    <div className="page page-white">
      
      {/* En-tête de bienvenue */}
      <div style={{textAlign: 'center', marginBottom: '40px', maxWidth: '600px'}}>
        <h2 style={{fontSize: '2rem', color: '#1e293b', marginBottom: '10px'}}>👋 Bienvenue, {userNom} !</h2>
        <p className="subtitle">
            Rejoignez une communauté d'épargne (Sol) dès maintenant pour commencer vos cotisations.
        </p>
      </div>

      {groupes.length === 0 ? (
        <div className="card" style={{textAlign: 'center'}}>
            <p>Aucun groupe disponible pour le moment.</p>
        </div>
      ) : (
        // Grille des groupes
        <div className="groups-grid">
          {groupes.map(g => (
            <div key={g.id} className="group-card-modern">
              <div className="card-header-group">
                <h3>{g.nomSol}</h3>
                <span className={`badge ${g.statut === 'Actif' ? 'badge-success' : 'badge-warning'}`}>
                    {g.statut}
                </span>
              </div>
              
              <div className="card-body-group">
                <div className="info-row">
                    <span className="icon">💰</span>
                    <div>
                        <span className="label">Montant</span>
                        <strong>{g.montantParPeriode} $</strong>
                    </div>
                </div>
                <div className="info-row">
                    <span className="icon">🔄</span>
                    <div>
                        <span className="label">Fréquence</span>
                        <strong>{g.frequence} Tours</strong>
                    </div>
                </div>
                <div className="info-row">
                    <span className="icon">👥</span>
                    <div>
                        <span className="label">Membres</span>
                        <strong>{g.nombreParticipants} inscrits</strong>
                    </div>
                </div>
              </div>

              <button 
                className="btn-primary" 
                onClick={() => handleParticiper(g)}
                disabled={joiningId === g.id}
                style={{marginTop: '20px', width: '100%'}}
              >
                {joiningId === g.id ? "Traitement..." : "Rejoindre ce Sol 🚀"}
              </button>
            </div>
          ))}
        </div>
      )}

      <button 
        className="btn-link" 
        onClick={() => onNavigate("accueil")}
        style={{marginTop: '30px', color: '#ef4444'}}
      >
        Se déconnecter
      </button>
    </div>
  );
}

export default MemberView;