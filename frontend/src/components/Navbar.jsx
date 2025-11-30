import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="glass-navbar">
      <div className="nav-inner">

        {/* LOGO */}
        <div className="nav-left" onClick={() => navigate("/")} role="button">
          <div className="nav-logo-mark">EQ</div>
          <div className="nav-logo-text">
            <span className="nav-logo-title">Equipements</span>
            <span className="nav-logo-subtitle">
              Plateforme de réservation
            </span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="nav-center">
          <Link to="/" className="nav-link">Accueil</Link>
          <Link to="/about" className="nav-link">À propos</Link>
          <Link to="/contact" className="nav-link">Contact</Link>

          {user && (
            <>
              {/* ADMIN */}
              {user.role === "admin" && (
                <>
                  <Link to="/admin" className="nav-link">Admin</Link>
                  <Link to="/admin/messages" className="nav-link">Messages</Link>
                </>
              )}

              {/* SUPERVISEUR */}
              {user.role === "supervisor" && (
                <Link to="/supervisor" className="nav-link">
                  Superviseur
                </Link>
              )}

              {/* UTILISATEUR */}
              {user.role === "user" && (
                <Link to="/user" className="nav-link">
                  Utilisateur
                </Link>
              )}

              {/* MON COMPTE */}
              <Link to="/account" className="nav-link">
                Mon compte
              </Link>
            </>
          )}
        </div>

        {/* RIGHT SIDE: USER INFO */}
        <div className="nav-right">
          {user ? (
            <>
              <span className="nav-user">
                {user.name} ({user.role})
              </span>
              <button className="btn-ghost" onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => navigate("/login")}>
                Connexion
              </button>
              <button className="btn-primary" onClick={() => navigate("/register")}>
                Inscription
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
