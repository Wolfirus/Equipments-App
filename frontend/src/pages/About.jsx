import React from "react";

export default function About() {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-slate-900">À propos</h1>
          <p className="text-slate-600 text-sm mt-2">
            Plateforme de gestion et réservation d’équipements.
          </p>

          <div className="mt-6 space-y-4 text-sm text-slate-700 leading-7">
            <p>
              Cette plateforme a été conçue pour simplifier l’organisation des ressources au sein
              d’un espace de travail moderne.
            </p>
            <p>
              Les utilisateurs réservent facilement des équipements, tandis que les superviseurs et
              administrateurs disposent d’un espace dédié pour la gestion et la supervision.
            </p>
            <p>
              Projet développé dans le cadre d’un travail académique (PFE), avec une orientation UI/UX
              moderne et une architecture claire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
