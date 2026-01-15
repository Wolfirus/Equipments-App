import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Card = ({ title, desc, btn, onClick, icon }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start justify-between gap-4">
    <div>
      <div className="text-2xl">{icon}</div>
      <h2 className="mt-2 text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
      <button
        onClick={onClick}
        className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
      >
        {btn}
      </button>
    </div>
  </div>
);

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = (user?.role || "").toLowerCase();
  const isManager = role === "admin" || role === "supervisor";

  // ✅ USER HOME
  if (!isManager) {
    return (
      <div>
        <div className="text-sm text-slate-500">Système</div>
        <h1 className="text-3xl font-black text-slate-900">Réservation d’Équipements</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Recherchez des équipements, créez des réservations et suivez leur statut.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card
            icon="🧰"
            title="Équipements"
            desc="Consultez les équipements disponibles et leurs détails."
            btn="Ouvrir"
            onClick={() => navigate("/equipment")}
          />
          <Card
            icon="📅"
            title="Mes réservations"
            desc="Créer, suivre et gérer vos réservations."
            btn="Gérer"
            onClick={() => navigate("/reservations")}
          />
          <Card
            icon="👤"
            title="Profil"
            desc="Mettre à jour vos informations et préférences."
            btn="Modifier"
            onClick={() => navigate("/profile")}
          />
        </div>
      </div>
    );
  }

  // ✅ MANAGER HOME (admin + supervisor)
  return (
    <div>
      <div className="text-sm text-slate-500">Espace</div>
      <h1 className="text-3xl font-black text-slate-900">Gestion & Supervision</h1>
      <p className="mt-2 text-slate-600 text-sm">
        Gérez les équipements, validez les réservations et suivez les demandes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card
          icon="🛠️"
          title="Gestion équipements"
          desc="Ajouter, modifier et supprimer des équipements."
          btn="Ouvrir"
          onClick={() => navigate("/admin/equipments")}
        />
        <Card
          icon="✅"
          title="Gestion réservations"
          desc="Valider/refuser les réservations et suivre l’activité."
          btn="Ouvrir"
          onClick={() => navigate("/admin/reservations")}
        />
        <Card
          icon="👤"
          title="Profil"
          desc="Mettre à jour vos informations et préférences."
          btn="Modifier"
          onClick={() => navigate("/profile")}
        />
      </div>
    </div>
  );
}
