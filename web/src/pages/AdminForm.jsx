import { useState } from "react";

function AdminForm({ onNavigate, userData }) {
  const [form, setForm] = useState({
    nomSol: "",
    montantParPeriode: "",
    frequence: "",
    statut: "",
    createdBy: userData.email || "Admin",
    nombreParticipants: "", // nombre de participants
  });

  const [ordreBeneficiaires, setOrdreBeneficiaires] = useState([]);

  // Gestion des champs
  const handleChange = (e) => {
    const updatedForm = { ...form, [e.target.name]: e.target.value };
    setForm(updatedForm);

    // Générer automatiquement l'ordre des bénéficiaires
    if (e.target.name === "nombreParticipants") {
      const nb = parseInt(e.target.value, 10);
      if (!isNaN(nb) && nb > 0) {
        const ordre = [];
        for (let i = 1; i <= nb; i++) {
          ordre.push(`Participant ${i}`);
        }
        setOrdreBeneficiaires(ordre);
      } else {
        setOrdreBeneficiaires([]);
      }
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Vérifications côté client
    if (!/^\d+$/.test(form.montantParPeriode) || !/^\d+$/.test(form.frequence)) {
      alert("Montant et fréquence doivent contenir uniquement des chiffres.");
      return;
    }

    if (!/^\d+$/.test(form.nombreParticipants) || parseInt(form.nombreParticipants) <= 0) {
      alert("Le nombre de participants doit être un entier positif.");
      return;
    }

    // ✅ Envoi au serveur
    try {
      const response = await fetch("http://localhost:5000/api/groupes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erreur lors de la création du groupe.");
        return;
      }

      alert("✅ Groupe créé avec succès !");
      console.log("Groupe créé :", data);

      // Redirection vers la page confirmation
      onNavigate("confirmation");

    } catch (error) {
      console.error("❌ Erreur réseau :", error);
      alert("Impossible de contacter le serveur.");
    }
  };

  return (
    <div className="page page-admin page-brown">
      <form onSubmit={handleSubmit}>
        <h2>Création d’un Sol</h2>

        <input
          type="text"
          name="nomSol"
          placeholder="Nom du sol"
          value={form.nomSol}
          onChange={handleChange}
        /><br />

        <input
          type="text"
          name="montantParPeriode"
          placeholder="Montant par période"
          value={form.montantParPeriode}
          onChange={handleChange}
        /><br />

        <input
          type="text"
          name="frequence"
          placeholder="Fréquence (jours)"
          value={form.frequence}
          onChange={handleChange}
        /><br />

        <input
          type="text"
          name="statut"
          placeholder="Statut"
          value={form.statut}
          onChange={handleChange}
        /><br />

        <input
          type="text"
          name="createdBy"
          value={form.createdBy}
          readOnly
        /><br />

        <input
          type="number"
          name="nombreParticipants"
          placeholder="Nombre de participants"
          value={form.nombreParticipants}
          onChange={handleChange}
          min="1"
        /><br />

        {ordreBeneficiaires.length > 0 && (
          <div style={{ marginTop: "15px" }}>
            <h3>Ordre des bénéficiaires</h3>
            <ul>
              {ordreBeneficiaires.map((p, index) => (
                <li key={index}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <br />
        <button type="button" onClick={() => onNavigate("inscription")}>⬅️ Back</button>
        <button type="submit">✅ Terminer l'inscription</button>
      </form>
    </div>
  );
}

export default AdminForm;