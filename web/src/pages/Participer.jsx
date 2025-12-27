
function Participer({ onNavigate }) {
  return (
    <div className="page page-confirmation">
      <h2>✅ Voulez vous vraiment participer dans le sol !</h2>
      <p>Cliquer sur oui pour valider votre choix </p>
      
      
      <button type="button" onClick={() => onNavigate("confirmation")}> ✔️ oui  </button>
      <button type="button" onClick={() => onNavigate("insription")}>🏠 Retour </button>
      
    </div>	
  );
}

export default Participer;
