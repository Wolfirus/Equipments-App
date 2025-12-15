import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard-root">
      <div className="dashboard-card">
        <h1>Tableau de bord Superviseur</h1>

        <p className="dashboard-subtitle">
          Bienvenue, {user?.name}. Vous gérez les réservations et le suivi des équipements.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={() => navigate("/supervisor/reservations")}
          >
            Gérer les réservations
          </button>

          {/* Décommente quand on confirme la route équipements dans App.js */}
          {/* <button className="btn-secondary" onClick={() => navigate("/equipements")}>
            Voir les équipements
          </button> */}
        </div>

        <div style={{ marginTop: 18, opacity: 0.9 }}>
          <ul>
            <li>Validation / refus des demandes</li>
            <li>Suivi de la disponibilité</li>
            <li>Vue des réservations en cours</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
