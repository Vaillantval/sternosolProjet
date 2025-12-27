import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import axios from "axios";

// Ta clé publique Stripe
const stripePromise = loadStripe("pk_test_51RpxSNPpdmD78VzAKB9TOWaUFjK3XaYNdXKII13sU6OhRpoMKHiw4Eai9uwEnEf79S7gjEukppEUCGoK2Shxl4Zt000aPs7OUH");

// --- Sous-composant Formulaire ---
const CheckoutForm = ({ amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redirection de secours si JS échoue (rare)
        return_url: window.location.origin, 
      },
      redirect: "if_required", // Important: On reste dans l'app React
    });

    if (error) {
      setMessage(error.message);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // ✅ 1. Succès visuel
      setMessage("Paiement validé ! Enregistrement en cours...");
      
      // ✅ 2. Petite pause pour laisser le temps au Webhook de mettre à jour MySQL
      setTimeout(() => {
        onSuccess(); // Déclenche la redirection vers le Dashboard
      }, 3000); 
    } else {
      setMessage("Statut inattendu.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "500px", margin: "0 auto" }}>
      <h3 style={{ textAlign: "center", marginBottom: "20px", color: "#635bff" }}>
        Payer {amount} $
      </h3>
      
      <PaymentElement />
      
      <button 
        disabled={isProcessing || !stripe || !elements} 
        className="btn-stripe"
        style={{ marginTop: "20px" }}
      >
        {isProcessing ? "Traitement en cours..." : `Confirmer le paiement`}
      </button>
      
      {message && (
        <div style={{ 
          marginTop: "15px", 
          textAlign: "center", 
          padding: "10px", 
          borderRadius: "8px",
          backgroundColor: message.includes("validé") ? "#dcfce7" : "#fee2e2",
          color: message.includes("validé") ? "#166534" : "#991b1b",
          fontWeight: "bold"
        }}>
          {message}
        </div>
      )}
    </form>
  );
};

// --- Composant Principal ---
export default function StripePayment({ amount, userId, groupeId, periodNumber, onBack }) {
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    if (!amount) return;

    // Création de l'intention de paiement
    // Les métadonnées (userId, etc.) sont envoyées ici pour que le Webhook les récupère
    axios.post("http://localhost:5000/api/create-payment-intent", { 
        amount, userId, groupeId, periodNumber 
    })
    .then((res) => setClientSecret(res.data.clientSecret))
    .catch((err) => console.error("Erreur Stripe Init:", err));
  }, [amount, userId, groupeId, periodNumber]);

  return (
    <div className="page page-white">
      <div style={{ width: "100%", maxWidth: "600px", padding: "0 20px" }}>
        
        {/* Bouton Retour stylisé */}
        <button 
          onClick={onBack} 
          className="btn-secondary" 
          style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "5px", width: "auto" }}
        >
          <span>⬅</span> Annuler et Retourner
        </button>
        
        {!clientSecret ? (
          <div className="card" style={{ textAlign: "center" }}>
            <p>Connexion sécurisée à Stripe...</p>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm 
              amount={amount} 
              onSuccess={() => {
                alert("✅ Paiement réussi ! Retour au tableau de bord.");
                onBack(); // C'est ici qu'on retourne au Dashboard
              }}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}