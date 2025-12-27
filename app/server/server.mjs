import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import Stripe from 'stripe';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER, PORT, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FRONTEND_URL } from "./env/env.js";
import { FRONT_URL } from "./env/env.js";
// Import des routes
import paiementRoutes from './routes/paiement.route.js';
import groupeRoutes from './routes/groupe.route.js';
import userRoutes from './routes/user.route.js'; // [MODIFIÉ] On va vraiment l'utiliser

const app = express();

// --- CONFIGURATION STRIPE ---
const stripe = new Stripe(STRIPE_SECRET_KEY);

// --- CONFIGURATION MYSQL ---
const dbConfig = {
  host: DB_HOST, // [MODIFIÉ] On fait confiance au .env (RDS ou Local)
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Variable globale pour le pool (utilisée par query)
let dbPool;

// --- FONCTION UTILITAIRE QUERY ---
export const query = async (sql, params = []) => {
  if (!dbPool) throw new Error("La base de données n'est pas encore connectée.");
  const [rows] = await dbPool.execute(sql, params);
  return rows;
};

// --- CONFIGURATION MULTER (DOSSIER UPLOADS) ---
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);


// ==================================================================
// 1. MIDDLEWARES SPÉCIAUX (CORS & WEBHOOK)
// ==================================================================

// [MODIFIÉ] Configuration CORS plus robuste pour la production
app.use(cors({
    origin: FRONT_URL || "*", // ⚠️ En prod, remplace "*" par l'URL de ton Frontend (ex: "http://54.123.45.67")
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// 🔥 WEBHOOK STRIPE (Doit rester AVANT express.json)
app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    console.log("🔔 Webhook reçu :", event.type);
  } catch (err) {
    console.error(`❌ Erreur Signature Webhook : ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gestion du paiement réussi
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { userId, groupeId, periodNumber } = paymentIntent.metadata;

    if (!userId || !groupeId) {
        console.error("❌ Métadonnées manquantes dans le paiement Stripe.");
        return res.json({received: true});
    }

    try {
        const createdAt = new Date().toISOString().split("T")[0];
        
        // Vérification doublon
        const [existing] = await query("SELECT id FROM payments WHERE stripe_charge_id = ?", [paymentIntent.id]);
        
        if (existing) {
             console.log("⚠️ Paiement déjà enregistré, on ignore.");
        } else {
             await query(
                `INSERT INTO payments (userId, groupeId, periodNumber, amount, method, filePath, status, createdAt, stripe_charge_id)
                 VALUES (?, ?, ?, ?, 'stripe', 'stripe_online', 'paid', ?, ?)`,
                [userId, groupeId, periodNumber, paymentIntent.amount / 100, createdAt, paymentIntent.id]
            );
            console.log(`✅ Paiement Stripe enregistré pour User ${userId} (Groupe ${groupeId})`);
        }
    } catch (dbErr) {
        console.error("❌ Erreur MySQL Webhook :", dbErr);
    }
  }

  res.json({received: true});
});


// ==================================================================
// 2. PARSEUR JSON & STATIC FILES
// ==================================================================
app.use(express.json());
app.use("/uploads", express.static(uploadsDir)); // Sert les images uploadées


// ==================================================================
// 3. INITIALISATION BASE DE DONNÉES
// ==================================================================
(async () => {
  try {
    dbPool = mysql.createPool(dbConfig);
    // Petit test de connexion au démarrage
    const connection = await dbPool.getConnection();
    console.log(`✅ Connecté à MySQL sur : ${DB_HOST}`);
    connection.release();
    
    // Création des tables (Copie de ton code, c'est très bien pour un MVP)
    await createTables(dbPool); // J'ai déplacé le gros bloc SQL dans une fonction en bas pour la lisibilité

  } catch (err) {
    console.error("❌ ÉCHEC connexion DB:", err.message);
    // On ne coupe pas le processus, au cas où la DB mettrait du temps à démarrer (RDS)
  }
})();


// ==================================================================
// 4. ROUTES API
// ==================================================================

// [MODIFIÉ] Intent de paiement Stripe (Resté ici car simple)
app.post("/api/create-payment-intent", async (req, res) => {
  const { amount, currency = "usd", userId, groupeId, periodNumber } = req.body;
  try {
    if (!amount || !userId || !groupeId) return res.status(400).json({ error: "Données manquantes" });

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
    console.error("Stripe Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// [MODIFIÉ] Utilisation propre des fichiers de routes
// Assure-toi que login, inscription et user/group sont bien dans 'user.route.js'
app.use("/api", userRoutes); 
app.use("/api/groupes", groupeRoutes);
app.use("/api/paiement", paiementRoutes);


// ==================================================================
// 5. DÉMARRAGE SERVEUR
// ==================================================================
app.listen(PORT, '0.0.0.0', () => { // '0.0.0.0' est important pour AWS
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});


// --- FONCTION DE CRÉATION DES TABLES (Pour alléger le code principal) ---
async function createTables(pool) {
    const connection = await pool.getConnection();
    try {
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
        console.log("📚 Tables vérifiées/créées.");
    } finally {
        connection.release();
    }
}