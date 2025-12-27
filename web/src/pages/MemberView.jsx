import { useEffect, useState } from "react";

function MemberView({ onNavigate }) {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null); // Pour gérer l'état de chargement du bouton

  const userId = localStorage.getItem("userId");
  const userNom = localStorage.getItem("userNom") || "Membre";

  // Charger les groupes disponibles
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/groupes");
        const data = await res.json();
        // On peut filtrer ici pour ne montrer que les groupes "Actif" ou "En attente" si besoin
        setGroupes(data);
      } catch (err) {
        console.error(err);
        alert("Impossible de charger les groupes");
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
    
    setJoiningId(groupe.id); // Active le chargement sur ce bouton spécifique

    try {
      const res = await fetch("http://localhost:5000/api/participer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupeId: groupe.id })
      });
      
      const data = await res.json();
      
      if (!res.ok) { 
          alert(data.error || "Erreur lors de la participation"); 
          setJoiningId(null);
          return; 
      }

      // Succès : On sauvegarde et on redirige vers le Dashboard
      localStorage.setItem("groupeId", groupe.id);
      localStorage.setItem("groupeChoisi", JSON.stringify(groupe));
      
      alert(`Félicitations ! Vous avez rejoint "${groupe.nomSol}".`);
      
      // 🔥 REDIRECTION VERS LE DASHBOARD MEMBRE
      onNavigate("memberDashboard");

    } catch (err) {
      console.error(err);
      alert("Impossible de contacter le serveur.");
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