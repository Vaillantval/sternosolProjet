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
import Paiement from "./pages/Paiement";       
import StripePayment from "./pages/StripePayment"; 

function App() {
  const [page, setPage] = useState("accueil");
  const [userData, setUserData] = useState({});

  // 🔥 UPDATE : On ajoute 'returnTo' pour savoir où revenir après paiement
  const [paymentInfo, setPaymentInfo] = useState({
    amount: 0,
    groupeId: null,
    userId: null,
    periodNumber: 1,
    returnTo: "memberDashboard" // Valeur par défaut
  });

  const renderPage = () => {
    switch (page) {
      case "accueil":
        return <Accueil onNavigate={setPage} />;
      case "inscription":
        return <Inscription onNavigate={setPage} userData={userData} setUserData={setUserData} />;
      case "login":
        return <Login onNavigate={setPage} userData={userData} setUserData={setUserData} />;
      case "admin":
        return <AdminForm onNavigate={setPage} userData={userData} />;
      case "participer":
        return <Participer onNavigate={setPage} userData={userData} />;
      case "member":
        return <MemberView onNavigate={setPage} userData={userData} />;
        
      // --- DASHBOARD MEMBRE ---
      case "memberDashboard":
        return (
            <MemberDashboard 
                onNavigate={setPage} 
                userData={userData} 
                setPaymentInfo={setPaymentInfo} 
            />
        );
      
      // --- DASHBOARD ADMIN ---
      case "adminDashboard":
        return (
          <AdminDashboard
            onNavigate={setPage}
            userData={userData}
            setPaymentInfo={setPaymentInfo}
          />
        );

      // --- PAIEMENT OFFLINE ---
      case "paiement":
        return (
          <Paiement
            onNavigate={setPage}
            userData={userData}
            amount={paymentInfo.amount}
          />
        );
      
      // --- PAIEMENT STRIPE (CORRIGÉ) ---
      case "paiementStripe":
        return (
          <StripePayment
            // ✅ CORRECTION ICI : On utilise la variable stockée pour savoir où retourner
            onBack={() => setPage(paymentInfo.returnTo || "memberDashboard")} 
            
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