import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Card = ({ title, desc, to, cta, icon }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
    <div className="text-2xl mb-3">{icon}</div>
    <div className="text-lg font-black text-slate-900">{title}</div>
    <p className="text-sm text-slate-600 mt-1">{desc}</p>
    <Link
      to={to}
      className="inline-flex mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
    >
      {cta}
    </Link>
  </div>
);

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-sm text-slate-500">Système</div>
        <h1 className="text-3xl font-black text-slate-900 mt-1">
          Réservation d’Équipements
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Interface moderne type dashboard. Recherchez des équipements, créez des réservations
          et suivez leur statut.
        </p>

        <div className="mt-5 flex gap-3">
          <Link
            to="/equipment"
            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800"
          >
            Voir le catalogue
          </Link>
          <Link
            to="/reservations"
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Mes réservations
          </Link>
        </div>

        <div className="mt-6 text-sm text-slate-500">
          Statut: <span className="font-semibold">{user ? "Connecté" : "Non connecté"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card
          icon="🧰"
          title="Équipements"
          desc="Consultez les équipements disponibles et leurs détails."
          to="/equipment"
          cta="Ouvrir"
        />
        <Card
          icon="📅"
          title="Réservations"
          desc="Créer, suivre et gérer vos réservations."
          to="/reservations"
          cta="Gérer"
        />
        <Card
          icon="👤"
          title="Profil"
          desc="Mettre à jour vos informations et préférences."
          to="/profile"
          cta="Modifier"
        />
      </div>
    </div>
  );
}
