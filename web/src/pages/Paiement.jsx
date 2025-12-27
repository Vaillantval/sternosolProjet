import React, { useEffect, useState } from "react";

export default function Paiement({ onNavigate, amount }) {
  // 1. Configuration de l'URL (Local ou Production)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Récupération des infos locales
  const userId = localStorage.getItem("userId");
  const groupeId = localStorage.getItem("groupeId");
  
  // États
  const [frequence, setFrequence] = useState(0);
  const [montant, setMontant] = useState(amount || 0);
  const [paidPeriods, setPaidPeriods] = useState([]); 
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Chargement des données au montage
  useEffect(() => {
    if (!groupeId || !userId) {
        setDataLoading(false);
        return;
    }

    const loadData = async () => {
      try {
        // 2. Appel API avec URL dynamique (Infos Groupe)
        const gr = await fetch(`${API_URL}/api/groupes/${groupeId}`);
        if (gr.ok) {
            const group = await gr.json();
            setFrequence(Number(group.frequence) || 0);
            if (!amount) setMontant(group.montantParPeriode);
        }

        // 3. Appel API avec URL dynamique (Historique)
        const st = await fetch(`${API_URL}/api/paiement/status/${userId}/${groupeId}`);
        if (st.ok) {
            const paid = await st.json();
            setPaidPeriods(paid || []);
            
            // Pré-sélectionner la prochaine période impayée
            // Note : Il faut avoir récupéré 'group' avant, ici on fait simple
            // Idéalement on ferait ça après le await de group
        }
      } catch (err) {
        console.error(err);
        setMsg({ text: "Erreur de chargement des données.", type: "error" });
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [groupeId, userId, amount]);

  // Vérifie si une période est déjà payée ou en attente
  const isPaidOrPending = (period) => {
    return paidPeriods.some((p) => Number(p.periodNumber) === Number(period));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });

    if (!userId || !groupeId) return setMsg({ text: "Erreur utilisateur.", type: "error" });
    if (!selectedPeriod) return setMsg({ text: "Veuillez sélectionner une période.", type: "error" });
    if (!file) return setMsg({ text: "Veuillez choisir un fichier (PDF/JPG/PNG).", type: "error" });

    setLoading(true);
    try {
      const form = new FormData();
      form.append("receipt", file);
      form.append("userId", userId);
      form.append("groupeId", groupeId);
      form.append("periodNumber", selectedPeriod);

      // 4. Appel API avec URL dynamique (Upload)
      const res = await fetch(`${API_URL}/api/paiement/upload`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      
      if (!res.ok) {
        setMsg({ text: data.error || "Erreur lors de l'envoi.", type: "error" });
      } else {
        setMsg({ text: "✅ Reçu envoyé avec succès ! En attente de validation.", type: "success" });
        
        setPaidPeriods((prev) => [
          ...prev,
          { periodNumber: Number(selectedPeriod), status: "en_attente", filePath: data.filePath },
        ]);
        setFile(null);
        
        setTimeout(() => {
            onNavigate("memberDashboard");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setMsg({ text: "Erreur réseau. Vérifiez votre connexion.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) return <div className="page page-white"><p>Chargement...</p></div>;

  return (
    <div className="page page-white">
      <div className="card" style={{ maxWidth: "600px", width: "100%" }}>
        
        <button 
            onClick={() => onNavigate("memberDashboard")} 
            className="btn-secondary" 
            style={{ marginBottom: "20px", width: "auto" }}
        >
          ⬅ Retour au Dashboard
        </button>

        <h2 style={{ color: "#2563eb", marginBottom: "10px" }}>Paiement Hors Ligne</h2>
        
        <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px dashed #cbd5e1", marginBottom: "25px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>Instructions de paiement :</h4>
            <ul style={{ textAlign: "left", paddingLeft: "20px", color: "#475569", margin: 0 }}>
                <li style={{marginBottom: "8px"}}>Effectuez un virement ou dépôt de <strong>{montant} $</strong>.</li>
                <li style={{marginBottom: "8px"}}>Coordonnées : <em>(À définir par l'admin)</em></li>
                <li>Prenez une photo claire du reçu et uploadez-la ci-dessous.</li>
            </ul>
        </div>

        <form onSubmit={handleUpload}>
            
            <label style={{display:"block", fontWeight:"600", marginBottom:"8px", textAlign:"left", color:"#334155"}}>
                1. Pour quelle période payez-vous ?
            </label>
            <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{ marginBottom: "20px" }}
                required
            >
                <option value="">-- Choisir une période --</option>
                {Array.from({ length: frequence }, (_, i) => {
                    const num = i + 1;
                    const paid = isPaidOrPending(num);
                    return (
                        <option key={i} value={num} disabled={paid} style={{color: paid ? '#ccc' : '#000'}}>
                            Période #{num} {paid ? "(Déjà payé/En attente)" : ""}
                        </option>
                    );
                })}
            </select>

            <label style={{display:"block", fontWeight:"600", marginBottom:"8px", textAlign:"left", color:"#334155"}}>
                2. Preuve de paiement (Image ou PDF)
            </label>
            <input 
                type="file" 
                accept="application/pdf,image/*" 
                onChange={handleFileChange}
                required 
            />

            {msg.text && (
                <div style={{
                    margin: "15px 0", 
                    padding: "10px", 
                    borderRadius: "8px",
                    background: msg.type === "error" ? "#fee2e2" : "#dcfce7",
                    color: msg.type === "error" ? "#991b1b" : "#166534",
                    fontWeight: "bold"
                }}>
                    {msg.text}
                </div>
            )}

            <button 
                type="submit" 
                className="btn-offline" 
                disabled={loading || !selectedPeriod} 
                style={{ marginTop: "10px" }}
            >
                {loading ? "Envoi en cours..." : "📤 Envoyer le reçu"}
            </button>
        </form>

      </div>
    </div>
  );
}