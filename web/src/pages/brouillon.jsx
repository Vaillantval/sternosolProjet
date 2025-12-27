✅ ENVOI AU SERVEUR
  try {
    const response = await fetch("http://localhost:5000/api/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Erreur lors de l'inscription.");
      return;
    }

    alert("Inscription réussie ✅");
    console.log("Utilisateur créé :", data);

    // Sauvegarder l’ID utilisateur et rediriger selon le rôle
    localStorage.setItem("userId", data.userId);
    onNavigate(form.role === "admin" ? "admin" : "member");

  } catch (error) {
    console.error("Erreur réseau :", error);
    alert("Impossible de contacter le serveur.");
  }
};


//serveur existant

import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "secret123";

/* --- Connexion à la base SQLite --- */
let db;
(async () => {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      telephone TEXT,
      numero_bancaire TEXT,
      role TEXT,
      date_inscription TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomSol TEXT NOT NULL,
      montant INTEGER NOT NULL,
      frequence INTEGER NOT NULL,
      statut TEXT,
      createdBy INTEGER,
      dateDebut TEXT,
      dateFin TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      groupId INTEGER,
      ordre INTEGER,
      etat TEXT DEFAULT 'active'
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId INTEGER,
      userId INTEGER,
      amount INTEGER,
      method TEXT,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log("✅ Base de données initialisée.");
})();

/* --- Middleware Auth --- */
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Token manquant" });
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide" });
  }
}

/* --- Routes --- */

// Inscription
app.post("/api/inscription", async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, banque, dateInscription, role } = req.body;

    // Vérifier si l'email existe déjà
    const existing = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (existing) {
      return res.status(400).json({ error: "Cet email est déjà enregistré." });
    }

    // Hasher le mot de passe avant d'enregistrer
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer dans la base
    const result = await db.run(
      `INSERT INTO users (nom, prenom, email, password, telephone, banque, dateInscription, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, hashedPassword, telephone, banque, dateInscription, role]
    );

    // Retourner l'ID de l'utilisateur créé
    res.json({ message: "Inscription réussie ✅", userId: result.lastID });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Connexion
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

  if (!user) return res.status(400).json({ error: "Utilisateur introuvable." });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Mot de passe incorrect." });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: "4h" });
  res.json({ message: "Connexion réussie ✅", token, userId: user.id });
});

// Création de groupe
app.post("/api/groups", authMiddleware, async (req, res) => {
  const { nomSol, montant, frequence, statut, participantsCount, dateDebut, dateFin } = req.body;
  try {
    const result = await db.run(
      `INSERT INTO groups (nomSol, montant, frequence, statut, createdBy, dateDebut, dateFin)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nomSol, montant, frequence, statut, req.user.id, dateDebut, dateFin]
    );
    const groupId = result.lastID;
    for (let i = 1; i <= participantsCount; i++) {
      await db.run(`INSERT INTO participants (groupId, ordre) VALUES (?, ?)`, [groupId, i]);
    }
    res.json({ message: "Groupe créé ✅", groupId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création groupe" });
  }
});

// Dashboard
app.get("/api/groups/:id/dashboard", authMiddleware, async (req, res) => {
  const groupId = req.params.id;
  const group = await db.get("SELECT * FROM groups WHERE id = ?", [groupId]);
  const participants = await db.all(
    `SELECT p.ordre, u.nom, u.prenom, u.email, p.etat
     FROM participants p LEFT JOIN users u ON p.userId = u.id
     WHERE groupId = ? ORDER BY p.ordre`,
    [groupId]
  );
  const payments = await db.all("SELECT * FROM payments WHERE groupId = ?", [groupId]);
  res.json({ group, participants, payments });
});

// Paiement simulé
app.post("/api/groups/:id/pay", authMiddleware, async (req, res) => {
  const { amount, method } = req.body;
  const groupId = req.params.id;
  await db.run(
    `INSERT INTO payments (groupId, userId, amount, method, status) VALUES (?, ?, ?, ?, ?)`,
    [groupId, req.user.id, amount, method, "succeeded"]
  );
  res.json({ message: "Paiement enregistré ✅" });
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));



// ancien member code 
import { useEffect, useState } from "react";

function Member({ onNavigate }) {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroupes = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/groupes");
        if (!response.ok) {
          throw new Error("Erreur de chargement des groupes");
        }
        const data = await response.json();
        setGroupes(data);
      } catch (error) {
        console.error("Erreur :", error);
        alert("Impossible de récupérer les groupes.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroupes();
  }, []);

  const handleParticiper = async (groupeId) => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("Vous devez être connecté pour participer.");
      onNavigate("login");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/participer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(userId), groupeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        return;
      }

      alert("✔️ Participation enregistrée !");
      onNavigate("confirmation");

    } catch (err) {
      console.error("Erreur participation:", err);
      alert("Erreur réseau");
    }
  };

  if (loading) return <h2>Chargement des groupes...</h2>;

  return (
    <div className="page page-brown">
      <h2 style={{ textAlign: "center" }}>📌 Groupes disponibles</h2>

      {groupes.length === 0 ? (
        <p>Aucun groupe trouvé dans la base de données.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
          {groupes.map((groupe) => (
            <div
              key={groupe.id}
              style={{
                width: "300px",
                padding: "15px",
                borderRadius: "10px",
                background: "#fff",
                boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
              }}
            >
              <h3 style={{ textAlign: "center" }}>{groupe.nomSol}</h3>

              <p><b>Montant :</b> {groupe.montantParPeriode} Gdes</p>
              <p><b>Fréquence :</b> {groupe.frequence} jours</p>
              <p><b>Statut :</b> {groupe.statut}</p>
              <p><b>Participants requis :</b> {groupe.nombreParticipants}</p>
              <p><b>Créé par :</b> {groupe.createdBy}</p>
              <p><b>Date de création :</b> {groupe.dateCreation}</p>

              <button
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "10px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#4CAF50",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
                onClick={() => handleParticiper(groupe.id)}
              >
                ✔️ Participer
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onNavigate("accueil")}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          border: "none",
          background: "#333",
          color: "white",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        ⬅️ Retour
      </button>
    </div>
  );
}

export default Member;


// bouton click
    onClick={() => onNavigate("Participer", { groupe })}



    // memberdashboard
    // src/pages/MemberDashboard.jsx
import { useEffect, useState } from "react";

function MemberDashboard({ onNavigate }) {
  const [groupe, setGroupe] = useState(null);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:5000/api/user/group/${userId}`)
      .then(res => res.json())
      .then(data => {
        setGroupe(data);
        localStorage.setItem("groupeId", data.id); // 🔥 IMPORTANT
      })
      .catch(err => console.error("Erreur groupe:", err));
  }, [userId]);

  if (!groupe) return <p>Chargement...</p>;

  return (
    <div className="page">
      <h2>Votre Groupe</h2>

      <p><b>Nom :</b> {groupe.nomSol}</p>
      <p><b>Montant :</b> {groupe.montantParPeriode}$</p>
      <p><b>Fréquence :</b> {groupe.frequence} jours</p>
      <p><b>Participants :</b> {groupe.nombreParticipants}</p>
      <p><b>Statut :</b> {groupe.statut}</p>

      <button onClick={() => onNavigate("paiement")}>
        💳 Réaliser votre paiement
      </button>

      <button onClick={() => onNavigate("accueil")}>Déconnexion</button>
    </div>
  );
}

export default MemberDashboard;

// admin 
import { useState } from "react";

function AdminForm({ onNavigate, userData }) {
  const [form, setForm] = useState({
    nomSol: "",
    montantParPeriode: "",
    frequence: "",
    statut: "",
    createdBy: userData.nom || "Admin",
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


// server
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import { open } from "sqlite";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// -----------------------------
// Multer upload config
// -----------------------------
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Type de fichier non autorisé"));
  },
});

// -----------------------------
// Database init
// -----------------------------
const dbPromise = open({
  filename: "./database.db",
  driver: sqlite3.Database,
});

(async () => {
  const db = await dbPromise;

  // USERS
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT,
      prenom TEXT,
      email TEXT UNIQUE,
      password TEXT,
      telephone TEXT,
      banque TEXT,
      dateInscription TEXT,
      role TEXT
    )
  `);

  // GROUPES
  await db.run(`
    CREATE TABLE IF NOT EXISTS groupes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomSol TEXT,
      montantParPeriode REAL,
      frequence INTEGER,
      statut TEXT,
      createdBy TEXT,
      nombreParticipants INTEGER,
      dateCreation TEXT
    )
  `);

  // PARTICIPANTS
  await db.run(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      groupeId INTEGER,
      dateParticipation TEXT,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(groupeId) REFERENCES groupes(id)
    )
  `);

  // PAYMENTS
  await db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      groupeId INTEGER,
      periodNumber INTEGER,
      filePath TEXT,
      status TEXT DEFAULT 'en_attente',
      createdAt TEXT,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(groupeId) REFERENCES groupes(id)
    )
  `);

  console.log("📚 Base de données initialisée !");
})();

// -----------------------------
// Auth routes
// -----------------------------

// Register
app.post("/api/inscription", async (req, res) => {
  const { nom, prenom, email, password, telephone, banque, dateInscription, role } = req.body;
  try {
    const db = await dbPromise;
    const hashed = await bcrypt.hash(password, 10);

    await db.run(
      `INSERT INTO users 
      (nom, prenom, email, password, telephone, banque, dateInscription, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, hashed, telephone, banque, dateInscription, role]
    );

    res.json({ message: "OK" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const db = await dbPromise;
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" });

    res.json({ message: "OK", user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------
// GROUPES ROUTES
// -----------------------------

app.get("/api/groupes", async (req, res) => {
  try {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM groupes ORDER BY id DESC");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/groupes/:id", async (req, res) => {
  try {
    const db = await dbPromise;
    const row = await db.get("SELECT * FROM groupes WHERE id = ?", [req.params.id]);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------
// PARTICIPATION ROUTES
// -----------------------------

app.post("/api/participer", async (req, res) => {
  const { userId, groupeId } = req.body;
  try {
    const db = await dbPromise;

    const exists = await db.get(
      "SELECT * FROM participants WHERE userId = ? AND groupeId = ?",
      [userId, groupeId]
    );
    if (exists) return res.status(400).json({ error: "Déjà inscrit" });

    const date = new Date().toISOString().split("T")[0];
    await db.run(
      "INSERT INTO participants (userId, groupeId, dateParticipation) VALUES (?, ?, ?)",
      [userId, groupeId, date]
    );

    res.json({ message: "OK" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------
// ⭐ ROUTE ESSENTIELLE : trouver le groupe d’un user
// -----------------------------
app.get("/api/user/group/:userId", async (req, res) => {
  try {
    const db = await dbPromise;

    const row = await db.get(
      `SELECT g.* 
       FROM participants p
       JOIN groupes g ON g.id = p.groupeId
       WHERE p.userId = ?`,
      [req.params.userId]
    );

    if (!row) return res.status(404).json({ error: "Aucun groupe trouvé" });

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// PAIEMENT (upload)
// -----------------------------
app.post("/api/paiement/upload", upload.single("receipt"), async (req, res) => {
  try {
    const { userId, groupeId, periodNumber } = req.body;

    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

    const db = await dbPromise;

    const groupe = await db.get("SELECT * FROM groupes WHERE id = ?", [groupeId]);
    if (!groupe) return res.status(404).json({ error: "Groupe introuvable" });

    // empêcher double paiement
    const exists = await db.get(
      "SELECT * FROM payments WHERE userId = ? AND groupeId = ? AND periodNumber = ?",
      [userId, groupeId, periodNumber]
    );
    if (exists) return res.status(400).json({ error: "Déjà payé" });

    const createdAt = new Date().toISOString().split("T")[0];

    await db.run(
      `INSERT INTO payments (userId, groupeId, periodNumber, filePath, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, groupeId, periodNumber, req.file.filename, createdAt]
    );

    res.json({ message: "OK", filePath: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Voir paiements
app.get("/api/paiement/status/:userId/:groupeId", async (req, res) => {
  try {
    const db = await dbPromise;
    const rows = await db.all(
      `SELECT periodNumber, status, filePath FROM payments 
       WHERE userId = ? AND groupeId = ?`,
      [req.params.userId, req.params.groupeId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------
app.use("/uploads", express.static(uploadsDir));

app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`)); 