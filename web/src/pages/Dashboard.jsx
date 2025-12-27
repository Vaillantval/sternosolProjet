import React, { useEffect, useState } from "react";

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/groups/1/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <p>Chargement...</p>;

  return (
    <div className="dashboard">
      <h2>Tableau de bord du groupe {data.group.nomSol}</h2>
      <h4>Montant : {data.group.montant} HTG</h4>
      <table>
        <thead>
          <tr>
            <th>Ordre</th>
            <th>Nom</th>
            <th>Email</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          {data.participants.map((p, i) => (
            <tr key={i}>
              <td>{p.ordre}</td>
              <td>{p.nom} {p.prenom}</td>
              <td>{p.email}</td>
              <td>{p.etat}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bottom-buttons">
        <button onClick={() => onNavigate("payment")}>💳 Payer</button>
        <button onClick={() => onNavigate("inscription")}>➕ Participer à un autre groupe</button>
      </div>
    </div>
  );
}
