import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import Stripe from 'stripe';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER, PORT, STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET } from "./env/env.js";

// On garde tes routes existantes (sauf webhook qu'on va intégrer ici)
import paiementRoutes from './routes/paiement.route.js';
import groupeRoutes from './routes/groupe.route.js';
import userRoutes from './routes/user.route.js';

const app = express();

// --- CONFIGURATION STRIPE ---
const stripe = new Stripe(STRIPE_SECRET_KEY);

// --- CONFIGURATION MYSQL ---
const dbConfig = {
  host: DB_HOST || 'localhost',
  user: DB_USER || 'root',
  password: DB_PASSWORD || '',
  database: DB_NAME || 'sternosol',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let dbPool;


// pour valider les paiements stripe local apres avoir installer stripe.exe  : 
// stripe listen --forward-to localhost:5000/api/webhook

// --- CONFIGURATION MULTER ---
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// --- FONCTION UTILITAIRE QUERY (Définie ici pour être dispo partout) ---
export const query = async (sql, params = []) => {
  if (!dbPool) throw new Error("La base de données n'est pas encore connectée.");
  const [rows] = await dbPool.execute(sql, params);
  return rows;
};

// ==================================================================
// 1. MIDDLEWARES ET WEBHOOK (ORDRE CRUCIAL)
// ==================================================================

app.use(cors());

// 🔥 IMPORTANT : La route Webhook doit être ICI, AVANT express.json()
app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // ✅ VÉRIFICATION DE SÉCURITÉ
    // Si la signature ne correspond pas à la clé whsec_..., cela déclenchera une erreur.
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    
    console.log("🔔 Webhook vérifié et reçu :", event.type);
  } catch (err) {
    console.error(`❌ Erreur Signature Webhook : ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // GESTION DU SUCCÈS DE PAIEMENT
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { userId, groupeId, periodNumber } = paymentIntent.metadata;

    console.log(`💰 Paiement réussi pour User ${userId}, Groupe ${groupeId}, Montant: ${paymentIntent.amount}`);

    if (!userId || !groupeId) {
        console.error("❌ ERREUR : Métadonnées manquantes.");
        return res.json({received: true});
    }

    try {
        const createdAt = new Date().toISOString().split("T")[0];
        
        // On vérifie si le paiement existe déjà pour éviter les doublons
        const [existing] = await query("SELECT id FROM payments WHERE stripe_charge_id = ?", [paymentIntent.id]);
        
        if (existing) {
             console.log("⚠️ Ce paiement a déjà été enregistré.");
        } else {
             await query(
                `INSERT INTO payments (userId, groupeId, periodNumber, amount, method, filePath, status, createdAt, stripe_charge_id)
                 VALUES (?, ?, ?, ?, 'stripe', 'stripe_online', 'paid', ?, ?)`,
                [userId, groupeId, periodNumber, paymentIntent.amount / 100, createdAt, paymentIntent.id]
            );
            console.log("✅ SUCCÈS : Base de données mise à jour !");
        }
    } catch (dbErr) {
        console.error("❌ Erreur MySQL Webhook :", dbErr);
    }
  }

  res.json({received: true});
});

// ==================================================================
// 2. PARSEUR JSON (Pour toutes les autres routes)
// ==================================================================
app.use(express.json());

// ==================================================================
// 3. INITIALISATION BASE DE DONNÉES
// ==================================================================
(async () => {
  try {
    dbPool = mysql.createPool(dbConfig);
    const connection = await dbPool.getConnection();
    console.log("✅ Connecté avec succès à MySQL !");
    connection.release();
    
    // Création des tables (si elles n'existent pas)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT, 
        nom VARCHAR(255), prenom VARCHAR(255), email VARCHAR(255) UNIQUE,
        password VARCHAR(255), telephone VARCHAR(255), banque VARCHAR(255),
        dateInscription DATE, role VARCHAR(255)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS groupes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nomSol VARCHAR(255), montantParPeriode DECIMAL(10, 2), frequence INT,
        statut VARCHAR(255), createdBy VARCHAR(255), nombreParticipants INT,
        dateCreation DATE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        userId INT, groupeId INT, dateParticipation DATE,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(groupeId) REFERENCES groupes(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        userId INT, groupeId INT, periodNumber INT,
        amount DECIMAL(10, 2), method VARCHAR(50) DEFAULT 'manual',
        filePath VARCHAR(255), status VARCHAR(50) DEFAULT 'en_attente',
        createdAt DATE, stripe_charge_id VARCHAR(255),
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(groupeId) REFERENCES groupes(id)
      )
    `);
    
    console.log("📚 Base de données initialisée.");

  } catch (err) {
    console.error("❌ Erreur initialisation DB:", err.message);
    process.exit(1);
  }
})();

// ==================================================================
// 4. ROUTES API CLASSIQUES
// ==================================================================

// Inscription
app.post("/api/inscription", async (req, res) => {
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

// Login
app.post("/api/login", async (req, res) => {
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

// Participation
app.post("/api/participer", async (req, res) => {
  try {
    const { userId, groupeId } = req.body;
    const exists = await query("SELECT * FROM participants WHERE userId = ? AND groupeId = ?", [userId, groupeId]);
    if (exists.length > 0) return res.status(400).json({ error: "Déjà inscrit." });

    const dateParticipation = new Date().toISOString().split("T")[0];
    const result = await query("INSERT INTO participants (userId, groupeId, dateParticipation) VALUES (?, ?, ?)",
      [userId, groupeId, dateParticipation]);

    res.status(201).json({ message: "Participation enregistrée", participationId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Group for User
app.get("/api/user/group/:userId", async (req, res) => {
  try {
    const rows = await query(
      `SELECT g.* FROM participants p
       JOIN groupes g ON g.id = p.groupeId  
       WHERE p.userId = ? LIMIT 1`,
      [req.params.userId]
    );
    if (rows.length === 0) return res.json({ error: "Aucun groupe trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payment Intent (Stripe)
app.post("/api/create-payment-intent", async (req, res) => {
  const { amount, currency = "usd", userId, groupeId, periodNumber } = req.body;

  try {
    if (!amount || !userId || !groupeId || !periodNumber) {
        console.error("❌ Données manquantes create-payment-intent:", req.body);
        return res.status(400).json({ error: "Données manquantes" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency,
      metadata: { 
        userId: String(userId), 
        groupeId: String(groupeId), 
        periodNumber: String(periodNumber) 
      },
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Erreur Stripe Intent:", err);
    res.status(500).json({ error: err.message });
  }
});

// Routes importées
app.use("/api/groupes", groupeRoutes);
app.use("/api/paiement", paiementRoutes);

// Static files (Uploads)
app.use("/uploads", express.static(uploadsDir));

// Démarrage serveur
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));