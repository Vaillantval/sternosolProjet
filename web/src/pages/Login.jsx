import { useState } from "react";

function Login({ onNavigate }) {
  // 1. Configuration de l'URL (Local ou Production)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.includes("@")) { alert("Email invalide"); return; }
    if (password.length < 1) { alert("Veuillez entrer votre mot de passe"); return; }

    setLoading(true);

    try {
      // 2. Appel API avec l'URL dynamique
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Email ou mot de passe incorrect.");
      }

      // 3. Stockage des infos session
      const user = data.user;
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userNom", user.nom);
      localStorage.setItem("userRole", user.role);

      // 4. Redirection selon le rôle
      if (user.role === "admin") {
          onNavigate("adminDashboard");
      } else {
          // Si membre, on va au dashboard
          // Note : Si le membre n'a pas de groupe, le MemberDashboard 
          // le détectera et lui proposera d'en rejoindre un.
          onNavigate("memberDashboard");
      }

    } catch (err) {
      console.error(err);
      alert(err.message || "Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-white">
      <div className="card" style={{ maxWidth: "400px", margin: "0 auto", marginTop: "50px" }}>
        
        <div style={{textAlign: 'center', marginBottom: '30px'}}>
            <h2>Connexion 🔐</h2>
            <p className="subtitle">Accédez à votre espace Sol.</p>
        </div>

        <form onSubmit={handleSubmit}>
          
          <label style={{fontWeight:'bold', color:'#64748b'}}>Email</label>
          <input 
            type="email" 
            placeholder="votre@email.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            style={{width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #cbd5e1'}}
          />

          <label style={{fontWeight:'bold', color:'#64748b'}}>Mot de passe</label>
          <div style={{ position: "relative", marginBottom: '25px' }}>
            <input 
                type={showPassword ? "text" : "password"} 
                placeholder="******" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}}
            />
            <span 
                onClick={() => setShowPassword(s => !s)} 
                style={{ position: "absolute", right: "10px", top: "10px", cursor: "pointer", fontSize: "1.2rem" }}
                title="Afficher/Masquer"
            >
                {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
            </button>
            
            <button type="button" className="btn-secondary" onClick={() => onNavigate("accueil")}>
                Retour à l'accueil
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default Login;