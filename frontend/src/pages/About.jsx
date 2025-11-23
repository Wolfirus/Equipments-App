import React from "react";

export default function About() {
  return (
    <div className="page-container">
      <div className="glass-card about-card">
        <h1>À propos</h1>

        <p className="paragraph">
          Cette plateforme de gestion et réservation d’équipements a été conçue
          pour simplifier l’organisation des ressources au sein d’un espace de
          travail moderne.
        </p>

        <p className="paragraph">
          Notre objectif est d’offrir une solution intuitive permettant aux
          utilisateurs de réserver facilement des équipements, tandis que les
          superviseurs et administrateurs disposent d’un espace dédié pour la
          gestion et la supervision.
        </p>

        <p className="paragraph">
          Ce projet est développé dans le cadre d’un travail académique PFE,
          illustrant les bonnes pratiques d’architecture logicielle, d’UI/UX et
          de sécurité moderne.
        </p>
      </div>
    </div>
  );
}
