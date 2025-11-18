import React from "react";
import { useAuth } from "../context/AuthContext";

const SupervisorDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-root">
      <div className="dashboard-card">
        <h1>Tableau de bord Superviseur</h1>
        <p className="dashboard-subtitle">
          Bienvenue, {user?.name}. Vous gérez les réservations et le suivi des équipements.
        </p>
        <ul>
          <li>Validation / refus des demandes</li>
          <li>Suivi de la disponibilité</li>
          <li>Vue des réservations en cours</li>
        </ul>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
