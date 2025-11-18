import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const particlesRef = useRef(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;

    const particleCount = 30;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = Math.random() * 60 + 20;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "%";
      p.style.top = Math.random() * 100 + "%";
      p.style.animationDelay = Math.random() * 20 + "s";
      p.style.animationDuration = Math.random() * 10 + 15 + "s";
      container.appendChild(p);
      particles.push(p);
    }

    return () => {
      particles.forEach((p) => container.removeChild(p));
    };
  }, []);

  const handleRoleClick = (role) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (role === "admin") navigate("/admin");
    else if (role === "supervisor") navigate("/supervisor");
    else navigate("/user");
  };

  return (
    <div className="landing-root">
      <div className="particles" ref={particlesRef} />

      <section className="hero">
        <div className="hero-content">
          <div className="hero-icon">💼</div>
          <h1>Système de Réservation d'Équipements</h1>
          <p className="subtitle">
            Gérez facilement vos équipements, vos réservations et vos profils à
            partir d’une interface moderne, claire et intuitive.
          </p>
        </div>
      </section>

      <main className="main-content">
        <h2 className="section-title">Choisissez votre espace</h2>
        <p className="section-subtitle">
          Cliquez sur votre rôle. Si vous n’êtes pas connecté, vous serez
          redirigé vers la page de connexion.
        </p>

        <div className="cards-grid">
          <div
            className="card"
            onClick={() => handleRoleClick("admin")}
          >
            <div className="card-icon">👨‍💼</div>
            <h3 className="card-title">Espace Administrateur</h3>
            <p className="card-description">
              Gérer les utilisateurs, les rôles, les équipements et les
              configurations globales du système.
            </p>
            <span className="card-badge">Accès complet</span>
          </div>

          <div
            className="card"
            onClick={() => handleRoleClick("supervisor")}
          >
            <div className="card-icon">🛠️</div>
            <h3 className="card-title">Espace Superviseur</h3>
            <p className="card-description">
              Superviser les réservations, valider les demandes et suivre la
              disponibilité des équipements.
            </p>
            <span className="card-badge">Gestion avancée</span>
          </div>

          <div
            className="card"
            onClick={() => handleRoleClick("user")}
          >
            <div className="card-icon">👤</div>
            <h3 className="card-title">Espace Utilisateur</h3>
            <p className="card-description">
              Réserver en quelques clics, consulter l’historique et suivre vos
              demandes en temps réel.
            </p>
            <span className="card-badge">Réservation simple</span>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Espace de Travail — Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default Home;
