import express from 'express';
import multer from "multer";
import path from "path";
import fs from "fs";
import { query } from '../server.mjs';

const router = express.Router();

// --- CONFIGURATION MULTER ---
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
    else cb(new Error("Format invalide. Utilisez JPG, PNG ou PDF."));
  },
});

// ============================================================
// 1. MEMBRE : UPLOAD DU REÇU (Cotisation)
// ============================================================
router.post("/upload", upload.single("receipt"), async (req, res) => {
  try {
    const { userId, groupeId, periodNumber } = req.body;
    
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });
    if (!userId || !groupeId || !periodNumber) return res.status(400).json({ error: "Champs manquants." });

    const [groupe] = await query("SELECT * FROM groupes WHERE id = ?", [groupeId]);
    if (!groupe) return res.status(404).json({ error: "Groupe introuvable." });

    const periodNum = Number(periodNumber);
    const filename = req.file.filename;

    // 🔥 MODIFICATION : Date avec Heure (YYYY-MM-DD HH:mm:ss)
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await query(
      `INSERT INTO payments (userId, groupeId, periodNumber, amount, method, filePath, status, createdAt)
       VALUES (?, ?, ?, ?, 'offline', ?, 'en_attente', ?)`,
      [userId, groupeId, periodNum, groupe.montantParPeriode, filename, createdAt]
    );

    res.status(201).json({ message: "Reçu envoyé pour validation", filePath: filename });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 2. MEMBRE : HISTORIQUE
// ============================================================
router.get("/status/:userId/:groupeId", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM payments WHERE userId = ? AND groupeId = ? ORDER BY periodNumber ASC",
      [req.params.userId, req.params.groupeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 3. ADMIN : RÉCUPÉRER TOUS LES PAIEMENTS (Trié par Date+Heure)
// ============================================================
router.get("/all", async (req, res) => {
  try {
    // Le ORDER BY p.createdAt DESC triera automatiquement chronologiquement
    const sql = `
      SELECT p.*, u.nom, u.prenom, u.email, g.nomSol 
      FROM payments p
      JOIN users u ON p.userId = u.id
      JOIN groupes g ON p.groupeId = g.id
      ORDER BY p.createdAt DESC
    `;
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 4. ADMIN : METTRE À JOUR LE STATUT
// ============================================================
router.put("/update-status", async (req, res) => {
  const { paymentId, status } = req.body;
  try {
    await query("UPDATE payments SET status = ? WHERE id = ?", [status, paymentId]);
    res.json({ message: `Statut mis à jour : ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 5. ADMIN : VERSER LE POT
// ============================================================
router.post("/payout", async (req, res) => {
  const { userId, groupeId, amount } = req.body;

  try {
    const check = await query(
        "SELECT * FROM payments WHERE userId = ? AND groupeId = ? AND status = 'transféré'",
        [userId, groupeId]
    );

    if (check.length > 0) {
        return res.status(400).json({ error: "Ce membre a déjà reçu son lot !" });
    }

    // 🔥 MODIFICATION : Date avec Heure ici aussi
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await query(
      `INSERT INTO payments (userId, groupeId, periodNumber, amount, method, status, createdAt)
       VALUES (?, ?, 999, ?, 'virement_admin', 'transféré', ?)`,
      [userId, groupeId, amount, createdAt]
    );

    res.status(201).json({ message: "Virement enregistré avec succès." });
  } catch (err) {
    console.error("Payout error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 6. ADMIN : RÉCUPÉRER LES MEMBRES
// ============================================================
router.get("/members/:groupeId", async (req, res) => {
  try {
    const sql = `
      SELECT u.id, u.nom, u.prenom, u.email 
      FROM users u
      JOIN participants p ON u.id = p.userId
      WHERE p.groupeId = ?
    `;
    const rows = await query(sql, [req.params.groupeId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;