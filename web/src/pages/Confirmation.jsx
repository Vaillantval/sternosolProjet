
function Confirmation({ onNavigate }) {
  return (
    <div className="page page-confirmation">
      <h2>✅ Inscription terminée avec succès !</h2>
      <p>Merci d’avoir complété votre inscription.</p>
      <button onClick={() => onNavigate("accueil")}>🏠 Retour à l'accueil</button>
    </div>	
  );
}

export default Confirmation;
