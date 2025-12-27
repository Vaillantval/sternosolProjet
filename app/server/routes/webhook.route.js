import express from 'express'
import { query } from '../server.mjs';

const router = express.Router()

router.post("/api/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // En production, il est recommandé de vérifier la signature avec:
    // event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // Pour le dev local sans CLI configuré, on utilise le body direct (moins sécurisé mais fonctionnel)
    event = JSON.parse(req.body); 
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gestion de l'événement : Paiement réussi
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { userId, groupeId, periodNumber } = paymentIntent.metadata;

    console.log(`💰 Webhook: Paiement réussi pour User ${userId}, Groupe ${groupeId}`);

    try {
        const createdAt = new Date().toISOString().split("T")[0];
        
        // Insertion dans la base de données
        // Note: filePath est mis à "stripe_online" car il n'y a pas de reçu papier
        await query(
            `INSERT INTO payments (userId, groupeId, periodNumber, amount, method, filePath, status, createdAt, stripe_charge_id)
             VALUES (?, ?, ?, ?, 'stripe', 'stripe_online', 'paid', ?, ?)`,
            [userId, groupeId, periodNumber, paymentIntent.amount / 100, createdAt, paymentIntent.id]
        );
        console.log("✅ DB mise à jour via Webhook");
    } catch (dbErr) {
        console.error("❌ Erreur DB webhook:", dbErr);
    }
  }

  res.json({received: true});
});

export default router;