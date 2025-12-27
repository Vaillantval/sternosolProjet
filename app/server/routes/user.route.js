import express from 'express';
import bcrypt from 'bcrypt';
// 👇 CRUCIAL : On importe la fonction 'query' depuis le fichier principal
import { query } from '../server.mjs'; 

const router = express.Router();

// ==========================================
// 1. ROUTE INSCRIPTION (Déplacée ici)
// ==========================================
router.post("/inscription", async (req, res) => {
  const { nom, prenom, email, password, telephone, banque, dateInscription, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (nom, prenom, email, password, telephone, banque, dateInscription, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, hashed, telephone, banque, dateInscription, role]
    );
    res.status(200).json({ message: "OK", userId: result.insertId }); 
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "Cet email est déjà utilisé." });
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. ROUTE LOGIN (Déplacée ici)
// ==========================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const users = await query("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });

    res.json({
      message: "OK",
      user: {
        id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. GET GROUP FOR USER (Ta route)
// ==========================================
// Note: J'ai ajouté "/user" devant dans server.mjs donc ici on garde juste "/group/:userId"
router.get("/group/:userId", async (req, res) => {
  try {
    const rows = await query(
      `SELECT g.*
       FROM participants p
       JOIN groupes g ON g.id = p.groupeId  
       WHERE p.userId = ? LIMIT 1`,
      [req.params.userId]
    );
    // Renvoie un objet vide {} si pas de groupe, au lieu de planter
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;