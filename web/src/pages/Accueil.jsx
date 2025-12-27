import React from "react";

function Accueil({ onNavigate }) {
  return (
    <div className="page page-accueil">
      <div className="hero-card">
        <h1>Bienvenue dans STERNO-SOL</h1>
        <p>Votre tirelire solidaire et transparente.</p>
        
        {/* L'image est maintenant gérée par une classe CSS */}
        <div className="image-container">
          <img src="2 mains.jpg" alt="Solidarité" className="hero-image" />
        </div>

        <div className="button-group">
          <button className="btn-primary" onClick={() => onNavigate("login")}>
            Se connecter
          </button>
          <button className="btn-outline" onClick={() => onNavigate("inscription")}>
            S'inscrire
          </button>
        </div>

        <button className="btn-link" onClick={() => window.location.href='https://www.google.com'}>
          Quitter l'application
        </button>
      </div>
    </div>
  );
}

export default Accueil;