import { useState } from "react";
import Accueil from "./pages/Accueil";
import Inscription from "./pages/Inscription";
import AdminForm from "./pages/AdminForm";
import MemberView from "./pages/MemberView";
import Confirmation from "./pages/Confirmation";
import Login from "./pages/Login";
import Participer from "./pages/Participer";
import AdminDashboard from "./pages/AdminDashboard";
import MemberDashboard from "./pages/MemberDashboard";

// --- IMPORTATION DES PAGES DE PAIEMENT ---
import Paiement from "./pages/Paiement"; // Page Offline (Espèces / Main à main)
import StripePayment from "./pages/StripePayment"; // 🔥 C'est votre fichier StripePayment.jsx

function App() {
  const [page, setPage] = useState("accueil");
  const [userData, setUserData] = useState({});

  // 🔥 État pour transférer les infos (Montant, ID du groupe) du Dashboard vers la page de paiement
  const [paymentInfo, setPaymentInfo] = useState({
    amount: 0,
    groupeId: null,
    userId: null,
    periodNumber: 1
  });

  const renderPage = () => {
    switch (page) {
      case "accueil":
        return <Accueil onNavigate={setPage} />;

      case "inscription":
        return (
          <Inscription
            onNavigate={setPage}
            userData={userData}
            setUserData={setUserData}
          />
        );

      case "login":
        return (
          <Login
            onNavigate={setPage}
            userData={userData}
            setUserData={setUserData}
          />
        );

      case "admin":
        return (
          <AdminForm
            onNavigate={setPage}
            userData={userData}
          />
        );

      case "participer":
        return (
          <Participer 
            onNavigate={setPage} 
            userData={userData}
          />
        );

      case "member":
        return (
          <MemberView
            onNavigate={setPage}
            userData={userData}
          />
        );
         
      case "memberDashboard":
        return (
          <MemberDashboard
            onNavigate={setPage}
            userData={userData}
          />
        );

      case "adminDashboard":
        return (
          <AdminDashboard
            onNavigate={setPage}
            userData={userData}
            setPaymentInfo={setPaymentInfo} // 🔥 Important : permet au dashboard de sauvegarder le prix avant de naviguer
          />
        );

      case "paiement":
        // Cas 1 : Paiement Offline (Page Paiement.js)
        return (
          <Paiement
            onNavigate={setPage}
            userData={userData}
            amount={paymentInfo.amount} // On passe le montant si besoin
          />
        );
         
      case "paiementStripe": // J'ai renommé "paiement2" en "paiementStripe" pour la clarté, assurez-vous que AdminDashboard navigue vers "paiementStripe"
        // Cas 2 : Paiement Stripe (Page StripePayment.jsx)
        return (
          <StripePayment
            onBack={() => setPage("adminDashboard")} // Bouton retour
            amount={paymentInfo.amount}
            groupeId={paymentInfo.groupeId}
            userId={paymentInfo.userId || userData.email}
            periodNumber={paymentInfo.periodNumber}
          />
        );

      case "confirmation":
        return <Confirmation onNavigate={setPage} />;

      default:
        return <Accueil onNavigate={setPage} />;
    }
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}

export default App;