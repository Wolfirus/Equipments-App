import React, { useState } from "react";
import axios from "axios";
import CenterAlert from "../components/CenterAlert";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post("http://localhost:5000/api/messages", form);

      setAlert({
        message: "Votre message a été envoyé avec succès 📩",
        type: "success",
      });

      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      console.error(error);
      setAlert({
        message: "Erreur lors de l’envoi du message",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="glass-card contact-card">
        <h1>Contact</h1>
        <p className="subtitle">
          Nous sommes à votre écoute. N’hésitez pas à nous contacter pour toute
          question ou demande d’information.
        </p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Votre nom"
            required
            value={form.name}
            onChange={handleChange}
          />

          <input
            type="email"
            name="email"
            placeholder="Votre email"
            required
            value={form.email}
            onChange={handleChange}
          />

          <textarea
            name="message"
            placeholder="Votre message"
            rows="5"
            required
            value={form.message}
            onChange={handleChange}
          />

          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      </div>

      {alert && (
        <CenterAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}
