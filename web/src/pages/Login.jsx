import { useState } from "react";

function Login({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
// validation mail et mot de passe
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) { alert("Email invalide"); return; }
    if (password.length < 6) { alert("Mot de passe trop court"); return; }

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erreur de connexion, verifie votre mail ou mot de passe"); return; }

      const user = data.user; // recupere les inos lors du login
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userNom", user.nom);
      localStorage.setItem("userRole", user.role);
      // redirection suivant le role choisi
      if (user.role === "admin") onNavigate("adminDashboard");
      else onNavigate("memberDashboard");
    } catch (err) {
      console.error(err);
      alert("Impossible de contacter le serveur.");
    }
  };

  return (
    <div className="page page-brown">
      <form onSubmit={handleSubmit}>
        <h2>Connexion</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required /><br />
        <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required /><br />
         <button type="submit">Se connecter</button>
        <button type="button" onClick={() => onNavigate("accueil")}>Retour</button>
      </form>
    </div>
  );
}

export default Login;