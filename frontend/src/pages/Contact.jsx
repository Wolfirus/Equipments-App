import React from "react";


export default function Contact() {
  return (
    <div className="page-container">
      <div className="glass-card contact-card">
        <h1>Contact</h1>
        <p className="subtitle">
          Nous sommes à votre écoute. N’hésitez pas à nous contacter pour toute
          question ou demande d’information.
        </p>

        <form className="contact-form">
          <input type="text" placeholder="Votre nom" required />
          <input type="email" placeholder="Votre email" required />
          <textarea placeholder="Votre message" rows="5" required></textarea>

          <button type="submit" className="btn-submit">
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}