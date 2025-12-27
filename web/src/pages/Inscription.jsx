import { useState, useEffect } from "react";

function Inscription({ onNavigate, userData, setUserData }) {
  // 1. Configuration URL (Local ou Prod)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [form, setForm] = useState({
    nom: userData.nom || "",
    prenom: userData.prenom || "",
    email: userData.email || "",
    password: userData.password || "",
    telephone: userData.telephone || "",
    banque: userData.banque || "",
    dateInscription: userData.dateInscription || new Date().toISOString().split("T")[0], // Auto-remplissage
    role: userData.role || "member" // Par défaut Membre
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Regex (Conservées selon ta logique)
  const phoneRe = /^\+[1-9]\d{7,14}$/;
  const bankRe = /^\d{8,20}$/;

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (setUserData) setUserData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!/^[a-zA-Z\s-]+$/.test(form.nom) || !/^[a-zA-Z\s-]+$/.test(form.prenom)) {
      alert("Nom et prénom doivent contenir uniquement des lettres (espaces et tirets autorisés).");
      return;
    }
    if (!phoneRe.test(form.telephone)) { alert("Téléphone invalide (Format: +509...)."); return; }
    if (form.password.length < 6) { alert("Le mot de passe doit faire au moins 6 caractères."); return; }
    if (!bankRe.test(form.banque)) { alert("Numéro bancaire invalide."); return; }

    const today = new Date().toISOString().split("T")[0];
    if (form.dateInscription !== today) { alert("La date d'inscription doit être aujourd'hui."); return; }
    if (!form.role) { alert("Choisissez un rôle."); return; }

    setLoading(true);

    try {
      // 2. Utilisation de API_URL
      const res = await fetch(`${API_URL}/api/inscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      // 3. Stockage Session
      if (data.userId) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userEmail", form.email);
        localStorage.setItem("userNom", form.nom);
        // Si le backend renvoie un token JWT, stocke-le aussi ici :
        // localStorage.setItem("token", data.token);
      }

      alert("✅ Inscription réussie ! Bienvenue.");
      
      // Redirection intelligente
      onNavigate(form.role === "admin" ? "admin" : "memberView"); // "memberView" pour choisir un groupe

    } catch (err) {
      console.error(err);
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-white">
      <div className="card" style={{ maxWidth: "500px", margin: "0 auto" }}>
        
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <h2>Inscription ✍️</h2>
            <p className="subtitle">Rejoignez un Sol et commencez à épargner.</p>
        </div>

        <form onSubmit={handleSubmit}>
          
          <div style={{display:'flex', gap:'15px'}}>
              <div style={{flex:1}}>
                <label>Nom</label>
                <input name="nom" placeholder="Ex: Dupont" value={form.nom} onChange={handleChange} required />
              </div>
              <div style={{flex:1}}>
                <label>Prénom</label>
                <input name="prenom" placeholder="Ex: Jean" value={form.prenom} onChange={handleChange} required />
              </div>
          </div>

          <label>Email</label>
          <input type="email" name="email" placeholder="jean@exemple.com" value={form.email} onChange={handleChange} required />

          <label>Mot de passe</label>
          <div style={{ position: "relative" }}>
            <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                placeholder="******" 
                value={form.password} 
                onChange={handleChange} 
                required 
            />
            <span 
                onClick={() => setShowPassword(s => !s)} 
                style={{ position: "absolute", right: "10px", top: "35%", cursor: "pointer", fontSize: "1.2rem" }}
                title="Afficher/Masquer"
            >
                {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <label>Téléphone</label>
          <input name="telephone" placeholder="+509XXXXXXXX" value={form.telephone} onChange={handleChange} required />

          <label>Compte Bancaire (IBAN/Numéro)</label>
          <input name="banque" placeholder="Numéro bancaire" value={form.banque} onChange={handleChange} required />

          <label>Date d'inscription</label>
          <input type="date" name="dateInscription" value={form.dateInscription} onChange={handleChange} disabled style={{background:'#f1f5f9'}} />

          <div style={{marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
            <label style={{marginBottom: '10px', display:'block', fontWeight:'bold'}}>Je suis :</label>
            <div style={{display:'flex', gap:'20px'}}>
                <label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}>
                    <input type="radio" name="role" value="member" checked={form.role==="member"} onChange={handleChange}/> 
                    Membre
                </label>
                <label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}>
                    <input type="radio" name="role" value="admin" checked={form.role==="admin"} onChange={handleChange}/> 
                    Administrateur
                </label>
            </div>
          </div>

          <div style={{display:'flex', gap:'15px', marginTop:'25px'}}>
            <button type="button" className="btn-secondary" onClick={() => onNavigate("accueil")}>
                Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Inscription..." : "Valider l'inscription"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default Inscription;