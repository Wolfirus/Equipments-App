import React from "react";
import { useAuth } from "../context/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-root">
      <div className="dashboard-card">
        <h1>Tableau de bord Administrateur</h1>
        <p className="dashboard-subtitle">
          Bienvenue, {user?.name}. Vous avez un accès complet au système.
        </p>
        <ul>
          <li>Gestion des utilisateurs et des rôles</li>
          <li>Gestion des équipements</li>
          <li>Vue globale des réservations</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
