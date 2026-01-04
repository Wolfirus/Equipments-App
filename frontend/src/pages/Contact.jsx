import React, { useState } from "react";
import client from "../api/client";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post("/messages", form);
      alert("Votre message a été envoyé !");
      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      alert(error.response?.data?.message || "Erreur !");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Contact</h1>
          <p className="text-sm text-slate-600 mt-2">
            Nous sommes à votre écoute. N’hésitez pas à nous contacter.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-slate-700">Nom</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Message</label>
              <textarea
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>

            <button
              disabled={loading}
              className="px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
