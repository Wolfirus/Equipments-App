import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // ✅ FIX (avant: "./context/AuthContext")

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const particlesRef = useRef(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;

    const particleCount = 26;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = Math.random() * 70 + 14;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "%";
      p.style.top = Math.random() * 100 + "%";
      p.style.animationDelay = Math.random() * 18 + "s";
      p.style.animationDuration = Math.random() * 12 + 18 + "s";
      container.appendChild(p);
      particles.push(p);
    }

    return () => particles.forEach((p) => container.removeChild(p));
  }, []);

  const handleRoleClick = (role) => {
    if (!user) return navigate("/login");

    if (role === "admin") navigate("/admin");
    else if (role === "supervisor") navigate("/supervisor");
    else navigate("/user");
  };

  return (
    <div className="landing-root">
      <div className="particles" ref={particlesRef} />

      <div className="landing-shell">
        {/* HERO */}
        <section className="landing-hero">
          <div className="landing-hero-badge">
            <span className="dot" />
            Plateforme de gestion & réservation
          </div>

          <h1 className="landing-title">
            Système de Réservation <span> d’Équipements</span>
          </h1>

          <p className="landing-subtitle">
            Gérez facilement vos équipements, vos réservations et vos profils à partir
            d’une interface moderne, claire et intuitive.
          </p>

          <div className="landing-cta">
            <button className="btn-primary" onClick={() => navigate("/equipment")}>
              Voir le catalogue
            </button>
            <button className="btn-ghost" onClick={() => navigate("/login")}>
              Se connecter
            </button>
          </div>
        </section>

        {/* ROLE CARDS */}
        <section className="landing-section">
          <div className="landing-section-head">
            <h2 className="landing-section-title">Choisissez votre espace</h2>
            <p className="landing-section-subtitle">
              Cliquez sur votre rôle. Si vous n’êtes pas connecté, vous serez redirigé vers la page de connexion.
            </p>
          </div>

          <div className="role-grid">
            <button className="role-card" onClick={() => handleRoleClick("admin")}>
              <div className="role-card-top">
                <div className="role-icon">👨‍💼</div>
                <span className="role-badge">Accès complet</span>
              </div>
              <h3 className="role-title">Espace Administrateur</h3>
              <p className="role-desc">
                Gérer les utilisateurs, les rôles, les équipements et les configurations globales.
              </p>
              <div className="role-arrow">Accéder →</div>
            </button>

            <button className="role-card" onClick={() => handleRoleClick("supervisor")}>
              <div className="role-card-top">
                <div className="role-icon">🛠️</div>
                <span className="role-badge">Gestion avancée</span>
              </div>
              <h3 className="role-title">Espace Superviseur</h3>
              <p className="role-desc">
                Superviser les réservations, valider les demandes et suivre la disponibilité.
              </p>
              <div className="role-arrow">Accéder →</div>
            </button>

            <button className="role-card" onClick={() => handleRoleClick("user")}>
              <div className="role-card-top">
                <div className="role-icon">👤</div>
                <span className="role-badge">Réservation simple</span>
              </div>
              <h3 className="role-title">Espace Utilisateur</h3>
              <p className="role-desc">
                Réserver en quelques clics, consulter l’historique et suivre vos demandes.
              </p>
              <div className="role-arrow">Accéder →</div>
            </button>
          </div>
        </section>

        <footer className="landing-footer">
          © {new Date().getFullYear()} — Tous droits réservés.
        </footer>
      </div>
    </div>
  );
};

export default Home;
