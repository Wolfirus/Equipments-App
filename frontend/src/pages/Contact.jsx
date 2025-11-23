<<<<<<< HEAD
import React from "react";
// plus besoin de "./Contact.css"

export default function Contact() {
=======
import React, { useState } from "react";
import axios from "axios";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post("http://localhost:5000/api/messages", form);
      alert("Votre message a été envoyé !");
    } catch (error) {
      console.log(error);
      alert("Erreur !");
    }
  };

>>>>>>> 5f585ef7165fe5dab97e42c663af6c88361e6525
  return (
    <div className="page-container">
      <div className="glass-card contact-card">
        <h1>Contact</h1>
        <p className="subtitle">
          Nous sommes à votre écoute. N’hésitez pas à nous contacter pour toute
          question ou demande d’information.
        </p>

<<<<<<< HEAD
        <form className="contact-form">
          <input type="text" placeholder="Votre nom" required />
          <input type="email" placeholder="Votre email" required />
          <textarea placeholder="Votre message" rows="5" required></textarea>
=======
        <form className="contact-form" onSubmit={handleSubmit}>
          <input 
            type="text" 
            name="name"
            placeholder="Votre nom" 
            required 
            onChange={handleChange}
          />
          <input 
            type="email"
            name="email"
            placeholder="Votre email"
            required
            onChange={handleChange}
          />
          <textarea 
            name="message"
            placeholder="Votre message" 
            rows="5"
            required
            onChange={handleChange}
          ></textarea>
>>>>>>> 5f585ef7165fe5dab97e42c663af6c88361e6525

          <button type="submit" className="btn-submit">
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
