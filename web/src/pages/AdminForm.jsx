import { useState } from "react";

function AdminForm({ onNavigate, userData }) {
  // Récupération de l'URL de l'API (Compatible Local & AWS)
  // Si vous utilisez Vite, configurez VITE_API_URL dans le fichier .env
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [form, setForm] = useState({
    nomSol: "",
    montantParPeriode: "",
    frequence: "",
    statut: "En attente", // Valeur par défaut plus logique
    createdBy: userData.email || "Admin",
    nombreParticipants: "",
  });

  const [loading, setLoading] = useState(false);
  const [ordreBeneficiaires, setOrdreBeneficiaires] = useState([]);

  // Gestion des champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Génération visuelle de l'ordre (Simulation)
    if (name === "nombreParticipants") {
      const nb = parseInt(value, 10);
      if (!isNaN(nb) && nb > 0) {
        const ordre = Array.from({ length: nb }, (_, i) => `Tour ${i + 1} : Participant n°${i + 1}`);
        setOrdreBeneficiaires(ordre);
      } else {
        setOrdreBeneficiaires([]);
      }
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nomSol || !form.montantParPeriode || !form.frequence || !form.nombreParticipants) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/groupes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création.");
      }

      alert("✅ Groupe créé avec succès !");
      
      // Une fois créé, on redirige vers le Dashboard Admin (ou confirmation)
      onNavigate("adminDashboard"); 

    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-white">
      <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
        
        <div style={{textAlign: 'center', marginBottom: '30px'}}>
            <h2 style={{color: '#1e293b'}}>Création d'un nouveau Sol 🆕</h2>
            <p className="subtitle">Définissez les règles du groupe d'épargne.</p>
        </div>

        <form onSubmit={handleSubmit}>
          
          <label style={{fontWeight:'bold', color:'#64748b'}}>Nom du Groupe</label>
          <input
            type="text"
            name="nomSol"
            placeholder="Ex: Tontine Famille 2025"
            value={form.nomSol}
            onChange={handleChange}
            required
          />

          <div style={{display:'flex', gap:'20px'}}>
              <div style={{flex:1}}>
                  <label style={{fontWeight:'bold', color:'#64748b'}}>Montant (par tour)</label>
                  <input
                    type="number"
                    name="montantParPeriode"
                    placeholder="Ex: 100"
                    value={form.montantParPeriode}
                    onChange={handleChange}
                    min="1"
                    required
                  />
              </div>
              <div style={{flex:1}}>
                  <label style={{fontWeight:'bold', color:'#64748b'}}>Fréquence (Jours)</label>
                  <input
                    type="number"
                    name="frequence"
                    placeholder="Ex: 30"
                    value={form.frequence}
                    onChange={handleChange}
                    min="1"
                    required
                  />
              </div>
          </div>

          <label style={{fontWeight:'bold', color:'#64748b'}}>Nombre de Participants</label>
          <input
            type="number"
            name="nombreParticipants"
            placeholder="Ex: 10"
            value={form.nombreParticipants}
            onChange={handleChange}
            min="2"
            required
          />

          {/* Champs en lecture seule (Grisés) */}
          <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', marginBottom:'20px', border:'1px solid #e2e8f0'}}>
              <p style={{margin:0, fontSize:'0.9rem'}}>👤 <strong>Créateur :</strong> {form.createdBy}</p>
              <p style={{margin:'5px 0 0 0', fontSize:'0.9rem'}}>⚡ <strong>Statut initial :</strong> {form.statut}</p>
          </div>

          {/* Prévisualisation de l'ordre */}
          {ordreBeneficiaires.length > 0 && (
            <div style={{ marginBottom: "20px", padding: "15px", background: "#f0f9ff", borderRadius: "8px", border: "1px dashed #bae6fd" }}>
              <h4 style={{margin:"0 0 10px 0", color:"#0284c7"}}>📅 Simulation des tours :</h4>
              <ul style={{ margin: 0, paddingLeft: "20px", color:"#334155", fontSize:"0.9rem" }}>
                {ordreBeneficiaires.slice(0, 5).map((p, index) => (
                  <li key={index}>{p}</li>
                ))}
                {ordreBeneficiaires.length > 5 && <li>... et {ordreBeneficiaires.length - 5} autres tours.</li>}
              </ul>
            </div>
          )}

          <div style={{display:'flex', gap:'15px', marginTop:'20px'}}>
              <button type="button" className="btn-secondary" onClick={() => onNavigate("accueil")}>
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Création en cours..." : "✅ Valider et Créer"}
              </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default AdminForm;