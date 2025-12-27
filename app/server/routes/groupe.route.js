import express from 'express'
import { query } from '../server.mjs';

const router = express.Router();

// Create groupe
router.post("", async (req, res) => {
  try {
    const { nomSol, montantParPeriode, frequence, statut, createdBy, nombreParticipants } = req.body;
    if (!nomSol || montantParPeriode == null || frequence == null || !statut || !createdBy || nombreParticipants == null) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }
    const dateCreation = new Date().toISOString().split("T")[0];
    const result = await query(
      `INSERT INTO groupes (nomSol, montantParPeriode, frequence, statut, createdBy, nombreParticipants, dateCreation)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nomSol, montantParPeriode, frequence, statut, createdBy, nombreParticipants, dateCreation]
    );
    // Utilisation de insertId
    res.status(201).json({ message: "Groupe créé", groupId: result.insertId });
  } catch (err) {
    console.error("Create groupe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all groupes
router.get("", async (req, res) => {
  try {
    // db.all -> query (renvoie le tableau directement)
    const rows = await query("SELECT * FROM groupes ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET groupes error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get groupe by id
router.get("/:id", async (req, res) => {
  try {
    // db.get -> query (renvoie un tableau, on prend le premier élément)
    const groupes = await query("SELECT * FROM groupes WHERE id = ?", [req.params.id]);
    const g = groupes[0];
    if (!g) return res.status(404).json({ error: "Groupe introuvable" });
    res.json(g);
  } catch (err) {
    console.error("GET groupe:id error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;