import React from "react";
import { useAuth } from "../context/AuthContext";

const UserDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-root">
      <div className="dashboard-card">
        <h1>Tableau de bord Utilisateur</h1>
        <p className="dashboard-subtitle">
          Bienvenue, {user?.name}. Gérez vos réservations d'équipements.
        </p>
        <ul>
          <li>Créer une réservation</li>
          <li>Voir l’historique</li>
          <li>Suivre le statut des demandes</li>
        </ul>
      </div>
    </div>
  );
};

export default UserDashboard;
