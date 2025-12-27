import React, { useState } from "react";

function Inscription({ onNavigate, userData, setUserData }) {
  const [form, setForm] = useState({
    nom: userData.nom || "",
    prenom: userData.prenom || "",
    email: userData.email || "",
    password: userData.password || "",
    telephone: userData.telephone || "",
    banque: userData.banque || "",
    dateInscription: userData.dateInscription || "",
    role: userData.role || ""
  });
  // restricctions dur les infos qu'il faut entrer
  const [showPassword, setShowPassword] = useState(false);

  const phoneRe = /^\+[1-9]\d{7,14}$/;
  const bankRe = /^\d{8,20}$/;

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    setUserData && setUserData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^[a-zA-Z]+$/.test(form.nom) || !/^[a-zA-Z]+$/.test(form.prenom)) {
      alert("Nom et prénom doivent contenir uniquement des lettres.");
      return;
    }
    if (!phoneRe.test(form.telephone)) { alert("Téléphone invalide."); return; }
    if (form.password.length < 6) { alert("Mot de passe trop court."); return; }
    if (!bankRe.test(form.banque)) { alert("Numéro bancaire invalide."); return; }

    const today = new Date().toISOString().split("T")[0];
    if (form.dateInscription !== today) { alert("Date d'inscription doit être aujourd'hui."); return; }
    if (!form.role) { alert("Choisissez un rôle."); return; }

    try {
      const res = await fetch("http://localhost:5000/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur inscription");
        return;
      }

      // stocke  userid & useremail
      if (data.userId) {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userEmail", form.email);
        localStorage.setItem("userNom", form.nom);
      }

      alert("Inscription réussie");
      onNavigate(form.role === "admin" ? "admin" : "member");// redirection selon le role 
    } catch (err) {
      console.error(err);
      alert("Impossible de contacter le serveur.");
    }
  };

  return (
    <div className="page page-inscription page-brown">
      <form onSubmit={handleSubmit}>
        <h2>Inscription dans u Sol</h2>
        <input name="nom" placeholder="Nom" value={form.nom} onChange={handleChange} /><br />
        <input name="prenom" placeholder="Prénom" value={form.prenom} onChange={handleChange} /><br />
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} /><br />
        <div style={{ position: "relative" }}>
          <input type={showPassword ? "text" : "password"} name="password" placeholder="Mot de passe" value={form.password} onChange={handleChange} />
          <span onClick={() => setShowPassword(s => !s)} style={{ cursor: "pointer" }}>{showPassword ? "🙈" : "👁"}</span>
        </div>
        <input name="telephone" placeholder="+509XXXXXXXX" value={form.telephone} onChange={handleChange} /><br />
        <input name="banque" placeholder="Numéro bancaire" value={form.banque} onChange={handleChange} /><br />
        <input type="date" name="dateInscription" value={form.dateInscription} onChange={handleChange} /><br />
        <label><input type="radio" name="role" value="admin" checked={form.role==="admin"} onChange={handleChange}/> Administrateur</label>
        <label><input type="radio" name="role" value="member" checked={form.role==="member"} onChange={handleChange}/> Membre</label>
        <br />
        <button type="button" onClick={() => onNavigate("accueil")}>Retour</button>
        <button type="submit">Suivant</button>
      </form>
    </div>
  );
}

export default Inscription;